const Redis = require('ioredis');
const compression = require('compression');
const crypto = require('crypto');
const memoryCache = require('memory-cache');

// Constants for the in-memory cache
const MEMORY_CACHE_MAX_SIZE = 200;
const MEMORY_CACHE_CHECK_INTERVAL = 60000;

// Initialize global variables
let redis = null;
let redisEnabled = false;
const memCacheStore = new memoryCache.Cache();

// Track memory cache usage
let memCacheHits = 0;
let memCacheMisses = 0;
let redisCacheHits = 0;
let redisCacheMisses = 0;

// Memory cache cleanup interval
setInterval(() => {
  if (memCacheHits + memCacheMisses > 0) {
    // console.log(`Memory cache stats - Size: ${memCacheStore.size()}, Hits: ${memCacheHits}, Misses: ${memCacheMisses}`);
    // console.log(`Redis cache stats - Enabled: ${redisEnabled}, Hits: ${redisCacheHits}, Misses: ${redisCacheMisses}`);
  }
}, MEMORY_CACHE_CHECK_INTERVAL);

// Try to connect to Redis
try {
  redis = new Redis(process.env.REDIS_URL || 'redis://default:l8pwQQoeF5woA1O7QqaER6eY3N6PdtTq@redis-14229.crce182.ap-south-1-1.ec2.redns.redis-cloud.com:14229', {
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    enableOfflineQueue: true,
    reconnectOnError: function (err) {
      const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNREFUSED'];
      return targetErrors.includes(err.code);
    },
    retryStrategy(times) {
      if (times > 5) {
        console.warn('Redis retry limit reached, falling back to memory cache');
        return null;
      }
      const delay = Math.min(500 + Math.random() * 100, 1000 * Math.pow(2, times));
      // console.log(`Redis connection retry in ${delay}ms (attempt ${times})`);
      return delay;
    },
    connectionName: 'safarway-cache',
    db: Number(process.env.REDIS_DB || 0),
  });

  redis.on('connect', () => {
    console.info('✅ Redis cache connected');
    redisEnabled = true;
    const redisOptions = redis.options;
    console.info(`Redis connected to: ${redisOptions.host}:${redisOptions.port}, DB: ${redisOptions.db}`);
    testRedisConnection();
  });

  redis.on('reconnecting', () => {
    console.info('🔄 Redis reconnecting...');
  });

  redis.on('ready', () => {
    console.info('✅ Redis ready to accept commands');
    redisEnabled = true;
  });

  redis.on('error', (err) => {
    if (redisEnabled || err.code !== 'ECONNREFUSED') {
      console.error('❌ Redis cache error:', err.message);
      console.error(`Redis connection details: Host: ${redis.options.host}, Port: ${redis.options.port}`);
      console.error(`Error code: ${err.code}, Error name: ${err.name}`);
    }
    redisEnabled = false;
  });
} catch (err) {
  console.error('❌ Redis initialization error:', err.message);
  redisEnabled = false;
  console.info('⚠️ Using in-memory cache as fallback');
}

// Test Redis connection
const testRedisConnection = async () => {
  try {
    await redis.set('connection_test', 'ok', 'EX', 10);
    const result = await redis.get('connection_test');
    if (result === 'ok') {
      console.info('✅ Redis connection test passed - Read/write operations working');
    } else {
      console.error(`⚠️ Redis connection test failed - Unexpected result: ${result}`);
      redisEnabled = false;
    }
  } catch (error) {
    console.error('❌ Redis connection test failed:', error.message);
    redisEnabled = false;
  }
};

// Check Redis status
const checkRedisStatus = async () => {
  if (!redis) {
    return {
      connected: false,
      message: 'Redis client not initialized',
      memoryCache: {
        enabled: true,
        size: memCacheStore.size(),
        hits: memCacheHits,
        misses: memCacheMisses,
      },
    };
  }

  try {
    const pingPromise = redis.ping();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Ping timeout')), 500)
    );
    const pong = await Promise.race([pingPromise, timeoutPromise]);
    return {
      connected: pong === 'PONG',
      message: `Redis server responded with: ${pong}`,
      host: redis.options.host,
      port: redis.options.port,
      db: redis.options.db,
      hits: redisCacheHits,
      misses: redisCacheMisses,
      memoryCache: {
        enabled: true,
        size: memCacheStore.size(),
        hits: memCacheHits,
        misses: memCacheMisses,
      },
    };
  } catch (error) {
    return {
      connected: false,
      message: `Redis ping failed: ${error.message}`,
      error: error.code || error.name,
      memoryCache: {
        enabled: true,
        size: memCacheStore.size(),
        hits: memCacheHits,
        misses: memCacheMisses,
      },
    };
  }
};

// Cache TTL values in seconds
const DEFAULT_TTL = 360;
const TTL_CONFIG = {
  packages: 60,
  'packages:list': 180,
  'packages:list:destination': 60,
  'packages:list:tourType': 60,
  'packages:details': 7200,
  'packages:reviews': 60,
  'packages:similar': 60,
  agencies: 720,
  destinations: 400,
  'user:bookings': 30,
  'user:wishlist': 30,
  'user:profile': 60,
  'bookings:failure':6000,
  'bookings:confirmation': 6000,
};

// Generate cache key from request
const generateCacheKey = (req, options = {}) => {
  // Default options
  const defaultOptions = {
    includeHeaders: ['user-agent'], // Include user-agent for browser-specific keys
    ignoredQueryParams: ['_t', 'timestamp'],
    maxKeyLength: 100,
    hashAlgorithm: 'sha256', // Use SHA-256 instead of MD5
  };
  const config = { ...defaultOptions, ...options };

  // Validate required properties
  if (!req.method || !req.originalUrl) {
    throw new Error('Request object missing method or originalUrl');
  }

  // Base key: HTTP method and route path
  let keyBase = `${req.method.toUpperCase()}:${req.originalUrl.split('?')[0]}`;

  // Add query parameters
  if (req.query && Object.keys(req.query).length > 0) {
    const sortedQuery = Object.keys(req.query)
      .filter((key) => !config.ignoredQueryParams.includes(key))
      .sort()
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(req.query[key])}`)
      .join('&');
    if (sortedQuery) {
      keyBase += `:${sortedQuery}`;
    }
  }

  // Add route parameters
  if (req.params && Object.keys(req.params).length > 0) {
    const sortedParams = Object.keys(req.params)
      .sort()
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(req.params[key])}`)
      .join('&');
    keyBase += `:${sortedParams}`;
  }

  // Add headers
  if (config.includeHeaders.length > 0 && req.headers) {
    const headerString = config.includeHeaders
      .filter((header) => req.headers[header])
      .sort()
      .map((header) => `${header}:${encodeURIComponent(req.headers[header])}`)
      .join('&');
    if (headerString) {
      keyBase += `:headers:${headerString}`;
    }
  }

  // Add user ID for authenticated requests
  if (req?.rawHeaders[7]) {
    console.log("in the if condition")
    keyBase += `:Unique-Header:${req?.rawHeaders[7]}`;
  }

  // Hash the key if too long
  if (keyBase.length > config.maxKeyLength) {
    return crypto
      .createHash(config.hashAlgorithm)
      .update(keyBase)
      .digest('hex');
  }

  return keyBase;
};

// Get TTL based on cache key
const getTTL = (cacheKey) => {
  if (cacheKey.includes('packages') && cacheKey.includes('destination=')) {
    return TTL_CONFIG['packages:list:destination'];
  }
  if (cacheKey.includes('packages') && cacheKey.includes('tourType=')) {
    return TTL_CONFIG['packages:list:tourType'];
  }
  if(cacheKey.includes('booking') && cacheKey.includes('confirmation')) {

    return TTL_CONFIG['bookings:confirmation'];

  }
  if(cacheKey.includes('bookings') && cacheKey.includes('failure')) {
    return TTL_CONFIG['bookings:failure'];
  }
  for (const [prefix, ttl] of Object.entries(TTL_CONFIG)) {
    if (cacheKey.includes(prefix)) {
      return ttl;
    }
  }
  return DEFAULT_TTL;
};

// Safe Redis operation wrapper
const safeRedisOperation = async (operation) => {
  if (!redisEnabled || !redis) return null;
  try {
    return await operation();
  } catch (error) {
    if (error.code !== 'ECONNREFUSED') {
      console.error('Redis operation failed:', error.message);
    }
    return null;
  }
};

// Get data from cache
const getFromCache = async (key) => {
  const cacheStart = Date.now();
  try {
    if (redisEnabled) {
      try {
        const redisData = await redis.get(key);
        if (redisData) {
          redisCacheHits++;
          const redisTiming = Date.now() - cacheStart;
          if (redisTiming > 50) {
            // console.log(`Redis cache hit took ${redisTiming}ms for key pattern: ${key.split(':')[0]}`);
          }
          return { source: 'redis', data: redisData };
        }
        redisCacheMisses++;
      } catch (redisError) {
        console.warn(`Redis cache read failed, falling back to memory: ${redisError.message}`);
        redisEnabled = false;
      }
    }
    const memCacheItem = memCacheStore.get(key);
    if (memCacheItem) {
      memCacheHits++;
      memCacheItem.accessed = Date.now();
      const memTiming = Date.now() - cacheStart;
      if (memTiming > 20) {
        // console.log(`Memory cache hit took ${memTiming}ms for key pattern: ${key.split(':')[0]}`);
      }
      return { source: 'memory', data: memCacheItem.data };
    }
    memCacheMisses++;
    return null;
  } catch (error) {
    console.error(`Cache read error for key ${key}:`, error);
    return null;
  }
};

// Store data in cache
const storeInCache = async (key, data, ttl) => {
  const cacheStart = Date.now();
  try {
    if (redisEnabled) {
      try {
        await redis.set(key, data, 'EX', ttl);
        const redisTiming = Date.now() - cacheStart;
        if (redisTiming > 50) {
          // console.log(`Redis cache write took ${redisTiming}ms for key: ${key.substring(0, 50)}...`);
        }
      } catch (redisError) {
        console.warn(`Redis cache write failed, falling back to memory cache: ${redisError.message}`);
        redisEnabled = false;
      }
    }
    if (memCacheStore.size() >= MEMORY_CACHE_MAX_SIZE) {
      const keys = memCacheStore.keys().sort((a, b) => {
        const itemA = memCacheStore.get(a);
        const itemB = memCacheStore.get(b);
        return (itemA.accessed || 0) - (itemB.accessed || 0);
      });
      const keysToRemove = Math.ceil(MEMORY_CACHE_MAX_SIZE * 0.1);
      for (let i = 0; i < keysToRemove && i < keys.length; i++) {
        memCacheStore.del(keys[i]);
      }
    }
    memCacheStore.put(
      key,
      {
        data,
        accessed: Date.now(),
        size: data.length,
      },
      ttl * 1000
    );
    const totalTiming = Date.now() - cacheStart;
    if (totalTiming > 100) {
      // console.log(`Cache storage took ${totalTiming}ms for key pattern: ${key.split(':')[0]}`);
    }
  } catch (error) {
    console.error('Cache storage error:', error);
  }
};

// Cache middleware
const cacheMiddleware = async (req, res, next) => {
  if (
    req.method !== 'GET' ||
    (req.user && (req.user.role === 'SAFARWAY_ADMIN' || req.user.role === 'AGENCY_ADMIN')) ||
    req.path.includes('/admin') ||
    req.query.noCache === 'true'
  ) {
    return next();
  }
  
  const cacheStart = Date.now();
  const cacheKey = generateCacheKey(req);
  const cacheKeyType = cacheKey.split(':')[0];

  const cachedResult = await getFromCache(cacheKey);
  if (cachedResult) {
    try {
      const parsedData = JSON.parse(cachedResult.data);
      res.set('X-Cache', `HIT-${cachedResult.source.toUpperCase()}`);
      res.set('X-Cache-Key', cacheKey.substring(0, 50));
      if (req.path.includes('/api/') && parsedData.data?.timing) {
        parsedData.data.timing.cacheRetrievalTime = Date.now() - cacheStart;
        parsedData.data.timing.fromCache = true;
      }
      return res.status(parsedData.status || 200).json(parsedData.data);
    } catch (error) {
      console.error(`Error parsing cached data for ${cacheKey}:`, error.message);
    }
  }
  res.set('X-Cache', 'MISS');
  if (req.path.includes('/packages') && !req.path.includes('/packages/')) {
    if (req.query.destination) {
      res.set('Cache-Control', 'public, max-age=1800');
    } else if (req.query.tourType) {
      res.set('Cache-Control', 'public, max-age=3600');
    } else {
      res.set('Cache-Control', 'public, max-age=600');
    }
  }
  const originalJson = res.json;
  res.json = function (data) {
    if (res.statusCode >= 400) {
      return originalJson.call(this, data);
    }
    const cacheTiming = Date.now() - cacheStart;
    if (req.path.includes('/api/') && typeof data === 'object' && data !== null) {
      if (data.timing) {
        data.timing.cacheProcessingTime = cacheTiming;
        data.timing.fromCache = false;
      }
    }
    const responseData = {
      data,
      status: res.statusCode,
      timestamp: Date.now(),
    };
    const ttl = getTTL(cacheKey);
    storeInCache(cacheKey, JSON.stringify(responseData), ttl).catch((err) =>
      console.error(`Error storing cache for ${cacheKey}:`, err)
    );
    return originalJson.call(this, data);
  };
  next();
};

// Clear cache for specific patterns
const clearCache = async (pattern) => {
  if (redisEnabled) {
    await safeRedisOperation(async () => {
      const keys = await redis.keys(`safarway:${pattern}`);
      if (keys.length > 0) {
        await redis.del(keys);
        // console.log(`Cleared ${keys.length} Redis cache entries for pattern: ${pattern}`);
      }
    });
  }
  const regexPattern = new RegExp(pattern.replace(/\*/g, '.*'));
  let cleared = 0;
  const memKeys = memCacheStore.keys();
  memKeys.forEach((key) => {
    if (regexPattern.test(key)) {
      memCacheStore.del(key);
      cleared++;
    }
  });
  if (cleared > 0) {
    // console.log(`Cleared ${cleared} memory cache entries for pattern: ${pattern}`);
  }
};

// Clear cache middleware
const clearCacheMiddleware = (pattern) => async (req, res, next) => {
  const originalEnd = res.end;
  res.end = async function (chunk, encoding) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      await clearCache(pattern);
    }
    originalEnd.call(this, chunk, encoding);
  };
  next();
};

// Cache helpers
const cacheHelpers = {
  clearPackageCache: async (packageId) => {
    await clearCache(`*packages*`);
    if (packageId) {
      await clearCache(`*packages:${packageId}*`);
    }
  },
  clearUserCache: async (userId) => {
    if (!userId) return;
    await clearCache(`*user:${userId}*`);
  },
  clearAgencyCache: async (agencyId) => {
    await clearCache(`*agencies*`);
    if (agencyId) {
      await clearCache(`*agencies:${agencyId}*`);
      await clearCache(`*packages*`);
    }
  },
  clearBookingCache: async (bookingId, userId) => {
    await clearCache(`*bookings*`);
    if (bookingId) {
      await clearCache(`*bookings:${bookingId}*`);
    }
    if (userId) {
      await clearCache(`*user:${userId}*bookings*`);
    }
  },
};

// Compression middleware
const compressionMiddleware = compression({
  level: 6,
  threshold: 1024,
  memLevel: 8,
  windowBits: 15,
  filter: (req, res) => {
    if (res.get('X-Cache')?.startsWith('HIT')) {
      return false;
    }
    const contentLength = parseInt(res.get('Content-Length'), 10);
    if (contentLength && contentLength < 1024) {
      return false;
    }
    return compression.filter(req, res);
  },
  contentType: [
    'text/html',
    'text/css',
    'text/javascript',
    'application/javascript',
    'application/json',
    'application/x-javascript',
    'text/xml',
    'application/xml',
    'application/xml+rss',
    'text/plain',
  ],
});

module.exports = {
  redis,
  redisEnabled,
  cacheMiddleware,
  clearCacheMiddleware,
  cacheHelpers,
  compressionMiddleware,
  checkRedisStatus,
};