const { beforeAll, afterAll } = require('@jest/globals');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.JWT_RESET_SECRET = 'test-jwt-reset-secret';

const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const testData = {
  admin: {
    email: 'admin@safarway.com',
    password: 'Admin@123',
    name: 'Admin User',
    role: 'SAFARWAY_ADMIN'
  },
  agency: {
    name: 'Test Travel Agency',
    description: 'A test travel agency',
    contactEmail: 'agency@test.com',
    contactPhone: '+1234567890',
    address: '123 Test Street'
  },
  agencyAdmin: {
    email: 'agency.admin@test.com',
    password: 'Agency@123',
    name: 'Agency Admin',
    role: 'AGENCY_ADMIN'
  },
  customer: {
    email: 'customer@test.com',
    password: 'Customer@123',
    name: 'Test Customer',
    role: 'CUSTOMER'
  },
  tourPackage: {
    name: 'Test Adventure Tour',
    description: 'An exciting test tour package',
    price: 999.99,
    duration: 5,
    destination: 'Test Destination',
    startDate: new Date(),
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    maxPeople: 20,
    tourType: 'ADVENTURE',
    inclusions: ['Hotel', 'Meals', 'Transport'],
    exclusions: ['Flights', 'Personal expenses'],
    images: ['test-image-1.jpg', 'test-image-2.jpg']
  }
};

const setupTestDb = async () => {
  // Clear existing test data
  await prisma.ticketResponse.deleteMany();
  await prisma.ticketAssignmentLog.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.refundRequest.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.itinerary.deleteMany();
  await prisma.tourPackage.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.agency.deleteMany();

  // Create admin user
  const hashedAdminPassword = await bcrypt.hash(testData.admin.password, 10);
  const admin = await prisma.user.create({
    data: {
      ...testData.admin,
      password: hashedAdminPassword,
      status: 'ACTIVE'
    }
  });

  // Create agency
  const agency = await prisma.agency.create({
    data: {
      ...testData.agency,
      status: 'ACTIVE',
      verifiedBy: admin.id,
      verifiedAt: new Date()
    }
  });

  // Create agency admin
  const hashedAgencyAdminPassword = await bcrypt.hash(testData.agencyAdmin.password, 10);
  const agencyAdmin = await prisma.user.create({
    data: {
      ...testData.agencyAdmin,
      password: hashedAgencyAdminPassword,
      status: 'ACTIVE',
      agencyId: agency.id
    }
  });

  // Create customer
  const hashedCustomerPassword = await bcrypt.hash(testData.customer.password, 10);
  const customer = await prisma.user.create({
    data: {
      ...testData.customer,
      password: hashedCustomerPassword,
      status: 'ACTIVE',
      customer: {
        create: {
          address: '456 Customer Street'
        }
      }
    },
    include: {
      customer: true
    }
  });

  // Create tour package
  const tourPackage = await prisma.tourPackage.create({
    data: {
      ...testData.tourPackage,
      agencyId: agency.id,
      itinerary: {
        create: [
          {
            dayNumber: 1,
            title: 'Day 1 - Arrival',
            description: 'Welcome and introduction',
            activities: { activities: ['Check-in', 'Welcome dinner'] },
            meals: { breakfast: true, lunch: false, dinner: true },
            accommodation: { name: 'Test Hotel', type: 'Hotel' },
            transport: { type: 'Private car', details: 'Airport transfer' }
          }
        ]
      }
    }
  });

  return {
    admin,
    agency,
    agencyAdmin,
    customer,
    tourPackage
  };
};

const getAuthToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

const setupDatabase = async () => {
  await prisma.$transaction([
    prisma.booking.deleteMany(),
    prisma.tourPackage.deleteMany(),
    prisma.user.deleteMany(),
    prisma.agency.deleteMany(),
  ]);
};

const teardownDatabase = async () => {
  await prisma.$disconnect();
};

module.exports = {
  prisma,
  setupTestDb,
  getAuthToken,
  testData,
  setupDatabase,
  teardownDatabase
}; 