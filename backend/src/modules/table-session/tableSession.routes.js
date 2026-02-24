// src/modules/table-session/tableSession.routes.js
import express         from 'express'
import { authenticate } from '../auth/auth.middleware.js'
import { catchAsync }   from '../../shared/middleware/errorHandler.js'
import * as service     from './tableSession.service.js'

const router = express.Router()

router.post('/detect/gps', authenticate, catchAsync(async (req, res) => {
  const { latitude, longitude, confidenceScore } = req.body
  if (!latitude || !longitude) {
    return res.status(400).json({ success: false, message: 'latitude and longitude required' })
  }
  const data = await service.detectByGps({
    userId:          req.user._id,
    cafeId:          req.user.cafeId || req.body.cafeId,
    latitude:        parseFloat(latitude),
    longitude:       parseFloat(longitude),
    confidenceScore: confidenceScore || 0,
  })
  res.json({ success: true, ...data })
}))

router.post('/detect/qr', authenticate, catchAsync(async (req, res) => {
  const { token } = req.body
  if (!token) return res.status(400).json({ success: false, message: 'QR token required' })
  const data = await service.detectByQr({ userId: req.user._id, token })
  res.json({ success: true, ...data })
}))

router.post('/heartbeat', authenticate, catchAsync(async (req, res) => {
  const { sessionId } = req.body
  await service.heartbeat(sessionId)
  res.json({ success: true })
}))

router.post('/close', authenticate, catchAsync(async (req, res) => {
  const { sessionId } = req.body
  await service.closeSession(sessionId)
  res.json({ success: true, message: 'Session closed' })
}))

export default router