// backend/src/modules/notification/notification.controller.js
import Notification       from './notification.model.js'
import { emitToUser }     from '../../websockets/index.js'
import AppError           from '../../shared/utils/AppError.js'
import { sendSuccess }    from '../../shared/utils/response.js'

// ── Create + emit (called internally by other controllers) ────────────────────
export const createAndEmit = async ({ userId, cafeId, type, title, message, data = {} }) => {
  const notif = await Notification.create({ userId, cafeId, type, title, message, data })
  // Push to client in real-time
  emitToUser(userId.toString(), 'notification:new', {
    notification: {
      id:        notif._id.toString(),
      type:      notif.type,
      title:     notif.title,
      message:   notif.message,
      data:      notif.data,
      read:      false,
      createdAt: notif.createdAt,
    },
  })
  return notif
}

// ── GET /api/notifications — paginated list for current user ──────────────────
export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id
    const limit  = Math.min(parseInt(req.query.limit) || 30, 50)
    const skip   = parseInt(req.query.skip) || 0

    const [items, total, unread] = await Promise.all([
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ userId }),
      Notification.countDocuments({ userId, read: false }),
    ])

    sendSuccess(res, { items, total, unread, skip, limit }, 'OK')
  } catch (err) { next(err) }
}

// ── PATCH /api/notifications/read-all ─────────────────────────────────────────
export const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true })
    sendSuccess(res, null, 'All marked read')
  } catch (err) { next(err) }
}

// ── PATCH /api/notifications/:id/read ────────────────────────────────────────
export const markOneRead = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    )
    if (!notif) throw new AppError('Notification not found', 404)
    sendSuccess(res, notif, 'Marked read')
  } catch (err) { next(err) }
}

// ── DELETE /api/notifications — clear all ────────────────────────────────────
export const clearAll = async (req, res, next) => {
  try {
    await Notification.deleteMany({ userId: req.user._id })
    sendSuccess(res, null, 'Cleared')
  } catch (err) { next(err) }
}