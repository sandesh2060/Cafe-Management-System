// src/websockets/index.js
import { Server }       from 'socket.io'
import { verifyToken }  from '../config/jwt.js'
import User             from '../modules/user/user.model.js'
import orderSocket      from './handlers/order.socket.js'
import waiterCallSocket from './handlers/waiterCall.socket.js'
import messageSocket    from './handlers/message.socket.js'
import callSocket       from './handlers/call.socket.js'
import tableSocket      from './handlers/table.socket.js'
import logoutSocket     from './handlers/logout.socket.js'
import kitchenSocket    from './handlers/kitchen.socket.js'
import waiterSocket     from './handlers/waiter.socket.js'

let io = null

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized')
  return io
}

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin:  process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout:  60000,
    pingInterval: 25000,
  })

  // ── Auth middleware ────────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) return next(new Error('Authentication required'))

      const decoded = verifyToken(token)
      if (!decoded) return next(new Error('Invalid token'))

      const user = await User.findById(decoded.userId).select('-password').lean()
      if (!user || !user.isActive) return next(new Error('User not found'))

      socket.user   = user
      socket.userId = user._id.toString()
      socket.role   = user.role
      socket.cafeId = user.cafeId?.toString()
      next()
    } catch (err) {
      next(new Error('Authentication failed'))
    }
  })

  io.on('connection', (socket) => {
    const { userId, role, cafeId } = socket

    console.log(`[Socket] Connected: ${userId} (${role})`)

    // ── Auto-join rooms ────────────────────────────────────────────────────
    // Personal room
    socket.join(`user:${userId}`)
    // Role room per cafe
    if (cafeId) socket.join(`${role}:${cafeId}`)
    // All-staff room per cafe
    if (cafeId && role !== 'customer') socket.join(`staff:${cafeId}`)
    // Cafe-wide room
    if (cafeId) socket.join(`cafe:${cafeId}`)

    // ── Manual room join/leave ─────────────────────────────────────────────
    socket.on('room:join',  ({ room }) => socket.join(room))
    socket.on('room:leave', ({ room }) => socket.leave(room))

    // ── Register module handlers ───────────────────────────────────────────
    orderSocket(io, socket)
    waiterCallSocket(io, socket)
    messageSocket(io, socket)
    callSocket(io, socket)
    tableSocket(io, socket)
    logoutSocket(io, socket)
    kitchenSocket(io, socket)
    waiterSocket(io, socket)

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${userId} (${reason})`)
    })
  })

  console.log('✅  Socket.io initialized')
  return io
}

// ── Emit helpers ───────────────────────────────────────────────────────────────
export const emitToUser   = (userId, event, data)        => io?.to(`user:${userId}`).emit(event, data)
export const emitToRole   = (role, cafeId, event, data)  => io?.to(`${role}:${cafeId}`).emit(event, data)
export const emitToCafe   = (cafeId, event, data)        => io?.to(`cafe:${cafeId}`).emit(event, data)
export const emitToStaff  = (cafeId, event, data)        => io?.to(`staff:${cafeId}`).emit(event, data)