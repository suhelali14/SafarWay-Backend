const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Dashboard
const getDashboardSummary = async (req, res) => {
  try {
    const [
      totalUsers,
      totalAgencies,
      totalBookings,
      totalRevenue,
      totalPackages,
      refundRequests,
      supportTickets,
      recentBookings,
      recentUsers,
      bookingsLastSixMonths
    ] = await Promise.all([
      prisma.user.count(),
      prisma.agency.count(),
      prisma.booking.count(),
      prisma.booking.aggregate({
        _sum: { totalPrice: true }
      }),
      prisma.tourPackage.count(),
      prisma.refundRequest.count({
        where: { status: 'PENDING' }
      }),
      prisma.supportTicket.count({
        where: { status: 'OPEN' }
      }),
      prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          tourPackage: {
            select: {
              id: true,
              title: true,
              subtitle: true
            }
          }
        }
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
        }
      }),
      // Get bookings for the last 6 months for chart data
      prisma.booking.findMany({
        where: {
          createdAt: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
          }
        },
        select: {
          totalPrice: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      })
    ]);

    // Process booking data for chart
    const chartData = processBookingsForChart(bookingsLastSixMonths);

    // Format the data for response
    const dashboard = {
      totalUsers,
      totalAgencies,
      totalBookings,
      revenue: totalRevenue._sum.totalPrice || 0,
      totalPackages,
      pendingApprovals: refundRequests + supportTickets, // Combined for notification badge
      recentBookings: recentBookings.map(booking => ({
        id: booking.id,
        customer: booking.user.name,
        package: booking.tourPackage.title,
        location: booking.tourPackage.subtitle,
        amount: booking.totalPrice,
        date: booking.createdAt
      })),
      recentUsers: recentUsers.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        joinedOn: user.createdAt
      })),
      chartData
    };

    res.status(200).json(dashboard);
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching dashboard summary', 
      error: error.message 
    });
  }
};

// Helper function to process bookings data for chart
const processBookingsForChart = (bookings) => {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const bookingsByMonth = {};
  
  // Initialize with last 6 months
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthKey = `${monthNames[month.getMonth()]} ${month.getFullYear()}`;
    bookingsByMonth[monthKey] = 0;
  }
  
  // Sum bookings by month
  bookings.forEach(booking => {
    const date = new Date(booking.createdAt);
    const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    
    if (bookingsByMonth[monthKey] !== undefined) {
      bookingsByMonth[monthKey] += booking.totalPrice || 0;
    }
  });
  
  // Convert to array format for charts
  return Object.entries(bookingsByMonth).map(([name, value]) => ({
    name,
    value
  }));
};

// Users Management
const getUsers = async (req, res) => {
  try {
    const { limit = 10, offset = 0, search, status } = req.query;
    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(status && { status })
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { createdAt: 'desc' },
        include: {
          agency: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    // Transform the results to include agency name in the user object
    const transformedUsers = users.map(user => {
      // Structure the response with agency information if available
      return {
        ...user,
        agencyName: user.agency?.name || null,
        // Remove the nested agency object to keep response flat
        agency: undefined
      };
    });

    res.json({ users: transformedUsers, total });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        agency: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            contactPhone: true,
            status: true
          }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Transform the user object to include agency information directly
    const transformedUser = {
      ...user,
      agencyName: user.agency?.name || null,
      // Keep the full agency object in case we need detailed info
    };
    
    res.json(transformedUser);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const user = await prisma.user.create({
      data: req.body
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    await prisma.user.delete({
      where: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
};

const blockUser = async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'SUSPENDED' }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error blocking user', error: error.message });
  }
};

const unblockUser = async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'ACTIVE' }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error unblocking user', error: error.message });
  }
};

// Agencies Management
const getAgencies = async (req, res) => {
  try {
    const { limit = 10, offset = 0, search, status } = req.query;
    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { contactEmail: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(status && { status })
    };

    const [agencies, total] = await Promise.all([
      prisma.agency.findMany({
        where,
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.agency.count({ where })
    ]);

    res.json({ agencies, total });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching agencies', error: error.message });
  }
};

const getAgencyById = async (req, res) => {
  try {
    const agency = await prisma.agency.findUnique({
      where: { id: req.params.id },
      include: {
        users: true,
        tourPackages: true
      }
    });
    if (!agency) {
      return res.status(404).json({ message: 'Agency not found' });
    }
    res.json(agency);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching agency', error: error.message });
  }
};

const createAgency = async (req, res) => {
  try {
    const agency = await prisma.agency.create({
      data: req.body
    });
    res.status(201).json(agency);
  } catch (error) {
    res.status(500).json({ message: 'Error creating agency', error: error.message });
  }
};

const updateAgency = async (req, res) => {
  try {
    const agency = await prisma.agency.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(agency);
  } catch (error) {
    res.status(500).json({ message: 'Error updating agency', error: error.message });
  }
};

const deleteAgency = async (req, res) => {
  try {
    await prisma.agency.delete({
      where: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting agency', error: error.message });
  }
};

const approveAgency = async (req, res) => {
  try {
    const agency = await prisma.agency.update({
      where: { id: req.params.id },
      data: {
        verifiedBy: req.user.id,
        verifiedAt: new Date()
      }
    });
    res.json(agency);
  } catch (error) {
    res.status(500).json({ message: 'Error approving agency', error: error.message });
  }
};

const rejectAgency = async (req, res) => {
  try {
    const agency = await prisma.agency.update({
      where: { id: req.params.id },
      data: {
        status: 'REJECTED',
        verifiedBy: req.user.id,
        verifiedAt: new Date()
      }
    });
    res.json(agency);
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting agency', error: error.message });
  }
};

// Bookings Management
const getAllBookings = async (req, res) => {
  try {
    const { limit = 10, offset = 0, status, agencyId, userId, startDate, endDate } = req.query;
    const where = {
      ...(status && { status }),
      ...(agencyId && { tourPackage: { agencyId } }),
      ...(userId && { userId }),
      ...(startDate && endDate && {
        startDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          tourPackage: true
        }
      }),
      prisma.booking.count({ where })
    ]);

    res.json({ bookings, total });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bookings', error: error.message });
  }
};

const getBookingById = async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        tourPackage: true
      }
    });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching booking', error: error.message });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status }
    });
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Error updating booking status', error: error.message });
  }
};

// Revenue Insights
const getRevenueInsights = async (req, res) => {
  try {
    const { period = 'monthly', startDate, endDate } = req.query;
    const where = {
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    const bookings = await prisma.booking.findMany({
      where,
      select: {
        totalPrice: true,
        createdAt: true
      }
    });

    // Process the data based on the period
    const revenueData = processRevenueData(bookings, period);
    res.json(revenueData);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching revenue insights', error: error.message });
  }
};

// Helper function to process revenue data
const processRevenueData = (bookings, period) => {
  const data = {
    total: bookings.reduce((sum, booking) => sum + booking.totalPrice, 0),
    daily: [],
    weekly: [],
    monthly: [],
    currency: 'USD'
  };

  // Group bookings by period and calculate totals
  const groupedData = bookings.reduce((acc, booking) => {
    const date = new Date(booking.createdAt);
    const key = period === 'daily' ? date.toISOString().split('T')[0] :
               period === 'weekly' ? getWeekNumber(date) :
               `${date.getFullYear()}-${date.getMonth() + 1}`;

    if (!acc[key]) {
      acc[key] = 0;
    }
    acc[key] += booking.totalPrice;
    return acc;
  }, {});

  // Format the data based on period
  Object.entries(groupedData).forEach(([key, amount]) => {
    const entry = { date: key, amount };
    if (period === 'daily') data.daily.push(entry);
    else if (period === 'weekly') data.weekly.push(entry);
    else data.monthly.push(entry);
  });

  return data;
};

// Helper function to get week number
const getWeekNumber = (date) => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

// Refund Requests
const getRefundRequests = async (req, res) => {
  try {
    const { limit = 10, offset = 0, status } = req.query;
    const where = {
      ...(status && { status })
    };

    const [refundRequests, total] = await Promise.all([
      prisma.refundRequest.findMany({
        where,
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { createdAt: 'desc' },
        include: {
          booking: true,
          user: true
        }
      }),
      prisma.refundRequest.count({ where })
    ]);

    res.json({ refundRequests, total });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching refund requests', error: error.message });
  }
};

const getRefundRequestById = async (req, res) => {
  try {
    const refundRequest = await prisma.refundRequest.findUnique({
      where: { id: req.params.id },
      include: {
        booking: true,
        user: true
      }
    });
    if (!refundRequest) {
      return res.status(404).json({ message: 'Refund request not found' });
    }
    res.json(refundRequest);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching refund request', error: error.message });
  }
};

const approveRefund = async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const refundRequest = await prisma.refundRequest.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        amount,
        reason
      }
    });
    res.json(refundRequest);
  } catch (error) {
    res.status(500).json({ message: 'Error approving refund', error: error.message });
  }
};

const rejectRefund = async (req, res) => {
  try {
    const { reason } = req.body;
    const refundRequest = await prisma.refundRequest.update({
      where: { id: req.params.id },
      data: {
        status: 'REJECTED',
        reason
      }
    });
    res.json(refundRequest);
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting refund', error: error.message });
  }
};

// Support Tickets
const getSupportTickets = async (req, res) => {
  try {
    const { limit = 10, offset = 0, status, priority } = req.query;
    const where = {
      ...(status && { status }),
      ...(priority && { priority })
    };

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { createdAt: 'desc' },
        include: {
          user: true
        }
      }),
      prisma.supportTicket.count({ where })
    ]);

    res.json({ tickets, total });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching support tickets', error: error.message });
  }
};

const getSupportTicketById = async (req, res) => {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: req.params.id },
      include: {
        user: true
      }
    });
    if (!ticket) {
      return res.status(404).json({ message: 'Support ticket not found' });
    }
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching support ticket', error: error.message });
  }
};

const updateSupportTicket = async (req, res) => {
  try {
    const ticket = await prisma.supportTicket.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Error updating support ticket', error: error.message });
  }
};

const addSupportTicketResponse = async (req, res) => {
  try {
    const { message } = req.body;
    const ticket = await prisma.supportTicket.update({
      where: { id: req.params.id },
      data: {
        responses: {
          create: {
            message,
            userId: req.user.id
          }
        }
      }
    });
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Error adding support ticket response', error: error.message });
  }
};

module.exports = {
  getDashboardSummary,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  blockUser,
  unblockUser,
  getAgencies,
  getAgencyById,
  createAgency,
  updateAgency,
  deleteAgency,
  approveAgency,
  rejectAgency,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  getRevenueInsights,
  getRefundRequests,
  getRefundRequestById,
  approveRefund,
  rejectRefund,
  getSupportTickets,
  getSupportTicketById,
  updateSupportTicket,
  addSupportTicketResponse
}; 