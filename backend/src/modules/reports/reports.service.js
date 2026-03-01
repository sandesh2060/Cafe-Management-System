// backend/src/modules/reports/reports.service.js
import Order        from '../order/order.model.js'
import User         from '../user/user.model.js'
import WaiterCall   from '../waiter-call/waiterCall.model.js'
import mongoose     from 'mongoose'

const toObjId = (id) => new mongoose.Types.ObjectId(id.toString())

// ── Sales report ─────────────────────────────────────────────────────────────
export const getSalesReport = async (cafeId, days = 7) => {
  const since = new Date()
  since.setDate(since.getDate() - days)
  since.setHours(0, 0, 0, 0)

  const cafeObjId = toObjId(cafeId)

  // Summary totals
  const [summary] = await Order.aggregate([
    { $match: { cafeId: cafeObjId, status: 'paid', createdAt: { $gte: since } } },
    { $group: {
      _id:          null,
      totalRevenue: { $sum: '$total' },
      totalOrders:  { $sum: 1 },
      avgOrder:     { $avg: '$total' },
    }},
  ])

  // Revenue by day
  const byDay = await Order.aggregate([
    { $match: { cafeId: cafeObjId, status: 'paid', createdAt: { $gte: since } } },
    { $group: {
      _id:     { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      revenue: { $sum: '$total' },
      orders:  { $sum: 1 },
    }},
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', revenue: 1, orders: 1 } },
  ])

  // Revenue by category
  const byCategory = await Order.aggregate([
    { $match: { cafeId: cafeObjId, status: 'paid', createdAt: { $gte: since } } },
    { $unwind: '$items' },
    { $group: {
      _id:     '$items.category',
      revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      qty:     { $sum: '$items.quantity' },
    }},
    { $sort: { revenue: -1 } },
    { $project: { _id: 0, category: { $ifNull: ['$_id', 'uncategorised'] }, revenue: 1, qty: 1 } },
  ])

  return {
    summary: {
      totalRevenue: Math.round(summary?.totalRevenue ?? 0),
      totalOrders:  summary?.totalOrders ?? 0,
      avgOrder:     Math.round(summary?.avgOrder ?? 0),
    },
    byDay,
    byCategory,
  }
}

// ── Daily summary (today) ────────────────────────────────────────────────────
export const getDailyReport = async (cafeId) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cafeObjId = toObjId(cafeId)

  const [summary] = await Order.aggregate([
    { $match: { cafeId: cafeObjId, status: 'paid', createdAt: { $gte: today } } },
    { $group: {
      _id:           null,
      revenue:       { $sum: '$total' },
      orders:        { $sum: 1 },
      avgOrderValue: { $avg: '$total' },
    }},
  ])

  // Waiter call stats
  let waiterCallStats = { count: 0, avgResponseMinutes: 0 }
  try {
    const [wc] = await WaiterCall.aggregate([
      { $match: { cafeId: cafeObjId, createdAt: { $gte: today }, status: 'done' } },
      { $group: {
        _id:   null,
        count: { $sum: 1 },
        avgMs: { $avg: { $subtract: ['$acknowledgedAt', '$createdAt'] } },
      }},
    ])
    if (wc) {
      waiterCallStats.count              = wc.count
      waiterCallStats.avgResponseMinutes = Math.round((wc.avgMs ?? 0) / 60000)
    }
  } catch { /* waiterCall model may not have acknowledgedAt — safe to skip */ }

  return {
    date:              today.toISOString().slice(0, 10),
    orders:            summary?.orders        ?? 0,
    revenue:           Math.round(summary?.revenue ?? 0),
    avgOrderValue:     Math.round(summary?.avgOrderValue ?? 0),
    waiterCalls:       waiterCallStats.count,
    avgResponseMinutes: waiterCallStats.avgResponseMinutes,
  }
}

// ── Staff performance (waiter) ───────────────────────────────────────────────
export const getStaffReport = async (cafeId, days = 7) => {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const cafeObjId = toObjId(cafeId)

  // Orders delivered per waiter
  const waiterPerf = await Order.aggregate([
    {
      $match: {
        cafeId:    cafeObjId,
        waiterId:  { $ne: null },
        status:    { $in: ['delivered','paid'] },
        createdAt: { $gte: since },
      },
    },
    { $group: { _id: '$waiterId', calls: { $sum: 1 }, revenue: { $sum: '$total' } } },
    {
      $lookup: {
        from:         'users',
        localField:   '_id',
        foreignField: '_id',
        as:           'waiter',
      },
    },
    { $unwind: { path: '$waiter', preserveNullAndEmpty: true } },
    {
      $project: {
        _id:     0,
        name:    { $ifNull: ['$waiter.name', 'Unknown'] },
        calls:   1,
        revenue: 1,
      },
    },
    { $sort: { calls: -1 } },
  ])

  return { waiters: waiterPerf, days }
}

// ── Loyalty report (for admin/reports panel) ─────────────────────────────────
export const getLoyaltyReport = async (cafeId) => {
  const cafeObjId = toObjId(cafeId)
  const [summary] = await Order.aggregate([
    { $match: { cafeId: cafeObjId, status: 'paid' } },
    { $group: {
      _id:            null,
      totalPoints:    { $sum: '$pointsEarned' },
      totalRedeemed:  { $sum: '$pointsUsed'   },
      totalOrders:    { $sum: 1 },
    }},
  ])
  return summary ?? { totalPoints: 0, totalRedeemed: 0, totalOrders: 0 }
}