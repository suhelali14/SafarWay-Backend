const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate, authorizeRoles } = require('../middleware/auth.middleware');

// Apply authentication middleware to all analytics routes
router.use(authenticate);

// Dashboard stats - accessible by admins and agency admins
router.get('/dashboard', authorizeRoles(['SAFARWAY_ADMIN', 'AGENCY_ADMIN']), analyticsController.getDashboardStats);

// Booking stats - accessible by admins and agency admins
router.get('/bookings', authorizeRoles(['SAFARWAY_ADMIN', 'AGENCY_ADMIN']), analyticsController.getBookingStats);

// Revenue stats - accessible by admins and agency admins
router.get('/revenue', authorizeRoles(['SAFARWAY_ADMIN', 'AGENCY_ADMIN']), analyticsController.getRevenueStats);

module.exports = router; 