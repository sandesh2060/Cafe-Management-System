// src/modules/order/order.model.js
import mongoose from 'mongoose'

const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name:       { type: String, required: true },
  price:      { type: Number, required: true },
  quantity:   { type: Number, required: true, min: 1 },
  emoji:      { type: String, default: '🍽️' },
  category:   { type: String, default: null },
  notes:      { type: String, default: null },
}, { _id: false })

const orderSchema = new mongoose.Schema({
  tableId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Table',        required: true },
  sessionId:    { type: String,                                               required: true },
  cafeId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Cafe',         required: true },
  customerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',         required: true },
  waiterId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',         default: null  },

  items:        [orderItemSchema],

  status:       {
    type:    String,
    enum:    ['pending', 'preparing', 'on_the_way', 'delivered', 'paid', 'cancelled'],
    default: 'pending',
  },

  subtotal:     { type: Number, required: true },
  discountPct:  { type: Number, default: 0 },
  discountAmt:  { type: Number, default: 0 },
  total:        { type: Number, required: true },

  loyaltyTier:   { type: String, enum: ['none', 'bronze', 'silver', 'gold'], default: 'none' },
  pointsEarned:  { type: Number, default: 0 },
  pointsUsed:    { type: Number, default: 0 },

  specialNote:    { type: String, default: null },
  paymentMethod:  { type: String, enum: ['cash', 'card', 'upi', null], default: null },

  // Timestamps for each status transition
  placedAt:      { type: Date, default: Date.now },
  preparingAt:   { type: Date, default: null },
  onTheWayAt:    { type: Date, default: null },
  deliveredAt:   { type: Date, default: null },
  paidAt:        { type: Date, default: null },
  cancelledAt:   { type: Date, default: null },
}, { timestamps: true })

orderSchema.index({ cafeId: 1, status: 1 })
orderSchema.index({ tableId: 1, status: 1 })
orderSchema.index({ customerId: 1, createdAt: -1 })
orderSchema.index({ sessionId: 1 })

const Order = mongoose.model('Order', orderSchema)
export default Order