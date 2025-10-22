const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Helper function to generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};


// Register a new customer
const registerCustomer = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'User with this email already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and customer in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Create user
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone,
          role: 'CUSTOMER',
          status: 'ACTIVE',
        },
      });

      // Create customer profile
      const customer = await prisma.customer.create({
        data: {
          userId: user.id,
          address,
        },
      });

      return { user, customer };
    });

    // Generate token
    const token = generateToken(result.user.id, result.user.role);

    res.status(201).json({
      message: 'Customer registered successfully',
      data: {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Error registering customer',
      error: error.message,
    });
  }
};

// Register a new agency
const registerAgency = async (req, res) => {
  try {
    const {
      name,
      description,
      address,
      contactEmail,
      contactPhone,
      logo,
      media,
    } = req.body;

    // Check if agency already exists
    const existingAgency = await prisma.agency.findFirst({
      where: {
        OR: [
          { name },
          { contactEmail },
          { contactPhone },
        ],
      },
    });

    if (existingAgency) {
      return res.status(400).json({
        message: 'Agency with these details already exists',
      });
    }

    // Create agency
    const agency = await prisma.agency.create({
      data: {
        name,
        description,
        address,
        contactEmail,
        contactPhone,
        logo,
        media: media || [],
      },
    });

    res.status(201).json({
      message: 'Agency registered successfully',
      data: {
        agency: {
          id: agency.id,
          name: agency.name,
          contactEmail: agency.contactEmail,
        },
      },
    });
  } catch (error) {
    console.error('Agency registration error:', error);
    res.status(500).json({
      message: 'Error registering agency',
      error: error.message,
    });
  }
};

// Register an agency user (admin or staff)
const registerAgencyUser = async (req, res) => {
  try {
    const { name, email, password, phone, role, agencyId } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'User with this email already exists',
      });
    }

    // Verify agency exists
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
    });

    if (!agency) {
      return res.status(404).json({
        message: 'Agency not found',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role,
        status: 'ACTIVE',
        agencyId,
      },
    });

    // Generate token
    const token = generateToken(user.id, user.role);

    res.status(201).json({
      message: 'Agency user registered successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          agencyId: user.agencyId,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Agency user registration error:', error);
    res.status(500).json({
      message: 'Error registering agency user',
      error: error.message,
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Step 1: Fetch user (basic, no includes)
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials: User not found',
      });
    }

    // Step 2: Check if account is active
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        message: 'Account is not active',
      });
    }

    // Step 3: Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        message: 'Invalid credentials: Password not correct',
      });
    }

    // Step 4: Build `include` dynamically based on role
    let includeFields = {};
    if (user.role === 'AGENCY_ADMIN' || user.role === 'AGENCY_USER') {
      includeFields = { agency: true };
    } else if (user.role === 'CUSTOMER') {
      includeFields = { customer: true };
    }

    // Step 5: Fetch user with necessary relations
    const userWithRelations = await prisma.user.findUnique({
      where: { email },
      include: {
        ...includeFields,
      },
    });

    // Step 6: Generate token
    const token = generateToken(user.id, user.role);

    // Step 7: Send response
    res.json({
      message: 'Login successful',
      data: {
        user: {
          id: userWithRelations.id,
          name: userWithRelations.name,
          email: userWithRelations.email,
          role: userWithRelations.role,
          status: userWithRelations.status,
          agency: userWithRelations.agency || null,
          customer: userWithRelations.customer || null,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Error during login',
      error: error.message,
    });
  }
};

// Get current user profile
const getCurrentUser = async (req, res) => {
  try {
    // req.user is set by the auth middleware
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        agency: true,
        customer: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // Remove sensitive data
    const { password, ...userData } = user;

    res.json({
      data: userData,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      message: 'Error fetching user profile',
      error: error.message,
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { name, phone, address, profileImage } = req.body;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name,
        phone,
        profileImage,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        profileImage: true,
      },
    });

    // If user is a customer, update customer profile
    if (req.user.role === 'CUSTOMER' && address) {
      await prisma.customer.update({
        where: { userId: req.user.id },
        data: { address },
      });
    }

    res.json({
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      message: 'Error updating profile',
      error: error.message,
    });
  }
};

// Verify token and return user data
const verifyToken = async (req, res) => {
  try {
    // req.user is set by the auth middleware
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        agency: true,
        customer: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // Remove sensitive data
    const { password, ...userData } = user;

    res.json({
      message: 'Token verified successfully',
      data: {
        user: userData,
      },
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      message: 'Error verifying token',
      error: error.message,
    });
  }
};

module.exports = {
  registerCustomer,
  registerAgency,
  registerAgencyUser,
  login,
  getCurrentUser,
  updateProfile,
  verifyToken,
}; 