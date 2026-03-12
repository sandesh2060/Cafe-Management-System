// backend/src/shared/middleware/requireRole.js
import AppError from '../utils/AppError.js'

/**
 * requireRole('waiter', 'kitchen', 'admin')
 * Allows any of the listed roles. Must come after protect middleware.
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError('Not authenticated', 401))
  if (!roles.includes(req.user.role))
    return next(new AppError(`Access denied. Required role: ${roles.join(' or ')}`, 403))
  next()
}

export default requireRole