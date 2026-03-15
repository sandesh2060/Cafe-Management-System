// backend/src/shared/utils/AppError.js
//
// Operational error class — distinguishes known errors (400/401/403/404)
// from programmer errors (500). Express error handler checks isOperational.
export default class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message)
    this.statusCode    = statusCode
    this.status        = statusCode < 500 ? 'fail' : 'error'
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}