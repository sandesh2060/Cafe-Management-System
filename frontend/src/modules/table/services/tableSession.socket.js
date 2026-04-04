// src/modules/table/services/tableSession.socket.js
//
// Handles session:user_joined socket event.
// When another user joins the same table session:
//   1. Immediately refetches the active order (no prompt, no confirm)
//   2. Dispatches sessionUserJoined so UI can show a subtle toast if needed
//   3. Calls socketService.updateSession() to ensure this socket is in table room

import socketService              from '@shared/services/socket.service'
import store                      from '@store/index'
import { fetchActiveOrder }       from '@store/slices/orderSlice'
import { setSession }             from '@store/slices/tableSessionSlice'

let _registered = false

/**
 * Call once after socket connects AND after table detection resolves.
 * Safe to call multiple times — registers handlers only once.
 */
export const registerTableSessionSocketHandlers = () => {
  if (_registered) return
  _registered = true

  // ── session:user_joined ───────────────────────────────────────────────────
  // Fires when a new user joins the same table session.
  // Kiran gets this when Sandesh is already at the table (or vice versa).
  socketService.on('session:user_joined', (data) => {
    console.log('[TableSession] User joined table:', data?.user?.name)

    // Immediately refetch the shared order — no prompt, shows instantly
    store.dispatch(fetchActiveOrder())

    // Optional: dispatch a lightweight action so components can show
    // a "Sandesh joined the table" toast without blocking the order view
    store.dispatch({ type: 'tableSession/userJoined', payload: data })
  })

  // ── order:new ─────────────────────────────────────────────────────────────
  // Fires when someone at the same table places a brand new order.
  // (Merge fires order:updated which useSocket.js already handles)
  socketService.on('order:new', (data) => {
    console.log('[TableSession] New order placed at table')
    if (data?.order) {
      store.dispatch(fetchActiveOrder())
    }
  })
}

/**
 * Call after table detection resolves with the new sessionId.
 * Ensures socket joins the table room even if it was connected before detection.
 */
export const notifySocketOfSession = (sessionId) => {
  if (!sessionId) return
  socketService.updateSession(sessionId)
  // Re-register handlers in case this is first session
  registerTableSessionSocketHandlers()
}

export default registerTableSessionSocketHandlers