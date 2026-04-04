// src/store/slices/toastSlice.js
//
// EXTENDED:
// - Per-type durations (order=8s, loyalty=6s, festival=10s, system=4s, critical=never)
// - Smart dedup: same type+message within 10s → skip
// - Priority queue (1=critical, 2=high, 3=medium, 4=low)
// - Critical types: waiter, payment — duration=0 means never auto-dismiss
// - New types: profile_nudge, badge, achievement, referral, quiz, reorder, idle, cart, session_expiry

import { createSlice } from '@reduxjs/toolkit'

const MAX_QUEUE = 12

// ── Priority levels ───────────────────────────────────────────────────────────
export const PRIORITY = {
  critical: 1,  // waiter arrived, payment due, order ready — NEVER auto-dismiss
  high:     2,  // order status, badge earned
  medium:   3,  // loyalty, festival, birthday, weather
  low:      4,  // idle nudge, quiz, profile, contextual
}

// ── Per-type config ───────────────────────────────────────────────────────────
// duration: 0 = never auto-dismiss (critical), else ms
export const TYPE_CONFIG = {
  // Order
  order:          { priority: PRIORITY.high,     duration: 8000,  sound: 'orderPlaced',    dedup: 6000  },
  kitchen:        { priority: PRIORITY.high,     duration: 8000,  sound: 'orderPlaced',    dedup: 6000  },

  // Critical — never auto-dismiss
  payment:        { priority: PRIORITY.critical, duration: 0,     sound: 'notification',   dedup: 10000 },
  waiter:         { priority: PRIORITY.critical, duration: 0,     sound: 'orderReady',     dedup: 5000  },
  order_ready:    { priority: PRIORITY.critical, duration: 0,     sound: 'orderReady',     dedup: 5000  },

  // Loyalty
  loyalty:        { priority: PRIORITY.medium,   duration: 6000,  sound: 'pointsEarned',   dedup: 8000  },
  badge:          { priority: PRIORITY.high,     duration: 8000,  sound: 'tierUpgraded',   dedup: 30000 },
  achievement:    { priority: PRIORITY.high,     duration: 8000,  sound: 'tierUpgraded',   dedup: 30000 },
  tier_upgrade:   { priority: PRIORITY.high,     duration: 9000,  sound: 'tierUpgraded',   dedup: 60000 },
  points_milestone:{ priority: PRIORITY.medium,  duration: 7000,  sound: 'pointsEarned',   dedup: 30000 },
  referral:       { priority: PRIORITY.medium,   duration: 7000,  sound: 'pointsEarned',   dedup: 60000 },

  // Festival / calendar
  festival:       { priority: PRIORITY.medium,   duration: 10000, sound: 'notification',   dedup: 3600000 }, // 1hr dedup
  birthday:       { priority: PRIORITY.medium,   duration: 10000, sound: 'tierUpgraded',   dedup: 86400000 }, // 24hr
  international:  { priority: PRIORITY.low,      duration: 8000,  sound: null,             dedup: 3600000 },

  // Smart contextual
  weather:        { priority: PRIORITY.low,      duration: 5000,  sound: null,             dedup: 1800000 }, // 30min
  reorder:        { priority: PRIORITY.low,      duration: 6000,  sound: null,             dedup: 3600000 },
  idle:           { priority: PRIORITY.low,      duration: 5000,  sound: null,             dedup: 300000  }, // 5min
  cart_abandon:   { priority: PRIORITY.medium,   duration: 7000,  sound: null,             dedup: 180000  }, // 3min
  session_expiry: { priority: PRIORITY.critical, duration: 0,     sound: 'notification',   dedup: 300000  },
  streak:         { priority: PRIORITY.medium,   duration: 7000,  sound: 'pointsEarned',   dedup: 3600000 },

  // Profile
  profile_nudge:  { priority: PRIORITY.low,      duration: 8000,  sound: null,             dedup: 86400000 }, // once/day

  // Engagement
  quiz:           { priority: PRIORITY.low,      duration: 0,     sound: null,             dedup: 86400000 }, // interactive, no autodismiss
  mystery_item:   { priority: PRIORITY.low,      duration: 6000,  sound: null,             dedup: 3600000 },
  cross_sell:     { priority: PRIORITY.low,      duration: 5000,  sound: null,             dedup: 600000  },
  news:           { priority: PRIORITY.low,      duration: 7000,  sound: null,             dedup: 3600000 },
  shoutout:       { priority: PRIORITY.medium,   duration: 8000,  sound: 'notification',   dedup: 300000  },

  // Generic
  suggest:        { priority: PRIORITY.low,      duration: 5000,  sound: null,             dedup: 600000  },
  welcome:        { priority: PRIORITY.medium,   duration: 7000,  sound: 'notification',   dedup: 86400000 },
  message:        { priority: PRIORITY.high,     duration: 6000,  sound: 'notification',   dedup: 3000    },
  system:         { priority: PRIORITY.low,      duration: 4000,  sound: null,             dedup: 5000    },
}

const getTypeCfg = (type) => TYPE_CONFIG[type] ?? TYPE_CONFIG.system

const genId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`

const toastSlice = createSlice({
  name: 'toast',
  initialState: { toasts: [] },
  reducers: {
    showToast: (state, { payload }) => {
      const typeCfg  = getTypeCfg(payload.type ?? 'system')
      const now      = Date.now()
      const dedupMs  = payload.dedupMs ?? typeCfg.dedup ?? 8000

      // Smart dedup: same type+message recently → skip
      const isDup = state.toasts.some(t =>
        t.type === (payload.type ?? 'system') &&
        t.message === (payload.message ?? '') &&
        now - t.createdAt < dedupMs
      )
      if (isDup) return

      const priority = payload.priority ?? typeCfg.priority
      // duration: payload overrides type default; 0 = never auto-dismiss
      const duration = payload.duration !== undefined
        ? payload.duration
        : typeCfg.duration

      const toast = {
        id:        payload.id ?? genId(),
        type:      payload.type      ?? 'system',
        title:     payload.title     ?? null,
        message:   payload.message   ?? '',
        actions:   payload.actions   ?? null,
        duration,
        meta:      payload.meta      ?? null,
        navigate:  payload.navigate  ?? null,
        soundKey:  payload.soundKey  ?? typeCfg.sound ?? null,
        imageUrl:  payload.imageUrl  ?? payload.meta?.imageUrl ?? null,
        color:     payload.color     ?? null,
        vibrate:   payload.vibrate   ?? null,
        emoji:     payload.emoji     ?? null,
        priority,
        createdAt: now,
        // For profile nudge sheet
        profileField: payload.profileField ?? null,
        quizData:     payload.quizData     ?? null,
      }

      state.toasts.unshift(toast)

      // Sort: priority asc, then createdAt desc (newest first within same priority)
      state.toasts.sort((a, b) =>
        a.priority !== b.priority
          ? a.priority - b.priority
          : b.createdAt - a.createdAt
      )

      // Trim queue
      if (state.toasts.length > MAX_QUEUE) {
        state.toasts = state.toasts.slice(0, MAX_QUEUE)
      }
    },

    dismissToast: (state, { payload: id }) => {
      state.toasts = state.toasts.filter(t => t.id !== id)
    },

    clearAllToasts: (state) => {
      state.toasts = []
    },
  },
})

export const { showToast, dismissToast, clearAllToasts } = toastSlice.actions
export const selectToasts = (s) => s.toast.toasts
export default toastSlice.reducer