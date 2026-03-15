// frontend/src/shared/utils/orderNavigate.js
//
// Single source of truth for order page routing.
// Import everywhere you need to navigate to an order.
//
// ROUTING RULES:
//   pending / preparing / on_the_way  →  /order/status   (live tracker)
//   delivered / paid / cancelled      →  /order/history  (past orders)
//   null / undefined                  →  /order/history  (safe fallback)

const ACTIVE_STATUSES = ['pending', 'preparing', 'on_the_way']

/**
 * Returns the correct route string based on order status.
 */
export const getOrderRoute = (status) => {
  if (!status) return '/order/history'
  return ACTIVE_STATUSES.includes(status) ? '/order/status' : '/order/history'
}

/**
 * Navigate to the correct order page.
 * @param {Function} navigate  - react-router navigate()
 * @param {Object|null} order  - full order object (reads order.status)
 * @param {string|null} status - alternative: pass status string directly
 */
export const orderNavigate = (navigate, order = null, status = null) => {
  const s = order?.status ?? status ?? null
  navigate(getOrderRoute(s))
}