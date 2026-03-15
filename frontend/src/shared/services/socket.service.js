// src/shared/services/socket.service.js
//
// FIXES:
// • disconnect() now calls socket.io.skipReconnect = true before disconnect()
//   so socket.io-client's reconnect manager doesn't race against the new connect().
// • connect() clears this.socket synchronously before calling io() — no stale ref.
// • on() warns if socket is null so callers know they registered too early.
// • GEOFENCE_EXIT — useGpsWatcher needs this; kept in socket layer as an emit,
//   not a REST call (see useGpsWatcher fix).

import { io } from 'socket.io-client'

// VITE_SOCKET_URL must point to the backend root (no /api suffix).
// In dev with ngrok: VITE_SOCKET_URL=https://xxxx.ngrok-free.dev
// In production:     VITE_SOCKET_URL=https://api.yourdomain.com
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

class SocketService {
  constructor() {
    this.socket    = null
    this.listeners = new Map()
    this._token    = null
  }

  connect(token) {
    // ── Guard: never connect without a token ─────────────────────────────────
    if (!token) {
      console.warn('[Socket] connect() called with no token — skipping')
      return null
    }

    // ── Guard: already connected with the same token ──────────────────────────
    if (this.socket?.connected && this._token === token) {
      return this.socket
    }

    // ── If a socket already exists (different token OR disconnected) ──────────
    // FIX: mark skipReconnect BEFORE disconnect() so the reconnect manager
    // doesn't immediately try to reconnect while we're creating a new socket.
    // Without this, socket.io races: old socket reconnects as new socket connects
    // → "WebSocket closed before connection established".
    if (this.socket) {
      console.log('[Socket] Token changed — reconnecting cleanly...')
      this.socket.io.skipReconnect = true   // stop auto-reconnect on old instance
      this.socket.disconnect()
      this.socket = null                    // clear ref synchronously before io()
    }

    this._token = token

    this.socket = io(SOCKET_URL, {
      auth:                 { token },
      transports:           ['websocket', 'polling'],
      reconnection:         true,
      reconnectionDelay:    1000,
      reconnectionAttempts: 10,
      timeout:              20000,
      // Bypass ngrok browser warning in dev — ngrok returns HTML interstitial
      // instead of upgrading the WebSocket connection without this header.
      extraHeaders: import.meta.env.DEV
        ? { 'ngrok-skip-browser-warning': 'true' }
        : {},
    })

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket.id)
    })

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason)
    })

    // ── Auth / user-not-found errors ──────────────────────────────────────────
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
        console.warn('[Socket] Auth failure — disconnecting and clearing token')
        this.socket.io.skipReconnect = true
        this.socket.disconnect()
        this.socket = null
        this._token = null
        window.dispatchEvent(new CustomEvent('socket:auth-error', { detail: { message: msg } }))
      }
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.io.skipReconnect = true   // prevent reconnect manager from firing
      this.socket.disconnect()
      this.socket = null
    }
    this._token = null
  }

  emit(event, data, ack) {
    if (!this.socket?.connected) {
      console.warn('[Socket] Not connected — cannot emit:', event)
      return
    }
    if (ack) this.socket.emit(event, data, ack)
    else this.socket.emit(event, data)
  }

  // Returns an unsubscribe function.
  // FIX: warns (instead of silently returning no-op) when socket is null
  // so callers can detect early-registration bugs during development.
  on(event, handler) {
    if (!this.socket) {
      if (import.meta.env.DEV) {
        console.warn(`[Socket] on('${event}') called before socket connected — listener not registered`)
      }
      return () => {}
    }
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