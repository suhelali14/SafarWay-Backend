const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ApiError = require('../utils/ApiError');
// --- Cashfree Integration (Backend) ---
// For making HTTP requests to Cashfree
const { Cashfree } = require('cashfree-pg');

console.log('Cashfree object:', Cashfree);
// Cashfree SDK Configuration
Cashfree.XClientId = process.env.CASHFREE_CLIENT_ID;
Cashfree.XClientSecret = process.env.CASHFREE_CLIENT_SECRET;
Cashfree.XEnvironment = 'SANDBOX'; // Direct string-based environment setting

// Environment Variables
const CASHFREE_PAYMENT_SUCCESS_URL = process.env.CASHFREE_PAYMENT_SUCCESS_URL || 'http://localhost:5173/booking/confirmation';
const CASHFREE_PAYMENT_FAILURE_URL = process.env.CASHFREE_PAYMENT_FAILURE_URL || 'http://localhost:5173/bookings/failed';

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

exports.createBooking = async (req, res, next) => {
  let booking;
  try {
    console.time('createBooking Total');
    const {
      tourPackageId,
      startDate,
      endDate,
      numberOfPeople,
      travelers,
      paymentMode,
    } = req.body;

    const userId = req.user.id;

    console.time('Customer and Tour Package Lookup');
    const [customer, tourPackage] = await prisma.$transaction([
      prisma.customer.findUnique({ where: { userId: userId } }),
      prisma.tourPackage.findUnique({ where: { id: tourPackageId } }),
    ]);
    console.timeEnd('Customer and Tour Package Lookup');

    if (!customer) {
      throw new ApiError(400, 'Customer not found for the given user ID');
    }

    if (!tourPackage) {
      throw new ApiError(404, 'Tour package not found');
    }

    if (!tourPackageId || !startDate || !numberOfPeople || !travelers || !paymentMode) {
      throw new ApiError(400, 'Missing required fields');
    }

    if (!['FULL', 'PARTIAL'].includes(paymentMode)) {
      throw new ApiError(400, 'Invalid payment mode. Must be FULL or PARTIAL');
    }

    const totalPrice = tourPackage.pricePerPerson * numberOfPeople;
    const platformFee = totalPrice * 0.03;
    const agencyPayoutAmount = totalPrice - platformFee;

    // Create booking without travelers
    console.time('Booking Creation');
    booking = await prisma.booking.create({
      data: {
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        numberOfPeople,
        totalPrice,
        platformFee,
        agencyPayoutAmount,
        paymentMode,
        paymentmMethod: paymentMode,
        status: paymentMode === 'PARTIAL' ? 'PENDING_APPROVAL' : 'PENDING_PAYMENT',
        cashfreeOrderId: '',
        transactionId: '',
        payoutStatus: 'PENDING',
        agency: { connect: { id: tourPackage.agencyId } },
        user: { connect: { id: userId } },
        customer: { connect: { id: customer.id } },
        tourPackage: { connect: { id: tourPackageId } },
        travelers: {
          create: travelers.map(traveler => ({
            fullName: traveler.fullName,
            email: traveler.email,
            phoneNumber: traveler.phoneNumber,
            dateOfBirth: new Date(traveler.dateOfBirth),
            documents: {
              create: traveler.documents.map(doc => ({
                documentType: doc.documentType,
                documentNumber: doc.documentNumber,
                fileUrl: doc.fileUrl || null
              }))
            }
          }))
        }
      
      },
    });
    console.timeEnd('Booking Creation');

    // Create travelers separately
    
    // Include travelers in response
    const bookingWithTravelers = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: { travelers: { include: { documents: true } } },
    });

    // PAYMENT INITIATION
    const initiatePaymentAmount = paymentMode === 'FULL' ? totalPrice : platformFee;
    console.time('Payment Initiation');
    const paymentResponse = await initiateFullPayment(booking.id, initiatePaymentAmount);
    console.timeEnd('Payment Initiation');

    if (paymentResponse?.paymentLink) {
      console.time('Booking Update');
      await prisma.booking.update({
        where: { id: booking.id },
        data: { cashfreeOrderId: paymentResponse.orderId },
      });
      console.timeEnd('Booking Update');

      console.timeEnd('createBooking Total');
      return res.status(201).json({
        ...bookingWithTravelers,
        paymentLink: paymentResponse.paymentLink,
        paymentSessionId: paymentResponse.paymentSessionId,
      });
    } else {
      console.error('Payment initiation failed:', paymentResponse);
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: paymentMode === 'PARTIAL' ? 'PENDING_APPROVAL' : 'PENDING',
        },
      });
      throw new ApiError(500, 'Failed to initiate payment', paymentResponse);
    }
  } catch (error) {
    console.error('Error creating booking:', error);
    if (booking?.id) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'PENDING',
        },
      });
    }
    console.timeEnd('createBooking Total');
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


// Initiate Full Payment with Cashfree SDK
async function initiateFullPayment(bookingId, amount) {
  try {
    const orderId = `order_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const orderPayload = {
      order_id: orderId,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: `customer_${bookingId}`,
        customer_name: 'Test Customer',
        customer_email: 'test@example.com',
        customer_phone: '9876543210',
      },
      order_meta: {
        return_url: `${CASHFREE_PAYMENT_SUCCESS_URL}?bookingId=${bookingId}&cashfreeOrderId=${orderId}`,
        notify_url: `${CASHFREE_PAYMENT_FAILURE_URL}?bookingId=${bookingId}&cashfreeOrderId=${orderId}`,
      },
      order_note: `Booking ID: ${bookingId}`,
    };

    console.time('Cashfree Order Creation');
    const response = await Cashfree.PGCreateOrder('2023-08-01', orderPayload);
    console.timeEnd('Cashfree Order Creation');

    const orderData = response.data;
    console.log('Cashfree order response:', JSON.stringify(orderData, null, 2));

    if (!orderData.payment_session_id) {
      console.error('Payment session ID not found in Cashfree response:', orderData);
      return { error: 'Failed to retrieve payment session ID', details: orderData };
    }

    const paymentSessionId = orderData.payment_session_id;
    const paymentLink = `https://sandbox.cashfree.com/pg/checkout?payment_session_id=${encodeURIComponent(paymentSessionId)}`;
    console.log('Generated payment link:', paymentLink);

    // Verify order status
    console.time('Verify Order Status');
    const statusResponse = await Cashfree.PGFetchOrder('2023-08-01', orderId);
    console.timeEnd('Verify Order Status');
    console.log('Order status response:', JSON.stringify(statusResponse.data, null, 2));

    if (statusResponse.data.order_status !== 'ACTIVE') {
      console.error('Order is not active:', statusResponse.data);
      return { error: 'Order is not active', details: statusResponse.data };
    }

    return { orderId, paymentLink, paymentSessionId };
  } catch (error) {
    console.error('Error initiating full payment with Cashfree:', error.response?.data || error.message);
    return { error: 'Error initiating full payment', details: error.response?.data || error.message };
  }
}
