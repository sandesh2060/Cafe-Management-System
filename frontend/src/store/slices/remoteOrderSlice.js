// frontend/src/store/slices/remoteOrderSlice.js
//
// ─── NEW FILE ─────────────────────────────────────────────────────────────────
// Manages remote order preferences: delivery vs pickup + address.
// Read by CartDrawer, CartPage, and placeOrder thunk to enrich the payload.
// ─────────────────────────────────────────────────────────────────────────────

import { createSlice } from '@reduxjs/toolkit'

const STORAGE_KEY = 'kc_remote_order'

const load = () => {
  try {
    const r = localStorage.getItem(STORAGE_KEY)
    return r ? JSON.parse(r) : null
  } catch { return null }
}

const saved = load()

const initialState = {
  // 'delivery' | 'pickup'
  orderType: saved?.orderType ?? 'pickup',
  address: {
    line1:    saved?.address?.line1    ?? '',
    city:     saved?.address?.city     ?? '',
    landmark: saved?.address?.landmark ?? '',
    lat:      saved?.address?.lat      ?? null,
    lng:      saved?.address?.lng      ?? null,
  },
  // UI state
  addressSheetOpen: false,
  confirmed: false,  // true once user taps "Confirm" on address sheet
}

const persist = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      orderType: state.orderType,
      address:   state.address,
    }))
  } catch { /* ignore */ }
}

const remoteOrderSlice = createSlice({
  name: 'remoteOrder',
  initialState,
  reducers: {
    setOrderType: (state, { payload }) => {
      state.orderType = payload  // 'delivery' | 'pickup'
      persist(state)
    },
    setAddress: (state, { payload }) => {
      state.address   = { ...state.address, ...payload }
      state.confirmed = false
      persist(state)
    },
    confirmAddress: (state) => {
      state.confirmed          = true
      state.addressSheetOpen   = false
      persist(state)
    },
    openAddressSheet:  (state) => { state.addressSheetOpen = true },
    closeAddressSheet: (state) => { state.addressSheetOpen = false },
    clearRemoteOrder:  (state) => {
      state.orderType        = 'pickup'
      state.address          = { line1: '', city: '', landmark: '', lat: null, lng: null }
      state.addressSheetOpen = false
      state.confirmed        = false
      localStorage.removeItem(STORAGE_KEY)
    },
  },
})

export const {
  setOrderType, setAddress, confirmAddress,
  openAddressSheet, closeAddressSheet, clearRemoteOrder,
} = remoteOrderSlice.actions

export const selectOrderType         = (s) => s.remoteOrder.orderType
export const selectDeliveryAddress   = (s) => s.remoteOrder.address
export const selectAddressSheetOpen  = (s) => s.remoteOrder.addressSheetOpen
export const selectAddressConfirmed  = (s) => s.remoteOrder.confirmed
export const selectHasAddress        = (s) => !!s.remoteOrder.address?.line1?.trim()

export default remoteOrderSlice.reducer