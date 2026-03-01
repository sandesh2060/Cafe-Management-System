// backend/src/modules/inventory/inventory.routes.js
import { Router }   from 'express'
import { protect, authorize } from '../auth/auth.middleware.js'
import * as ctrl    from './inventory.controller.js'

const router = Router()

router.use(protect)
router.use(authorize('manager', 'admin', 'kitchen'))

router.get   ('/',        ctrl.listItems)
router.get   ('/alerts',  ctrl.getLowStockAlerts)
router.post  ('/',        ctrl.createItem)
router.patch ('/:id',     ctrl.updateItem)
router.delete('/:id',     ctrl.deleteItem)

export default router