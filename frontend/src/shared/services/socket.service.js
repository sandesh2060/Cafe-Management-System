// src/shared/services/socket.service.js
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

class SocketService {
  constructor() {
    this.socket    = null
    this.listeners = new Map()
  }

  connect(token) {
    if (this.socket?.connected) return this.socket

    this.socket = io(SOCKET_URL, {
      auth:               { token },
      transports:         ['websocket', 'polling'],
      reconnection:       true,
      reconnectionDelay:  1000,
      reconnectionAttempts: 10,
      timeout:            20000,
    })

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket.id)
    })

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason)
    })

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message)
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  // Emit with optional ack callback
  emit(event, data, ack) {
    if (!this.socket?.connected) {
      console.warn('[Socket] Not connected — cannot emit:', event)
      return
    }
    if (ack) this.socket.emit(event, data, ack)
    else this.socket.emit(event, data)
  }

  // Subscribe to an event — returns unsubscribe fn
  on(event, handler) {
    if (!this.socket) return () => {}
    this.socket.on(event, handler)
    return () => this.socket?.off(event, handler)
  }

  off(event, handler) {
    this.socket?.off(event, handler)
  }

  // Join a room
  joinRoom(room) {
    this.emit('room:join', { room })
  }

  leaveRoom(room) {
    this.emit('room:leave', { room })
  }

  get isConnected() {
    return this.socket?.connected ?? false
  }

  get id() {
    return this.socket?.id
  }
}

// Singleton
const socketService = new SocketService()
export default socketService