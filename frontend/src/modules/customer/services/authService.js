// src/modules/customer/services/authService.js
import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
})

// Attach token to every request if present
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const authService = {
  /**
   * Exchange Google OAuth credential (JWT from Google) for your app's token
   * @param {string} credential - token from Google One Tap / OAuth popup
   */
  googleLogin: async (credential) => {
    const { data } = await API.post('/auth/google', { credential })
    if (data.token) localStorage.setItem('token', data.token)
    return data // expected: { user, token }
  },

  /**
   * Log in as a guest tied to a specific table
   * @param {string} tableId
   */
  guestLogin: async (tableId) => {
    const { data } = await API.post('/auth/guest', { tableId })
    if (data.token) localStorage.setItem('token', data.token)
    return data // expected: { user, token }
  },

  /**
   * Log out the current user
   */
  logout: async () => {
    await API.post('/auth/logout')
    localStorage.removeItem('token')
  },
}

export default authService