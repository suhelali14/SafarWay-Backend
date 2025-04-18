const request = require('supertest');
const app = require('../src/app');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

describe('Agency Profile API', () => {
  let testAgency;
  let testUser;
  let authToken;

  // Setup test data before running tests
  beforeAll(async () => {
    // Clean up existing test data if any
    await prisma.verificationDocument.deleteMany({
      where: { agency: { name: 'Test Agency' } }
    });
    await prisma.agencySettings.deleteMany({
      where: { agency: { name: 'Test Agency' } }
    });
    await prisma.agency.deleteMany({
      where: { name: 'Test Agency' }
    });
    await prisma.user.deleteMany({
      where: { email: 'test.agency@example.com' }
    });

    // Create test user
    testUser = await prisma.user.create({
      data: {
        name: 'Test Agency Admin',
        email: 'test.agency@example.com',
        password: '$2a$10$iqMaBYHsIQAMzG4NQS5ggeqasWnLvE.djJTSL5xFVD1nCVsTw/V0K', // hashed 'password123'
        role: 'AGENCY_ADMIN',
        isVerified: true,
        profileImage: 'https://example.com/profile.jpg'
      }
    });

    // Create test agency
    testAgency = await prisma.agency.create({
      data: {
        name: 'Test Agency',
        description: 'Test agency description for API testing',
        email: 'test.agency@example.com',
        phone: '+1-555-123-4567',
        address: '123 Test Street',
        city: 'Test City',
        country: 'Test Country',
        website: 'https://testagency.com',
        licenseNumber: 'TEST-123-456',
        status: 'approved',
        userId: testUser.id
      }
    });

    // Update the user with the agency ID
    await prisma.user.update({
      where: { id: testUser.id },
      data: { agencyId: testAgency.id }
    });

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser.id, role: testUser.role, agencyId: testAgency.id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  // Clean up after tests
  afterAll(async () => {
    await prisma.verificationDocument.deleteMany({
      where: { agencyId: testAgency.id }
    });
    await prisma.agencySettings.deleteMany({
      where: { agencyId: testAgency.id }
    });
    await prisma.agency.deleteMany({
      where: { id: testAgency.id }
    });
    await prisma.user.deleteMany({
      where: { id: testUser.id }
    });
    await prisma.$disconnect();
  });

  describe('GET /api/agency/profile', () => {
    it('should return agency profile data', async () => {
      const response = await request(app)
        .get('/api/agency/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', testAgency.id);
      expect(response.body.data).toHaveProperty('name', 'Test Agency');
      expect(response.body.data).toHaveProperty('email', 'test.agency@example.com');
      expect(response.body.data).toHaveProperty('logo', 'https://example.com/profile.jpg');
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/agency/profile');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/agency/profile', () => {
    it('should update agency profile data', async () => {
      const updatedData = {
        name: 'Updated Test Agency',
        description: 'Updated test agency description',
        phone: '+1-555-987-6543',
        address: '456 Updated Street',
        city: 'Updated City',
        country: 'Updated Country',
        website: 'https://updated-testagency.com',
        license: 'UPDATED-TEST-789'
      };

      const response = await request(app)
        .put('/api/agency/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name', 'Updated Test Agency');
      expect(response.body.data).toHaveProperty('description', 'Updated test agency description');
      expect(response.body.data).toHaveProperty('phone', '+1-555-987-6543');
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        name: 'A', // too short
        website: 'not-a-valid-url'
      };

      const response = await request(app)
        .put('/api/agency/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
    });
  });

  describe('Document Management', () => {
    let testDocumentId;

    it('should upload a verification document', async () => {
      // Mock file upload
      const response = await request(app)
        .post('/api/agency/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .field('name', 'Test Business License')
        .field('documentType', 'business_license')
        .attach('document', Buffer.from('test file content'), 'test-document.pdf');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name', 'Test Business License');
      expect(response.body.data).toHaveProperty('documentType', 'business_license');
      expect(response.body.data).toHaveProperty('id');

      testDocumentId = response.body.data.id;
    });

    it('should get all verification documents', async () => {
      const response = await request(app)
        .get('/api/agency/documents')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should delete a verification document', async () => {
      // Skip if we don't have a document ID from the previous test
      if (!testDocumentId) {
        return;
      }

      const response = await request(app)
        .delete(`/api/agency/documents/${testDocumentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });
  });

  describe('Agency Settings', () => {
    it('should get default settings if none exist', async () => {
      const response = await request(app)
        .get('/api/agency/settings')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('notifyBookings', true);
      expect(response.body.data).toHaveProperty('notifyMessages', true);
      expect(response.body.data).toHaveProperty('notifyMarketing', false);
      expect(response.body.data).toHaveProperty('isPublic', true);
    });

    it('should update agency settings', async () => {
      const settingsData = {
        notifyBookings: true,
        notifyMessages: false,
        notifyMarketing: true,
        isPublic: false
      };

      const response = await request(app)
        .put('/api/agency/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(settingsData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('notifyBookings', true);
      expect(response.body.data).toHaveProperty('notifyMessages', false);
      expect(response.body.data).toHaveProperty('notifyMarketing', true);
      expect(response.body.data).toHaveProperty('isPublic', false);
    });

    it('should get updated settings', async () => {
      const response = await request(app)
        .get('/api/agency/settings')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('notifyBookings', true);
      expect(response.body.data).toHaveProperty('notifyMessages', false);
      expect(response.body.data).toHaveProperty('notifyMarketing', true);
      expect(response.body.data).toHaveProperty('isPublic', false);
    });
  });
}); 