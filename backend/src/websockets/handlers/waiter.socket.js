// src/websockets/handlers/waiter.socket.js
import Order        from '../../modules/order/order.model.js'
import TableSession from '../../modules/table-session/tableSession.model.js'
import { emitToUser, emitToRole } from '../index.js'

export const registerWaiterHandlers = (io, socket) => {
  const { userId, cafeId, role } = socket

  if (!['waiter', 'manager', 'admin'].includes(role)) return

  // waiter:delivered  — waiter marks order as delivered to table
  socket.on('waiter:delivered', async ({ orderId }) => {
    try {
      const order = await Order.findById(orderId)
      if (!order || order.cafeId.toString() !== cafeId) return

      order.status      = 'delivered'
      order.deliveredAt = new Date()
      order.waiterId    = userId
      await order.save()

      emitToUser(order.customerId.toString(), 'order:delivered', {
        orderId:  order._id,
        notification: { message: '🍽️ Your order has been delivered. Enjoy!', timestamp: new Date() },
        soundKey: 'orderDelivered',
      })

      socket.emit('waiter:delivered:ack', { orderId, status: 'delivered' })
    } catch {
      socket.emit('error', { message: 'Failed to mark delivered' })
    }
  })

  // waiter:table-free  — waiter marks table as available after guests leave
  socket.on('waiter:table-free', async ({ sessionId }) => {
    try {
      const session = await TableSession.findOne({ sessionId })
      if (!session) return
      session.status   = 'closed'
      session.closedAt = new Date()
      await session.save()

      // Notify manager
      emitToRole('manager', cafeId, 'table:freed', {
        tableId:     session.tableId,
        sessionId,
        notification: { message: `Table freed by waiter`, timestamp: new Date() },
      })

      socket.emit('waiter:table-free:ack', { sessionId })
    } catch {
      socket.emit('error', { message: 'Failed to free table' })
    }
  })

  // waiter:request-help — waiter requests manager help
  socket.on('waiter:request-help', ({ message: msg, tableId }) => {
    emitToRole('manager', cafeId, 'staff:help-request', {
      fromRole: 'waiter',
      fromUserId: userId,
      tableId,
      message: msg,
      notification: { message: `Waiter needs help at Table`, timestamp: new Date() },
      soundKey: 'staffAlert',
    })
  })
}
