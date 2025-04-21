const mongoose = require('mongoose');

const mediaLikeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mediaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgencyMedia',
    required: true
  },
  likedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create a compound index to ensure a user can only like a media item once
mediaLikeSchema.index({ userId: 1, mediaId: 1 }, { unique: true });

const MediaLike = mongoose.model('MediaLike', mediaLikeSchema);

module.exports = MediaLike; 