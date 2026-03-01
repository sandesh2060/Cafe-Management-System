// backend/src/modules/auth/auth.service.js
import User      from '../user/user.model.js'
import { signToken } from '../../config/jwt.js'
import AppError  from '../../shared/utils/AppError.js'

/**
 * Check if a username exists.
 * Returns { exists: boolean }
 */
export const checkUsername = async (username) => {
  const trimmed = username?.trim()
  if (!trimmed) throw new AppError('Username is required', 400)
  if (trimmed.length < 2) throw new AppError('Username must be at least 2 characters', 400)

  const user = await User.findOne({ username: trimmed.toLowerCase() })
  return { exists: !!user }
}

/**
 * Register a new user by username + display name only (no email/password).
 * If username is already taken, throws 400.
 */
export const registerUser = async ({ username, name, role = 'customer', cafeId }) => {
  const trimmedUsername = username?.trim()?.toLowerCase()
  if (!trimmedUsername) throw new AppError('Username is required', 400)
  if (trimmedUsername.length < 2) throw new AppError('Username must be at least 2 characters', 400)
  if (!/^[a-z0-9_.-]+$/.test(trimmedUsername))
    throw new AppError('Username can only contain letters, numbers, underscores, dots, hyphens', 400)

  const exists = await User.findOne({ username: trimmedUsername })
  if (exists) throw new AppError('Username already taken', 400)

  const user = await User.create({
    username: trimmedUsername,
    name:     name?.trim() || trimmedUsername,
    role,
    cafeId,
  })

  const token = signToken({ userId: user._id, role: user.role })
  return {
    user:  { _id: user._id, name: user.name, username: user.username, role: user.role },
    token,
  }
}

/**
 * Login an existing user by username only (no password).
 */
export const loginUser = async ({ username }) => {
  const trimmedUsername = username?.trim()?.toLowerCase()
  if (!trimmedUsername) throw new AppError('Username is required', 400)

  const user = await User.findOne({ username: trimmedUsername })
  if (!user) throw new AppError('Username not found', 404)

  const token = signToken({ userId: user._id, role: user.role })
  return {
    user:  { _id: user._id, name: user.name, username: user.username, role: user.role },
    token,
  }
}