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

// Bug fix #A: cap how much device accuracy can inflate the effective radius.
// Without this, a device reporting 500m accuracy (common indoors on first fix)
// would make effectiveRadius=500m and match ANY table in the café — or even
// tables in a different building entirely.
const GPS_ACCURACY_CAP_METERS = 50

/**
 * Find the nearest table to given GPS coords.
 * No KD-tree needed — with ≤ ~50 tables a linear scan is instant.
 *
 * effectiveRadius = max(
 *   table.radiusMeters,
 *   min(deviceGpsAccuracy, GPS_ACCURACY_CAP),   ← Bug fix #A
 *   GPS_ACCURACY_FLOOR_METERS
 * )
 *
 * @param {string}      cafeId
 * @param {number}      lat
 * @param {number}      lng
 * @param {number|null} gpsAccuracy  device-reported accuracy in metres
 * @returns {{ table, distanceMeters }} | null
 */
export const findNearestTable = async (cafeId, lat, lng, gpsAccuracy = null) => {
  // Bug fix #B: validate coords before doing any work.
  // A lat of 0 or null would silently match the wrong table or crash haversine.
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    console.warn('[GPS Detect] ❌ Invalid coordinates:', lat, lng)
    return null
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    console.warn('[GPS Detect] ❌ Coordinates out of range:', lat, lng)
    return null
  }

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

  // Linear scan — find the closest table that is within its effective radius
  // Bug fix #C: previously we found the nearest table globally then checked
  // its radius. This means if the nearest table was 500m away but within its
  // (inflated) radius, it would match — even if there was a closer table that
  // was just slightly outside its radius. Fix: score all candidates, pick
  // the one with the best (distance / effectiveRadius) ratio ≤ 1.0.
  let bestCandidate = null
  let bestRatio     = Infinity

  for (const table of tableCoords) {
    const dist = haversineDistance({ lat, lng }, { lat: table.lat, lng: table.lng })

    const effectiveRadius = Math.max(
      table.radiusMeters,
      Math.min(gpsAccuracy ?? 0, GPS_ACCURACY_CAP_METERS),  // Bug fix #A
      GPS_ACCURACY_FLOOR_METERS,
    )

    const ratio = dist / effectiveRadius   // < 1.0 means inside the geofence

    console.log(
      `[GPS Detect] table=${table.tableNumber}` +
      ` dist=${dist.toFixed(1)}m` +
      ` effectiveRadius=${effectiveRadius.toFixed(1)}m` +
      ` ratio=${ratio.toFixed(2)}` +
      ` (tableRadius=${table.radiusMeters}m, deviceAccuracy=${gpsAccuracy ?? 'unknown'}m)`
    )

    if (ratio <= 1.0 && ratio < bestRatio) {
      bestRatio     = ratio
      bestCandidate = { table, distanceMeters: dist }
    }
  }

  if (!bestCandidate) {
    console.log('[GPS Detect] ❌ No table within effective radius of any candidate')
    return null
  }

  console.log(
    `[GPS Detect] ✅ Matched ${bestCandidate.table.tableNumber}` +
    ` at ${bestCandidate.distanceMeters.toFixed(1)}m` +
    ` (ratio=${bestRatio.toFixed(2)})`
  )

  return bestCandidate
}

/**
 * Call after any table create/update/delete so the next GPS request
 * reloads fresh coordinates from MongoDB.
 */
export const invalidateTableCache = async (cafeId) => {
  await cache.del(cache.KEYS.tableCoords(cafeId))
}