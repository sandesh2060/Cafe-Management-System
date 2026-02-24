// src/modules/recommendations/recommendation.service.js
import Order    from '../order/order.model.js'
import MenuItem from '../menu/menu.model.js'
import { WEATHER_MENU_MAP } from './weatherMapping.js'
import { getTimeBoost }     from './timeMapping.js'
import { cache }            from '../../config/redis.js'

const HISTORY_DAYS  = parseInt(process.env.RECOMMENDATION_HISTORY_DAYS || '30')
const REC_COUNT     = parseInt(process.env.RECOMMENDATION_COUNT        || '6')
const WEATHER_WT    = 0.4
const HISTORY_WT    = 0.6

const isInFavCategory = (item, freqMap, allItems) => {
  // Find user's favourite category by frequency
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
  // Try cache
  const cacheKey = cache.KEYS.recommendations(userId, cafeId)
  const cached   = await cache.get(cacheKey)
  if (cached) return cached

  // 1. Customer order history (last 30 days)
  const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000)
  const history = await Order.find({ customerId: userId, cafeId, createdAt: { $gte: since } })
    .sort({ createdAt: -1 }).limit(30)
    .select('items')
    .lean()

  // 2. Frequency map
  const freq = {}
  history.forEach((order) => {
    order.items.forEach((item) => {
      const id = item.menuItemId.toString()
      freq[id] = (freq[id] || 0) + item.quantity
    })
  })

  // 3. Time-of-day boost
  const timeBoost    = getTimeBoost(new Date().getHours())
  const weatherMap   = WEATHER_MENU_MAP[weatherCondition] || {}

  // 4. Fetch available menu items
  const menuItems = await MenuItem.find({ cafeId, isAvailable: true }).lean()

  // 5. Score each item
  const scored = menuItems.map((item) => {
    let score  = 0
    const id   = item._id.toString()
    const freq_ = freq[id] || 0

    // History signal (HISTORY_WT weight)
    score += freq_ * 10 * HISTORY_WT

    // Weather signal (WEATHER_WT weight)
    if (weatherMap.boost?.includes(item.category)) score += (weatherMap.score || 0) * WEATHER_WT
    if (weatherMap.reduce?.includes(item.category)) score -= 15

    // Time-of-day
    if (timeBoost.categories?.includes(item.category)) score += timeBoost.bonus

    // Discovery bonus — unseen item in fav category
    if (freq_ === 0 && isInFavCategory(item, freq, menuItems)) score += 8

    return {
      item,
      score:       Math.max(0, score),
      weatherTag:  weatherMap.boost?.includes(item.category) ? weatherMap.tag : null,
      isFavourite: freq_ >= 3,
      isDiscovery: freq_ === 0 && score > 5,
    }
  })

  // 6. Sort and take top N
  const results = scored.sort((a, b) => b.score - a.score).slice(0, REC_COUNT)

  // Cache for 30 min
  await cache.set(cacheKey, results, cache.TTL.RECOMMENDATIONS)
  return results
}

export const getGuestRecommendations = async (cafeId, weatherCondition) => {
  const cacheKey = cache.KEYS.guestRec(cafeId, weatherCondition)
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
      score:      Math.max(0, score),
      weatherTag: weatherMap.boost?.includes(item.category) ? weatherMap.tag : null,
      isFavourite: false,
      isDiscovery: false,
    }
  })

  const results = scored.sort((a, b) => b.score - a.score).slice(0, REC_COUNT)
  await cache.set(cacheKey, results, cache.TTL.RECOMMENDATIONS)
  return results
}