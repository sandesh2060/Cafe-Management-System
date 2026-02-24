// src/modules/weather/weather.service.js
import axios                  from 'axios'
import { cache }              from '../../config/redis.js'
import { mapOwmCondition }    from '../recommendations/weatherMapping.js'

const OWM_KEY  = process.env.OPENWEATHER_API_KEY
const OWM_URL  = process.env.OPENWEATHER_BASE_URL || 'https://api.openweathermap.org/data/2.5'

export const getCurrentWeather = async (lat, lng) => {
  const cacheKey = cache.KEYS.weather(lat.toFixed(2), lng.toFixed(2))
  const cached   = await cache.get(cacheKey)
  if (cached) return cached

  if (!OWM_KEY) {
    // Fallback for development without API key
    return { condition: 'sunny', temp: 25, icon: '01d', city: 'Unknown' }
  }

  try {
    const res = await axios.get(`${OWM_URL}/weather`, {
      params: { lat, lon: lng, appid: OWM_KEY, units: 'metric' },
      timeout: 5000,
    })

    const data = {
      condition: mapOwmCondition(res.data.weather[0]?.main, res.data.main?.temp),
      temp:      Math.round(res.data.main?.temp),
      icon:      res.data.weather[0]?.icon,
      city:      res.data.name,
      rawMain:   res.data.weather[0]?.main,
    }

    await cache.set(cacheKey, data, cache.TTL.WEATHER)
    return data
  } catch (err) {
    console.error('[Weather] API error:', err.message)
    return { condition: 'sunny', temp: 25, icon: '01d', city: 'Unknown' }
  }
}