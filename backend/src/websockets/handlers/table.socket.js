// src/websockets/handlers/table.socket.js
import TableSession from '../../modules/table-session/tableSession.model.js'
import { cache }    from '../../config/redis.js'
import { emitToRole } from '../index.js'

export const registerTableHandlers = (io, socket) => {
  const { cafeId } = socket

  // session:heartbeat  — client pings every 60s to keep session alive
  socket.on('session:heartbeat', async ({ sessionId }) => {
    try {
      await TableSession.findOneAndUpdate(
        { sessionId },
        { lastHeartbeat: new Date() }
      )
      // Refresh Redis TTL
      const cached = await cache.get(cache.KEYS.tableSession(sessionId))
      if (cached) await cache.set(cache.KEYS.tableSession(sessionId), cached, cache.TTL.SESSION)

      socket.emit('session:heartbeat:ack', { sessionId, ts: Date.now() })
    } catch {
      // Silent — heartbeat failure is non-critical
    }
  })

  // session:abandon  — customer voluntarily abandons session
  socket.on('session:abandon', async ({ sessionId }) => {
    try {
      const session = await TableSession.findOneAndUpdate(
        { sessionId },
        { status: 'abandoned', closedAt: new Date() },
        { new: true }
      )
      if (!session) return

      emitToRole('manager', cafeId, 'session:abandoned', {
        sessionId, tableId: session.tableId,
        notification: { message: `Customer left table`, timestamp: new Date() },
        soundKey: 'sessionAbandoned',
      })
      emitToRole('waiter', cafeId, 'session:customer-left', {
        sessionId, tableId: session.tableId,
      })
    } catch {}
  })
}