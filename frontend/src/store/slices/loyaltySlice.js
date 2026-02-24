// src/store/slices/loyaltySlice.js
import { createSlice } from '@reduxjs/toolkit'

const TIER_CONFIG = {
  bronze: { min: 0,    max: 499,  discount: 5,  label: 'Bronze' },
  silver: { min: 500,  max: 999,  discount: 10, label: 'Silver' },
  gold:   { min: 1000, max: Infinity, discount: 15, label: 'Gold' },
}

const initialState = {
  points:        0,
  tier:          'none',       // none | bronze | silver | gold
  discountPct:   0,
  pointsToNext:  0,
  history:       [],
  loading:       false,
}

const loyaltySlice = createSlice({
  name: 'loyalty',
  initialState,
  reducers: {
    setLoyalty: (state, { payload }) => {
      state.points       = payload.points
      state.tier         = payload.tier
      state.discountPct  = TIER_CONFIG[payload.tier]?.discount || 0
      const config       = TIER_CONFIG[payload.tier]
      state.pointsToNext = config ? config.max - payload.points : 0
    },
    addPoints: (state, { payload: pts }) => {
      state.points += pts
      // Recalculate tier
      const newTier = Object.entries(TIER_CONFIG).find(
        ([, cfg]) => state.points >= cfg.min && state.points <= cfg.max
      )
      if (newTier) {
        state.tier        = newTier[0]
        state.discountPct = newTier[1].discount
        state.pointsToNext = newTier[1].max - state.points
      }
    },
    clearLoyalty: (state) => { Object.assign(state, initialState) },
  },
})

export const { setLoyalty, addPoints, clearLoyalty } = loyaltySlice.actions

export const selectLoyalty     = (s) => s.loyalty
export const selectTier        = (s) => s.loyalty.tier
export const selectPoints      = (s) => s.loyalty.points
export const selectDiscountPct = (s) => s.loyalty.discountPct

export default loyaltySlice.reducer