// src/store/slices/authSlice.js
//
// FIXES:
// • staffAuthSlice removed from store — all auth (customer + staff) lives here.
// • loginStaff / staffLogin point to the same thunk — single source of truth.
// • unwrapAuth handles { user, token }, { data: { user, token } }, and flat shapes.
// • logoutUser.rejected clears state (previously left loading: true forever).
// • bootstrapReady preserved across clearAuth so ProtectedRoute never re-blocks.
// • updateUser thunk merges profile updates into existing user without full re-fetch.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authService }      from '@modules/customer/services/authService'
import { staffAuthService } from '@modules/staff/services/staffAuthService'

// ── Response shape normalizer ─────────────────────────────────────────────────
// Handles all backend response shapes:
//   { user, token }                     → direct (guest endpoint)
//   { data: { user, token } }           → sendSuccess wrapper
//   { success, data: { user, token } }  → full sendSuccess (after axios strips envelope)
const unwrapAuth = (payload, key) =>
  payload?.data?.[key] ?? payload?.[key] ?? null

// ── Customer thunks ───────────────────────────────────────────────────────────
export const checkUsername = createAsyncThunk(
  'auth/checkUsername',
  async (username, { rejectWithValue }) => {
    try { return await authService.checkUsername(username) }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'Check failed') }
  }
)

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try { return await authService.loginUser(credentials) }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'Login failed') }
  }
)

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try { return await authService.registerUser(userData) }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'Registration failed') }
  }
)

export const guestLogin = createAsyncThunk(
  'auth/guestLogin',
  async (cafeId, { rejectWithValue }) => {
    try { return await authService.guestLogin(cafeId) }
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
export const staffLogin = createAsyncThunk(
  'auth/staffLogin',
  async (credentials, { rejectWithValue }) => {
    try { return await staffAuthService.login(credentials) }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'Staff login failed') }
  }
)

// ── Initial state ─────────────────────────────────────────────────────────────
const initialState = {
  user:           null,
  token:          null,
  role:           null,
  isLoggedIn:     false,
  loading:        false,
  error:          null,
  bootstrapReady: false,
}

// ── Shared fulfilled handler (customer login, register, guest, staff) ─────────
const handleAuthFulfilled = (state, { payload }) => {
  state.loading    = false
  state.error      = null
  state.user       = unwrapAuth(payload, 'user')  ?? null
  state.token      = unwrapAuth(payload, 'token') ?? null
  state.role       = state.user?.role ?? 'customer'
  state.isLoggedIn = !!(state.user && state.token)
  if (state.token) localStorage.setItem('kc_token', state.token)
}

// ── Slice ─────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setBootstrapReady: (state, { payload }) => {
      state.bootstrapReady = payload ?? true
    },
    clearError: (state) => {
      state.error = null
    },
    // Used by App.jsx bootstrap to restore session from /auth/me
    setCredentials: (state, { payload }) => {
      const user  = payload?.user  ?? null
      const token = payload?.token ?? state.token ?? null
      if (!user?._id) return  // don't overwrite with garbage
      state.user       = user
      state.token      = token
      state.role       = user.role
      state.isLoggedIn = true
      state.error      = null
      if (token) localStorage.setItem('kc_token', token)
    },
    // Clears auth state but preserves bootstrapReady so ProtectedRoute
    // doesn't re-show the full-screen spinner after logout.
    clearAuth: (state) => {
      const wasReady = state.bootstrapReady
      Object.assign(state, { ...initialState, bootstrapReady: wasReady })
      localStorage.removeItem('kc_token')
      localStorage.removeItem('kc_user')
    },
  },

  extraReducers: (builder) => {
    // ── checkUsername (no state change needed, just loading flag) ──────────
    builder
      .addCase(checkUsername.pending,   (state) => { state.loading = true })
      .addCase(checkUsername.fulfilled, (state) => { state.loading = false })
      .addCase(checkUsername.rejected,  (state) => { state.loading = false })

    // ── loginUser ──────────────────────────────────────────────────────────
    builder
      .addCase(loginUser.pending,    (state) => { state.loading = true; state.error = null })
      .addCase(loginUser.fulfilled,  handleAuthFulfilled)
      .addCase(loginUser.rejected,   (state, { payload }) => { state.loading = false; state.error = payload })

    // ── registerUser ───────────────────────────────────────────────────────
    builder
      .addCase(registerUser.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(registerUser.fulfilled, handleAuthFulfilled)
      .addCase(registerUser.rejected,  (state, { payload }) => { state.loading = false; state.error = payload })

    // ── guestLogin ─────────────────────────────────────────────────────────
    builder
      .addCase(guestLogin.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(guestLogin.fulfilled, (state, action) => {
        handleAuthFulfilled(state, action)
        state.role = 'customer'  // guests are always customer role
      })
      .addCase(guestLogin.rejected,  (state, { payload }) => { state.loading = false; state.error = payload })

    // ── logoutUser ─────────────────────────────────────────────────────────
    builder
      .addCase(logoutUser.pending,    (state) => { state.loading = true })
      .addCase(logoutUser.fulfilled,  (state) => {
        const wasReady = state.bootstrapReady
        Object.assign(state, { ...initialState, bootstrapReady: wasReady })
        localStorage.removeItem('kc_token')
        localStorage.removeItem('kc_user')
      })
      // FIX: rejected was unhandled — loading stayed true forever
      .addCase(logoutUser.rejected, (state) => {
        const wasReady = state.bootstrapReady
        Object.assign(state, { ...initialState, bootstrapReady: wasReady })
        localStorage.removeItem('kc_token')
        localStorage.removeItem('kc_user')
      })

    // ── staffLogin ─────────────────────────────────────────────────────────
    builder
      .addCase(staffLogin.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(staffLogin.fulfilled, handleAuthFulfilled)
      .addCase(staffLogin.rejected,  (state, { payload }) => { state.loading = false; state.error = payload })
  },
})

export const { setBootstrapReady, setCredentials, clearAuth, clearError } = authSlice.actions

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectUser            = (s) => s.auth.user
export const selectToken           = (s) => s.auth.token
export const selectRole            = (s) => s.auth.role
export const selectIsLoggedIn      = (s) => s.auth.isLoggedIn
export const selectIsAuthenticated = (s) => s.auth.isLoggedIn   // alias
export const selectAuthLoading     = (s) => s.auth.loading
export const selectAuthError       = (s) => s.auth.error
export const selectIsGuest         = (s) => s.auth.user?.isGuest ?? false
export const selectBootstrapReady  = (s) => s.auth.bootstrapReady

// ── Thunk aliases (keep existing import names working) ────────────────────────
export const loginWithUsername    = loginUser
export const registerWithUsername = registerUser
export const loginAsGuest         = guestLogin
export const loginStaff           = staffLogin   // StaffLoginPage imports this name

// ── updateUser action creator (ProfilePage dispatches after PATCH /auth/me) ──
// Merges updated fields into Redux without a full re-fetch.
export const updateUser = (updatedData) => (dispatch, getState) => {
  const { auth } = getState()
  const merged   = { ...(auth.user ?? {}), ...(updatedData?.user ?? updatedData ?? {}) }
  dispatch(setCredentials({ user: merged, token: auth.token }))
}

export default authSlice.reducer