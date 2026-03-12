// src/modules/review/review.model.js
import mongoose from 'mongoose'

// ─────────────────────────────────────────────────────────────────────────────
// Review model
//  • One review per customer per menuItem (enforced by unique compound index)
//  • Any logged-in customer can review (no order-verification gate)
//  • Rating: 1–5  |  text: required, 10–500 chars
//  • Soft-delete via `isVisible` flag (manager can hide without deleting)
// ─────────────────────────────────────────────────────────────────────────────

const reviewSchema = new mongoose.Schema(
  {
    menuItemId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'MenuItem',
      required: true,
      index:    true,
    },
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
    customerName:  { type: String, default: 'Anonymous' },
    customerAvatar:{ type: String, default: null },   // initials or emoji stored as string

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

    likes:     { type: Number, default: 0 },
    likedBy:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],   // prevent double-likes

    isVisible: { type: Boolean, default: true },    // manager hide flag
  },
  { timestamps: true }
)

// One review per customer per menu item
reviewSchema.index({ menuItemId: 1, customerId: 1 }, { unique: true })
reviewSchema.index({ menuItemId: 1, isVisible: 1, createdAt: -1 })

const Review = mongoose.model('Review', reviewSchema)
export default Review