const express = require('express');
const router = express.Router();
const {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getProfile,
  getMyBookings,
  getOngoingTrips,
  getUpcomingTrips,
  getRecommendedPackages,
  getWishlist,
  getValidOffers,
  getDashboardStats,
  getAgencyById
} = require('../controllers/customer.controller');
const { authenticate, authorizeRoles } = require('../middleware/auth.middleware');
const { getAllPackages, getPackageById } = require('../controllers/package.controller');

// Base route for checking if routes are working
router.get('/', (req, res) => {
  res.json({ message: 'Customer routes working' });
});

// Routes for admin to manage customers
router.get('/all', authenticate, authorizeRoles(['SAFARWAY_ADMIN']), getAllCustomers);
router.get('/details/:id', authenticate, authorizeRoles(['SAFARWAY_ADMIN']), getCustomerById);
router.post('/', authenticate, authorizeRoles(['SAFARWAY_ADMIN']), createCustomer);
router.put('/:id', authenticate, authorizeRoles(['SAFARWAY_ADMIN']), updateCustomer);
router.delete('/:id', authenticate, authorizeRoles(['SAFARWAY_ADMIN']), deleteCustomer);

// Customer package routes
router.get('/packages', getAllPackages);
router.get('/packages/:id', getPackageById);

// Customer agency routes
router.get('/agency-public/:id/details',getAgencyById )
// Customer dashboard routes - protected by customer role
router.get('/profile', authenticate, authorizeRoles(['CUSTOMER']), getProfile);
router.get('/bookings', authenticate, authorizeRoles(['CUSTOMER']), getMyBookings);
router.get('/trips/ongoing', authenticate, authorizeRoles(['CUSTOMER']), getOngoingTrips);
router.get('/trips/upcoming', authenticate, authorizeRoles(['CUSTOMER']), getUpcomingTrips);
router.get('/packages/recommended', authenticate, authorizeRoles(['CUSTOMER']), getRecommendedPackages);
router.get('/wishlist', authenticate, authorizeRoles(['CUSTOMER']), getWishlist);
router.get('/offers', authenticate, authorizeRoles(['CUSTOMER']), getValidOffers);
router.get('/dashboard/stats', authenticate, authorizeRoles(['CUSTOMER']), getDashboardStats);

module.exports = router; 