const express = require('express');
const router = express.Router();
const { checkRedisStatus } = require('../middleware/cache.middleware');

// Basic health check endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'SafarWay API'
  });
});

// Detailed system status endpoint
router.get('/status', async (req, res) => {
  try {
    // Check Redis status
    const redisStatus = await checkRedisStatus();
    
    // Get basic system info
    const systemInfo = {
      timestamp: new Date().toISOString(),
      service: 'SafarWay API',
      status: 'UP',
      nodejs: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        memoryUsage: {
          rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
          heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
          external: `${Math.round(process.memoryUsage().external / 1024 / 1024)} MB`,
        }
      },
      cache: {
        redis: redisStatus,
      },
      uptime: `${Math.floor(process.uptime() / 60)} minutes ${Math.floor(process.uptime() % 60)} seconds`
    };
    
    res.status(200).json(systemInfo);
  } catch (error) {
    console.error('Error checking system status:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error checking system status',
      error: error.message
    });
  }
});

// Redis status check endpoint
router.get('/redis', async (req, res) => {
  try {
    const redisStatus = await checkRedisStatus();
    
    res.status(200).json({
      timestamp: new Date().toISOString(),
      cache: {
        redis: redisStatus,
      }
    });
  } catch (error) {
    console.error('Error checking Redis status:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error checking Redis status',
      error: error.message
    });
  }
});

module.exports = router; 