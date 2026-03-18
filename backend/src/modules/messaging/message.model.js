// backend/src/modules/messaging/message.model.js
//
// FIXES:
// ✅ Added threadId field — computed deterministically as [a,b].sort().join('_')
//    so queries by threadId are O(1) instead of O(n) aggregation
// ✅ Added readAt index for fast unread count queries
// ✅ Pre-save hook auto-sets threadId if not provided
// ✅ TTL index — messages auto-delete after 30 days

import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  cafeId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Cafe', required: true, index: true },
  threadId:   { type: String, index: true },  // [fromUserId, toUserId].sort().join('_')
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fromRole:   { type: String },
  toUserId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toRole:     { type: String },
  content:    { type: String, required: true, maxlength: 1000 },
  type:       { type: String, enum: ['text', 'image', 'system'], default: 'text' },
  orderRef:   { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  itemRef:    { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', default: null },
  readAt:     { type: Date, default: null, index: true },
}, { timestamps: true })

// Auto-compute threadId before save
messageSchema.pre('save', function (next) {
  if (!this.threadId && this.fromUserId && this.toUserId) {
    this.threadId = [this.fromUserId.toString(), this.toUserId.toString()].sort().join('_')
  }
  next()
})

// Compound index for thread queries
messageSchema.index({ threadId: 1, createdAt: -1 })
messageSchema.index({ cafeId: 1, threadId: 1 })

// TTL — auto-delete messages older than 30 days
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 })

export default mongoose.model('Message', messageSchema)