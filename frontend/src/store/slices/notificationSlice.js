// frontend/src/store/slices/notificationSlice.js
//
// FIXES:
// ✅ fetchNotifications handles both { items, unread } and { data: { items, unread } }
// ✅ unreadCount computed locally after filtering — never trusts server count
//    (server unread count includes 'message' type which we filter out)
// ✅ setNotifications filters messages AND recomputes unreadCount correctly
// ✅ All selectors unchanged

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api           from '@/api/axios'
import { ENDPOINTS } from '@/api/endpoints'

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(ENDPOINTS.NOTIFICATIONS.LIST, { params: { limit: 30 } })
      // axios interceptor returns response.data → res = { success, data: { items, unread } }
      // Handle both shapes safely
      const payload = res?.data ?? res ?? {}
      const items   = payload?.items ?? payload?.notifications ?? []
      const unread  = payload?.unread ?? payload?.unreadCount ?? null
      return { items, unread }
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

// ── helpers ───────────────────────────────────────────────────────────────────
const filterItems  = (items) => (items ?? []).filter(n => n.type !== 'message')
const countUnread  = (items) => items.filter(n => !n.read).length

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    items:       [],
    unreadCount: 0,
    loading:     false,
  },
  reducers: {
    setNotifications: (state, { payload }) => {
      const filtered    = filterItems(payload)
      state.items       = filtered
      // FIX: always compute unreadCount from filtered list — server count
      // includes 'message' type notifications which we discard
      state.unreadCount = countUnread(filtered)
      state.loading     = false
    },
    addNotification: (state, { payload }) => {
      if (payload.type === 'message') return
      const id     = payload._id ?? payload.id
      const exists = state.items.some(n => (n._id ?? n.id) === id)
      if (exists) return
      state.items.unshift(payload)
      if (!payload.read) state.unreadCount = Math.max(0, state.unreadCount + 1)
    },
    markRead: (state, { payload: id }) => {
      const item = state.items.find(n => (n._id ?? n.id) === id)
      if (item && !item.read) {
        item.read         = true
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    },
    markAllRead: (state) => {
      state.items.forEach(n => { n.read = true })
      state.unreadCount = 0
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
      state.unreadCount = Math.max(0, payload ?? 0)
    },
    setLoading: (state, { payload }) => {
      state.loading = payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending,   (state) => { state.loading = true })
      .addCase(fetchNotifications.fulfilled, (state, { payload }) => {
        const filtered    = filterItems(payload.items)
        state.items       = filtered
        // FIX: compute unread from filtered list, ignore server-side count
        // (server includes message notifications in unread count)
        state.unreadCount = countUnread(filtered)
        state.loading     = false
      })
      .addCase(fetchNotifications.rejected,  (state) => { state.loading = false })
      .addCase(markAllReadRemote.rejected,   (state) => { state.loading = false })
      .addCase(markOneReadRemote.rejected,   (state) => { state.loading = false })
      .addCase(clearAllRemote.rejected,      (state) => { state.loading = false })
  },
})

export const {
  setNotifications, addNotification,
  markRead, markAllRead, markAllReadLocal,
  clearNotifications, setUnreadCount, setLoading,
} = notificationSlice.actions

export const selectNotifications = (s) => s.notifications.items
export const selectUnreadCount   = (s) => s.notifications.unreadCount
export const selectNotifsLoading = (s) => s.notifications.loading

export default notificationSlice.reducer