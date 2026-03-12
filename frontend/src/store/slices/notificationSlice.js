// src/store/slices/notificationSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '@api/axios'
import { ENDPOINTS as EP } from '@api/endpoints'

// ── Async: fetch from backend on mount ───────────────────────────────────────
export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (_, { rejectWithValue }) => {
    try {
      return await api.get(EP.NOTIFICATIONS.LIST)
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Fetch failed')
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
const initialState = {
  items:   [],
  unread:  0,
  loading: false,
}

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // Called by useSocket when notification:new arrives via socket
    addNotification: (state, { payload }) => {
      // Prevent duplicates
      if (state.items.some((n) => n.id === payload.id)) return
      state.items.unshift({ ...payload, read: false })
      state.unread++
      if (state.items.length > 50) state.items.pop()
    },
    markAllRead: (state) => {
      state.items.forEach((n) => (n.read = true))
      state.unread = 0
    },
    markRead: (state, { payload: id }) => {
      const item = state.items.find((n) => n.id === id)
      if (item && !item.read) { item.read = true; state.unread-- }
    },
    clearNotifications: (state) => {
      state.items  = []
      state.unread = 0
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending,  (state) => { state.loading = true })
      .addCase(fetchNotifications.fulfilled, (state, { payload }) => {
        state.loading = false
        state.items   = (payload.items || []).map((n) => ({
          id:        n._id,
          type:      n.type,
          title:     n.title,
          message:   n.message,
          data:      n.data,
          read:      n.read,
          createdAt: n.createdAt,
        }))
        state.unread = payload.unread || 0
      })
      .addCase(fetchNotifications.rejected, (state) => { state.loading = false })

      .addCase(markAllReadRemote.fulfilled, (state) => {
        state.items.forEach((n) => (n.read = true))
        state.unread = 0
      })
      .addCase(markOneReadRemote.fulfilled, (state, { payload: id }) => {
        const item = state.items.find((n) => n.id === id)
        if (item && !item.read) { item.read = true; state.unread-- }
      })
      .addCase(clearAllRemote.fulfilled, (state) => {
        state.items  = []
        state.unread = 0
      })
  },
})

export const { addNotification, markAllRead, markRead, clearNotifications } =
  notificationSlice.actions

export const selectNotifications = (s) => s.notifications.items
export const selectUnreadCount   = (s) => s.notifications.unread
export const selectNotifsLoading = (s) => s.notifications.loading

export default notificationSlice.reducer