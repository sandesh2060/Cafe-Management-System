// backend/src/modules/reports/reports.controller.js
import * as service    from './reports.service.js'
import { sendSuccess } from '../../shared/utils/response.js'

const getCafeId = (req) => req.user?.cafeId || process.env.DEFAULT_CAFE_ID

// GET /api/reports/sales?days=7
export const getSales = async (req, res, next) => {
  try {
    const days = Math.min(Number(req.query.days) || 7, 90)
    const data = await service.getSalesReport(getCafeId(req), days)
    res.json({ success: true, ...data })    // SalesOverview spreads the response directly
  } catch (err) { next(err) }
}

// GET /api/reports/daily
export const getDaily = async (req, res, next) => {
  try {
    const data = await service.getDailyReport(getCafeId(req))
    res.json({ success: true, ...data })    // ReportsPanel spreads daily directly
  } catch (err) { next(err) }
}

// GET /api/reports/staff?days=7
export const getStaff = async (req, res, next) => {
  try {
    const days = Math.min(Number(req.query.days) || 7, 30)
    const data = await service.getStaffReport(getCafeId(req), days)
    res.json({ success: true, ...data })    // ReportsPanel uses data.waiters
  } catch (err) { next(err) }
}

// GET /api/reports/loyalty
export const getLoyalty = async (req, res, next) => {
  try {
    const data = await service.getLoyaltyReport(getCafeId(req))
    sendSuccess(res, data, 'OK')
  } catch (err) { next(err) }
}