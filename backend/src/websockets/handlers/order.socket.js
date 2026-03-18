// backend/src/websockets/handlers/order.socket.js
//
// FIXES:
// ✅ createOrderNotification called for order:pending, delivered, paid, cancelled
//    These are the "important" events that persist to DB and survive page refresh
// ✅ createOrderNotification called for preparing and on_the_way (session notifications)
// ✅ All other socket emit logic unchanged

import Order from '../../modules/order/order.model.js'
import { emitToUser, emitToRole } from '../index.js'
import { createOrderNotification } from '../../modules/notification/notification.controller.js'

export default (io, socket) => {
  const { user, cafeId } = socket

  // Kitchen updates order status
  socket.on('order:update-status', async ({ orderId, status }) => {
    try {
      const update = { status }
      const now    = new Date()
      if (status === 'preparing')  update.preparingAt  = now
      if (status === 'on_the_way') update.onTheWayAt   = now
      if (status === 'delivered')  update.deliveredAt  = now
      if (status === 'cancelled')  update.cancelledAt  = now

      const order = await Order.findByIdAndUpdate(orderId, update, { new: true }).lean()
      if (!order) return socket.emit('error', { message: 'Order not found' })

      const customerId = order.customerId.toString()

      // ✅ Create persistent notification for important status changes
      await createOrderNotification({ order, status, cafeId })

      // Notify customer via socket (immediate)
      const statusEvents = {
        preparing:  'order:preparing',
        on_the_way: 'order:on_the_way',
        delivered:  'order:delivered',
        cancelled:  'order:cancelled',
      }
      const event = statusEvents[status]
      if (event) {
        emitToUser(customerId, event, {
          orderId, status, tableId: order.tableId, order,
        })
      }

      // Notify waiter if on_the_way
      if (status === 'on_the_way' && order.waiterId) {
        emitToUser(order.waiterId.toString(), 'order:ready-pickup', {
          orderId, tableId: order.tableId, tableNumber: order.tableNumber, items: order.items,
        })
      }

      // Broadcast to manager
      emitToRole('manager', cafeId, 'order:status-changed', { orderId, status, order })
    } catch (err) {
      socket.emit('error', { message: 'Failed to update order status' })
    }
  })

  // New order placed — notify kitchen + waiters + create DB notification
  socket.on('order:new', async ({ orderId }) => {
    try {
      const order = await Order.findById(orderId).lean()
      if (!order) return

      // ✅ Create persistent notification for customer (order confirmed)
      await createOrderNotification({ order, status: 'pending', cafeId })

      emitToRole('kitchen', cafeId, 'order:new', {
        order,
        notification: {
          type: 'newOrder', title: '🔔 New Order!',
          message: `Table ${order.tableNumber} — ${order.items?.length} items`,
          soundKey: 'newOrderBell',
        },
      })
      emitToRole('waiter', cafeId, 'order:new', {
        order,
        notification: { type: 'newOrder', title: '📋 New Order', message: `New order from Table ${order.tableNumber}`, soundKey: 'newOrder' },
      })
    } catch (err) {
      console.error('[Order socket] Failed to broadcast new order:', err.message)
    }
  })
}