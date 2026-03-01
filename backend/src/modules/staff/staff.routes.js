// backend/src/modules/staff/staff.routes.js
import { Router }   from 'express'
import { protect, authorize } from '../auth/auth.middleware.js'
import * as ctrl    from './staff.controller.js'

const router = Router()

// ── Public: staff login ───────────────────────────────────────────────────────
router.post('/login', ctrl.staffLogin)

// ── All routes below require auth ────────────────────────────────────────────
router.use(protect)
router.use(authorize('manager', 'admin'))

router.get   ('/',                   ctrl.listStaff)
router.post  ('/',                   ctrl.createStaff)
router.patch ('/:id',                ctrl.updateStaff)       // { isActive, name, role }
router.post  ('/:id/reset-password', ctrl.resetPassword)
router.delete('/:id',                ctrl.deleteStaff)

export default router