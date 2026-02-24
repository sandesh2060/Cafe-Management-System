export const catchAsync = (fn) => (req, res, next) => fn(req, res, next).catch(next)

export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500
  err.status = err.status || 'error'
  res.status(err.statusCode).json({ success: false, message: err.message || 'Something went wrong' })
}
