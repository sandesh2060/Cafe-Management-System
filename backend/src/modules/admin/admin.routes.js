// src/modules/admin/admin.routes.js
import { Router }   from 'express'
import User         from '../user/user.model.js'
import Order        from '../order/order.model.js'
import MenuItem     from '../menu/menu.model.js'
import TableSession from '../table-session/tableSession.model.js'
import { authenticate, authorize } from '../auth/auth.middleware.js'
import { catchAsync }              from '../../shared/middleware/errorHandler.js'

const router = Router()

// All admin routes require admin role
router.use(authenticate, authorize('admin'))

// GET /api/admin/stats  — platform-wide summary
router.get('/stats', catchAsync(async (req, res) => {
  const [totalUsers, totalOrders, activeSessionsCount] = await Promise.all([
    User.countDocuments({ role: { $nin: ['admin'] } }),
    Order.countDocuments(),
    TableSession.countDocuments({ status: 'active' }),
  ])
  res.json({ success: true, stats: { totalUsers, totalOrders, activeSessions: activeSessionsCount } })
}))

// GET /api/admin/users?role=waiter&page=1
router.get('/users', catchAsync(async (req, res) => {
  const { role, page = 1, limit = 50 } = req.query
  const query = role ? { role } : {}
  const users = await User.find(query)
    .select('-password -faceDescriptor')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean()
  const total = await User.countDocuments(query)
  res.json({ success: true, users, total, page: Number(page) })
}))

// PATCH /api/admin/users/:id/toggle-active
router.patch('/users/:id/toggle-active', catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) return res.status(404).json({ success: false, message: 'Not found' })
  user.isActive = !user.isActive
  await user.save()
  res.json({ success: true, isActive: user.isActive })
}))

// GET /api/admin/usage  — system usage metrics
router.get('/usage', catchAsync(async (req, res) => {
  const now   = new Date()
  const today = new Date(now.setHours(0, 0, 0, 0))

  const [ordersToday, sessionsToday, newUsersToday, activeSessions] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: today } }),
    TableSession.countDocuments({ openedAt: { $gte: today } }),
    User.countDocuments({ createdAt: { $gte: today } }),
    TableSession.countDocuments({ status: 'active' }),
  ])

  res.json({
    success: true,
    usage: { ordersToday, sessionsToday, newUsersToday, activeSessions },
  })
}))

// GET /api/admin/activity  — recent orders across all cafes
router.get('/activity', catchAsync(async (req, res) => {
  const orders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('customerId', 'name')
    .lean()
  res.json({ success: true, orders })
}))

export default router