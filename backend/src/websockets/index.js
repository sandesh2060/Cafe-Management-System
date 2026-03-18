// backend/src/websockets/index.js
//
// FIXES:
// ✅ All socket handlers now registered inside io.on('connection')
// ✅ socket.user object populated from socket fields for handler compatibility
// ✅ user room join uses user: prefix consistently
// ✅ Graceful degradation — handler registration errors don't kill the connection

import { Server }                    from 'socket.io'
import { verifyToken }               from '../config/jwt.js'
import User                          from '../modules/user/user.model.js'
import { registerKitchenHandlers }   from './handlers/kitchen.socket.js'
import { registerWaiterHandlers }    from './handlers/waiter.socket.js'
import { registerTableHandlers }     from './handlers/table.socket.js'
import registerOrderHandlers         from './handlers/order.socket.js'
import registerMessageHandlers       from './handlers/message.socket.js'
import registerWaiterCallHandlers    from './handlers/waiterCall.socket.js'
import registerCallHandlers          from './handlers/call.socket.js'

let io = null

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized')
  return io
}

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
      methods:     ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  // ── Auth middleware ─────────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) return next(new Error('Authentication required'))

      const decoded = verifyToken(token)
      if (!decoded) return next(new Error('Invalid token'))

      const user = await User.findById(decoded.userId).select('-password').lean()
      if (!user || !user.isActive) return next(new Error('User not found'))

      // Attach to socket for all handlers to use
      socket.userId = user._id.toString()
      socket.role   = user.role
      socket.cafeId = user.cafeId?.toString()
      // Attach full user object for handlers that need name/role/etc
      socket.user   = {
        _id:    user._id,
        name:   user.name,
        role:   user.role,
        cafeId: user.cafeId,
      }

      next()
    } catch {
      next(new Error('Authentication failed'))
    }
  })

  // ── Connection ──────────────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const { userId, role, cafeId } = socket

    // Room joins
    socket.join(`user:${userId}`)
    if (cafeId) {
      socket.join(`${role}:${cafeId}`)
      socket.join(`cafe:${cafeId}`)
      if (role !== 'customer') socket.join(`staff:${cafeId}`)
    }

    console.log(`[Socket] Connected: ${userId} (${role})`)

    // ── Register all handlers ─────────────────────────────────────────────────
    // Each handler guards its own role requirements internally
    try { registerOrderHandlers(io, socket) }       catch (e) { console.error('[Socket] order handler error:', e.message) }
    try { registerMessageHandlers(io, socket) }     catch (e) { console.error('[Socket] message handler error:', e.message) }
    try { registerWaiterCallHandlers(io, socket) }  catch (e) { console.error('[Socket] waiterCall handler error:', e.message) }
    try { registerCallHandlers(io, socket) }        catch (e) { console.error('[Socket] call handler error:', e.message) }
    try { registerKitchenHandlers(io, socket) }     catch (e) { console.error('[Socket] kitchen handler error:', e.message) }
    try { registerWaiterHandlers(io, socket) }      catch (e) { console.error('[Socket] waiter handler error:', e.message) }
    try { registerTableHandlers(io, socket) }       catch (e) { console.error('[Socket] table handler error:', e.message) }

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${userId} (${reason})`)
    })
  })

  console.log('[Socket] Socket.io initialized')
  return io
}

// ── Emit helpers ──────────────────────────────────────────────────────────────
export const emitToUser  = (userId, event, data)       => io?.to(`user:${userId}`).emit(event, data)
export const emitToRole  = (role, cafeId, event, data) => io?.to(`${role}:${cafeId}`).emit(event, data)
export const emitToCafe  = (cafeId, event, data)       => io?.to(`cafe:${cafeId}`).emit(event, data)
export const emitToStaff = (cafeId, event, data)       => io?.to(`staff:${cafeId}`).emit(event, data)