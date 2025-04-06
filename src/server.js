const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const initializeApp = require('./utils/init');

// Load environment variables
dotenv.config();

// Initialize app
initializeApp();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Import routes
const authRoutes = require('./routes/auth.routes');
const tourPackageRoutes = require('./routes/tourPackage.routes');
const bookingRoutes = require('./routes/booking.routes');
const uploadRoutes = require('./routes/upload.routes');
const inviteRoutes = require('./routes/invite.routes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/packages', tourPackageRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/invite', inviteRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  // Handle specific errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: err.errors,
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Token expired',
    });
  }

  // Default error
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 