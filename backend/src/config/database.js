// src/config/database.js
import mongoose from 'mongoose'

let isConnected = false

export const connectDB = async () => {
  if (isConnected) return

  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not defined in environment variables')

  try {
    const conn = await mongoose.connect(uri, {
      dbName:               'kausichiya',
      maxPoolSize:          10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS:      45000,
    })
    isConnected = true
    console.log(`✅  MongoDB connected: ${conn.connection.host}`)
  } catch (err) {
    console.error('❌  MongoDB connection failed:', err.message)
    process.exit(1)
  }
}

mongoose.connection.on('disconnected', () => {
  isConnected = false
  console.warn('⚠️  MongoDB disconnected')
})

mongoose.connection.on('reconnected', () => {
  isConnected = true
  console.log('🔄  MongoDB reconnected')
})