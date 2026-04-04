// frontend/src/shared/services/notification.service.js
//
// FIX: getAll() now filters type === 'message' before returning
//      and recomputes unread count from the filtered list.
//      This prevents the badge showing server's raw unread count
//      (which includes message notifications) while the panel shows
//      a filtered (smaller) list — causing the "6 badge, 0 items" bug.

import api           from '@/api/axios'
import { ENDPOINTS } from '@/api/endpoints'

// Filter out chat message notifications — handled by chat UI, not bell
const filterNotifs = (items) =>
  (items ?? []).filter(n => n.type !== 'message')

const notificationService = {
  // GET /notifications — returns { items, total, unread }
  // items and unread are BOTH filtered (no message type)
  getAll: async ({ limit = 30, skip = 0 } = {}) => {
    const res = await api.get(ENDPOINTS.NOTIFICATIONS.LIST, { params: { limit, skip } })
    // axios interceptor returns response.data → res = { success, data: { items, unread } }
    const payload  = res?.data ?? res ?? {}
    const rawItems = payload?.items ?? payload?.notifications ?? []
    const filtered = filterNotifs(rawItems)
    return {
      items:  filtered,
      total:  filtered.length,
      // FIX: recompute unread from filtered list — not from server's count
      // which includes message notifications
      unread: filtered.filter(n => !n.read).length,
    }
  },

  markAllRead: async () => {
    await api.patch(ENDPOINTS.NOTIFICATIONS.READ_ALL)
  },

  markRead: async (id) => {
    await api.patch(ENDPOINTS.NOTIFICATIONS.READ_ONE(id))
  },

  clearAll: async () => {
    await api.delete(ENDPOINTS.NOTIFICATIONS.CLEAR)
  },
}

export default notificationService