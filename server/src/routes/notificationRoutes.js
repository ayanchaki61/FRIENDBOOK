const express = require('express');
const { Notification, User, Post } = require('../sqlModels');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      include: [
        { model: User, as: 'relatedUser', attributes: ['id', 'name', 'email', 'avatar'] },
        { model: Post, as: 'relatedPost', attributes: ['id', 'text', 'photoUrl'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json(notifications);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.count({ where: { userId: req.user.id, isRead: false } });
    return res.status(200).json({ count });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/status', auth, async (req, res) => {
  try {
    const count = await Notification.count({ where: { userId: req.user.id, isRead: false } });
    const latestNotification = await Notification.findOne({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'createdAt', 'type', 'isRead'],
    });

    return res.status(200).json({
      count,
      latestNotification: latestNotification
        ? {
            id: latestNotification.id,
            createdAt: latestNotification.createdAt,
            type: latestNotification.type,
            isRead: latestNotification.isRead,
          }
        : null,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);

    if (!notification || String(notification.userId) !== String(req.user.id)) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
