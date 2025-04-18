const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validateTicket, validateTicketStatus, validateTicketAssignment } = require('../validators/ticket.validator');
const {
  createTicket,
  getTickets,
  getTicketById,
  assignTicket,
  updateTicketStatus,
  getTicketLogs
} = require('../controllers/ticket.controller');

// Create a new ticket
router.post('/', authenticate, validateTicket, createTicket);

// Get all tickets (with pagination and filters)
router.get('/', authenticate, getTickets);

// Get a specific ticket by ID
router.get('/:id', authenticate, getTicketById);

// Assign a ticket
router.patch('/:id/assign', authenticate, validateTicketAssignment, assignTicket);

// Update ticket status
router.patch('/:id/status', authenticate, validateTicketStatus, updateTicketStatus);

// Get ticket logs
router.get('/:id/logs', authenticate, getTicketLogs);

module.exports = router; 