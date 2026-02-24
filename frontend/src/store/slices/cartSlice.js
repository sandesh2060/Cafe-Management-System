// src/store/slices/cartSlice.js
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  items:         [],    // [{ menuItemId, name, price, quantity, emoji, category }]
  tableId:       null,
  sessionId:     null,
  loyaltyTier:   'none',   // none | bronze | silver | gold
  discountPct:   0,
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, { payload }) => {
      const existing = state.items.find((i) => i.menuItemId === payload.menuItemId)
      if (existing) {
        existing.quantity += payload.quantity || 1
      } else {
        state.items.push({ ...payload, quantity: payload.quantity || 1 })
      }
    },
    removeItem: (state, { payload: menuItemId }) => {
      state.items = state.items.filter((i) => i.menuItemId !== menuItemId)
    },
    updateQuantity: (state, { payload: { menuItemId, quantity } }) => {
      const item = state.items.find((i) => i.menuItemId === menuItemId)
      if (item) {
        if (quantity <= 0) state.items = state.items.filter((i) => i.menuItemId !== menuItemId)
        else item.quantity = quantity
      }
    },
    clearCart: (state) => {
      state.items = []
    },
    setTableInfo: (state, { payload: { tableId, sessionId } }) => {
      state.tableId   = tableId
      state.sessionId = sessionId
    },
    setLoyaltyInfo: (state, { payload: { tier, discountPct } }) => {
      state.loyaltyTier  = tier
      state.discountPct  = discountPct
    },
  },
})

export const { addItem, removeItem, updateQuantity, clearCart, setTableInfo, setLoyaltyInfo } = cartSlice.actions

// Selectors
export const selectCartItems   = (s) => s.cart.items
export const selectCartCount   = (s) => s.cart.items.reduce((acc, i) => acc + i.quantity, 0)
export const selectCartSubtotal = (s) => s.cart.items.reduce((acc, i) => acc + i.price * i.quantity, 0)
export const selectCartDiscount = (s) => {
  const sub = s.cart.items.reduce((acc, i) => acc + i.price * i.quantity, 0)
  return Math.round(sub * (s.cart.discountPct / 100))
}
export const selectCartTotal   = (s) => {
  const sub = s.cart.items.reduce((acc, i) => acc + i.price * i.quantity, 0)
  return Math.round(sub * (1 - s.cart.discountPct / 100))
}
export const selectTableId     = (s) => s.cart.tableId
export const selectSessionId   = (s) => s.cart.sessionId

export default cartSlice.reducer