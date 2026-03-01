// backend/src/modules/inventory/inventory.controller.js
import * as service    from './inventory.service.js'
import { sendSuccess } from '../../shared/utils/response.js'

const getCafeId = (req) => req.user?.cafeId || process.env.DEFAULT_CAFE_ID

// GET /api/inventory
export const listItems = async (req, res, next) => {
  try {
    const items = await service.listItems(getCafeId(req))
    sendSuccess(res, { items }, 'OK')
  } catch (err) { next(err) }
}

// POST /api/inventory
export const createItem = async (req, res, next) => {
  try {
    const item = await service.createItem({ cafeId: getCafeId(req), ...req.body })
    sendSuccess(res, { item }, 'Item created', 201)
  } catch (err) { next(err) }
}

// PATCH /api/inventory/:id
export const updateItem = async (req, res, next) => {
  try {
    const item = await service.updateItem(req.params.id, req.body)
    sendSuccess(res, { item }, 'Item updated')
  } catch (err) { next(err) }
}

// DELETE /api/inventory/:id
export const deleteItem = async (req, res, next) => {
  try {
    await service.deleteItem(req.params.id)
    sendSuccess(res, null, 'Item deleted')
  } catch (err) { next(err) }
}

// GET /api/inventory/alerts
export const getLowStockAlerts = async (req, res, next) => {
  try {
    const items = await service.getLowStockAlerts(getCafeId(req))
    sendSuccess(res, { items }, 'OK')
  } catch (err) { next(err) }
}