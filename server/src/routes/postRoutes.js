const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

const router = express.Router();

const postPopulate = [
  { path: 'author', select: 'name email avatar' },
  { path: 'comments.user', select: 'name avatar' },
];

router.post('/', auth, async (req, res) => {
  try {
    const { text, photoUrl } = req.body;

    if (!text && !photoUrl) {
      return res.status(400).json({ message: 'Post text or photo is required' });
    }

    const post = await Post.create({
      author: req.user.id,
      text: text || '',
      photoUrl: photoUrl || '',
    });

    const user = await User.findById(req.user.id).populate('friends', '_id');
    await Notification.insertMany(
      user.friends.map((friend) => ({
        user: friend._id,
        type: 'post',
        message: `${user.name} added a new post`,
        relatedUser: user._id,
        relatedPost: post._id,
      }))
    );

    const populatedPost = await Post.findById(post._id).populate(postPopulate);

    return res.status(201).json(populatedPost);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

const getHomeFeed = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('friends');
    const authorIds = [req.user.id, ...user.friends];

    const posts = await Post.find({ author: { $in: authorIds } }).populate(postPopulate).sort({ createdAt: -1 });

    return res.status(200).json(posts);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

router.get('/home', auth, getHomeFeed);
router.get('/wall', auth, getHomeFeed);

router.get('/user/:userId', auth, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.userId }).populate(postPopulate).sort({ createdAt: -1 });

    return res.status(200).json(posts);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:postId', auth, async (req, res) => {
  try {
    const { text, photoUrl } = req.body;
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== req.user.id) {
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

    const populatedPost = await Post.findById(post._id).populate(postPopulate);
    return res.status(200).json(populatedPost);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:postId/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const existingLikeIndex = post.likes.findIndex((id) => id.toString() === req.user.id);
    const addedLike = existingLikeIndex < 0;
    if (existingLikeIndex >= 0) {
      post.likes.splice(existingLikeIndex, 1);
    } else {
      post.likes.push(req.user.id);
    }

    await post.save();

    if (addedLike && post.author.toString() !== req.user.id) {
      const actor = await User.findById(req.user.id).select('name');
      await Notification.create({
        user: post.author,
        type: 'post_like',
        message: `${actor?.name || 'Someone'} liked your post`,
        relatedUser: req.user.id,
        relatedPost: post._id,
      });
    }

    const populatedPost = await Post.findById(post._id).populate(postPopulate);
    return res.status(200).json(populatedPost);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:postId/comments', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    post.comments.push({
      user: req.user.id,
      text: text.trim(),
    });

    await post.save();

    if (post.author.toString() !== req.user.id) {
      const actor = await User.findById(req.user.id).select('name');
      await Notification.create({
        user: post.author,
        type: 'post_comment',
        message: `${actor?.name || 'Someone'} commented on your post`,
        relatedUser: req.user.id,
        relatedPost: post._id,
      });
    }

    const populatedPost = await Post.findById(post._id).populate(postPopulate);
    return res.status(201).json(populatedPost);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:postId/comments/:commentId/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const existingLikeIndex = comment.likes.findIndex((id) => id.toString() === req.user.id);
    const addedLike = existingLikeIndex < 0;
    if (existingLikeIndex >= 0) {
      comment.likes.splice(existingLikeIndex, 1);
    } else {
      comment.likes.push(req.user.id);
    }

    await post.save();

    if (addedLike && comment.user.toString() !== req.user.id) {
      const actor = await User.findById(req.user.id).select('name');
      await Notification.create({
        user: comment.user,
        type: 'comment_like',
        message: `${actor?.name || 'Someone'} liked your comment`,
        relatedUser: req.user.id,
        relatedPost: post._id,
      });
    }

    const populatedPost = await Post.findById(post._id).populate(postPopulate);
    return res.status(200).json(populatedPost);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:postId', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    await Post.findByIdAndDelete(req.params.postId);
    await Notification.deleteMany({ relatedPost: req.params.postId });

    return res.status(200).json({ message: 'Post deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
