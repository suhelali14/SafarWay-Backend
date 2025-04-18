const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Middleware to authenticate users using JWT
 */
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(500).json({ message: 'Authentication error', error: error.message });
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

const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'SAFARWAY_ADMIN') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

const authorizeAgency = (req, res, next) => {
  if (!['AGENCY_ADMIN', 'AGENCY_USER'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Agency access required' });
  }
  next();
};

const authorizeAgencyAdmin = (req, res, next) => {
  if (req.user.role !== 'AGENCY_ADMIN') {
    return res.status(403).json({ message: 'Agency admin access required' });
  }
  next();
};

module.exports = {
  authenticate,
  authorizeRoles,
  requireAgency,
  isResourceOwner,
  authorizeAdmin,
  authorizeAgency,
  authorizeAgencyAdmin
}; 