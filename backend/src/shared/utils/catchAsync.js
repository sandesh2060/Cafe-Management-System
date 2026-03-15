// backend/src/shared/utils/catchAsync.js
//
// Wraps async route handlers so errors propagate to Express error middleware
// without try/catch boilerplate in every controller.
//
// Usage:
//   export const myHandler = catchAsync(async (req, res, next) => { ... })
const catchAsync = (fn) => (req, res, next) => fn(req, res, next).catch(next)
export default catchAsync