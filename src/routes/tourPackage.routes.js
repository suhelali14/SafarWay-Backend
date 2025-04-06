const express = require('express');
const router = express.Router();
const {
  createTourPackage,
  getAllTourPackages,
  getTourPackageById,
  updateTourPackage,
  deleteTourPackage,
} = require('../controllers/tourPackage.controller');
const { validateTourPackage } = require('../middleware/validation.middleware');
const { authenticateUser, authorizeRoles, requireAgency } = require('../middleware/auth.middleware');

// Public routes
router.get('/', getAllTourPackages);
router.get('/:id', getTourPackageById);

// Protected routes (Agency only)
router.post(
  '/',
  authenticateUser,
  authorizeRoles(['AGENCY_ADMIN', 'AGENCY_USER']),
  requireAgency,
  validateTourPackage,
  createTourPackage
);

router.put(
  '/:id',
  authenticateUser,
  authorizeRoles(['AGENCY_ADMIN', 'AGENCY_USER']),
  requireAgency,
  validateTourPackage,
  updateTourPackage
);

router.delete(
  '/:id',
  authenticateUser,
  authorizeRoles(['AGENCY_ADMIN']),
  requireAgency,
  deleteTourPackage
);

module.exports = router; 