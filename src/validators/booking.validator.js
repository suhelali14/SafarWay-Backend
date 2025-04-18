const ApiError = require('../utils/ApiError');

// Validate booking creation
const validateBookingCreation = (req, res, next) => {
  try {
    const { packageId, startDate, numberOfPeople, specialRequests } = req.body;

    // Package ID validation
    if (!packageId || typeof packageId !== 'string') {
      throw new ApiError(400, 'Valid package ID is required');
    }

    // Start date validation
    if (!startDate || isNaN(Date.parse(startDate))) {
      throw new ApiError(400, 'Valid start date is required');
    }

    // Number of people validation
    if (!numberOfPeople || typeof numberOfPeople !== 'number' || numberOfPeople < 1) {
      throw new ApiError(400, 'Number of people must be at least 1');
    }

    // Special requests validation (optional)
    if (specialRequests && typeof specialRequests !== 'string') {
      throw new ApiError(400, 'Special requests must be a string');
    }

    // Trim whitespace from string fields
    if (specialRequests) {
      req.body.specialRequests = specialRequests.trim();
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Validate booking status update
const validateBookingStatusUpdate = (req, res, next) => {
  try {
    const { status, cancellationReason } = req.body;

    // Status validation
    const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
    if (!status || !validStatuses.includes(status)) {
      throw new ApiError(400, 'Valid booking status is required');
    }

    // Cancellation reason validation (required if status is CANCELLED)
    if (status === 'CANCELLED') {
      if (!cancellationReason || typeof cancellationReason !== 'string' || cancellationReason.trim().length === 0) {
        throw new ApiError(400, 'Cancellation reason is required when cancelling a booking');
      }
      req.body.cancellationReason = cancellationReason.trim();
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Validate booking payment
const validateBookingPayment = (req, res, next) => {
  try {
    const { amount, paymentMethod } = req.body;

    // Amount validation
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      throw new ApiError(400, 'Valid payment amount is required');
    }

    // Payment method validation
    const validPaymentMethods = ['CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'PAYPAL'];
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      throw new ApiError(400, 'Valid payment method is required');
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateBookingCreation,
  validateBookingStatusUpdate,
  validateBookingPayment
}; 