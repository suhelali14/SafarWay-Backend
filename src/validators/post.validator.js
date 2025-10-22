const { body, param, query, validationResult } = require('express-validator');

// Validation for creating a post
const validatePost = [
  body('type')
    .isIn(['PHOTO', 'REEL', 'CAROUSEL'])
    .withMessage('Type must be PHOTO, REEL, or CAROUSEL'),
  
  body('caption')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Caption must not exceed 2000 characters'),
  
  body('mediaUrls')
    .isArray({ min: 1, max: 10 })
    .withMessage('Must provide 1-10 media URLs'),
  
  body('mediaUrls.*')
    .custom((value) => {
      // Allow localhost URLs for development
      if (value.startsWith('http://localhost') || value.startsWith('https://localhost')) {
        return true;
      }
      // Use standard URL validation for other URLs
      return /^https?:\/\/.+/.test(value);
    })
    .withMessage('Each media URL must be valid'),
  
  body('thumbnailUrl')
    .optional()
    .custom((value) => {
      if (!value) return true; // Optional field
      // Allow localhost URLs for development
      if (value.startsWith('http://localhost') || value.startsWith('https://localhost')) {
        return true;
      }
      // Use standard URL validation for other URLs
      return /^https?:\/\/.+/.test(value);
    })
    .withMessage('Thumbnail URL must be valid'),
  
  body('duration')
    .optional()
    .isInt({ min: 1, max: 300 })
    .withMessage('Duration must be between 1-300 seconds'),
  
  body('location')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Location must not exceed 200 characters'),
  
  body('bookingId')
    .isUUID()
    .withMessage('Booking ID must be a valid UUID'),
  
  body('agencyId')
    .isUUID()
    .withMessage('Agency ID must be a valid UUID'),
  
  body('tourPackageId')
    .isUUID()
    .withMessage('Tour Package ID must be a valid UUID'),
  
  body('hashtags')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Maximum 20 hashtags allowed'),
  
  body('hashtags.*')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each hashtag must be 1-50 characters'),
  
  body('taggedUsers')
    .optional()
    .isArray({ max: 30 })
    .withMessage('Maximum 30 users can be tagged'),
  
  body('taggedUsers.*')
    .optional()
    .isUUID()
    .withMessage('Each tagged user ID must be a valid UUID'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

// Validation for comments
const validateComment = [
  body('content')
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be 1-1000 characters'),
  
  body('parentCommentId')
    .optional()
    .isUUID()
    .withMessage('Parent comment ID must be a valid UUID'),
  
  param('postId')
    .isUUID()
    .withMessage('Post ID must be a valid UUID'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

// Validation for reporting
const validateReport = [
  body('reason')
    .isIn(['SPAM', 'INAPPROPRIATE_CONTENT', 'HARASSMENT', 'COPYRIGHT', 'FAKE_REVIEW', 'OTHER'])
    .withMessage('Invalid report reason'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  param('postId')
    .isUUID()
    .withMessage('Post ID must be a valid UUID'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

// Validation for post ID parameter
const validatePostId = [
  param('postId')
    .isUUID()
    .withMessage('Post ID must be a valid UUID'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID',
        errors: errors.array()
      });
    }
    next();
  }
];

// Validation for pagination
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1-50'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pagination parameters',
        errors: errors.array()
      });
    }
    next();
  }
];

// Validation for feed filters
const validateFeedFilters = [
  query('type')
    .optional()
    .isIn(['PHOTO', 'REEL', 'CAROUSEL'])
    .withMessage('Type must be PHOTO, REEL, or CAROUSEL'),
  
  query('agencyId')
    .optional()
    .isUUID()
    .withMessage('Agency ID must be a valid UUID'),
  
  query('tourPackageId')
    .optional()
    .isUUID()
    .withMessage('Tour Package ID must be a valid UUID'),
  
  query('following')
    .optional()
    .isBoolean()
    .withMessage('Following must be a boolean'),
  
  ...validatePagination
];

module.exports = {
  validatePost,
  validateComment,
  validateReport,
  validatePostId,
  validatePagination,
  validateFeedFilters
};
