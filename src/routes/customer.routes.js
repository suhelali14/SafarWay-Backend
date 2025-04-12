const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { authenticateUser, authorizeRoles } = require('../middleware/auth.middleware');

// Get all customers (admin and agency only)
router.get('/', authenticateUser, authorizeRoles(['SAFARWAY_ADMIN', 'AGENCY_ADMIN']), customerController.getAllCustomers);

// Get customer by ID (admin, agency, and the customer themselves)
router.get('/:id', authenticateUser, authorizeRoles(['SAFARWAY_ADMIN', 'AGENCY_ADMIN', 'CUSTOMER']), customerController.getCustomerById);

// Create a new customer (admin and agency only)
router.post('/', authenticateUser, authorizeRoles(['SAFARWAY_ADMIN', 'AGENCY_ADMIN']), customerController.createCustomer);

// Update customer (admin, agency, and the customer themselves)
router.put('/:id', authenticateUser, authorizeRoles(['SAFARWAY_ADMIN', 'AGENCY_ADMIN', 'CUSTOMER']), customerController.updateCustomer);

// Delete customer (admin and agency only)
router.delete('/:id', authenticateUser, authorizeRoles(['SAFARWAY_ADMIN', 'AGENCY_ADMIN']), customerController.deleteCustomer);

// Get customer bookings (admin, agency, and the customer themselves)
router.get('/:id/bookings', authenticateUser, authorizeRoles(['SAFARWAY_ADMIN', 'AGENCY_ADMIN', 'CUSTOMER']), customerController.getCustomerBookings);

module.exports = router; 