// src/modules/inventory/inventory.model.js
import mongoose from 'mongoose'

const inventorySchema = new mongoose.Schema({
  cafeId:      { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  name:        { type: String, required: true, trim: true },
  category:    { type: String, enum: ['ingredient', 'supply', 'equipment'], default: 'ingredient' },
  unit:        { type: String, default: 'pcs' },   // kg, litre, pcs, pack
  quantity:    { type: Number, default: 0, min: 0 },
  lowThreshold:{ type: Number, default: 10 },       // Alert when below this
  linkedMenuItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }],
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

inventorySchema.virtual('isLow').get(function () {
  return this.quantity <= this.lowThreshold
})

export default mongoose.model('Inventory', inventorySchema)