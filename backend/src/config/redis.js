import Redis from 'ioredis'
let client = null
export const connectRedis = async () => {
  try {
    client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { lazyConnect: true, maxRetriesPerRequest: 1 })
    await client.connect()
    console.log('Redis connected')
  } catch (err) {
    console.warn('Redis unavailable:', err.message)
    client = null
  }
}
export const cache = {
  get: async (key) => { try { const v = await client?.get(key); return v ? JSON.parse(v) : null } catch { return null } },
  set: async (key, value, ttl) => { try { const s = JSON.stringify(value); ttl ? await client?.setex(key, ttl, s) : await client?.set(key, s) } catch {} },
  del: async (key) => { try { await client?.del(key) } catch {} },
  KEYS: {
    tableSession: (id) => `session:${id}`,
    tableCoords: (id) => `coords:${id}`,
    menu: (id) => `menu:${id}`,
    weather: (lat, lng) => `weather:${lat},${lng}`,
    rec: (uid, cid) => `rec:${uid}:${cid}`,
  },
  TTL: { SESSION: 7200, MENU: 300, WEATHER: 1800, REC: 1800 },
}
