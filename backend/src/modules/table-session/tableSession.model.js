// src/modules/table-session/tableSession.model.js
import mongoose from 'mongoose'

const tableSessionSchema = new mongoose.Schema({
  sessionId:        { type: String, unique: true, required: true },   // UUID v4
  tableId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  cafeId:           { type: mongoose.Schema.Types.ObjectId, ref: 'Cafe',  required: true },
  detectionMethod:  { type: String, enum: ['gps', 'qr', 'manual'], required: true },
  gpsAccuracy:      { type: Number, default: null },
  confidenceScore:  { type: Number, default: 0, min: 0, max: 100 },
  users:            [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status:           {
    type:    String,
    enum:    ['active', 'closed', 'expired', 'abandoned'],
    default: 'active',
  },
  openedAt:         { type: Date, default: Date.now },
  closedAt:         { type: Date, default: null },
  lastHeartbeat:    { type: Date, default: Date.now },
  orderIds:         [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
}, { timestamps: true })

tableSessionSchema.index({ sessionId: 1 })
tableSessionSchema.index({ tableId: 1, status: 1 })
tableSessionSchema.index({ cafeId: 1, status: 1 })
tableSessionSchema.index({ lastHeartbeat: 1 }, { expireAfterSeconds: 10800 })  // Auto-expire 3h

const TableSession = mongoose.model('TableSession', tableSessionSchema)
export default TableSession