const express = require('express');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Notification = require('../models/Notification');
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

    const user = await User.findById(req.user.id).select('friends');
    const targetUser = await User.findById(targetId).select('_id');

    if (!user || !targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const areFriends = user.friends.some((friendId) => friendId.toString() === targetId);

    const pendingRequest = await FriendRequest.findOne({
      status: 'pending',
      $or: [
        { sender: req.user.id, receiver: targetId },
        { sender: targetId, receiver: req.user.id },
      ],
    }).select('_id sender receiver status');

    if (!pendingRequest) {
      return res.status(200).json({
        areFriends,
        pendingRequest: null,
      });
    }

    const direction = pendingRequest.receiver.toString() === req.user.id ? 'incoming' : 'outgoing';

    return res.status(200).json({
      areFriends,
      pendingRequest: {
        id: pendingRequest._id,
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

    const sender = await User.findById(req.user.id);
    const receiver = await User.findById(receiverId);

    if (!sender || !receiver) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (sender.friends.some((friendId) => friendId.toString() === receiverId)) {
      return res.status(400).json({ message: 'Already friends' });
    }

    const existing = await FriendRequest.findOne({
      status: 'pending',
      $or: [
        { sender: req.user.id, receiver: receiverId },
        { sender: receiverId, receiver: req.user.id },
      ],
    });

    if (existing) {
      return res.status(400).json({ message: 'Friend request already pending' });
    }

    const request = await FriendRequest.create({
      sender: req.user.id,
      receiver: receiverId,
      status: 'pending',
    });

    await Notification.create({
      user: receiverId,
      type: 'friend_request',
      message: `${sender.name} sent you a friend request`,
      relatedUser: req.user.id,
    });

    return res.status(201).json(request);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/requests', auth, async (req, res) => {
  try {
    const requests = await FriendRequest.find({ receiver: req.user.id, status: 'pending' })
      .populate('sender', 'name email avatar bio')
      .sort({ createdAt: -1 });

    return res.status(200).json(requests);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/requests/:requestId/accept', auth, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);

    if (!request || request.status !== 'pending') {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.receiver.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    request.status = 'accepted';
    await request.save();

    const sender = await User.findById(request.sender);
    const receiver = await User.findById(request.receiver);

    if (!sender || !receiver) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!sender.friends.some((friendId) => friendId.toString() === receiver._id.toString())) {
      sender.friends.push(receiver._id);
    }

    if (!receiver.friends.some((friendId) => friendId.toString() === sender._id.toString())) {
      receiver.friends.push(sender._id);
    }

    await sender.save();
    await receiver.save();

    await Notification.create({
      user: sender._id,
      type: 'friend_accept',
      message: `${receiver.name} accepted your friend request`,
      relatedUser: receiver._id,
    });

    return res.status(200).json({ message: 'Friend request accepted' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/requests/:requestId/reject', auth, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);

    if (!request || request.status !== 'pending') {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.receiver.toString() !== req.user.id) {
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

    const user = await User.findById(req.user.id);
    const targetUser = await User.findById(targetId);

    if (!user || !targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const areFriends = user.friends.some((friendId) => friendId.toString() === targetId);
    if (!areFriends) {
      return res.status(400).json({ message: 'You are not friends with this user' });
    }

    user.friends = user.friends.filter((friendId) => friendId.toString() !== targetId);
    targetUser.friends = targetUser.friends.filter((friendId) => friendId.toString() !== req.user.id);

    await user.save();
    await targetUser.save();

    return res.status(200).json({ message: 'Unfriended successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
