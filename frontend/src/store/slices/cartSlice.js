// src/store/slices/cartSlice.js
import { createSlice } from '@reduxjs/toolkit'

// ── Cart item shape ───────────────────────────────────────────────────────────
// {
//   menuItemId:   string           ← MongoDB _id
//   name:         string
//   price:        number           ← actual price paid (portion price if applicable)
//   quantity:     number
//   emoji:        string
//   category:     string
//   portionId:    string | null    ← 'half' | 'full' | null
//   portionLabel: string | null    ← 'Half Plate' | 'Full Plate' | null
// }
//
// KEY RULE: Two cart items are considered "the same" only when BOTH menuItemId
// AND portionId match. This lets a user have "Momo (Half)" and "Momo (Full)"
// as separate line items.

const buildKey = (menuItemId, portionId) =>
  portionId ? `${menuItemId}::${portionId}` : menuItemId

const initialState = {
  items:       [],
  tableId:     null,
  sessionId:   null,
  loyaltyTier: 'none',
  discountPct: 0,
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {

    // ── addItem ───────────────────────────────────────────────────────────────
    // payload: { menuItemId, name, price, quantity?, emoji, category,
    //            portionId?, portionLabel? }
    addItem: (state, { payload }) => {
      const key      = buildKey(payload.menuItemId, payload.portionId ?? null)
      const existing = state.items.find(
        i => buildKey(i.menuItemId, i.portionId) === key
      )
      if (existing) {
        existing.quantity += payload.quantity ?? 1
      } else {
        state.items.push({
          menuItemId:   payload.menuItemId,
          name:         payload.name,
          price:        payload.price,
          quantity:     payload.quantity ?? 1,
          emoji:        payload.emoji        ?? '🍽️',
          category:     payload.category     ?? null,
          portionId:    payload.portionId    ?? null,
          portionLabel: payload.portionLabel ?? null,
        })
      }
    },

    // ── removeItem ────────────────────────────────────────────────────────────
    // payload: { menuItemId, portionId? }  OR  just menuItemId string (legacy)
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

    // ── updateQuantity ────────────────────────────────────────────────────────
    // payload: { menuItemId, portionId?, quantity }
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

    setTableInfo: (state, { payload: { tableId, sessionId } }) => {
      state.tableId   = tableId
      state.sessionId = sessionId
    },

    setLoyaltyInfo: (state, { payload: { tier, discountPct } }) => {
      state.loyaltyTier = tier
      state.discountPct = discountPct
    },
  },
})

export const {
  addItem, removeItem, updateQuantity,
  clearCart, setTableInfo, setLoyaltyInfo,
} = cartSlice.actions

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectCartItems    = (s) => s.cart.items
export const selectCartCount    = (s) => s.cart.items.reduce((acc, i) => acc + i.quantity, 0)
export const selectCartSubtotal = (s) => s.cart.items.reduce((acc, i) => acc + i.price * i.quantity, 0)
export const selectCartDiscount = (s) => {
  const sub = s.cart.items.reduce((acc, i) => acc + i.price * i.quantity, 0)
  return Math.round(sub * (s.cart.discountPct / 100))
}
export const selectCartTotal    = (s) => {
  const sub = s.cart.items.reduce((acc, i) => acc + i.price * i.quantity, 0)
  return Math.round(sub * (1 - s.cart.discountPct / 100))
}
export const selectTableId      = (s) => s.cart.tableId
export const selectSessionId    = (s) => s.cart.sessionId

// Total qty of a specific item (all portions combined) — for card badge
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