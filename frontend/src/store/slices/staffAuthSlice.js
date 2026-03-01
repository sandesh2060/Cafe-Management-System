// src/store/slices/staffAuthSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { staffAuthService } from '@modules/staff/services/staffAuthService'

// ── Thunk ─────────────────────────────────────────────────────────────────────
export const loginStaff = createAsyncThunk(
  'staffAuth/login',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      return await staffAuthService.login({ username, password })
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Login failed — check your credentials'
      )
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────
const initialState = {
  user:       null,
  token:      null,
  isLoggedIn: false,
  role:       null,
  loading:    false,
  error:      null,
}

const staffAuthSlice = createSlice({
  name: 'staffAuth',
  initialState,
  reducers: {
    setStaffCredentials: (state, { payload }) => {
      state.user       = payload.user
      state.token      = payload.token
      state.isLoggedIn = true
      state.role       = payload.user?.role
      state.error      = null
    },
    clearStaffAuth: (state) => { Object.assign(state, initialState) },
    clearStaffError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginStaff.pending, (state) => {
        state.loading = true
        state.error   = null
      })
      .addCase(loginStaff.fulfilled, (state, { payload }) => {
        state.loading    = false
        state.user       = payload.user
        state.token      = payload.token
        state.isLoggedIn = true
        state.role       = payload.user?.role
        state.error      = null
      })
      .addCase(loginStaff.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload
      })
  },
})

export const { setStaffCredentials, clearStaffAuth, clearStaffError } = staffAuthSlice.actions

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectStaffUser       = (s) => s.staffAuth.user
export const selectStaffToken      = (s) => s.staffAuth.token
export const selectStaffIsLoggedIn = (s) => s.staffAuth.isLoggedIn
export const selectStaffRole       = (s) => s.staffAuth.role
export const selectStaffLoading    = (s) => s.staffAuth.loading
export const selectStaffError      = (s) => s.staffAuth.error

export default staffAuthSlice.reducer