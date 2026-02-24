// src/store/slices/notificationSlice.js
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  items:   [],      // [{ id, type, title, message, createdAt, read }]
  unread:  0,
}

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, { payload }) => {
      state.items.unshift({ ...payload, read: false })
      state.unread++
      // Keep max 50 notifications
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
})

export const { addNotification, markAllRead, markRead, clearNotifications } = notificationSlice.actions

export const selectNotifications = (s) => s.notifications.items
export const selectUnreadCount   = (s) => s.notifications.unread

export default notificationSlice.reducer