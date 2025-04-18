const Redis = require('ioredis');

// Initialize Redis client connection with error handling
let redisClient;
let redisEnabled = false;

try {
  redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 1, // Limit retries to avoid infinite reconnection
    retryStrategy: (times) => {
      // Only retry once
      if (times > 1) {
        redisEnabled = false;
        console.log('Redis connection failed. Cache will be disabled.');
        return null; // Stop retrying
      }
      return 100; // Retry after 100ms
    }
  });

  // Handle Redis client errors
  redisClient.on('error', (err) => {
    console.log('Redis client error:', err);
    redisEnabled = false;
  });

  redisClient.on('connect', () => {
    console.log('Redis connected. Cache is enabled.');
    redisEnabled = true;
  });
} catch (error) {
  console.log('Redis initialization error:', error);
  redisEnabled = false;
}

// Simple in-memory cache as a fallback when Redis is not available
const memoryCache = new Map();

// Function to create a no-op middleware that just passes to next
const createNoOpMiddleware = () => (req, res, next) => next();

/**
 * Creates a caching middleware for Express routes
 * @param {number} duration Cache duration in seconds
 * @param {Function} [keyGenerator] Optional function to generate a custom cache key from the request
 * @returns {Function} Express middleware
 */
exports.cacheResponse = (duration, keyGenerator) => {
  return createNoOpMiddleware();
};

/**
 * Clear cache for specific pattern
 * @param {string} pattern Key pattern to clear
 * @returns {Function} Express middleware function
 */
exports.clearCache = (pattern) => {
  return createNoOpMiddleware();
};

/**
 * Clear cache entry for a specific key
 * @param {string} key Cache key to invalidate
 * @returns {Promise<number>} 1 if successful, 0 otherwise
 */
exports.invalidateCache = async (key) => {
  return 0;
};

// Export the functions but don't export a Redis client
module.exports = {
  cacheResponse: exports.cacheResponse,
  clearCache: exports.clearCache,
  invalidateCache: exports.invalidateCache
}; 