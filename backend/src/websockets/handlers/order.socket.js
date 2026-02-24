// src/websockets/handlers/order.socket.js
import Order from '../../modules/order/order.model.js'
import { emitToUser, emitToRole, emitToCafe } from '../index.js'

const STATUS_SOUNDS = {
  customer: {
    preparing:  'orderPreparing',
    on_the_way: 'orderReady',
    delivered:  'orderDelivered',
  },
  kitchen: {
    pending: 'newOrderBell',
    cancelled: 'orderCancelled',
  },
  waiter: {
    pending:    'newOrder',
    on_the_way: 'orderReadyPickup',
  },
}

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

      // Notify customer
      if (STATUS_SOUNDS.customer[status]) {
        emitToUser(customerId, `order:${status}`, {
          orderId,
          status,
          tableId:    order.tableId,
          notification: {
            type:    'orderStatus',
            title:   getStatusTitle(status),
            message: getStatusMessage(status),
            soundKey: STATUS_SOUNDS.customer[status],
          },
        })
      }

      // Notify waiter if on_the_way
      if (status === 'on_the_way' && order.waiterId) {
        emitToUser(order.waiterId.toString(), 'order:ready-pickup', {
          orderId,
          tableId:  order.tableId,
          tableNumber: order.tableId,
          items:    order.items,
          notification: {
            type:    'orderReady',
            title:   '📦 Order Ready!',
            message: `Order ready for pickup`,
            soundKey: 'orderReadyPickup',
          },
        })
      }

      // Broadcast to all staff in cafe
      emitToRole('manager', cafeId, 'order:status-changed', { orderId, status, order })
    } catch (err) {
      socket.emit('error', { message: 'Failed to update order status' })
    }
  })

  // New order placed — notify kitchen + waiters
  socket.on('order:new', async ({ orderId }) => {
    try {
      const order = await Order.findById(orderId).populate('items.menuItemId', 'name').lean()
      if (!order) return

      emitToRole('kitchen', cafeId, 'order:new', {
        order,
        notification: {
          type:    'newOrder',
          title:   '🔔 New Order!',
          message: `Table ${order.tableId} — ${order.items.length} items`,
          soundKey: 'newOrderBell',
        },
      })

      emitToRole('waiter', cafeId, 'order:new', {
        order,
        notification: {
          type:    'newOrder',
          title:   '📋 New Order',
          message: `New order from Table`,
          soundKey: 'newOrder',
        },
      })
    } catch (err) {
      console.error('[Order socket] Failed to broadcast new order:', err.message)
    }
  })
}

const getStatusTitle = (status) => ({
  preparing:  '👨‍🍳 Preparing Your Order',
  on_the_way: '🚶 On the Way!',
  delivered:  '✅ Order Delivered!',
  cancelled:  '❌ Order Cancelled',
}[status] || 'Order Update')

const getStatusMessage = (status) => ({
  preparing:  'Kitchen has started preparing your order.',
  on_the_way: 'Your waiter is bringing your order.',
  delivered:  'Enjoy your meal! 🍽️',
  cancelled:  'Your order has been cancelled.',
}[status] || '')