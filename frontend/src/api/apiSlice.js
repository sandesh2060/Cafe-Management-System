// frontend/src/api/apiSlice.js
//
// ─── NEW FILE (Week 2) ────────────────────────────────────────────────────────
// RTK Query base API — all endpoint files inject into this one createApi.
// Socket events call dispatch(api.util.invalidateTags([...])) to bust cache
// without any polling.
//
// Tag types mirror the plan doc:
//   Order · Menu · Session · Tenant · Delivery · Staff ·
//   Subscription · Notification · Loyalty · Inventory
// ─────────────────────────────────────────────────────────────────────────────

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const api = createApi({
  reducerPath: 'api',

  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    credentials: 'include',          // httpOnly cookie sent automatically
    prepareHeaders: (headers, { getState }) => {
      // Always inject ngrok header (dev tunnels)
      headers.set('ngrok-skip-browser-warning', 'true')

      // Inject table session headers so backend finds the shared order
      const session = getState().tableSession?.session
      if (session?.sessionId) headers.set('x-session-id', session.sessionId)
      if (session?.tableId)   headers.set('x-table-id',   session.tableId)

      return headers
    },
  }),

  // ── Tag types ─────────────────────────────────────────────────────────────
  // Add new tag types here as new endpoint files are created.
  tagTypes: [
    'Order',
    'Menu',
    'Session',
    'Tenant',
    'Delivery',
    'Staff',
    'Subscription',
    'Notification',
    'Loyalty',
    'Inventory',
  ],

  // Endpoint files inject their own endpoints via api.injectEndpoints()
  endpoints: () => ({}),
})

export default api