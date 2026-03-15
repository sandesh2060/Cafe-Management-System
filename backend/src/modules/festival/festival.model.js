// backend/src/modules/festival/festival.model.js
//
// Admin stores each festival once per year with its exact AD date.
// No BS date ranges, no hardcoding, no drift.
// Image can be a Cloudinary URL or any CDN URL.

import mongoose from 'mongoose'

const festivalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Exact AD date for this year's occurrence — admin sets this once per year
    date: {
      type: Date,
      required: true,
      index: true,
    },

    // Optional: festival lasts multiple days (default 1)
    durationDays: {
      type: Number,
      default: 1,
      min: 1,
      max: 30,
    },

    emoji:   { type: String, default: '🎊' },
    title:   { type: String, required: true },
    message: { type: String, required: true },

    // Cloudinary or CDN image URL — shown in toast left overflow area
    // Recommended: 120×120 PNG with transparent background
    imageUrl: {
      type: String,
      default: null,
    },

    // Toast accent color (hex) — defaults to festival pink
    color: {
      type: String,
      default: '#F472B6',
    },

    // Sound key to play on this festival toast
    soundKey: {
      type: String,
      default: 'loyalty',
      enum: ['loyalty', 'order', 'payment', 'system', 'tierUpgraded'],
    },

    // Vibration pattern override (optional)
    vibrate: {
      type: [Number],
      default: [50, 30, 50, 30, 80],
    },

    // Year this record applies to (auto-set, used for dedup/lookup)
    year: {
      type: Number,
      required: true,
      index: true,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

// Compound index: one festival name per year
festivalSchema.index({ name: 1, year: 1 }, { unique: true })

// Index for fast "today's festivals" query
festivalSchema.index({ date: 1, active: 1 })

const Festival = mongoose.model('Festival', festivalSchema)
export default Festival