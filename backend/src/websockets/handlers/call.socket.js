// src/websockets/handlers/call.socket.js
import { emitToUser } from '../index.js'

export default (io, socket) => {
  const { user } = socket

  socket.on('call:initiate', ({ toUserId, role }) => {
    emitToUser(toUserId, 'call:incoming', {
      callerId:   user._id,
      callerName: user.name,
      callerRole: user.role,
      role,
    })
  })

  socket.on('call:accepted', ({ toUserId }) => {
    emitToUser(toUserId, 'call:accepted', { by: user._id, name: user.name })
  })

  socket.on('call:rejected', ({ toUserId }) => {
    emitToUser(toUserId, 'call:rejected', { by: user._id })
  })

  socket.on('call:offer', ({ toUserId, sdp }) => {
    emitToUser(toUserId, 'call:offer', { from: user._id, sdp })
  })

  socket.on('call:answer', ({ toUserId, sdp }) => {
    emitToUser(toUserId, 'call:answer', { from: user._id, sdp })
  })

  socket.on('call:ice-candidate', ({ toUserId, candidate }) => {
    emitToUser(toUserId, 'call:ice-candidate', { from: user._id, candidate })
  })

  socket.on('call:ended', ({ toUserId }) => {
    emitToUser(toUserId, 'call:ended', { by: user._id })
  })
}