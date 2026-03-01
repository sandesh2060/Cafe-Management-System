// backend/src/modules/admin/admin.routes.js
import { Router }   from 'express'
import { protect, authorize } from '../auth/auth.middleware.js'
import * as ctrl    from './admin.controller.js'

const router = Router()

router.use(protect)
router.use(authorize('admin'))

router.get  ('/stats',                    ctrl.getStats)
router.get  ('/usage',                    ctrl.getUsage)
router.get  ('/users',                    ctrl.getUsers)
router.patch('/users/:id/toggle-active',  ctrl.toggleUserActive)
router.get  ('/activity',                 ctrl.getActivity)

export default router