const { z } = require('zod');

// User management schemas
const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  phone: z.string().optional(),
  role: z.enum(['SAFARWAY_ADMIN', 'SAFARWAY_USER', 'AGENCY_ADMIN', 'AGENCY_USER', 'CUSTOMER']),
  status: z.enum(['INVITED', 'ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
  role: z.enum(['SAFARWAY_ADMIN', 'SAFARWAY_USER', 'AGENCY_ADMIN', 'AGENCY_USER', 'CUSTOMER']).optional(),
  status: z.enum(['INVITED', 'ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

// Agency management schemas
const createAgencySchema = z.object({
  name: z.string().min(2, 'Agency name must be at least 2 characters'),
  description: z.string().optional(),
  address: z.string().optional(),
  contactEmail: z.string().email('Invalid contact email'),
  contactPhone: z.string().min(10, 'Contact phone must be at least 10 characters'),
  logo: z.string().optional(),
  media: z.array(z.string()).optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED']).optional(),
});

const updateAgencySchema = z.object({
  name: z.string().min(2, 'Agency name must be at least 2 characters').optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  contactEmail: z.string().email('Invalid contact email').optional(),
  contactPhone: z.string().min(10, 'Contact phone must be at least 10 characters').optional(),
  logo: z.string().optional(),
  media: z.array(z.string()).optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED']).optional(),
});

// Booking management schemas
const updateBookingStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']),
  paymentStatus: z.enum(['PENDING', 'PAID', 'REFUNDED', 'PARTIALLY_REFUNDED']).optional(),
});

// Refund request schemas
const approveRefundSchema = z.object({
  amount: z.number().min(0, 'Refund amount must be non-negative'),
  reason: z.string().optional(),
});

// Support ticket schemas
const updateSupportTicketSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

const addTicketResponseSchema = z.object({
  message: z.string().min(1, 'Response message is required'),
});

// Validation middleware functions
const validateCreateUser = (req, res, next) => {
  try {
    createUserSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.errors,
    });
  }
};

const validateUpdateUser = (req, res, next) => {
  try {
    updateUserSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.errors,
    });
  }
};

const validateCreateAgency = (req, res, next) => {
  try {
    createAgencySchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.errors,
    });
  }
};

const validateUpdateAgency = (req, res, next) => {
  try {
    updateAgencySchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.errors,
    });
  }
};

const validateUpdateBookingStatus = (req, res, next) => {
  try {
    updateBookingStatusSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.errors,
    });
  }
};

const validateApproveRefund = (req, res, next) => {
  try {
    approveRefundSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.errors,
    });
  }
};

const validateUpdateSupportTicket = (req, res, next) => {
  try {
    updateSupportTicketSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.errors,
    });
  }
};

const validateAddTicketResponse = (req, res, next) => {
  try {
    addTicketResponseSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.errors,
    });
  }
};

module.exports = {
  validateCreateUser,
  validateUpdateUser,
  validateCreateAgency,
  validateUpdateAgency,
  validateUpdateBookingStatus,
  validateApproveRefund,
  validateUpdateSupportTicket,
  validateAddTicketResponse,
}; 