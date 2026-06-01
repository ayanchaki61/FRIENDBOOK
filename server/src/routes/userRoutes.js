const express = require('express');
const { Op } = require('sequelize');
const { sequelize, User, FriendRequest } = require('../sqlModels');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/search', auth, async (req, res) => {
  try {
    const query = (req.query.q || '').trim();

    if (!query) {
      return res.status(200).json([]);
    }

    const currentUser = await User.findByPk(req.user.id, {
      include: [{ model: User, as: 'friends', attributes: ['id'] }],
      attributes: ['id'],
    });

    const lowerQuery = query.toLowerCase();
    const users = await User.findAll({
      where: {
        id: { [Op.ne]: req.user.id },
        [Op.or]: [
          sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), { [Op.like]: `%${lowerQuery}%` }),
          sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), { [Op.like]: `%${lowerQuery}%` }),
        ],
      },
      attributes: ['id', 'name', 'email', 'avatar', 'bio'],
      limit: 20,
    });

    const pendingRequests = await FriendRequest.findAll({
      where: {
        status: 'pending',
        [Op.or]: [
          { senderId: req.user.id },
          { receiverId: req.user.id },
        ],
      },
      attributes: ['senderId', 'receiverId'],
    });

    const pendingSet = new Set();
    pendingRequests.forEach((request) => {
      pendingSet.add(`${request.senderId}-${request.receiverId}`);
      pendingSet.add(`${request.receiverId}-${request.senderId}`);
    });

    const friends = currentUser?.friends?.map((friend) => friend.id.toString()) || [];

    const results = users.map((user) => {
      const plainUser = user.toJSON();
      return {
        ...plainUser,
        isFriend: friends.includes(String(plainUser.id)),
        hasPendingRequest: pendingSet.has(`${req.user.id}-${plainUser.id}`),
      };
    });

    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/profile/:id', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: User, as: 'friends', attributes: ['id', 'name', 'email', 'avatar'] }],
    });

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

    const user = await User.findByPk(req.user.id);
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
      id: user.id,
      name: user.name,
      email: user.email,
      bio: user.bio,
      avatar: user.avatar,
      location: user.location,
      work: user.work,
      study: user.study,
      dob: user.dob,
      relationship: user.relationship,
      friends: [],
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
