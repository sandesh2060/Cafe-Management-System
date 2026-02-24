import User from '../user/user.model.js'
import { signToken } from '../../config/jwt.js'
import AppError from '../../shared/utils/AppError.js'
export const registerUser = async ({ name, email, password, role = 'customer', cafeId }) => {
  const exists = await User.findOne({ email })
  if (exists) throw new AppError('Email already in use', 400)
  const user = await User.create({ name, email, password, role, cafeId })
  const token = signToken({ userId: user._id, role: user.role })
  return { user: { _id: user._id, name: user.name, email: user.email, role: user.role }, token }
}
export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password')
  if (!user || !(await user.comparePassword(password))) throw new AppError('Invalid credentials', 401)
  const token = signToken({ userId: user._id, role: user.role })
  return { user: { _id: user._id, name: user.name, email: user.email, role: user.role }, token }
}
