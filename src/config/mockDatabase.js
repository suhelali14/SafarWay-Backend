/**
 * Mock Database Implementation
 * 
 * This file provides mock implementations of database operations
 * to allow the application to run without a real database connection
 * during development.
 */

// In-memory storage for mock data
const mockStorage = {
  users: [],
  agencies: [],
  bookings: [],
  tourPackages: [],
  refundRequests: [],
  supportTickets: [],
};

// Initialize with some sample data
const initializeMockData = () => {
  // Add a sample admin user
  mockStorage.users.push({
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@safarway.com',
    role: 'SAFARWAY_ADMIN',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  // Add a sample agency
  mockStorage.agencies.push({
    id: 'agency-1',
    name: 'Travel Adventures Ltd',
    description: 'Leading adventure travel company',
    contactEmail: 'info@traveladventures.com',
    contactPhone: '+1234567890',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  // Add a sample tour package
  mockStorage.tourPackages.push({
    id: 'package-1',
    title: 'African Safari Adventure',
    subtitle: 'Explore the wild',
    duration: 7,
    maxGroupSize: 10,
    pricePerPerson: 1299.99,
    tourType: 'ADVENTURE',
    description: 'Experience the adventure of a lifetime',
    agencyId: 'agency-1',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  console.log('✅ Mock database initialized with sample data');
};

// Mock implementations of key database operations
const mockPrismaImplementation = {
  user: {
    findMany: async (params) => {
      console.log('MOCK: user.findMany', params);
      return mockStorage.users;
    },
    count: async (params) => {
      console.log('MOCK: user.count', params);
      return mockStorage.users.length;
    },
    findUnique: async (params) => {
      console.log('MOCK: user.findUnique', params);
      return mockStorage.users.find(u => u.id === params.where.id);
    },
  },
  agency: {
    findMany: async (params) => {
      console.log('MOCK: agency.findMany', params);
      return mockStorage.agencies;
    },
    count: async (params) => {
      console.log('MOCK: agency.count', params);
      return mockStorage.agencies.length;
    },
  },
  booking: {
    findMany: async (params) => {
      console.log('MOCK: booking.findMany', params);
      return mockStorage.bookings;
    },
    count: async (params) => {
      console.log('MOCK: booking.count', params);
      return mockStorage.bookings.length;
    },
    aggregate: async (params) => {
      console.log('MOCK: booking.aggregate', params);
      return { _sum: { totalPrice: 2599.98 } };
    },
  },
  tourPackage: {
    count: async (params) => {
      console.log('MOCK: tourPackage.count', params);
      return mockStorage.tourPackages.length;
    },
  },
  refundRequest: {
    count: async (params) => {
      console.log('MOCK: refundRequest.count', params);
      return 0;
    },
  },
  supportTicket: {
    count: async (params) => {
      console.log('MOCK: supportTicket.count', params);
      return 0;
    },
  },
  // Helper function to create a proxy that logs all calls
  $queryRaw: async (...args) => {
    console.log('MOCK: $queryRaw', args);
    return [{ result: 'mock_result' }];
  },
};

module.exports = {
  initializeMockData,
  mockPrismaImplementation,
}; 