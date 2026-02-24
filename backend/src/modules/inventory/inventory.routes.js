// src/modules/inventory/inventory.routes.js
import { Router }     from 'express'
import Inventory      from './inventory.model.js'
import { authenticate, authorize } from '../auth/auth.middleware.js'
import { catchAsync } from '../../shared/middleware/errorHandler.js'
import AppError       from '../../shared/utils/AppError.js'

const router = Router()

// GET /api/inventory?cafeId=xxx
router.get('/', authenticate, authorize('manager', 'admin', 'kitchen'), catchAsync(async (req, res) => {
  const cafeId = req.query.cafeId || req.user.cafeId
  const items  = await Inventory.find({ cafeId }).sort({ name: 1 }).lean()
  const lowItems = items.filter((i) => i.quantity <= i.lowThreshold)
  res.json({ success: true, items, lowCount: lowItems.length })
}))

// GET /api/inventory/alerts?cafeId=xxx  — only low-stock items
router.get('/alerts', authenticate, authorize('manager', 'admin', 'kitchen'), catchAsync(async (req, res) => {
  const cafeId = req.query.cafeId || req.user.cafeId
  const items  = await Inventory.find({ cafeId }).lean()
  const alerts = items.filter((i) => i.quantity <= i.lowThreshold)
  res.json({ success: true, alerts })
}))

// POST /api/inventory
router.post('/', authenticate, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  const cafeId = req.body.cafeId || req.user.cafeId
  const item   = await Inventory.create({ ...req.body, cafeId })
  res.status(201).json({ success: true, item })
}))

// PATCH /api/inventory/:id
router.patch('/:id', authenticate, authorize('manager', 'admin', 'kitchen'), catchAsync(async (req, res) => {
  const item = await Inventory.findByIdAndUpdate(
    req.params.id,
    { ...req.body, lastUpdatedBy: req.user._id },
    { new: true, runValidators: true }
  )
  if (!item) throw new AppError('Item not found', 404)
  res.json({ success: true, item })
}))

// DELETE /api/inventory/:id
router.delete('/:id', authenticate, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  await Inventory.findByIdAndDelete(req.params.id)
  res.json({ success: true, message: 'Deleted' })
}))

export default router