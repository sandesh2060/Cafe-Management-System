// src/modules/calling/calling.routes.js
import { Router }   from 'express'
import { authenticate, authorize } from '../auth/auth.middleware.js'
import { catchAsync } from '../../shared/middleware/errorHandler.js'

const router = Router()

// WebRTC signaling is handled by Socket.io (call.socket.js)
// These REST endpoints handle call history / logs

// GET /api/calling/active  — check if user is in active call
router.get('/active', authenticate, catchAsync(async (req, res) => {
  res.json({ success: true, activeCall: null })  // Tracked in-memory via socket
}))

export default router