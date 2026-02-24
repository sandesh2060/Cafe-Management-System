// src/websockets/handlers/logout.socket.js
import TableSession from '../../modules/table-session/tableSession.model.js'
import { emitToRole, emitToUser } from '../index.js'
import { cache } from '../../config/redis.js'

export default (io, socket) => {
  const { user, cafeId } = socket

  // Customer reports geofence exit
  socket.on('session:abandoned', async ({ sessionId, reason }) => {
    try {
      await TableSession.findOneAndUpdate(
        { sessionId },
        { status: 'abandoned' }
      )

      // Set geofence grace timer in Redis
      await cache.set(
        cache.KEYS.geofenceExit(user._id),
        { sessionId, exitedAt: new Date(), reason },
        cache.TTL.GEOFENCE_GRACE
      )

      // Alert manager
      emitToRole('manager', cafeId, 'session:abandoned', {
        sessionId,
        customerId:  user._id,
        customerName: user.name,
        reason,
        timestamp:   new Date(),
        notification: {
          type:    'sessionAbandoned',
          title:   '⚠️ Session Abandoned',
          message: `${user.name} has left the geofence`,
          soundKey: 'sessionAbandoned',
        },
      })

      // Alert waiter for the table
      emitToRole('waiter', cafeId, 'session:customer-left', {
        sessionId,
        customerId: user._id,
      })
    } catch (err) {
      console.error('[Logout socket] session:abandoned error:', err.message)
    }
  })

  // Cashier confirms payment → trigger Rule 3 auto-logout
  socket.on('payment:confirmed', async ({ orderId, customerId, pointsEarned, tierUpgraded, newTier, totalAmount }) => {
    try {
      // Notify customer → triggers Rule 3 auto-logout on client
      emitToUser(customerId, 'order:payment_confirmed', {
        orderId,
        pointsEarned:  pointsEarned  || 0,
        tierUpgraded:  tierUpgraded  || false,
        newTier:       newTier       || null,
        totalAmount:   totalAmount   || 0,
      })
    } catch (err) {
      console.error('[Logout socket] payment:confirmed error:', err.message)
    }
  })
}