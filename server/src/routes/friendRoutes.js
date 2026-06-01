const express = require('express');
const { Op } = require('sequelize');
const { User, FriendRequest, Notification } = require('../sqlModels');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/status/:userId', auth, async (req, res) => {
  try {
    const targetId = req.params.userId;

    if (targetId === req.user.id) {
      return res.status(200).json({
        areFriends: false,
        pendingRequest: null,
      });
    }

    const user = await User.findByPk(req.user.id, {
      include: [{ model: User, as: 'friends', attributes: ['id'] }],
      attributes: ['id'],
    });
    const targetUser = await User.findByPk(targetId, { attributes: ['id'] });

    if (!user || !targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const areFriends = user.friends.some((friend) => String(friend.id) === String(targetId));

    const pendingRequest = await FriendRequest.findOne({
      where: {
        status: 'pending',
        [Op.or]: [
          { senderId: req.user.id, receiverId: targetId },
          { senderId: targetId, receiverId: req.user.id },
        ],
      },
    });

    if (!pendingRequest) {
      return res.status(200).json({
        areFriends,
        pendingRequest: null,
      });
    }

    const direction = String(pendingRequest.receiverId) === String(req.user.id) ? 'incoming' : 'outgoing';

    return res.status(200).json({
      areFriends,
      pendingRequest: {
        id: pendingRequest.id,
        status: pendingRequest.status,
        direction,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/request/:userId', auth, async (req, res) => {
  try {
    const receiverId = req.params.userId;

    if (receiverId === req.user.id) {
      return res.status(400).json({ message: 'You cannot send request to yourself' });
    }

    const sender = await User.findByPk(req.user.id, {
      include: [{ model: User, as: 'friends', attributes: ['id'] }],
      attributes: ['id', 'name'],
    });
    const receiver = await User.findByPk(receiverId, { attributes: ['id', 'name'] });

    if (!sender || !receiver) {
      return res.status(404).json({ message: 'User not found' });
    }

    const alreadyFriends = sender.friends.some((friend) => String(friend.id) === String(receiverId));
    if (alreadyFriends) {
      return res.status(400).json({ message: 'Already friends' });
    }

    const existing = await FriendRequest.findOne({
      where: {
        status: 'pending',
        [Op.or]: [
          { senderId: req.user.id, receiverId },
          { senderId: receiverId, receiverId: req.user.id },
        ],
      },
    });

    if (existing) {
      return res.status(400).json({ message: 'Friend request already pending' });
    }

    const request = await FriendRequest.create({
      senderId: req.user.id,
      receiverId,
      status: 'pending',
    });

    await Notification.create({
      userId: receiverId,
      type: 'friend_request',
      message: `${sender.name} sent you a friend request`,
      relatedUserId: req.user.id,
    });

    return res.status(201).json(request);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/requests', auth, async (req, res) => {
  try {
    const requests = await FriendRequest.findAll({
      where: { receiverId: req.user.id, status: 'pending' },
      include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'email', 'avatar', 'bio'] }],
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json(requests);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/requests/:requestId/accept', auth, async (req, res) => {
  try {
    const request = await FriendRequest.findByPk(req.params.requestId);

    if (!request || request.status !== 'pending') {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (String(request.receiverId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    request.status = 'accepted';
    await request.save();

    const sender = await User.findByPk(request.senderId, { attributes: ['id', 'name'] });
    const receiver = await User.findByPk(request.receiverId, { attributes: ['id', 'name'] });

    if (!sender || !receiver) {
      return res.status(404).json({ message: 'User not found' });
    }

    await sender.addFriend(receiver);
    await receiver.addFriend(sender);

    await Notification.create({
      userId: sender.id,
      type: 'friend_accept',
      message: `${receiver.name} accepted your friend request`,
      relatedUserId: receiver.id,
    });

    return res.status(200).json({ message: 'Friend request accepted' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/requests/:requestId/reject', auth, async (req, res) => {
  try {
    const request = await FriendRequest.findByPk(req.params.requestId);

    if (!request || request.status !== 'pending') {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (String(request.receiverId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    request.status = 'rejected';
    await request.save();

    return res.status(200).json({ message: 'Friend request rejected' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:userId', auth, async (req, res) => {
  try {
    const targetId = req.params.userId;

    if (targetId === req.user.id) {
      return res.status(400).json({ message: 'You cannot unfriend yourself' });
    }

    const user = await User.findByPk(req.user.id);
    const targetUser = await User.findByPk(targetId);

    if (!user || !targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.removeFriend(targetUser);
    await targetUser.removeFriend(user);

    return res.status(200).json({ message: 'Unfriended successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
