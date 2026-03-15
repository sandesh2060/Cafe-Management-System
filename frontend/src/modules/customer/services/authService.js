// src/modules/customer/services/authService.js
//
// FIX: removed `const { data } = await api.post(...)` double-destructure.
// The axios interceptor in axios.js already returns response.data directly.
// So api.post() returns the payload object — destructuring { data } from it
// was grabbing the nested .data field (or undefined if not present),
// silently returning wrong values to all callers.
//
// All methods now return the payload directly and let callers (authSlice thunks)
// apply the unwrapAuth() guard for both { user, token } and { data: { user, token } }.

import api          from '@api/axios'
import { ENDPOINTS } from '@api/endpoints'

export const authService = {
  checkUsername: async (username) => {
    return await api.post(ENDPOINTS.AUTH.CHECK_USERNAME, { username })
  },

  registerUser: async ({ username, name, cafeId }) => {
    return await api.post(ENDPOINTS.AUTH.REGISTER, { username, name, cafeId })
  },

  loginUser: async ({ username }) => {
    return await api.post(ENDPOINTS.AUTH.LOGIN, { username })
  },

  guestLogin: async (cafeId) => {
    return await api.post(ENDPOINTS.AUTH.GUEST_LOGIN, { cafeId })
  },

  logout: async () => {
    return await api.post(ENDPOINTS.AUTH.LOGOUT)
  },
}