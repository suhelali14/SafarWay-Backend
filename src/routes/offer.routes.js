const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth.middleware');
const offerController = require('../controllers/offer.controller');

// Base route for checking if routes are working
router.get('/', (req, res) => {
  res.json({ message: 'Offer routes working' });
});

// Public routes
router.get('/valid', offerController.getValidOffers);
router.get('/:id', offerController.getOfferById);

// Admin routes
router.get('/all', authenticate, authorizeRoles(['SAFARWAY_ADMIN']), offerController.getAllOffers);
router.post('/', authenticate, authorizeRoles(['SAFARWAY_ADMIN']), offerController.createOffer);
router.put('/:id', authenticate, authorizeRoles(['SAFARWAY_ADMIN']), offerController.updateOffer);
router.delete('/:id', authenticate, authorizeRoles(['SAFARWAY_ADMIN']), offerController.deleteOffer);

module.exports = router; 