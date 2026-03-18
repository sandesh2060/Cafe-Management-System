// backend/src/modules/notification/notification.controller.js
//
// CHANGES:
// ✅ createOrderNotification — full status map including kitchen/preparing/on_the_way
// ✅ createLoyaltyNotification — called when loyalty tier upgrades (important=true)
// ✅ important flag passed correctly to model (drives TTL: 30d vs 7d)
// ✅ REST: GET /notifications, PATCH /read-all, PATCH /:id/read, DELETE /
// ✅ createAndEmit — unchanged, still non-fatal

import Notification   from './notification.model.js'
import { emitToUser } from '../../websockets/index.js'
import AppError       from '../../shared/utils/AppError.js'
import { sendSuccess } from '../../shared/utils/response.js'

// ── Internal: create + emit ───────────────────────────────────────────────────
export const createAndEmit = async ({
  userId, cafeId, type, title, message,
  data = {}, important = false,
}) => {
  try {
    const notif = await Notification.create({
      userId, cafeId, type, title, message, data, important,
    })
    emitToUser(userId.toString(), 'notification:new', {
      _id:       notif._id.toString(),
      id:        notif._id.toString(),
      type:      notif.type,
      title:     notif.title,
      message:   notif.message,
      data:      notif.data,
      important: notif.important,
      read:      false,
      createdAt: notif.createdAt,
    })
    return notif
  } catch (err) {
    console.error('[Notification] createAndEmit failed:', err.message)
    return null
  }
}

// ── Order notifications ───────────────────────────────────────────────────────
// Called from order.socket.js — status determines persistence & importance
export const createOrderNotification = async ({ order, status, cafeId }) => {
  if (!order?.customerId) return

  const statusMap = {
    pending: {
      title:     '✅ Order confirmed!',
      message:   'Your order has been received. Kitchen is on it!',
      type:      'order',
      important: true,   // persist 30 days
    },
    preparing: {
      title:     '👨‍🍳 Chef is cooking!',
      message:   "Your order is being prepared. Shouldn't be long.",
      type:      'kitchen',
      important: false,  // persist 7 days
    },
    on_the_way: {
      title:     '🏃 Food is on the way!',
      message:   'Your waiter is bringing your order to the table.',
      type:      'order',
      important: false,
    },
    delivered: {
      title:     '🍽️ Your food has arrived!',
      message:   'Everything is at your table. Enjoy your meal!',
      type:      'payment',
      important: true,
    },
    paid: {
      title:     '✅ Payment confirmed!',
      message:   'Your bill is settled. Thank you for visiting!',
      type:      'payment',
      important: true,
    },
    cancelled: {
      title:     '❌ Order cancelled',
      message:   'Your order was cancelled. You can place a new one.',
      type:      'order',
      important: false,
    },
  }

  const cfg = statusMap[status]
  if (!cfg) return

  await createAndEmit({
    userId:    order.customerId,
    cafeId:    cafeId ?? order.cafeId,
    type:      cfg.type,
    title:     cfg.title,
    message:   cfg.message,
    data:      {
      orderId:     order._id?.toString(),
      status,
      tableNumber: order.tableNumber,
    },
    important: cfg.important,
  })
}

// ── Loyalty tier upgrade notification ─────────────────────────────────────────
// Call this from loyalty.service.js when tier changes
export const createLoyaltyNotification = async ({ userId, cafeId, tier, points }) => {
  const tierMap = {
    bronze: { title: '🥉 You reached Bronze!',  message: `You've earned enough points to reach Bronze tier. Keep going!` },
    silver: { title: '🥈 You reached Silver!',  message: `Silver tier unlocked! You're one of our valued regulars.` },
    gold:   { title: '🥇 You reached Gold!',    message: `Gold tier! You're a legend at ${BRAND_NAME}. Thank you!` },
  }
  const cfg = tierMap[tier]
  if (!cfg) return
  await createAndEmit({
    userId, cafeId,
    type:      'loyalty',
    title:     cfg.title,
    message:   cfg.message,
    data:      { tier, points },
    important: true,  // persist 30 days — loyalty milestone is important
  })
}

// ── Message notifications ─────────────────────────────────────────────────────
export const createMessageNotification = async ({ toUserId, fromName, cafeId, content }) => {
  await createAndEmit({
    userId:  toUserId,
    cafeId,
    type:    'message',
    title:   `💬 ${fromName}`,
    message: content.slice(0, 80),
    data:    { fromName },
    important: false,
  })
}

// ── REST handlers ─────────────────────────────────────────────────────────────

// GET /notifications?limit=30&skip=0
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

// PATCH /notifications/read-all
export const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true })
    sendSuccess(res, null, 'All marked read')
  } catch (err) { next(err) }
}

// PATCH /notifications/:id/read
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

// DELETE /notifications
export const clearAll = async (req, res, next) => {
  try {
    await Notification.deleteMany({ userId: req.user._id })
    sendSuccess(res, null, 'Cleared')
  } catch (err) { next(err) }
}

// Placeholder so import doesn't break if you haven't set up brand name yet
const BRAND_NAME = process.env.CAFE_NAME || 'our café'