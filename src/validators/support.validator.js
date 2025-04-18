const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validator');

const validateTicket = [
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ min: 5, max: 100 })
    .withMessage('Subject must be between 5 and 100 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),

  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Invalid priority level'),

  body('category')
    .optional()
    .isIn(['GENERAL', 'TECHNICAL', 'BILLING', 'BOOKING', 'OTHER'])
    .withMessage('Invalid category'),

  validateRequest,
];

const validateResponse = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Response message is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Response must be between 1 and 1000 characters'),

  validateRequest,
];

const validateAssignment = [
  body('staffId')
    .notEmpty()
    .withMessage('Staff ID is required')
    .isUUID()
    .withMessage('Invalid staff ID'),

  validateRequest,
];

const validateTicketUpdate = [
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Invalid priority level'),

  body('category')
    .optional()
    .isIn(['GENERAL', 'TECHNICAL', 'BILLING', 'BOOKING', 'OTHER'])
    .withMessage('Invalid category'),

  body('status')
    .optional()
    .isIn(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
    .withMessage('Invalid status'),

  validateRequest,
];

const validateTicketClose = [
  body('resolution')
    .trim()
    .notEmpty()
    .withMessage('Resolution is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Resolution must be between 10 and 1000 characters'),

  validateRequest,
];

module.exports = {
  validateTicket,
  validateResponse,
  validateAssignment,
  validateTicketUpdate,
  validateTicketClose,
}; 