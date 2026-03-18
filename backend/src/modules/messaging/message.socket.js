// backend/src/websockets/handlers/message.socket.js
//
// FIXES:
// ✅ Uses service layer (message.service.js) for consistent threadId computation
// ✅ message:send emits to BOTH recipient AND sender (multi-device/multi-tab support)
// ✅ message:read uses threadId-based markThreadRead
// ✅ Emits message:read-receipt back to sender so checkmarks update in real-time

import * as svc from '../../modules/messaging/message.service.js'

export default (io, socket) => {
  const { user, cafeId } = socket

  // ── message:send ──────────────────────────────────────────────────────────
  // Real-time send — fires when user presses Enter or Send button in any chat UI.
  // Service handles DB save + socket emit to both parties.
  socket.on('message:send', async ({ toUserId, content, orderRef, itemRef, type = 'text' }) => {
    if (!toUserId || !content?.trim()) return

    try {
      await svc.sendMessage({
        fromUserId: user._id,
        fromRole:   user.role,
        toUserId,
        cafeId,
        content,
        orderRef,
        itemRef,
        type,
      }, io)
    } catch (err) {
      socket.emit('error', { message: 'Failed to send message', detail: err.message })
    }
  })

  // ── message:read ──────────────────────────────────────────────────────────
  // Marks all messages in a thread as read and notifies the sender.
  socket.on('message:read', async ({ threadId, fromUserId }) => {
    try {
      await svc.markThreadRead(threadId, user._id)
      // Notify the original sender so their checkmarks update
      if (fromUserId) {
        io.to(`user:${fromUserId}`).emit('message:read-receipt', {
          threadId,
          readAt: new Date().toISOString(),
          byUserId: user._id.toString(),
        })
      }
    } catch {
      // Silent — read receipts are non-critical
    }
  })
}