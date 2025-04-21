const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
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
  subscribedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create a compound index to ensure a user can only subscribe to an agency once
subscriptionSchema.index({ userId: 1, agencyId: 1 }, { unique: true });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription; 