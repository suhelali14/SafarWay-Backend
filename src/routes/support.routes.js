const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validateTicket } = require('../validators/support.validator');
const {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  addResponse,
  assignTicket,
  closeTicket
} = require('../controllers/support.controller');

// Public routes for creating tickets
router.post('/tickets', validateTicket, createTicket);

// Protected routes
router.use(authenticate);

// Customer routes
router.get('/tickets/my', getTickets);
router.get('/tickets/:id', getTicketById);
router.post('/tickets/:id/responses', addResponse);

// Admin and support staff routes
router.use('/tickets/manage', authorize(['SAFARWAY_ADMIN', 'SUPPORT_STAFF']));
router.get('/tickets', getTickets);
router.put('/tickets/:id', updateTicket);
router.post('/tickets/:id/assign', assignTicket);
router.post('/tickets/:id/close', closeTicket);

module.exports = router; 