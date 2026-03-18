// file : backend/scripts/admin/resetPassword.js
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import User from '../../src/modules/user/user.model.js'

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kausichiya'

const run = async () => {
    await mongoose.connect(uri)
    const [,, username, password] = process.argv
    const user = await User.findOne({ username })
    if (!user) { console.error('User not found'); process.exit(1) }
    user.password = await bcrypt.hash(password, 12)
    await user.save()
    console.log(`✅ Updated ${user.role}: ${user.name} <${user.email}>`)
    process.exit(0) 
}