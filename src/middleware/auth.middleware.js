const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Middleware to authenticate users using JWT
 */
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        agency: true,
        customer: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Account is not active' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token ' + error.message });
  }
};

/**
 * Middleware to authorize users based on roles
 * @param {string[]} roles - Array of allowed roles
 */
const authorizeRoles = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied. Insufficient permissions.',
      });
    }
    next();
  };
};

/**
 * Middleware to check if user belongs to an agency
 */
const requireAgency = async (req, res, next) => {
  if (!req.user.agencyId) {
    return res.status(403).json({
      message: 'Access denied. User does not belong to an agency.',
    });
  }
  next();
};

/**
 * Middleware to check if user is the owner of the resource
 */
const isResourceOwner = (resourceUserId) => {
  return (req, res, next) => {
    if (req.user.id !== resourceUserId && req.user.role !== 'SAFARWAY_ADMIN') {
      return res.status(403).json({
        message: 'Access denied. You do not own this resource.',
      });
    }
    next();
  };
};

module.exports = {
  authenticateUser,
  authorizeRoles,
  requireAgency,
  isResourceOwner,
}; 