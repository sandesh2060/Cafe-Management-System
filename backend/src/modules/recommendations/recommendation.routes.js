// src/modules/recommendations/recommendation.routes.js
import express        from 'express'
import { authenticate, optionalAuth } from '../auth/auth.middleware.js'
import { catchAsync } from '../../shared/middleware/errorHandler.js'
import * as service   from './recommendation.service.js'

const router = express.Router()

// Personal recommendations (requires auth)
router.get('/personal', authenticate, catchAsync(async (req, res) => {
  const { cafeId, weather = 'sunny' } = req.query
  if (!cafeId) return res.status(400).json({ success: false, message: 'cafeId required' })
  const recommendations = await service.getPersonalRecommendations(req.user._id, cafeId, weather)
  res.json({ success: true, recommendations })
}))

// Guest recommendations (no auth)
router.get('/guest', catchAsync(async (req, res) => {
  const { cafeId, weather = 'sunny' } = req.query
  if (!cafeId) return res.status(400).json({ success: false, message: 'cafeId required' })
  const recommendations = await service.getGuestRecommendations(cafeId, weather)
  res.json({ success: true, recommendations })
}))

export default router