// src/modules/auth/auth.middleware.js
import { verifyToken } from '../../config/jwt.js'
import User            from '../user/user.model.js'
import { AppError }    from '../../shared/utils/AppError.js'

// ── Authenticate JWT ──────────────────────────────────────────────────────────
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401)
    }

    const token   = authHeader.slice(7)
    const decoded = verifyToken(token)
    if (!decoded) throw new AppError('Invalid or expired token', 401)

    const user = await User.findById(decoded.userId).select('-password').lean()
    if (!user) throw new AppError('User not found', 401)
    if (!user.isActive) throw new AppError('Account deactivated', 403)

    req.user  = user
    req.token = token
    next()
  } catch (err) {
    next(err)
  }
}

// ── Role-based authorization ──────────────────────────────────────────────────
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError('Not authenticated', 401))
  if (!roles.includes(req.user.role)) {
    return next(new AppError(`Role '${req.user.role}' is not authorized`, 403))
  }
  next()
}

// ── Optional auth (guest allowed) ────────────────────────────────────────────
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) return next()

    const token   = authHeader.slice(7)
    const decoded = verifyToken(token)
    if (!decoded) return next()

    const user = await User.findById(decoded.userId).select('-password').lean()
    if (user?.isActive) req.user = user
    next()
  } catch {
    next() // Silent fail for optional auth
  }
}