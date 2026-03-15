// src/store/slices/cartSlice.js
//
// FIXES:
//   • selectTableId and selectSessionId REMOVED — always import these from
//     tableSessionSlice. Keeping them here caused silent null returns whenever
//     setTableInfo wasn't dispatched, and created confusing dual-source-of-truth.
//   • setTableInfo and setSessionInfo REMOVED for the same reason — cart should
//     never own session state. tableSessionSlice is authoritative.
//   • updateQuantity payload shape confirmed as { menuItemId, portionId?, quantity }
//     useCart.js was previously "fixed" to dispatch { id, quantity } — that was
//     WRONG. useCart.js must be reverted to dispatch { menuItemId, portionId, quantity }.
//   • removeItem legacy string path documented clearly — only object shape
//     { menuItemId, portionId? } should be used going forward.
//   • buildKey exported so useCart.js and CartPage.jsx can compute the composite
//     key consistently without duplicating logic.

import { createSlice } from '@reduxjs/toolkit'

// ── Cart item shape ────────────────────────────────────────────────────────────
// {
//   menuItemId:     string           ← MongoDB _id
//   name:           string
//   price:          number           ← actual price paid (portion price if applicable)
//   quantity:       number
//   emoji:          string
//   category:       string
//   portionId:      string | null    ← 'half' | 'full' | null
//   portionLabel:   string | null    ← 'Half Plate' | 'Full Plate' | null
//   customizations: object | null    ← customization selections from ItemDetailPage
// }
//
// KEY RULE: Two cart items are considered "the same" only when BOTH menuItemId
// AND portionId match. This lets a user have "Momo (Half)" and "Momo (Full)"
// as separate line items.

export const buildKey = (menuItemId, portionId) =>
  portionId ? `${menuItemId}::${portionId}` : menuItemId

const initialState = {
  items:       [],
  loyaltyTier: 'none',
  discountPct: 0,
  // NOTE: tableId and sessionId are NOT stored here.
  // Always read from tableSessionSlice (selectTableId, selectSessionId).
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {

    // ── addItem ────────────────────────────────────────────────────────────────
    // payload: { menuItemId, name, price, quantity?, emoji, category,
    //            portionId?, portionLabel?, customizations? }
    addItem: (state, { payload }) => {
      const key      = buildKey(payload.menuItemId, payload.portionId ?? null)
      const existing = state.items.find(
        i => buildKey(i.menuItemId, i.portionId) === key
      )
      if (existing) {
        existing.quantity += payload.quantity ?? 1
      } else {
        state.items.push({
          menuItemId:     payload.menuItemId,
          name:           payload.name,
          price:          payload.price,
          quantity:       payload.quantity     ?? 1,
          emoji:          payload.emoji        ?? '🍽️',
          category:       payload.category     ?? null,
          portionId:      payload.portionId    ?? null,
          portionLabel:   payload.portionLabel ?? null,
          customizations: payload.customizations ?? null,  // forwarded from ItemDetailPage
        })
      }
    },

    // ── removeItem ─────────────────────────────────────────────────────────────
    // Preferred shape: { menuItemId, portionId? }
    // Legacy shape:    string menuItemId (treated as portionId: null)
    // NOTE: do not pass composite key strings like "abc::half" as a plain string —
    // the legacy path will treat it as a menuItemId, not as a composite key.
    removeItem: (state, { payload }) => {
      const { menuItemId, portionId } =
        typeof payload === 'string'
          ? { menuItemId: payload, portionId: null }
          : payload
      const key = buildKey(menuItemId, portionId ?? null)
      state.items = state.items.filter(
        i => buildKey(i.menuItemId, i.portionId) !== key
      )
    },

    // ── updateQuantity ─────────────────────────────────────────────────────────
    // payload: { menuItemId, portionId?, quantity }
    // IMPORTANT: useCart.js must dispatch exactly this shape.
    // A previous session incorrectly changed useCart.js to dispatch { id, quantity }
    // — that broke quantity updates silently. useCart.js has been corrected.
    updateQuantity: (state, { payload }) => {
      const { menuItemId, portionId, quantity } = payload
      const key  = buildKey(menuItemId, portionId ?? null)
      const item = state.items.find(
        i => buildKey(i.menuItemId, i.portionId) === key
      )
      if (!item) return
      if (quantity <= 0) {
        state.items = state.items.filter(
          i => buildKey(i.menuItemId, i.portionId) !== key
        )
      } else {
        item.quantity = quantity
      }
    },

    clearCart: (state) => { state.items = [] },

    setLoyaltyInfo: (state, { payload: { tier, discountPct } }) => {
      state.loyaltyTier = tier
      state.discountPct = discountPct
    },
  },
})

export const {
  addItem, removeItem, updateQuantity,
  clearCart, setLoyaltyInfo,
} = cartSlice.actions

// ── Selectors ──────────────────────────────────────────────────────────────────

export const selectCartItems    = (s) => s.cart.items
export const selectCartCount    = (s) => s.cart.items.reduce((acc, i) => acc + i.quantity, 0)
export const selectCartSubtotal = (s) =>
  s.cart.items.reduce((acc, i) => acc + i.price * i.quantity, 0)

export const selectCartDiscount = (s) => {
  const sub = s.cart.items.reduce((acc, i) => acc + i.price * i.quantity, 0)
  return Math.round(sub * (s.cart.discountPct / 100))
}

export const selectCartTotal = (s) => {
  const sub = s.cart.items.reduce((acc, i) => acc + i.price * i.quantity, 0)
  return Math.round(sub * (1 - s.cart.discountPct / 100))
}

// REMOVED: selectTableId — import from tableSessionSlice
// REMOVED: selectSessionId — import from tableSessionSlice

// Total qty of a specific menu item across ALL portions — for card badge
export const selectItemTotalQty = (menuItemId) => (s) =>
  s.cart.items
    .filter(i => i.menuItemId === menuItemId)
    .reduce((acc, i) => acc + i.quantity, 0)

// Qty of a specific item + portion combo
export const selectPortionQty = (menuItemId, portionId) => (s) => {
  const key = buildKey(menuItemId, portionId ?? null)
  return s.cart.items.find(
    i => buildKey(i.menuItemId, i.portionId) === key
  )?.quantity ?? 0
}

export default cartSlice.reducer