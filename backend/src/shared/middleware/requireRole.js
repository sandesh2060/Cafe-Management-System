// backend/src/shared/middleware/requireRole.js
//
// Usage: router.patch('/status', requireRole('waiter', 'kitchen', 'admin'), handler)
import AppError from '../utils/AppError.js'

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user)
    return next(new AppError('Not authenticated', 401))
  if (!roles.includes(req.user.role))
    return next(new AppError(`Role "${req.user.role}" is not allowed here`, 403))
  next()
}

export default requireRole