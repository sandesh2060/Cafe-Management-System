// src/config/redis.js
import Redis from 'ioredis'

let redisClient = null

export const connectRedis = async () => {
  redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    retryStrategy: (times) => Math.min(times * 100, 3000),
    enableReadyCheck: true,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
  })

  redisClient.on('connect', () => console.log('✅  Redis connected'))
  redisClient.on('error',   (err) => console.error('❌  Redis error:', err.message))
  redisClient.on('reconnecting', () => console.log('🔄  Redis reconnecting...'))

  await redisClient.connect()
  return redisClient
}

export const getRedis = () => {
  if (!redisClient) throw new Error('Redis not initialized. Call connectRedis() first.')
  return redisClient
}

// ── Cache helpers ─────────────────────────────────────────────────────────────
export const cache = {
  // Redis key constants
  KEYS: {
    session:        (id)          => `session:${id}`,
    tableSession:   (tableId)     => `table:${tableId}:session`,
    tableCoords:    (cafeId)      => `coords:${cafeId}`,
    qrToken:        (token)       => `qr:${token}`,
    geofenceExit:   (userId)      => `geofence:${userId}:exited`,
    loyaltyTier:    (userId)      => `loyalty:${userId}:tier`,
    menu:           (cafeId)      => `menu:${cafeId}`,
    weather:        (lat, lng)    => `weather:${lat},${lng}`,
    recommendations:(userId, cafeId) => `rec:${userId}:${cafeId}`,
    guestRec:       (cafeId, weather) => `rec:guest:${cafeId}:${weather}`,
    unreadMessages: (userId)      => `unread:${userId}`,
    activeCall:     (tableId)     => `call:${tableId}:active`,
  },

  get: async (key) => {
    const val = await getRedis().get(key)
    return val ? JSON.parse(val) : null
  },

  set: async (key, value, ttlSeconds) => {
    const r = getRedis()
    const str = JSON.stringify(value)
    if (ttlSeconds) await r.setex(key, ttlSeconds, str)
    else            await r.set(key, str)
  },

  del: async (...keys) => {
    if (keys.length === 0) return
    await getRedis().del(...keys)
  },

  exists: async (key) => {
    const result = await getRedis().exists(key)
    return result === 1
  },

  // TTL constants (seconds)
  TTL: {
    SESSION:         7200,   // 2 hours
    QR_TOKEN:        900,    // 15 min
    GEOFENCE_GRACE:  300,    // 5 min
    LOYALTY_TIER:    600,    // 10 min
    MENU:            300,    // 5 min
    WEATHER:         1800,   // 30 min
    RECOMMENDATIONS: 1800,   // 30 min
    ACTIVE_CALL:     1800,   // 30 min
  },
}