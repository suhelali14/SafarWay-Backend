const { PrismaClient } = require('@prisma/client');
const { initializeMockData, mockPrismaImplementation } = require('./mockDatabase');

// Global flag to track if we're using mock data
let usingMockDatabase = false;

// Create the Prisma client
const prisma = new PrismaClient({
  // Add logging in development mode
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Test connection to the database
const testConnection = async () => {
  try {
    // Try to connect to the database
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Check if we have a valid connection by running a simple query
    await prisma.$queryRaw`SELECT 1 as connection_test`;
    console.log('✅ Database query successful');
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    
    // Don't exit immediately in development, allow running with mock data
    if (process.env.NODE_ENV === 'development' && process.env.ALLOW_MOCK_DB === 'true') {
      console.log('⚠️ Running in development mode with mock data');
      usingMockDatabase = true;
      return false;
    }
    
    // In production, exit if we can't connect to the database
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    
    return false;
  }
};

// Initialize mock database with sample data
const mockPrisma = () => {
  if (usingMockDatabase) {
    initializeMockData();
    
    // Create a proxy to intercept all Prisma calls and redirect to mock implementation
    const prismaProxy = new Proxy(prisma, {
      get: (target, prop) => {
        // If the property exists in our mock implementation, use that
        if (mockPrismaImplementation[prop]) {
          return mockPrismaImplementation[prop];
        }
        
        // If the property doesn't exist in our mock implementation, 
        // but exists on the original prisma client, log and return the original
        if (prop in target) {
          // For methods that aren't implemented in mock, return functions that log
          if (typeof target[prop] === 'function') {
            return (...args) => {
              console.log(`MOCK (passthrough): ${prop}`, args);
              return {}; // Return empty object for unimplemented functions
            };
          }
          return target[prop];
        }
        
        // For anything else, return a function that logs
        return (...args) => {
          console.log(`MOCK (unimplemented): ${prop}`, args);
          return {};
        };
      }
    });
    
    // Return the proxied prisma client
    return prismaProxy;
  }
  
  // If not using mock database, return the original prisma client
  return prisma;
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('Database connection closed due to app termination');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  console.log('Database connection closed due to app termination');
  process.exit(0);
});

module.exports = {
  prisma: mockPrisma(),  // This will return either the real or mock prisma client
  testConnection,
  mockPrisma,
}; 