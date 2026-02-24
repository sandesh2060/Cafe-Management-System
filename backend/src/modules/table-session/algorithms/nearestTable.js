// src/modules/table-session/algorithms/nearestTable.js
import Table     from '../../table/table.model.js'
import { cache } from '../../../config/redis.js'

const haversineDistance = (a, b) => {
  const R    = 6371000
  const toR  = (d) => (d * Math.PI) / 180
  const dLat = toR(b.lat - a.lat)
  const dLng = toR(b.lng - a.lng)
  const aH   = Math.sin(dLat / 2) ** 2 +
               Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(aH), Math.sqrt(1 - aH))
}

// Phone GPS indoors is never reliably more accurate than this
const GPS_ACCURACY_FLOOR_METERS = 15

/**
 * Find the nearest table to given GPS coords.
 * No KD-tree needed — with ≤ ~50 tables a linear scan is instant.
 *
 * effectiveRadius = max(table.radiusMeters, deviceGpsAccuracy, GPS_ACCURACY_FLOOR_METERS)
 *
 * @param {string}      cafeId
 * @param {number}      lat
 * @param {number}      lng
 * @param {number|null} gpsAccuracy  device-reported accuracy in metres
 * @returns {{ table, distanceMeters }} | null
 */
export const findNearestTable = async (cafeId, lat, lng, gpsAccuracy = null) => {
  const cacheKey = cache.KEYS.tableCoords(cafeId)

  let tableCoords = await cache.get(cacheKey)

  // Redis may return a raw JSON string — always normalise
  if (typeof tableCoords === 'string') {
    try { tableCoords = JSON.parse(tableCoords) } catch { tableCoords = null }
  }

  if (!tableCoords || !Array.isArray(tableCoords) || tableCoords.length === 0) {
    const tables = await Table.find({ cafeId, isActive: true })
      .select('_id tableNumber lat lng radiusMeters zone')
      .lean()

    if (!tables.length) return null

    tableCoords = tables.map((t) => ({
      _id:          t._id.toString(),
      tableNumber:  t.tableNumber,
      lat:          t.lat,
      lng:          t.lng,
      radiusMeters: t.radiusMeters,
      zone:         t.zone,
    }))

    await cache.set(cacheKey, tableCoords)
  }

  // Linear scan — find the closest table
  let nearest      = null
  let nearestDist  = Infinity

  for (const table of tableCoords) {
    const dist = haversineDistance({ lat, lng }, { lat: table.lat, lng: table.lng })
    if (dist < nearestDist) {
      nearestDist = dist
      nearest     = table
    }
  }

  if (!nearest) return null

  // effectiveRadius = max of:
  //   table.radiusMeters  — ideal configured radius
  //   gpsAccuracy         — device-reported accuracy (e.g. 35 m indoors)
  //   GPS_ACCURACY_FLOOR  — absolute minimum floor
  const effectiveRadius = Math.max(
    nearest.radiusMeters,
    gpsAccuracy ?? 0,
    GPS_ACCURACY_FLOOR_METERS
  )

  console.log(
    `[GPS Detect] nearest=${nearest.tableNumber}` +
    ` dist=${nearestDist.toFixed(1)}m` +
    ` effectiveRadius=${effectiveRadius}m` +
    ` (tableRadius=${nearest.radiusMeters}m, deviceAccuracy=${gpsAccuracy ?? 'unknown'}m)`
  )

  if (nearestDist > effectiveRadius) {
    console.log(`[GPS Detect] ❌ No match — too far`)
    return null
  }

  console.log(`[GPS Detect] ✅ Matched ${nearest.tableNumber} at ${nearestDist.toFixed(1)}m`)
  return { table: nearest, distanceMeters: nearestDist }
}

/**
 * Call after any table create/update/delete so the next GPS request
 * reloads fresh coordinates from MongoDB.
 */
export const invalidateTableCache = async (cafeId) => {
  await cache.del(cache.KEYS.tableCoords(cafeId))
}