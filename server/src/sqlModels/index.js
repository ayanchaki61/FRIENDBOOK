const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sql');

const UserModel = require('./User');
const PostModel = require('./Post');
const CommentModel = require('./Comment');
const NotificationModel = require('./Notification');
const MessageModel = require('./Message');
const FriendRequestModel = require('./FriendRequest');

const User = UserModel(sequelize, DataTypes);
const Post = PostModel(sequelize, DataTypes);
const Comment = CommentModel(sequelize, DataTypes);
const Notification = NotificationModel(sequelize, DataTypes);
const Message = MessageModel(sequelize, DataTypes);
const FriendRequest = FriendRequestModel(sequelize, DataTypes);

// Associations
User.hasMany(Post, { foreignKey: 'authorId', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

User.belongsToMany(User, { through: 'UserFriends', as: 'friends', foreignKey: 'userId', otherKey: 'friendId' });

Post.belongsToMany(User, { through: 'PostLikes', as: 'likes', foreignKey: 'postId', otherKey: 'userId' });
User.belongsToMany(Post, { through: 'PostLikes', as: 'likedPosts', foreignKey: 'userId', otherKey: 'postId' });

Comment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Comment.belongsTo(Post, { foreignKey: 'postId', as: 'post' });
Post.hasMany(Comment, { foreignKey: 'postId', as: 'comments' });

Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Notification.belongsTo(User, { foreignKey: 'relatedUserId', as: 'relatedUser' });
Notification.belongsTo(Post, { foreignKey: 'relatedPostId', as: 'relatedPost' });

Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });
User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
User.hasMany(Message, { foreignKey: 'receiverId', as: 'receivedMessages' });

FriendRequest.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
FriendRequest.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

module.exports = {
  sequelize,
  User,
  Post,
  Comment,
  Notification,
  Message,
  FriendRequest,
};
