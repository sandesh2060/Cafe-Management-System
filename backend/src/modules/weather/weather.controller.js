// src/modules/weather/weather.controller.js
import axios from 'axios'
import { cache } from '../../config/redis.js'

const OWM_BASE  = process.env.OPENWEATHER_BASE_URL || 'https://api.openweathermap.org/data/2.5'
const OWM_KEY   = process.env.OPENWEATHER_API_KEY

// Map OpenWeatherMap condition codes → internal condition strings
// Full list: https://openweathermap.org/weather-conditions
const mapCondition = (owmId, temp) => {
  if (temp <= 10)                   return 'cold'
  if (temp >= 35)                   return 'hot'
  if (owmId >= 200 && owmId < 600)  return 'rainy'   // thunderstorm + drizzle + rain
  if (owmId >= 600 && owmId < 700)  return 'cold'    // snow
  if (owmId === 800)                return temp > 28 ? 'hot' : 'sunny'
  if (owmId > 800)                  return 'cloudy'
  if (owmId >= 700 && owmId < 800)  return 'windy'   // atmosphere (mist, haze, etc.)
  return 'cloudy'
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/weather/current?lat=&lng=
// ─────────────────────────────────────────────────────────────────────────────
export const getCurrentWeather = async (req, res) => {
  const { lat, lng } = req.query

  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      message: 'lat and lng query params are required.',
    })
  }

  const cacheKey = cache.KEYS.weather(parseFloat(lat).toFixed(3), parseFloat(lng).toFixed(3))

  try {
    const cached = await cache.get(cacheKey)
    if (cached) {
      return res.json({ success: true, data: cached, cached: true })
    }

    // ── No API key → return safe default so app keeps working ─────────────────
    if (!OWM_KEY) {
      console.warn('[Weather] OPENWEATHER_API_KEY not set — returning default condition')
      const fallback = { condition: 'cloudy', temp: 25, icon: '04d', city: 'Unknown', description: 'Weather unavailable' }
      return res.json({ success: true, data: fallback, cached: false })
    }

    // ── Live fetch ────────────────────────────────────────────────────────────
    const { data: owm } = await axios.get(`${OWM_BASE}/weather`, {
      params: { lat, lon: lng, appid: OWM_KEY, units: 'metric' },
      timeout: 5000,
    })

    const temp      = Math.round(owm.main.temp)
    const owmId     = owm.weather[0].id
    const condition = mapCondition(owmId, temp)

    const result = {
      condition,                          // 'sunny' | 'rainy' | 'cloudy' | 'cold' | 'hot' | 'windy'
      temp,                               // celsius
      feelsLike: Math.round(owm.main.feels_like),
      humidity:  owm.main.humidity,
      icon:      owm.weather[0].icon,
      description: owm.weather[0].description,
      city:      owm.name,
    }

    await cache.set(cacheKey, result, cache.TTL.WEATHER)

    return res.json({ success: true, data: result, cached: false })

  } catch (err) {
    console.error('[Weather] fetch error:', err.message)

    // If OWM is down, return a safe default — never crash the app
    const fallback = {
      condition:   'cloudy',
      temp:        25,
      icon:        '04d',
      city:        'Unknown',
      description: 'Weather service temporarily unavailable',
    }
    return res.json({ success: true, data: fallback, cached: false, warning: 'Using fallback weather' })
  }
}