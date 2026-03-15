// src/store/slices/tableSessionSlice.js
//
// FIXES:
//   • fetchActiveSession.fulfilled uses double-unwrap guard
//     (payload?.data?.session ?? payload?.session) to handle both
//     { session } and { data: { session } } backend shapes
//   • selectSessionId falls back to session?._id in case backend
//     uses _id instead of sessionId as the identifier field
//   • Comments clarify closeSession scope: session-only, not full logout.
//     kc_token is cleared by logoutService, not here.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '@api/axios'
import { ENDPOINTS } from '@api/endpoints'

export const fetchActiveSession = createAsyncThunk(
  'tableSession/fetchActive',
  async (_, { rejectWithValue }) => {
    try { return await api.get(ENDPOINTS.TABLE.SESSION_ACTIVE) }
    catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch session')
    }
  }
)

export const closeSession = createAsyncThunk(
  'tableSession/close',
  async (_, { rejectWithValue }) => {
    try {
      const result = await api.post(ENDPOINTS.TABLE.SESSION_CLOSE)
      // Side effects live in the thunk, not in the reducer ✓
      // NOTE: only session keys are cleared here — kc_token is handled
      // by logoutService, kc_theme is intentionally preserved.
      ;['kc_session_id', 'kc_session_data', 'kc_table_number', 'kc_table_id']
        .forEach((k) => localStorage.removeItem(k))
      return result
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to close session')
    }
  }
)

const initialState = {
  session:   null,
  tableInfo: null,
  detecting: false,
  loading:   false,
  error:     null,
}

const tableSessionSlice = createSlice({
  name: 'tableSession',
  initialState,
  reducers: {
    setDetecting: (state) => {
      state.detecting = true
      state.error     = null
    },
    setSession: (state, { payload }) => {
      state.session   = payload
      state.detecting = false
      state.error     = null
    },
    setSessionError: (state, { payload }) => {
      state.error     = payload
      state.detecting = false
    },
    // PURE reducer — no localStorage here.
    // Callers (App.jsx bootstrap, logout flow) must clear storage themselves.
    clearSession: (state) => {
      state.session   = null
      state.tableInfo = null
      state.detecting = false
      state.error     = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveSession.pending,  (state) => { state.loading = true })
      .addCase(fetchActiveSession.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload
      })
      .addCase(fetchActiveSession.fulfilled, (state, { payload }) => {
        // FIX: double-unwrap guard — backend may return { data: { session } }
        // or { session } depending on the response wrapper used
        state.loading = false
        state.session = payload?.data?.session ?? payload?.session ?? null
      })
      // closeSession thunk already cleared storage — reducer just resets state
      .addCase(closeSession.fulfilled, (state) => {
        Object.assign(state, initialState)
      })
  },
})

export const { setDetecting, setSession, setSessionError, clearSession } =
  tableSessionSlice.actions

export const selectSession     = (s) => s.tableSession.session
export const selectIsDetecting = (s) => s.tableSession.detecting
export const selectSessionError = (s) => s.tableSession.error
export const selectTableId     = (s) => s.tableSession.session?.tableId    ?? null
export const selectTableNumber = (s) => s.tableSession.session?.tableNumber ?? null

// FIX: fall back to session._id if backend doesn't use a sessionId field
export const selectSessionId   = (s) =>
  s.tableSession.session?.sessionId ?? s.tableSession.session?._id ?? null

export default tableSessionSlice.reducer