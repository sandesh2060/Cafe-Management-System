// src/store/slices/tableSessionSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '@api/axios'
import { ENDPOINTS } from '@api/endpoints'

// ── Async thunks ─────────────────────────────────────────────────────────────

export const fetchActiveSession = createAsyncThunk(
  'tableSession/fetchActive',
  async (_, { rejectWithValue }) => {
    try { return await api.get(ENDPOINTS.TABLE.SESSION_ACTIVE) }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to fetch session') }
  }
)

export const closeSession = createAsyncThunk(
  'tableSession/close',
  async (_, { rejectWithValue }) => {
    try { return await api.post(ENDPOINTS.TABLE.SESSION_CLOSE) }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to close session') }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

const initialState = {
  session:     null,       // { sessionId, tableId, tableNumber, zone, cafeId, status, ... }
  tableInfo:   null,       // { tableId, sessionId }
  detecting:   false,      // true while GPS/QR detection is running
  loading:     false,
  error:       null,
}

const tableSessionSlice = createSlice({
  name: 'tableSession',
  initialState,
  reducers: {
    // Called by useTableDetection when detection starts
    setDetecting: (state) => {
      state.detecting = true
      state.error     = null
    },

    // Called by useTableDetection when session is successfully created
    setSession: (state, { payload }) => {
      state.session   = payload
      state.detecting = false
      state.error     = null
    },

    // Called by useTableDetection on API failure
    setSessionError: (state, { payload }) => {
      state.error     = payload
      state.detecting = false
    },

    clearSession: (state) => {
      state.session   = null
      state.tableInfo = null
      state.detecting = false
      state.error     = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveSession.pending,   (state) => { state.loading = true })
      .addCase(fetchActiveSession.rejected,  (state, { payload }) => { state.loading = false; state.error = payload })
      .addCase(fetchActiveSession.fulfilled, (state, { payload }) => {
        state.loading = false
        state.session = payload.session ?? null
      })
      .addCase(closeSession.fulfilled, (state) => {
        Object.assign(state, initialState)
      })
  },
})

export const { setDetecting, setSession, setSessionError, clearSession } = tableSessionSlice.actions

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectSession      = (s) => s.tableSession.session
export const selectIsDetecting  = (s) => s.tableSession.detecting
export const selectSessionError = (s) => s.tableSession.error
export const selectTableId      = (s) => s.tableSession.session?.tableId
export const selectSessionId    = (s) => s.tableSession.session?.sessionId

// ✅ FIXED — tableNumber is flat on the session object (not nested under table.tableNumber)
// Backend createSession stores: { sessionId, tableId, cafeId, tableNumber, zone, ... }
export const selectTableNumber  = (s) => s.tableSession.session?.tableNumber ?? null

export default tableSessionSlice.reducer