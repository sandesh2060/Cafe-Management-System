import { Server } from 'socket.io'
import { verifyToken } from '../config/jwt.js'
import User from '../modules/user/user.model.js'
let io = null
export const getIO = () => { if (!io) throw new Error('Socket.io not initialized'); return io }
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173', methods: ['GET','POST'], credentials: true },
    transports: ['websocket','polling'],
  })
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) return next(new Error('Authentication required'))
      const decoded = verifyToken(token)
      if (!decoded) return next(new Error('Invalid token'))
      const user = await User.findById(decoded.userId).select('-password').lean()
      if (!user || !user.isActive) return next(new Error('User not found'))
      socket.userId = user._id.toString()
      socket.role   = user.role
      socket.cafeId = user.cafeId?.toString()
      next()
    } catch { next(new Error('Authentication failed')) }
  })
  io.on('connection', (socket) => {
    const { userId, role, cafeId } = socket
    socket.join(`user:${userId}`)
    if (cafeId) socket.join(`${role}:${cafeId}`)
    if (cafeId && role !== 'customer') socket.join(`staff:${cafeId}`)
    if (cafeId) socket.join(`cafe:${cafeId}`)
    socket.on('disconnect', () => console.log(`[Socket] Disconnected: ${userId}`))
  })
  console.log('Socket.io initialized')
  return io
}
export const emitToUser  = (userId, event, data)       => io?.to(`user:${userId}`).emit(event, data)
export const emitToRole  = (role, cafeId, event, data) => io?.to(`${role}:${cafeId}`).emit(event, data)
export const emitToCafe  = (cafeId, event, data)       => io?.to(`cafe:${cafeId}`).emit(event, data)
export const emitToStaff = (cafeId, event, data)       => io?.to(`staff:${cafeId}`).emit(event, data)
