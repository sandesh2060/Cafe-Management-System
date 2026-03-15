// src/api/axios.js
//
// FIXES:
// • 401 interceptor no longer hard-redirects on every 401.
//   Auth-check endpoints (/auth/me, /auth/refresh) are excluded — a 401 there
//   means "not logged in", not "session expired mid-use". Hard redirect on those
//   was causing useActiveOrder and useRecommendations to redirect to /login
//   immediately on mount before the user had a chance to log in.
// • window.location.href replaced with a custom DOM event that App.jsx listens
//   to and handles via React Router navigate() — this preserves Redux state and
//   avoids a full page reload blowing away the store.
// • Only truly unexpected 401s (authenticated routes returning 401 mid-session)
//   trigger the logout event.

import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL:  API_URL,
  timeout:  15000,
  headers: {
    'Content-Type':               'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  withCredentials: false,
})

// ── Request: attach token ─────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('kc_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error),
)

// ── Endpoints that are ALLOWED to return 401 without triggering a logout ──────
// These are bootstrap/auth-check calls — a 401 here is expected (not logged in yet).
const AUTH_EXEMPT_PATHS = [
  '/auth/me',
  '/auth/refresh',
  '/auth/login',
  '/auth/register',
  '/auth/google',
  '/auth/guest',
]

const isAuthExempt = (url = '') =>
  AUTH_EXEMPT_PATHS.some((path) => url.includes(path))

// ── Response: handle errors ───────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status
    const url    = error.config?.url ?? ''

    if (status === 401 && !isAuthExempt(url)) {
      // Mid-session 401 on a protected route — token expired or revoked.
      // Clear storage and signal App.jsx to navigate to /login via React Router
      // (not window.location.href which blows away Redux state).
      localStorage.removeItem('kc_token')
      localStorage.removeItem('kc_user')
      window.dispatchEvent(new CustomEvent('auth:session-expired'))
    }

    return Promise.reject(error)
  },
)

export default api