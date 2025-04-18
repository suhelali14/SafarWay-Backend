const express = require('express');
const router = express.Router();
const {
  createBooking,
  getBookingById,
  getMyBookings,
  updateBookingStatus,
} = require('../controllers/booking.controller');
const { validateBooking } = require('../middleware/validation.middleware');
const { authenticate, authorizeRoles } = require('../middleware/auth.middleware');

// Base route for checking if routes are working
router.get('/', (req, res) => {
  res.json({ message: 'Booking routes working' });
});

// Create a new booking (Customer only)
router.post('/', authenticate, authorizeRoles(['CUSTOMER']), validateBooking, createBooking);

// Get customer's bookings
router.get('/customer/bookings', authenticate, authorizeRoles(['CUSTOMER']), getMyBookings);

// Get a specific booking
router.get('/:id', authenticate, getBookingById);

// Update booking status (Agency only)
router.patch(
  '/:id/status',
  authenticate,
  authorizeRoles(['AGENCY_ADMIN', 'AGENCY_USER']),
  updateBookingStatus
);

module.exports = router; 