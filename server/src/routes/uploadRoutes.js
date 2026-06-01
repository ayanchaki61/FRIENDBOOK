const express = require('express');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

const router = express.Router();

router.post('/image', auth, (req, res) => {
  upload.single('image')(req, res, async (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Image too large. Max allowed is 15MB.' });
      }
      return res.status(400).json({ message: error.message || 'Upload failed' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    const folderName = req.query.type === 'profile' ? 'profiles' : 'posts';

    if (isCloudinaryConfigured()) {
      try {
        const uploaded = await cloudinary.uploader.upload(req.file.path, {
          folder: `friendbook/${folderName}`,
          resource_type: 'auto',
        });

        fs.unlink(req.file.path, () => {});

        return res.status(201).json({
          message: 'Media uploaded',
          url: uploaded.secure_url,
          path: uploaded.public_id,
        });
      } catch (cloudinaryError) {
        fs.unlink(req.file.path, () => {});
        return res.status(500).json({ message: 'Cloud upload failed' });
      }
    }

    const relativePath = path
      .join('uploads', folderName, req.file.filename)
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
