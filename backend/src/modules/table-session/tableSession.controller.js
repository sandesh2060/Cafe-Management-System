// src/modules/table-session/tableSession.controller.js
import * as service from './tableSession.service.js'
import AppError from '../../shared/utils/AppError.js'

// POST /api/table-session/detect/gps
export const detectGps = async (req, res, next) => {
  try {
    const { latitude, longitude, confidenceScore, accuracy } = req.body

    if (!latitude || !longitude) {
      return next(new AppError('latitude and longitude are required', 400))
    }

    const cafeId = req.user?.cafeId
      || req.body.cafeId
      || process.env.DEFAULT_CAFE_ID

    if (!cafeId) return next(new AppError('cafeId is required', 400))

    const userId = req.user?._id || null

    const result = await service.detectByGps({
      userId,
      cafeId,
      latitude:        parseFloat(latitude),
      longitude:       parseFloat(longitude),
      confidenceScore: confidenceScore ?? 0,
      gpsAccuracy:     accuracy != null ? parseFloat(accuracy) : null,  // ← device accuracy in metres
    })

    res.status(200).json({ success: true, ...result })
  } catch (err) {
    console.error("GPS DETECT ERROR:", err)
    next(err)
  }
}

// POST /api/table-session/detect/qr
export const detectQr = async (req, res, next) => {
  try {
    const { token } = req.body
    if (!token) return next(new AppError('QR token is required', 400))

    const userId = req.user?._id || null
    const result = await service.detectByQr({ userId, token })

    res.status(200).json({ success: true, ...result })
  } catch (err) {
    console.error("QR DETECT ERROR:", err)
    next(err)
  }
}

// GET /api/table-session/active
export const getActiveSession = async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.query.sessionId
    if (!sessionId) return res.status(200).json({ success: true, session: null })

    const session = await service.getSession(sessionId)
    res.status(200).json({ success: true, session })
  } catch (err) {
    console.error("GET SESSION ERROR:", err)
    next(err)
  }
}

// POST /api/table-session/close
export const closeSession = async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.body.sessionId
    if (!sessionId) return next(new AppError('sessionId is required', 400))

    await service.closeSession(sessionId)
    res.status(200).json({ success: true, message: 'Session closed' })
  } catch (err) {
    console.error("CLOSE SESSION ERROR:", err)
    next(err)
  }
}

// POST /api/table-session/heartbeat
export const heartbeat = async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.body.sessionId
    if (!sessionId) return next(new AppError('sessionId is required', 400))

    await service.heartbeat(sessionId)
    res.status(200).json({ success: true })
  } catch (err) {
    console.error("HEARTBEAT ERROR:", err)
    next(err)
  }
}