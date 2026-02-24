// src/api/endpoints.js

export const ENDPOINTS = {
  // Auth
  AUTH: {
    GOOGLE_LOGIN:   '/auth/google',
    GUEST_LOGIN:    '/auth/guest',
    LOGOUT:         '/auth/logout',
    REFRESH:        '/auth/refresh',
    ME:             '/auth/me',
  },

  // Table Session
  TABLE: {
    SESSION_CREATE:  '/table-session/create',
    SESSION_ACTIVE:  '/table-session/active',
    SESSION_CLOSE:   '/table-session/close',
    DETECT_GPS:      '/table-session/detect/gps',
    DETECT_QR:       '/table-session/detect/qr',
    HEARTBEAT:       '/table-session/heartbeat',
    LIST:            '/tables',
    CREATE:          '/tables',
    UPDATE:          (id) => `/tables/${id}`,
  },

  // Menu
  MENU: {
    LIST:            '/menu',
    BY_CAFE:         (cafeId) => `/menu/${cafeId}`,
    ITEM:            (id) => `/menu/item/${id}`,
    CREATE:          '/menu/item',
    UPDATE:          (id) => `/menu/item/${id}`,
  },

  // Orders
  ORDER: {
    PLACE:           '/orders',
    ACTIVE:          '/orders/active',
    HISTORY:         '/orders/history',
    BY_ID:           (id) => `/orders/${id}`,
    CANCEL:          (id) => `/orders/${id}/cancel`,
    STATUS:          (id) => `/orders/${id}/status`,
    KDS:             '/orders/kds',         // Kitchen Display
    WAITER_QUEUE:    '/orders/waiter',      // Waiter's orders
  },

  // Call Waiter
  WAITER_CALL: {
    CREATE:          '/waiter-call',
    LIST:            '/waiter-call',
    ACKNOWLEDGE:     (id) => `/waiter-call/${id}/acknowledge`,
    ON_THE_WAY:      (id) => `/waiter-call/${id}/on-the-way`,
    DONE:            (id) => `/waiter-call/${id}/done`,
    HISTORY:         '/waiter-call/history',
  },

  // Recommendations
  RECOMMENDATIONS: {
    PERSONAL:        '/recommendations/personal',
    GUEST:           '/recommendations/guest',
  },

  // Weather
  WEATHER: {
    CURRENT:         '/weather/current',
  },

  // Loyalty
  LOYALTY: {
    MY_LOYALTY:      '/loyalty/me',
    HISTORY:         '/loyalty/history',
    CONFIG:          '/loyalty/config',
    UPDATE_CONFIG:   '/loyalty/config',
  },

  // Messaging
  MESSAGING: {
    THREADS:         '/messages/threads',
    HISTORY:         (threadId) => `/messages/${threadId}`,
    SEND:            '/messages/send',
    READ:            (threadId) => `/messages/${threadId}/read`,
    UNREAD_COUNT:    '/messages/unread-count',
  },

  // Billing
  BILLING: {
    PENDING:         '/billing/pending',
    CONFIRM:         (orderId) => `/billing/${orderId}/confirm`,
    SPLIT:           '/billing/split',
    TRANSACTIONS:    '/billing/transactions',
  },

  // Inventory
  INVENTORY: {
    LIST:            '/inventory',
    UPDATE:          (id) => `/inventory/${id}`,
    ALERT_CONFIG:    '/inventory/alert-config',
  },

  // Reports
  REPORTS: {
    SALES:           '/reports/sales',
    DAILY:           '/reports/daily',
    STAFF:           '/reports/staff',
    LOYALTY:         '/reports/loyalty',
  },

  // Admin
  ADMIN: {
    CAFES:           '/admin/cafes',
    CAFE:            (id) => `/admin/cafes/${id}`,
    SUBSCRIPTIONS:   '/admin/subscriptions',
    USAGE:           '/admin/usage',
  },

  // Staff
  STAFF: {
    LIST:            '/staff',
    CREATE:          '/staff',
    UPDATE:          (id) => `/staff/${id}`,
    DELETE:          (id) => `/staff/${id}`,
    RESET_PASSWORD:  (id) => `/staff/${id}/reset-password`,
  },
}