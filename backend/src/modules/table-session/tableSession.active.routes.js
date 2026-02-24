// src/modules/table-session/tableSession.active.routes.js
// GET /api/table-session/active  — used by manager to see active sessions
import { Router }       from 'express'
import TableSession     from './tableSession.model.js'
import Table            from '../table/table.model.js'
import { authenticate, authorize } from '../auth/auth.middleware.js'
import { catchAsync }   from '../../shared/middleware/errorHandler.js'

const router = Router()

router.get('/active', authenticate, authorize('manager', 'admin', 'waiter'), catchAsync(async (req, res) => {
  const cafeId = req.query.cafeId || req.user.cafeId
  const sessions = await TableSession.find({ cafeId, status: 'active' })
    .sort({ openedAt: -1 })
    .lean()

  // Enrich with table info
  const tableIds = [...new Set(sessions.map((s) => s.tableId?.toString()).filter(Boolean))]
  const tables   = await Table.find({ _id: { $in: tableIds } }).lean()
  const tableMap = Object.fromEntries(tables.map((t) => [t._id.toString(), t]))

  const enriched = sessions.map((s) => ({
    ...s,
    tableNumber: tableMap[s.tableId?.toString()]?.tableNumber,
    zone:        tableMap[s.tableId?.toString()]?.zone,
  }))

  res.json({ success: true, sessions: enriched })
}))

export default router