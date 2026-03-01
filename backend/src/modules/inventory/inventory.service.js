// backend/src/modules/inventory/inventory.service.js
import Inventory from './inventory.model.js'
import AppError  from '../../shared/utils/AppError.js'

export const listItems = async (cafeId) => {
  const items = await Inventory.find({ cafeId, isActive: true })
    .sort({ name: 1 })
    .lean()
  return items
}

export const createItem = async ({ cafeId, name, unit, quantity, lowThreshold }) => {
  if (!name?.trim()) throw new AppError('Name is required', 400)
  const item = await Inventory.create({
    cafeId,
    name: name.trim(),
    unit:         unit         ?? 'pcs',
    quantity:     quantity     ?? 0,
    lowThreshold: lowThreshold ?? 10,
  })
  return item
}

export const updateItem = async (id, { quantity, lowThreshold, name, unit, isActive }) => {
  const allowed = {}
  if (quantity     !== undefined) allowed.quantity     = Math.max(0, quantity)
  if (lowThreshold !== undefined) allowed.lowThreshold = lowThreshold
  if (name         !== undefined) allowed.name         = name.trim()
  if (unit         !== undefined) allowed.unit         = unit
  if (isActive     !== undefined) allowed.isActive     = isActive

  const item = await Inventory.findByIdAndUpdate(id, allowed, { new: true })
  if (!item) throw new AppError('Item not found', 404)
  return item
}

export const deleteItem = async (id) => {
  // Soft-delete
  const item = await Inventory.findByIdAndUpdate(id, { isActive: false }, { new: true })
  if (!item) throw new AppError('Item not found', 404)
  return item
}

export const getLowStockAlerts = async (cafeId) => {
  const items = await Inventory.find({
    cafeId,
    isActive: true,
    $expr: { $lte: ['$quantity', '$lowThreshold'] },
  }).lean()
  return items
}