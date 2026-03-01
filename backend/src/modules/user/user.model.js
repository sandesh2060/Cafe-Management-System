// backend/src/modules/user/user.model.js
import mongoose from 'mongoose'
import bcrypt   from 'bcryptjs'

const userSchema = new mongoose.Schema({
  // ── Username-based identity ─────────────────────────────────────────────────
  username: {
    type:      String,
    unique:    true,
    sparse:    true,           // allows null for guest users
    lowercase: true,
    trim:      true,
  },

  name:          { type: String, required: true },
  email:         { type: String, unique: true, sparse: true, lowercase: true },
  password:      { type: String, select: false },
  role:          { type: String, enum: ['customer','waiter','kitchen','cashier','manager','admin'], default: 'customer' },
  cafeId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Cafe' },
  isActive:      { type: Boolean, default: true },
  isGuest:       { type: Boolean, default: false },
  googleId:      String,
  avatar:        String,
  loyaltyPoints: { type: Number, default: 0 },
  loyaltyTier:   { type: String, enum: ['bronze','silver','gold'], default: 'bronze' },

  // TTL field — guest users auto-delete from MongoDB after 24h
  expiresAt:     { type: Date, default: null },
}, { timestamps: true })

// MongoDB TTL index
userSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { isGuest: true } })

userSchema.pre('save', async function(next) {
  if (this.isNew && this.isGuest && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  }
  if (!this.isModified('password') || !this.password) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

userSchema.methods.comparePassword = function(plain) {
  return bcrypt.compare(plain, this.password)
}

export default mongoose.model('User', userSchema)