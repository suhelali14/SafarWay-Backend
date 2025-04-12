const express = require('express');
const router = express.Router();
const {
  createInvite,
  completeOnboarding,
  resendInvite,
  revokeInvite,
} = require('../controllers/invite.controller');
const {
  validateInviteUser,
  validateOnboarding,
} = require('../middleware/validation.middleware');
const {
  authenticateUser,
  authorizeRoles,
} = require('../middleware/auth.middleware');

// Create invitation (SafarWay Admin/User only)
router.post(
  '/',
  authenticateUser,
  authorizeRoles(['SAFARWAY_ADMIN', 'SAFARWAY_USER']),
  validateInviteUser,
  createInvite
);

// Complete onboarding
router.post('/onboard', validateOnboarding, completeOnboarding);

// Resend invitation (SafarWay Admin/User only)
router.post(
  '/:userId/resend',
  authenticateUser,
  authorizeRoles(['SAFARWAY_ADMIN', 'SAFARWAY_USER']),
  resendInvite
);

// Revoke invitation (SafarWay Admin/User only)
router.delete(
  '/:userId',
  authenticateUser,
  authorizeRoles(['SAFARWAY_ADMIN', 'SAFARWAY_USER']),
  revokeInvite
);

// TODO: Add invite routes here
router.get('/', (req, res) => {
  res.json({ message: 'Invite routes working' });
});

module.exports = router; 