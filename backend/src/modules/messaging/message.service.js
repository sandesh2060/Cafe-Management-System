// backend/src/modules/messaging/message.service.js
//
// Clean service layer — all business logic here, controller stays thin.
// FIXES:
// ✅ getThreads returns properly shaped { threadId, participantId, name, role, lastMessage, unread, updatedAt }
// ✅ Uses User.populate for participant name/role instead of raw ObjectIds
// ✅ getThread uses threadId field (O(1) index) instead of aggregation
// ✅ sendMessage emits socket event for real-time delivery
// ✅ markRead uses threadId field

import mongoose from 'mongoose'
import Message  from './message.model.js'
import User     from '../user/user.model.js'

// ── Build deterministic threadId ──────────────────────────────────────────────
export const buildThreadId = (a, b) =>
  [a.toString(), b.toString()].sort().join('_')

// ── GET /messages/threads ─────────────────────────────────────────────────────
// Returns all threads for the current user, shaped for the frontend.
export const getThreads = async (userId, cafeId) => {
  const uid = userId.toString()

  // Find all distinct threadIds involving this user
  const threadIds = await Message.distinct('threadId', {
    cafeId,
    $or: [{ fromUserId: userId }, { toUserId: userId }],
  })

  if (!threadIds.length) return []

  // For each thread, get the last message + unread count
  const threads = await Promise.all(
    threadIds.map(async (threadId) => {
      const [lastMsg, unread] = await Promise.all([
        Message.findOne({ threadId }).sort({ createdAt: -1 }).lean(),
        Message.countDocuments({ threadId, toUserId: userId, readAt: null }),
      ])
      if (!lastMsg) return null

      // Find the OTHER participant
      const participantId =
        lastMsg.fromUserId.toString() === uid
          ? lastMsg.toUserId
          : lastMsg.fromUserId

      const participant = await User.findById(participantId)
        .select('name role isActive')
        .lean()

      if (!participant) return null

      return {
        threadId,
        participantId: participant._id.toString(),
        name:          participant.name,
        role:          participant.role,
        isActive:      participant.isActive,
        lastMessage:   lastMsg.content,
        isSelf:        lastMsg.fromUserId.toString() === uid,
        unread,
        updatedAt:     lastMsg.createdAt,
      }
    })
  )

  return threads
    .filter(Boolean)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

// ── GET /messages/thread/:threadId ────────────────────────────────────────────
export const getThread = async (threadId, userId, cafeId, { before, limit = 30 } = {}) => {
  // Verify user is part of this thread
  const parts = threadId.split('_')
  if (!parts.includes(userId.toString())) {
    throw Object.assign(new Error('Not authorized for this thread'), { status: 403 })
  }

  const query = { threadId, cafeId }
  if (before) query.createdAt = { $lt: new Date(before) }

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean()

  return messages.reverse()
}

// ── GET /messages/:userId (direct by userId — WaiterChatPanel uses this) ─────
export const getMessagesByUserId = async (myId, otherUserId, cafeId, { before, limit = 30 } = {}) => {
  const threadId = buildThreadId(myId, otherUserId)
  return getThread(threadId, myId, cafeId, { before, limit })
}

// ── POST /messages/send ───────────────────────────────────────────────────────
export const sendMessage = async ({ fromUserId, fromRole, toUserId, cafeId, content, orderRef, itemRef, type = 'text' }, io) => {
  const threadId = buildThreadId(fromUserId, toUserId)

  const msg = await Message.create({
    cafeId,
    threadId,
    fromUserId,
    fromRole,
    toUserId,
    content:  content.slice(0, 1000),
    orderRef: orderRef || null,
    itemRef:  itemRef  || null,
    type,
  })

  const plain = msg.toObject()
  const payload = {
    ...plain,
    _id:      plain._id.toString(),
    threadId,
  }

  // Real-time delivery to recipient
  if (io) {
    io.to(`user:${toUserId.toString()}`).emit('message:received', {
      ...payload,
      notification: {
        type:    'message',
        title:   `💬 New message`,
        message: content.slice(0, 60),
        soundKey: 'newMessage',
      },
    })
    // Echo back to sender (handles multiple tabs/devices)
    io.to(`user:${fromUserId.toString()}`).emit('message:sent', payload)
  }

  return payload
}

// ── PATCH /messages/thread/:threadId/read ─────────────────────────────────────
export const markThreadRead = async (threadId, userId) => {
  await Message.updateMany(
    { threadId, toUserId: userId, readAt: null },
    { readAt: new Date() }
  )
}

// ── GET /messages/unread-count ─────────────────────────────────────────────────
export const getUnreadCount = async (userId, cafeId) => {
  return Message.countDocuments({ cafeId, toUserId: userId, readAt: null })
}