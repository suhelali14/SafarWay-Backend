const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const request = require('supertest');
const app = require('../src/app');
const { setupDatabase, teardownDatabase, prisma } = require('./setup');

describe('Booking Endpoints', () => {
  let customer;
  let agency;
  let tourPackage;
  let booking;
  let customerToken;
  let agencyToken;

  const testAgency = {
    name: 'Test Agency',
    description: 'Test Agency Description',
    address: 'Test Address',
    phone: '+1234567890',
    email: 'agency@test.com',
  };

  const testCustomer = {
    email: 'customer@test.com',
    password: 'password123',
    name: 'Test Customer',
    role: 'CUSTOMER',
  };

  const testAgencyAdmin = {
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

  const testBooking = {
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    numberOfPeople: 2,
    specialRequests: 'Vegetarian meals',
    contactInfo: {
      name: 'Test Customer',
      email: 'customer@test.com',
      phone: '+1234567890',
    },
  };

  beforeAll(async () => {
    await setupDatabase();

    // Create agency
    agency = await prisma.agency.create({
      data: testAgency,
    });

    // Create agency admin
    const agencyAdmin = await prisma.user.create({
      data: {
        ...testAgencyAdmin,
        agencyId: agency.id,
      },
    });

    // Create customer
    customer = await prisma.user.create({
      data: testCustomer,
    });

    // Create tour package
    tourPackage = await prisma.tourPackage.create({
      data: {
        ...testTourPackage,
        agencyId: agency.id,
      },
    });

    // Get tokens
    const customerRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testCustomer.email,
        password: testCustomer.password,
      });

    const agencyRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testAgencyAdmin.email,
        password: testAgencyAdmin.password,
      });

    customerToken = customerRes.body.data.tokens.access;
    agencyToken = agencyRes.body.data.tokens.access;
  });

  afterAll(async () => {
    await teardownDatabase();
  });

  describe('POST /api/bookings', () => {
    it('should create a new booking', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          ...testBooking,
          tourPackageId: tourPackage.id,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.tourPackageId).toBe(tourPackage.id);
      expect(res.body.data.customerId).toBe(customer.id);
      expect(res.body.data.status).toBe('PENDING');

      booking = res.body.data;
    });

    it('should not create booking without authentication', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .send({
          ...testBooking,
          tourPackageId: tourPackage.id,
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('No token provided');
    });
  });

  describe('GET /api/bookings/my-bookings', () => {
    it('should get customer bookings', async () => {
      const res = await request(app)
        .get('/api/bookings/my-bookings')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].customerId).toBe(customer.id);
    });
  });

  describe('GET /api/bookings/:id', () => {
    it('should get booking by id', async () => {
      const res = await request(app)
        .get(`/api/bookings/${booking.id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(booking.id);
      expect(res.body.data.tourPackageId).toBe(tourPackage.id);
    });

    it('should not get booking with invalid id', async () => {
      const res = await request(app)
        .get('/api/bookings/invalid-id')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Booking not found');
    });
  });

  describe('PUT /api/bookings/:id/status', () => {
    it('should update booking status', async () => {
      const res = await request(app)
        .put(`/api/bookings/${booking.id}/status`)
        .set('Authorization', `Bearer ${agencyToken}`)
        .send({ status: 'CONFIRMED' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CONFIRMED');
    });

    it('should not update status without agency admin rights', async () => {
      const res = await request(app)
        .put(`/api/bookings/${booking.id}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'CONFIRMED' });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe('Not authorized to update this booking');
    });
  });

  describe('POST /api/bookings/:id/cancel', () => {
    it('should cancel booking', async () => {
      const res = await request(app)
        .post(`/api/bookings/${booking.id}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CANCELLED');
    });

    it('should not cancel another user\'s booking', async () => {
      // Create another customer
      const anotherCustomer = await prisma.user.create({
        data: {
          email: 'another.customer@test.com',
          password: 'password123',
          name: 'Another Customer',
          role: 'CUSTOMER',
        },
      });

      // Get token for another customer
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'another.customer@test.com',
          password: 'password123',
        });

      const anotherToken = res.body.data.tokens.access;

      // Try to cancel the booking
      const cancelRes = await request(app)
        .post(`/api/bookings/${booking.id}/cancel`)
        .set('Authorization', `Bearer ${anotherToken}`);

      expect(cancelRes.statusCode).toBe(403);
      expect(cancelRes.body.message).toBe('Not authorized to cancel this booking');
    });
  });
}); 