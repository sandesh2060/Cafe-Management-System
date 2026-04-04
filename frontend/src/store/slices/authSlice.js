// frontend/src/store/slices/authSlice.js
//
// ─── CHANGES FROM ORIGINAL ────────────────────────────────────────────────────
// 1. loginUser now expects { username, passcode } payload
// 2. registerUser now expects { username, passcode, cafeId }
// 3. Added blockState — tracks remainingSeconds + attemptsLeft from 429 errors
// 4. Added forgotPasscode + verifyOtp thunks for PIN reset flow
// 5. Added addEmail + changePasscode thunks
// 6. selectBlockState + selectAttemptsLeft selectors exported
// 7. clearBlockState action added — called when user navigates away from login
// 8. All aliases + existing selectors unchanged
// ★ 9. Added ownerLogin thunk — reads `owner` key from response, sets role:'owner'
// ─────────────────────────────────────────────────────────────────────────────

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authService }      from '@modules/customer/services/authService'
import { staffAuthService } from '@modules/staff/services/staffAuthService'
import api from '@api/axios'

// ── Response shape normalizer ─────────────────────────────────────────────────
const unwrapAuth = (payload, key) =>
  payload?.data?.[key] ?? payload?.[key] ?? null

// ── Extract block meta from rejected action ───────────────────────────────────
const extractBlockMeta = (err) => ({
  remainingSeconds: err?.response?.data?.meta?.remainingSeconds ?? null,
  attemptsLeft:     err?.response?.data?.meta?.attemptsLeft     ?? null,
})

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
  async ({ username, passcode }, { rejectWithValue }) => {
    try { return await authService.loginUser({ username, passcode }) }
    catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || 'Login failed',
        ...extractBlockMeta(err),
      })
    }
  }
)

export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ username, passcode, cafeId }, { rejectWithValue }) => {
    try { return await authService.registerUser({ username, passcode, cafeId }) }
    catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Registration failed')
    }
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

// ★ NEW: Owner thunk ───────────────────────────────────────────────────────────
// Owner controller returns { owner, subscriptionActive, daysUntilExpiry }
// (not { user }), and owner.model has no role field.
// We normalise here so the rest of the app (getRoleHome, ProtectedRoute) works.
export const ownerLogin = createAsyncThunk(
  'auth/ownerLogin',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await api.post('/owner/login', { email, password })
      return res.data   // { success, data: { owner, subscriptionActive, daysUntilExpiry } }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Owner login failed')
    }
  }
)

// ── PIN reset thunks ──────────────────────────────────────────────────────────
export const forgotPasscode = createAsyncThunk(
  'auth/forgotPasscode',
  async (username, { rejectWithValue }) => {
    try { return await authService.forgotPasscode(username) }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'Request failed') }
  }
)

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async ({ username, otp, newPasscode }, { rejectWithValue }) => {
    try { return await authService.verifyOtp({ username, otp, newPasscode }) }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'OTP verification failed') }
  }
)

// ── Profile thunks ────────────────────────────────────────────────────────────
export const addEmail = createAsyncThunk(
  'auth/addEmail',
  async (email, { rejectWithValue }) => {
    try { return await authService.addEmail(email) }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to save email') }
  }
)

export const changePasscode = createAsyncThunk(
  'auth/changePasscode',
  async ({ currentPasscode, newPasscode }, { rejectWithValue }) => {
    try { return await authService.changePasscode({ currentPasscode, newPasscode }) }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to change passcode') }
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
  blockState: {
    remainingSeconds: null,
    attemptsLeft:     null,
  },
}

// ── Shared fulfilled handler ───────────────────────────────────────────────────
const handleAuthFulfilled = (state, { payload }) => {
  state.loading         = false
  state.error           = null
  state.blockState      = { remainingSeconds: null, attemptsLeft: null }
  state.user            = unwrapAuth(payload, 'user') ?? null
  state.token           = null
  state.role            = state.user?.role ?? 'customer'
  state.isLoggedIn      = !!state.user
}

// ★ NEW: Owner-specific fulfilled handler ─────────────────────────────────────
// Reads `owner` key (not `user`) and hard-sets role to 'owner'
const handleOwnerLoginFulfilled = (state, { payload }) => {
  const owner = unwrapAuth(payload, 'owner')
  state.loading    = false
  state.error      = null
  state.blockState = { remainingSeconds: null, attemptsLeft: null }
  // Inject role:'owner' since owner.model has no role field
  state.user       = owner ? { ...owner, role: 'owner' } : null
  state.token      = null
  state.role       = 'owner'
  state.isLoggedIn = !!owner
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
      state.error      = null
      state.blockState = { remainingSeconds: null, attemptsLeft: null }
    },
    clearBlockState: (state) => {
      state.blockState = { remainingSeconds: null, attemptsLeft: null }
    },
    setCredentials: (state, { payload }) => {
      const user = payload?.user ?? null
      if (!user?._id) return
      state.user       = user
      state.token      = null
      state.role       = user.role
      state.isLoggedIn = true
      state.error      = null
    },
    clearAuth: (state) => {
      const wasReady = state.bootstrapReady
      Object.assign(state, { ...initialState, bootstrapReady: wasReady })
      localStorage.removeItem('kc_token')
      localStorage.removeItem('kc_user')
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(checkUsername.pending,   (state) => { state.loading = true })
      .addCase(checkUsername.fulfilled, (state) => { state.loading = false })
      .addCase(checkUsername.rejected,  (state) => { state.loading = false })

    builder
      .addCase(loginUser.pending,   (state) => {
        state.loading    = true
        state.error      = null
        state.blockState = { remainingSeconds: null, attemptsLeft: null }
      })
      .addCase(loginUser.fulfilled, handleAuthFulfilled)
      .addCase(loginUser.rejected,  (state, { payload }) => {
        state.loading = false
        state.error   = payload?.message ?? payload ?? 'Login failed'
        state.blockState = {
          remainingSeconds: payload?.remainingSeconds ?? null,
          attemptsLeft:     payload?.attemptsLeft     ?? null,
        }
      })

    builder
      .addCase(registerUser.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(registerUser.fulfilled, handleAuthFulfilled)
      .addCase(registerUser.rejected,  (state, { payload }) => {
        state.loading = false
        state.error   = payload
      })

    builder
      .addCase(guestLogin.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(guestLogin.fulfilled, (state, action) => {
        handleAuthFulfilled(state, action)
        state.role = 'customer'
      })
      .addCase(guestLogin.rejected,  (state, { payload }) => { state.loading = false; state.error = payload })

    builder
      .addCase(logoutUser.pending,   (state) => { state.loading = true })
      .addCase(logoutUser.fulfilled, (state) => {
        const wasReady = state.bootstrapReady
        Object.assign(state, { ...initialState, bootstrapReady: wasReady })
        localStorage.removeItem('kc_token')
        localStorage.removeItem('kc_user')
      })
      .addCase(logoutUser.rejected, (state) => {
        const wasReady = state.bootstrapReady
        Object.assign(state, { ...initialState, bootstrapReady: wasReady })
        localStorage.removeItem('kc_token')
        localStorage.removeItem('kc_user')
      })

    builder
      .addCase(staffLogin.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(staffLogin.fulfilled, handleAuthFulfilled)
      .addCase(staffLogin.rejected,  (state, { payload }) => { state.loading = false; state.error = payload })

    // ★ NEW: Owner login cases
    builder
      .addCase(ownerLogin.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(ownerLogin.fulfilled, handleOwnerLoginFulfilled)
      .addCase(ownerLogin.rejected,  (state, { payload }) => {
        state.loading = false
        state.error   = payload ?? 'Owner login failed'
      })

    builder
      .addCase(forgotPasscode.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(forgotPasscode.fulfilled, (state) => { state.loading = false })
      .addCase(forgotPasscode.rejected,  (state, { payload }) => { state.loading = false; state.error = payload })

    builder
      .addCase(verifyOtp.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(verifyOtp.fulfilled, (state) => { state.loading = false })
      .addCase(verifyOtp.rejected,  (state, { payload }) => { state.loading = false; state.error = payload })

    builder
      .addCase(addEmail.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(addEmail.fulfilled, (state, { payload }) => {
        state.loading = false
        if (state.user) state.user.hasEmail = true
        const email = payload?.data?.email
        if (email && state.user) state.user.email = email
      })
      .addCase(addEmail.rejected,  (state, { payload }) => { state.loading = false; state.error = payload })

    builder
      .addCase(changePasscode.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(changePasscode.fulfilled, (state) => { state.loading = false })
      .addCase(changePasscode.rejected,  (state, { payload }) => { state.loading = false; state.error = payload })
  },
})

export const {
  setBootstrapReady, setCredentials, clearAuth,
  clearError, clearBlockState,
} = authSlice.actions

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectUser            = (s) => s.auth.user
export const selectToken           = (s) => s.auth.token
export const selectRole            = (s) => s.auth.role
export const selectIsLoggedIn      = (s) => s.auth.isLoggedIn
export const selectIsAuthenticated = (s) => s.auth.isLoggedIn
export const selectAuthLoading     = (s) => s.auth.loading
export const selectAuthError       = (s) => s.auth.error
export const selectIsGuest         = (s) => s.auth.user?.isGuest ?? false
export const selectBootstrapReady  = (s) => s.auth.bootstrapReady
export const selectBlockState      = (s) => s.auth.blockState
export const selectAttemptsLeft    = (s) => s.auth.blockState.attemptsLeft
export const selectHasEmail        = (s) => s.auth.user?.hasEmail ?? false

// ── Aliases ───────────────────────────────────────────────────────────────────
export const loginWithUsername    = loginUser
export const registerWithUsername = registerUser
export const loginAsGuest         = guestLogin
export const loginStaff           = staffLogin

export const updateUser = (updatedData) => (dispatch, getState) => {
  const { auth } = getState()
  const merged   = { ...(auth.user ?? {}), ...(updatedData?.user ?? updatedData ?? {}) }
  dispatch(setCredentials({ user: merged }))
}

export default authSlice.reducer