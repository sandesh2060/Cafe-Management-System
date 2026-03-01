// src/modules/staff/services/staffAuthService.js
import api from '@api/axios'

export const staffAuthService = {
  /**
   * POST /api/staff/login
   * { username, password } → { token, user: { _id, name, username, role, cafeId } }
   */
  login: async ({ username, password }) => {
    const { data } = await api.post('/staff/login', { username, password })
    // Backend wraps via sendSuccess → { success, data: { token, user } }
    return data.data ?? data
  },
}