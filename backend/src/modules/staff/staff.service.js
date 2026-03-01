// backend/src/modules/staff/staff.service.js
import User      from '../user/user.model.js'
import { signToken } from '../../config/jwt.js'
import AppError  from '../../shared/utils/AppError.js'

const STAFF_ROLES = ['waiter', 'kitchen', 'cashier', 'manager', 'admin']

// ── Auth ─────────────────────────────────────────────────────────────────────

export const staffLogin = async ({ username, password }) => {
  const trimmed = username?.trim()?.toLowerCase()
  if (!trimmed) throw new AppError('Username is required', 400)

  const user = await User.findOne({ username: trimmed }).select('+password')
  if (!user)                            throw new AppError('Invalid credentials', 401)
  if (!STAFF_ROLES.includes(user.role)) throw new AppError('Access denied — staff only', 403)
  if (!user.isActive)                   throw new AppError('Account deactivated. Contact your manager.', 403)
  if (!user.password)                   throw new AppError('No password set. Ask your manager to reset it.', 401)

  const valid = await user.comparePassword(password)
  if (!valid) throw new AppError('Invalid credentials', 401)

  const token = signToken({ userId: user._id, role: user.role })
  return {
    token,
    user: {
      _id:      user._id,
      name:     user.name,
      username: user.username,
      role:     user.role,
      cafeId:   user.cafeId,
      avatar:   user.avatar ?? null,
    },
  }
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export const listStaff = async (cafeId) => {
  return User.find({ cafeId, role: { $in: STAFF_ROLES }, isGuest: false })
    .select('-password')
    .lean()
}

export const createStaff = async ({ username, name, role, password, cafeId }) => {
  if (!STAFF_ROLES.includes(role))
    throw new AppError(`Invalid role. Must be: ${STAFF_ROLES.join(', ')}`, 400)
  if (!username?.trim())
    throw new AppError('Username is required', 400)
  if (!password || password.length < 6)
    throw new AppError('Password must be at least 6 characters', 400)

  const lower = username.trim().toLowerCase()
  const exists = await User.findOne({ username: lower })
  if (exists) throw new AppError('Username already taken', 400)

  const user = await User.create({ username: lower, name, role, password, cafeId, isActive: true })
  return { _id: user._id, name: user.name, username: user.username, role: user.role, cafeId: user.cafeId }
}

export const updateStaff = async (id, updates) => {
  const allowed = {}
  if (updates.name     !== undefined) allowed.name     = updates.name
  if (updates.role     !== undefined) allowed.role     = updates.role
  if (updates.isActive !== undefined) allowed.isActive = updates.isActive
  return User.findByIdAndUpdate(id, allowed, { new: true }).select('-password')
}

// Dedicated toggle — called by StaffList's PATCH /staff/:id/toggle-active
export const toggleActive = async (id) => {
  const user = await User.findById(id).select('isActive')
  if (!user) throw new AppError('Staff member not found', 404)
  user.isActive = !user.isActive
  await user.save()
  return { _id: user._id, isActive: user.isActive }
}

export const deleteStaff = async (id) => {
  await User.findByIdAndDelete(id)
}

export const resetPassword = async (id, newPassword) => {
  if (!newPassword || newPassword.length < 6)
    throw new AppError('Password must be at least 6 characters', 400)
  const user = await User.findById(id).select('+password')
  if (!user) throw new AppError('Staff member not found', 404)
  user.password = newPassword   // pre-save hook hashes it
  await user.save()
  return { message: 'Password updated' }
}