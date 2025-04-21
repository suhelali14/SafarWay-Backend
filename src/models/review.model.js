const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  agencyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agency',
    required: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    maxlength: 1000
  },
  isVerifiedBooking: {
    type: Boolean,
    default: false
  },
  agencyResponse: {
    response: {
      type: String,
      maxlength: 1000
    },
    respondedAt: {
      type: Date
    }
  }
}, { timestamps: true });

// Create indexes for faster queries
reviewSchema.index({ agencyId: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, agencyId: 1 });
reviewSchema.index({ bookingId: 1 }, { unique: true, sparse: true });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review; 