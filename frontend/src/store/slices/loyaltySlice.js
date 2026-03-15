// src/store/slices/loyaltySlice.js
//
// FIXES:
//   • setLoyalty uses ?? guards so partial payloads don't wipe existing fields
//   • addPoints pointsToNext clamped to 0 for gold tier (was Infinity)
//   • addPoints fallback sets tier:'none' when points match no tier band
//   • Infinity stored in Redux state prevented — gold tier pointsToNext = 0

import { createSlice } from '@reduxjs/toolkit'

export const TIER_CONFIG = {
  bronze: { min: 0,    max: 499,      discount: 5,  label: 'Bronze' },
  silver: { min: 500,  max: 999,      discount: 10, label: 'Silver' },
  gold:   { min: 1000, max: Infinity, discount: 15, label: 'Gold'   },
}

// FIX: compute pointsToNext safely — gold tier has no "next", so return 0
const safePointsToNext = (config, points) => {
  if (!config || config.max === Infinity) return 0
  return Math.max(0, config.max - points)
}

const initialState = {
  points:       0,
  tier:         'none',   // none | bronze | silver | gold
  discountPct:  0,
  pointsToNext: 0,
  history:      [],
  loading:      false,
}

const loyaltySlice = createSlice({
  name: 'loyalty',
  initialState,
  reducers: {

    // FIX: ?? guards — partial payloads don't wipe fields that aren't in the payload
    setLoyalty: (state, { payload }) => {
      const points        = payload.points      ?? state.points
      const tier          = payload.tier        ?? deriveTier(points)
      const config        = TIER_CONFIG[tier]
      state.points        = points
      state.tier          = tier
      state.discountPct   = payload.discountPct ?? config?.discount ?? 0
      state.pointsToNext  = safePointsToNext(config, points)
      // Preserve history if not provided
      if (payload.history !== undefined) state.history = payload.history
    },

    // FIX: pointsToNext clamped; tier:'none' fallback when no band matches
    addPoints: (state, { payload: pts }) => {
      state.points += pts
      const tier   = deriveTier(state.points)
      const config = TIER_CONFIG[tier]
      state.tier         = tier
      state.discountPct  = config?.discount     ?? 0
      state.pointsToNext = safePointsToNext(config, state.points)
    },

    clearLoyalty: (state) => { Object.assign(state, initialState) },
  },
})

export const { setLoyalty, addPoints, clearLoyalty } = loyaltySlice.actions

// selectLoyalty returns s.loyalty directly (the slice state object).
// Pages accessing loyalty.tier / loyalty.points work correctly.
// The guard pattern `loyaltyRaw?.loyalty ?? loyaltyRaw` in fixed pages is
// harmless defensive code — selectLoyalty never nests under a .loyalty key.
export const selectLoyalty     = (s) => s.loyalty
export const selectTier        = (s) => s.loyalty.tier
export const selectPoints      = (s) => s.loyalty.points
export const selectDiscountPct = (s) => s.loyalty.discountPct
export const selectPointsToNext = (s) => s.loyalty.pointsToNext

export default loyaltySlice.reducer