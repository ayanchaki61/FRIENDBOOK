const express = require('express');
const path = require('path');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/image', auth, (req, res) => {
  upload.single('image')(req, res, (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Image too large. Max allowed is 15MB.' });
      }
      return res.status(400).json({ message: error.message || 'Upload failed' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    const relativePath = path
      .join('uploads', req.query.type === 'profile' ? 'profiles' : 'posts', req.file.filename)
      .replace(/\\/g, '/');
    const fileUrl = `${req.protocol}://${req.get('host')}/${relativePath}`;

    return res.status(201).json({
      message: 'Image uploaded',
      url: fileUrl,
      path: relativePath,
    });
  });
});

module.exports = router;
