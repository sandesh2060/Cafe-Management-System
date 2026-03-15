// backend/src/shared/middleware/errorHandler.js
//
// Named exports:
//   catchAsync   — wraps async handlers, forwards errors to next()
//   default      — global Express error middleware (mount last in server.js)
//
// Both are exported from this one file so existing imports like:
//   import { catchAsync } from '../../shared/middleware/errorHandler.js'
// continue to work alongside:
//   import errorHandler from '../../shared/middleware/errorHandler.js'

// ── catchAsync ────────────────────────────────────────────────────────────────
export const catchAsync = (fn) => (req, res, next) =>
  fn(req, res, next).catch(next)

// ── Global error handler ──────────────────────────────────────────────────────
const errorHandler = (err, req, res, _next) => {
  let { statusCode = 500, message, isOperational } = err

  // Mongoose: invalid ObjectId
  if (err.name === 'CastError') {
    statusCode    = 400
    message       = `Invalid ${err.path}: ${err.value}`
    isOperational = true
  }

  // Mongoose: duplicate key
  if (err.code === 11000) {
    const field   = Object.keys(err.keyValue ?? {})[0] ?? 'field'
    statusCode    = 400
    message       = `Duplicate value for "${field}". Please use another value.`
    isOperational = true
  }

  // Mongoose: validation error
  if (err.name === 'ValidationError') {
    statusCode    = 400
    message       = Object.values(err.errors).map(e => e.message).join('. ')
    isOperational = true
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode    = 401
    message       = 'Invalid token. Please log in again.'
    isOperational = true
  }
  if (err.name === 'TokenExpiredError') {
    statusCode    = 401
    message       = 'Your session has expired. Please log in again.'
    isOperational = true
  }

  if (!isOperational) console.error('💥 UNHANDLED ERROR:', err)

  res.status(statusCode).json({
    success: false,
    message: isOperational || process.env.NODE_ENV === 'development'
      ? message
      : 'Something went wrong. Please try again.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

export default errorHandler