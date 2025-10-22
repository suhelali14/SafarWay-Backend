const express = require('express');
const router = express.Router();
const { uploadImage, uploadMedia } = require('../controllers/upload.controller');
const { authenticate, authorizeRoles, requireAgency } = require('../middleware/auth.middleware');
const { upload, handleUploadError } = require('../middleware/upload.middleware');
const { mediaUpload, handleMediaUploadError } = require('../middleware/media.upload.middleware');
const { validateMediaUpload } = require('../validators/media.validator');

// Upload image (Agency only)
router.post(
  '/',
  authenticate,
  authorizeRoles(['AGENCY_ADMIN', 'AGENCY_USER']),
  requireAgency,
  upload.single('image'),
  handleUploadError,
  uploadImage
);

// Upload media files for posts (authenticated users)
router.post(
  '/media',
  authenticate,
  mediaUpload.array('files', 10),
  handleMediaUploadError,
  validateMediaUpload,
  uploadMedia
);

// TODO: Add upload routes here
router.get('/', (req, res) => {
  res.json({ message: 'Upload routes working' });
});

module.exports = router; 