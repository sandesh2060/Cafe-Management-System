// src/modules/review/review.model.js
import mongoose from 'mongoose'

/**
 * Review — CAFE-LEVEL reviews (not per menu item)
 *  • One review per customer (enforced by unique index on customerId)
 *  • Rating 1-5, text required (10-500 chars)
 *  • Optional photo upload via Cloudinary
 *  • Soft-delete via `isVisible` (manager can hide)
 */
const reviewSchema = new mongoose.Schema(
  {
    cafeId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Cafe',
      required: true,
      index:    true,
    },
    customerId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    customerName:   { type: String, default: 'Anonymous' },
    customerAvatar: { type: String, default: null },

    rating: {
      type:     Number,
      required: true,
      min:      1,
      max:      5,
    },
    text: {
      type:      String,
      required:  true,
      trim:      true,
      minlength: 10,
      maxlength: 500,
    },

    // Optional customer photo (Cloudinary)
    photoUrl:  { type: String, default: null },
    publicId:  { type: String, default: null },  // Cloudinary public_id for deletion

    likes:   { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    isVisible:   { type: Boolean, default: true },
    managerReply: {
      text:      { type: String, default: '' },
      repliedAt: { type: Date,   default: null },
    },
  },
  { timestamps: true }
)

// One review per customer (cafe-level)
reviewSchema.index({ cafeId: 1, customerId: 1 }, { unique: true })
reviewSchema.index({ cafeId: 1, isVisible: 1, createdAt: -1 })
reviewSchema.index({ rating: 1 })

export default mongoose.model('Review', reviewSchema)