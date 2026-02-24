// src/modules/messaging/message.model.js
import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  cafeId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Cafe', required: true },
  fromUserId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fromRole:    { type: String, enum: ['waiter', 'kitchen', 'manager', 'cashier'], required: true },
  toUserId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toRole:      { type: String, enum: ['waiter', 'kitchen', 'manager', 'cashier'], required: true },
  content:     { type: String, required: true, maxLength: 1000 },
  orderRef:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order',    default: null },
  itemRef:     { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', default: null },
  type:        { type: String, enum: ['text', 'quick_reply', 'system'], default: 'text' },
  readAt:      { type: Date, default: null },
}, { timestamps: true })

messageSchema.index({ fromUserId: 1, toUserId: 1, createdAt: -1 })
messageSchema.index({ cafeId: 1, createdAt: -1 })
messageSchema.index({ readAt: 1, toUserId: 1 })

const Message = mongoose.model('Message', messageSchema)
export default Message