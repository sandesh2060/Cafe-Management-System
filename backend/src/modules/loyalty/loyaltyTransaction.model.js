import mongoose from 'mongoose'

const loyaltyTransactionSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  cafeId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Cafe',  required: true },
  orderId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  type:        { type: String, enum: ['earn', 'redeem', 'expire', 'adjustment'], required: true },
  points:      { type: Number, required: true },
  description: { type: String, default: null },
  balanceAfter:{ type: Number, default: null },
}, { timestamps: true })

loyaltyTransactionSchema.index({ userId: 1, createdAt: -1 })
loyaltyTransactionSchema.index({ cafeId: 1, createdAt: -1 })

export default mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema)
