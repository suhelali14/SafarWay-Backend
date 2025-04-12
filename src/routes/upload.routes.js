const express = require('express');
const router = express.Router();
const { uploadImage } = require('../controllers/upload.controller');
const { authenticateUser, authorizeRoles, requireAgency } = require('../middleware/auth.middleware');
const { upload, handleUploadError } = require('../middleware/upload.middleware');

// Upload image (Agency only)
router.post(
  '/',
  authenticateUser,
  authorizeRoles(['AGENCY_ADMIN', 'AGENCY_USER']),
  requireAgency,
  upload.single('image'),
  handleUploadError,
  uploadImage
);

// TODO: Add upload routes here
router.get('/', (req, res) => {
  res.json({ message: 'Upload routes working' });
});

module.exports = router; 