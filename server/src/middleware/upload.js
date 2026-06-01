const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadsRoot = path.join(__dirname, '../../uploads');
const profileDir = path.join(uploadsRoot, 'profiles');
const postDir = path.join(uploadsRoot, 'posts');

[uploadsRoot, profileDir, postDir].forEach((dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.query.type === 'profile' ? profileDir : postDir;
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    const safeExtension = extension || '.jpg';
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExtension}`;
    cb(null, fileName);
  },
});

const mediaFilter = (req, file, cb) => {
  if (file.mimetype && (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/'))) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video uploads are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter: mediaFilter,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

module.exports = upload;
