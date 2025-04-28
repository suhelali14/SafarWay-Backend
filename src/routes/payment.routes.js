const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth.middleware');

// Mock payment controller functions - replace with actual implementation
const paymentController = {
  createPaymentIntent: (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Payment intent created successfully',
      data: {
        clientSecret: 'mock_client_secret_' + Date.now(),
        amount: req.body.amount,
        currency: 'USD'
      }
    });
  },
  
  verifyPayment: (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        status: 'COMPLETED',
        transactionId: 'mock_transaction_' + Date.now()
      }
    });
  },
  
  getPaymentHistory: (req, res) => {
    res.status(200).json({
      success: true,
      data: [
        {
          id: 'payment_1',
          amount: 250,
          currency: 'USD',
          status: 'COMPLETED',
          createdAt: new Date().toISOString(),
          bookingId: 'booking_1'
        }
      ]
    });
  }
};

// General payment routes
router.get('/', (req, res) => {
  res.json({ message: 'Payment routes working' });
});

// Protected payment routes
router.post('/create-intent', authenticate, paymentController.createPaymentIntent);
router.post('/verify/:paymentId', authenticate, paymentController.verifyPayment);
router.get('/history', authenticate, paymentController.getPaymentHistory);

// Admin payment routes
router.get('/admin/transactions', 
  authenticate, 
  authorizeRoles(['SAFARWAY_ADMIN']), 
  (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        transactions: []
      }
    });
  }
);

// Agency payment routes
router.get('/agency/transactions', 
  authenticate, 
  authorizeRoles(['AGENCY_ADMIN']), 
  (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        transactions: []
      }
    });
  }
);

module.exports = router; 