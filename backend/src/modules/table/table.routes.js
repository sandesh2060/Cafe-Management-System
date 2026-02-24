// src/modules/table/table.routes.js
import { Router }       from 'express'
import Table            from './table.model.js'
import { authenticate, authorize } from '../auth/auth.middleware.js'
import { invalidateTableCache }    from '../table-session/algorithms/nearestTable.js'
import { generateQrToken }         from '../table-session/algorithms/qrHmacVerify.js'
import { catchAsync }              from '../../shared/middleware/errorHandler.js'
import AppError                    from '../../shared/utils/AppError.js'
import QRCode                      from 'qrcode'

const router = Router()

// GET /api/tables?cafeId=xxx
router.get('/', authenticate, authorize('manager', 'admin', 'waiter'), catchAsync(async (req, res) => {
  const cafeId = req.query.cafeId || req.user.cafeId
  const tables = await Table.find({ cafeId }).sort({ tableNumber: 1 }).lean()
  res.json({ success: true, tables })
}))

// POST /api/tables
router.post('/', authenticate, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  const cafeId     = req.body.cafeId || req.user.cafeId
  const qrToken    = generateQrToken(req.body.tableNumber?.toString(), cafeId.toString())
  const table      = await Table.create({ ...req.body, cafeId, qrToken })
  await invalidateTableCache(cafeId.toString())
  res.status(201).json({ success: true, table })
}))

// GET /api/tables/:id/qr  — returns PNG data URL
router.get('/:id/qr', authenticate, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  const table = await Table.findById(req.params.id)
  if (!table) throw new AppError('Table not found', 404)

  const token   = generateQrToken(table._id.toString(), table.cafeId.toString())
  const qrUrl   = `${process.env.FRONTEND_URL}/detect?qr=${token}`
  const dataUrl = await QRCode.toDataURL(qrUrl, { width: 300, margin: 2 })

  // Update stored token
  table.qrToken = token
  await table.save()

  res.json({ success: true, qrDataUrl: dataUrl, token, url: qrUrl })
}))

// PATCH /api/tables/:id
router.patch('/:id', authenticate, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  const table = await Table.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
  if (!table) throw new AppError('Table not found', 404)
  await invalidateTableCache(table.cafeId.toString())
  res.json({ success: true, table })
}))

// DELETE /api/tables/:id
router.delete('/:id', authenticate, authorize('manager', 'admin'), catchAsync(async (req, res) => {
  const table = await Table.findByIdAndDelete(req.params.id)
  if (!table) throw new AppError('Table not found', 404)
  await invalidateTableCache(table.cafeId.toString())
  res.json({ success: true, message: 'Table deleted' })
}))

export default router