// src/store/slices/toastSlice.js
//
// Dedicated slice for transient toast notifications.
// Separate from notificationSlice (which is persisted to backend).
// Toasts are ephemeral — they live only in-session, auto-expire,
// and are never synced to the server.
//
// PRIORITY LEVELS (lower number = higher priority):
//   1 critical  → order ready, waiter coming
//   2 high      → order confirmed, order status change
//   3 medium    → weather, festival, birthday, loyalty
//   4 low       → idle nudge, tip nudge, system
//
// USAGE:
//   dispatch(showToast({ type, title, message, priority?, actions?, duration?, meta? }))
//   dispatch(dismissToast(id))

import { createSlice } from '@reduxjs/toolkit'

const MAX_TOASTS      = 8      // queue cap — excess dropped
const DEFAULT_DURATION = 5500  // ms

const genId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`

// ── Priority map — used both here and in useNotifications ─────────────────────
export const PRIORITY = {
  critical: 1,  // order ready, waiter coming
  high:     2,  // order confirmed/preparing, order status
  medium:   3,  // weather, festival, birthday, loyalty milestone
  low:      4,  // idle nudge, tip nudge, welcome, system
}

// Derive default priority from toast type
const defaultPriority = (type) => {
  switch (type) {
    case 'order':
    case 'kitchen':   return PRIORITY.high
    case 'payment':   return PRIORITY.critical
    case 'waiter':    return PRIORITY.critical
    case 'loyalty':
    case 'festival':
    case 'birthday':
    case 'weather':   return PRIORITY.medium
    case 'tip':
    case 'idle':
    case 'system':
    default:          return PRIORITY.low
  }
}

const toastSlice = createSlice({
  name: 'toast',
  initialState: {
    toasts: [],
  },
  reducers: {
    showToast: (state, { payload }) => {
      const id  = payload.id ?? genId()
      const now = Date.now()

      // Dedup: same type+message within last 8s → skip
      const isDup = state.toasts.some(
        (t) =>
          t.type    === payload.type    &&
          t.message === payload.message &&
          now - t.createdAt < 8000
      )
      if (isDup) return

      const priority = payload.priority ?? defaultPriority(payload.type ?? 'system')

      const toast = {
        id,
        type:      payload.type      ?? 'system',
        title:     payload.title     ?? null,
        message:   payload.message   ?? '',
        actions:   payload.actions   ?? null,
        duration:  payload.duration  ?? DEFAULT_DURATION,
        meta:      payload.meta      ?? null,
        navigate:  payload.navigate  ?? null,
        soundKey:  payload.soundKey  ?? null,
        imageUrl:  payload.imageUrl  ?? payload.meta?.imageUrl ?? null,
        color:     payload.color     ?? null,
        vibrate:   payload.vibrate   ?? null,
        priority,
        createdAt: now,
      }

      state.toasts.unshift(toast)

      // Sort by priority (ascending = highest first), then by createdAt
      state.toasts.sort((a, b) =>
        a.priority !== b.priority
          ? a.priority - b.priority
          : b.createdAt - a.createdAt
      )

      // Trim to max — lowest-priority tail gets dropped
      if (state.toasts.length > MAX_TOASTS) {
        state.toasts = state.toasts.slice(0, MAX_TOASTS)
      }
    },

    dismissToast: (state, { payload: id }) => {
      state.toasts = state.toasts.filter((t) => t.id !== id)
    },

    clearAllToasts: (state) => {
      state.toasts = []
    },
  },
})

export const { showToast, dismissToast, clearAllToasts } = toastSlice.actions

// Selects toasts already sorted by priority (slice maintains sort order)
export const selectToasts = (s) => s.toast.toasts

export default toastSlice.reducer