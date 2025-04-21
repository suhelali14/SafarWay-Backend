const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
  getAgencyDetails,
  getAgencyPackages,
  getAgencyReviews,
  getAgencyMedia,
  subscribeToAgency,
  unsubscribeFromAgency,
  likeMediaItem,
  unlikeMediaItem
} = require('../controllers/agencyPublic.controller');

// Public routes (no authentication required)
router.get('/:agencyId/details', getAgencyDetails);
router.get('/:agencyId/packages', getAgencyPackages);
router.get('/:agencyId/reviews', getAgencyReviews);
router.get('/:agencyId/media', getAgencyMedia);

// Routes that require authentication
router.post('/:agencyId/subscribe', authenticate, subscribeToAgency);
router.post('/:agencyId/unsubscribe', authenticate, unsubscribeFromAgency);
router.post('/:agencyId/media/:mediaId/like', authenticate, likeMediaItem);
router.post('/:agencyId/media/:mediaId/unlike', authenticate, unlikeMediaItem);

module.exports = router; 