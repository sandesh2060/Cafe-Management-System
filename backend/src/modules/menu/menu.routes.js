// src/modules/menu/menu.routes.js
import { Router }       from 'express'
import MenuItem         from './menu.model.js'
import { authenticate, authorize } from '../auth/auth.middleware.js'
import { cache }        from '../../config/redis.js'
import { catchAsync }   from '../../shared/middleware/errorHandler.js'
import AppError         from '../../shared/utils/AppError.js'

const router = Router()

// GET /api/menu?cafeId=xxx&category=hot_drinks
router.get('/', catchAsync(async (req, res) => {
  const { cafeId, category } = req.query
  if (!cafeId) throw new AppError('cafeId is required', 400)

  const cacheKey = cache.KEYS.menu(cafeId)
  const cached   = await cache.get(cacheKey)
  if (cached) return res.json({ success: true, items: JSON.parse(cached), fromCache: true })

  const query = { cafeId, isAvailable: true }
  if (category && category !== 'all') query.category = category

  const items = await MenuItem.find({ cafeId, isAvailable: true })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean()

  await cache.set(cacheKey, JSON.stringify(items), cache.TTL.MENU)
  res.json({ success: true, items })
}))

// GET /api/menu/categories?cafeId=xxx
router.get('/categories', catchAsync(async (req, res) => {
  const { cafeId } = req.query
  if (!cafeId) throw new AppError('cafeId is required', 400)

  const categories = await MenuItem.distinct('category', { cafeId, isAvailable: true })
  res.json({ success: true, categories: ['all', ...categories] })
}))

// GET /api/menu/:id
router.get('/:id', catchAsync(async (req, res) => {
  const item = await MenuItem.findById(req.params.id).lean()
  if (!item) throw new AppError('Item not found', 404)
  res.json({ success: true, item })
}))

// POST /api/menu  — manager/admin only
router.post('/', authenticate, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  const item = await MenuItem.create({ ...req.body, cafeId: req.body.cafeId || req.user.cafeId })
  // Invalidate cache
  await cache.del(cache.KEYS.menu(item.cafeId))
  res.status(201).json({ success: true, item })
}))

// PATCH /api/menu/:id
router.patch('/:id', authenticate, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
  if (!item) throw new AppError('Item not found', 404)
  await cache.del(cache.KEYS.menu(item.cafeId.toString()))
  res.json({ success: true, item })
}))

// PATCH /api/menu/:id/availability
router.patch('/:id/availability', authenticate, authorize('manager', 'admin', 'kitchen'), catchAsync(async (req, res) => {
  const { isAvailable } = req.body
  const item = await MenuItem.findByIdAndUpdate(req.params.id, { isAvailable }, { new: true })
  if (!item) throw new AppError('Item not found', 404)
  await cache.del(cache.KEYS.menu(item.cafeId.toString()))
  res.json({ success: true, item })
}))

// DELETE /api/menu/:id
router.delete('/:id', authenticate, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  const item = await MenuItem.findByIdAndDelete(req.params.id)
  if (!item) throw new AppError('Item not found', 404)
  await cache.del(cache.KEYS.menu(item.cafeId.toString()))
  res.json({ success: true, message: 'Item deleted' })
}))

export default router