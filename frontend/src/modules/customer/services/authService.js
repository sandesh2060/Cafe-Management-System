// src/modules/customer/services/authService.js
import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
})

// ── Single source of truth for token key ─────────────────────────────────────
// Use kc_token everywhere — the old 'token' key is now dead
const TOKEN_KEY = 'kc_token'

// Attach token to every request if present
API.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const authService = {
  /**
   * Exchange Google OAuth credential for your app's token
   */
  googleLogin: async (credential) => {
    const { data } = await API.post('/auth/google', { credential })
    if (data.token) localStorage.setItem(TOKEN_KEY, data.token)
    return data // { user, token }
  },

  /**
   * Log in as a guest tied to a specific table
   */
  guestLogin: async (tableId) => {
    const { data } = await API.post('/auth/guest', { tableId })
    if (data.token) localStorage.setItem(TOKEN_KEY, data.token)
    return data // { user, token }
  },

  /**
   * Log out the current user
   */
  logout: async () => {
    await API.post('/auth/logout')
    localStorage.removeItem(TOKEN_KEY)
  },
}

export default authService