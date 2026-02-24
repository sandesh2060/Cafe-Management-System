// src/modules/table/table.controller.js
import crypto      from 'node:crypto'
import Table       from './table.model.js'
import AppError    from '../../shared/utils/AppError.js'

// ── helpers ───────────────────────────────────────────────────────────────────

const generateQrToken = (tableId, tableNumber, cafeId) => {
  const payload = `${tableId}:${tableNumber}:${cafeId}:${Date.now()}`
  return crypto
    .createHmac('sha256', process.env.QR_HMAC_SECRET || 'dev-secret')
    .update(payload)
    .digest('hex')
}

const ok = (res, data, statusCode = 200) =>
  res.status(statusCode).json({ success: true, data })

// ── CREATE — POST /api/tables ─────────────────────────────────────────────────
export const createTable = async (req, res, next) => {
  try {
    const { tableNumber, lat, lng, radiusMeters, capacity, zone, cafeId } = req.body

    // Validate required fields explicitly for a clear error message
    if (!tableNumber) return next(new AppError('tableNumber is required', 400))
    if (lat  == null) return next(new AppError('lat is required', 400))
    if (lng  == null) return next(new AppError('lng is required', 400))
    if (!cafeId)      return next(new AppError('cafeId is required', 400))

    // Duplicate check — cafeId + tableNumber is unique (schema index)
    const exists = await Table.findOne({ cafeId, tableNumber })
    if (exists) return next(new AppError(`Table ${tableNumber} already exists in this cafe`, 409))

    // Create without qrToken first so we have the _id for the HMAC payload
    const table = await Table.create({
      tableNumber,
      lat,
      lng,
      radiusMeters: radiusMeters ?? 1.5,
      capacity:     capacity     ?? 4,
      zone:         zone         ?? 'Indoor',
      cafeId,
      isActive:     true,
      // loc is auto-set by the pre-save hook in the model
    })

    // Generate HMAC qrToken using the real _id
    table.qrToken = generateQrToken(table._id, tableNumber, cafeId)
    await table.save()

    return ok(res, { table }, 201)
  } catch (err) {
    // Mongoose duplicate key (race condition safety net)
    if (err.code === 11000) return next(new AppError('Table number already exists in this cafe', 409))
    next(err)
  }
}

// ── GET ALL — GET /api/tables?cafeId=xxx ─────────────────────────────────────
export const getTables = async (req, res, next) => {
  try {
    const { cafeId } = req.query
    if (!cafeId) return next(new AppError('cafeId query param is required', 400))

    const tables = await Table.find({ cafeId, isActive: true }).sort({ tableNumber: 1 })
    return ok(res, { tables, count: tables.length })
  } catch (err) { next(err) }
}

// ── GET ONE — GET /api/tables/:id ────────────────────────────────────────────
export const getTableById = async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id)
    if (!table) return next(new AppError('Table not found', 404))
    return ok(res, { table })
  } catch (err) { next(err) }
}

// ── UPDATE — PATCH /api/tables/:id ───────────────────────────────────────────
export const updateTable = async (req, res, next) => {
  try {
    const allowed = ['tableNumber', 'lat', 'lng', 'radiusMeters', 'capacity', 'zone', 'isActive']
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    )

    // If coords changed, the pre-save hook will re-sync loc automatically
    const table = await Table.findByIdAndUpdate(req.params.id, updates, {
      new:         true,
      runValidators: true,
    })
    if (!table) return next(new AppError('Table not found', 404))

    // If lat/lng changed, re-save to trigger pre-save hook for loc sync
    if (updates.lat || updates.lng) {
      table.lat = updates.lat ?? table.lat
      table.lng = updates.lng ?? table.lng
      await table.save()
    }

    return ok(res, { table })
  } catch (err) { next(err) }
}

// ── REGENERATE QR — POST /api/tables/:id/regenerate-qr ───────────────────────
export const regenerateQr = async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id)
    if (!table) return next(new AppError('Table not found', 404))

    table.qrToken = generateQrToken(table._id, table.tableNumber, table.cafeId)
    await table.save()

    return ok(res, { qrToken: table.qrToken, tableId: table._id })
  } catch (err) { next(err) }
}

// ── DELETE (soft) — DELETE /api/tables/:id ───────────────────────────────────
export const deleteTable = async (req, res, next) => {
  try {
    const table = await Table.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    )
    if (!table) return next(new AppError('Table not found', 404))
    return ok(res, { message: `Table ${table.tableNumber} deactivated` })
  } catch (err) { next(err) }
}