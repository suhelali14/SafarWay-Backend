const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorizeRoles } = require('../middleware/auth.middleware');
const {
  validateCreateUser,
  validateUpdateUser,
  validateCreateAgency,
  validateUpdateAgency,
  validateUpdateBookingStatus,
  validateApproveRefund,
  validateUpdateSupportTicket,
  validateAddTicketResponse
} = require('../validators/admin.validator');
const { checkRedisStatus } = require('../middleware/cache.middleware');

// Apply authentication and admin authorization to all routes
router.use(authenticate, authorizeRoles(['SAFARWAY_ADMIN']));

// Dashboard
router.get('/dashboard/summary', adminController.getDashboardSummary);

// Users Management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', validateCreateUser, adminController.createUser);
router.put('/users/:id', validateUpdateUser, adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.patch('/users/:id/block', adminController.blockUser);
router.patch('/users/:id/unblock', adminController.unblockUser);

// Agencies Management
router.get('/agencies', adminController.getAgencies);
router.get('/agencies/:id', adminController.getAgencyById);
router.post('/agencies', validateCreateAgency, adminController.createAgency);
router.put('/agencies/:id', validateUpdateAgency, adminController.updateAgency);
router.delete('/agencies/:id', adminController.deleteAgency);
router.patch('/agencies/:id/approve', adminController.approveAgency);
router.patch('/agencies/:id/reject', adminController.rejectAgency);

// Bookings Management
router.get('/bookings', adminController.getAllBookings);
router.get('/bookings/:id', adminController.getBookingById);
router.patch('/bookings/:id/status', validateUpdateBookingStatus, adminController.updateBookingStatus);

// Revenue Insights
router.get('/revenue/insights', adminController.getRevenueInsights);


// Reports
router.get('/reports/',adminController.getReportAdmin);

// 
// Refund Requests
router.get('/refunds/requests', adminController.getRefundRequests);
router.get('/refunds/requests/:id', adminController.getRefundRequestById);
router.post('/refunds/requests/:id/approve', validateApproveRefund, adminController.approveRefund);
router.post('/refunds/requests/:id/reject', adminController.rejectRefund);

// Support Tickets
router.get('/support/tickets', adminController.getSupportTickets);
router.get('/support/tickets/:id', adminController.getSupportTicketById);
router.put('/support/tickets/:id', validateUpdateSupportTicket, adminController.updateSupportTicket);
router.post('/support/tickets/:id/respond', validateAddTicketResponse, adminController.addSupportTicketResponse);

// Redis status endpoint
router.get('/redis/status', async (req, res) => {
  try {
    const redisStatus = await checkRedisStatus();
    
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: redisStatus
    });
  } catch (error) {
    console.error('Error checking Redis status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking Redis status',
      error: error.message
    });
  }
});

// System status endpoint
router.get('/system/status', async (req, res) => {
  try {
    // Check Redis status
    const redisStatus = await checkRedisStatus();
    
    // Get basic system info
    const systemInfo = {
      timestamp: new Date().toISOString(),
      nodejs: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        memoryUsage: process.memoryUsage(),
      },
      redis: redisStatus,
      uptime: process.uptime()
    };
    
    res.status(200).json({
      success: true,
      data: systemInfo
    });
  } catch (error) {
    console.error('Error checking system status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking system status',
      error: error.message
    });
  }
});

// Export the router
module.exports = router; 