// backend/src/modules/loyalty/loyalty.controller.js
import * as service    from './loyalty.service.js'
import { sendSuccess } from '../../shared/utils/response.js'

// GET /api/loyalty/me  — customer's own account
export const getMyLoyalty = async (req, res, next) => {
  try {
    const cafeId = req.user?.cafeId || process.env.DEFAULT_CAFE_ID
    const data   = await service.getMyLoyalty(req.user._id, cafeId)
    sendSuccess(res, data, 'OK')
  } catch (err) { next(err) }
}

// GET /api/loyalty/history
export const getHistory = async (req, res, next) => {
  try {
    const cafeId = req.user?.cafeId || process.env.DEFAULT_CAFE_ID
    const data   = await service.getLoyaltyHistory(req.user._id, cafeId)
    sendSuccess(res, { history: data }, 'OK')
  } catch (err) { next(err) }
}

// GET /api/loyalty/leaderboard  — manager
export const getLeaderboard = async (req, res, next) => {
  try {
    const cafeId = req.user?.cafeId || process.env.DEFAULT_CAFE_ID
    const data   = await service.getLeaderboard(cafeId, Number(req.query.limit) || 20)
    sendSuccess(res, { leaderboard: data }, 'OK')
  } catch (err) { next(err) }
}

// GET /api/loyalty/config
export const getConfig = async (req, res, next) => {
  try {
    const data = await service.getConfig()
    sendSuccess(res, data, 'OK')
  } catch (err) { next(err) }
}