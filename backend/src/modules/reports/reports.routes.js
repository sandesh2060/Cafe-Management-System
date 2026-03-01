// backend/src/modules/reports/reports.routes.js
import { Router }   from 'express'
import { protect, authorize } from '../auth/auth.middleware.js'
import * as ctrl    from './reports.controller.js'

const router = Router()

router.use(protect)
router.use(authorize('manager', 'admin'))

router.get('/sales',   ctrl.getSales)
router.get('/daily',   ctrl.getDaily)
router.get('/staff',   ctrl.getStaff)
router.get('/loyalty', ctrl.getLoyalty)

export default router