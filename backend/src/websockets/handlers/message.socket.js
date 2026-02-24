// src/websockets/handlers/message.socket.js
import Message from '../../modules/messaging/message.model.js'
import { emitToUser } from '../index.js'

export default (io, socket) => {
  const { user, cafeId } = socket

  socket.on('message:send', async ({ toUserId, content, orderRef, itemRef, type = 'text' }) => {
    try {
      const msg = await Message.create({
        cafeId,
        fromUserId: user._id,
        fromRole:   user.role,
        toUserId,
        toRole:     null,    // Will be resolved by service if needed
        content:    content.slice(0, 1000),
        orderRef:   orderRef || null,
        itemRef:    itemRef  || null,
        type,
      })

      const payload = {
        ...msg.toObject(),
        threadId: [user._id.toString(), toUserId].sort().join('_'),
        notification: {
          type:    'newMessage',
          title:   `💬 ${user.name}`,
          message: content.slice(0, 50),
          soundKey: 'newMessage',
        },
      }

      // Deliver to recipient
      emitToUser(toUserId, 'message:received', payload)
      // Confirm to sender
      socket.emit('message:sent', payload)
    } catch (err) {
      socket.emit('error', { message: 'Failed to send message' })
    }
  })

  socket.on('message:read', async ({ threadId, fromUserId }) => {
    try {
      await Message.updateMany(
        { fromUserId, toUserId: user._id, readAt: null },
        { readAt: new Date() }
      )
      emitToUser(fromUserId, 'message:read-receipt', { threadId, readAt: new Date() })
    } catch (err) {
      // Silent fail
    }
  })
}