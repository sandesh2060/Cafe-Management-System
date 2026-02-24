import { verifyToken } from '../../config/jwt.js'
import User from '../user/user.model.js'
import AppError from '../../shared/utils/AppError.js'

export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null
    if (!token) return next(new AppError('Not authenticated', 401))
    const decoded = verifyToken(token)
    if (!decoded) return next(new AppError('Invalid token', 401))
    const user = await User.findById(decoded.userId).select('-password')
    if (!user || !user.isActive) return next(new AppError('User not found', 401))
    req.user = user
    next()
  } catch (err) { next(err) }
}

export const authenticate = protect

export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null
    if (!token) return next()
    const decoded = verifyToken(token)
    if (!decoded) return next()
    const user = await User.findById(decoded.userId).select('-password')
    if (user && user.isActive) req.user = user
    next()
  } catch { next() }
}

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new AppError('Forbidden', 403))
  next()
}

export const requireRole = authorize
