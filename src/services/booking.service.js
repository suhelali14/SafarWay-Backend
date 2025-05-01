const { PrismaClient } = require('@prisma/client');
const ApiError = require('../utils/ApiError');
const { sendNotification } = require('./notification.service');

const prisma = new PrismaClient();


  exports.getMyBookingsService=async (userId, params)=>{
    const { status, sort } = params;
    const where = { userId };
    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        tourPackage: {
          select: {
            id: true,
            title: true,
            duration: true,
            pricePerPerson: true,
            coverImage: true,
            tourType: true,
          },
        },
        agency: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            contactPhone: true,
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
        travelers: {
          include: {
            documents: true,
          },
        },
        payments: true,
      },
      orderBy: {
        createdAt: sort === 'asc' ? 'asc' : 'desc',
      },
    });

    return bookings;
  }

  exports.getBookingByIdService= async (bookingId, userId)=> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        tourPackage: {
          select: {
            id: true,
            title: true,
            duration: true,
            pricePerPerson: true,
            coverImage: true,
            tourType: true,
          },
        },
        agency: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            contactPhone: true,
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
        travelers: {
          include: {
            documents: true,
          },
        },
        payments: true,
      },
    });

    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ApiError(403, 'Unauthorized access to booking');
    }

    return booking;
  }

  exports.arequestCancellationService= async(bookingId, userId, reason)=> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        agency: true,
        customer: { include: { user: true } },
      },
    });

    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ApiError(403, 'Unauthorized access to booking');
    }

    if (booking.refundRequested) {
      throw new ApiError(400, 'Cancellation request already submitted');
    }

    if (!['PENDING', 'CONFIRMED', 'PENDING_APPROVAL', 'PENDING_PAYMENT'].includes(booking.status)) {
      throw new ApiError(400, 'Cancellation not allowed for this booking status');
    }

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          refundRequested: true,
          refundStatus: 'PENDING',
          status: 'CANCELLED',
        },
      });

      await tx.refundRequest.create({
        data: {
          bookingId,
          userId,
          amount: booking.paymentMode === 'PARTIAL' ? booking.platformFee : booking.totalPrice,
          reason,
          status: 'PENDING',
        },
      });
    });

    // Send notifications
    await sendNotification({
      to: booking.customer.user.email,
      subject: 'Cancellation Request Submitted',
      message: `Your cancellation request for booking ${bookingId} has been submitted. Reason: ${reason}`,
    });

    await sendNotification({
      to: booking.agency.contactEmail,
      subject: 'New Cancellation Request',
      message: `A cancellation request has been submitted for booking ${bookingId}. Reason: ${reason}`,
    });

    return { success: true, message: 'Cancellation request submitted' };
  }


