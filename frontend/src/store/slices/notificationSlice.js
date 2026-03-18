// frontend/src/store/slices/notificationSlice.js
//
// Stores the notification list for the bell icon / NotificationsPage.
// This is separate from toastSlice — toasts are ephemeral UI,
// notifications are the persistent list (fetched from DB).
//
// Actions:
//   setNotifications([])      — initial load from DB
//   addNotification({})       — socket push (prepend)
//   markRead(id)              — mark single read locally
//   markAllReadLocal()        — mark all read locally
//   clearNotifications()      — clear all locally
//   setUnreadCount(n)         — set unread badge count

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api              from '@/api/axios'
import { ENDPOINTS }   from '@/api/endpoints'

// ── Async thunks (API calls) ──────────────────────────────────────────────────

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(ENDPOINTS.NOTIFICATIONS.LIST, { params: { limit: 30 } })
      return res?.data ?? res ?? { items: [], total: 0, unread: 0 }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Fetch failed')
    }
  }
)

export const markAllReadRemote = createAsyncThunk(
  'notifications/markAllReadRemote',
  async (_, { rejectWithValue }) => {
    try { await api.patch(ENDPOINTS.NOTIFICATIONS.READ_ALL) }
    catch (err) { return rejectWithValue(err.response?.data?.message ?? 'Failed') }
  }
)

export const markOneReadRemote = createAsyncThunk(
  'notifications/markOneReadRemote',
  async (id, { rejectWithValue }) => {
    try { await api.patch(ENDPOINTS.NOTIFICATIONS.READ_ONE(id)) }
    catch (err) { return rejectWithValue(err.response?.data?.message ?? 'Failed') }
  }
)

export const clearAllRemote = createAsyncThunk(
  'notifications/clearAllRemote',
  async (_, { rejectWithValue }) => {
    try { await api.delete(ENDPOINTS.NOTIFICATIONS.CLEAR) }
    catch (err) { return rejectWithValue(err.response?.data?.message ?? 'Failed') }
  }
)

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    items:       [],
    unreadCount: 0,
    loading:     false,
  },
  reducers: {
    setNotifications: (state, { payload }) => {
      state.items   = payload ?? []
      state.unreadCount = (payload ?? []).filter(n => !n.read).length
      state.loading = false
    },
    addNotification: (state, { payload }) => {
      // Dedup by id
      const exists = state.items.some(n => n._id === payload._id || n.id === payload.id)
      if (exists) return
      state.items.unshift(payload)
      if (!payload.read) state.unreadCount = Math.max(0, state.unreadCount + 1)
    },
    markRead: (state, { payload: id }) => {
      const item = state.items.find(n => (n._id ?? n.id) === id)
      if (item && !item.read) {
        item.read       = true
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    },
    markAllReadLocal: (state) => {
      state.items.forEach(n => { n.read = true })
      state.unreadCount = 0
    },
    clearNotifications: (state) => {
      state.items       = []
      state.unreadCount = 0
    },
    setUnreadCount: (state, { payload }) => {
      state.unreadCount = payload ?? 0
    },
    setLoading: (state, { payload }) => {
      state.loading = payload
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchNotifications
      .addCase(fetchNotifications.pending,   (state) => { state.loading = true })
      .addCase(fetchNotifications.fulfilled, (state, { payload }) => {
        state.items       = payload?.items ?? []
        state.unreadCount = payload?.unread ?? state.items.filter(n => !n.read).length
        state.loading     = false
      })
      .addCase(fetchNotifications.rejected,  (state) => { state.loading = false })
      // remote write thunks — optimistic updates already applied locally, just clear loading
      .addCase(markAllReadRemote.rejected,   (state) => { state.loading = false })
      .addCase(markOneReadRemote.rejected,   (state) => { state.loading = false })
      .addCase(clearAllRemote.rejected,      (state) => { state.loading = false })
  },
})

export const {
  setNotifications,
  addNotification,
  markRead,
  markAllReadLocal,
  clearNotifications,
  setUnreadCount,
  setLoading,
} = notificationSlice.actions

// Selectors
export const selectNotifications  = (s) => s.notifications.items
export const selectUnreadCount    = (s) => s.notifications.unreadCount
export const selectNotifsLoading  = (s) => s.notifications.loading  // used by NotificationBell

// markAllRead is the local action — NotificationBell dispatches both this + markAllReadRemote
export const { markAllRead } = notificationSlice.actions

export default notificationSlice.reducer