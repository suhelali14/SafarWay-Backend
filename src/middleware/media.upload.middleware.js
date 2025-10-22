const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure storage for media files (posts)
const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/media/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter for media (images and videos)
const mediaFileFilter = (req, file, cb) => {
  // Accept images and videos
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    req.fileValidationError = 'Only image and video files are allowed!';
    return cb(new Error('Only image and video files are allowed!'), false);
  }
};

// Create multer instance for media uploads
const mediaUpload = multer({
  storage: mediaStorage,
  fileFilter: mediaFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size for videos
    files: 10 // Max 10 files per upload
  }
});

// Error handling middleware for media uploads
const handleMediaUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 50MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 10 files allowed'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  if (req.fileValidationError) {
    return res.status(400).json({
      success: false,
      message: req.fileValidationError
    });
  }

  if (err) {
    return res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: err.message
    });
  }

  next();
};

module.exports = {
  mediaUpload,
  handleMediaUploadError
};
