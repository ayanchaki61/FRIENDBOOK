const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

const isFriend = (user, friendId) =>
  user.friends.some((id) => id.toString() === friendId.toString());

router.get('/friends', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('friends', 'name email avatar bio');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(user.friends);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user.id,
      isRead: false,
    });

    return res.status(200).json({ count });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:friendId', auth, async (req, res) => {
  try {
    const { friendId } = req.params;
    const user = await User.findById(req.user.id).select('friends');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!isFriend(user, friendId)) {
      return res.status(403).json({ message: 'You can only message your friends' });
    }

    await Message.updateMany(
      {
        sender: friendId,
        receiver: req.user.id,
        isRead: false,
      },
      { $set: { isRead: true } }
    );

    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: friendId },
        { sender: friendId, receiver: req.user.id },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'name avatar')
      .populate('receiver', 'name avatar');

    return res.status(200).json(messages);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:friendId', auth, async (req, res) => {
  try {
    const { friendId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    const user = await User.findById(req.user.id).select('friends');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!isFriend(user, friendId)) {
      return res.status(403).json({ message: 'You can only message your friends' });
    }

    const message = await Message.create({
      sender: req.user.id,
      receiver: friendId,
      text: text.trim(),
      isRead: false,
    });

    const populated = await Message.findById(message._id)
      .populate('sender', 'name avatar')
      .populate('receiver', 'name avatar');

    return res.status(201).json(populated);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
