// src/modules/billing/billing.routes.js
import { Router }   from 'express'
import Order        from '../order/order.model.js'
import Loyalty      from '../loyalty/loyalty.model.js'
import { authenticate, authorize }   from '../auth/auth.middleware.js'
import { catchAsync }                from '../../shared/middleware/errorHandler.js'
import AppError                      from '../../shared/utils/AppError.js'
import { getIO }                     from '../../websockets/index.js'

const router = Router()

// GET /api/billing/pending?cafeId=xxx  — orders ready for payment
router.get('/pending', authenticate, authorize('cashier', 'manager', 'admin'), catchAsync(async (req, res) => {
  const cafeId = req.query.cafeId || req.user.cafeId
  const orders = await Order.find({ cafeId, status: 'delivered' })
    .sort({ deliveredAt: 1 })
    .lean()
  res.json({ success: true, orders })
}))

// POST /api/billing/:orderId/confirm  — cashier confirms payment
router.post('/:orderId/confirm', authenticate, authorize('cashier', 'manager'), catchAsync(async (req, res) => {
  const { paymentMethod = 'cash' } = req.body
  const order = await Order.findById(req.params.orderId)
  if (!order) throw new AppError('Order not found', 404)
  if (order.status !== 'delivered') throw new AppError('Order not yet delivered', 400)

  order.status        = 'paid'
  order.paidAt        = new Date()
  order.paymentMethod = paymentMethod
  await order.save()

  // Add loyalty points
  let tierUpgraded = false
  let newTier      = null
  if (order.customerId && !order.customerId.toString().startsWith('guest')) {
    const loyalty = await Loyalty.findOne({ userId: order.customerId })
    if (loyalty && order.pointsEarned > 0) {
      const oldTier = loyalty.tier
      await loyalty.addPoints(order.pointsEarned)
      tierUpgraded  = loyalty.tier !== oldTier
      newTier       = loyalty.tier
    }
  }

  // Emit payment confirmed to customer
  const io = getIO()
  io.to(`user:${order.customerId}`).emit('order:payment_confirmed', {
    orderId:      order._id,
    pointsEarned: order.pointsEarned,
    tierUpgraded,
    newTier,
    totalAmount:  order.total,
  })

  res.json({ success: true, order, pointsEarned: order.pointsEarned, tierUpgraded, newTier })
}))

// POST /api/billing/split  — split bill between items/seats (stub)
router.post('/split', authenticate, authorize('cashier', 'manager'), catchAsync(async (req, res) => {
  const { orderId, splits } = req.body
  // splits: [{ itemIds: [...], amount: 150, paymentMethod: 'cash' }]
  const order = await Order.findById(orderId)
  if (!order) throw new AppError('Order not found', 404)

  // In production, create SplitBill records; for now return calculation
  const splitAmounts = splits.map((s) => ({
    ...s,
    confirmed: false,
  }))
  res.json({ success: true, splits: splitAmounts, totalAmount: order.total })
}))

// GET /api/billing/transactions?cafeId=xxx&date=2025-01-01
router.get('/transactions', authenticate, authorize('cashier', 'manager', 'admin'), catchAsync(async (req, res) => {
  const cafeId = req.query.cafeId || req.user.cafeId
  const date   = req.query.date ? new Date(req.query.date) : new Date()
  const start  = new Date(date.setHours(0, 0, 0, 0))
  const end    = new Date(date.setHours(23, 59, 59, 999))

  const orders = await Order.find({
    cafeId,
    status:  'paid',
    paidAt:  { $gte: start, $lte: end },
  }).sort({ paidAt: -1 }).lean()

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0)
  const totalOrders  = orders.length

  res.json({ success: true, orders, totalRevenue, totalOrders })
}))

export default router