// src/modules/table-session/algorithms/nearestTable.js
import { KDTree } from 'kd-tree-javascript'
import Table      from '../../table/table.model.js'
import { cache }  from '../../../config/redis.js'

// Haversine distance for KD-Tree
const haversineDistance = (a, b) => {
  const R    = 6371000
  const toR  = (d) => (d * Math.PI) / 180
  const dLat = toR(b.lat - a.lat)
  const dLng = toR(b.lng - a.lng)
  const aH   = Math.sin(dLat / 2) ** 2 +
               Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(aH), Math.sqrt(1 - aH))
}

let kdTreeCache = null  // In-memory KD-tree per cafe

/**
 * Find the nearest table to given GPS coords.
 * Uses Redis for table coords (0 DB hits on GPS path).
 * @returns {{ table, distanceMeters }} | null
 */
export const findNearestTable = async (cafeId, lat, lng) => {
  const cacheKey = cache.KEYS.tableCoords(cafeId)

  // Try Redis first (0 DB hit path)
  let tableCoords = await cache.get(cacheKey)

  if (!tableCoords) {
    // Cache miss — load from DB once, store in Redis indefinitely
    const tables = await Table.find({ cafeId, isActive: true })
      .select('_id tableNumber lat lng radiusMeters zone')
      .lean()

    tableCoords = tables.map((t) => ({
      _id:          t._id.toString(),
      tableNumber:  t.tableNumber,
      lat:          t.lat,
      lng:          t.lng,
      radiusMeters: t.radiusMeters,
      zone:         t.zone,
    }))

    // Store without TTL — invalidated on table update
    await cache.set(cacheKey, tableCoords)
  }

  if (!tableCoords.length) return null

  // Build KD-Tree from cached coords
  const tree = new KDTree(tableCoords, haversineDistance, ['lat', 'lng'])

  // Find nearest table
  const [[nearest]] = tree.nearest({ lat, lng }, 1)
  if (!nearest) return null

  const distanceMeters = haversineDistance({ lat, lng }, { lat: nearest.lat, lng: nearest.lng })

  // Check if within table's detection radius
  if (distanceMeters > nearest.radiusMeters) {
    return null  // Not within any table boundary
  }

  return { table: nearest, distanceMeters }
}

/**
 * Invalidate KD-Tree cache for a cafe (call after table create/update/delete).
 */
export const invalidateTableCache = async (cafeId) => {
  await cache.del(cache.KEYS.tableCoords(cafeId))
}