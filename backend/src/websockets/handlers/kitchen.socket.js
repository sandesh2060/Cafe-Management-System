// src/websockets/handlers/kitchen.socket.js
import Order from '../../modules/order/order.model.js'
import { emitToRole, emitToUser } from '../index.js'

export const registerKitchenHandlers = (io, socket) => {
  const { cafeId, role } = socket

  if (!['kitchen', 'manager', 'admin'].includes(role)) return

  // kitchen:order-start  — kitchen starts preparing
  socket.on('kitchen:order-start', async ({ orderId }) => {
    try {
      const order = await Order.findById(orderId)
      if (!order || order.cafeId.toString() !== cafeId) return

      order.status     = 'preparing'
      order.preparingAt = new Date()
      await order.save()

      // Notify customer
      emitToUser(order.customerId.toString(), 'order:preparing', {
        orderId: order._id,
        notification: { message: '👨‍🍳 Your order is being prepared!', timestamp: new Date() },
        soundKey: 'orderPreparing',
      })

      // Notify waiters
      emitToRole('waiter', cafeId, 'order:status-changed', {
        orderId: order._id, status: 'preparing', tableId: order.tableId,
      })

      socket.emit('kitchen:order-start:ack', { orderId, status: 'preparing' })
    } catch (err) {
      socket.emit('error', { message: 'Failed to start order' })
    }
  })

  // kitchen:order-ready  — food ready for pickup
  socket.on('kitchen:order-ready', async ({ orderId }) => {
    try {
      const order = await Order.findById(orderId)
      if (!order || order.cafeId.toString() !== cafeId) return

      order.status    = 'on_the_way'
      order.onTheWayAt = new Date()
      await order.save()

      // Notify assigned waiter or all waiters
      const target = order.waiterId ? order.waiterId.toString() : null
      if (target) {
        emitToUser(target, 'order:ready-pickup', {
          orderId:    order._id,
          tableId:    order.tableId,
          tableNumber: order.tableNumber,
          items:      order.items,
          notification: { message: `🛎️ Order ready for Table — pick up!`, timestamp: new Date() },
          soundKey:   'orderReadyPickup',
        })
      } else {
        emitToRole('waiter', cafeId, 'order:ready-pickup', {
          orderId: order._id, tableId: order.tableId,
          items:   order.items,
          notification: { message: '🛎️ Order ready for pickup!', timestamp: new Date() },
          soundKey: 'orderReadyPickup',
        })
      }

      // Notify customer
      emitToUser(order.customerId.toString(), 'order:on_the_way', {
        orderId: order._id,
        notification: { message: '🚶 Your order is on its way!', timestamp: new Date() },
        soundKey: 'orderOnTheWay',
      })

      socket.emit('kitchen:order-ready:ack', { orderId, status: 'on_the_way' })
    } catch (err) {
      socket.emit('error', { message: 'Failed to mark order ready' })
    }
  })
}