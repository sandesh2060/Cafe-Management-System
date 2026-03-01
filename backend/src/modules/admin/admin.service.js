// backend/src/modules/admin/admin.service.js
import User         from '../user/user.model.js'
import Order        from '../order/order.model.js'
import TableSession from '../table-session/tableSession.model.js'
import mongoose     from 'mongoose'

const toObjId = (id) => new mongoose.Types.ObjectId(id.toString())

// ── Platform stats ────────────────────────────────────────────────────────────
export const getStats = async (cafeId) => {
  const cafeObjId = toObjId(cafeId)

  const [totalUsers, totalOrders, activeSessions] = await Promise.all([
    User.countDocuments({ cafeId: cafeObjId, isGuest: false }),
    Order.countDocuments({ cafeId: cafeObjId }),
    TableSession.countDocuments({ cafeId: cafeObjId, status: 'active' }),
  ])

  return { totalUsers, totalOrders, activeSessions }
}

// ── Usage (today) ─────────────────────────────────────────────────────────────
export const getUsage = async (cafeId) => {
  const cafeObjId = toObjId(cafeId)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [ordersToday, sessionsToday, newUsersToday] = await Promise.all([
    Order.countDocuments({ cafeId: cafeObjId, createdAt: { $gte: today } }),
    TableSession.countDocuments({ cafeId: cafeObjId, createdAt: { $gte: today } }),
    User.countDocuments({ cafeId: cafeObjId, isGuest: false, createdAt: { $gte: today } }),
  ])

  return { ordersToday, sessionsToday, newUsersToday }
}

// ── User list ─────────────────────────────────────────────────────────────────
export const getUsers = async (cafeId, { limit = 20, role, search } = {}) => {
  const cafeObjId = toObjId(cafeId)
  const query = { cafeId: cafeObjId, isGuest: false }
  if (role)   query.role   = role
  if (search) query.name   = { $regex: search, $options: 'i' }

  const users = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean()

  return users
}

// ── Toggle user active ────────────────────────────────────────────────────────
export const toggleUserActive = async (userId) => {
  const user = await User.findById(userId).select('isActive')
  if (!user) throw new Error('User not found')
  user.isActive = !user.isActive
  await user.save()
  return { _id: user._id, isActive: user.isActive }
}

// ── Recent activity (last 50 paid orders) ────────────────────────────────────
export const getActivity = async (cafeId, limit = 50) => {
  const cafeObjId = toObjId(cafeId)
  const orders = await Order.find({ cafeId: cafeObjId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('customerId', 'name isGuest')
    .select('status total createdAt customerId')
    .lean()
  return orders
}