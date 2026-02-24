// src/modules/staff/staff.routes.js
import { Router }   from 'express'
import User         from '../user/user.model.js'
import { authenticate, authorize } from '../auth/auth.middleware.js'
import { catchAsync }              from '../../shared/middleware/errorHandler.js'
import AppError                    from '../../shared/utils/AppError.js'
import bcrypt                      from 'bcryptjs'

const STAFF_ROLES = ['waiter', 'kitchen', 'cashier', 'manager']

const router = Router()

// GET /api/staff?cafeId=xxx
router.get('/', authenticate, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  const cafeId = req.query.cafeId || req.user.cafeId
  const staff  = await User.find({ cafeId, role: { $in: STAFF_ROLES } })
    .select('-password -faceDescriptor')
    .sort({ role: 1, name: 1 })
    .lean()
  res.json({ success: true, staff })
}))

// POST /api/staff  — create staff member
router.post('/', authenticate, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  const { name, email, password, role, cafeId: bodyCafeId } = req.body
  const cafeId = bodyCafeId || req.user.cafeId

  if (!STAFF_ROLES.includes(role)) throw new AppError('Invalid role', 400)

  const existing = await User.findOne({ email })
  if (existing) throw new AppError('Email already registered', 409)

  const user = await User.create({ name, email, password, role, cafeId, isActive: true })
  res.status(201).json({ success: true, user: user.toSafeJSON() })
}))

// GET /api/staff/:id
router.get('/:id', authenticate, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password -faceDescriptor').lean()
  if (!user) throw new AppError('Staff not found', 404)
  res.json({ success: true, user })
}))

// PATCH /api/staff/:id
router.patch('/:id', authenticate, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  const { password, ...safeUpdates } = req.body  // Never update password here
  const user = await User.findByIdAndUpdate(req.params.id, safeUpdates, { new: true })
    .select('-password -faceDescriptor')
  if (!user) throw new AppError('Staff not found', 404)
  res.json({ success: true, user })
}))

// POST /api/staff/:id/reset-password
router.post('/:id/reset-password', authenticate, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  const { newPassword } = req.body
  if (!newPassword || newPassword.length < 6) throw new AppError('Password too short', 400)

  const user = await User.findById(req.params.id)
  if (!user) throw new AppError('Staff not found', 404)

  user.password = newPassword  // Pre-save hook will hash it
  await user.save()

  res.json({ success: true, message: 'Password reset successfully' })
}))

// PATCH /api/staff/:id/toggle-active
router.patch('/:id/toggle-active', authenticate, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) throw new AppError('Staff not found', 404)
  user.isActive = !user.isActive
  await user.save()
  res.json({ success: true, isActive: user.isActive })
}))

// DELETE /api/staff/:id
router.delete('/:id', authenticate, authorize('admin'), catchAsync(async (req, res) => {
  await User.findByIdAndDelete(req.params.id)
  res.json({ success: true, message: 'Staff deleted' })
}))

export default router