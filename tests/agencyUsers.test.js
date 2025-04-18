const request = require('supertest');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('Agency User Management', () => {
  let agencyAdminToken;
  let agencyUserId;
  let testAgencyId;
  let invitedUserId;

  // Setup test data
  beforeAll(async () => {
    // Create a test agency
    const agency = await prisma.agency.create({
      data: {
        name: 'Test Agency',
        contactEmail: 'agency@test.com',
        contactPhone: '1234567890',
        status: 'ACTIVE',
      },
    });
    testAgencyId = agency.id;

    // Create agency admin
    const admin = await prisma.user.create({
      data: {
        name: 'Agency Admin',
        email: 'admin@testagency.com',
        password: '$2a$12$mR3rZamuP/iOIv2m6XiQ8e5YFvdoTAjfcpZ5P1/wRNx1Vu/inZV/e', // hashed 'password123'
        role: 'AGENCY_ADMIN',
        status: 'ACTIVE',
        agencyId: testAgencyId,
      },
    });

    // Create agency user
    const user = await prisma.user.create({
      data: {
        name: 'Regular User',
        email: 'user@testagency.com',
        password: '$2a$12$mR3rZamuP/iOIv2m6XiQ8e5YFvdoTAjfcpZ5P1/wRNx1Vu/inZV/e', // hashed 'password123'
        role: 'AGENCY_USER',
        status: 'ACTIVE',
        agencyId: testAgencyId,
      },
    });
    agencyUserId = user.id;

    // Generate JWT for agency admin
    agencyAdminToken = jwt.sign(
      { userId: admin.id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  // Clean up after tests
  afterAll(async () => {
    // Delete test data
    await prisma.user.deleteMany({
      where: {
        agencyId: testAgencyId,
      },
    });
    await prisma.agency.delete({
      where: {
        id: testAgencyId,
      },
    });
    await prisma.$disconnect();
  });

  // Test inviting a new user
  describe('POST /api/agency/users/invite', () => {
    it('should invite a new user to the agency', async () => {
      const response = await request(app)
        .post('/api/agency/users/invite')
        .set('Authorization', `Bearer ${agencyAdminToken}`)
        .send({
          email: 'newinvite@example.com',
          role: 'AGENCY_USER',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Invitation sent successfully');
      expect(response.body.data).toHaveProperty('email', 'newinvite@example.com');

      // Store the invited user ID for later tests
      const invitedUser = await prisma.user.findUnique({
        where: { email: 'newinvite@example.com' },
      });
      invitedUserId = invitedUser.id;
    });

    it('should return 400 for invalid role', async () => {
      const response = await request(app)
        .post('/api/agency/users/invite')
        .set('Authorization', `Bearer ${agencyAdminToken}`)
        .send({
          email: 'invalid@example.com',
          role: 'INVALID_ROLE',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 if user already exists', async () => {
      const response = await request(app)
        .post('/api/agency/users/invite')
        .set('Authorization', `Bearer ${agencyAdminToken}`)
        .send({
          email: 'user@testagency.com', // Existing user
          role: 'AGENCY_USER',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('User with this email already exists');
    });
  });

  // Test listing agency users
  describe('GET /api/agency/users', () => {
    it('should return a list of all agency users', async () => {
      const response = await request(app)
        .get('/api/agency/users')
        .set('Authorization', `Bearer ${agencyAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2); // Admin + regular user
      expect(response.body.meta).toHaveProperty('total');
    });

    it('should filter users by status', async () => {
      const response = await request(app)
        .get('/api/agency/users?status=INVITED')
        .set('Authorization', `Bearer ${agencyAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.every(user => user.status === 'INVITED')).toBe(true);
    });

    it('should filter users by role', async () => {
      const response = await request(app)
        .get('/api/agency/users?role=AGENCY_USER')
        .set('Authorization', `Bearer ${agencyAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.every(user => user.role === 'AGENCY_USER')).toBe(true);
    });
  });

  // Test getting user by ID
  describe('GET /api/agency/users/:id', () => {
    it('should return a specific user', async () => {
      const response = await request(app)
        .get(`/api/agency/users/${agencyUserId}`)
        .set('Authorization', `Bearer ${agencyAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('id', agencyUserId);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/agency/users/non-existent-id')
        .set('Authorization', `Bearer ${agencyAdminToken}`);

      expect(response.status).toBe(404);
    });
  });

  // Test updating user role
  describe('PATCH /api/agency/users/:id/role', () => {
    it('should update a user role', async () => {
      const response = await request(app)
        .patch(`/api/agency/users/${agencyUserId}/role`)
        .set('Authorization', `Bearer ${agencyAdminToken}`)
        .send({
          role: 'AGENCY_ADMIN',
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('role', 'AGENCY_ADMIN');

      // Reset role back to original
      await request(app)
        .patch(`/api/agency/users/${agencyUserId}/role`)
        .set('Authorization', `Bearer ${agencyAdminToken}`)
        .send({
          role: 'AGENCY_USER',
        });
    });

    it('should return 400 for invalid role', async () => {
      const response = await request(app)
        .patch(`/api/agency/users/${agencyUserId}/role`)
        .set('Authorization', `Bearer ${agencyAdminToken}`)
        .send({
          role: 'INVALID_ROLE',
        });

      expect(response.status).toBe(400);
    });
  });

  // Test suspending a user
  describe('POST /api/agency/users/:id/suspend', () => {
    it('should suspend a user', async () => {
      const response = await request(app)
        .post(`/api/agency/users/${agencyUserId}/suspend`)
        .set('Authorization', `Bearer ${agencyAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('status', 'SUSPENDED');
    });
  });

  // Test activating a user
  describe('POST /api/agency/users/:id/activate', () => {
    it('should activate a suspended user', async () => {
      const response = await request(app)
        .post(`/api/agency/users/${agencyUserId}/activate`)
        .set('Authorization', `Bearer ${agencyAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('status', 'ACTIVE');
    });
  });

  // Test resending invitation
  describe('POST /api/agency/users/:id/resend-invite', () => {
    it('should resend invitation to a pending user', async () => {
      const response = await request(app)
        .post(`/api/agency/users/${invitedUserId}/resend-invite`)
        .set('Authorization', `Bearer ${agencyAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Invitation resent successfully');
    });

    it('should return 404 for invalid user', async () => {
      const response = await request(app)
        .post(`/api/agency/users/${agencyUserId}/resend-invite`) // Not an invited user
        .set('Authorization', `Bearer ${agencyAdminToken}`);

      expect(response.status).toBe(404);
    });
  });

  // Test deleting a user
  describe('DELETE /api/agency/users/:id', () => {
    it('should soft delete a user', async () => {
      const response = await request(app)
        .delete(`/api/agency/users/${invitedUserId}`)
        .set('Authorization', `Bearer ${agencyAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User deleted successfully');

      // Verify user is marked as inactive
      const deletedUser = await prisma.user.findUnique({
        where: { id: invitedUserId },
      });
      expect(deletedUser.status).toBe('INACTIVE');
    });

    it('should return 400 when trying to delete self', async () => {
      // Get the admin user ID from the token
      const decoded = jwt.verify(agencyAdminToken, process.env.JWT_SECRET);
      
      const response = await request(app)
        .delete(`/api/agency/users/${decoded.userId}`)
        .set('Authorization', `Bearer ${agencyAdminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('You cannot delete yourself');
    });
  });
}); 