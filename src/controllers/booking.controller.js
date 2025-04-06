const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const createBooking = async (req, res) => {
  try {
    const { tourPackageId, startDate, numberOfPeople } = req.body;

    // Get customer ID from the authenticated user
    const customer = await prisma.customer.findUnique({
      where: { userId: req.user.id },
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Get tour package to calculate total price
    const tourPackage = await prisma.tourPackage.findUnique({
      where: { id: tourPackageId },
    });

    if (!tourPackage) {
      return res.status(404).json({ message: 'Tour package not found' });
    }

    // Calculate total price
    const totalPrice = tourPackage.pricePerPerson * numberOfPeople;

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        startDate: new Date(startDate),
        numberOfPeople,
        totalPrice,
        status: 'PENDING',
        customerId: customer.id,
        tourPackageId,
      },
      include: {
        tourPackage: {
          include: {
            agency: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      message: 'Booking created successfully',
      booking,
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Error creating booking' });
  }
};

const getCustomerBookings = async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { userId: req.user.id },
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const bookings = await prisma.booking.findMany({
      where: { customerId: customer.id },
      include: {
        tourPackage: {
          include: {
            agency: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    res.json(bookings);
  } catch (error) {
    console.error('Get customer bookings error:', error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
};

const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        tourPackage: {
          include: {
            agency: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        customer: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user has permission to view this booking
    if (
      req.user.role === 'CUSTOMER' &&
      booking.customer.userId !== req.user.id
    ) {
      return res.status(403).json({
        message: 'Not authorized to view this booking',
      });
    }

    if (
      req.user.role === 'AGENCY' &&
      booking.tourPackage.agency.userId !== req.user.id
    ) {
      return res.status(403).json({
        message: 'Not authorized to view this booking',
      });
    }

    res.json(booking);
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ message: 'Error fetching booking' });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Check if booking exists
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        tourPackage: {
          include: { agency: true },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user has permission to update this booking
    if (
      req.user.role === 'AGENCY' &&
      booking.tourPackage.agency.userId !== req.user.id
    ) {
      return res.status(403).json({
        message: 'Not authorized to update this booking',
      });
    }

    // Update booking status
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status },
      include: {
        tourPackage: {
          include: {
            agency: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        customer: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    res.json({
      message: 'Booking status updated successfully',
      booking: updatedBooking,
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ message: 'Error updating booking status' });
  }
};

module.exports = {
  createBooking,
  getCustomerBookings,
  getBookingById,
  updateBookingStatus,
}; 