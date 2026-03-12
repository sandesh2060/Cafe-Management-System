// backend/src/modules/notification/notification.model.js
import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  cafeId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Cafe' },
  type:    {
    type:    String,
    enum:    ['order', 'waiter', 'loyalty', 'system', 'message', 'payment'],
    default: 'system',
  },
  title:   { type: String, required: true },
  message: { type: String, required: true },
  data:    { type: mongoose.Schema.Types.Mixed, default: {} }, // extra payload
  read:    { type: Boolean, default: false, index: true },
}, { timestamps: true })

// TTL — auto-delete notifications older than 7 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 })

export default mongoose.model('Notification', notificationSchema)