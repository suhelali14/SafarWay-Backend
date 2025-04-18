const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ApiError = require('../utils/ApiError');

// Get all bookings (Admin/Agency only)
exports.getAllBookings = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) {
      where.status = status;
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          tourPackage: true,
          customer: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get booking by ID
exports.getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        tourPackage: true,
        customer: true,
      },
    });

    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }

    // Check if user has permission to view this booking
    if (
      req.user.role !== 'SAFARWAY_ADMIN' &&
      req.user.role !== 'AGENCY_ADMIN' &&
      booking.customerId !== req.user.id
    ) {
      throw new ApiError(403, 'Not authorized to view this booking');
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// Create new booking
exports.createBooking = async (req, res, next) => {
  try {
    const {
      tourPackageId,
      startDate,
      numberOfPeople,
      specialRequests,
      contactInfo,
    } = req.body;

    // Check if tour package exists
    const tourPackage = await prisma.tourPackage.findUnique({
      where: { id: tourPackageId },
    });

    if (!tourPackage) {
      throw new ApiError(404, 'Tour package not found');
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        tourPackageId,
        customerId: req.user.id,
        startDate: new Date(startDate),
        numberOfPeople,
        specialRequests,
        contactInfo,
        status: 'PENDING',
        totalAmount: tourPackage.price * numberOfPeople,
      },
      include: {
        tourPackage: true,
      },
    });

    res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// Update booking status
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        tourPackage: true,
      },
    });

    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }

    // Check if user has permission to update this booking
    if (
      req.user.role !== 'SAFARWAY_ADMIN' &&
      (req.user.role !== 'AGENCY_ADMIN' ||
        booking.tourPackage.agencyId !== req.user.agencyId)
    ) {
      throw new ApiError(403, 'Not authorized to update this booking');
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status },
      include: {
        tourPackage: true,
        customer: true,
      },
    });

    res.json({
      success: true,
      data: updatedBooking,
    });
  } catch (error) {
    next(error);
  }
};

// Get customer's bookings
exports.getMyBookings = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      customerId: req.user.id,
    };
    if (status) {
      where.status = status;
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          tourPackage: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Cancel booking
exports.cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }

    if (booking.customerId !== req.user.id) {
      throw new ApiError(403, 'Not authorized to cancel this booking');
    }

    if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
      throw new ApiError(400, 'Booking cannot be cancelled');
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        tourPackage: true,
      },
    });

    res.json({
      success: true,
      data: updatedBooking,
    });
  } catch (error) {
    next(error);
  }
};

// Get agency bookings
exports.getAgencyBookings = async (req, res, next) => {
  try {
    const { agencyId } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    // Check if user has permission to view agency bookings
    if (
      req.user.role !== 'SAFARWAY_ADMIN' &&
      (req.user.role !== 'AGENCY_ADMIN' || req.user.agencyId !== agencyId)
    ) {
      throw new ApiError(403, 'Not authorized to view agency bookings');
    }

    const where = {
      tourPackage: {
        agencyId,
      },
    };
    if (status) {
      where.status = status;
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          tourPackage: true,
          customer: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}; 