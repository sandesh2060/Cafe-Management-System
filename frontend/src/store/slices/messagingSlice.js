// src/store/slices/messagingSlice.js
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  threads:    {},        // { [threadId]: { messages: [], unread: 0, participant } }
  totalUnread: 0,
  activeThread: null,
  isOpen:      false,
}

const messagingSlice = createSlice({
  name: 'messaging',
  initialState,
  reducers: {
    receiveMessage: (state, { payload: msg }) => {
      const tid = msg.threadId || `${msg.fromUserId}_${msg.toUserId}`
      if (!state.threads[tid]) {
        state.threads[tid] = { messages: [], unread: 0, participant: msg.fromUserId }
      }
      state.threads[tid].messages.push(msg)
      if (state.activeThread !== tid) {
        state.threads[tid].unread++
        state.totalUnread++
      }
    },
    markThreadRead: (state, { payload: threadId }) => {
      const thread = state.threads[threadId]
      if (thread) {
        state.totalUnread = Math.max(0, state.totalUnread - thread.unread)
        thread.unread = 0
      }
    },
    setActiveThread: (state, { payload }) => {
      state.activeThread = payload
      state.isOpen = !!payload
    },
    closeChat: (state) => {
      state.isOpen       = false
      state.activeThread = null
    },
    prependHistory: (state, { payload: { threadId, messages } }) => {
      if (!state.threads[threadId]) {
        state.threads[threadId] = { messages: [], unread: 0, participant: null }
      }
      state.threads[threadId].messages = [...messages, ...state.threads[threadId].messages]
    },
  },
})

export const { receiveMessage, markThreadRead, setActiveThread, closeChat, prependHistory } = messagingSlice.actions

export const selectThreads     = (s) => s.messaging.threads
export const selectTotalUnread = (s) => s.messaging.totalUnread
export const selectActiveThread = (s) => s.messaging.activeThread
export const selectChatOpen    = (s) => s.messaging.isOpen

export default messagingSlice.reducer