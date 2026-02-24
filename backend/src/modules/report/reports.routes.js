// src/modules/reports/reports.routes.js
import { Router }     from 'express'
import Order          from '../order/order.model.js'
import WaiterCall     from '../waiter-call/waiterCall.model.js'
import User           from '../user/user.model.js'
import { authenticate, authorize } from '../auth/auth.middleware.js'
import { catchAsync } from '../../shared/middleware/errorHandler.js'

const router = Router()

// Shared helper
const dateRange = (days) => {
  const end   = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

// GET /api/reports/sales?cafeId=xxx&days=7
router.get('/sales', authenticate, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  const cafeId = req.query.cafeId || req.user.cafeId
  const days   = parseInt(req.query.days) || 7
  const { start, end } = dateRange(days)

  const orders = await Order.find({ cafeId, status: 'paid', paidAt: { $gte: start, $lte: end } }).lean()

  // Group by day
  const byDay = {}
  orders.forEach((o) => {
    const day = o.paidAt.toISOString().split('T')[0]
    if (!byDay[day]) byDay[day] = { date: day, revenue: 0, orders: 0, avgOrder: 0 }
    byDay[day].revenue += o.total
    byDay[day].orders  += 1
  })
  Object.values(byDay).forEach((d) => { d.avgOrder = d.orders ? Math.round(d.revenue / d.orders) : 0 })

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0)
  const totalOrders  = orders.length

  // Category breakdown
  const categoryMap = {}
  orders.forEach((o) => o.items.forEach((i) => {
    categoryMap[i.category] = (categoryMap[i.category] || 0) + (i.price * i.quantity)
  }))

  res.json({
    success: true,
    summary: { totalRevenue, totalOrders, avgOrder: totalOrders ? Math.round(totalRevenue / totalOrders) : 0 },
    byDay:   Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
    byCategory: Object.entries(categoryMap).map(([cat, rev]) => ({ category: cat, revenue: rev }))
      .sort((a, b) => b.revenue - a.revenue),
  })
}))

// GET /api/reports/daily?cafeId=xxx&date=2025-01-01
router.get('/daily', authenticate, authorize('manager', 'admin', 'cashier'), catchAsync(async (req, res) => {
  const cafeId = req.query.cafeId || req.user.cafeId
  const date   = req.query.date ? new Date(req.query.date) : new Date()
  const start  = new Date(date); start.setHours(0, 0, 0, 0)
  const end    = new Date(date); end.setHours(23, 59, 59, 999)

  const [orders, calls] = await Promise.all([
    Order.find({ cafeId, paidAt: { $gte: start, $lte: end }, status: 'paid' }).lean(),
    WaiterCall.find({ cafeId, requestedAt: { $gte: start, $lte: end } }).lean(),
  ])

  const revenue    = orders.reduce((s, o) => s + o.total, 0)
  const avgResTime = calls.length
    ? Math.round(calls.filter((c) => c.acknowledgedAt).reduce((s, c) =>
        s + (new Date(c.acknowledgedAt) - new Date(c.requestedAt)) / 60000, 0) / calls.length)
    : 0

  res.json({
    success: true,
    date: start.toISOString().split('T')[0],
    orders: orders.length,
    revenue,
    avgOrderValue: orders.length ? Math.round(revenue / orders.length) : 0,
    waiterCalls: calls.length,
    avgResponseMinutes: avgResTime,
  })
}))

// GET /api/reports/staff?cafeId=xxx&days=7
router.get('/staff', authenticate, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  const cafeId = req.query.cafeId || req.user.cafeId
  const days   = parseInt(req.query.days) || 7
  const { start, end } = dateRange(days)

  const calls  = await WaiterCall.find({ cafeId, requestedAt: { $gte: start, $lte: end }, waiterId: { $exists: true } })
    .populate('waiterId', 'name')
    .lean()

  // Group by waiter
  const waiterMap = {}
  calls.forEach((c) => {
    if (!c.waiterId) return
    const id = c.waiterId._id.toString()
    if (!waiterMap[id]) waiterMap[id] = { name: c.waiterId.name, calls: 0, avgMinutes: 0, totalMinutes: 0 }
    waiterMap[id].calls += 1
    if (c.acknowledgedAt) {
      waiterMap[id].totalMinutes += (new Date(c.acknowledgedAt) - new Date(c.requestedAt)) / 60000
    }
  })
  Object.values(waiterMap).forEach((w) => {
    w.avgMinutes = w.calls ? Math.round(w.totalMinutes / w.calls) : 0
  })

  const orders = await Order.find({ cafeId, status: 'paid', paidAt: { $gte: start, $lte: end } }).lean()
  const orderRevenue = orders.reduce((s, o) => s + o.total, 0)

  res.json({
    success: true,
    waiters: Object.values(waiterMap),
    totalCallsResolved: calls.filter((c) => c.status === 'done').length,
    totalOrders: orders.length,
    totalRevenue: orderRevenue,
  })
}))

// GET /api/reports/loyalty?cafeId=xxx
router.get('/loyalty', authenticate, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  const cafeId = req.query.cafeId || req.user.cafeId
  const orders = await Order.find({ cafeId, status: 'paid', pointsEarned: { $gt: 0 } }).lean()
  const totalPoints  = orders.reduce((s, o) => s + o.pointsEarned, 0)
  const totalRedeemed = orders.reduce((s, o) => s + (o.pointsUsed || 0), 0)

  res.json({ success: true, totalPointsIssued: totalPoints, totalPointsRedeemed: totalRedeemed })
}))

export default router