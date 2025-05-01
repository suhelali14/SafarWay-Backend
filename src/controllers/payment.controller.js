const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ApiError = require('../utils/ApiError');
const { Cashfree } = require('cashfree-pg');
const { sendConfirmationEmail } = require('../utils/EmailService');
const { sendWhatsAppConfirmation } = require('../utils/WhatsappService');
const { generateInvoicePDF } = require('../utils/genrateInvoicePdf');
const fs = require('fs');
const path = require('path');
const { getStorage, ref, getDownloadURL } = require('firebase/storage');

// Handle payment success callback
exports.handlePaymentSuccess = async (req, res, next) => {
  try {
    console.log('Request URL:', req.url);
    console.log('Request Query:', req.query);
    console.log('Request Params:', req.params);
    const { bookingId } = req.query;

    if (!bookingId) {
      console.log('No bookingId provided in query');
      throw new ApiError(400, 'Booking ID is required');
    }

    console.log('Processing bookingId:', bookingId);

    console.time('Payment Success Processing');

    // Fetch booking with related data
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        tourPackage: true,
        customer: { include: { user: true } },
        travelers: { include: { documents: true } },
        payments: true,
      },
    });

    if (!booking) {
      console.log('Booking not found for ID:', bookingId);
      throw new ApiError(404, 'Booking not found');
    }

    console.log('Booking found:', booking.id, 'Status:', booking.status);

    // Verify payment status with Cashfree
    let paymentStatus = booking.paymentStatus;
    let transactionId = booking.transactionId || '';
    let paymentDetails = null;

    if (booking.cashfreeOrderId) {
      try {
        console.time('Cashfree Payment Verification');
        const paymentResponse = await Cashfree.PGOrderFetchPayments('2023-08-01', booking.cashfreeOrderId);
        console.timeEnd('Cashfree Payment Verification');

        const payments = paymentResponse.data;
        console.log('Cashfree payment response:', JSON.stringify(payments, null, 2));

        // Find the latest successful payment
        const successfulPayment = payments.find(
          (payment) => payment.payment_status === 'SUCCESS'
        );

        if (successfulPayment) {
          paymentStatus = 'SUCCESS';
          transactionId = successfulPayment.cf_payment_id || transactionId;
          paymentDetails = successfulPayment;

          // Update booking and create payment record
          const updatedBooking = await prisma.$transaction(async (tx) => {
            // Update booking status
            const bookingUpdate = await tx.booking.update({
              where: { id: bookingId },
              data: {
                status: 'CONFIRMED',
                paymentStatus: 'SUCCESS',
                transactionId,
                agencyApproval: booking.paymentMode === 'FULL' ? true : booking.agencyApproval,
                partialAmountPaid: booking.paymentMode === 'PARTIAL' ? true : false,
              },
              include: {
                tourPackage: true,
                customer: { include: { user: true } },
                travelers: true,
              },
            });

            // Create payment record
            await tx.payment.create({
              data: {
                bookingId,
                amount: booking.paymentMode === 'FULL' ? booking.totalPrice : booking.platformFee,
                status: 'SUCCESS',
                paymentType: booking.paymentMode,
              },
            });

            return bookingUpdate;
          });

          // Generate PDF invoice
          let pdfPath;
          try {
            pdfPath = await generateInvoicePDF(updatedBooking);
            console.log('PDF generated at:', pdfPath);
          } catch (pdfError) {
            console.error('Failed to generate PDF:', pdfError);
            // Continue without PDF
          }

          // Send email notification
          try {
            await sendConfirmationEmail({
              to: booking.customer.user.email,
              booking: updatedBooking,
              paymentDetails,
              pdfPath: pdfPath || null,
            });

            console.log('Email sent to:', booking.customer.user.email);
          } catch (emailError) {
            console.error('Failed to send email:', emailError);
            // Continue despite email failure
          }

          // Send WhatsApp notification
          try {
            await sendWhatsAppConfirmation({
              to: booking.customer.user.phone || booking.travelers[0]?.phoneNumber,
              booking: updatedBooking,
              paymentDetails,
            });
            console.log('WhatsApp sent to:', booking.customer.user.phone || booking.travelers[0]?.phoneNumber);
          } catch (whatsappError) {
            console.error('Failed to send WhatsApp message:', whatsappError);
            // Continue despite WhatsApp failure
          }
        } else {
          paymentStatus = payments[0]?.payment_status || 'PENDING';
        }
      } catch (error) {
        console.error('Error verifying payment with Cashfree:', error.response?.data || error.message);
        paymentStatus = 'PENDING';
      }
    }

    console.timeEnd('Payment Success Processing');

    // Return booking and payment details
    res.status(200).json({
      success: true,
      data: {
        id: booking.id,
        tourPackage: {
          title: booking.tourPackage.title,
          duration: booking.tourPackage.duration,
          pricePerPerson: booking.tourPackage.pricePerPerson,
          coverImage: booking.tourPackage.coverImage,
        },
        numberOfPeople: booking.numberOfPeople,
        totalPrice: booking.totalPrice,
        platformFee: booking.platformFee,
        paymentMode: booking.paymentMode,
        status: booking.status,
        paymentStatus,
        cashfreeOrderId: booking.cashfreeOrderId,
        transactionId,
        customer: {
          user: {
            name: booking.customer.user.name,
            email: booking.customer.user.email,
            phone: booking.customer.user.phone,
          },
        },
        travelers: booking.travelers,
        specialRequests: booking.specialRequests,
      },
    });
  } catch (error) {
    console.error('Error handling payment success:', error);
    next(error);
  }
};

// Handle Cashfree webhook notifications
exports.handleWebhook = async (req, res, next) => {
  try {
    const webhookData = req.body;
    console.log('Cashfree webhook received:', JSON.stringify(webhookData, null, 2));

    // Verify webhook signature (using Cashfree's recommended method)
    const signature = req.headers['x-webhook-signature'];
    const secret = process.env.CASHFREE_WEBHOOK_SECRET;

    if (!signature || !secret) {
      throw new ApiError(400, 'Webhook signature or secret missing');
    }

    // TODO: Implement signature verification
    // const isValid = verifyWebhookSignature(webhookData, signature, secret);
    // if (!isValid) {
    //   throw new ApiError(401, 'Invalid webhook signature');
    // }

    const event = webhookData.event;
    const orderId = webhookData.data?.order?.order_id;
    const paymentStatus = webhookData.data?.payment?.payment_status;
    const transactionId = webhookData.data?.payment?.cf_payment_id;

    if (!orderId) {
      throw new ApiError(400, 'Order ID missing in webhook data');
    }

    // Find booking by cashfreeOrderId
    const booking = await prisma.booking.findFirst({
      where: { cashfreeOrderId: orderId },
      include: {
        tourPackage: true,
        customer: { include: { user: true } },
        travelers: true,
      },
    });

    if (!booking) {
      throw new ApiError(404, 'Booking not found for order ID');
    }

    // Update booking and payment based on event
    if (event === 'PAYMENT_SUCCESS' && paymentStatus === 'SUCCESS') {
      await prisma.$transaction(async (tx) => {
        // Update booking
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: 'CONFIRMED',
            paymentStatus: 'SUCCESS',
            transactionId: transactionId || booking.transactionId,
            agencyApproval: booking.paymentMode === 'FULL' ? true : booking.agencyApproval,
            partialAmountPaid: booking.paymentMode === 'PARTIAL' ? true : false,
          },
        });

        // Create payment record
        await tx.payment.create({
          data: {
            bookingId: booking.id,
            amount: booking.paymentMode === 'FULL' ? booking.totalPrice : booking.platformFee,
            status: 'SUCCESS',
            paymentType: booking.paymentMode,
          },
        });
      });

      // Generate PDF invoice
      let pdfPath;
      try {
        pdfPath = await generateInvoicePDF(booking);
        console.log('PDF generated at:', pdfPath);
      } catch (pdfError) {
        console.error('Failed to generate PDF:', pdfError);
        // Continue without PDF
      }

      // Send notifications
      try {
        await sendConfirmationEmail({
          to: booking.customer.user.email,
          booking,
          paymentDetails: webhookData.data.payment,
          pdfPath: pdfPath || null,
        });
        console.log('Email sent to:', booking.customer.user.email);
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        // Continue despite email failure
      }

      try {
        await sendWhatsAppConfirmation({
          to: booking.customer.user.phone || booking.travelers[0]?.phoneNumber,
          booking,
          paymentDetails: webhookData.data.payment,
        });
        console.log('WhatsApp sent to:', booking.customer.user.phone || booking.travelers[0]?.phoneNumber);
      } catch (whatsappError) {
        console.error('Failed to send WhatsApp message:', whatsappError);
        // Continue despite WhatsApp failure
      }
    } else if (event === 'PAYMENT_FAILED' || paymentStatus === 'FAILED') {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'PENDING',
          paymentStatus: 'PENDING',
        },
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    next(error);
  }
};

exports.downloadInvoice = async (req, res, next) => {
    try {
      
        const { bookingId } = req.query;
      if (!bookingId) {
        throw new ApiError(400, 'Booking ID is required');
      }
  
      // Fetch booking to verify existence
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          tourPackage: true,
          customer: { include: { user: true } },
          travelers: { include: { documents: true } },
        },
      });
  
      if (!booking) {
        throw new ApiError(404, 'Booking not found');
      }
  
      // Initialize Firebase Storage
      const storage = getStorage();
      const fileName = `invoice_${bookingId}.pdf`;
      const storageRef = ref(storage, `invoices/${fileName}`);
      console.log('Firebase Storage Reference:', storageRef.fullPath);
      try {
        // Attempt to get the download URL
        const downloadURL = await getDownloadURL(storageRef);
        console.log('PDF found in Firebase:', downloadURL);
  
        // Fetch the PDF as a stream
       
        res.status(200).json({
            success: true,
            message: 'Download successfully',
            data: {
                url: downloadURL,
            },
          });
      } catch (error) {
        console.warn(`PDF not found in Firebase or fetch failed: ${error.message}`);
  
        // Fallback: Generate a new PDF
        let pdfPath;
        try {
          pdfPath = await generateInvoicePDF(booking);
          console.log('New PDF generated at:', pdfPath);
        } catch (pdfError) {
          throw new ApiError(500, `Failed to generate PDF: ${pdfError.message}`);
        }
  
        // Verify local PDF exists
        const fs = require('fs');
        if (!fs.existsSync(pdfPath)) {
          throw new ApiError(500, 'Generated PDF file not found');
        }
  
        // Send local PDF
        res.set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=invoice_${bookingId}.pdf`,
        });
        fs.createReadStream(pdfPath).pipe(res);
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      next(error);
    }
  };

// Payment route handlers
exports.createPaymentIntent = async (req, res, next) => {
  try {
    // Implement actual payment intent creation (e.g., with Cashfree)
    res.status(200).json({
      success: true,
      message: 'Payment intent created successfully',
      data: {
        clientSecret: 'mock_client_secret_' + Date.now(),
        amount: req.body.amount,
        currency: 'INR',
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    // Implement actual payment verification
    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        status: 'COMPLETED',
        transactionId: 'mock_transaction_' + Date.now(),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getPaymentHistory = async (req, res, next) => {
  try {
    // Implement actual payment history retrieval
    res.status(200).json({
      success: true,
      data: [
        {
          id: 'payment_1',
          amount: 250,
          currency: 'INR',
          status: 'COMPLETED',
          createdAt: new Date().toISOString(),
          bookingId: 'booking_1',
        },
      ],
    });
  } catch (error) {
    next(error);
  }
};

exports.getAdminTransactions = async (req, res, next) => {
  try {
    // Implement actual admin transactions retrieval
    res.status(200).json({
      success: true,
      data: {
        transactions: [],
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getAgencyTransactions = async (req, res, next) => {
  try {
    // Implement actual agency transactions retrieval
    res.status(200).json({
      success: true,
      data: {
        transactions: [],
      },
    });
  } catch (error) {
    next(error);
  }
};

// Handle payment and booking failure callback
exports.handlePaymentBookingFailure = async (req, res, next) => {
    try {
      console.log('Request URL:', req.url);
      console.log('Request Query:', req.query);
      console.log('Request Params:', req.params);
      const { bookingId } = req.query;
  
      if (!bookingId) {
        console.log('No bookingId provided in query');
        throw new ApiError(400, 'Booking ID is required');
      }
  
      console.log('Processing payment/booking failure for bookingId:', bookingId);
  
      console.time('Payment Booking Failure Processing');
  
      // Fetch booking with related data
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          tourPackage: true,
          customer: { include: { user: true } },
          travelers: { include: { documents: true } },
          payments: true,
        },
      });
  
      let errorMessage = 'Payment or booking failed. Please try again or contact support.';
      let paymentStatus = 'FAILED';
      let transactionId = '';
      let paymentDetails = null;
  
      if (!booking) {
        console.log('Booking not found for ID:', bookingId);
        errorMessage = 'Booking not found or invalid.';
        return res.status(404).json({
          success: false,
          message: errorMessage,
          data: null,
        });
      }
  
      console.log('Booking found:', booking.id, 'Status:', booking.status);
  
      // Verify payment status with Cashfree if cashfreeOrderId exists
      if (booking.cashfreeOrderId) {
        try {
          console.time('Cashfree Payment Verification');
          const paymentResponse = await Cashfree.PGOrderFetchPayments('2023-08-01', booking.cashfreeOrderId);
          console.timeEnd('Cashfree Payment Verification');
  
          const payments = paymentResponse.data;
          console.log('Cashfree payment response:', JSON.stringify(payments, null, 2));
  
          // Find the latest failed payment
          const failedPayment = payments.find(
            (payment) => payment.payment_status === 'FAILED' || payment.payment_status === 'USER_DROPPED'
          );
  
          if (failedPayment) {
            paymentStatus = failedPayment.payment_status;
            transactionId = failedPayment.cf_payment_id || transactionId;
            paymentDetails = failedPayment;
            errorMessage = failedPayment.error_details?.error_description || errorMessage;
          } else {
            paymentStatus = payments[0]?.payment_status || 'FAILED';
          }
        } catch (error) {
          console.error('Error verifying payment with Cashfree:', error.response?.data || error.message);
          errorMessage = error.response?.data?.message || 'Failed to verify payment status.';
          paymentStatus = 'FAILED';
        }
      }
  
      // Update booking status to FAILED
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'FAILED',
          paymentStatus: paymentStatus,
          transactionId: transactionId || booking.transactionId,
        },
      });
  
      console.timeEnd('Payment Booking Failure Processing');
  
      // Return booking and failure details
      res.status(200).json({
        success: false,
        message: errorMessage,
        data: {
          id: booking.id,
          tourPackage: {
            title: booking.tourPackage.title,
            duration: booking.tourPackage.duration,
            pricePerPerson: booking.tourPackage.pricePerPerson,
            coverImage: booking.tourPackage.coverImage,
          },
          numberOfPeople: booking.numberOfPeople,
          totalPrice: booking.totalPrice,
          platformFee: booking.platformFee,
          paymentMode: booking.paymentMode,
          status: 'FAILED',
          paymentStatus,
          cashfreeOrderId: booking.cashfreeOrderId,
          transactionId,
          customer: {
            user: {
              name: booking.customer.user.name,
              email: booking.customer.user.email,
              phone: booking.customer.user.phone,
            },
          },
          travelers: booking.travelers,
          specialRequests: booking.specialRequests,
        },
      });
    } catch (error) {
      console.error('Error handling payment/booking failure:', error);
      next(error);
    }
  };
  