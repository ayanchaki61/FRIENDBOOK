const express = require('express');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/search', auth, async (req, res) => {
  try {
    const query = (req.query.q || '').trim();

    if (!query) {
      return res.status(200).json([]);
    }

    const currentUser = await User.findById(req.user.id).select('friends');

    const users = await User.find({
      _id: { $ne: req.user.id },
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    })
      .select('name email avatar bio')
      .limit(20);

    const pendingRequests = await FriendRequest.find({
      status: 'pending',
      $or: [{ sender: req.user.id }, { receiver: req.user.id }],
    }).select('sender receiver');

    const pendingSet = new Set();
    pendingRequests.forEach((request) => {
      pendingSet.add(`${request.sender.toString()}-${request.receiver.toString()}`);
      pendingSet.add(`${request.receiver.toString()}-${request.sender.toString()}`);
    });

    const results = users.map((user) => ({
      ...user.toObject(),
      isFriend: currentUser.friends.some((friendId) => friendId.toString() === user._id.toString()),
      hasPendingRequest: pendingSet.has(`${req.user.id}-${user._id.toString()}`),
    }));

    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/profile/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('friends', 'name email avatar');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.put('/profile', auth, async (req, res) => {
  try {
    const { name, bio, avatar, location, work, study, dob, relationship } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (typeof name === 'string') user.name = name;
    if (typeof bio === 'string') user.bio = bio;
    if (typeof avatar === 'string') user.avatar = avatar;
    if (typeof location === 'string') user.location = location;
    if (typeof work === 'string') user.work = work;
    if (typeof study === 'string') user.study = study;
    if (typeof dob === 'string') user.dob = dob;
    if (typeof relationship === 'string') user.relationship = relationship;

    await user.save();

    return res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      bio: user.bio,
      avatar: user.avatar,
      location: user.location,
      work: user.work,
      study: user.study,
      dob: user.dob,
      relationship: user.relationship,
      friends: user.friends,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
