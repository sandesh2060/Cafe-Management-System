// backend/src/modules/staff/staff.controller.js
import * as service    from './staff.service.js'
import { sendSuccess } from '../../shared/utils/response.js'

// POST /api/staff/login
export const staffLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body
    if (!username || !password)
      return res.status(400).json({ success: false, message: 'Username and password are required' })
    const data = await service.staffLogin({ username, password })
    sendSuccess(res, data, 'Logged in')
  } catch (err) { next(err) }
}

// GET /api/staff
export const listStaff = async (req, res, next) => {
  try {
    const staff = await service.listStaff(req.user.cafeId)
    sendSuccess(res, { staff }, 'OK')
  } catch (err) { next(err) }
}

// POST /api/staff
export const createStaff = async (req, res, next) => {
  try {
    const data = await service.createStaff({ ...req.body, cafeId: req.user.cafeId })
    sendSuccess(res, { staff: data }, 'Staff member created', 201)
  } catch (err) { next(err) }
}

// PATCH /api/staff/:id
export const updateStaff = async (req, res, next) => {
  try {
    const data = await service.updateStaff(req.params.id, req.body)
    sendSuccess(res, { staff: data }, 'Staff member updated')
  } catch (err) { next(err) }
}

// PATCH /api/staff/:id/toggle-active  ← called by StaffList
export const toggleActive = async (req, res, next) => {
  try {
    const data = await service.toggleActive(req.params.id)
    sendSuccess(res, data, 'Toggled')
  } catch (err) { next(err) }
}

// DELETE /api/staff/:id
export const deleteStaff = async (req, res, next) => {
  try {
    await service.deleteStaff(req.params.id)
    sendSuccess(res, null, 'Staff member deleted')
  } catch (err) { next(err) }
}

// POST /api/staff/:id/reset-password
export const resetPassword = async (req, res, next) => {
  try {
    // StaffList sends { newPassword } — support both field names
    const password = req.body.password || req.body.newPassword
    const data = await service.resetPassword(req.params.id, password)
    sendSuccess(res, data, 'Password reset')
  } catch (err) { next(err) }
}