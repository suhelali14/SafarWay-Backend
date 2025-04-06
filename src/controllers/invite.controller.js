const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { z } = require('zod');

const prisma = new PrismaClient();




// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465, // 🛠️ FIXED
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Generate invite token
const generateInviteToken = (email, role, agencyId) => {
  return jwt.sign(
    { email, role, agencyId },
    process.env.INVITE_TOKEN_SECRET,
    { expiresIn: '24h' }
  );
};

// Send invitation email
const sendInviteEmail = async (email, role, token) => {
  const onboardingUrl = `${process.env.FRONTEND_URL}/onboard?token=${token}`;

  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'You\'ve been invited to join SafarWay',
    html: `
      <h1>Welcome to SafarWay!</h1>
      <p>You've been invited as a ${role} on SafarWay.</p>
      <p>Click below to complete your onboarding:</p>
      <a href="${onboardingUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
        Complete Onboarding
      </a>
      <p>This link will expire in 24 hours.</p>
      <p>Regards,<br>SafarWay Team</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Create invitation
const createInvite = async (req, res) => {
  try {
    const { email, role, agencyId } = req.body;

    // Validate role
    if (!['AGENCY_ADMIN', 'AGENCY_USER'].includes(role)) {
      return res.status(400).json({
        message: 'Invalid role. Must be AGENCY_ADMIN or AGENCY_USER',
      });
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

    // Send invitation email
    await sendInviteEmail(email, role, inviteToken);

    res.status(201).json({
      message: 'Invitation sent successfully',
      data: {
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Invitation error:', error);
    res.status(500).json({
      message: 'Error creating invitation',
      error: error.message,
    });
  }
};

// Complete onboarding
const completeOnboarding = async (req, res) => {
  try {
    const { token, name, phone, password } = req.body;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_INVITE_SECRET);

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        email: decoded.email,
        inviteToken: token,
        status: 'INVITED',
      },
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired invitation token',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

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
    });

    // Generate access token
    const accessToken = jwt.sign(
      { userId: updatedUser.id, role: updatedUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Onboarding completed successfully',
      data: {
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
        },
        token: accessToken,
      },
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Invalid or expired invitation token',
      });
    }
    res.status(500).json({
      message: 'Error completing onboarding',
      error: error.message,
    });
  }
};

// Resend invitation
const resendInvite = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== 'INVITED') {
      return res.status(404).json({
        message: 'Pending invitation not found',
      });
    }

    // Generate new invite token
    const inviteToken = generateInviteToken(user.email, user.role, user.agencyId);

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

// Revoke invitation
const revokeInvite = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== 'INVITED') {
      return res.status(404).json({
        message: 'Pending invitation not found',
      });
    }

    // Delete the pending user
    await prisma.user.delete({
      where: { id: user.id },
    });

    res.json({
      message: 'Invitation revoked successfully',
    });
  } catch (error) {
    console.error('Revoke invitation error:', error);
    res.status(500).json({
      message: 'Error revoking invitation',
      error: error.message,
    });
  }
};

module.exports = {
  createInvite,
  completeOnboarding,
  resendInvite,
  revokeInvite,
}; 