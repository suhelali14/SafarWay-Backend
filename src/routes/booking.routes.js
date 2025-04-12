const express = require('express');
const router = express.Router();
const {
  createBooking,
  getBookingById,
  getCustomerBookings,
  updateBookingStatus,
} = require('../controllers/booking.controller');
const { validateBooking } = require('../middleware/validation.middleware');
const { authenticateUser, authorizeRoles } = require('../middleware/auth.middleware');

// Create a new booking (Customer only)
router.post('/', authenticateUser, authorizeRoles(['CUSTOMER']), validateBooking, createBooking);

// Get a specific booking
router.get('/:id', authenticateUser, getBookingById);

// Get customer's bookings
router.get('/customer/bookings', authenticateUser, authorizeRoles(['CUSTOMER']), getCustomerBookings);

// Update booking status (Agency only)
router.patch(
  '/:id/status',
  authenticateUser,
  authorizeRoles(['AGENCY_ADMIN', 'AGENCY_USER']),
  updateBookingStatus
);

// TODO: Add booking routes here
router.get('/', (req, res) => {
  res.json({ message: 'Booking routes working' });
});

module.exports = router; 