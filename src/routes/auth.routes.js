const express = require('express');
const router = express.Router();
const {
  registerCustomer,
  registerAgency,
  registerAgencyUser,
  login,
  getCurrentUser,
  updateProfile,
} = require('../controllers/auth.controller');
const {
  validateUserRegistration,
  validateAgencyRegistration,
  validateAgencyUserRegistration,
  validateLogin,
  validateUserUpdate,
} = require('../middleware/validation.middleware');
const { authenticateUser } = require('../middleware/auth.middleware');

// Public routes
router.post('/register/customer', validateUserRegistration, registerCustomer);
router.post('/register/agency', validateAgencyRegistration, registerAgency);
router.post('/register/agency-user', validateAgencyUserRegistration, registerAgencyUser);
router.post('/login', validateLogin, login);

// Protected routes
router.get('/me', authenticateUser, getCurrentUser);
router.patch('/profile', authenticateUser, validateUserUpdate, updateProfile);

module.exports = router; 