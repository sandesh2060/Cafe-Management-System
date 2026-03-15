// src/store/slices/notificationSlice.js
//
// PRODUCTION FIXES:
//
// 1. AUTO-EXPIRY — order/waiter/payment notifications older than 24h are
//    filtered out on fetch and on every selector call. The bell never shows
//    "3 days ago" stale entries again.
//
// 2. NO TOAST POLLUTION — addNotification() only called from socket events
//    (notification:new in useNotifications). ToastRenderer no longer calls it.
//    Transient toasts (weather, idle, tip) never appear in the bell.
//
// 3. BELL-WORTHY TYPES — only these types write to the bell:
//    order, waiter, payment, loyalty, message, system
//    festival/birthday/weather/tip/idle are ephemeral toasts only.
//
// 4. SMART MERGE — fetchNotifications won't resurrect expired items.

import { createSlice, createSelector, createAsyncThunk } from '@reduxjs/toolkit'
import api from '@api/axios'

// ── Which types belong in the notification bell ───────────────────────────────
const BELL_TYPES = new Set(['order', 'waiter', 'payment', 'loyalty', 'message', 'system'])

// ── Max age for order-related notifications (24h) ─────────────────────────────
const ORDER_MAX_AGE_MS   = 24 * 60 * 60 * 1000  // 24 hours
const LOYALTY_MAX_AGE_MS = 7  * 24 * 60 * 60 * 1000  // 7 days

const maxAgeForType = (type) => {
  if (['order', 'waiter', 'payment'].includes(type)) return ORDER_MAX_AGE_MS
  if (type === 'loyalty') return LOYALTY_MAX_AGE_MS
  return Infinity  // system/message never auto-expire
}

const isExpired = (n) => {
  const ts  = n.createdAt ? new Date(n.createdAt).getTime() : 0
  const age = Date.now() - ts
  return age > maxAgeForType(n.type)
}

const normalize = (n) => ({
  id:        n._id ?? n.id,
  type:      n.type,
  title:     n.title,
  message:   n.message,
  data:      n.data ?? null,
  read:      n.read ?? false,
  createdAt: n.createdAt,
  important: n.important ?? false,
})

// ── Thunks ────────────────────────────────────────────────────────────────────
const EP = {
  NOTIFICATIONS: {
    BASE:     '/notifications',
    READ_ALL: '/notifications/read-all',
    READ_ONE: (id) => `/notifications/${id}/read`,
    CLEAR:    '/notifications',
  },
}

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(EP.NOTIFICATIONS.BASE)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch')
    }
  }
)

export const markAllReadRemote = createAsyncThunk(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      await api.patch(EP.NOTIFICATIONS.READ_ALL)
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed')
    }
  }
)

export const markOneReadRemote = createAsyncThunk(
  'notifications/markOneRead',
  async (id, { rejectWithValue }) => {
    try {
      await api.patch(EP.NOTIFICATIONS.READ_ONE(id))
      return id
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed')
    }
  }
)

export const clearAllRemote = createAsyncThunk(
  'notifications/clearAll',
  async (_, { rejectWithValue }) => {
    try {
      await api.delete(EP.NOTIFICATIONS.CLEAR)
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed')
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────
const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    items:   [],
    unread:  0,
    loading: false,
    error:   null,
  },
  reducers: {
    // Called ONLY from socket notification:new events — not from ToastRenderer
    addNotification: (state, { payload: n }) => {
      // Skip ephemeral-only types
      if (!BELL_TYPES.has(n.type ?? 'system')) return
      // Skip if already exists
      if (state.items.some(i => i.id === (n._id ?? n.id))) return
      // Skip if already expired
      if (isExpired(n)) return

      const item = normalize(n)
      state.items.unshift(item)
      if (!item.read) state.unread = Math.min(state.unread + 1, 99)

      // Trim to 50 items
      if (state.items.length > 50) state.items = state.items.slice(0, 50)
    },

    markAllRead: (state) => {
      state.items.forEach(n => (n.read = true))
      state.unread = 0
    },

    markRead: (state, { payload: id }) => {
      const item = state.items.find(n => n.id === id)
      if (item && !item.read) {
        item.read    = true
        state.unread = Math.max(0, state.unread - 1)
      }
    },

    deleteNotification: (state, { payload: id }) => {
      const idx = state.items.findIndex(n => n.id === id)
      if (idx !== -1) {
        const wasUnread = !state.items[idx].read
        state.items.splice(idx, 1)
        if (wasUnread) state.unread = Math.max(0, state.unread - 1)
      }
    },

    clearNotifications: (state) => {
      const important = state.items.filter(n => n.important)
      state.items  = important
      state.unread = important.filter(n => !n.read).length
    },

    // Purge expired items — call on app init or periodically
    purgeExpired: (state) => {
      const before = state.items.length
      state.items  = state.items.filter(n => !isExpired(n))
      const removed = before - state.items.length
      if (removed > 0) {
        state.unread = state.items.filter(n => !n.read).length
      }
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true
        state.error   = null
      })
      .addCase(fetchNotifications.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload ?? 'Unknown error'
      })
      .addCase(fetchNotifications.fulfilled, (state, { payload }) => {
        state.loading = false

        const raw    = payload?.data?.items ?? payload?.items ?? []
        const unread = payload?.data?.unread ?? payload?.unread ?? 0

        const fetched = raw
          .map(normalize)
          // Drop ephemeral types and expired items
          .filter(n => BELL_TYPES.has(n.type) && !isExpired(n))

        // Keep local important items not in backend response
        const existing    = state.items.filter(n => n.important)
        const fetchedIds  = new Set(fetched.map(n => n.id))
        const merged      = [
          ...fetched,
          ...existing.filter(n => !fetchedIds.has(n.id)),
        ]

        state.items  = merged
        // Recount unread from actual items in case backend count is stale
        state.unread = Math.min(
          merged.filter(n => !n.read).length,
          unread
        )
      })

      .addCase(markAllReadRemote.fulfilled, (state) => {
        state.items.forEach(n => (n.read = true))
        state.unread = 0
      })
      .addCase(markOneReadRemote.fulfilled, (state, { payload: id }) => {
        const item = state.items.find(n => n.id === id)
        if (item && !item.read) {
          item.read    = true
          state.unread = Math.max(0, state.unread - 1)
        }
      })
      .addCase(clearAllRemote.fulfilled, (state) => {
        const important = state.items.filter(n => n.important)
        state.items  = important
        state.unread = important.filter(n => !n.read).length
      })
  },
})

export const {
  addNotification,
  markAllRead,
  markRead,
  deleteNotification,
  clearNotifications,
  purgeExpired,
} = notificationSlice.actions

// ── Selectors ─────────────────────────────────────────────────────────────────
// selectNotifications filters expired items at read time — defensive layer
export const selectNotifications = createSelector(
  (s) => s.notifications.items,
  (items) => items.filter(n => !isExpired(n))
)

export const selectUnreadCount   = (s) => s.notifications.unread
export const selectNotifsLoading = (s) => s.notifications.loading

export default notificationSlice.reducer