const mongoose = require('mongoose');

const agencyMediaSchema = new mongoose.Schema({
  agencyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agency',
    required: true
  },
  type: {
    type: String,
    enum: ['IMAGE', 'VIDEO', 'ANNOUNCEMENT'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  caption: {
    type: String,
    maxlength: 500
  },
  likes: {
    type: Number,
    default: 0
  },
  publishedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Create an index for faster queries
agencyMediaSchema.index({ agencyId: 1, createdAt: -1 });

const AgencyMedia = mongoose.model('AgencyMedia', agencyMediaSchema);

module.exports = AgencyMedia; 