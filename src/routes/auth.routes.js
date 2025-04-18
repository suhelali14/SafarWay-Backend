const express = require('express');
const router = express.Router();
const {
  registerCustomer,
  registerAgency,
  registerAgencyUser,
  login,
  getCurrentUser,
  updateProfile,
  verifyToken,
} = require('../controllers/auth.controller');
const {
  validateUserRegistration,
  validateAgencyRegistration,
  validateAgencyUserRegistration,
  validateLogin,
  validateUserUpdate,
} = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');

// Public routes
router.post('/register/customer', validateUserRegistration, registerCustomer);
router.post('/register/agency', validateAgencyRegistration, registerAgency);
router.post('/register/agency-user', validateAgencyUserRegistration, registerAgencyUser);
router.post('/login', validateLogin, login);

// Protected routes
router.get('/me', authenticate, getCurrentUser);
router.get('/verify', authenticate, verifyToken);
router.patch('/profile', authenticate, validateUserUpdate, updateProfile);

// TODO: Add auth routes here
router.get('/', (req, res) => {
  res.json({ message: 'Auth routes working' });
});

module.exports = router; 