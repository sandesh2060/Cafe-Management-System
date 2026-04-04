// src/shared/services/socket.service.js
// FIX: connect() now accepts an empty string as token (cookie auth mode).
// Previously: `if (!token) return null` blocked cookie-auth connections.
// Now: only block if token is explicitly null/undefined (not logged in).
// When token is '' (empty string), connect proceeds — backend reads the
// JWT from the httpOnly cookie in the WebSocket handshake headers.

import { io } from 'socket.io-client'
import store   from '@store/index'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

class SocketService {
  constructor() {
    this.socket            = null
    this._token            = null
    this._sessionId        = null
    this._pendingListeners = []
  }

  connect(token) {
    // FIX: allow empty string (cookie auth) — only block null/undefined
    if (token === null || token === undefined) {
      console.warn('[Socket] connect() called with no token — skipping')
      return null
    }

    const sessionId = store.getState().tableSession?.session?.sessionId ?? null

    if (this.socket?.connected && this._token === token && this._sessionId === sessionId) {
      return this.socket
    }

    if (this.socket) {
      console.log('[Socket] Reconnecting cleanly...')
      this.socket.io.skipReconnect = true
      this.socket.disconnect()
      this.socket = null
    }

    this._token     = token
    this._sessionId = sessionId

    this.socket = io(SOCKET_URL, {
      // Only send auth.token if it's a real token (not empty string)
      // Backend will fall back to cookie if auth.token is absent/empty
      auth:       token ? { token } : {},
      query:      sessionId ? { sessionId } : {},
      transports: ['websocket', 'polling'],
      reconnection:         true,
      reconnectionDelay:    1000,
      reconnectionAttempts: 10,
      timeout:              20000,
      extraHeaders: import.meta.env.DEV
        ? { 'ngrok-skip-browser-warning': 'true' }
        : {},
    })

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket.id)
      this._pendingListeners.forEach(({ event, handler }) => {
        this.socket.on(event, handler)
      })
      this._pendingListeners = []
    })

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason)
    })

    this.socket.on('connect_error', (err) => {
      const msg     = err.message || ''
      const errData = err.data   || {}
      console.error('[Socket] Connection error:', msg, errData)

      if (
        msg === 'User not found' ||
        errData?.type === 'UnauthorizedError' ||
        msg.toLowerCase().includes('unauthorized') ||
        msg.toLowerCase().includes('invalid token')
      ) {
        console.warn('[Socket] Auth failure — disconnecting')
        this.socket.io.skipReconnect = true
        this.socket.disconnect()
        this.socket = null
        this._token = null
        window.dispatchEvent(new CustomEvent('socket:auth-error', { detail: { message: msg } }))
      }
    })

    return this.socket
  }

  updateSession(sessionId) {
    if (!sessionId || sessionId === this._sessionId) return
    this._sessionId = sessionId
    if (this.socket?.connected) {
      console.log('[Socket] Late-joining table room:', sessionId)
      this.socket.emit('session:join', { sessionId })
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.io.skipReconnect = true
      this.socket.disconnect()
      this.socket = null
    }
    this._token            = null
    this._sessionId        = null
    this._pendingListeners = []
  }

  emit(event, data, ack) {
    if (!this.socket?.connected) {
      console.warn('[Socket] Not connected — cannot emit:', event)
      return
    }
    if (ack) this.socket.emit(event, data, ack)
    else     this.socket.emit(event, data)
  }

  on(event, handler) {
    if (!this.socket) {
      this._pendingListeners.push({ event, handler })
      return () => {
        this._pendingListeners = this._pendingListeners.filter(
          l => !(l.event === event && l.handler === handler)
        )
        this.socket?.off(event, handler)
      }
    }
    this.socket.on(event, handler)
    return () => this.socket?.off(event, handler)
  }

  off(event, handler) {
    this.socket?.off(event, handler)
    this._pendingListeners = this._pendingListeners.filter(
      l => !(l.event === event && l.handler === handler)
    )
  }

  joinRoom(room)  { this.emit('room:join',  { room }) }
  leaveRoom(room) { this.emit('room:leave', { room }) }

  get isConnected() { return this.socket?.connected ?? false }
  get id()          { return this.socket?.id }
}

const socketService = new SocketService()
export const getSocket = () => socketService.socket
export default socketService