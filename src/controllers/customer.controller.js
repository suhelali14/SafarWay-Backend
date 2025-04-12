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