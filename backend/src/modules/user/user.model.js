// backend/src/modules/user/user.model.js
import mongoose from 'mongoose'
import bcrypt   from 'bcryptjs'

const userSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  email:         { type: String, unique: true, sparse: true, lowercase: true },
  password:      { type: String, select: false },
  role:          { type: String, enum: ['customer','waiter','kitchen','cashier','manager','admin'], default: 'customer' },
  cafeId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Cafe' },
  isActive:      { type: Boolean, default: true },
  isGuest:       { type: Boolean, default: false },   // ← new: marks throwaway guest accounts
  googleId:      String,
  avatar:        String,
  loyaltyPoints: { type: Number, default: 0 },
  loyaltyTier:   { type: String, enum: ['bronze','silver','gold'], default: 'bronze' },

  // TTL field — guest users auto-delete from MongoDB after 24h
  // Non-guest users leave this null so they're never deleted
  expiresAt:     { type: Date, default: null },
}, { timestamps: true })

// MongoDB TTL index — documents with expiresAt set are auto-deleted when the date passes
userSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { isGuest: true } })

userSchema.pre('save', async function(next) {
  // Set TTL for guest users on first save
  if (this.isNew && this.isGuest && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h from now
  }
  if (!this.isModified('password') || !this.password) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

userSchema.methods.comparePassword = function(plain) {
  return bcrypt.compare(plain, this.password)
}

export default mongoose.model('User', userSchema)