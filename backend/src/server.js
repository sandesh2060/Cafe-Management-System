// src/server.js
import 'dotenv/config'
import http          from 'http'
import app           from './app.js'
import { initSocket } from './websockets/index.js'
import { connectDB }  from './config/database.js'
import { connectRedis } from './config/redis.js'

const PORT = process.env.PORT || 5000

const httpServer = http.createServer(app)
initSocket(httpServer)

const start = async () => {
  await connectDB()
  await connectRedis()

  httpServer.listen(PORT, () => {
    console.log(`\n☕  कौसी चिया server running on port ${PORT}`)
    console.log(`   Environment: ${process.env.NODE_ENV}`)
    console.log(`   DB: ${process.env.MONGODB_URI?.split('@')[1] || 'local'}\n`)
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})

// Graceful shutdown
const shutdown = () => {
  httpServer.close(() => {
    console.log('\n✋  Server shut down gracefully')
    process.exit(0)
  })
}
process.on('SIGTERM', shutdown)
process.on('SIGINT',  shutdown)