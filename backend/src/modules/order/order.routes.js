// backend/src/modules/order/order.routes.js
import { Router }         from 'express'
import { protect }        from '../auth/auth.middleware.js'
import requireRole    from '../../shared/middleware/requireRole.js'
import {
  placeOrder,
  getActiveOrder,
  getOrderHistory,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  getKDSOrders,
  getWaiterQueue,
}                         from './order.controller.js'

const router = Router()

// ── Customer routes (authenticated) ──────────────────────────────────────────
router.use(protect)

router.post  ('/',              placeOrder)
router.get   ('/active',        getActiveOrder)
router.get   ('/history',       getOrderHistory)
router.get   ('/:id',           getOrderById)
router.post  ('/:id/cancel',    cancelOrder)

// ── Staff / admin routes ──────────────────────────────────────────────────────
router.patch ('/:id/status',    requireRole('waiter', 'kitchen', 'manager', 'admin'), updateOrderStatus)
router.get   ('/kds',           requireRole('kitchen', 'manager', 'admin'), getKDSOrders)
router.get   ('/waiter',        requireRole('waiter',  'manager', 'admin'), getWaiterQueue)

export default router