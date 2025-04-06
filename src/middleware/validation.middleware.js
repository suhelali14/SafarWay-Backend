const { z } = require('zod');

// User registration schema
const userRegistrationSchema = z.object({
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
  role: z.enum(['CUSTOMER']).default('CUSTOMER'),
  address: z.string().optional(),
});

// Agency registration schema
const agencyRegistrationSchema = z.object({
  name: z.string().min(2, 'Agency name must be at least 2 characters'),
  description: z.string().optional(),
  address: z.string().optional(),
  contactEmail: z.string().email('Invalid contact email'),
  contactPhone: z.string().min(10, 'Contact phone must be at least 10 characters'),
  logo: z.string().optional(),
  media: z.array(z.string()).optional(),
});

// Agency user registration schema
const agencyUserRegistrationSchema = z.object({
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
  role: z.enum(['AGENCY_ADMIN', 'AGENCY_USER']),
});

// Login schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Tour package schema
const tourPackageSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  subtitle: z.string().optional(),
  duration: z.number().min(1, 'Duration must be at least 1 day'),
  maxGroupSize: z.number().min(1, 'Group size must be at least 1'),
  pricePerPerson: z.number().min(0, 'Price must be non-negative'),
  tourType: z.enum(['ADVENTURE', 'CULTURAL', 'WILDLIFE', 'BEACH', 'MOUNTAIN', 'CITY', 'CRUISE', 'OTHER']),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  highlights: z.array(z.string()).min(1, 'At least one highlight is required'),
  includedItems: z.array(z.string()).optional(),
  excludedItems: z.array(z.string()).optional(),
  coverImage: z.string().optional(),
  galleryImages: z.array(z.string()).optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
  whatsapp: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  additionalInfo: z.string().optional(),
  itinerary: z.array(z.object({
    dayNumber: z.number().min(1),
    title: z.string().min(3),
    description: z.string().min(10),
    activities: z.array(z.object({
      title: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      description: z.string(),
    })),
    meals: z.object({
      breakfast: z.boolean(),
      lunch: z.boolean(),
      dinner: z.boolean(),
    }),
    accommodation: z.object({
      name: z.string(),
      details: z.string(),
    }),
    transport: z.object({
      type: z.string(),
      details: z.string(),
    }),
  })).optional(),
});

// Booking schema
const bookingSchema = z.object({
  tourPackageId: z.string().uuid(),
  startDate: z.string().datetime(),
  numberOfPeople: z.number().min(1),
});

// User update schema
const userUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  profileImage: z.string().optional(),
});

// Agency update schema
const agencyUpdateSchema = z.object({
  name: z.string().min(2, 'Agency name must be at least 2 characters').optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  contactEmail: z.string().email('Invalid contact email').optional(),
  contactPhone: z.string().min(10, 'Contact phone must be at least 10 characters').optional(),
  logo: z.string().optional(),
  media: z.array(z.string()).optional(),
});

// Invite user schema
const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['AGENCY_ADMIN', 'AGENCY_USER']),
  agencyId: z.string().uuid('Invalid agency ID'),
});

// Onboarding schema
const onboardingSchema = z.object({
  token: z.string(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

// Validation middleware
const validateUserRegistration = (req, res, next) => {
  try {
    userRegistrationSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.errors,
    });
  }
};

const validateAgencyRegistration = (req, res, next) => {
  try {
    agencyRegistrationSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.errors,
    });
  }
};

const validateAgencyUserRegistration = (req, res, next) => {
  try {
    agencyUserRegistrationSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.errors,
    });
  }
};

const validateLogin = (req, res, next) => {
  try {
    loginSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.errors,
    });
  }
};

const validateTourPackage = (req, res, next) => {
  try {
    tourPackageSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.errors,
    });
  }
};

const validateBooking = (req, res, next) => {
  try {
    bookingSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.errors,
    });
  }
};

const validateUserUpdate = (req, res, next) => {
  try {
    userUpdateSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.errors,
    });
  }
};

const validateAgencyUpdate = (req, res, next) => {
  try {
    agencyUpdateSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.errors,
    });
  }
};

const validateInviteUser = (req, res, next) => {
  try {
    inviteUserSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.errors,
    });
  }
};

const validateOnboarding = (req, res, next) => {
  try {
    onboardingSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.errors,
    });
  }
};

module.exports = {
  validateUserRegistration,
  validateAgencyRegistration,
  validateAgencyUserRegistration,
  validateLogin,
  validateTourPackage,
  validateBooking,
  validateUserUpdate,
  validateAgencyUpdate,
  validateInviteUser,
  validateOnboarding,
}; 