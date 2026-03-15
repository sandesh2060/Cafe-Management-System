// backend/src/modules/order/order.controller.js
//
// ENDPOINTS:
//   POST   /api/orders              → placeOrder  (creates OR merges into active session order)
//   GET    /api/orders/active       → getActiveOrder
//   GET    /api/orders/history      → getOrderHistory
//   GET    /api/orders/:id          → getOrderById
//   POST   /api/orders/:id/cancel   → cancelOrder
//   PATCH  /api/orders/:id/status   → updateOrderStatus  (staff)
//   GET    /api/orders/kds          → getKDSOrders        (kitchen)
//   GET    /api/orders/waiter       → getWaiterQueue      (waiter)
//
// ADD-ON LOGIC (same-session merge):
//   • On placeOrder, if an active order exists for the same sessionId
//     (status in pending/preparing/on_the_way) → items are merged in:
//       – Matching menuItemId + portionId  → quantity incremented
//       – New items                        → pushed to items array
//   • "delivered/paid/cancelled" orders are NOT merged — new order is created
//   • Totals always recalculated server-side after merge
//   • Response: { success, order, merged: boolean }

import mongoose            from 'mongoose'
import Order               from './order.model.js'
import MenuItem            from '../menu/menu.model.js'
import User                from '../user/user.model.js'
import AppError            from '../../shared/utils/AppError.js'
import catchAsync          from '../../shared/utils/catchAsync.js'

// ── Loyalty tier config ───────────────────────────────────────────────────────
const TIER_CONFIG = {
  bronze: { multiplier: 1,   discount: 5  },
  silver: { multiplier: 1.5, discount: 10 },
  gold:   { multiplier: 2,   discount: 15 },
  none:   { multiplier: 1,   discount: 0  },
}
const TIER_DISCOUNT = (tier) => TIER_CONFIG[tier]?.discount   ?? 0
const TIER_MULTI    = (tier) => TIER_CONFIG[tier]?.multiplier ?? 1

// ── Statuses where new items can be merged in ─────────────────────────────────
const MERGEABLE_STATUSES = ['pending', 'preparing', 'on_the_way']

// ── Status timestamp field map ────────────────────────────────────────────────
const STATUS_TS = {
  preparing:  'preparingAt',
  on_the_way: 'onTheWayAt',
  delivered:  'deliveredAt',
  paid:       'paidAt',
  cancelled:  'cancelledAt',
}

// ── Socket emit helper ────────────────────────────────────────────────────────
const emit = (req, event, data) => {
  const io = req.app.get('io')
  if (!io) return
  io.to(`order:${data.orderId ?? data.order?._id}`).emit(event, data)
  io.to(`cafe:${data.cafeId  ?? data.order?.cafeId}`).emit(event, data)
}

// ── Validate & price items against DB ─────────────────────────────────────────
// Returns validated item array, or null (and calls next(err)) on failure.
const validateItems = async (items, cafeId, next) => {
  const menuIds  = [...new Set(items.map(i => i.menuItemId))]
  const menuDocs = await MenuItem.find({
    _id:         { $in: menuIds },
    cafeId,
    isAvailable: true,
  }).lean()

  const menuMap = new Map(menuDocs.map(d => [d._id.toString(), d]))
  const validated = []

  for (const line of items) {
    const doc = menuMap.get(line.menuItemId?.toString())
    if (!doc) {
      next(new AppError(`Item "${line.name ?? line.menuItemId}" is unavailable`, 400))
      return null
    }

    let verifiedPrice
    if (doc.portions?.length > 0) {
      if (!line.portionId) {
        next(new AppError(`"${doc.name}" requires a portion selection`, 400))
        return null
      }
      const portion = doc.portions.find(p => p.id === line.portionId)
      if (!portion) {
        next(new AppError(`Invalid portion "${line.portionId}" for "${doc.name}"`, 400))
        return null
      }
      verifiedPrice = portion.price
    } else {
      verifiedPrice = doc.price
    }

    validated.push({
      menuItemId:   doc._id,
      name:         doc.name,
      price:        verifiedPrice,
      quantity:     Math.max(1, parseInt(line.quantity) || 1),
      emoji:        doc.emoji        ?? '🍽️',
      category:     doc.category     ?? null,
      portionId:    line.portionId   ?? null,
      portionLabel: line.portionLabel ?? null,
      notes:        line.notes       ?? null,
    })
  }

  return validated
}

// ── Recalculate totals ────────────────────────────────────────────────────────
const recalc = (items, loyaltyTier) => {
  const subtotal     = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const discountPct  = TIER_DISCOUNT(loyaltyTier)
  const discountAmt  = Math.round(subtotal * discountPct / 100)
  const total        = subtotal - discountAmt
  const pointsEarned = Math.floor((total / 10) * TIER_MULTI(loyaltyTier))
  return { subtotal, discountPct, discountAmt, total, pointsEarned }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/orders
// Body: { items, tableId, sessionId, cafeId, specialNote?, loyaltyTier? }
// ─────────────────────────────────────────────────────────────────────────────
export const placeOrder = catchAsync(async (req, res, next) => {
  const { items, tableId, sessionId, cafeId, specialNote, loyaltyTier = 'none' } = req.body
  const customerId = req.user._id

  if (!Array.isArray(items) || items.length === 0)
    return next(new AppError('Order must contain at least one item', 400))
  if (!tableId || !sessionId || !cafeId)
    return next(new AppError('tableId, sessionId and cafeId are required', 400))

  const validatedItems = await validateItems(items, cafeId, next)
  if (!validatedItems) return

  // ── Look for an active order in this session ──────────────────────────────
  const existing = await Order.findOne({
    sessionId,
    cafeId,
    status: { $in: MERGEABLE_STATUSES },
  }).sort({ placedAt: -1 })

  // ── MERGE PATH ────────────────────────────────────────────────────────────
  if (existing) {
    const lineKey = (menuItemId, portionId) =>
      `${menuItemId.toString()}::${portionId ?? 'none'}`

    // Index existing items by their unique key
    const existingMap = new Map(
      existing.items.map((item, idx) => [lineKey(item.menuItemId, item.portionId), idx])
    )

    for (const incoming of validatedItems) {
      const key = lineKey(incoming.menuItemId, incoming.portionId)
      if (existingMap.has(key)) {
        // Already in order — bump quantity
        existing.items[existingMap.get(key)].quantity += incoming.quantity
      } else {
        // Brand new item — push and index it
        existingMap.set(key, existing.items.length)
        existing.items.push(incoming)
      }
    }

    // Append special note
    if (specialNote?.trim()) {
      existing.specialNote = existing.specialNote
        ? `${existing.specialNote} | ${specialNote.trim()}`
        : specialNote.trim()
    }

    const totals      = recalc(existing.items, loyaltyTier || existing.loyaltyTier)
    const pointsDelta = totals.pointsEarned - (existing.pointsEarned ?? 0)

    Object.assign(existing, totals)
    await existing.save()

    if (pointsDelta > 0 && !req.user.isGuest) {
      await User.findByIdAndUpdate(customerId, { $inc: { loyaltyPoints: pointsDelta } })
    }

    const populated = await Order.findById(existing._id).lean()
    emit(req, 'order:updated', { orderId: populated._id, cafeId: populated.cafeId, order: populated, merged: true })
    return res.status(200).json({ success: true, order: populated, merged: true })
  }

  // ── CREATE PATH ───────────────────────────────────────────────────────────
  const totals = recalc(validatedItems, loyaltyTier)

  const order = await Order.create({
    tableId,
    sessionId,
    cafeId,
    customerId,
    items:       validatedItems,
    status:      'pending',
    ...totals,
    loyaltyTier,
    specialNote: specialNote?.trim() || null,
    placedAt:    new Date(),
  })

  if (totals.pointsEarned > 0 && !req.user.isGuest) {
    await User.findByIdAndUpdate(customerId, { $inc: { loyaltyPoints: totals.pointsEarned } })
  }

  const populated = await Order.findById(order._id).lean()
  emit(req, 'order:new', { orderId: populated._id, cafeId: populated.cafeId, order: populated })
  res.status(201).json({ success: true, order: populated, merged: false })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/active
// ─────────────────────────────────────────────────────────────────────────────
export const getActiveOrder = catchAsync(async (req, res) => {
  const order = await Order.findOne({
    customerId: req.user._id,
    status:     { $nin: ['paid', 'cancelled'] },
  })
    .sort({ placedAt: -1 })
    .lean()

  res.json({ success: true, order: order ?? null })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/history?page=1&limit=10
// ─────────────────────────────────────────────────────────────────────────────
export const getOrderHistory = catchAsync(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1)
  const limit = Math.min(50, parseInt(req.query.limit) || 10)
  const skip  = (page - 1) * limit

  const [orders, total] = await Promise.all([
    Order.find({ customerId: req.user._id })
      .sort({ placedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments({ customerId: req.user._id }),
  ])

  res.json({
    success: true,
    orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/:id
// ─────────────────────────────────────────────────────────────────────────────
export const getOrderById = catchAsync(async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return next(new AppError('Invalid order ID', 400))

  const order = await Order.findOne({
    _id:        req.params.id,
    customerId: req.user._id,
  }).lean()

  if (!order) return next(new AppError('Order not found', 404))
  res.json({ success: true, order })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/orders/:id/cancel   — pending only
// ─────────────────────────────────────────────────────────────────────────────
export const cancelOrder = catchAsync(async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return next(new AppError('Invalid order ID', 400))

  const order = await Order.findOne({ _id: req.params.id, customerId: req.user._id })
  if (!order) return next(new AppError('Order not found', 404))
  if (order.status !== 'pending')
    return next(new AppError(`Cannot cancel order in "${order.status}" status`, 400))

  order.status      = 'cancelled'
  order.cancelledAt = new Date()
  await order.save()

  if (order.pointsEarned > 0 && !req.user.isGuest) {
    await User.findByIdAndUpdate(req.user._id, { $inc: { loyaltyPoints: -order.pointsEarned } })
  }

  const plain = order.toObject()
  emit(req, 'order:cancelled', { orderId: plain._id, cafeId: plain.cafeId, order: plain })
  res.json({ success: true, order: plain })
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/orders/:id/status   — staff only
// ─────────────────────────────────────────────────────────────────────────────
export const updateOrderStatus = catchAsync(async (req, res, next) => {
  const VALID = ['preparing', 'on_the_way', 'delivered', 'paid', 'cancelled']
  const { status } = req.body

  if (!VALID.includes(status))
    return next(new AppError(`Invalid status "${status}"`, 400))
  if (!mongoose.isValidObjectId(req.params.id))
    return next(new AppError('Invalid order ID', 400))

  const order = await Order.findById(req.params.id)
  if (!order) return next(new AppError('Order not found', 404))

  const ORDER_SEQ = ['pending', 'preparing', 'on_the_way', 'delivered', 'paid', 'cancelled']
  const curIdx = ORDER_SEQ.indexOf(order.status)
  const newIdx = ORDER_SEQ.indexOf(status)
  if (newIdx < curIdx && status !== 'cancelled')
    return next(new AppError(`Cannot move from "${order.status}" back to "${status}"`, 400))

  order.status = status
  const tsField = STATUS_TS[status]
  if (tsField) order[tsField] = new Date()
  if (status === 'paid') order.paymentMethod = req.body.paymentMethod ?? 'cash'

  await order.save()

  const plain = order.toObject()
  emit(req, 'order:status_update', { orderId: plain._id, cafeId: plain.cafeId, status, order: plain })
  res.json({ success: true, order: plain })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/kds
// ─────────────────────────────────────────────────────────────────────────────
export const getKDSOrders = catchAsync(async (req, res) => {
  const orders = await Order.find({
    cafeId: req.user.cafeId,
    status: { $in: ['pending', 'preparing'] },
  }).sort({ placedAt: 1 }).lean()
  res.json({ success: true, orders })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/waiter
// ─────────────────────────────────────────────────────────────────────────────
export const getWaiterQueue = catchAsync(async (req, res) => {
  const orders = await Order.find({
    cafeId: req.user.cafeId,
    status: { $in: ['on_the_way', 'delivered'] },
  }).sort({ placedAt: 1 }).lean()
  res.json({ success: true, orders })
})