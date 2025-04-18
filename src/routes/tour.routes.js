const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth.middleware');
const packageController = require('../controllers/package.controller');

// Base route for checking if routes are working
router.get('/', (req, res) => {
  res.json({ message: 'Tour routes working' });
});

// Get all packages (public)
router.get('/all', packageController.getAllPackages);

// Search packages (public)
router.get('/search', packageController.searchPackages);

// Get package by ID (public)
router.get('/:id', packageController.getPackageById);

// Get similar packages (public)
router.get('/:id/similar', packageController.getSimilarPackages);

// Wishlist routes (authenticated)
router.post('/wishlist', authenticate, packageController.addToWishlist);
router.delete('/wishlist/:id', authenticate, packageController.removeFromWishlist);

module.exports = router; 