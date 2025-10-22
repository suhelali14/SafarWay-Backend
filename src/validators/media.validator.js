const { body, validationResult } = require('express-validator');

// Validation for media upload
const validateMediaUpload = [
  body('type')
    .optional()
    .isIn(['PHOTO', 'REEL', 'CAROUSEL'])
    .withMessage('Type must be PHOTO, REEL, or CAROUSEL'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Additional file validation
    if (req.files && req.files.length > 0) {
      const invalidFiles = [];
      
      req.files.forEach((file, index) => {
        // Check file size for different types
        if (file.mimetype.startsWith('video/')) {
          if (file.size > 50 * 1024 * 1024) { // 50MB for videos
            invalidFiles.push(`File ${index + 1}: Video file too large (max 50MB)`);
          }
        } else if (file.mimetype.startsWith('image/')) {
          if (file.size > 10 * 1024 * 1024) { // 10MB for images
            invalidFiles.push(`File ${index + 1}: Image file too large (max 10MB)`);
          }
        }

        // Check file type based on intended post type
        if (req.body.type === 'REEL' && !file.mimetype.startsWith('video/')) {
          invalidFiles.push(`File ${index + 1}: REEL posts require video files`);
        }
      });

      if (invalidFiles.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'File validation failed',
          errors: invalidFiles
        });
      }
    }

    next();
  }
];

module.exports = {
  validateMediaUpload
};
