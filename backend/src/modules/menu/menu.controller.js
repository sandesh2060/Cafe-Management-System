// src/modules/menu/menu.controller.js
import MenuItem from './menu.model.js'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/menu/:cafeId
// Returns all available menu items for a cafe, grouped by category.
// Query params:
//   ?category=hot_drinks   → filter by single category
//   ?search=momo           → fuzzy name/description search
//   ?available=true|false  → default: true (only available items)
// ─────────────────────────────────────────────────────────────────────────────
export const getMenuByCafe = async (req, res) => {
  try {
    const { cafeId } = req.params
    const { category, search, available = 'true' } = req.query

    const filter = {
      cafeId,
      ...(available !== 'all' && { isAvailable: available === 'true' }),
      ...(category  && { category }),
      ...(search    && {
        $or: [
          { name:        { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags:        { $regex: search, $options: 'i' } },
        ],
      }),
    }

    const items = await MenuItem
      .find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .lean()

    if (!items.length) {
      return res.json({
        success: true,
        data: { cafeId, categories: [], grouped: {}, items: [], total: 0 },
      })
    }

    // Group by category for easy frontend consumption
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    }, {})

    // Derive unique category list in sort order
    const categories = [...new Set(items.map(i => i.category))]

    return res.json({
      success: true,
      data: {
        cafeId,
        categories,   // ['hot_drinks', 'cold_drinks', ...]
        grouped,      // { hot_drinks: [...], cold_drinks: [...] }
        items,        // flat array — useful for search + recommendations
        total: items.length,
      },
    })
  } catch (err) {
    console.error('[Menu] getMenuByCafe error:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch menu.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/menu/:cafeId/item/:id
// ─────────────────────────────────────────────────────────────────────────────
export const getMenuItemById = async (req, res) => {
  try {
    const { cafeId, id } = req.params

    const item = await MenuItem.findOne({ _id: id, cafeId }).lean()
    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found.' })
    }

    return res.json({ success: true, data: item })
  } catch (err) {
    console.error('[Menu] getMenuItemById error:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch item.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/menu/:cafeId  (manager/admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const createMenuItem = async (req, res) => {
  try {
    const { cafeId } = req.params

    const item = await MenuItem.create({ ...req.body, cafeId })
    return res.status(201).json({ success: true, data: item })
  } catch (err) {
    console.error('[Menu] createMenuItem error:', err)
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message })
    }
    return res.status(500).json({ success: false, message: 'Failed to create item.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/menu/:cafeId/item/:id  (manager/admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const updateMenuItem = async (req, res) => {
  try {
    const { cafeId, id } = req.params

    const item = await MenuItem.findOneAndUpdate(
      { _id: id, cafeId },
      req.body,
      { new: true, runValidators: true }
    )
    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found.' })
    }

    return res.json({ success: true, data: item })
  } catch (err) {
    console.error('[Menu] updateMenuItem error:', err)
    return res.status(500).json({ success: false, message: 'Failed to update item.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/menu/:cafeId/item/:id  (manager/admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteMenuItem = async (req, res) => {
  try {
    const { cafeId, id } = req.params

    const item = await MenuItem.findOneAndDelete({ _id: id, cafeId })
    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found.' })
    }

    return res.json({ success: true, message: 'Item deleted.' })
  } catch (err) {
    console.error('[Menu] deleteMenuItem error:', err)
    return res.status(500).json({ success: false, message: 'Failed to delete item.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/menu/:cafeId/item/:id/toggle  (manager/admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const toggleAvailability = async (req, res) => {
  try {
    const { cafeId, id } = req.params

    const item = await MenuItem.findOne({ _id: id, cafeId })
    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found.' })
    }

    item.isAvailable = !item.isAvailable
    await item.save()

    return res.json({
      success: true,
      data:    { _id: item._id, isAvailable: item.isAvailable },
      message: `Item is now ${item.isAvailable ? 'available' : 'unavailable'}.`,
    })
  } catch (err) {
    console.error('[Menu] toggleAvailability error:', err)
    return res.status(500).json({ success: false, message: 'Failed to toggle availability.' })
  }
}