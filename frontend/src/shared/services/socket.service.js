// src/shared/services/socket.service.js
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

class SocketService {
  constructor() {
    this.socket    = null
    this.listeners = new Map()
    this._token    = null          // cache the last valid token
  }

  connect(token) {
    // ── Guard: never connect without a token ───────────────────
    if (!token) {
      console.warn('[Socket] connect() called with no token — skipping')
      return null
    }

    // ── Guard: already connected with the same token ───────────
    if (this.socket?.connected && this._token === token) {
      return this.socket
    }

    // ── If connected with a DIFFERENT token → reconnect cleanly ─
    if (this.socket) {
      console.log('[Socket] Token changed — reconnecting...')
      this.socket.disconnect()
      this.socket = null
    }

    this._token = token

    this.socket = io(SOCKET_URL, {
      auth:                 { token },
      transports:           ['websocket', 'polling'],
      reconnection:         true,
      reconnectionDelay:    1000,
      reconnectionAttempts: 10,
      timeout:              20000,
    })

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket.id)
    })

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason)
    })

    // ── Auth / user-not-found errors ────────────────────────────
    // Socket.IO surfaces these as connect_error with err.data from the server
    this.socket.on('connect_error', (err) => {
      const msg     = err.message || ''
      const errData = err.data   || {}

      console.error('[Socket] Connection error:', msg, errData)

      // Server sends "User not found" → token is invalid / user deleted
      // Stop reconnecting so we don't spam the server
      if (
        msg === 'User not found' ||
        errData?.type === 'UnauthorizedError' ||
        msg.toLowerCase().includes('unauthorized') ||
        msg.toLowerCase().includes('invalid token')
      ) {
        console.warn('[Socket] Auth failure — disconnecting and clearing token')
        this.socket.io.opts.reconnection = false   // stop auto-reconnect
        this.socket.disconnect()
        this._token = null

        // Dispatch a custom event so the app can react (e.g. redirect to login)
        window.dispatchEvent(new CustomEvent('socket:auth-error', { detail: { message: msg } }))
      }
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this._token = null
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