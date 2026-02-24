// src/modules/table-session/tableSession.service.js
import { v4 as uuid }        from 'uuid'
import TableSession           from './tableSession.model.js'
import { findNearestTable }   from './algorithms/nearestTable.js'
import { verifyQrToken }      from './algorithms/qrHmacVerify.js'
import { cache }              from '../../config/redis.js'
import { AppError }           from '../../shared/utils/AppError.js'

export const detectByGps = async ({ userId, cafeId, latitude, longitude, confidenceScore }) => {
  const result = await findNearestTable(cafeId, latitude, longitude)
  if (!result) throw new AppError('No table found at your location', 404)

  return createSession({
    userId, cafeId,
    tableId:         result.table._id,
    detectionMethod: 'gps',
    gpsAccuracy:     null,
    confidenceScore,
    tableNumber:     result.table.tableNumber,
    zone:            result.table.zone,
  })
}

export const detectByQr = async ({ userId, token }) => {
  const { table, cafeId } = await verifyQrToken(token)

  return createSession({
    userId, cafeId,
    tableId:         table._id,
    detectionMethod: 'qr',
    confidenceScore: 100,
    tableNumber:     table.tableNumber,
    zone:            table.zone,
  })
}

const createSession = async ({ userId, cafeId, tableId, detectionMethod, gpsAccuracy, confidenceScore, tableNumber, zone }) => {
  // Close any existing active session for this table
  await TableSession.findOneAndUpdate(
    { tableId, status: 'active' },
    { status: 'closed', closedAt: new Date() }
  )

  const sessionId = uuid()
  const session = await TableSession.create({
    sessionId,
    tableId,
    cafeId,
    detectionMethod,
    gpsAccuracy,
    confidenceScore,
    users: [userId],
    status: 'active',
  })

  // Cache session in Redis (O(1) future lookups)
  await cache.set(cache.KEYS.session(sessionId), {
    sessionId,
    tableId:     tableId.toString(),
    cafeId:      cafeId.toString(),
    tableNumber,
    zone,
    detectionMethod,
    confidenceScore,
    userId:      userId.toString(),
    openedAt:    session.openedAt,
  }, cache.TTL.SESSION)

  return {
    session: {
      sessionId,
      tableId:     tableId.toString(),
      cafeId:      cafeId.toString(),
      tableNumber,
      zone,
      detectionMethod,
      confidenceScore,
    },
    table: { tableNumber, zone },
  }
}

export const closeSession = async (sessionId) => {
  await TableSession.findOneAndUpdate(
    { sessionId },
    { status: 'closed', closedAt: new Date() }
  )
  await cache.del(cache.KEYS.session(sessionId))
}

export const heartbeat = async (sessionId) => {
  await TableSession.findOneAndUpdate({ sessionId }, { lastHeartbeat: new Date() })
  // Refresh Redis TTL
  const cached = await cache.get(cache.KEYS.session(sessionId))
  if (cached) await cache.set(cache.KEYS.session(sessionId), cached, cache.TTL.SESSION)
}