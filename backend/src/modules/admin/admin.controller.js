// backend/src/modules/admin/admin.controller.js
import * as service    from './admin.service.js'
import { sendSuccess } from '../../shared/utils/response.js'

const getCafeId = (req) => req.user?.cafeId || process.env.DEFAULT_CAFE_ID

// GET /api/admin/stats
export const getStats = async (req, res, next) => {
  try {
    const stats = await service.getStats(getCafeId(req))
    // AdminDashboard spreads: d.stats — so return { stats }
    res.json({ success: true, stats })
  } catch (err) { next(err) }
}

// GET /api/admin/usage
export const getUsage = async (req, res, next) => {
  try {
    const usage = await service.getUsage(getCafeId(req))
    // AdminDashboard spreads: d.usage
    res.json({ success: true, usage })
  } catch (err) { next(err) }
}

// GET /api/admin/users?limit=20&role=&search=
export const getUsers = async (req, res, next) => {
  try {
    const users = await service.getUsers(getCafeId(req), req.query)
    // AdminDashboard uses: us.users
    res.json({ success: true, users })
  } catch (err) { next(err) }
}

// PATCH /api/admin/users/:id/toggle-active
export const toggleUserActive = async (req, res, next) => {
  try {
    const data = await service.toggleUserActive(req.params.id)
    sendSuccess(res, data, 'Toggled')
  } catch (err) { next(err) }
}
// GET /api/admin/activity
export const getActivity = async (req, res, next) => {
  try {
    const orders = await service.getActivity(getCafeId(req), Number(req.query.limit) || 50)
    // AdminDashboard uses: d.orders
    res.json({ success: true, orders })
  } catch (err) { next(err) }
}