// backend/src/modules/inventory/inventory.model.js
import mongoose from 'mongoose'

const inventorySchema = new mongoose.Schema({
  cafeId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Cafe', required: true },
  name:         { type: String, required: true, trim: true },
  unit:         { type: String, default: 'pcs' },
  quantity:     { type: Number, default: 0, min: 0 },
  lowThreshold: { type: Number, default: 10 },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true })

inventorySchema.index({ cafeId: 1, isActive: 1 })
inventorySchema.index({ cafeId: 1, quantity: 1 })

export default mongoose.model('Inventory', inventorySchema)