const express = require('express');
const { Op } = require('sequelize');
const { Message, User } = require('../sqlModels');
const auth = require('../middleware/auth');

const router = express.Router();

const isFriend = (user, friendId) =>
  user.friends.some((friend) => String(friend.id) === String(friendId));

router.get('/friends', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: User, as: 'friends', attributes: ['id', 'name', 'email', 'avatar', 'bio'] }],
      attributes: ['id'],
    });
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
    const count = await Message.count({
      where: {
        receiverId: req.user.id,
        isRead: false,
      },
    });

    return res.status(200).json({ count });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:friendId', auth, async (req, res) => {
  try {
    const { friendId } = req.params;
    const user = await User.findByPk(req.user.id, {
      include: [{ model: User, as: 'friends', attributes: ['id'] }],
      attributes: ['id'],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!isFriend(user, friendId)) {
      return res.status(403).json({ message: 'You can only message your friends' });
    }

    await Message.update(
      { isRead: true },
      {
        where: {
          senderId: friendId,
          receiverId: req.user.id,
          isRead: false,
        },
      }
    );

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: req.user.id, receiverId: friendId },
          { senderId: friendId, receiverId: req.user.id },
        ],
      },
      order: [['createdAt', 'ASC']],
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'avatar'] },
        { model: User, as: 'receiver', attributes: ['id', 'name', 'avatar'] },
      ],
    });

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

    const user = await User.findByPk(req.user.id, {
      include: [{ model: User, as: 'friends', attributes: ['id'] }],
      attributes: ['id'],
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!isFriend(user, friendId)) {
      return res.status(403).json({ message: 'You can only message your friends' });
    }

    const message = await Message.create({
      senderId: req.user.id,
      receiverId: friendId,
      text: text.trim(),
      isRead: false,
    });

    const populated = await Message.findByPk(message.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'avatar'] },
        { model: User, as: 'receiver', attributes: ['id', 'name', 'avatar'] },
      ],
    });

    return res.status(201).json(populated);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
