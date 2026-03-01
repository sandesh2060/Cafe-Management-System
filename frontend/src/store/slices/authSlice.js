// src/store/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authService }      from '@modules/customer/services/authService'
import { staffAuthService } from '@modules/staff/services/staffAuthService'

// ── Customer thunks ───────────────────────────────────────────────────────────

export const checkUsername = createAsyncThunk(
  'auth/checkUsername',
  async (username, { rejectWithValue }) => {
    try { return await authService.checkUsername(username) }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'Check failed') }
  }
)

export const registerWithUsername = createAsyncThunk(
  'auth/registerWithUsername',
  async ({ username, name, cafeId }, { rejectWithValue }) => {
    try { return await authService.registerUser({ username, name, cafeId }) }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'Registration failed') }
  }
)

export const loginWithUsername = createAsyncThunk(
  'auth/loginWithUsername',
  async (username, { rejectWithValue }) => {
    try { return await authService.loginUser({ username }) }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'Login failed') }
  }
)

export const loginAsGuest = createAsyncThunk(
  'auth/loginAsGuest',
  async (tableId, { rejectWithValue }) => {
    try { return await authService.guestLogin(tableId) }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'Guest login failed') }
  }
)

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try { return await authService.logout() }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'Logout failed') }
  }
)

// ── Staff thunk ───────────────────────────────────────────────────────────────
// Hydrates the SAME auth slice so ProtectedRoute's selectIsLoggedIn /
// selectRole / selectToken all work without any changes to ProtectedRoute.

export const loginStaff = createAsyncThunk(
  'auth/loginStaff',
  async ({ username, password }, { rejectWithValue }) => {
    try { return await staffAuthService.login({ username, password }) }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'Login failed') }
  }
)

// ── Shared fulfilled handler ──────────────────────────────────────────────────

const fulfilled = (state, { payload }) => {
  state.loading = false
  if (!payload?.user) return
  state.user       = payload.user
  state.token      = payload.token
  state.isLoggedIn = true
  state.isGuest    = !!payload.user.isGuest
  state.role       = payload.user.role ?? 'customer'
  state.error      = null
}

// ── Slice ─────────────────────────────────────────────────────────────────────

const initialState = {
  user:       null,
  token:      null,
  isLoggedIn: false,
  isGuest:    false,
  role:       null,
  loading:    false,
  error:      null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, { payload }) => {
      state.user       = payload.user
      state.token      = payload.token
      state.isLoggedIn = true
      state.isGuest    = !!payload.user?.isGuest
      state.role       = payload.user?.role
      state.error      = null
    },
    clearAuth:  (state) => { Object.assign(state, initialState) },
    setError:   (state, { payload }) => { state.error = payload },
    clearError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    const pending  = (state) => { state.loading = true;  state.error = null }
    const rejected = (state, { payload }) => { state.loading = false; state.error = payload }

    builder
      .addCase(checkUsername.pending,   pending)
      .addCase(checkUsername.rejected,  rejected)
      .addCase(checkUsername.fulfilled, (state) => { state.loading = false })

      .addCase(registerWithUsername.pending,   pending)
      .addCase(registerWithUsername.rejected,  rejected)
      .addCase(registerWithUsername.fulfilled, fulfilled)

      .addCase(loginWithUsername.pending,   pending)
      .addCase(loginWithUsername.rejected,  rejected)
      .addCase(loginWithUsername.fulfilled, fulfilled)

      .addCase(loginAsGuest.pending,   pending)
      .addCase(loginAsGuest.rejected,  rejected)
      .addCase(loginAsGuest.fulfilled, (state, { payload }) => {
        state.loading    = false
        state.user       = payload.user
        state.token      = payload.token
        state.isLoggedIn = true
        state.isGuest    = true
        state.role       = 'customer'
      })

      // Staff login — same fulfilled shape, role drives ProtectedRoute redirect
      .addCase(loginStaff.pending,   pending)
      .addCase(loginStaff.rejected,  rejected)
      .addCase(loginStaff.fulfilled, fulfilled)

      .addCase(logoutUser.fulfilled, (state) => { Object.assign(state, initialState) })
  },
})

export const { setCredentials, clearAuth, setError, clearError } = authSlice.actions

export const selectUser        = (s) => s.auth.user
export const selectToken       = (s) => s.auth.token
export const selectIsLoggedIn  = (s) => s.auth.isLoggedIn
export const selectRole        = (s) => s.auth.role
export const selectIsGuest     = (s) => s.auth.isGuest
export const selectAuthLoading = (s) => s.auth.loading
export const selectAuthError   = (s) => s.auth.error

export default authSlice.reducer