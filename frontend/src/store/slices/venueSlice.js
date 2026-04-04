// frontend/src/store/slices/venueSlice.js
//
// ─── NEW FILE ─────────────────────────────────────────────────────────────────
// Stores the currently selected venue context.
// Replaces hardcoded BRAND.cafeId — now dynamic per session.
// Set by VenueEntryPage, read by LoginPage, all API calls, and menu pages.
//
// mode: 'dine-in' = customer is at the venue (table detection ran)
//       'remote'  = customer is ordering from outside (delivery/pickup)
//       null      = venue not yet selected
//
// Persisted to localStorage so refresh doesn't lose venue context.
// Cleared on explicit venue change or logout.
// ─────────────────────────────────────────────────────────────────────────────

import { createSlice } from '@reduxjs/toolkit'

const STORAGE_KEY = 'kc_venue'

// ── Rehydrate from localStorage ───────────────────────────────────────────────
const loadPersistedVenue = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Validate shape
    if (parsed?.cafeId && parsed?.slug) return parsed
    return null
  } catch {
    return null
  }
}

const persisted = loadPersistedVenue()

const initialState = {
  cafeId:   persisted?.cafeId   ?? null,
  slug:     persisted?.slug     ?? null,
  name:     persisted?.name     ?? null,
  logo:     persisted?.logo     ?? null,
  address:  persisted?.address  ?? null,
  theme:    persisted?.theme    ?? null,
  features: persisted?.features ?? null,
  // 'dine-in' | 'remote' | null
  mode:     persisted?.mode     ?? null,
  // Distance from user to venue (set during geofence check)
  distanceMeters: persisted?.distanceMeters ?? null,
}

const venueSlice = createSlice({
  name: 'venue',
  initialState,
  reducers: {
    setVenue: (state, { payload }) => {
      state.cafeId         = payload.cafeId   ?? payload._id ?? null
      state.slug           = payload.slug     ?? null
      state.name           = payload.name     ?? null
      state.logo           = payload.logo     ?? null
      state.address        = payload.address  ?? null
      state.theme          = payload.theme    ?? null
      state.features       = payload.features ?? null
      state.mode           = payload.mode     ?? null
      state.distanceMeters = payload.distanceMeters ?? null

      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          cafeId:   state.cafeId,
          slug:     state.slug,
          name:     state.name,
          logo:     state.logo,
          address:  state.address,
          theme:    state.theme,
          features: state.features,
          mode:     state.mode,
          distanceMeters: state.distanceMeters,
        }))
      } catch { /* ignore */ }
    },

    setVenueMode: (state, { payload }) => {
      state.mode = payload // 'dine-in' | 'remote'
      // Update localStorage
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const data = JSON.parse(raw)
          data.mode = payload
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        }
      } catch { /* ignore */ }
    },

    clearVenue: (state) => {
      state.cafeId         = null
      state.slug           = null
      state.name           = null
      state.logo           = null
      state.address        = null
      state.theme          = null
      state.features       = null
      state.mode           = null
      state.distanceMeters = null
      localStorage.removeItem(STORAGE_KEY)
    },
  },
})

export const { setVenue, setVenueMode, clearVenue } = venueSlice.actions

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectVenue        = (s) => s.venue
export const selectVenueCafeId  = (s) => s.venue.cafeId
export const selectVenueSlug    = (s) => s.venue.slug
export const selectVenueName    = (s) => s.venue.name
export const selectVenueMode    = (s) => s.venue.mode
export const selectIsAtVenue    = (s) => s.venue.mode === 'dine-in'
export const selectIsRemote     = (s) => s.venue.mode === 'remote'
export const selectHasVenue     = (s) => !!s.venue.cafeId

export default venueSlice.reducer