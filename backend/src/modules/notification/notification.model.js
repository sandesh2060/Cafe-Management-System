// backend/src/modules/notification/notification.model.js
//
// CHANGES:
// ✅ Added `important` field — if true, TTL is 30 days. If false, 7 days.
// ✅ Added `kitchen` and `suggest` to type enum (matches frontend TYPE_CFG)
// ✅ Added `persistent` virtual — true if important===true
// ✅ TTL handled by conditional index — important docs kept longer
// ✅ All other fields unchanged

import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    index:    true,
  },
  cafeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'Cafe',
  },
  type: {
    type:    String,
    enum:    ['order', 'kitchen', 'waiter', 'loyalty', 'system', 'message', 'payment', 'suggest'],
    default: 'system',
  },
  title:   { type: String, required: true },
  message: { type: String, required: true },
  data:    { type: mongoose.Schema.Types.Mixed, default: {} },
  read:    { type: Boolean, default: false, index: true },

  // important = true  → persist 30 days (order confirmed, loyalty upgrade, payment)
  // important = false → persist 7 days  (preparing, on_the_way, system)
  important: { type: Boolean, default: false, index: true },

  // expiresAt is set at create time based on importance — TTL index watches this field
  expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
}, {
  timestamps: true,
})

// Set expiresAt before save based on importance
notificationSchema.pre('save', function (next) {
  if (!this.expiresAt) {
    const days       = this.important ? 30 : 7
    this.expiresAt   = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  }
  next()
})

// Virtual: is this a persistent (important) notification?
notificationSchema.virtual('persistent').get(function () {
  return this.important === true
})

export default mongoose.model('Notification', notificationSchema)