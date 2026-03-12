// src/modules/menu/menu.model.js
import mongoose from 'mongoose'

// ── Portion sub-schema ────────────────────────────────────────────────────────
// Each item can optionally have portions (e.g. Half Plate / Full Plate).
// Empty array → single-price item (legacy-safe, base `price` is used as-is).
// Non-empty  → `price` is auto-set to the lowest portion price on save (for
//              card display before the customer picks a portion).
const portionSchema = new mongoose.Schema(
  {
    id:        { type: String, required: true, trim: true },   // 'half' | 'full' | 'quarter'
    label:     { type: String, required: true, trim: true },   // 'Half Plate' | 'Full Plate'
    price:     { type: Number, required: true, min: 0 },
    isDefault: { type: Boolean, default: false },              // pre-selected in the UI
    sortOrder: { type: Number,  default: 0 },
  },
  { _id: false }
)

const menuItemSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: null },

    // ── Price ─────────────────────────────────────────────────────────────────
    // Single-price items  → set manually, never auto-modified.
    // Portioned items     → auto-set to the lowest portion price before save
    //                       so MenuCard always shows "starts from Rs X".
    price: { type: Number, required: true, min: 0 },

    // ── Portions ──────────────────────────────────────────────────────────────
    // [] → single-price (no portion picker shown)
    // [{ id, label, price, isDefault, sortOrder }, ...] → portion picker shown
    portions: { type: [portionSchema], default: [] },

    category:               { type: String, required: true },
    emoji:                  { type: String, default: '🍽️' },
    image:                  { type: String, default: null },
    cafeId:                 { type: mongoose.Schema.Types.ObjectId, ref: 'Cafe', required: true },
    isAvailable:            { type: Boolean, default: true },
    isFeatured:             { type: Boolean, default: false },
    isVeg:                  { type: Boolean, default: false },
    spiceLevel:             { type: Number, min: 0, max: 3, default: 0 },
    preparationTimeMinutes: { type: Number, default: 10 },
    allergens:              [{ type: String }],
    tags:                   [{ type: String }],
    sortOrder:              { type: Number, default: 0 },
  },
  { timestamps: true }
)

// ── Auto-sync base price for portioned items ──────────────────────────────────
menuItemSchema.pre('save', function (next) {
  if (this.portions && this.portions.length > 0) {
    // Ensure exactly one default; if none set, mark the lowest-price one
    const hasDefault = this.portions.some(p => p.isDefault)
    if (!hasDefault) {
      const sorted = [...this.portions].sort((a, b) => a.price - b.price)
      this.portions.forEach(p => { p.isDefault = p.id === sorted[0].id })
    }
    // Base price = min portion price (shown on card before selection)
    this.price = Math.min(...this.portions.map(p => p.price))
  }
  next()
})

// Same logic for findOneAndUpdate paths
menuItemSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate()
  const portions = update?.portions ?? update?.$set?.portions
  if (portions && portions.length > 0) {
    const minPrice = Math.min(...portions.map(p => p.price))
    if (update.$set) update.$set.price = minPrice
    else update.price = minPrice
  }
  next()
})

menuItemSchema.index({ cafeId: 1, isAvailable: 1 })
menuItemSchema.index({ cafeId: 1, category: 1 })
menuItemSchema.index({ cafeId: 1, isFeatured: 1 })

const MenuItem = mongoose.model('MenuItem', menuItemSchema)
export default MenuItem