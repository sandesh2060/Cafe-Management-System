// src/websockets/handlers/waiterCall.socket.js
import WaiterCall from '../../modules/waiter-call/waiterCall.model.js'
import { emitToRole, emitToUser } from '../index.js'

export default (io, socket) => {
  const { user, cafeId } = socket

  // Customer sends call request (also handled via REST, but socket gives instant delivery)
  socket.on('waiter:call-request', async (data) => {
    try {
      const { callId, reasons, note, tableId, sessionId, orderId } = data

      // Update call in DB with assigned waiter (or broadcast to all waiters)
      await WaiterCall.findByIdAndUpdate(callId, { status: 'pending' })

      // Notify all waiters in this cafe
      emitToRole('waiter', cafeId, 'waiter:call-incoming', {
        callId,
        tableId,
        sessionId,
        orderId,
        reasons,
        note,
        customerId: user._id,
        requestedAt: new Date(),
        notification: {
          type:    'waiterCall',
          title:   '🔔 Customer Call',
          message: `Table call: ${reasons.slice(0, 2).join(', ')}`,
        },
      })
    } catch (err) {
      socket.emit('error', { message: 'Failed to forward call request' })
    }
  })

  // Waiter acknowledges call
  socket.on('waiter:acknowledge', async ({ callId, customerId }) => {
    try {
      await WaiterCall.findByIdAndUpdate(callId, {
        waiterId:        user._id,
        status:          'acknowledged',
        acknowledgedAt:  new Date(),
      })
      emitToUser(customerId, 'waiter:acknowledged', {
        callId,
        waiterId:    user._id,
        waiterName:  user.name,
        notification: {
          type:    'waiterCall',
          title:   '✅ Waiter Notified',
          message: `${user.name} is on the way!`,
        },
      })
    } catch (err) {
      socket.emit('error', { message: 'Failed to acknowledge call' })
    }
  })

  // Waiter marks on the way
  socket.on('waiter:on_the_way', async ({ callId, customerId }) => {
    try {
      await WaiterCall.findByIdAndUpdate(callId, {
        status:      'on_the_way',
        onTheWayAt:  new Date(),
      })
      emitToUser(customerId, 'waiter:on_the_way', {
        callId,
        waiterName: user.name,
        notification: {
          type:    'waiterCall',
          title:   '🏃 Waiter Coming!',
          message: `${user.name} is on the way to your table.`,
        },
      })
    } catch (err) {
      socket.emit('error', { message: 'Failed to update call status' })
    }
  })

  // Waiter marks done
  socket.on('waiter:call-done', async ({ callId, customerId }) => {
    try {
      await WaiterCall.findByIdAndUpdate(callId, {
        status:     'done',
        resolvedAt: new Date(),
      })
      emitToUser(customerId, 'waiter:call-done', { callId })
    } catch (err) {
      socket.emit('error', { message: 'Failed to resolve call' })
    }
  })
}