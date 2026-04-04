// frontend/src/store/slices/socialChatSlice.js
//
// PATCH: Bug 1 fix — fetchRecentChats.fulfilled
// ✅ s.recentChats = payload?.data?.chats ?? payload?.data ?? []
//    axios interceptor unwraps response.data, so payload = { success, data: { chats: [] } }
//    payload?.data was { chats: [] } (object) → .map crashed
//    Now reads payload?.data?.chats first, falls back through all shapes.
//
// No other changes.

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit'
import api from '@api/axios'

export const fetchRecentChats = createAsyncThunk('socialChat/fetchRecent',
  async (_, { rejectWithValue }) => {
    try { return await api.get('/social/chat') }
    catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed') }
  }
)

export const fetchThread = createAsyncThunk('socialChat/fetchThread',
  async (userId, { rejectWithValue }) => {
    try { return await api.get(`/social/chat/${userId}`) }
    catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed') }
  }
)

export const sendSocialMessage = createAsyncThunk('socialChat/send',
  async ({ userId, content, type, replyToId, replyTo, orderData, imageUrl, audioUrl }, { rejectWithValue }) => {
    try { return await api.post(`/social/chat/${userId}`, { content, type, replyToId, replyTo, orderData, imageUrl, audioUrl }) }
    catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed') }
  }
)

export const reactToMessage = createAsyncThunk('socialChat/react',
  async ({ messageId, emoji }, { rejectWithValue }) => {
    try { return await api.post(`/social/chat/${messageId}/react`, { emoji }) }
    catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed') }
  }
)

export const deleteMessage = createAsyncThunk('socialChat/deleteMessage',
  async (messageId, { rejectWithValue }) => {
    try { return await api.delete(`/social/chat/message/${messageId}`) }
    catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed') }
  }
)

export const deleteChat = createAsyncThunk('socialChat/deleteChat',
  async (threadId, { rejectWithValue }) => {
    try { return await api.delete(`/social/chat/thread/${threadId}`) }
    catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed') }
  }
)

const socialChatSlice = createSlice({
  name: 'socialChat',
  initialState: {
    recentChats:    [],
    threads:        {},
    activeThreadId: null,
    loading:        false,
    sendingMsg:     false,
    error:          null,
    typingUsers:    {},
  },
  reducers: {
    receiveMessage: (state, { payload: msg }) => {
      const tid = msg.threadId
      if (!state.threads[tid]) state.threads[tid] = []
      state.threads[tid].push(msg)
      if (state.threads[tid].length > 3) {
        state.threads[tid] = state.threads[tid].slice(-3)
      }
      const isActive = state.activeThreadId === tid
      const idx      = state.recentChats.findIndex(c => c.threadId === tid)
      if (idx > -1) {
        state.recentChats[idx].lastMessage = { content: msg.content, fromMe: false, createdAt: msg.createdAt, readAt: null }
        if (!isActive) state.recentChats[idx].unreadCount += 1
        const [chat] = state.recentChats.splice(idx, 1)
        state.recentChats.unshift(chat)
      } else {
        state.recentChats.unshift({
          threadId:    tid,
          otherUser:   msg.fromUser ?? { _id: msg.fromUserId },
          lastMessage: { content: msg.content, fromMe: false, createdAt: msg.createdAt, readAt: null },
          unreadCount: isActive ? 0 : 1,
        })
      }
    },

    markThreadSeen: (state, { payload: { threadId, seenAt } }) => {
      if (state.threads[threadId]) {
        for (const m of state.threads[threadId]) {
          if (!m.readAt) m.readAt = seenAt
        }
      }
      const chat = state.recentChats.find(c => c.threadId === threadId)
      if (chat) {
        if (chat.lastMessage) chat.lastMessage.readAt = seenAt
        chat.unreadCount = 0
      }
    },

    vanishMessages: (state, { payload: { threadId, messageIds } }) => {
      if (!state.threads[threadId]) return
      const idSet = new Set(messageIds.map(id => id.toString()))
      state.threads[threadId] = state.threads[threadId].filter(
        m => !idSet.has(m._id?.toString())
      )
      const chat = state.recentChats.find(c => c.threadId === threadId)
      if (chat && !state.threads[threadId].length) {
        chat.lastMessage = null
        chat.unreadCount = 0
      }
    },

    updateReaction: (state, { payload: { messageId, threadId, userId, emoji } }) => {
      if (!state.threads[threadId]) return
      const msg = state.threads[threadId].find(m => m._id === messageId)
      if (!msg) return
      if (!msg.reactions) msg.reactions = []
      const idx = msg.reactions.findIndex(r => r.userId === userId)
      if (!emoji) {
        if (idx > -1) msg.reactions.splice(idx, 1)
      } else {
        if (idx > -1) msg.reactions[idx].emoji = emoji
        else msg.reactions.push({ userId, emoji })
      }
    },

    setTyping: (state, { payload: { userId, isTyping } }) => {
      state.typingUsers[userId] = isTyping
    },

    setActiveThread: (state, { payload: threadId }) => {
      state.activeThreadId = threadId
      const chat = state.recentChats.find(c => c.threadId === threadId)
      if (chat) chat.unreadCount = 0
    },

    clearActiveThread: (state) => { state.activeThreadId = null },

    messageDeleted: (state, { payload: { messageId, threadId } }) => {
      if (state.threads[threadId]) {
        state.threads[threadId] = state.threads[threadId].filter(
          m => m._id?.toString() !== messageId.toString()
        )
      }
      const chat = state.recentChats.find(c => c.threadId === threadId)
      if (chat && !state.threads[threadId]?.length) {
        chat.lastMessage = null
      }
    },

    chatDeleted: (state, { payload: { threadId } }) => {
      if (state.threads[threadId]) state.threads[threadId] = []
      state.recentChats = state.recentChats.filter(c => c.threadId !== threadId)
    },

    optimisticSend: (state, { payload: { threadId, content, myId, type, replyTo, itemData, imageUrl, audioUrl } }) => {
      if (!state.threads[threadId]) state.threads[threadId] = []
      const tempMsg = {
        _id:         `temp_${Date.now()}`,
        _optimistic: true,
        threadId,
        fromUserId:  myId,
        toUserId:    null,
        content,
        type:        type ?? 'text',
        replyTo,
        itemData:    itemData ?? null,
        imageUrl:    imageUrl ?? null,
        audioUrl:    audioUrl ?? null,
        reactions:   [],
        readAt:      null,
        createdAt:   new Date().toISOString(),
      }
      state.threads[threadId].push(tempMsg)
      if (state.threads[threadId].length > 4) {
        state.threads[threadId] = state.threads[threadId].slice(-4)
      }
      const idx = state.recentChats.findIndex(c => c.threadId === threadId)
      const entry = { threadId, lastMessage: { content, fromMe: true, createdAt: tempMsg.createdAt, readAt: null }, unreadCount: 0 }
      if (idx > -1) {
        Object.assign(state.recentChats[idx], entry)
        const [c] = state.recentChats.splice(idx, 1)
        state.recentChats.unshift(c)
      }
    },
  },

  extraReducers: (b) => {
    b
      // ── BUG 1 FIX ────────────────────────────────────────────────────────
      // axios interceptor unwraps response.data, so:
      //   payload = { success: true, data: { chats: [...] } }
      // payload?.data = { chats: [...] }  ← object, NOT array → .map crashes
      // payload?.data?.chats = [...]      ← correct
      // Fallback chain handles all response shapes defensively.
      .addCase(fetchRecentChats.fulfilled, (s, { payload }) => {
        s.recentChats = payload?.data?.chats   // { data: { chats: [] } }
                     ?? payload?.data          // flat array fallback
                     ?? payload?.chats         // { chats: [] } fallback
                     ?? []
        // Guard: ensure it's always an array
        if (!Array.isArray(s.recentChats)) s.recentChats = []
      })
      .addCase(fetchThread.pending,   (s) => { s.loading = true; s.error = null })
      .addCase(fetchThread.rejected,  (s, { payload }) => { s.loading = false; s.error = payload })
      .addCase(fetchThread.fulfilled, (s, { payload }) => {
        s.loading = false
        const { threadId, messages } = payload?.data ?? {}
        if (threadId) s.threads[threadId] = messages ?? []
      })
      .addCase(sendSocialMessage.pending,   (s) => { s.sendingMsg = false })
      .addCase(sendSocialMessage.rejected,  (s, { meta }) => {
        s.sendingMsg = false
        const { content } = meta.arg
        for (const tid of Object.keys(s.threads)) {
          s.threads[tid] = s.threads[tid].filter(
            m => !(m._optimistic && m.content === content)
          )
        }
      })
      .addCase(sendSocialMessage.fulfilled, (s, { payload, meta }) => {
        s.sendingMsg = false
        const msg = payload?.data?.message ?? payload?.data ?? payload
        if (!msg?.threadId) return
        const tid = msg.threadId
        if (!s.threads[tid]) s.threads[tid] = []
        const optIdx = s.threads[tid].findIndex(m => m._optimistic && m.content === meta.arg.content)
        if (optIdx > -1) {
          s.threads[tid][optIdx] = msg
        } else {
          s.threads[tid].push(msg)
        }
        if (s.threads[tid].length > 3) s.threads[tid] = s.threads[tid].slice(-3)
        const idx   = s.recentChats.findIndex(c => c.threadId === tid)
        const entry = { threadId: tid, lastMessage: { content: msg.content, fromMe: true, createdAt: msg.createdAt, readAt: null }, unreadCount: 0 }
        if (idx > -1) {
          Object.assign(s.recentChats[idx], entry)
          const [c] = s.recentChats.splice(idx, 1)
          s.recentChats.unshift(c)
        }
      })
  },
})

export const {
  receiveMessage, markThreadSeen, vanishMessages, optimisticSend,
  updateReaction, setTyping, setActiveThread, clearActiveThread,
  messageDeleted, chatDeleted,
} = socialChatSlice.actions

export const selectRecentChats = s => s.socialChat.recentChats
export const selectChatLoading = s => s.socialChat.loading
export const selectSendingMsg  = s => s.socialChat.sendingMsg
export const selectTypingUsers = s => s.socialChat.typingUsers
export const selectTotalUnread = s => s.socialChat.recentChats.reduce((a, c) => a + (c.unreadCount || 0), 0)

const EMPTY_ARRAY = []
export const selectThread = (threadId) =>
  createSelector(
    s => s.socialChat.threads,
    (threads) => threads[threadId] ?? EMPTY_ARRAY
  )

export default socialChatSlice.reducer