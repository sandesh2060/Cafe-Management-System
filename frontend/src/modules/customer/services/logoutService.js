// src/modules/customer/services/logoutService.js
//
// FIX: window.location.href = '/detect' replaced with DOM event dispatch.
// Hard redirect blows away Redux state and bypasses React Router.
// App.jsx listens for 'auth:logout-redirect' and calls navigate('/detect').
// This keeps the Redux store alive through the redirect so other cleanup
// that reads from store (e.g. socket disconnect) works correctly.

import store from '@store'
import { clearAuth }          from '@store/slices/authSlice'
import { clearCart }          from '@store/slices/cartSlice'
import { clearSession }       from '@store/slices/tableSessionSlice'
import { clearCall }          from '@store/slices/callWaiterSlice'
import { clearLoyalty }       from '@store/slices/loyaltySlice'
import { clearNotifications } from '@store/slices/notificationSlice'
import { clearActiveOrder }   from '@store/slices/orderSlice'
import socketService          from '@shared/services/socket.service'
import api                    from '@api/axios'
import { ENDPOINTS }          from '@api/endpoints'
import { clearPersistedSession } from '@modules/table/hooks/tableSession.utils'

class LogoutService {
  /**
   * Full logout — notifies server + clears everything.
   * Called by Rules 1, 3, and 4 (manual logout, payment, geofence).
   */
  async execute() {
    try {
      await api.post(ENDPOINTS.AUTH.LOGOUT).catch(() => {})
    } finally {
      this._clearClient()
    }
  }

  /**
   * Client-side cleanup only — no API call.
   * Used after payment success where server already processed the logout.
   */
  executeClient() {
    this._clearClient()
  }

  _clearClient() {
    // 1. Disconnect socket before clearing Redux so listeners clean up
    socketService.disconnect()

    // 2. Clear all Redux slices
    store.dispatch(clearAuth())
    store.dispatch(clearCart())
    store.dispatch(clearSession())
    store.dispatch(clearCall())
    store.dispatch(clearLoyalty())
    store.dispatch(clearNotifications())
    store.dispatch(clearActiveOrder())

    // 3. Clear localStorage
    localStorage.removeItem('kc_token')
    localStorage.removeItem('kc_user')
    localStorage.removeItem('kc_session')

    // 4. Clear persisted table session keys
    clearPersistedSession()

    // 5. FIX: dispatch DOM event so App.jsx handles redirect via React Router
    // instead of window.location.href which forces a full page reload.
    // App.jsx listens for this event and calls navigate('/detect', { replace: true }).
    window.dispatchEvent(new CustomEvent('auth:logout-redirect'))
  }
}

const logoutService = new LogoutService()
export default logoutService