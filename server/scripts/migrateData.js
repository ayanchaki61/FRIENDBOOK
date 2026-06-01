require('dotenv').config();

const connectDB = require('../src/config/db');
const { connectSQL, sequelize } = require('../src/config/sql');

const MongoUser = require('../src/models/User');
const MongoPost = require('../src/models/Post');
const MongoNotification = require('../src/models/Notification');
const MongoMessage = require('../src/models/Message');
const MongoFriendRequest = require('../src/models/FriendRequest');

const { User, Post, Comment, Notification, Message, FriendRequest } = require('../src/sqlModels');

async function migrate() {
  try {
    console.log('Connecting to Mongo...');
    await connectDB();

    console.log('Connecting to MSSQL...');
    await connectSQL();

    console.log('Syncing Sequelize models (this will create tables)...');
    await sequelize.sync({ force: true });

    const userIdMap = new Map();
    const postIdMap = new Map();
    const queryInterface = sequelize.getQueryInterface();

    const mongoUsers = await MongoUser.find().lean();
    console.log(`Migrating ${mongoUsers.length} users...`);
    for (const mu of mongoUsers) {
      const u = await User.create({
        name: mu.name,
        email: mu.email,
        password: mu.password || '',
        bio: mu.bio || '',
        avatar: mu.avatar || '',
        location: mu.location || '',
        work: mu.work || '',
        study: mu.study || '',
        dob: mu.dob || '',
        relationship: mu.relationship || '',
      });
      userIdMap.set(String(mu._id), u.id);
    }

    console.log('Migrating friendships...');
    const userFriendsRows = [];
    for (const mu of mongoUsers) {
      const fromId = userIdMap.get(String(mu._id));
      if (!mu.friends || !Array.isArray(mu.friends)) continue;
      for (const f of mu.friends) {
        const toId = userIdMap.get(String(f));
        if (fromId && toId) {
          userFriendsRows.push({ userId: fromId, friendId: toId, createdAt: new Date(), updatedAt: new Date() });
        }
      }
    }
    if (userFriendsRows.length > 0) {
      await queryInterface.bulkInsert('UserFriends', userFriendsRows);
    }

    console.log('Migrating posts...');
    const postLikesRows = [];
    const commentLikesRows = [];
    const mongoPosts = await MongoPost.find().lean();
    for (const mp of mongoPosts) {
      const authorSqlId = userIdMap.get(String(mp.author));
      const post = await Post.create({
        text: mp.text || '',
        photoUrl: mp.photoUrl || '',
        authorId: authorSqlId,
      });
      postIdMap.set(String(mp._id), post.id);

      if (mp.comments && Array.isArray(mp.comments)) {
        for (const c of mp.comments) {
          const commenterId = userIdMap.get(String(c.user));
          const comment = await Comment.create({
            text: c.text,
            userId: commenterId,
            postId: post.id,
            createdAt: c.createdAt || new Date(),
            updatedAt: c.createdAt || new Date(),
          });

          if (c.likes && Array.isArray(c.likes)) {
            for (const likerId of c.likes) {
              const sqlUserId = userIdMap.get(String(likerId));
              if (sqlUserId) {
                commentLikesRows.push({ commentId: comment.id, userId: sqlUserId, createdAt: new Date(), updatedAt: new Date() });
              }
            }
          }
        }
      }

      if (mp.likes && Array.isArray(mp.likes)) {
        for (const likerId of mp.likes) {
          const sqlUserId = userIdMap.get(String(likerId));
          if (sqlUserId) {
            postLikesRows.push({ postId: post.id, userId: sqlUserId, createdAt: new Date(), updatedAt: new Date() });
          }
        }
      }
    }

    if (postLikesRows.length > 0) {
      await queryInterface.bulkInsert('PostLikes', postLikesRows);
    }

    if (commentLikesRows.length > 0) {
      await queryInterface.bulkInsert('CommentLikes', commentLikesRows);
    }

    console.log('Migrating notifications...');
    const mongoNotifications = await MongoNotification.find().lean();
    for (const mn of mongoNotifications) {
      await Notification.create({
        userId: userIdMap.get(String(mn.user)),
        type: mn.type,
        message: mn.message,
        relatedUserId: mn.relatedUser ? userIdMap.get(String(mn.relatedUser)) : null,
        relatedPostId: mn.relatedPost ? postIdMap.get(String(mn.relatedPost)) : null,
        isRead: !!mn.isRead,
        createdAt: mn.createdAt || new Date(),
        updatedAt: mn.createdAt || new Date(),
      });
    }

    console.log('Migrating messages...');
    const mongoMessages = await MongoMessage.find().lean();
    for (const mm of mongoMessages) {
      await Message.create({
        text: mm.text,
        isRead: !!mm.isRead,
        senderId: userIdMap.get(String(mm.sender)),
        receiverId: userIdMap.get(String(mm.receiver)),
        createdAt: mm.createdAt || new Date(),
        updatedAt: mm.createdAt || new Date(),
      });
    }

    console.log('Migrating friend requests...');
    const mongoFRs = await MongoFriendRequest.find().lean();
    for (const fr of mongoFRs) {
      await FriendRequest.create({
        status: fr.status,
        senderId: userIdMap.get(String(fr.sender)),
        receiverId: userIdMap.get(String(fr.receiver)),
        createdAt: fr.createdAt || new Date(),
        updatedAt: fr.createdAt || new Date(),
      });
    }

    console.log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
