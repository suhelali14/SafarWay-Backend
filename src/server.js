const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const responseTime = require('response-time');
const rateLimit = require('express-rate-limit');
const { cacheMiddleware, compressionMiddleware } = require('./middleware/cache.middleware');
const errorMiddleware = require('./middleware/error.middleware');
const { requestLogger } = require('./middleware/logging.middleware');
const { testConnection, mockPrisma } = require('./config/database');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const tourRoutes = require('./routes/tour.routes');
const bookingRoutes = require('./routes/booking.routes');

const inviteRoutes = require('./routes/invite.routes');
const customerRoutes = require('./routes/customer.routes');


const adminRoutes = require('./routes/admin.routes');
const agencyRoutes = require('./routes/agency.routes');
const agencyPublicRoutes = require('./routes/agencyPublic.routes');
const searchRoutes = require('./routes/search.routes');
const healthRoutes = require('./routes/health.routes');

// Optional routes - only import if they exist
let uploadRoutes, messageRoutes, analyticsRoutes, paymentRoutes, webhookRoutes;
try {
  uploadRoutes = require('./routes/upload.routes');
  messageRoutes = require('./routes/message.routes');
  analyticsRoutes = require('./routes/analytics.routes');
  paymentRoutes = require('./routes/payment.routes');
  webhookRoutes = require('./routes/webhook.routes');
} catch (error) {
  console.log('Some optional routes were not found:', error.message);
}

const app = express();

// Middleware
app.use(helmet());
app.use(compressionMiddleware);
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true
}));
app.use(morgan('dev'));
app.use(responseTime((req, res, time) => {
  if (time > 1000) {
    console.warn(`Slow API response: ${req.method} ${req.originalUrl} - ${time.toFixed(2)}ms`);
  }
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cacheMiddleware);

// Add request logger in development mode
if (process.env.NODE_ENV === 'development') {
  app.use(requestLogger);
}

// Apply API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', apiLimiter);

// Health check routes (public)
app.use('/health', healthRoutes);

// Initialize the application
async function initializeApp() {
  // Test database connection
  const isDbConnected = await testConnection();
  
  if (!isDbConnected && process.env.NODE_ENV === 'development' && process.env.ALLOW_MOCK_DB === 'true') {
    // Setup mock data handlers if in development with ALLOW_MOCK_DB
    mockPrisma();
  }
  
  // Register required routes
  app.use('/api/auth', authRoutes);
  app.use('/api/packages', tourRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/invites', inviteRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/agency', agencyRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/bookings', bookingRoutes);
  
  // Register optional routes if they exist
  if (uploadRoutes) app.use('/api/uploads', uploadRoutes);
  if (messageRoutes) app.use('/api/messages', messageRoutes);
  if (analyticsRoutes) app.use('/api/analytics', analyticsRoutes);
  if (paymentRoutes) app.use('/api/payments', paymentRoutes);
  if (webhookRoutes) app.use('/api/webhooks', webhookRoutes);
  
  // Error handling
  app.use(errorMiddleware);
  
  const PORT = process.env.PORT || 3000;
  
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    if (!isDbConnected) {
      console.log(`⚠️ WARNING: Running without database connection. Some features may not work.`);
    }
  });
}

// Start the app
initializeApp().catch(err => {
  console.error('Failed to initialize the application:', err);
  process.exit(1);
});

module.exports = app; 