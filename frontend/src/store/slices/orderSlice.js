// src/store/slices/orderSlice.js
//
// FIXES:
//   • placeOrder body map now forwards customizations per item
//   • fetchActiveOrder / fetchOrderHistory / cancelOrder all use
//     payload.data?.x ?? payload.x double-unwrap guard
//   • updateOrderStatus exported as alias of socketStatusUpdate
//     so any legacy import doesn't silently get undefined
//   • fetchActiveOrder.fulfilled now has shallow-equality guard —
//     skips state update (and re-render) if order hasn't changed

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import orderService from '@modules/customer/services/orderService'

// ── helpers ────────────────────────────────────────────────────────────────────
const unwrap = (payload, key) => payload?.data?.[key] ?? payload?.[key]

// ── Thunks ─────────────────────────────────────────────────────────────────────

export const placeOrder = createAsyncThunk(
  'order/place',
  async (payload, { rejectWithValue }) => {
    try {
      const body = {
        items: payload.items.map(i => ({
          menuItemId:     i.menuItemId,
          name:           i.name,
          price:          i.price,
          quantity:       i.quantity,
          emoji:          i.emoji,
          category:       i.category,
          portionId:      i.portionId      ?? null,
          portionLabel:   i.portionLabel   ?? null,
          customizations: i.customizations ?? null,
          notes:          i.notes          ?? null,
        })),
        tableId:     payload.tableId     ?? null,
        sessionId:   payload.sessionId   ?? null,
        cafeId:      payload.cafeId,
        loyaltyTier: payload.loyaltyTier ?? 'none',
        specialNote: payload.specialNote ?? null,
      }
      return await orderService.placeOrder(body)
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Order failed. Please try again.')
    }
  }
)

export const fetchActiveOrder = createAsyncThunk(
  'order/fetchActive',
  async (_, { rejectWithValue }) => {
    try {
      return await orderService.getActiveOrder()
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Could not load active order.')
    }
  }
)

export const fetchOrderHistory = createAsyncThunk(
  'order/fetchHistory',
  async ({ page = 1, limit = 10 } = {}, { rejectWithValue }) => {
    try {
      return await orderService.getOrderHistory(page, limit)
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Could not load order history.')
    }
  }
)

export const cancelOrder = createAsyncThunk(
  'order/cancel',
  async (orderId, { rejectWithValue }) => {
    try {
      return await orderService.cancelOrder(orderId)
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Could not cancel order.')
    }
  }
)

// ── Constants ──────────────────────────────────────────────────────────────────
export const BLOCKING_STATUSES = ['pending', 'preparing', 'on_the_way']

// ── Slice ──────────────────────────────────────────────────────────────────────
const initialState = {
  activeOrder:    null,
  orderHistory:   [],
  pagination:     null,
  loading:        false,
  placing:        false,
  lastMerged:     false,
  error:          null,
  hasActiveOrder: false,
}

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    socketStatusUpdate: (state, { payload: { orderId, status, order } }) => {
      if (state.activeOrder?._id === orderId) {
        state.activeOrder    = order ?? { ...state.activeOrder, status }
        state.hasActiveOrder = BLOCKING_STATUSES.includes(status)
      }
      const idx = state.orderHistory.findIndex(o => o._id === orderId)
      if (idx !== -1) state.orderHistory[idx] = { ...state.orderHistory[idx], status }
    },

    socketOrderCancelled: (state, { payload: { order } }) => {
      if (state.activeOrder?._id === order._id) {
        state.activeOrder    = order
        state.hasActiveOrder = false
      }
    },

    socketOrderUpdated: (state, { payload: { order } }) => {
      if (state.activeOrder?._id === order._id) {
        state.activeOrder = order
      }
      const idx = state.orderHistory.findIndex(o => o._id === order._id)
      if (idx !== -1) state.orderHistory[idx] = order
    },

    setActiveOrder: (state, { payload }) => {
      state.activeOrder    = payload
      state.hasActiveOrder = BLOCKING_STATUSES.includes(payload?.status)
    },
    clearActiveOrder: (state) => {
      state.activeOrder    = null
      state.hasActiveOrder = false
    },
    clearError:  (state) => { state.error      = null },
    clearMerged: (state) => { state.lastMerged = false },
  },

  extraReducers: (builder) => {
    builder
      // ── placeOrder ─────────────────────────────────────────────────────
      .addCase(placeOrder.pending, (state) => {
        state.placing    = true
        state.error      = null
        state.lastMerged = false
      })
      .addCase(placeOrder.rejected, (state, { payload }) => {
        state.placing = false
        state.error   = payload
      })
      .addCase(placeOrder.fulfilled, (state, { payload }) => {
        const order  = unwrap(payload, 'order')
        const merged = payload?.data?.merged ?? payload?.merged ?? false

        state.placing        = false
        state.lastMerged     = merged
        state.activeOrder    = order
        state.hasActiveOrder = BLOCKING_STATUSES.includes(order?.status)

        if (!order) return

        if (merged) {
          const idx = state.orderHistory.findIndex(o => o._id === order._id)
          if (idx !== -1) state.orderHistory[idx] = order
          else             state.orderHistory.unshift(order)
        } else {
          state.orderHistory = [order, ...state.orderHistory]
        }
      })

      // ── fetchActiveOrder ───────────────────────────────────────────────
      .addCase(fetchActiveOrder.pending,  (state) => { state.loading = true })
      .addCase(fetchActiveOrder.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload
      })
      .addCase(fetchActiveOrder.fulfilled, (state, { payload }) => {
        const incoming = unwrap(payload, 'order')
        state.loading  = false

        // Shallow-equality guard — skip state update if nothing changed.
        // This prevents unnecessary re-renders which were causing the
        // polling interval to reset and fire 750+ times per minute.
        const changed =
          (state.activeOrder === null) !== (incoming === null) ||
          (incoming !== null && (
            state.activeOrder._id       !== incoming._id ||
            state.activeOrder.status    !== incoming.status ||
            state.activeOrder.updatedAt !== incoming.updatedAt
          ))
        if (changed) {
          state.activeOrder    = incoming ?? null
          state.hasActiveOrder = !!incoming && BLOCKING_STATUSES.includes(incoming.status)
        }
      })

      // ── fetchOrderHistory ──────────────────────────────────────────────
      .addCase(fetchOrderHistory.pending,  (state) => { state.loading = true })
      .addCase(fetchOrderHistory.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload
      })
      .addCase(fetchOrderHistory.fulfilled, (state, { payload }) => {
        state.loading      = false
        state.orderHistory = unwrap(payload, 'orders')     ?? []
        state.pagination   = unwrap(payload, 'pagination') ?? null
      })

      // ── cancelOrder ────────────────────────────────────────────────────
      .addCase(cancelOrder.pending,  (state) => { state.loading = true })
      .addCase(cancelOrder.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload
      })
      .addCase(cancelOrder.fulfilled, (state, { payload }) => {
        const order   = unwrap(payload, 'order')
        state.loading = false
        if (state.activeOrder?._id === order?._id) {
          state.activeOrder    = order
          state.hasActiveOrder = false
        }
        const idx = state.orderHistory.findIndex(o => o._id === order?._id)
        if (idx !== -1) state.orderHistory[idx] = order
      })
  },
})

export const {
  socketStatusUpdate, socketOrderCancelled, socketOrderUpdated,
  setActiveOrder, clearActiveOrder, clearError, clearMerged,
} = orderSlice.actions

export const updateOrderStatus = orderSlice.actions.socketStatusUpdate

// ── Selectors ──────────────────────────────────────────────────────────────────
export const selectActiveOrder     = (s) => s.order.activeOrder
export const selectHasActiveOrder  = (s) => s.order.hasActiveOrder
export const selectOrderStatus     = (s) => s.order.activeOrder?.status
export const selectOrderHistory    = (s) => s.order.orderHistory
export const selectOrderPagination = (s) => s.order.pagination
export const selectOrderLoading    = (s) => s.order.loading
export const selectOrderPlacing    = (s) => s.order.placing
export const selectOrderError      = (s) => s.order.error
export const selectLastMerged      = (s) => s.order.lastMerged

export default orderSlice.reducer