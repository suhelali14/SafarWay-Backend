const { z } = require('zod');
const { ApiError } = require('../utils/ApiError');

/**
 * Validate invite user request
 */
const validateInviteUser = (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email('Invalid email format'),
      role: z.enum(['AGENCY_ADMIN', 'AGENCY_USER', 'SAFARWAY_ADMIN', 'SAFARWAY_USER'], {
        errorMap: () => ({ message: 'Role must be AGENCY_ADMIN or AGENCY_USER' }),
      }),
    });
    
    schema.parse(req.body);
    next();
  } catch (error) {
    const errorMessages = error.errors.map(err => err.message).join(', ');
    res.status(400).json({
      message: 'Validation error',
      error: errorMessages,
    });
  }
};

/**
 * Validate complete registration request
 */
const validateCompleteRegistration = (req, res, next) => {
  try {
    const schema = z.object({
      token: z.string().min(1, 'Token is required'),
      name: z.string().min(2, 'Name must be at least 2 characters'),
      phone: z.string().optional(),
      password: z.string().min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    });
    
    schema.parse(req.body);
    next();
  } catch (error) {
    const errorMessages = error.errors.map(err => err.message).join(', ');
    res.status(400).json({
      message: 'Validation error',
      error: errorMessages,
    });
  }
};

/**
 * Validate update user role request
 */
const validateUpdateUserRole = (req, res, next) => {
  try {
    const schema = z.object({
      role: z.enum(['AGENCY_ADMIN', 'AGENCY_USER', 'SAFARWAY_ADMIN', 'SAFARWAY_USER'], {
        errorMap: () => ({ message: 'Role must be AGENCY_ADMIN or AGENCY_USER' }),
      }),
    });
    
    schema.parse(req.body);
    next();
  } catch (error) {
    const errorMessages = error.errors.map(err => err.message).join(', ');
    res.status(400).json({
      message: 'Validation error',
      error: errorMessages,
    });
  }
};

module.exports = {
  validateInviteUser,
  validateCompleteRegistration,
  validateUpdateUserRole,
}; 