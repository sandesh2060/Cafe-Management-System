// backend/src/modules/auth/auth.controller.js
import * as authService from './auth.service.js'
import User             from '../user/user.model.js'
import AppError         from '../../shared/utils/AppError.js'
import { sendSuccess }  from '../../shared/utils/response.js'

// ── Public ────────────────────────────────────────────────────────────────────

export const checkUsername = async (req, res, next) => {
  try {
    const data = await authService.checkUsername(req.body.username)
    sendSuccess(res, data, 'OK')
  } catch (err) { next(err) }
}

export const register = async (req, res, next) => {
  try {
    const data = await authService.registerUser(req.body)
    sendSuccess(res, data, 'Registered', 201)
  } catch (err) { next(err) }
}

export const login = async (req, res, next) => {
  try {
    const data = await authService.loginUser(req.body)
    sendSuccess(res, data, 'Logged in')
  } catch (err) { next(err) }
}

// ── Protected ─────────────────────────────────────────────────────────────────

export const logout = (req, res) =>
  res.json({ success: true, message: 'Logged out' })

export const me = (req, res) =>
  res.json({ success: true, data: req.user })

export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id
    const { username, avatar } = req.body
    const updates = {}

    // ── Username ──────────────────────────────────────────────────────────────
    if (username !== undefined) {
      const clean = String(username).trim().toLowerCase()

      if (clean.length < 3)
        throw new AppError('Username must be at least 3 characters', 400)
      if (clean.length > 20)
        throw new AppError('Username must be at most 20 characters', 400)
      if (!/^[a-z0-9_]+$/.test(clean))
        throw new AppError('Only letters, numbers and underscores allowed', 400)

      const taken = await User.findOne({ username: clean, _id: { $ne: userId } })
      if (taken) throw new AppError('Username already taken', 409)

      updates.username = clean
    }

    // ── Avatar ────────────────────────────────────────────────────────────────
    // Accepts: short avatar ID (e.g. 'the_regular'), data URL, or https URL
    if (avatar !== undefined) {
      if (typeof avatar !== 'string' || avatar.length === 0)
        throw new AppError('Invalid avatar', 400)
      const isId  = /^[a-z0-9_-]{2,30}$/.test(avatar)
      const isUrl = avatar.startsWith('data:image/') || avatar.startsWith('https://')
      if (!isId && !isUrl)
        throw new AppError('Invalid avatar format', 400)
      updates.avatar = avatar
    }

    if (!Object.keys(updates).length)
      throw new AppError('Nothing to update', 400)

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password')

    if (!user) throw new AppError('User not found', 404)

    sendSuccess(res, user, 'Profile updated')
  } catch (err) { next(err) }
}