// src/shared/middleware/errorHandler.js
import { AppError } from '../utils/AppError.js'

export const errorHandler = (err, req, res, next) => {
  let error = { ...err, message: err.message }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    error = new AppError(`Invalid ${err.path}: ${err.value}`, 400)
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0]
    error = new AppError(`${field} already exists`, 409)
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message)
    error = new AppError(messages.join('. '), 400)
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError')  error = new AppError('Invalid token', 401)
  if (err.name === 'TokenExpiredError')  error = new AppError('Token expired', 401)

  // Zod validation
  if (err.name === 'ZodError') {
    const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
    error = new AppError(messages.join('. '), 422)
  }

  const statusCode = error.statusCode || 500
  const message    = error.message    || 'Internal server error'

  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    console.error('[Error]', err)
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(error.code                      ? { code: error.code }   : {}),
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  })
}

// Async wrapper to avoid try-catch boilerplate
export const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}