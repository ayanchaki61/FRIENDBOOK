const express = require('express');
const { Op } = require('sequelize');
const { Post, User, Notification, Comment } = require('../sqlModels');
const auth = require('../middleware/auth');

const router = express.Router();

const postInclude = [
  { model: User, as: 'author', attributes: ['id', 'name', 'email', 'avatar'] },
  {
    model: Comment,
    as: 'comments',
    include: [
      { model: User, as: 'user', attributes: ['id', 'name', 'avatar'] },
      { model: User, as: 'likes', attributes: ['id', 'name', 'avatar'] },
    ],
  },
  { model: User, as: 'likes', attributes: ['id'] },
];

const getPopulatedPost = async (postId) =>
  Post.findByPk(postId, {
    include: postInclude,
  });

router.post('/', auth, async (req, res) => {
  try {
    const { text, photoUrl } = req.body;

    if (!text && !photoUrl) {
      return res.status(400).json({ message: 'Post text or photo is required' });
    }

    const post = await Post.create({
      authorId: req.user.id,
      text: text || '',
      photoUrl: photoUrl || '',
    });

    const user = await User.findByPk(req.user.id, {
      include: [{ model: User, as: 'friends', attributes: ['id'] }],
      attributes: ['id', 'name'],
    });

    const notifications = user.friends.map((friend) => ({
      userId: friend.id,
      type: 'post',
      message: `${user.name} added a new post`,
      relatedUserId: user.id,
      relatedPostId: post.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    if (notifications.length > 0) {
      await Notification.bulkCreate(notifications);
    }

    const populatedPost = await getPopulatedPost(post.id);
    return res.status(201).json(populatedPost);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

const getHomeFeed = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: User, as: 'friends', attributes: ['id'] }],
      attributes: ['id'],
    });

    const authorIds = [req.user.id, ...(user.friends || []).map((friend) => friend.id)];

    const posts = await Post.findAll({
      where: { authorId: { [Op.in]: authorIds } },
      include: postInclude,
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json(posts);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

router.get('/home', auth, getHomeFeed);
router.get('/wall', auth, getHomeFeed);

router.get('/user/:userId', auth, async (req, res) => {
  try {
    const posts = await Post.findAll({
      where: { authorId: req.params.userId },
      include: postInclude,
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json(posts);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:postId', auth, async (req, res) => {
  try {
    const { text, photoUrl } = req.body;
    const post = await Post.findByPk(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (String(post.authorId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const nextText = typeof text === 'string' ? text.trim() : post.text;
    const nextPhotoUrl = typeof photoUrl === 'string' ? photoUrl.trim() : post.photoUrl;

    if (!nextText && !nextPhotoUrl) {
      return res.status(400).json({ message: 'Post text or photo is required' });
    }

    post.text = nextText;
    post.photoUrl = nextPhotoUrl;
    await post.save();

    const populatedPost = await getPopulatedPost(post.id);
    return res.status(200).json(populatedPost);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:postId/like', auth, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.postId, {
      include: [{ model: User, as: 'likes', attributes: ['id'] }],
    });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const existingLike = post.likes.some((user) => String(user.id) === String(req.user.id));
    const addedLike = !existingLike;

    if (existingLike) {
      await post.removeLike(req.user.id);
    } else {
      await post.addLike(req.user.id);
    }

    if (addedLike && String(post.authorId) !== String(req.user.id)) {
      const actor = await User.findByPk(req.user.id, { attributes: ['name'] });
      await Notification.create({
        userId: post.authorId,
        type: 'post_like',
        message: `${actor?.name || 'Someone'} liked your post`,
        relatedUserId: req.user.id,
        relatedPostId: post.id,
      });
    }

    const populatedPost = await getPopulatedPost(post.id);
    return res.status(200).json(populatedPost);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:postId/comments', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findByPk(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    await Comment.create({
      userId: req.user.id,
      postId: post.id,
      text: text.trim(),
    });

    if (String(post.authorId) !== String(req.user.id)) {
      const actor = await User.findByPk(req.user.id, { attributes: ['name'] });
      await Notification.create({
        userId: post.authorId,
        type: 'post_comment',
        message: `${actor?.name || 'Someone'} commented on your post`,
        relatedUserId: req.user.id,
        relatedPostId: post.id,
      });
    }

    const populatedPost = await getPopulatedPost(post.id);
    return res.status(201).json(populatedPost);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:postId/comments/:commentId/like', auth, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = await Comment.findByPk(req.params.commentId, {
      include: [{ model: User, as: 'likes', attributes: ['id'] }],
    });

    if (!comment || String(comment.postId) !== String(post.id)) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const existingLike = comment.likes.some((user) => String(user.id) === String(req.user.id));
    const addedLike = !existingLike;

    if (existingLike) {
      await comment.removeLike(req.user.id);
    } else {
      await comment.addLike(req.user.id);
    }

    if (addedLike && String(comment.userId) !== String(req.user.id)) {
      const actor = await User.findByPk(req.user.id, { attributes: ['name'] });
      await Notification.create({
        userId: comment.userId,
        type: 'comment_like',
        message: `${actor?.name || 'Someone'} liked your comment`,
        relatedUserId: req.user.id,
        relatedPostId: post.id,
      });
    }

    const populatedPost = await getPopulatedPost(post.id);
    return res.status(200).json(populatedPost);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:postId', auth, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (String(post.authorId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    await Notification.destroy({ where: { relatedPostId: post.id } });
    await post.destroy();

    return res.status(200).json({ message: 'Post deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
