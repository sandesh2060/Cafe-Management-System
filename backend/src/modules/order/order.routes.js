// src/modules/order/order.routes.js
import express        from 'express'
import { authenticate, authorize } from '../auth/auth.middleware.js'
import { catchAsync } from '../../shared/middleware/errorHandler.js'
import Order          from './order.model.js'
import Loyalty        from '../loyalty/loyalty.model.js'
import { emitToRole, emitToUser } from '../../websockets/index.js'

const router = express.Router()
router.use(authenticate)

// Place order
router.post('/', authorize('customer'), catchAsync(async (req, res) => {
  const { items, tableId, sessionId, specialNote } = req.body

  // Calculate totals
  const subtotal    = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const loyalty     = await Loyalty.findOne({ userId: req.user._id })
  const discountPct = loyalty?.discountPct || 0
  const discountAmt = Math.round(subtotal * discountPct / 100)
  const total       = subtotal - discountAmt
  const pointsEarned = Math.floor(total / 10)   // 1 point per ₹10

  const order = await Order.create({
    tableId, sessionId,
    cafeId:       req.user.cafeId || req.body.cafeId,
    customerId:   req.user._id,
    items,
    subtotal, discountPct, discountAmt, total,
    loyaltyTier:  loyalty?.tier || 'none',
    pointsEarned,
    specialNote:  specialNote || null,
    status:       'pending',
  })

  // Notify kitchen + waiter via socket
  emitToRole('kitchen', order.cafeId.toString(), 'order:new', {
    order,
    notification: {
      type: 'newOrder', title: '🔔 New Order!',
      message: `Table — ${items.length} items`,
      soundKey: 'newOrderBell',
    },
  })
  emitToRole('waiter', order.cafeId.toString(), 'order:new', {
    order,
    notification: {
      type: 'newOrder', title: '📋 New Order',
      message: `New order from table`,
      soundKey: 'newOrder',
    },
  })

  res.status(201).json({ success: true, order })
}))

// Get active order for customer
router.get('/active', authorize('customer'), catchAsync(async (req, res) => {
  const order = await Order.findOne({
    customerId: req.user._id,
    status:     { $in: ['pending', 'preparing', 'on_the_way', 'delivered'] },
  }).sort({ createdAt: -1 }).lean()
  res.json({ success: true, order: order || null })
}))

// KDS — kitchen display
router.get('/kds', authorize('kitchen', 'manager'), catchAsync(async (req, res) => {
  const orders = await Order.find({
    cafeId: req.user.cafeId,
    status: { $in: ['pending', 'preparing'] },
  }).sort({ placedAt: 1 }).lean()
  res.json({ success: true, orders })
}))

// Waiter queue
router.get('/waiter', authorize('waiter', 'manager'), catchAsync(async (req, res) => {
  const orders = await Order.find({
    cafeId: req.user.cafeId,
    status: { $in: ['pending', 'preparing', 'on_the_way'] },
  }).sort({ placedAt: 1 }).lean()
  res.json({ success: true, orders })
}))

// Update order status
router.patch('/:id/status', authorize('kitchen', 'waiter', 'manager', 'cashier'), catchAsync(async (req, res) => {
  const { status } = req.body
  const valid = ['preparing', 'on_the_way', 'delivered', 'cancelled', 'paid']
  if (!valid.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' })
  }

  const update = { status }
  const now    = new Date()
  if (status === 'preparing')  update.preparingAt  = now
  if (status === 'on_the_way') update.onTheWayAt   = now
  if (status === 'delivered')  update.deliveredAt  = now
  if (status === 'cancelled')  update.cancelledAt  = now
  if (status === 'paid')       update.paidAt       = now

  const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true }).lean()
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' })

  // Notify customer
  emitToUser(order.customerId.toString(), `order:${status}`, { orderId: order._id, status })

  res.json({ success: true, order })
}))

// Customer order history
router.get('/history', authorize('customer'), catchAsync(async (req, res) => {
  const orders = await Order.find({ customerId: req.user._id, status: 'paid' })
    .sort({ createdAt: -1 }).limit(20).lean()
  res.json({ success: true, orders })
}))

export default router