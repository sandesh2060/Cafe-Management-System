// src/modules/auth/auth.service.js
import { v4 as uuid }  from 'uuid'
import User             from '../user/user.model.js'
import Loyalty          from '../loyalty/loyalty.model.js'
import { signToken }    from '../../config/jwt.js'
import { AppError }     from '../../shared/utils/AppError.js'

export const googleLogin = async (profile) => {
  let user = await User.findOne({ googleId: profile.id })

  if (!user) {
    // Create new customer
    const loyalty = await Loyalty.create({ tier: 'bronze', points: 0 })
    user = await User.create({
      name:      profile.displayName,
      email:     profile.emails?.[0]?.value,
      googleId:  profile.id,
      avatar:    profile.photos?.[0]?.value,
      role:      'customer',
      loyaltyId: loyalty._id,
    })
    loyalty.userId = user._id
    await loyalty.save()
  }

  user.lastLoginAt = new Date()
  await user.save()

  const token = signToken({ userId: user._id, role: user.role })
  return { user: user.toSafeJSON(), token }
}

export const guestLogin = async (sessionId) => {
  const user = await User.create({
    name:    `Guest_${uuid().slice(0, 6)}`,
    role:    'customer',
    isGuest: true,
  })

  const token = signToken({ userId: user._id, role: 'customer' })
  return { user: user.toSafeJSON(), token }
}

export const staffLogin = async (email, password) => {
  const user = await User.findOne({ email, isGuest: false }).select('+password')
  if (!user) throw new AppError('Invalid credentials', 401)
  if (!['waiter', 'kitchen', 'cashier', 'manager', 'admin'].includes(user.role)) {
    throw new AppError('Invalid credentials', 401)
  }

  const valid = await user.comparePassword(password)
  if (!valid) throw new AppError('Invalid credentials', 401)
  if (!user.isActive) throw new AppError('Account deactivated. Contact admin.', 403)

  user.lastLoginAt = new Date()
  await user.save()

  const token = signToken({ userId: user._id, role: user.role })
  return { user: user.toSafeJSON(), token }
}

export const logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { lastSeenAt: new Date() })
}