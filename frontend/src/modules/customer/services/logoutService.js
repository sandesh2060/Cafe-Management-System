// src/modules/customer/services/logoutService.js
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

class LogoutService {
  /**
   * Execute full logout — clears everything.
   * Called by Rules 1, 3, and 4.
   */
  async execute() {
    try {
      // Notify server (best-effort)
      await api.post(ENDPOINTS.AUTH.LOGOUT).catch(() => {})
    } finally {
      this._clearClient()
    }
  }

  /**
   * Client-side cleanup only — no API call.
   * Used after payment success where server already knows.
   */
  executeClient() {
    this._clearClient()
  }

  _clearClient() {
    // Disconnect socket first
    socketService.disconnect()

    // Clear all Redux slices
    store.dispatch(clearAuth())
    store.dispatch(clearCart())
    store.dispatch(clearSession())
    store.dispatch(clearCall())
    store.dispatch(clearLoyalty())
    store.dispatch(clearNotifications())
    store.dispatch(clearActiveOrder())

    // Clear localStorage
    localStorage.removeItem('kc_token')
    localStorage.removeItem('kc_user')
    localStorage.removeItem('kc_session')

    // Redirect to detection page
    window.location.href = '/detect'
  }
}

const logoutService = new LogoutService()
export default logoutService