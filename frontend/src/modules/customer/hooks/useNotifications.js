// frontend/src/modules/customer/hooks/useNotifications.js
//
// CHANGES:
// ✅ Listens to socket 'notification:new' → dispatches showToast
// ✅ Listens to socket 'notification:new' → saves to notificationSlice (for bell icon)
// ✅ Fetches initial notifications from DB on mount
// ✅ Maps backend notification to toast shape (type, title, message, priority, navigate)
// ✅ Order/loyalty notifications get correct priority via toastSlice.PRIORITY
// ✅ Works with existing socket.service.js

import { useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import socketService      from '@shared/services/socket.service'
import notificationService from '@shared/services/notification.service'
import { showToast }      from '@store/slices/toastSlice'
import {
  setNotifications,
  addNotification,
  setUnreadCount,
} from '@store/slices/notificationSlice'
import { selectIsLoggedIn, selectToken } from '@store/slices/authSlice'

// ── Navigate path from notification type + data ───────────────────────────────
const getNavigatePath = (type, data) => {
  switch (type) {
    case 'order':
    case 'kitchen':   return data?.orderId ? `/order/status` : '/menu'
    case 'payment':   return '/payment'
    case 'loyalty':   return '/loyalty'
    case 'message':   return '/messages'
    default:          return null
  }
}

// ── Priority from type ────────────────────────────────────────────────────────
const getPriority = (type, important) => {
  if (important) return 2     // high
  switch (type) {
    case 'payment': return 1  // critical
    case 'waiter':  return 1  // critical
    case 'order':   return 2  // high
    case 'kitchen': return 2  // high
    case 'loyalty': return 3  // medium
    default:        return 4  // low
  }
}

export function useNotifications() {
  const dispatch   = useDispatch()
  const isLoggedIn = useSelector(selectIsLoggedIn)
  const token      = useSelector(selectToken)

  // ── Fetch initial notifications from DB on mount ──────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return
    notificationService.getAll({ limit: 30 })
      .then(({ items, unread }) => {
        dispatch(setNotifications(items ?? []))
        dispatch(setUnreadCount(unread ?? 0))
      })
      .catch(err => console.warn('[useNotifications] fetch failed:', err.message))
  }, [isLoggedIn, dispatch])

  // ── Socket: notification:new → toast + notification list ─────────────────
  useEffect(() => {
    if (!isLoggedIn) return

    const handleNew = (notif) => {
      // Add to notification bell list
      dispatch(addNotification(notif))

      // Show as toast
      dispatch(showToast({
        id:       notif.id ?? notif._id,
        type:     notif.type,
        title:    notif.title,
        message:  notif.message,
        priority: getPriority(notif.type, notif.important),
        navigate: getNavigatePath(notif.type, notif.data),
        duration: notif.important ? 6000 : 5000,
        actions:  notif.type === 'order' || notif.type === 'payment'
          ? [{ key: 'view', label: 'View Order', primary: true }]
          : notif.type === 'loyalty'
          ? [{ key: 'view', label: 'See Rewards', primary: true }]
          : null,
      }))
    }

    const unsub = socketService.on('notification:new', handleNew)
    return () => unsub()
  }, [isLoggedIn, dispatch])
}

export default useNotifications