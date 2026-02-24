// src/shared/utils/AppError.js
export class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message)
    this.statusCode = statusCode
    this.status     = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error'
    this.code       = code
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}