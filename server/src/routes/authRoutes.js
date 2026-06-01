const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { User } = require('../sqlModels');
const auth = require('../middleware/auth');

const router = express.Router();

const isConfiguredGoogleClientId = (value) => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();

  return (
    trimmed.length > 0
    && trimmed.includes('.apps.googleusercontent.com')
    && !trimmed.includes('your_google_oauth_client_id')
  );
};

const signToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured on the server');
  }

  return jwt.sign({ id: user.id, email: user.email }, secret, {
    expiresIn: '7d',
  });
};

const serializeUser = (user) => {
  const plainUser = user.toJSON ? user.toJSON() : user;

  return {
    id: plainUser.id,
    name: plainUser.name,
    email: plainUser.email,
    hasPassword: Boolean(plainUser.password),
    bio: plainUser.bio,
    avatar: plainUser.avatar,
    location: plainUser.location,
    work: plainUser.work,
    study: plainUser.study,
    dob: plainUser.dob,
    relationship: plainUser.relationship,
    friends: Array.isArray(plainUser.friends)
      ? plainUser.friends.map((friend) => ({
          id: friend.id,
          name: friend.name,
          email: friend.email,
          avatar: friend.avatar,
        }))
      : [],
  };
};

const getGoogleClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!isConfiguredGoogleClientId(clientId)) return null;
  return new OAuth2Client(clientId.trim());
};

router.get('/config', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  return res.status(200).json({
    googleClientId: isConfiguredGoogleClientId(clientId) ? clientId.trim() : '',
  });
});

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    const token = signToken(user);
    return res.status(201).json({
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Signup error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(400).json({ message: 'This account uses Google sign-in. Please continue with Google.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user);
    return res.status(200).json({
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Login error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    const googleClient = getGoogleClient();
    if (!googleClient) {
      return res.status(500).json({ message: 'Google auth is not configured on server' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID.trim(),
    });

    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();

    if (!payload || !email || !payload.email_verified) {
      return res.status(400).json({ message: 'Invalid Google account' });
    }

    let user = await User.findOne({ where: { email } });

    if (!user) {
      user = await User.create({
        name: payload.name || email.split('@')[0],
        email,
        avatar: payload.picture || '',
      });
    } else if (!user.avatar && payload.picture) {
      user.avatar = payload.picture;
      await user.save();
    }

    const token = signToken(user);
    return res.status(200).json({
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Google authentication failed' });
  }
});

router.post('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hasExistingPassword = Boolean(user.password);

    if (hasExistingPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required' });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
    }

    user.password = await bcrypt.hash(String(newPassword), 10);
    await user.save();

    return res.status(200).json({
      message: hasExistingPassword ? 'Password updated successfully' : 'Password added successfully',
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: User, as: 'friends', attributes: ['id', 'name', 'email', 'avatar'] }],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(serializeUser(user));
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
