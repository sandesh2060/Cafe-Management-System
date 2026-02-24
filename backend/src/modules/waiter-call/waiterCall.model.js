// src/modules/waiter-call/waiterCall.model.js
import mongoose from 'mongoose'

const waiterCallSchema = new mongoose.Schema({
  tableId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  sessionId:  { type: String, required: true },
  orderId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  waiterId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',  default: null },
  cafeId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Cafe',  required: true },

  reasons:    [{ type: String }],          // ['water', 'tissue', 'order_itemId']
  note:       { type: String, maxLength: 100, default: null },

  status:     {
    type:    String,
    enum:    ['pending', 'acknowledged', 'on_the_way', 'done'],
    default: 'pending',
  },

  requestedAt:    { type: Date, default: Date.now },
  acknowledgedAt: { type: Date, default: null },
  onTheWayAt:     { type: Date, default: null },
  resolvedAt:     { type: Date, default: null },
}, { timestamps: true })

waiterCallSchema.index({ cafeId: 1, status: 1 })
waiterCallSchema.index({ tableId: 1, status: 1 })
waiterCallSchema.index({ waiterId: 1, status: 1 })

const WaiterCall = mongoose.model('WaiterCall', waiterCallSchema)
export default WaiterCall