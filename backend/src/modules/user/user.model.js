// src/modules/user/user.model.js
import mongoose from 'mongoose'
import bcrypt   from 'bcryptjs'

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  password:     { type: String, select: false },
  avatar:       { type: String, default: null },
  role:         {
    type:    String,
    enum:    ['customer', 'waiter', 'kitchen', 'cashier', 'manager', 'admin'],
    default: 'customer',
    required: true,
  },
  cafeId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Cafe', default: null },
  isGuest:      { type: Boolean, default: false },
  isActive:     { type: Boolean, default: true },
  googleId:     { type: String, sparse: true },
  faceDescriptor: { type: [Number], default: null },   // face-api.js

  // Customer specific
  loyaltyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Loyalty', default: null },

  lastLoginAt:  { type: Date, default: null },
  lastSeenAt:   { type: Date, default: null },
}, { timestamps: true })

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password)
}

userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject()
  delete obj.password
  delete obj.faceDescriptor
  return obj
}

// Indexes
userSchema.index({ email: 1 })
userSchema.index({ role: 1, cafeId: 1 })
userSchema.index({ googleId: 1 })

const User = mongoose.model('User', userSchema)
export default User