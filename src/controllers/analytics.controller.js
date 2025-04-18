const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get dashboard statistics
 */
const getDashboardStats = async (req, res) => {
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
      recentUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.agency.count(),
      prisma.booking.count(),
      prisma.booking.aggregate({
        _sum: { totalPrice: true }
      }),
      prisma.tourPackage.count(),
      prisma.refundRequest.count(),
      prisma.supportTicket.count(),
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
              subtitle: true,
              pricePerPerson: true
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
      })
    ]);

    // Format response
    const dashboardData = {
      totalUsers,
      totalAgencies,
      totalBookings,
      totalRevenue: totalRevenue._sum.totalPrice || 0,
      totalPackages,
      refundRequests,
      supportTickets,
      recentBookings: recentBookings.map(booking => ({
        id: booking.id,
        customer: booking.user.name,
        package: booking.tourPackage.title,
        location: booking.tourPackage.subtitle,
        price: booking.tourPackage.pricePerPerson,
        totalAmount: booking.totalPrice,
        date: booking.createdAt
      })),
      recentUsers
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ 
      message: 'Error fetching dashboard statistics', 
      error: error.message 
    });
  }
};

/**
 * Get booking statistics
 */
const getBookingStats = async (req, res) => {
  try {
    const { 
      period = 'monthly', 
      startDate, 
      endDate, 
      agencyId 
    } = req.query;

    // Define date range filters
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    } else {
      // Default to last 6 months if no dates provided
      dateFilter.createdAt = {
        gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
      };
    }

    // Agency filter if provided
    const agencyFilter = agencyId ? { 
      tourPackage: { agencyId } 
    } : {};

    // Get bookings with filters
    const bookings = await prisma.booking.findMany({
      where: {
        ...dateFilter,
        ...agencyFilter
      },
      select: {
        id: true,
        status: true,
        totalPrice: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Get booking counts by status
    const bookingsByStatus = await prisma.booking.groupBy({
      by: ['status'],
      where: {
        ...dateFilter,
        ...agencyFilter
      },
      _count: {
        id: true
      }
    });

    // Process data based on period (daily, weekly, monthly)
    const bookingTrends = processBookingsByPeriod(bookings, period);
    
    // Format status counts
    const statusCounts = {};
    bookingsByStatus.forEach(item => {
      statusCounts[item.status] = item._count.id;
    });

    res.json({
      totalBookings: bookings.length,
      statusCounts,
      bookingTrends,
      // Calculate some additional metrics
      averageBookingValue: bookings.length > 0 
        ? bookings.reduce((acc, b) => acc + b.totalPrice, 0) / bookings.length
        : 0
    });
  } catch (error) {
    console.error('Error fetching booking stats:', error);
    res.status(500).json({ 
      message: 'Error fetching booking statistics', 
      error: error.message 
    });
  }
};

/**
 * Get revenue statistics
 */
const getRevenueStats = async (req, res) => {
  try {
    const { 
      period = 'monthly', 
      startDate, 
      endDate, 
      agencyId 
    } = req.query;

    // Define date range filters
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    } else {
      // Default to last 6 months if no dates provided
      dateFilter.createdAt = {
        gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
      };
    }

    // Agency filter if provided
    const agencyFilter = agencyId ? { 
      tourPackage: { agencyId } 
    } : {};

    // Get all bookings with payment status PAID or PARTIALLY_REFUNDED
    const bookings = await prisma.booking.findMany({
      where: {
        ...dateFilter,
        ...agencyFilter,
        paymentStatus: {
          in: ['PAID', 'PARTIALLY_REFUNDED']
        }
      },
      select: {
        id: true,
        totalPrice: true,
        createdAt: true,
        paymentStatus: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Total revenue
    const totalRevenue = bookings.reduce((acc, booking) => acc + booking.totalPrice, 0);

    // Process revenue data by period
    const revenueByPeriod = processRevenueByPeriod(bookings, period);

    res.json({
      total: totalRevenue,
      [period]: revenueByPeriod,
      currency: 'USD'  // Hardcoded for now, could be a config option
    });
  } catch (error) {
    console.error('Error fetching revenue stats:', error);
    res.status(500).json({ 
      message: 'Error fetching revenue statistics', 
      error: error.message 
    });
  }
};

/**
 * Helper function to process bookings data by period
 */
function processBookingsByPeriod(bookings, period) {
  const result = [];
  const groupedData = {};

  // Group data by period
  bookings.forEach(booking => {
    const date = new Date(booking.createdAt);
    let key;

    switch (period) {
      case 'daily':
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
        break;
      case 'weekly':
        // Get the first day of the week (Sunday)
        const firstDayOfWeek = new Date(date);
        const day = date.getDay();
        firstDayOfWeek.setDate(date.getDate() - day);
        key = firstDayOfWeek.toISOString().split('T')[0];
        break;
      case 'monthly':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'yearly':
        key = date.getFullYear().toString();
        break;
      default:
        key = date.toISOString().split('T')[0]; // Default to daily
    }

    if (!groupedData[key]) {
      groupedData[key] = { count: 0, amount: 0 };
    }
    
    groupedData[key].count += 1;
    groupedData[key].amount += booking.totalPrice;
  });

  // Format the grouped data
  for (const [key, value] of Object.entries(groupedData)) {
    let label;
    
    switch (period) {
      case 'daily':
        label = key; // YYYY-MM-DD
        break;
      case 'weekly':
        // Calculate the end of the week
        const startDate = new Date(key);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        label = `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`;
        break;
      case 'monthly':
        const [year, month] = key.split('-');
        label = `${getMonthName(parseInt(month) - 1)} ${year}`;
        break;
      case 'yearly':
        label = key;
        break;
      default:
        label = key;
    }

    result.push({
      period: label,
      count: value.count,
      amount: value.amount
    });
  }

  return result.sort((a, b) => {
    // Sort by the first part of period (date) if it's a range
    const aDate = a.period.split(' to ')[0];
    const bDate = b.period.split(' to ')[0];
    return new Date(aDate) - new Date(bDate);
  });
}

/**
 * Helper function to process revenue data by period
 */
function processRevenueByPeriod(bookings, period) {
  const result = [];
  const groupedData = {};

  // Group data by period
  bookings.forEach(booking => {
    const date = new Date(booking.createdAt);
    let key;

    switch (period) {
      case 'daily':
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
        break;
      case 'weekly':
        // Get the ISO week number
        const weekNumber = getWeekNumber(date);
        key = `${date.getFullYear()}-W${weekNumber}`;
        break;
      case 'monthly':
        key = getMonthName(date.getMonth());
        break;
      case 'yearly':
        key = date.getFullYear().toString();
        break;
      default:
        key = date.toISOString().split('T')[0]; // Default to daily
    }

    if (!groupedData[key]) {
      groupedData[key] = 0;
    }
    
    groupedData[key] += booking.totalPrice;
  });

  // Format the grouped data
  for (const [key, amount] of Object.entries(groupedData)) {
    switch (period) {
      case 'daily':
        result.push({ date: key, amount });
        break;
      case 'weekly':
        result.push({ week: key, amount });
        break;
      case 'monthly':
        result.push({ month: key, amount });
        break;
      case 'yearly':
        result.push({ year: key, amount });
        break;
      default:
        result.push({ date: key, amount });
    }
  }

  return result;
}

/**
 * Helper function to get month name
 */
function getMonthName(monthIndex) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthIndex];
}

/**
 * Helper function to get ISO week number
 */
function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNumber = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNumber;
}

module.exports = {
  getDashboardStats,
  getBookingStats,
  getRevenueStats
}; 