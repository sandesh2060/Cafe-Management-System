// src/store/slices/uiSlice.js
//
// Centralised UI preference store for user-facing display toggles.
// Extend this slice for any future UI preferences.
//
// Current prefs:
//   skyAnimationsEnabled  — controls WelcomeCard SkyCanvas (default: OFF)
//
// Persistence:
//   localStorage for survival across page reloads.
//   Resets to defaults on logout (via extraReducers).
//
// Usage:
//   import { useUIPrefs } from '@shared/hooks/useUIPrefs'
//   const { skyAnimationsEnabled, toggleSkyAnimations } = useUIPrefs()

import { createSlice } from '@reduxjs/toolkit'

// ── Persistence ───────────────────────────────────────────────────────────────
const STORAGE_KEY = 'kc_ui_prefs'

const DEFAULTS = {
  skyAnimationsEnabled: false,   // OFF by default — user must opt in
}

function loadPersistedPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

function persistPrefs(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      skyAnimationsEnabled: state.skyAnimationsEnabled,
    }))
  } catch {}
}

// ── Slice ─────────────────────────────────────────────────────────────────────
const uiSlice = createSlice({
  name: 'ui',
  initialState: loadPersistedPrefs(),
  reducers: {
    toggleSkyAnimations(state) {
      state.skyAnimationsEnabled = !state.skyAnimationsEnabled
      persistPrefs(state)
    },
    setSkyAnimations(state, action) {
      state.skyAnimationsEnabled = Boolean(action.payload)
      persistPrefs(state)
    },
    resetUIPrefs(state) {
      Object.assign(state, DEFAULTS)
      persistPrefs(state)
    },
  },
  extraReducers: (builder) => {
    // Reset on logout — matches any action whose type contains 'logout'
    builder.addMatcher(
      (action) => /logout/i.test(action.type),
      (state) => {
        Object.assign(state, DEFAULTS)
        persistPrefs(state)
      }
    )
  },
})

export const { toggleSkyAnimations, setSkyAnimations, resetUIPrefs } = uiSlice.actions

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectSkyAnimationsEnabled = (state) => state.ui.skyAnimationsEnabled

export default uiSlice.reducer