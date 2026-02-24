// src/store/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authService } from '@modules/customer/services/authService'

export const loginWithGoogle = createAsyncThunk(
  'auth/loginWithGoogle',
  async (credential, { rejectWithValue }) => {
    try { return await authService.googleLogin(credential) }
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

const initialState = {
  user:        null,          // { _id, name, email, role, avatar }
  token:       null,
  isLoggedIn:  false,
  isGuest:     false,
  role:        null,          // customer | waiter | kitchen | cashier | manager | admin
  loading:     false,
  error:       null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, { payload }) => {
      state.user      = payload.user
      state.token     = payload.token
      state.isLoggedIn = true
      state.isGuest   = payload.user.role === 'guest'
      state.role      = payload.user.role
      state.error     = null
    },
    clearAuth: (state) => {
      state.user      = null
      state.token     = null
      state.isLoggedIn = false
      state.isGuest   = false
      state.role      = null
      state.error     = null
    },
    setError: (state, { payload }) => { state.error = payload },
    clearError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    const pending   = (state) => { state.loading = true; state.error = null }
    const rejected  = (state, { payload }) => { state.loading = false; state.error = payload }

    builder
      .addCase(loginWithGoogle.pending,   pending)
      .addCase(loginWithGoogle.rejected,  rejected)
      .addCase(loginWithGoogle.fulfilled, (state, { payload }) => {
        state.loading   = false
        state.user      = payload.user
        state.token     = payload.token
        state.isLoggedIn = true
        state.isGuest   = false
        state.role      = payload.user.role
      })
      .addCase(loginAsGuest.pending,   pending)
      .addCase(loginAsGuest.rejected,  rejected)
      .addCase(loginAsGuest.fulfilled, (state, { payload }) => {
        state.loading   = false
        state.user      = payload.user
        state.token     = payload.token
        state.isLoggedIn = true
        state.isGuest   = true
        state.role      = 'customer'
      })
      .addCase(logoutUser.fulfilled, (state) => {
        Object.assign(state, initialState)
      })
  },
})

export const { setCredentials, clearAuth, setError, clearError } = authSlice.actions

// Selectors
export const selectUser       = (s) => s.auth.user
export const selectToken      = (s) => s.auth.token
export const selectIsLoggedIn = (s) => s.auth.isLoggedIn
export const selectRole       = (s) => s.auth.role
export const selectIsGuest    = (s) => s.auth.isGuest
export const selectAuthLoading = (s) => s.auth.loading
export const selectAuthError  = (s) => s.auth.error

export default authSlice.reducer