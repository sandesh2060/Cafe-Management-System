import * as authService from './auth.service.js'
import { sendSuccess } from '../../shared/utils/response.js'
export const register = async (req, res, next) => {
  try { const data = await authService.registerUser(req.body); sendSuccess(res, data, 'Registered', 201) } catch (err) { next(err) }
}
export const login = async (req, res, next) => {
  try { const data = await authService.loginUser(req.body); sendSuccess(res, data, 'Logged in') } catch (err) { next(err) }
}
export const logout = (req, res) => res.json({ success: true, message: 'Logged out' })
export const me = (req, res) => res.json({ success: true, data: req.user })
