// src/modules/weather/weather.controller.js
import axios from 'axios'
import { cache } from '../../config/redis.js'

const OWM_BASE = process.env.OPENWEATHER_BASE_URL || 'https://api.openweathermap.org/data/2.5'
const OWM_KEY  = process.env.OPENWEATHER_API_KEY

const mapCondition = (owmId, temp) => {
  if (temp <= 10)                  return 'cold'
  if (temp >= 35)                  return 'hot'
  if (owmId >= 200 && owmId < 600) return 'rainy'
  if (owmId >= 600 && owmId < 700) return 'cold'
  if (owmId === 800)               return temp > 28 ? 'hot' : 'sunny'
  if (owmId >= 700 && owmId < 800) return 'windy'
  if (owmId > 800)                 return 'cloudy'
  return 'cloudy'
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/weather/current?lat=&lng=
//
// RESPONSE SHAPE (flat — no .data wrapper):
//   { condition, temp, feelsLike, humidity, icon, description, city }
//
// WHY FLAT: axios interceptor in frontend already unwraps response.data,
// so the frontend receives exactly what this handler returns via res.json().
// A nested { success, data: {...} } wrapper means weather?.condition === undefined.
// ─────────────────────────────────────────────────────────────────────────────
export const getCurrentWeather = async (req, res) => {
  const { lat, lng } = req.query

  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: 'lat and lng query params are required.' })
  }

  // Consistent key format — 2dp matches weather.service.js used by recommendations
  const latF     = parseFloat(lat).toFixed(2)
  const lngF     = parseFloat(lng).toFixed(2)
  const cacheKey = cache.KEYS.weather(latF, lngF)

  try {
    // ── Check cache first ──────────────────────────────────────────────────
    const cached = await cache.get(cacheKey)
    if (cached) {
      console.log(`[Weather] Cache hit: ${cacheKey} → ${cached.temp}°C ${cached.condition}`)
      return res.json(cached)   // flat — interceptor gives this directly to frontend
    }

    // ── No API key → warn loudly, return identifiable fallback ────────────
    if (!OWM_KEY) {
      console.warn('[Weather] ⚠️  OPENWEATHER_API_KEY not set in .env — add it and restart!')
      return res.json({
        condition: 'cloudy', temp: null, feelsLike: null, humidity: null,
        icon: '04d', description: 'API key missing', city: 'Unknown',
        _fallback: true,
      })
    }

    // ── Live fetch from OpenWeatherMap ────────────────────────────────────
    console.log(`[Weather] Fetching OWM lat=${latF} lng=${lngF}`)
    const { data: owm } = await axios.get(`${OWM_BASE}/weather`, {
      params: { lat: latF, lon: lngF, appid: OWM_KEY, units: 'metric' },
      timeout: 6000,
    })

    const temp   = Math.round(owm.main.temp)
    const owmId  = owm.weather[0].id
    const result = {
      condition:   mapCondition(owmId, temp),
      temp,
      feelsLike:   Math.round(owm.main.feels_like),
      humidity:    owm.main.humidity,
      icon:        owm.weather[0].icon,
      description: owm.weather[0].description,
      city:        owm.name,
    }

    console.log(`[Weather] OWM → ${result.city} ${result.temp}°C ${result.condition}`)
    await cache.set(cacheKey, result, cache.TTL.WEATHER)

    return res.json(result)   // flat — no { success, data } wrapper

  } catch (err) {
    console.error('[Weather] fetch error:', err.message)
    // Return identifiable fallback — temp: null so UI can detect failure
    return res.json({
      condition: 'cloudy', temp: null, feelsLike: null, humidity: null,
      icon: '04d', description: 'Weather service temporarily unavailable', city: 'Unknown',
      _fallback: true,
    })
  }
}