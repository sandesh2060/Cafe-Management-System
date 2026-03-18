// src/shared/services/socket.service.js
//
// FIXES:
// ✅ Listener queue — on() called before connect() now queues listeners
//    and replays them once socket connects. Eliminates the race condition
//    where useNotifications effects register before useSocket connects.
// ✅ disconnect() sets skipReconnect before disconnect to prevent race.
// ✅ connect() clears socket synchronously before creating new instance.
// ✅ off() method works correctly for handler removal.

import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

class SocketService {
  constructor() {
    this.socket       = null
    this._token       = null
    // Queue for listeners registered before socket connects
    // { event, handler }[]
    this._pendingListeners = []
  }

  connect(token) {
    if (!token) {
      console.warn('[Socket] connect() called with no token — skipping')
      return null
    }

    if (this.socket?.connected && this._token === token) {
      return this.socket
    }

    if (this.socket) {
      console.log('[Socket] Token changed — reconnecting cleanly...')
      this.socket.io.skipReconnect = true
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
      extraHeaders: import.meta.env.DEV
        ? { 'ngrok-skip-browser-warning': 'true' }
        : {},
    })

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket.id)
      // Replay any listeners registered before socket was ready
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

  disconnect() {
    if (this.socket) {
      this.socket.io.skipReconnect = true
      this.socket.disconnect()
      this.socket = null
    }
    this._token = null
    this._pendingListeners = []
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
  // If socket not yet connected, queues the listener for replay on connect.
  on(event, handler) {
    if (!this.socket) {
      // Queue for replay once socket connects
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
export default socketService