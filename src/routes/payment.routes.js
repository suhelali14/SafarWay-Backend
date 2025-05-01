const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth.middleware');
const paymentControllers = require('../controllers/payment.controller');

// General payment routes
router.get('/', (req, res) => {
  res.json({ message: 'Payment routes working' });
});

// Protected payment routes
router.post('/create-intent', authenticate, paymentControllers.createPaymentIntent);
router.post('/verify/:paymentId', authenticate, paymentControllers.verifyPayment);
router.get('/history', authenticate, paymentControllers.getPaymentHistory);

// Admin payment routes
router.get(
  '/admin/transactions',
  authenticate,
  authorizeRoles(['SAFARWAY_ADMIN']),
  paymentControllers.getAdminTransactions
);

// Agency payment routes
router.get(
  '/agency/transactions',
  authenticate,
  authorizeRoles(['AGENCY_ADMIN']),
  paymentControllers.getAgencyTransactions
);

// Payment success endpoint
router.get('/success', paymentControllers.handlePaymentSuccess);
router.get('/failure', paymentControllers.handlePaymentBookingFailure);

// Webhook endpoint
router.post('/webhooks/cashfree', paymentControllers.handleWebhook);

// Invoice download endpoint
router.get('/invoices', paymentControllers.downloadInvoice);

// Temporary booking check endpoint
router.get('/check-booking/:bookingId', async (req, res) => {
  const { bookingId } = req.params;
  try {
    const prisma = require('@prisma/client').PrismaClient;
    const prismaClient = new prisma();
    const booking = await prismaClient.booking.findUnique({
      where: { id: bookingId },
      include: { tourPackage: true, customer: { include: { user: true } }, travelers: true },
    });
    res.json({ exists: !!booking, booking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;