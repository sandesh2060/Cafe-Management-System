// src/modules/table/table.model.js
import mongoose from 'mongoose'

const tableSchema = new mongoose.Schema({
  tableNumber:  { type: String, required: true },    // "T-7"
  lat:          { type: Number, required: true },
  lng:          { type: Number, required: true },
  radiusMeters: { type: Number, default: 1.5 },
  capacity:     { type: Number, default: 4 },
  zone:         { type: String, enum: ['Indoor', 'Outdoor', 'Terrace'], default: 'Indoor' },
  qrToken:      { type: String, default: null },      // HMAC-signed
  cafeId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Cafe', required: true },
  isActive:     { type: Boolean, default: true },

  // GeoJSON point for 2dsphere queries
  loc: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },   // [lng, lat]
  },
}, { timestamps: true })

// Auto-sync loc from lat/lng before save
tableSchema.pre('save', function (next) {
  this.loc = { type: 'Point', coordinates: [this.lng, this.lat] }
  next()
})

tableSchema.index({ loc: '2dsphere' })
tableSchema.index({ cafeId: 1, isActive: 1 })
tableSchema.index({ cafeId: 1, tableNumber: 1 }, { unique: true })

const Table = mongoose.model('Table', tableSchema)
export default Table