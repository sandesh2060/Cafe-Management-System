// src/modules/table-session/tableSession.routes.js
import { Router }       from 'express'
import { optionalAuth } from '../auth/auth.middleware.js'
import * as ctrl        from './tableSession.controller.js'

const router = Router()

// GPS & QR detection — optionalAuth so guests can detect without login
router.post('/detect/gps', optionalAuth, ctrl.detectGps)
router.post('/detect/qr',  optionalAuth, ctrl.detectQr)

// Session management
router.get('/active',      optionalAuth, ctrl.getActiveSession)
router.post('/close',      optionalAuth, ctrl.closeSession)
router.post('/heartbeat',  optionalAuth, ctrl.heartbeat)

// Health check
router.get('/', (req, res) => res.json({ success: true, message: 'table-session OK' }))

export default router