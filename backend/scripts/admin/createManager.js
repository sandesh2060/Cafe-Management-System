// scripts/admin/createManager.js
import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt   from 'bcryptjs'

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kausichiya'

const userSchema = new mongoose.Schema({
  name: String, email: String, password: String,
  role: String, cafeId: mongoose.Schema.Types.ObjectId,
  isActive: { type: Boolean, default: true },
}, { timestamps: true })
const User = mongoose.model('User', userSchema)

const run = async () => {
  await mongoose.connect(uri)
  const [,, name, email, password, cafeId, role] = process.argv

  if (!name || !email || !password) {
    console.error('Usage: node createManager.js <name> <email> <password> [cafeId] [role=manager]')
    process.exit(1)
  }

  const existing = await User.findOne({ email })
  if (existing) { console.error('Email already exists'); process.exit(1) }

  const user = await User.create({
    name, email, cafeId: cafeId || null,
    password: await bcrypt.hash(password, 12),
    role: role || 'manager',
  })
  console.log(`✅ Created ${user.role}: ${user.name} <${user.email}>  ID: ${user._id}`)
  process.exit(0)
}

run().catch((e) => { console.error(e); process.exit(1) })