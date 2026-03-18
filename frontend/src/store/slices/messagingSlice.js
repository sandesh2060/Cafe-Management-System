// src/store/slices/messagingSlice.js
//
// FIXES:
// ✅ receiveMessage: threadId now uses sorted join (matches backend/service)
//    was using unsorted `${from}_${to}` which never matched sorted threadId
// ✅ Added message:sent handler action (setMessageSent) for optimistic echo
// ✅ markThreadRead now correctly decrements totalUnread
// ✅ Added setReadReceipt action for real-time checkmark updates
// ✅ selectTotalUnread selector exported correctly

import { createSlice } from '@reduxjs/toolkit'

// Matches backend buildThreadId
const buildThreadId = (a, b) => [a, b].sort().join('_')

const initialState = {
  threads:     {},     // { [threadId]: { messages: [], unread: 0, participantId } }
  totalUnread: 0,
  activeThread: null,
  isOpen:      false,
}

const messagingSlice = createSlice({
  name: 'messaging',
  initialState,
  reducers: {
    // Called from useSocket when 'message:received' fires
    receiveMessage: (state, { payload: msg }) => {
      // ✅ FIX: use sorted threadId — was `${from}_${to}` which never matched
      const tid = msg.threadId
        ?? buildThreadId(
             msg.fromUserId?.toString() ?? '',
             msg.toUserId?.toString()   ?? ''
           )
      if (!tid) return

      if (!state.threads[tid]) {
        state.threads[tid] = { messages: [], unread: 0, participantId: msg.fromUserId }
      }

      // Dedup — don't add if already present (e.g. optimistic + echo)
      const exists = state.threads[tid].messages.some(
        m => m._id && m._id === msg._id
      )
      if (!exists) {
        state.threads[tid].messages.push(msg)
      }

      if (state.activeThread !== tid) {
        state.threads[tid].unread++
        state.totalUnread = Math.max(0, state.totalUnread + 1)
      }
    },

    // Called from useSocket when 'message:sent' fires (echo to sender's other devices)
    messageSent: (state, { payload: msg }) => {
      const tid = msg.threadId
        ?? buildThreadId(
             msg.fromUserId?.toString() ?? '',
             msg.toUserId?.toString()   ?? ''
           )
      if (!tid) return
      if (!state.threads[tid]) {
        state.threads[tid] = { messages: [], unread: 0, participantId: msg.toUserId }
      }
      const exists = state.threads[tid].messages.some(m => m._id === msg._id)
      if (!exists) {
        state.threads[tid].messages.push(msg)
      }
    },

    // Called when 'message:read-receipt' fires — update checkmarks
    setReadReceipt: (state, { payload: { threadId, readAt } }) => {
      const thread = state.threads[threadId]
      if (!thread) return
      thread.messages.forEach(m => {
        if (!m.readAt) m.readAt = readAt
      })
    },

    markThreadRead: (state, { payload: threadId }) => {
      const thread = state.threads[threadId]
      if (thread && thread.unread > 0) {
        state.totalUnread = Math.max(0, state.totalUnread - thread.unread)
        thread.unread     = 0
      }
    },

    setActiveThread: (state, { payload }) => {
      state.activeThread = payload
      state.isOpen       = !!payload
    },

    closeChat: (state) => {
      state.isOpen       = false
      state.activeThread = null
    },

    prependHistory: (state, { payload: { threadId, messages } }) => {
      if (!state.threads[threadId]) {
        state.threads[threadId] = { messages: [], unread: 0, participantId: null }
      }
      // Dedup before prepend
      const existingIds = new Set(state.threads[threadId].messages.map(m => m._id))
      const newMsgs     = messages.filter(m => !existingIds.has(m._id))
      state.threads[threadId].messages = [...newMsgs, ...state.threads[threadId].messages]
    },
  },
})

export const {
  receiveMessage,
  messageSent,
  setReadReceipt,
  markThreadRead,
  setActiveThread,
  closeChat,
  prependHistory,
} = messagingSlice.actions

export const selectThreads      = (s) => s.messaging.threads
export const selectTotalUnread  = (s) => s.messaging.totalUnread
export const selectActiveThread = (s) => s.messaging.activeThread
export const selectChatOpen     = (s) => s.messaging.isOpen
// Alias — some components import this name
export const selectUnreadMessages = (s) => s.messaging.totalUnread

export default messagingSlice.reducer