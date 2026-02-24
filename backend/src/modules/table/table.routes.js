// src/modules/table/table.routes.js
import { Router } from 'express'
import { protect, authorize } from '../auth/auth.middleware.js'
import {
  createTable,
  getTables,
  getTableById,
  updateTable,
  regenerateQr,
  deleteTable,
} from './table.controller.js'

const router = Router()

// All table routes require a logged-in user
router.use(protect)

// ── Manager-only ──────────────────────────────────────────────────────────────
router.post('/',                    authorize('manager'), createTable)
router.patch('/:id',                authorize('manager'), updateTable)
router.post('/:id/regenerate-qr',   authorize('manager'), regenerateQr)
router.delete('/:id',               authorize('manager'), deleteTable)

// ── Manager + Waiter + Kitchen (read) ─────────────────────────────────────────
router.get('/',    authorize('manager', 'waiter', 'kitchen', 'cashier'), getTables)
router.get('/:id', authorize('manager', 'waiter', 'kitchen', 'cashier'), getTableById)

export default router