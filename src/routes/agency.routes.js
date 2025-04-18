const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorizeRoles } = require('../middleware/auth.middleware');
const { validateAgencyProfile, validateAgencySettings, validateDocument } = require('../validators/agency.validator');
const {
  getDashboardSummary,
  getPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
  getBookings,
  getBookingById,
  updateBookingStatus,
  getPayments,
  getProfile,
  updateProfile,
  getVerificationDocuments,
  uploadVerificationDocument,
  deleteVerificationDocument,
  updateAgencySettings,
  getAgencySettings,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  exportPackage
} = require('../controllers/agency.controller');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Apply authentication middleware to all routes
router.use(authenticate);
router.use(authorizeRoles(['AGENCY_ADMIN', 'AGENCY_USER']));

// Dashboard
router.get('/dashboard', getDashboardSummary);

// Packages
router.get('/packages', getPackages);
router.get('/packages/:id', getPackageById);
router.get('/packages/:id/export', exportPackage);
router.post('/packages', upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'images', maxCount: 10 }
]), authorizeRoles(['AGENCY_ADMIN', 'AGENCY_USER']), createPackage);
router.put('/packages/:id', upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'images', maxCount: 10 }
]), authorizeRoles(['AGENCY_ADMIN', 'AGENCY_USER']), updatePackage);
router.delete('/packages/:id', authorizeRoles(['AGENCY_ADMIN', 'AGENCY_USER']), deletePackage);

// Bookings
router.get('/bookings', getBookings);
router.get('/bookings/:id', getBookingById);
router.patch('/bookings/:id/status', updateBookingStatus);

// Payments
router.get('/payments', getPayments);

// Profile
router.get('/profile', getProfile);
router.put('/profile', upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]), validateAgencyProfile, updateProfile);

// Verification Documents
router.get('/documents', getVerificationDocuments);
router.post('/documents', upload.single('document'), validateDocument, uploadVerificationDocument);
router.delete('/documents/:documentId', deleteVerificationDocument);

// Settings
router.get('/settings', getAgencySettings);
router.put('/settings', validateAgencySettings, updateAgencySettings);

// Users (Only for AGENCY_ADMIN)
router.get('/users', authorizeRoles(['AGENCY_ADMIN']), getUsers);
router.get('/users/:id', authorizeRoles(['AGENCY_ADMIN']), getUserById);
router.post('/users', authorizeRoles(['AGENCY_ADMIN']), createUser);
router.put('/users/:id', authorizeRoles(['AGENCY_ADMIN']), updateUser);
router.delete('/users/:id', authorizeRoles(['AGENCY_ADMIN']), deleteUser);

module.exports = router; 