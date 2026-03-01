// backend/src/modules/loyalty/loyalty.routes.js
import { Router }   from 'express'
import { protect, authorize } from '../auth/auth.middleware.js'
import * as ctrl    from './loyalty.controller.js'

const router = Router()

router.use(protect)

// Customer
router.get('/me',          ctrl.getMyLoyalty)
router.get('/history',     ctrl.getHistory)

// Manager/Admin
router.get('/leaderboard', authorize('manager','admin'), ctrl.getLeaderboard)
router.get('/config',      authorize('manager','admin'), ctrl.getConfig)

export default router