const { z } = require('zod');
const { ApiError } = require('../utils/ApiError');

const validatePackage = (req, res, next) => {
  try {
    const packageSchema = z.object({
      name: z.string().min(3, 'Package name is required and must be at least 3 characters'),
      description: z.string().min(10, 'Description is required and must be at least 10 characters'),
      price: z.number().positive('Price must be a positive number'),
      duration: z.number().int().positive('Duration must be a positive integer'),
      destination: z.string().min(2, 'Destination is required'),
      inclusions: z.array(z.string()).min(1, 'At least one inclusion is required'),
      exclusions: z.array(z.string()).optional(),
    });

    const validatedData = packageSchema.parse(req.body);
    req.validatedData = validatedData;
    next();
  } catch (error) {
    if (error.errors) {
      next(new ApiError(400, error.errors[0].message));
    } else {
      next(new ApiError(400, 'Invalid package data'));
    }
  }
};

const validateBookingStatus = (req, res, next) => {
  try {
    const statusSchema = z.object({
      status: z.enum(['pending', 'confirmed', 'cancelled', 'completed'], {
        errorMap: () => ({ message: 'Status must be one of: pending, confirmed, cancelled, completed' })
      })
    });

    const validatedData = statusSchema.parse(req.body);
    req.validatedData = validatedData;
    next();
  } catch (error) {
    if (error.errors) {
      next(new ApiError(400, error.errors[0].message));
    } else {
      next(new ApiError(400, 'Invalid status data'));
    }
  }
};

const validateUser = (req, res, next) => {
  try {
    const userSchema = z.object({
      name: z.string().min(2, 'Name is required and must be at least 2 characters'),
      email: z.string().email('Valid email is required'),
      role: z.enum(['AGENCY_ADMIN', 'AGENCY_USER'], {
        errorMap: () => ({ message: 'Role must be either AGENCY_ADMIN or AGENCY_USER' })
      }),
      password: z.string().min(6, 'Password must be at least 6 characters'),
    });

    const validatedData = userSchema.parse(req.body);
    req.validatedData = validatedData;
    next();
  } catch (error) {
    if (error.errors) {
      next(new ApiError(400, error.errors[0].message));
    } else {
      next(new ApiError(400, 'Invalid user data'));
    }
  }
};

const validateAgencyProfile = (req, res, next) => {
  try {
    const profileSchema = z.object({
      name: z.string().min(2, 'Agency name must be at least 2 characters').optional(),
      description: z.string().min(10, 'Description must be at least 10 characters').optional(),
      email: z.string().email('Valid email is required').optional(),
      phone: z.string().min(6, 'Phone number must be at least 6 characters').optional(),
      address: z.string().min(5, 'Address must be at least 5 characters').optional(),
      city: z.string().min(2, 'City must be at least 2 characters').optional(),
      country: z.string().min(2, 'Country must be at least 2 characters').optional(),
      website: z.string().url('Website must be a valid URL').optional().nullable(),
      license: z.string().min(3, 'License number must be at least 3 characters').optional(),
    });

    const validatedData = profileSchema.parse(req.body);
    req.validatedData = validatedData;
    next();
  } catch (error) {
    if (error.errors) {
      next(new ApiError(400, error.errors[0].message));
    } else {
      next(new ApiError(400, 'Invalid profile data'));
    }
  }
};

const validateAgencySettings = (req, res, next) => {
  try {
    const settingsSchema = z.object({
      notifyBookings: z.boolean().optional(),
      notifyMessages: z.boolean().optional(),
      notifyMarketing: z.boolean().optional(),
      isPublic: z.boolean().optional(),
    });

    const validatedData = settingsSchema.parse(req.body);
    req.validatedData = validatedData;
    next();
  } catch (error) {
    if (error.errors) {
      next(new ApiError(400, error.errors[0].message));
    } else {
      next(new ApiError(400, 'Invalid settings data'));
    }
  }
};

const validateDocument = (req, res, next) => {
  try {
    const documentSchema = z.object({
      name: z.string().min(2, 'Document name is required and must be at least 2 characters'),
      documentType: z.enum(['business_license', 'tourism_certificate', 'insurance', 'tax_registration', 'other'], {
        errorMap: () => ({ message: 'Document type must be valid' })
      }),
    });

    const validatedData = documentSchema.parse(req.body);
    
    if (!req.file) {
      throw new ApiError(400, 'Document file is required');
    }
    
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      throw new ApiError(400, 'Only PDF, JPEG, and PNG files are allowed');
    }
    
    req.validatedData = validatedData;
    next();
  } catch (error) {
    if (error.errors) {
      next(new ApiError(400, error.errors[0].message));
    } else if (error instanceof ApiError) {
      next(error);
    } else {
      next(new ApiError(400, 'Invalid document data'));
    }
  }
};

module.exports = {
  validatePackage,
  validateBookingStatus,
  validateUser,
  validateAgencyProfile,
  validateAgencySettings,
  validateDocument
}; 