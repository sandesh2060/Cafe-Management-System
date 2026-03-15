// src/modules/customer/services/orderService.js
//
// All order-related API calls.
// Axios instance (src/api/axios.js) already:
//   • attaches Bearer token from localStorage
//   • unwraps response.data
//   • redirects to /login on 401
//
// Every method returns the unwrapped payload (e.g. { success, order }).

import api from '@api/axios'
import { ENDPOINTS as EP } from '@api/endpoints'

const orderService = {
  // ── Place order ───────────────────────────────────────────────────────────
  // payload: {
  //   items:       CartItem[]
  //   tableId:     string
  //   sessionId:   string
  //   cafeId:      string
  //   loyaltyTier: string
  //   specialNote: string | null
  // }
  placeOrder: (payload) => api.post(EP.ORDER.PLACE, payload),

  // ── Fetch the most recent active order ───────────────────────────────────
  getActiveOrder: () => api.get(EP.ORDER.ACTIVE),

  // ── Paginated order history ───────────────────────────────────────────────
  getOrderHistory: (page = 1, limit = 10) =>
    api.get(EP.ORDER.HISTORY, { params: { page, limit } }),

  // ── Single order by ID ────────────────────────────────────────────────────
  getOrderById: (orderId) => api.get(EP.ORDER.BY_ID(orderId)),

  // ── Customer cancel (only pending orders) ─────────────────────────────────
  cancelOrder: (orderId) => api.post(EP.ORDER.CANCEL(orderId)),
}

export default orderService