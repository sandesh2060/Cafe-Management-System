// frontend/src/shared/services/notification.service.js
//
// REST client for the notification API.
// Persistent notifications (order, loyalty) are stored in MongoDB.
// Temp notifications (weather, welcome) are toast-only — not saved.
//
// Usage:
//   import notificationService from '@shared/services/notification.service'
//   const { items, unread } = await notificationService.getAll()
//   await notificationService.markRead(id)
//   await notificationService.markAllRead()
//   await notificationService.clearAll()

import api       from '@/api/axios'
import { ENDPOINTS } from '@/api/endpoints'

const notificationService = {
  // GET /notifications — returns { items, total, unread }
  getAll: async ({ limit = 30, skip = 0 } = {}) => {
    const res = await api.get(ENDPOINTS.NOTIFICATIONS.LIST, { params: { limit, skip } })
    // axios.js interceptor returns response.data directly, so res IS the payload
    return res?.data ?? res ?? { items: [], total: 0, unread: 0 }
  },

  // PATCH /notifications/read-all
  markAllRead: async () => {
    await api.patch(ENDPOINTS.NOTIFICATIONS.READ_ALL)
  },

  // PATCH /notifications/:id/read
  markRead: async (id) => {
    await api.patch(ENDPOINTS.NOTIFICATIONS.READ_ONE(id))
  },

  // DELETE /notifications — clear all for current user
  clearAll: async () => {
    await api.delete(ENDPOINTS.NOTIFICATIONS.CLEAR)
  },
}

export default notificationService