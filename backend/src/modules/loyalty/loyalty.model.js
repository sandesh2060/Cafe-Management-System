// src/modules/loyalty/loyalty.model.js
import mongoose from 'mongoose'

const loyaltySchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true },
  cafeId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Cafe', default: null },
  tier:      { type: String, enum: ['none', 'bronze', 'silver', 'gold'], default: 'bronze' },
  points:    { type: Number, default: 0, min: 0 },
  totalEarned: { type: Number, default: 0 },
  totalSpent:  { type: Number, default: 0 },
}, { timestamps: true })

const TIER_THRESHOLDS = { bronze: 0, silver: 500, gold: 1000 }

loyaltySchema.methods.addPoints = async function (pts) {
  this.points      += pts
  this.totalEarned += pts
  // Recalculate tier
  if (this.points >= 1000) this.tier = 'gold'
  else if (this.points >= 500) this.tier = 'silver'
  else this.tier = 'bronze'
  await this.save()
  return this
}

loyaltySchema.virtual('discountPct').get(function () {
  return { bronze: 5, silver: 10, gold: 15 }[this.tier] || 0
})

const Loyalty = mongoose.model('Loyalty', loyaltySchema)
export default Loyalty