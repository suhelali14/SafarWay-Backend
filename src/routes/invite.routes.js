const express = require('express');
const router = express.Router();
const {
  createInvite,
  completeOnboarding,
  resendInvite,
  revokeInvite,
  verifyInviteToken,
} = require('../controllers/invite.controller');
const {
  validateInviteUser,
  validateOnboarding,
} = require('../middleware/validation.middleware');
const {
  authenticate,
  authorizeRoles,
} = require('../middleware/auth.middleware');

// Create invitation (SafarWay Admin/User only)
router.post(
  '/',
  authenticate,
  authorizeRoles(['SAFARWAY_ADMIN', 'SAFARWAY_USER']),
  validateInviteUser,
  createInvite
);

// Complete onboarding
router.post('/onboard', validateOnboarding, completeOnboarding);

// Verify invite token
router.get('/verify/:token', verifyInviteToken);

// Resend invitation (SafarWay Admin/User only)
router.post(
  '/:userId/resend',
  authenticate,
  authorizeRoles(['SAFARWAY_ADMIN', 'SAFARWAY_USER']),
  resendInvite
);

// Revoke invitation (SafarWay Admin/User only)
router.delete(
  '/:userId',
  authenticate,
  authorizeRoles(['SAFARWAY_ADMIN', 'SAFARWAY_USER']),
  revokeInvite
);

// Base route for checking if invite routes are working
router.get('/', (req, res) => {
  res.json({ message: 'Invite routes working' });
});

module.exports = router; 