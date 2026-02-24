// src/modules/recommendations/recommendation.controller.js
import MenuItem  from '../menu/menu.model.js'
import Order     from '../order/order.model.js'
import { redis } from '../../config/redis.js'   // adjust to match your redis export
import axios     from 'axios'

// ── Weather → menu category boost map ────────────────────────────────────────
const WEATHER_MAP = {
  rainy:  { boost: ['hot_drinks','soups','snacks','comfort_food'], reduce: ['cold_drinks','ice_cream'], score: 30, tag: '☔ Perfect for rainy weather' },
  hot:    { boost: ['cold_drinks','ice_cream','fresh_juice','light_food'], reduce: ['hot_drinks','soups'], score: 30, tag: '☀️ Cool you down' },
  cold:   { boost: ['hot_drinks','soups','comfort_food','snacks'], reduce: ['cold_drinks','salads'], score: 25, tag: '❄️ Warm you up' },
  sunny:  { boost: ['fresh_juice','light_snacks','smoothies'], reduce: ['heavy_food'], score: 20, tag: '🌤️ Fresh picks' },
  windy:  { boost: ['hot_drinks','snacks','wraps'], reduce: [], score: 15, tag: '💨 Cozy choices' },
  cloudy: { boost: ['tea','coffee','snacks'], reduce: [], score: 10, tag: '☁️ Cloudy day picks' },
}

// ── Time-of-day category boost ────────────────────────────────────────────────
const getTimeBoost = (hour) => {
  if (hour >= 6  && hour < 11) return { categories: ['hot_drinks','tea','coffee','breakfast'], bonus: 8 }
  if (hour >= 11 && hour < 15) return { categories: ['light_food','fresh_juice','snacks'],     bonus: 6 }
  if (hour >= 15 && hour < 19) return { categories: ['snacks','cold_drinks','tea'],             bonus: 7 }
  return                               { categories: ['comfort_food','hot_drinks'],             bonus: 5 }
}

// ── Helper: fetch weather condition (never throws) ────────────────────────────
const fetchWeatherCondition = async (lat, lng) => {
  const OWM_KEY  = process.env.OPENWEATHER_API_KEY
  const OWM_BASE = process.env.OPENWEATHER_BASE_URL || 'https://api.openweathermap.org/data/2.5'

  if (!OWM_KEY || !lat || !lng) return 'cloudy'

  // Check redis cache first
  try {
    if (redis) {
      const cacheKey = `weather:${parseFloat(lat).toFixed(3)},${parseFloat(lng).toFixed(3)}`
      const cached = await redis.get(cacheKey)
      if (cached) return JSON.parse(cached).condition
    }
  } catch (_) { /* redis miss is fine */ }

  try {
    const { data } = await axios.get(`${OWM_BASE}/weather`, {
      params: { lat, lon: lng, appid: OWM_KEY, units: 'metric' },
      timeout: 4000,
    })
    const temp  = data.main.temp
    const owmId = data.weather[0].id
    if (temp <= 10)                   return 'cold'
    if (temp >= 35)                   return 'hot'
    if (owmId >= 200 && owmId < 600)  return 'rainy'
    if (owmId === 800)                return temp > 28 ? 'hot' : 'sunny'
    if (owmId > 800)                  return 'cloudy'
    return 'cloudy'
  } catch (err) {
    console.warn('[Recommendations] Weather fetch failed, using default:', err.message)
    return 'cloudy'  // safe default — app must never crash because of weather
  }
}

// ── Core scoring ──────────────────────────────────────────────────────────────
const scoreItems = (items, freqMap, weatherCondition) => {
  const weatherMap = WEATHER_MAP[weatherCondition] || WEATHER_MAP.cloudy
  const timeBoost  = getTimeBoost(new Date().getHours())

  return items.map(item => {
    const id  = item._id.toString()
    let score = 0

    // History signal (60% weight)
    score += (freqMap[id] || 0) * 10 * 0.6

    // Weather signal (40% weight)
    if (weatherMap.boost.includes(item.category))  score += weatherMap.score * 0.4
    if (weatherMap.reduce.includes(item.category)) score -= 15

    // Time-of-day
    if (timeBoost.categories.includes(item.category)) score += timeBoost.bonus

    // Discovery: untried item in a category the customer likes
    const favCategories = Object.keys(freqMap)
    const isDiscovery   = !freqMap[id] && favCategories.some(fid =>
      items.find(i => i._id.toString() === fid)?.category === item.category
    )
    if (isDiscovery) score += 8

    return {
      item,
      score,
      weatherTag:  weatherMap.boost.includes(item.category) ? weatherMap.tag : null,
      isFavourite: (freqMap[id] || 0) >= 3,
      isDiscovery,
    }
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, parseInt(process.env.RECOMMENDATION_COUNT || '6'))
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/recommendations/guest?cafeId=&lat=&lng=&weather=
// weather param is optional — will auto-fetch if lat/lng provided
// ─────────────────────────────────────────────────────────────────────────────
export const getGuestRecs = async (req, res) => {
  try {
    const { cafeId, lat, lng, weather } = req.query

    if (!cafeId) {
      return res.status(400).json({ success: false, message: 'cafeId is required.' })
    }

    // Redis cache key
    const condition = weather || await fetchWeatherCondition(lat, lng)
    const cacheKey  = `rec:guest:${cafeId}:${condition}`

    if (redis) {
      try {
        const cached = await redis.get(cacheKey)
        if (cached) return res.json({ success: true, data: JSON.parse(cached), cached: true })
      } catch (_) { /* cache miss */ }
    }

    const items = await MenuItem.find({ cafeId, isAvailable: true }).lean()

    if (!items.length) {
      return res.json({ success: true, data: [], message: 'No menu items found for this cafe.' })
    }

    const scored = scoreItems(items, {}, condition)

    if (redis) {
      try { await redis.set(cacheKey, JSON.stringify(scored), 'EX', 30 * 60) } catch (_) {}
    }

    return res.json({ success: true, data: scored, condition, cached: false })

  } catch (err) {
    console.error('[Recommendations] getGuestRecs error:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch recommendations.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/recommendations/personal?cafeId=&lat=&lng=&weather=
// Requires auth — uses req.user._id from authenticate middleware
// ─────────────────────────────────────────────────────────────────────────────
export const getPersonalRecs = async (req, res) => {
  try {
    const { cafeId, lat, lng, weather } = req.query
    const userId = req.user._id

    if (!cafeId) {
      return res.status(400).json({ success: false, message: 'cafeId is required.' })
    }

    const condition = weather || await fetchWeatherCondition(lat, lng)
    const cacheKey  = `rec:${userId}:${cafeId}`

    if (redis) {
      try {
        const cached = await redis.get(cacheKey)
        if (cached) return res.json({ success: true, data: JSON.parse(cached), cached: true })
      } catch (_) {}
    }

    // Fetch last 30 orders in parallel with menu items
    const historyDays = parseInt(process.env.RECOMMENDATION_HISTORY_DAYS || '30')
    const since       = new Date(Date.now() - historyDays * 24 * 60 * 60 * 1000)

    const [history, items] = await Promise.all([
      Order.find({ userId, cafeId, createdAt: { $gte: since } })
           .sort({ createdAt: -1 }).limit(30)
           .select('items')
           .lean(),
      MenuItem.find({ cafeId, isAvailable: true }).lean(),
    ])

    if (!items.length) {
      return res.json({ success: true, data: [], message: 'No menu items found for this cafe.' })
    }

    // Build frequency map from order history
    const freqMap = {}
    history.forEach(order => {
      order.items?.forEach(item => {
        const id = item.menuItemId?.toString()
        if (id) freqMap[id] = (freqMap[id] || 0) + (item.quantity || 1)
      })
    })

    const scored = scoreItems(items, freqMap, condition)

    if (redis) {
      try { await redis.set(cacheKey, JSON.stringify(scored), 'EX', 30 * 60) } catch (_) {}
    }

    return res.json({ success: true, data: scored, condition, cached: false })

  } catch (err) {
    console.error('[Recommendations] getPersonalRecs error:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch recommendations.' })
  }
}