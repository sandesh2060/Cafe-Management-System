// src/modules/loyalty/loyalty.routes.js
import { Router }     from 'express'
import Loyalty        from './loyalty.model.js'
import Order          from '../order/order.model.js'
import { authenticate, authorize } from '../auth/auth.middleware.js'
import { catchAsync } from '../../shared/middleware/errorHandler.js'
import AppError       from '../../shared/utils/AppError.js'

const router = Router()

// GET /api/loyalty/me
router.get('/me', authenticate, catchAsync(async (req, res) => {
  let loyalty = await Loyalty.findOne({ userId: req.user._id })
  if (!loyalty) {
    loyalty = await Loyalty.create({ userId: req.user._id, cafeId: req.user.cafeId || req.query.cafeId })
  }

  const THRESHOLDS = { bronze: 500, silver: 1000 }
  const nextTier   = loyalty.tier === 'bronze' ? 'silver' : loyalty.tier === 'silver' ? 'gold' : null
  const pointsToNext = nextTier ? Math.max((THRESHOLDS[nextTier] || Infinity) - loyalty.points, 0) : 0

  res.json({
    success:     true,
    points:      loyalty.points,
    tier:        loyalty.tier,
    discountPct: loyalty.discountPct,
    totalEarned: loyalty.totalEarned,
    totalSpent:  loyalty.totalSpent,
    pointsToNext,
    nextTier,
  })
}))

// GET /api/loyalty/history  — points transaction history via orders
router.get('/history', authenticate, catchAsync(async (req, res) => {
  const orders = await Order.find({
    customerId:   req.user._id,
    status:       'paid',
    pointsEarned: { $gt: 0 },
  })
    .select('pointsEarned pointsUsed total paidAt')
    .sort({ paidAt: -1 })
    .limit(30)
    .lean()

  res.json({ success: true, history: orders })
}))

// GET /api/loyalty/leaderboard?cafeId=xxx  — manager only
router.get('/leaderboard', authenticate, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  const cafeId = req.query.cafeId || req.user.cafeId
  const top = await Loyalty.find({ cafeId })
    .sort({ points: -1 })
    .limit(20)
    .populate('userId', 'name email avatar')
    .lean()
  res.json({ success: true, leaderboard: top })
}))

// GET /api/loyalty/config?cafeId=xxx  — manager reads tier config
router.get('/config', authenticate, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  // Static config for now — can be moved to a Cafe model later
  res.json({
    success: true,
    config: {
      bronze: { minPoints: 0,    discount: 5  },
      silver: { minPoints: 500,  discount: 10 },
      gold:   { minPoints: 1000, discount: 15 },
      pointsPerRupee: 0.1,  // 1 pt per ₹10
    },
  })
}))

// PATCH /api/loyalty/config  — manager updates (stub — extend to Cafe model)
router.patch('/config', authenticate, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  // In a full SaaS setup, save to Cafe config document
  res.json({ success: true, message: 'Config updated (stub)', config: req.body })
}))

export default router