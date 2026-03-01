// src/modules/customer/services/authService.js
import api from '@api/axios'

export const authService = {
  checkUsername: async (username) => {
    const { data } = await api.post('/auth/check-username', { username })
    return data.data ?? data
  },

  registerUser: async ({ username, name, cafeId }) => {
    const { data } = await api.post('/auth/register', { username, name, cafeId })
    return data.data ?? data
  },

  loginUser: async ({ username }) => {
    const { data } = await api.post('/auth/login', { username })
    return data.data ?? data
  },

  guestLogin: async (cafeId) => {
    const { data } = await api.post('/auth/guest', { cafeId })
    return data.data ?? data
  },

  logout: async () => {
    const { data } = await api.post('/auth/logout')
    return data
  },
}