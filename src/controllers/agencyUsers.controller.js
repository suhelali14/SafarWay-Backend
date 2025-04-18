const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const ApiError = require('../utils/ApiError');

const prisma = new PrismaClient();

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Generate a secure invitation token
 * @param {string} email - User email
 * @param {string} role - User role
 * @param {string} agencyId - Agency ID
 * @returns {string} JWT token
 */
const generateInviteToken = (email, role, agencyId) => {
  return jwt.sign(
    { email, role, agencyId },
    process.env.JWT_SECRET,
    { expiresIn: '48h' }
  );
};

/**
 * Send invitation email to user
 * @param {string} email - User email
 * @param {string} role - User role
 * @param {string} token - Invitation token
 * @returns {Promise<void>}
 */
const sendInviteEmail = async (email, role, token) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const inviteUrl = `${frontendUrl}/accept-invite?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@safarway.com',
    to: email,
    subject: 'You are invited to join SafarWay Agency Portal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You're invited to join SafarWay</h2>
        <p>You have been invited to join SafarWay as a <strong>${role.replace('_', ' ')}</strong>.</p>
        <p>Click the link below to complete your registration:</p>
        <p>
          <a href="${inviteUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            Accept Invitation
          </a>
        </p>
        <p>This invitation link will expire in 48 hours.</p>
        <p>If you did not expect this invitation, please ignore this email.</p>
      </div>
    `,
  };
  
  await transporter.sendMail(mailOptions);
};

/**
 * Invite a new user to the agency
 * @route POST /agency/users/invite
 */
const inviteUser = async (req, res) => {
  try {
    const { email, role, targetAgencyId } = req.body;
    const userRole = req.user.role;
    let agencyId = req.user.agencyId;
    
    console.log('Invite user request:', { 
      userRole, 
      agencyId, 
      targetAgencyId,
      requestedRole: role
    });
    
    // Validate role
    if (!['AGENCY_ADMIN', 'AGENCY_USER', 'SAFARWAY_ADMIN', 'SAFARWAY_USER'].includes(role)) {
      return res.status(400).json({
        message: 'Invalid role. Must be one of AGENCY_ADMIN, AGENCY_USER, SAFARWAY_ADMIN, or SAFARWAY_USER',
      });
    }
    
    // Determine if the role being created requires an agency
    const isAgencyRole = role === 'AGENCY_ADMIN' || role === 'AGENCY_USER';
    
    // Check if user has permission to create this role
    if ((role === 'SAFARWAY_ADMIN' || role === 'SAFARWAY_USER') && 
        userRole !== 'SAFARWAY_ADMIN') {
      return res.status(403).json({
        message: 'Only SafarWay Admins can invite other SafarWay roles'
      });
    }

    // Agency ID logic:
    // 1. If inviting an AGENCY role:
    //    - SafarWay users must provide targetAgencyId
    //    - Agency users use their own agencyId
    // 2. If inviting a SAFARWAY role:
    //    - Only SafarWay admins can do this
    //    - No agencyId is needed/used for SAFARWAY roles
    
    let agency = null;
    
    if (isAgencyRole) {
      // Agency role being created - needs an agencyId
      if (userRole === 'SAFARWAY_ADMIN' || userRole === 'SAFARWAY_USER') {
        // SafarWay roles need to specify target agency
        if (targetAgencyId) {
          agencyId = targetAgencyId;
          console.log('Using target agency ID for agency role:', agencyId);
        } else {
          return res.status(400).json({
            message: 'As a SafarWay user, you must specify targetAgencyId when inviting agency roles'
          });
        }
      }
      
      // Verify the agency exists
      try {
        agency = await prisma.agency.findUnique({
          where: { id: agencyId },
        });
        
        if (!agency) {
          return res.status(404).json({
            message: 'Agency not found',
          });
        }
      } catch (error) {
        console.error('Error finding agency:', error);
        return res.status(500).json({
          message: 'Error finding agency',
          error: error.message,
        });
      }
    } else {
      // Creating a SAFARWAY role - no agency needed
      console.log('Creating SafarWay role, no agency ID needed');
      agencyId = null;
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return res.status(400).json({
        message: 'User with this email already exists',
      });
    }
    
    // Generate invite token
    const inviteToken = generateInviteToken(email, role, agencyId);
    
    // Create pending user
    const user = await prisma.user.create({
      data: {
        email,
        role,
        status: 'INVITED',
        agencyId,
        inviteToken,
        invitedByUserId: req.user.id,
        invitedAt: new Date(),
      },
    });
    
    // Create audit log with conditional agency info - with error handling
    await safelyCreateAuditLog(
      'USER_INVITED', 
      req.user.id,
      user.id,
      {
        email: user.email,
        role: user.role,
        ...(isAgencyRole && agency ? { agency: agency.name } : {})
      }
    );
    
    // Send invitation email
    await sendInviteEmail(email, role, inviteToken);
    
    res.status(201).json({
      message: 'Invitation sent successfully',
      data: {
        email: user.email,
        role: user.role,
        status: user.status,
        ...(isAgencyRole && agency ? { agency: agency.name } : {})
      },
    });
  } catch (error) {
    console.error('Invitation error:', error);
    
    // Add detailed error logging to help diagnose issues
    if (error.code === 'P2025') {
      // Prisma record not found error
      return res.status(404).json({
        message: 'Resource not found during invitation process',
        error: error.message,
      });
    } else if (error.code?.startsWith('P2')) {
      // Other Prisma errors
      return res.status(400).json({
        message: 'Database error during invitation process',
        error: error.message,
      });
    } else if (error.name === 'TypeError' && error.message.includes('undefined')) {
      // Handle undefined property errors
      console.error('TypeError with undefined property:', error.stack);
      return res.status(500).json({
        message: 'Server error: undefined property',
        error: error.message,
        hint: 'Please check server logs for more details'
      });
    }
    
    // Default error response
    res.status(500).json({
      message: 'Error creating invitation',
      error: error.message,
    });
  }
};

/**
 * Complete user registration via invite
 * @route POST /agency/users/onboard
 */
const completeRegistration = async (req, res) => {
  try {
    const { token, name, phone, password } = req.body;
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        message: 'Invalid or expired invitation token',
      });
    }
    
    // Find user
    const user = await prisma.user.findFirst({
      where: {
        email: decoded.email,
        inviteToken: token,
        status: 'INVITED',
      },
      include: {
        agency: true,
      },
    });
    
    if (!user) {
      return res.status(404).json({
        message: 'Invalid invitation or user not found',
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        phone,
        password: hashedPassword,
        status: 'ACTIVE',
        inviteToken: null,
        completedAt: new Date(),
      },
      include: {
        agency: true,
      },
    });
    
    // Create audit log - with error handling
    await safelyCreateAuditLog(
      'USER_REGISTRATION_COMPLETED',
      user.id,
      user.id,
      {
        name: name,
        ...(user.agency ? { agency: user.agency.name } : { agency: 'None (SafarWay User)' })
      }
    );
    
    // Generate access token
    const accessToken = jwt.sign(
      { userId: updatedUser.id, role: updatedUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Prepare user response data with conditional agency info
    const isSafarWayRole = updatedUser.role === 'SAFARWAY_ADMIN' || updatedUser.role === 'SAFARWAY_USER';
    
    const userData = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
    };
    
    // Only include agency info if user has an agency
    if (updatedUser.agency) {
      userData.agency = {
        id: updatedUser.agency.id,
        name: updatedUser.agency.name,
      };
    }
    
    res.json({
      message: 'Registration completed successfully',
      data: {
        user: userData,
        token: accessToken,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Error completing registration',
      error: error.message,
    });
  }
};

/**
 * List all users for an agency with filtering and pagination
 * @route GET /agency/users
 */
const listAgencyUsers = async (req, res) => {
  try {
    const { status, role, search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const agencyId = req.user.agencyId;
    
    // Build where conditions
    const where = {
      agencyId,
      ...(status && { status }),
      ...(role && { role }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    
    // Count total users
    const totalUsers = await prisma.user.count({ where });
    
    // Fetch users with pagination
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
        invitedAt: true,
        completedAt: true,
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    });
    
    res.json({
      data: users,
      meta: {
        total: totalUsers,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(totalUsers / limit),
      },
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      message: 'Error fetching agency users',
      error: error.message,
    });
  }
};

/**
 * Get a specific user by ID
 * @route GET /agency/users/:id
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const agencyId = req.user.agencyId;
    
    const user = await prisma.user.findFirst({
      where: {
        id,
        agencyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
        invitedAt: true,
        completedAt: true,
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }
    
    res.json({ data: user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      message: 'Error fetching user details',
      error: error.message,
    });
  }
};

/**
 * Update user role
 * @route PATCH /agency/users/:id/role
 */
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const agencyId = req.user.agencyId;
    
    // Validate role
    if (!['AGENCY_ADMIN', 'AGENCY_USER', 'SAFARWAY_ADMIN', 'SAFARWAY_USER'].includes(role)) {
      return res.status(400).json({
        message: 'Invalid role. Must be AGENCY_ADMIN or AGENCY_USER',
      });
    }
    
    // Find user
    const user = await prisma.user.findFirst({
      where: {
        id,
        agencyId,
      },
    });
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }
    
    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });
    
    // Create audit log
    await safelyCreateAuditLog(
      'USER_ROLE_UPDATED',
      req.user.id,
      user.id,
      {
        previousRole: user.role,
        newRole: role
      }
    );
    
    res.json({
      message: 'User role updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      message: 'Error updating user role',
      error: error.message,
    });
  }
};

/**
 * Suspend user
 * @route POST /agency/users/:id/suspend
 */
const suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const agencyId = req.user.agencyId;
    
    // Find user
    const user = await prisma.user.findFirst({
      where: {
        id,
        agencyId,
      },
    });
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }
    
    // Prevent self-suspension
    if (user.id === req.user.id) {
      return res.status(400).json({
        message: 'You cannot suspend yourself',
      });
    }
    
    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });
    
    // Create audit log
    await safelyCreateAuditLog(
      'USER_SUSPENDED',
      req.user.id,
      user.id,
      {
        userName: user.name || user.email,
        previousStatus: user.status
      }
    );
    
    res.json({
      message: 'User suspended successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({
      message: 'Error suspending user',
      error: error.message,
    });
  }
};

/**
 * Activate user
 * @route POST /agency/users/:id/activate
 */
const activateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const agencyId = req.user.agencyId;
    
    // Find user
    const user = await prisma.user.findFirst({
      where: {
        id,
        agencyId,
      },
    });
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }
    
    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });
    
    // Create audit log
    await safelyCreateAuditLog(
      'USER_ACTIVATED',
      req.user.id,
      user.id,
      {
        userName: user.name || user.email,
        previousStatus: user.status
      }
    );
    
    res.json({
      message: 'User activated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      message: 'Error activating user',
      error: error.message,
    });
  }
};

/**
 * Delete user (soft delete)
 * @route DELETE /agency/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const agencyId = req.user.agencyId;
    
    // Find user
    const user = await prisma.user.findFirst({
      where: {
        id,
        agencyId,
      },
    });
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }
    
    // Prevent self-deletion
    if (user.id === req.user.id) {
      return res.status(400).json({
        message: 'You cannot delete yourself',
      });
    }
    
    // Soft delete by setting status to INACTIVE
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
    
    // Create audit log
    await safelyCreateAuditLog(
      'USER_DELETED',
      req.user.id,
      user.id,
      {
        userName: user.name || user.email,
        email: user.email
      }
    );
    
    res.json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      message: 'Error deleting user',
      error: error.message,
    });
  }
};

/**
 * Resend invitation
 * @route POST /agency/users/:id/resend-invite
 */
const resendInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const agencyId = req.user.agencyId;
    
    // Find user
    const user = await prisma.user.findFirst({
      where: {
        id,
        agencyId,
        status: 'INVITED',
      },
    });
    
    if (!user) {
      return res.status(404).json({
        message: 'Pending invitation not found',
      });
    }
    
    // Generate new invite token
    const inviteToken = generateInviteToken(user.email, user.role, agencyId);
    
    // Update user with new token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        inviteToken,
        invitedAt: new Date(),
      },
    });
    
    // Send new invitation email
    await sendInviteEmail(user.email, user.role, inviteToken);
    
    // Create audit log
    await safelyCreateAuditLog(
      'INVITATION_RESENT',
      req.user.id,
      user.id,
      {
        email: user.email,
        role: user.role
      }
    );
    
    res.json({
      message: 'Invitation resent successfully',
    });
  } catch (error) {
    console.error('Resend invitation error:', error);
    res.status(500).json({
      message: 'Error resending invitation',
      error: error.message,
    });
  }
};

// Helper function to safely create audit logs
const safelyCreateAuditLog = async (actionType, userId, targetId, details) => {
  try {
    if (prisma.auditLog) {
      await prisma.auditLog.create({
        data: {
          actionType,
          userId,
          targetId,
          details: JSON.stringify(details)
        }
      });
    } else {
      console.log(`Skipping audit log creation for ${actionType} - prisma.auditLog is not defined`);
    }
  } catch (error) {
    // Just log the error but don't fail the whole operation
    console.error(`Error creating audit log for ${actionType} (non-fatal):`, error);
  }
};

module.exports = {
  inviteUser,
  completeRegistration,
  listAgencyUsers,
  getUserById,
  updateUserRole,
  suspendUser,
  activateUser,
  deleteUser,
  resendInvitation,
}; 