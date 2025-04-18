const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const request = require('supertest');
const app = require('../src/app');
const { setupDatabase, teardownDatabase, prisma } = require('./setup');

describe('Tour Endpoints', () => {
  let agencyAdmin;
  let tourPackage;
  let accessToken;

  const testAgency = {
    name: 'Test Agency',
    description: 'Test Agency Description',
    address: 'Test Address',
    phone: '+1234567890',
    email: 'agency@test.com',
  };

  const testUser = {
    email: 'agency.admin@test.com',
    password: 'password123',
    name: 'Agency Admin',
    role: 'AGENCY_ADMIN',
  };

  const testTourPackage = {
    name: 'Test Tour Package',
    description: 'Test Tour Package Description',
    price: 999.99,
    duration: 5,
    destination: 'Test Destination',
    inclusions: ['Hotel', 'Transport', 'Food'],
    exclusions: ['Flight', 'Personal Expenses'],
  };

  beforeAll(async () => {
    await setupDatabase();

    // Create agency
    const agency = await prisma.agency.create({
      data: testAgency,
    });

    // Create agency admin
    agencyAdmin = await prisma.user.create({
      data: {
        ...testUser,
        agencyId: agency.id,
      },
    });

    // Login to get access token
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    accessToken = res.body.data.tokens.access;
  });

  afterAll(async () => {
    await teardownDatabase();
  });

  describe('POST /api/tours', () => {
    it('should create a new tour package', async () => {
      const res = await request(app)
        .post('/api/tours')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testTourPackage);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe(testTourPackage.name);
      expect(res.body.data.price).toBe(testTourPackage.price);

      tourPackage = res.body.data;
    });

    it('should not create tour package without authentication', async () => {
      const res = await request(app)
        .post('/api/tours')
        .send(testTourPackage);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('No token provided');
    });
  });

  describe('GET /api/tours', () => {
    it('should get all tour packages', async () => {
      const res = await request(app)
        .get('/api/tours');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/tours/:id', () => {
    it('should get tour package by id', async () => {
      const res = await request(app)
        .get(`/api/tours/${tourPackage.id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(tourPackage.id);
      expect(res.body.data.name).toBe(tourPackage.name);
    });

    it('should return 404 for non-existent tour package', async () => {
      const res = await request(app)
        .get('/api/tours/non-existent-id');

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Tour package not found');
    });
  });

  describe('PUT /api/tours/:id', () => {
    it('should update tour package', async () => {
      const updates = {
        name: 'Updated Tour Package',
        price: 1299.99,
      };

      const res = await request(app)
        .put(`/api/tours/${tourPackage.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updates);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(updates.name);
      expect(res.body.data.price).toBe(updates.price);
    });

    it('should not update tour package without authentication', async () => {
      const res = await request(app)
        .put(`/api/tours/${tourPackage.id}`)
        .send({ name: 'Test Update' });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('No token provided');
    });
  });

  describe('DELETE /api/tours/:id', () => {
    it('should delete tour package', async () => {
      const res = await request(app)
        .delete(`/api/tours/${tourPackage.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Tour package deleted successfully');
    });

    it('should not delete tour package without authentication', async () => {
      const res = await request(app)
        .delete(`/api/tours/${tourPackage.id}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('No token provided');
    });
  });
}); 