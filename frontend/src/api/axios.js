// frontend/src/api/axios.js
//
// ─── CHANGES ──────────────────────────────────────────────────────────────────
// 1. Request interceptor ADDED — attaches x-session-id and x-table-id headers
//    on every request so the backend getActiveOrder can find the shared table
//    order (Kiran sees Sandesh's order, same table session).
//
//    Headers sent:
//      x-session-id  → tableSession.session.sessionId  (primary lookup key)
//      x-table-id    → tableSession.session.tableId    (fallback lookup key)
//
//    Both are read from Redux store at request time — always fresh, no stale
//    closure over an old value.
//
// 2. withCredentials: true preserved — cookies still attached automatically.
//
// 3. 401 interceptor unchanged — same AUTH_EXEMPT_PATHS logic.
//
// 4. Circular import note: importing `store` here is safe because axios.js
//    is never imported by store/index.js — the dependency is one-way.
//
// ★ OWNER FIX: Added /owner/login and /owner/me to AUTH_EXEMPT_PATHS.
//   Without this, any 401 from these endpoints (e.g. bootstrap probing
//   /owner/me when no owner is logged in) fired auth:session-expired →
//   clearAuth() + navigate('/venue'), killing the login flow entirely.
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios'
import store  from '@store/index'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL:  API_URL,
  timeout:  15000,
  headers: {
    'Content-Type':               'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  withCredentials: true,
})

// ── Request interceptor ───────────────────────────────────────────────────────
// Attaches table session headers so backend can find the shared order.
// Reads from Redux at call time — no stale values.
api.interceptors.request.use((config) => {
  const state   = store.getState()
  const session = state.tableSession?.session

  if (session?.sessionId) {
    config.headers['x-session-id'] = session.sessionId
  }
  if (session?.tableId) {
    config.headers['x-table-id'] = session.tableId
  }

  return config
})

// ── Endpoints allowed to return 401 without triggering a logout ───────────────
// Rule: any endpoint that is either:
//   (a) called during bootstrap probing (may legitimately 401), or
//   (b) the login endpoint itself
// must be listed here — otherwise a 401 fires auth:session-expired globally.
const AUTH_EXEMPT_PATHS = [
  // Customer / staff
  '/auth/me',
  '/auth/refresh',
  '/auth/login',
  '/auth/register',
  '/auth/google',
  '/auth/guest',
  // ★ Owner — bootstrap probes /owner/me (401 when not logged in = normal)
  '/owner/me',
  '/owner/login',
  '/owner/register',
  // Superadmin
  '/superadmin/login',
  '/superadmin/me',
]

const isAuthExempt = (url = '') =>
  AUTH_EXEMPT_PATHS.some((path) => url.includes(path))

// ── Response interceptor ──────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status
    const url    = error.config?.url ?? ''

    if (status === 401 && !isAuthExempt(url)) {
      window.dispatchEvent(new CustomEvent('auth:session-expired'))
    }

    return Promise.reject(error)
  },
)

export default api