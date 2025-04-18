const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all customers with pagination and filtering
exports.getAllCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter conditions
    const where = {};
    
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }
    
    if (status) {
      where.user = { ...where.user, status: status.toUpperCase() };
    }
    
    // Get customers with user data
    const customers = await prisma.customer.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            profileImage: true,
            createdAt: true,
          },
        },
        bookings: {
          include: {
            tourPackage: {
              select: {
                id: true,
                title: true,
                agency: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: parseInt(limit),
    });
    
    // Get total count for pagination
    const total = await prisma.customer.count({ where });
    
    // Process customers to include booking stats
    const processedCustomers = customers.map(customer => {
      const totalBookings = customer.bookings.length;
      const totalSpent = customer.bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
      const lastBooking = customer.bookings.length > 0 ? customer.bookings[0] : null;
      
      return {
        id: customer.id,
        userId: customer.userId,
        name: customer.user.name,
        email: customer.user.email,
        phone: customer.user.phone,
        address: customer.address,
        status: customer.user.status,
        profileImage: customer.user.profileImage,
        joinDate: customer.user.createdAt,
        totalBookings,
        totalSpent,
        lastBooking: lastBooking ? {
          id: lastBooking.id,
          tourId: lastBooking.tourPackageId,
          tourName: lastBooking.tourPackage.title,
          date: lastBooking.startDate,
          amount: lastBooking.totalPrice,
          status: lastBooking.status,
        } : null,
        bookings: customer.bookings.map(booking => ({
          id: booking.id,
          tourId: booking.tourPackageId,
          tourName: booking.tourPackage.title,
          agencyName: booking.tourPackage.agency.name,
          date: booking.startDate,
          amount: booking.totalPrice,
          status: booking.status,
        })),
      };
    });
    
    res.status(200).json({
      success: true,
      data: processedCustomers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      error: error.message,
    });
  }
};

// Get customer by ID
exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            profileImage: true,
            createdAt: true,
          },
        },
        bookings: {
          include: {
            tourPackage: {
              select: {
                id: true,
                title: true,
                agency: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }
    
    // Process customer data
    const totalBookings = customer.bookings.length;
    const totalSpent = customer.bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
    const lastBooking = customer.bookings.length > 0 ? customer.bookings[0] : null;
    
    const processedCustomer = {
      id: customer.id,
      userId: customer.userId,
      name: customer.user.name,
      email: customer.user.email,
      phone: customer.user.phone,
      address: customer.address,
      status: customer.user.status,
      profileImage: customer.user.profileImage,
      joinDate: customer.user.createdAt,
      totalBookings,
      totalSpent,
      lastBooking: lastBooking ? {
        id: lastBooking.id,
        tourId: lastBooking.tourPackageId,
        tourName: lastBooking.tourPackage.title,
        date: lastBooking.startDate,
        amount: lastBooking.totalPrice,
        status: lastBooking.status,
      } : null,
      bookings: customer.bookings.map(booking => ({
        id: booking.id,
        tourId: booking.tourPackageId,
        tourName: booking.tourPackage.title,
        agencyName: booking.tourPackage.agency.name,
        date: booking.startDate,
        amount: booking.totalPrice,
        status: booking.status,
      })),
    };
    
    res.status(200).json({
      success: true,
      data: processedCustomer,
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer',
      error: error.message,
    });
  }
};

// Create a new customer
exports.createCustomer = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;
    
    // Check if user with email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }
    
    // Create user and customer in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Create user
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password, // Note: In production, hash the password
          phone,
          role: 'CUSTOMER',
          status: 'ACTIVE',
        },
      });
      
      // Create customer
      const customer = await prisma.customer.create({
        data: {
          userId: user.id,
          address,
        },
      });
      
      return { user, customer };
    });
    
    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: {
        id: result.customer.id,
        userId: result.user.id,
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone,
        address: result.customer.address,
        status: result.user.status,
      },
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create customer',
      error: error.message,
    });
  }
};

// Update customer
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, status } = req.body;
    
    // Find customer
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }
    
    // Update user and customer in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Update user
      const user = await prisma.user.update({
        where: { id: customer.userId },
        data: {
          name,
          email,
          phone,
          status: status ? status.toUpperCase() : undefined,
        },
      });
      
      // Update customer
      const updatedCustomer = await prisma.customer.update({
        where: { id },
        data: {
          address,
        },
      });
      
      return { user, customer: updatedCustomer };
    });
    
    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: {
        id: result.customer.id,
        userId: result.user.id,
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone,
        address: result.customer.address,
        status: result.user.status,
      },
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update customer',
      error: error.message,
    });
  }
};

// Delete customer
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find customer
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }
    
    // Delete customer and user in a transaction
    await prisma.$transaction(async (prisma) => {
      // Delete customer
      await prisma.customer.delete({
        where: { id },
      });
      
      // Delete user
      await prisma.user.delete({
        where: { id: customer.userId },
      });
    });
    
    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete customer',
      error: error.message,
    });
  }
};

// Get customer bookings
exports.getCustomerBookings = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Find customer
    const customer = await prisma.customer.findUnique({
      where: { id },
    });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }
    
    // Build filter conditions
    const where = {
      customerId: id,
    };
    
    if (status) {
      where.status = status.toUpperCase();
    }
    
    // Get bookings
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        tourPackage: {
          select: {
            id: true,
            title: true,
            coverImage: true,
            agency: {
              select: {
                id: true,
                name: true,
                logo: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: parseInt(limit),
    });
    
    // Get total count for pagination
    const total = await prisma.booking.count({ where });
    
    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching customer bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer bookings',
      error: error.message,
    });
  }
};

// Get customer profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customer: true
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }
    
    // Get stats
    const totalBookings = await prisma.booking.count({
      where: { userId }
    });
    
    const wishlistCount = await prisma.wishlist.count({
      where: { userId }
    });
    
    const profile = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profileImage: user.profileImage,
      role: user.role,
      customerId: user.customer?.id,
      address: user.customer?.address,
      stats: {
        totalBookings,
        wishlistCount
      }
    };
    
    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

// Get my bookings
exports.getMyBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;
    
    const where = { userId };
    if (status) {
      where.status = status;
    }
    
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        tourPackage: {
          select: {
            id: true,
            title: true,
            subtitle: true,
            coverImage: true,
            pricePerPerson: true,
            duration: true,
            tourType: true,
            agency: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.status(200).json({
      success: true,
      data: bookings,
      count: bookings.length
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message
    });
  }
};

// Get ongoing trips
exports.getOngoingTrips = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    
    const ongoingTrips = await prisma.booking.findMany({
      where: {
        userId,
        status: 'CONFIRMED',
        startDate: {
          lte: today
        },
        endDate: {
          gte: today
        }
      },
      include: {
        tourPackage: {
          select: {
            id: true,
            title: true,
            subtitle: true,
            coverImage: true,
            duration: true,
            agency: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });
    
    res.status(200).json({
      success: true,
      data: ongoingTrips,
      count: ongoingTrips.length
    });
  } catch (error) {
    console.error('Error fetching ongoing trips:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ongoing trips',
      error: error.message
    });
  }
};

// Get upcoming trips
exports.getUpcomingTrips = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);
    
    const upcomingTrips = await prisma.booking.findMany({
      where: {
        userId,
        status: 'CONFIRMED',
        startDate: {
          gt: today,
          lte: thirtyDaysLater
        }
      },
      include: {
        tourPackage: {
          select: {
            id: true,
            title: true,
            subtitle: true,
            coverImage: true,
            duration: true,
            agency: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      }
    });
    
    // Calculate days remaining for each trip
    const processedTrips = upcomingTrips.map(trip => {
      const startDate = new Date(trip.startDate);
      const currentDate = new Date();
      const daysLeft = Math.ceil((startDate - currentDate) / (1000 * 60 * 60 * 24));
      
      return {
        ...trip,
        daysLeft
      };
    });
    
    res.status(200).json({
      success: true,
      data: processedTrips,
      count: processedTrips.length
    });
  } catch (error) {
    console.error('Error fetching upcoming trips:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming trips',
      error: error.message
    });
  }
};

// Get recommended packages
exports.getRecommendedPackages = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's past bookings for preferences
    const userBookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        tourPackage: {
          select: {
            id: true,
            tourType: true
          }
        }
      }
    });
    
    // Extract preferred tour types
    const preferredTourTypes = userBookings
      .map(booking => booking.tourPackage.tourType)
      .reduce((acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
    
    // Get the user's most preferred tour type
    let mostPreferredType = null;
    let maxCount = 0;
    
    for (const [type, count] of Object.entries(preferredTourTypes)) {
      if (count > maxCount) {
        maxCount = count;
        mostPreferredType = type;
      }
    }
    
    // Find recommended packages
    let recommendedPackages;
    
    if (mostPreferredType) {
      // If user has preferences, recommend based on that
      recommendedPackages = await prisma.tourPackage.findMany({
        where: {
          tourType: mostPreferredType,
          status: 'ACTIVE'
        },
        include: {
          agency: {
            select: {
              id: true,
              name: true
            }
          }
        },
        take: 5
      });
    } else {
      // Otherwise, recommend popular packages
      recommendedPackages = await prisma.tourPackage.findMany({
        where: {
          status: 'ACTIVE'
        },
        include: {
          agency: {
            select: {
              id: true,
              name: true
            }
          },
          bookings: {
            select: {
              id: true
            }
          }
        },
        orderBy: {
          bookings: {
            _count: 'desc'
          }
        },
        take: 5
      });
    }
    
    // Format data
    const formattedPackages = recommendedPackages.map(pkg => ({
      id: pkg.id,
      title: pkg.title,
      subtitle: pkg.subtitle,
      price: pkg.pricePerPerson,
      duration: pkg.duration,
      tourType: pkg.tourType,
      coverImage: pkg.coverImage,
      agency: pkg.agency,
      bookingCount: pkg.bookings?.length || 0
    }));
    
    res.status(200).json({
      success: true,
      data: formattedPackages
    });
  } catch (error) {
    console.error('Error fetching recommended packages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommended packages',
      error: error.message
    });
  }
};

// Get wishlist/saved packages
exports.getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const wishlist = await prisma.wishlist.findMany({
      where: { userId },
      include: {
        tourPackage: {
          include: {
            agency: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });
    
    const formattedWishlist = wishlist.map(item => ({
      id: item.id,
      package: {
        id: item.tourPackage.id,
        title: item.tourPackage.title,
        subtitle: item.tourPackage.subtitle,
        price: item.tourPackage.pricePerPerson,
        duration: item.tourPackage.duration,
        tourType: item.tourPackage.tourType,
        coverImage: item.tourPackage.coverImage,
        agency: item.tourPackage.agency
      },
      addedAt: item.createdAt
    }));
    
    res.status(200).json({
      success: true,
      data: formattedWishlist,
      count: formattedWishlist.length
    });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wishlist',
      error: error.message
    });
  }
};

// Get valid offers and promotions
exports.getValidOffers = async (req, res) => {
  try {
    const today = new Date();
    
    const offers = await prisma.offer.findMany({
      where: {
        startDate: {
          lte: today
        },
        endDate: {
          gte: today
        },
        status: 'ACTIVE'
      },
      include: {
        tourPackage: {
          select: {
            id: true,
            title: true,
            coverImage: true
          }
        }
      }
    });
    
    res.status(200).json({
      success: true,
      data: offers
    });
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch offers',
      error: error.message
    });
  }
};

// Get customer dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    
    // Get counts for different booking statuses
    const [totalBookings, confirmedBookings, completedBookings, cancelledBookings] = await Promise.all([
      prisma.booking.count({ where: { userId } }),
      prisma.booking.count({ where: { userId, status: 'CONFIRMED' } }),
      prisma.booking.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.booking.count({ where: { userId, status: 'CANCELLED' } })
    ]);
    
    // Get ongoing trips
    const ongoingTrips = await prisma.booking.count({
      where: {
        userId,
        status: 'CONFIRMED',
        startDate: {
          lte: today
        },
        endDate: {
          gte: today
        }
      }
    });
    
    // Get upcoming trips
    const upcomingTrips = await prisma.booking.count({
      where: {
        userId,
        status: 'CONFIRMED',
        startDate: {
          gt: today
        }
      }
    });
    
    // Get wishlist count
    const savedPackages = await prisma.wishlist.count({
      where: { userId }
    });
    
    // Get open support tickets
    const openSupportTickets = await prisma.supportTicket.count({
      where: {
        userId,
        status: {
          in: ['OPEN', 'IN_PROGRESS']
        }
      }
    });
    
    const stats = {
      bookings: {
        total: totalBookings,
        confirmed: confirmedBookings,
        completed: completedBookings,
        cancelled: cancelledBookings
      },
      ongoingTrips,
      upcomingTrips,
      savedPackages,
      openSupportTickets
    };
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message
    });
  }
}; 