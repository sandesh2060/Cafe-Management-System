// src/store/slices/orderSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@api/axios";
import { ENDPOINTS as EP } from "@api/endpoints";

export const placeOrder = createAsyncThunk(
  "order/place",
  async (orderData, { rejectWithValue }) => {
    try {
      return await api.post(EP.ORDER.PLACE, orderData);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Order failed");
    }
  },
);

export const fetchActiveOrder = createAsyncThunk(
  "order/fetchActive",
  async (_, { rejectWithValue }) => {
    try {
      return await api.get(EP.ORDER.ACTIVE);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Fetch failed");
    }
  },
);

export const fetchOrderHistory = createAsyncThunk(
  "order/fetchHistory",
  async (_, { rejectWithValue }) => {
    try {
      return await api.get(EP.ORDER.HISTORY);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Fetch history failed");
    }
  },
);

export const cancelOrder = createAsyncThunk(
  "order/cancel",
  async (orderId, { rejectWithValue }) => {
    try {
      return await api.post(EP.ORDER.CANCEL(orderId));
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Cancel failed");
    }
  },
);

// Order statuses that BLOCK manual logout
export const BLOCKING_STATUSES = ["pending", "preparing", "on_the_way"];

const initialState = {
  activeOrder:    null,
  orderHistory:   [],
  loading:        false,
  error:          null,
  hasActiveOrder: false,
};

const orderSlice = createSlice({
  name: "order",
  initialState,
  reducers: {
    updateOrderStatus: (state, { payload: { orderId, status } }) => {
      if (state.activeOrder?._id === orderId) {
        state.activeOrder.status = status;
        state.hasActiveOrder = BLOCKING_STATUSES.includes(status);
      }
    },
    clearActiveOrder: (state) => {
      state.activeOrder    = null;
      state.hasActiveOrder = false;
    },
    setActiveOrder: (state, { payload }) => {
      state.activeOrder    = payload;
      state.hasActiveOrder = BLOCKING_STATUSES.includes(payload?.status);
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // placeOrder
      .addCase(placeOrder.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(placeOrder.rejected, (state, { payload }) => {
        state.loading = false;
        state.error   = payload;
      })
      .addCase(placeOrder.fulfilled, (state, { payload }) => {
        state.loading        = false;
        state.activeOrder    = payload.order;
        state.hasActiveOrder = BLOCKING_STATUSES.includes(payload.order?.status);
      })

      // fetchActiveOrder
      .addCase(fetchActiveOrder.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchActiveOrder.rejected, (state, { payload }) => {
        state.loading = false;
        state.error   = payload;
      })
      .addCase(fetchActiveOrder.fulfilled, (state, { payload }) => {
        state.loading        = false;
        state.activeOrder    = payload.order ?? null;
        state.hasActiveOrder = !!payload.order && BLOCKING_STATUSES.includes(payload.order?.status);
      })

      // fetchOrderHistory
      .addCase(fetchOrderHistory.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchOrderHistory.rejected, (state, { payload }) => {
        state.loading = false;
        state.error   = payload;
      })
      .addCase(fetchOrderHistory.fulfilled, (state, { payload }) => {
        state.loading      = false;
        state.orderHistory = payload.orders ?? [];
      })

      // cancelOrder
      .addCase(cancelOrder.pending, (state) => {
        state.loading = true;
      })
      .addCase(cancelOrder.rejected, (state, { payload }) => {
        state.loading = false;
        state.error   = payload;
      })
      .addCase(cancelOrder.fulfilled, (state, { payload }) => {
        state.loading = false;
        if (state.activeOrder?._id === payload.order?._id) {
          state.activeOrder    = null;
          state.hasActiveOrder = false;
        }
      });
  },
});

export const { updateOrderStatus, clearActiveOrder, setActiveOrder, clearError } =
  orderSlice.actions;

// Selectors
export const selectActiveOrder    = (s) => s.order.activeOrder;
export const selectHasActiveOrder = (s) => s.order.hasActiveOrder;
export const selectOrderStatus    = (s) => s.order.activeOrder?.status;
export const selectOrderHistory   = (s) => s.order.orderHistory;
export const selectOrderLoading   = (s) => s.order.loading;
export const selectOrderError     = (s) => s.order.error;

export default orderSlice.reducer;