const { TicketStatus, TicketPriority } = require('@prisma/client');
const ApiError = require('../utils/ApiError');

// Validate ticket creation
const validateTicket = (req, res, next) => {
  try {
    const { title, description, priority } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new ApiError(400, 'Title is required and must be a non-empty string');
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      throw new ApiError(400, 'Description is required and must be a non-empty string');
    }

    if (priority && !Object.values(TicketPriority).includes(priority)) {
      throw new ApiError(400, 'Invalid priority level');
    }

    // Trim whitespace from string fields
    req.body.title = title.trim();
    req.body.description = description.trim();

    next();
  } catch (error) {
    next(error);
  }
};

// Validate ticket status update
const validateTicketStatus = (req, res, next) => {
  try {
    const { status, comment } = req.body;

    if (!status || !Object.values(TicketStatus).includes(status)) {
      throw new ApiError(400, 'Valid status is required');
    }

    if (comment && (typeof comment !== 'string' || comment.trim().length === 0)) {
      throw new ApiError(400, 'Comment must be a non-empty string if provided');
    }

    // Trim whitespace from comment if provided
    if (comment) {
      req.body.comment = comment.trim();
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Validate ticket assignment
const validateTicketAssignment = (req, res, next) => {
  try {
    const { assignedToId, comment } = req.body;

    if (assignedToId && typeof assignedToId !== 'string') {
      throw new ApiError(400, 'Assigned user ID must be a string');
    }

    if (comment && (typeof comment !== 'string' || comment.trim().length === 0)) {
      throw new ApiError(400, 'Comment must be a non-empty string if provided');
    }

    // Trim whitespace from comment if provided
    if (comment) {
      req.body.comment = comment.trim();
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateTicket,
  validateTicketStatus,
  validateTicketAssignment
}; 