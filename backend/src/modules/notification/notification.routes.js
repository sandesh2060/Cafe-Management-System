// backend/src/modules/notification/notification.routes.js
import { Router }      from 'express'
import { protect }     from '../auth/auth.middleware.js'
import {
  getNotifications,
  markAllRead,
  markOneRead,
  clearAll,
}                      from './notification.controller.js'

const router = Router()

// All routes protected
router.use(protect)

router.get   ('/',              getNotifications)
router.patch ('/read-all',      markAllRead)
router.patch ('/:id/read',      markOneRead)
router.delete('/',              clearAll)

export default router