const express = require('express');
const router = express.Router();
const {
  inviteUser,
  completeRegistration,
  listAgencyUsers,
  getUserById,
  updateUserRole,
  suspendUser,
  activateUser,
  deleteUser,
  resendInvitation,
} = require('../controllers/agencyUsers.controller');

const {
  validateInviteUser,
  validateCompleteRegistration,
  validateUpdateUserRole,
} = require('../validators/user.validator');

const {
  authenticate,
  authorizeRoles,
  requireAgency,
} = require('../middleware/auth.middleware');

// Debug route - test endpoint without auth
router.get('/test', (req, res) => {
  res.status(200).json({ 
    message: 'Agency users route is working!',
    timestamp: new Date().toISOString(),
    headers: {
      authorization: req.headers.authorization ? 'Present' : 'Missing'
    }
  });
});

// Public route for completing registration from invite
router.post('/onboard', validateCompleteRegistration, completeRegistration);

// Protected routes require authentication and agency association
router.use(authenticate);

// Debug route - after auth but before agency check
router.get('/auth-check', (req, res) => {
  res.status(200).json({ 
    message: 'Authentication successful!',
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      agencyId: req.user.agencyId
    }
  });
});

// Agency requirement for most routes
router.use(requireAgency);

// Routes that require AGENCY_ADMIN role
const adminRoutes = [
  { path: '/invite', method: 'post', handler: inviteUser, validator: validateInviteUser },
  { path: '/:id/role', method: 'patch', handler: updateUserRole, validator: validateUpdateUserRole },
  { path: '/:id/suspend', method: 'post', handler: suspendUser },
  { path: '/:id/activate', method: 'post', handler: activateUser },
  { path: '/:id/resend-invite', method: 'post', handler: resendInvitation },
  { path: '/:id', method: 'delete', handler: deleteUser },
];

// Apply admin role restrictions to specific routes
adminRoutes.forEach(route => {
  const middlewares = [authorizeRoles(['AGENCY_ADMIN','SAFARWAY_ADMIN','SAFARWAY_USER'])];
  if (route.validator) {
    middlewares.push(route.validator);
  }
  router[route.method](route.path, ...middlewares, route.handler);
});

// Routes available to both AGENCY_ADMIN and AGENCY_USER
router.get('/', authorizeRoles(['AGENCY_ADMIN', 'AGENCY_USER','SAFARWAY_ADMIN','SAFARWAY_USER']), listAgencyUsers);
router.get('/:id', authorizeRoles(['AGENCY_ADMIN', 'AGENCY_USER','SAFARWAY_ADMIN','SAFARWAY_USER']), getUserById);

module.exports = router; 