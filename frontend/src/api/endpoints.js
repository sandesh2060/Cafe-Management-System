// frontend/src/api/endpoints.js
//
// ─── VENUE ENTRY FLOW CHANGES ─────────────────────────────────────────────────
// 1. ADDED: CAFE section — geofence check, search, nearby, code, slug,
//    favorites, recent, toggle favorite
// 2. ALL other endpoints UNCHANGED
// ─────────────────────────────────────────────────────────────────────────────

export const ENDPOINTS = {
  AUTH: {
    GUEST_LOGIN:      '/auth/guest',
    LOGOUT:           '/auth/logout',
    REFRESH:          '/auth/refresh',
    ME:               '/auth/me',
    UPDATE_PROFILE:   '/auth/me',
    CHECK_USERNAME:   '/auth/check-username',
    REGISTER:         '/auth/register',
    LOGIN:            '/auth/login',
    STAFF_LOGIN:      '/auth/staff-login',
    FORGOT_PASSCODE:  '/auth/forgot-passcode',
    VERIFY_OTP:       '/auth/verify-otp',
    ADD_EMAIL:        '/auth/me/email',
    CHANGE_PASSCODE:  '/auth/me/passcode',
    REFERRAL:         '/auth/referral',
  },

  TABLE: {
    SESSION_CREATE:  '/table-session/create',
    SESSION_ACTIVE:  '/table-session/active',
    SESSION_CLOSE:   '/table-session/close',
    DETECT_GPS:      '/table-session/detect/gps',
    DETECT_QR:       '/table-session/detect/qr',
    HEARTBEAT:       '/table-session/heartbeat',
    GEOFENCE_EXIT:   '/table-session/geofence-exit',
    LIST:            '/tables',
    CREATE:          '/tables',
    UPDATE:          (id) => `/tables/${id}`,
  },

  // ★ NEW — Cafe discovery / venue entry flow
  CAFE: {
    GEOFENCE_CHECK:  '/cafes/geofence-check',
    SEARCH:          '/cafes/search',
    NEARBY:          '/cafes/nearby',
    CODE:            (code) => `/cafes/code/${code}`,
    SLUG:            (slug) => `/cafes/slug/${slug}`,
    FAVORITES:       '/cafes/favorites',
    RECENT:          '/cafes/recent',
    FAVORITE:        (cafeId) => `/cafes/${cafeId}/favorite`,
  },

  MENU: {
    LIST:            '/menu',
    BY_CAFE:         (cafeId) => `/menu/${cafeId}`,
    ITEM:            (id) => `/menu/item/${id}`,
    CREATE:          '/menu/item',
    UPDATE:          (id) => `/menu/item/${id}`,
  },

  ORDER: {
    PLACE:           '/orders',
    ACTIVE:          '/orders/active',
    HISTORY:         '/orders/history',
    BY_ID:           (id) => `/orders/${id}`,
    CANCEL:          (id) => `/orders/${id}/cancel`,
    STATUS:          (id) => `/orders/${id}/status`,
    KDS:             '/orders/kds',
    WAITER_QUEUE:    '/orders/waiter',
  },

  REVIEW: {
    LIST:    (menuItemId) => `/reviews/${menuItemId}`,
    MY:      (menuItemId) => `/reviews/${menuItemId}/my`,
    SUMMARY: (menuItemId) => `/reviews/${menuItemId}/summary`,
    CREATE:  (menuItemId) => `/reviews/${menuItemId}`,
    UPDATE:  (reviewId)   => `/reviews/review/${reviewId}`,
    DELETE:  (reviewId)   => `/reviews/review/${reviewId}`,
    LIKE:    (reviewId)   => `/reviews/review/${reviewId}/like`,
  },

  WAITER_CALL: {
    CREATE:      '/waiter-call',
    LIST:        '/waiter-call',
    ACKNOWLEDGE: (id) => `/waiter-call/${id}/acknowledge`,
    ON_THE_WAY:  (id) => `/waiter-call/${id}/on-the-way`,
    DONE:        (id) => `/waiter-call/${id}/done`,
    HISTORY:     '/waiter-call/history',
  },

  RECOMMENDATIONS: {
    PERSONAL: '/recommendations/personal',
    GUEST:    '/recommendations/guest',
  },

  WEATHER: {
    CURRENT: '/weather/current',
  },

  LOYALTY: {
    MY_LOYALTY:    '/loyalty/me',
    ME:            '/loyalty/me',
    HISTORY:       '/loyalty/history',
    CONFIG:        '/loyalty/config',
    UPDATE_CONFIG: '/loyalty/config',
  },

  MESSAGING: {
    THREADS:      '/messages/threads',
    HISTORY:      (threadId) => `/messages/${threadId}`,
    SEND:         '/messages/send',
    READ:         (threadId) => `/messages/${threadId}/read`,
    UNREAD_COUNT: '/messages/unread-count',
  },

  BILLING: {
    PENDING:      '/billing/pending',
    CONFIRM:      (orderId) => `/billing/${orderId}/confirm`,
    SPLIT:        '/billing/split',
    TRANSACTIONS: '/billing/transactions',
  },

  INVENTORY: {
    LIST:         '/inventory',
    UPDATE:       (id) => `/inventory/${id}`,
    ALERT_CONFIG: '/inventory/alert-config',
  },

  REPORTS: {
    SALES:   '/reports/sales',
    DAILY:   '/reports/daily',
    STAFF:   '/reports/staff',
    LOYALTY: '/reports/loyalty',
  },

  ADMIN: {
    CAFES:         '/admin/cafes',
    CAFE:          (id) => `/admin/cafes/${id}`,
    SUBSCRIPTIONS: '/admin/subscriptions',
    USAGE:         '/admin/usage',
  },

  STAFF: {
    LIST:           '/staff',
    CREATE:         '/staff',
    UPDATE:         (id) => `/staff/${id}`,
    DELETE:         (id) => `/staff/${id}`,
    RESET_PASSWORD: (id) => `/staff/${id}/reset-password`,
  },

  NOTIFICATIONS: {
    LIST:     '/notifications',
    READ_ALL: '/notifications/read-all',
    READ_ONE: (id) => `/notifications/${id}/read`,
    CLEAR:    '/notifications',
  },

  SOCIAL: {
    CUSTOMERS:      '/social/customers',
    FOLLOW_PENDING: '/social/follow/pending',
    FOLLOW:         (id)    => `/social/follow/${id}`,
    FOLLOW_ACCEPT:  (id)    => `/social/follow/${id}/accept`,
    FOLLOW_DECLINE: (id)    => `/social/follow/${id}/decline`,
    UNFOLLOW:       (id)    => `/social/follow/${id}`,
    BLOCK:          (id)    => `/social/block/${id}`,
    UNBLOCK:        (id)    => `/social/block/${id}`,
    CHAT_LIST:      '/social/chat',
    CHAT_THREAD:    (id)    => `/social/chat/${id}`,
    CHAT_SEND:      (id)    => `/social/chat/${id}`,
    REACT:          (msgId) => `/social/chat/${msgId}/react`,
  },

  OWNER: {
    REGISTER:      '/owner/register',
    LOGIN:         '/owner/login',
    LOGOUT:        '/owner/logout',
    ME:            '/owner/me',
    CAFES:         '/owner/cafes',
    CAFE:          (id) => `/owner/cafes/${id}`,
    CAFE_CREATE:   '/owner/cafes',
    CAFE_UPDATE:   (id) => `/owner/cafes/${id}`,
    STAFF:         (cafeId) => `/owner/cafes/${cafeId}/staff`,
    STAFF_CREATE:  (cafeId) => `/owner/cafes/${cafeId}/staff`,
    SUBSCRIPTION:  '/owner/subscription',
    PLANS:         '/owner/plans',
    BILLING:       '/owner/billing',
  },

  SUPERADMIN: {
    LOGIN:          '/superadmin/login',
    LOGOUT:         '/superadmin/logout',
    CONFIG:         '/superadmin/config',
    TOGGLE_OTP:     '/superadmin/config/otp',
    TRIAL_DAYS:     '/superadmin/config/trial-days',
    OWNERS:         '/superadmin/owners',
    OWNER_ACTIVE:   (id) => `/superadmin/owners/${id}/active`,
    CACHE_FLUSH:    '/superadmin/cache/flush',
    // ★ NEW — analytics
    DASHBOARD:      '/superadmin/dashboard',
    TENANTS:        '/superadmin/tenants',
    TENANT_DETAIL:  (cafeId) => `/superadmin/tenants/${cafeId}`,
    TENANT_PLAN:    (cafeId) => `/superadmin/tenants/${cafeId}/plan`,
    REVENUE:        '/superadmin/revenue',
    PLANS:          '/superadmin/plans',
    PLAN_UPDATE:    (planId) => `/superadmin/plans/${planId}`,
  },

  ESEWA: {
    INITIATE:  '/esewa/initiate',
    VERIFY:    '/esewa/verify',
    SUCCESS:   '/esewa/success',
    FAILURE:   '/esewa/failure',
  },
}