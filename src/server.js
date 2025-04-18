const express = require('express');
const cors = require('./middleware/cors.middleware');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const errorHandler = require('./middleware/error.middleware');
const { requestLogger } = require('./middleware/logging.middleware');
const { testConnection, mockPrisma } = require('./config/database');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const tourRoutes = require('./routes/tour.routes');
const bookingRoutes = require('./routes/booking.routes');
const uploadRoutes = require('./routes/upload.routes');
const inviteRoutes = require('./routes/invite.routes');
const customerRoutes = require('./routes/customer.routes');
const messageRoutes = require('./routes/message.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const adminRoutes = require('./routes/admin.routes');
const agencyRoutes = require('./routes/agency.routes');

const app = express();

// Middleware
app.use(cors);
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request logger in development mode
if (process.env.NODE_ENV === 'development') {
  app.use(requestLogger);
}

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Initialize the application
async function initializeApp() {
  // Test database connection
  const isDbConnected = await testConnection();
  
  if (!isDbConnected && process.env.NODE_ENV === 'development' && process.env.ALLOW_MOCK_DB === 'true') {
    // Setup mock data handlers if in development with ALLOW_MOCK_DB
    mockPrisma();
  }
  
  // Routes
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
  
  // Error handling
  app.use(errorHandler);
  
  const PORT = process.env.PORT || 3001;
  
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