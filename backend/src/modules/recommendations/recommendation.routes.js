// src/modules/recommendations/recommendation.routes.js
import express                         from 'express'
import { authenticate, optionalAuth }  from '../auth/auth.middleware.js'
import { catchAsync }                  from '../../shared/middleware/errorHandler.js'
import { getCurrentWeather }           from '../weather/weather.service.js'
import * as service                    from './recommendation.service.js'

const router = express.Router()

// ── Helper: resolve weather condition from query params ───────────────────────
// Priority: explicit ?weather= param → live fetch from lat/lng → safe default
const resolveWeather = async (query) => {
  const { weather, lat, lng } = query

  // Caller passed an explicit condition string — trust it
  if (weather && weather !== 'sunny') return weather

  // We have coordinates — fetch live weather (weather.service handles caching + fallback)
  if (lat && lng) {
    try {
      const result = await getCurrentWeather(parseFloat(lat), parseFloat(lng))
      return result.condition ?? 'cloudy'
    } catch {
      return 'cloudy'
    }
  }

  // Nothing to go on — neutral default
  return 'cloudy'
}

// ── GET /api/recommendations/personal  (auth required) ───────────────────────
router.get('/personal', authenticate, catchAsync(async (req, res) => {
  const { cafeId } = req.query

  if (!cafeId) {
    return res.status(400).json({ success: false, message: 'cafeId required' })
  }

  const weatherCondition = await resolveWeather(req.query)

  const recommendations = await service.getPersonalRecommendations(
    req.user._id,
    cafeId,
    weatherCondition,
  )

  res.json({ success: true, recommendations, condition: weatherCondition })
}))

// ── GET /api/recommendations/guest  (no auth) ─────────────────────────────────
router.get('/guest', catchAsync(async (req, res) => {
  const { cafeId } = req.query

  if (!cafeId) {
    return res.status(400).json({ success: false, message: 'cafeId required' })
  }

  const weatherCondition = await resolveWeather(req.query)

  const recommendations = await service.getGuestRecommendations(cafeId, weatherCondition)

  res.json({ success: true, recommendations, condition: weatherCondition })
}))

export default router