const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

// Set session expiry to 30 days (in seconds)
const SESSION_EXPIRY = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Generate a unique session ID with UUIDv4
 * @returns {string} UUID
 */
const generateSessionId = () => {
  return uuidv4();
};

/**
 * Create a new session for the user
 * @param {string} userId - User ID
 * @param {string} role - User role
 * @returns {Promise<{sessionId: string, token: string, expiresAt: Date}>} Session data
 */
const createSession = async (userId, role) => {
  try {
    // Calculate expiry time (48 hours from now)
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + (SESSION_EXPIRY * 1000));
    
    // Generate unique session ID
    const sessionId = generateSessionId();
    
    // Check if Session model is available in the database
    let sessionCreated = false;
    try {
      // Store session in database
      await prisma.session.create({
        data: {
          id: sessionId,
          userId,
          issuedAt,
          expiresAt,
          metadata: {
            role,
            userAgent: 'Unknown' // Could be enhanced to store actual user agent
          }
        }
      });
      sessionCreated = true;
    } catch (dbError) {
      console.error('Failed to create session in database:', dbError);
      // We'll continue with JWT token only
    }
    
    // Generate JWT token with session ID
    const token = jwt.sign(
      { 
        sessionId,
        userId,
        role
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' } // JWT also expires in 30 days
    );
    
    return {
      sessionId,
      token,
      expiresAt,
      persistedToDb: sessionCreated
    };
  } catch (error) {
    console.error('Error creating session:', error);
    throw new Error('Failed to create session');
  }
};

/**
 * Validate a session by ID
 * @param {string} sessionId - Session ID to validate
 * @returns {Promise<Object|null>} Session data if valid, null if expired or not found
 */
const validateSession = async (sessionId) => {
  try {
    // Find session in database
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            agencyId: true,
            status: true,
            agency: {
              select: {
                id: true,
                name: true,
                status: true
              }
            },
            customer: {
              select: {
                id: true
              }
            }
          }
        }
      }
    });
    
    // If no session found, return null
    if (!session) {
      return null;
    }
    
    // Check if session is expired
    const now = new Date();
    if (now > session.expiresAt) {
      // Optionally delete expired session
      await prisma.session.delete({
        where: { id: sessionId }
      });
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Error validating session:', error);
    return null;
  }
};

/**
 * Invalidate a session (logout)
 * @param {string} sessionId - Session ID to invalidate
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
const invalidateSession = async (sessionId) => {
  try {
    await prisma.session.delete({
      where: { id: sessionId }
    });
    return true;
  } catch (error) {
    console.error('Error invalidating session:', error);
    return false;
  }
};

/**
 * Invalidate all sessions for a user
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
const invalidateAllUserSessions = async (userId) => {
  try {
    await prisma.session.deleteMany({
      where: { userId }
    });
    return true;
  } catch (error) {
    console.error('Error invalidating user sessions:', error);
    return false;
  }
};

/**
 * Clear all expired sessions (maintenance function)
 * @returns {Promise<number>} Number of sessions cleared
 */
const clearExpiredSessions = async () => {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });
    return result.count;
  } catch (error) {
    console.error('Error clearing expired sessions:', error);
    return 0;
  }
};

module.exports = {
  createSession,
  validateSession,
  invalidateSession,
  invalidateAllUserSessions,
  clearExpiredSessions,
  SESSION_EXPIRY
}; 