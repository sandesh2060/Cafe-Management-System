// src/api/axios.js
import axios from 'axios'

// FIX: VITE_API_URL already includes /api — don't add it again
// .env: VITE_API_URL=http://localhost:5000/api  ← already has /api
// So baseURL should just be VITE_API_URL directly
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_URL,   // was: `${API_URL}/api` → caused /api/api double prefix
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('kc_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      localStorage.removeItem('kc_token')
      localStorage.removeItem('kc_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api