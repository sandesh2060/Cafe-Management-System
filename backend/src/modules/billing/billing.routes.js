// backend/src/modules/billing/billing.routes.js
//
// Endpoints:
//   GET  /api/billing/pending       → orders with status 'delivered' (awaiting payment)
//   GET  /api/billing/transactions  → today's paid orders + summary totals
//   POST /api/billing/:id/confirm   → mark order as 'paid' + record paymentMethod

import { Router }  from 'express'
import Order       from '../order/order.model.js'
import catchAsync  from '../../shared/utils/catchAsync.js'
import AppError    from '../../shared/utils/AppError.js'
import requireRole from '../../shared/middleware/requireRole.js'

const router = Router()

// All billing routes require cashier or manager role
router.use(requireRole('cashier', 'manager'))

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/billing/pending
// Returns all orders with status 'delivered' for this cafe.
// These are orders that reached the table and are awaiting payment.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/pending', catchAsync(async (req, res) => {
  const cafeId = req.user?.cafeId
  if (!cafeId) throw new AppError('cafeId not found on user', 400)

  const orders = await Order.find({
    cafeId,
    status: 'delivered',
  })
    .sort({ deliveredAt: 1 })  // oldest first — serve in arrival order
    .lean()

  res.json({ success: true, orders })
}))

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/billing/transactions
// Returns today's paid orders for this cafe, plus summary totals.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/transactions', catchAsync(async (req, res) => {
  const cafeId = req.user?.cafeId
  if (!cafeId) throw new AppError('cafeId not found on user', 400)

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const orders = await Order.find({
    cafeId,
    status: 'paid',
    paidAt: { $gte: startOfDay },
  })
    .sort({ paidAt: -1 })  // newest first
    .lean()

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0)

  res.json({
    success:     true,
    orders,
    totalRevenue,
    totalOrders: orders.length,
  })
}))

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/billing/:id/confirm
// Body: { paymentMethod: 'cash' | 'card' | 'upi' }
// Marks order as 'paid', records paymentMethod and paidAt timestamp.
// Emits order:status_update so KDS / waiter dashboards update live.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/confirm', catchAsync(async (req, res, next) => {
  const { paymentMethod = 'cash' } = req.body
  const VALID_METHODS = ['cash', 'card', 'upi']

  if (!VALID_METHODS.includes(paymentMethod))
    return next(new AppError(`Invalid payment method "${paymentMethod}"`, 400))

  const order = await Order.findOne({
    _id:    req.params.id,
    cafeId: req.user.cafeId,
    status: 'delivered',
  })

  if (!order)
    return next(new AppError('Order not found or not in delivered status', 404))

  order.status        = 'paid'
  order.paymentMethod = paymentMethod
  order.paidAt        = new Date()
  await order.save()

  const io = req.app.get('io')
  if (io) {
    const plain = order.toObject()
    io.to(`cafe:${order.cafeId}`).emit('order:status_update', {
      orderId: plain._id,
      cafeId:  plain.cafeId,
      status:  'paid',
      order:   plain,
    })
  }

  res.json({ success: true, order: order.toObject() })
}))

export default router