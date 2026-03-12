// backend/src/modules/order/order.controller.js
import Order              from './order.model.js'
import MenuItem           from '../menu/menu.model.js'
import AppError           from '../../shared/utils/AppError.js'
import { sendSuccess }    from '../../shared/utils/response.js'
import {
  emitToUser,
  emitToStaff,
  emitToCafe,
}                         from '../../websockets/index.js'
import { createAndEmit }  from '../notification/notification.controller.js'

// ── helpers ───────────────────────────────────────────────────────────────────
const STATUS_TIMESTAMPS = {
  pending:    null,
  preparing:  'preparingAt',
  on_the_way: 'onTheWayAt',
  delivered:  'deliveredAt',
  paid:       'paidAt',
  cancelled:  'cancelledAt',
}

const STATUS_MESSAGES = {
  pending:    { title: 'Order Placed! 🎉',       message: 'Your order is received and waiting for kitchen confirmation.' },
  preparing:  { title: 'Kitchen is Cooking! 👨‍🍳', message: 'Your order is being prepared fresh.' },
  on_the_way: { title: 'On the Way! 🏃',          message: 'Your order is on its way to your table.' },
  delivered:  { title: 'Enjoy your meal! 🍽️',     message: 'Your order has been delivered. Bon appétit!' },
  cancelled:  { title: 'Order Cancelled',         message: 'Your order has been cancelled.' },
}

const calcPoints = (total, tier) => {
  const multipliers = { none: 1, bronze: 1, silver: 1.5, gold: 2 }
  return Math.floor((total / 10) * (multipliers[tier] ?? 1))
}

// ── POST /api/orders — place order ────────────────────────────────────────────
export const placeOrder = async (req, res, next) => {
  try {
    const {
      items,        // [{ menuItemId, name, price, quantity, emoji, category, portionId, portionLabel, notes }]
      tableId,
      sessionId,
      cafeId,
      discountPct  = 0,
      loyaltyTier  = 'none',
      specialNote  = null,
    } = req.body

    if (!items?.length)  throw new AppError('Order must have at least one item', 400)
    if (!tableId)        throw new AppError('tableId is required', 400)
    if (!sessionId)      throw new AppError('sessionId is required', 400)
    if (!cafeId)         throw new AppError('cafeId is required', 400)

    // ── Validate + enrich items from DB ──────────────────────────────────────
    const menuIds = [...new Set(items.map(i => i.menuItemId))]
    const menuDocs = await MenuItem.find({ _id: { $in: menuIds }, isAvailable: true }).lean()
    const menuMap  = Object.fromEntries(menuDocs.map(d => [d._id.toString(), d]))

    const enriched = []
    let subtotal = 0

    for (const item of items) {
      const doc = menuMap[item.menuItemId]
      if (!doc) throw new AppError(`Item ${item.menuItemId} is unavailable`, 400)

      // Validate price
      let expectedPrice = doc.price
      if (item.portionId && doc.portions?.length) {
        const portion = doc.portions.find(p => p.id === item.portionId)
        if (!portion) throw new AppError(`Portion ${item.portionId} not found for ${doc.name}`, 400)
        expectedPrice = portion.price
      }

      // Allow ±5 tolerance for floating point / race conditions
      if (Math.abs(item.price - expectedPrice) > 5) {
        throw new AppError(`Price mismatch for ${doc.name}: expected ₹${expectedPrice}, got ₹${item.price}`, 400)
      }

      const lineTotal = expectedPrice * (item.quantity ?? 1)
      subtotal += lineTotal

      enriched.push({
        menuItemId:   doc._id,
        name:         doc.name,
        price:        expectedPrice,
        quantity:     item.quantity ?? 1,
        emoji:        doc.emoji ?? '🍽️',
        category:     doc.category,
        notes:        item.notes ?? null,
        portionId:    item.portionId    ?? null,
        portionLabel: item.portionLabel ?? null,
      })
    }

    const discountAmt  = Math.round(subtotal * (discountPct / 100))
    const total        = Math.round(subtotal - discountAmt)
    const pointsEarned = calcPoints(total, loyaltyTier)

    const order = await Order.create({
      tableId,
      sessionId,
      cafeId,
      customerId:  req.user._id,
      items:       enriched,
      subtotal,
      discountPct,
      discountAmt,
      total,
      loyaltyTier,
      pointsEarned,
      specialNote,
      status:      'pending',
      placedAt:    new Date(),
    })

    // ── Real-time: notify kitchen + customer ─────────────────────────────────
    const orderPayload = { order: order.toObject() }

    // Tell kitchen staff
    emitToStaff(cafeId.toString(), 'order:new', orderPayload)
    // Tell customer
    emitToUser(req.user._id.toString(), 'order:placed', orderPayload)

    // Push notification to customer
    await createAndEmit({
      userId:  req.user._id,
      cafeId,
      type:    'order',
      title:   STATUS_MESSAGES.pending.title,
      message: STATUS_MESSAGES.pending.message,
      data:    { orderId: order._id },
    })

    sendSuccess(res, { order }, 'Order placed', 201)
  } catch (err) { next(err) }
}

// ── GET /api/orders/active — current user's active order ─────────────────────
export const getActiveOrder = async (req, res, next) => {
  try {
    const ACTIVE = ['pending', 'preparing', 'on_the_way']
    const order  = await Order
      .findOne({ customerId: req.user._id, status: { $in: ACTIVE } })
      .sort({ createdAt: -1 })
      .lean()

    sendSuccess(res, { order: order ?? null }, 'OK')
  } catch (err) { next(err) }
}

// ── GET /api/orders/history ───────────────────────────────────────────────────
export const getOrderHistory = async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 20, 50)
    const skip   = parseInt(req.query.skip) || 0

    const [orders, total] = await Promise.all([
      Order.find({ customerId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments({ customerId: req.user._id }),
    ])

    sendSuccess(res, { orders, total, skip, limit }, 'OK')
  } catch (err) { next(err) }
}

// ── GET /api/orders/:id ───────────────────────────────────────────────────────
export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).lean()
    if (!order) throw new AppError('Order not found', 404)
    if (order.customerId.toString() !== req.user._id.toString())
      throw new AppError('Not authorised', 403)
    sendSuccess(res, { order }, 'OK')
  } catch (err) { next(err) }
}

// ── POST /api/orders/:id/cancel ───────────────────────────────────────────────
export const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) throw new AppError('Order not found', 404)
    if (order.customerId.toString() !== req.user._id.toString())
      throw new AppError('Not authorised', 403)
    if (!['pending'].includes(order.status))
      throw new AppError('Only pending orders can be cancelled', 400)

    order.status      = 'cancelled'
    order.cancelledAt = new Date()
    await order.save()

    emitToUser(req.user._id.toString(), 'order:cancelled', { order: order.toObject() })
    emitToStaff(order.cafeId.toString(), 'order:cancelled', { order: order.toObject() })

    await createAndEmit({
      userId:  req.user._id,
      cafeId:  order.cafeId,
      type:    'order',
      title:   STATUS_MESSAGES.cancelled.title,
      message: STATUS_MESSAGES.cancelled.message,
      data:    { orderId: order._id },
    })

    sendSuccess(res, { order: order.toObject() }, 'Order cancelled')
  } catch (err) { next(err) }
}

// ── PATCH /api/orders/:id/status — staff/admin updates status ────────────────
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body
    const allowed    = Object.keys(STATUS_TIMESTAMPS)
    if (!allowed.includes(status)) throw new AppError(`Invalid status: ${status}`, 400)

    const order = await Order.findById(req.params.id)
    if (!order) throw new AppError('Order not found', 404)

    // Verify belongs to same cafe as staff
    if (
      req.user.role !== 'admin' &&
      order.cafeId.toString() !== req.user.cafeId?.toString()
    ) throw new AppError('Not authorised', 403)

    order.status = status
    const tsField = STATUS_TIMESTAMPS[status]
    if (tsField) order[tsField] = new Date()
    await order.save()

    const payload = { order: order.toObject() }

    // Tell the customer
    emitToUser(order.customerId.toString(), 'order:status_update', {
      orderId: order._id,
      status,
      order: order.toObject(),
    })

    // Tell all staff
    emitToStaff(order.cafeId.toString(), 'order:status_update', payload)

    // Notify customer
    const msg = STATUS_MESSAGES[status]
    if (msg) {
      await createAndEmit({
        userId:  order.customerId,
        cafeId:  order.cafeId,
        type:    'order',
        title:   msg.title,
        message: msg.message,
        data:    { orderId: order._id, status },
      })
    }

    sendSuccess(res, { order: order.toObject() }, 'Status updated')
  } catch (err) { next(err) }
}

// ── GET /api/orders/kds — kitchen display (staff only) ───────────────────────
export const getKDSOrders = async (req, res, next) => {
  try {
    const cafeId = req.user.cafeId
    if (!cafeId) throw new AppError('No cafeId on user', 400)

    const orders = await Order
      .find({ cafeId, status: { $in: ['pending', 'preparing'] } })
      .sort({ placedAt: 1 })
      .lean()

    sendSuccess(res, { orders }, 'OK')
  } catch (err) { next(err) }
}

// ── GET /api/orders/waiter — waiter queue (staff only) ───────────────────────
export const getWaiterQueue = async (req, res, next) => {
  try {
    const cafeId = req.user.cafeId
    if (!cafeId) throw new AppError('No cafeId on user', 400)

    const orders = await Order
      .find({ cafeId, status: 'on_the_way' })
      .sort({ onTheWayAt: 1 })
      .lean()

    sendSuccess(res, { orders }, 'OK')
  } catch (err) { next(err) }
}