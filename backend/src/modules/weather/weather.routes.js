// src/modules/weather/weather.routes.js
import express        from 'express'
import { catchAsync } from '../../shared/middleware/errorHandler.js'
import { getCurrentWeather } from './weather.service.js'

const router = express.Router()

router.get('/current', catchAsync(async (req, res) => {
  const { lat, lng } = req.query
  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: 'lat and lng required' })
  }
  const weather = await getCurrentWeather(parseFloat(lat), parseFloat(lng))
  res.json({ success: true, ...weather })
}))

export default router