// src/modules/recommendations/recommendation.service.js
import Order    from '../order/order.model.js'
import MenuItem from '../menu/menu.model.js'
import { WEATHER_MENU_MAP } from './weatherMapping.js'
import { getTimeBoost }     from './timeMapping.js'
import { cache }            from '../../config/redis.js'

const HISTORY_DAYS = parseInt(process.env.RECOMMENDATION_HISTORY_DAYS || '30')
const REC_COUNT    = parseInt(process.env.RECOMMENDATION_COUNT        || '6')
const WEATHER_WT   = 0.4
const HISTORY_WT   = 0.6

const isInFavCategory = (item, freqMap, allItems) => {
  const catFreq = {}
  allItems.forEach((i) => {
    if (freqMap[i._id.toString()]) {
      catFreq[i.category] = (catFreq[i.category] || 0) + freqMap[i._id.toString()]
    }
  })
  const favCat = Object.entries(catFreq).sort((a, b) => b[1] - a[1])[0]?.[0]
  return favCat && item.category === favCat
}

export const getPersonalRecommendations = async (userId, cafeId, weatherCondition) => {
  // cache.KEYS.rec(uid, cid) → 'rec:uid:cid'  ✅ matches redis.js
  const cacheKey = cache.KEYS.rec(userId, cafeId)
  const cached   = await cache.get(cacheKey)
  if (cached) return cached

  const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000)

  const [history, menuItems] = await Promise.all([
    Order.find({ customerId: userId, cafeId, createdAt: { $gte: since } })
      .sort({ createdAt: -1 }).limit(30)
      .select('items')
      .lean(),
    MenuItem.find({ cafeId, isAvailable: true }).lean(),
  ])

  // Build frequency map — guard against missing menuItemId
  const freq = {}
  history.forEach((order) => {
    order.items?.forEach((item) => {
      const id = item.menuItemId?.toString()
      if (id) freq[id] = (freq[id] || 0) + (item.quantity || 1)
    })
  })

  const timeBoost  = getTimeBoost(new Date().getHours())
  const weatherMap = WEATHER_MENU_MAP[weatherCondition] || {}

  const scored = menuItems.map((item) => {
    let score   = 0
    const id    = item._id.toString()
    const freq_ = freq[id] || 0

    score += freq_ * 10 * HISTORY_WT
    if (weatherMap.boost?.includes(item.category))  score += (weatherMap.score || 0) * WEATHER_WT
    if (weatherMap.reduce?.includes(item.category)) score -= 15
    if (timeBoost.categories?.includes(item.category)) score += timeBoost.bonus
    if (freq_ === 0 && isInFavCategory(item, freq, menuItems)) score += 8

    return {
      item,
      score:       Math.max(0, score),
      weatherTag:  weatherMap.boost?.includes(item.category) ? weatherMap.tag : null,
      isFavourite: freq_ >= 3,
      isDiscovery: freq_ === 0 && score > 5,
    }
  })

  const results = scored.sort((a, b) => b.score - a.score).slice(0, REC_COUNT)

  // cache.TTL.REC → 1800  ✅ matches redis.js (was wrongly .RECOMMENDATIONS before)
  await cache.set(cacheKey, results, cache.TTL.REC)
  return results
}

export const getGuestRecommendations = async (cafeId, weatherCondition) => {
  // No cache.KEYS.guestRec in redis.js — build the key string directly
  const cacheKey = `rec:guest:${cafeId}:${weatherCondition}`
  const cached   = await cache.get(cacheKey)
  if (cached) return cached

  const weatherMap = WEATHER_MENU_MAP[weatherCondition] || {}
  const menuItems  = await MenuItem.find({ cafeId, isAvailable: true }).lean()

  const scored = menuItems.map((item) => {
    let score = 0
    if (weatherMap.boost?.includes(item.category))  score += weatherMap.score || 0
    if (weatherMap.reduce?.includes(item.category)) score -= 10
    if (item.isFeatured) score += 5
    return {
      item,
      score:       Math.max(0, score),
      weatherTag:  weatherMap.boost?.includes(item.category) ? weatherMap.tag : null,
      isFavourite: false,
      isDiscovery: false,
    }
  })

  const results = scored.sort((a, b) => b.score - a.score).slice(0, REC_COUNT)
  await cache.set(cacheKey, results, cache.TTL.REC)   // ✅ .REC not .RECOMMENDATIONS
  return results
}