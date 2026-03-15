// src/shared/hooks/useSocket.js
//
// FIXES:
//   • Removed duplicate notification dispatch — notification:new and soundEvents
//     loop were both dispatching addNotification for the same event
//   • Added order:updated listener → dispatches socketOrderUpdated
//   • Cleaned up all unsubs in return correctly

import { useEffect, useRef }        from 'react'
import { useSelector, useDispatch } from 'react-redux'
import socketService                from '@shared/services/socket.service'
import { selectToken, selectRole }  from '@store/slices/authSlice'
import { ROLE_SOUND_MAP }           from '@sounds'
import { playSound }                from '@shared/utils/soundPlayer'
import { addNotification }          from '@store/slices/notificationSlice'
import { receiveMessage }           from '@store/slices/messagingSlice'
import { playNotificationSound }    from '@shared/hooks/useNotificationSound'
import {
  socketStatusUpdate,
  socketOrderCancelled,
  socketOrderUpdated,
}                                   from '@store/slices/orderSlice'

export const useSocket = () => {
  const token    = useSelector(selectToken)
  const role     = useSelector(selectRole)
  const dispatch = useDispatch()
  const prevToken = useRef(null)

  useEffect(() => {
    if (!token) {
      if (socketService.isConnected) socketService.disconnect()
      prevToken.current = null
      return
    }

    const socket = socketService.connect(token)
    if (!socket) return
    prevToken.current = token

    // ── notification:new ─────────────────────────────────────────────────────
    // Single handler — no role sound map overlap.
    // ROLE_SOUND_MAP must NOT contain 'notification:new' to avoid double-fire.
    const unsubNotif = socketService.on('notification:new', (data) => {
      if (data?.notification) {
        dispatch(addNotification({
          ...data.notification,
          id: data.notification.id || Date.now().toString(),
        }))
        playNotificationSound(data.notification.type || 'system')
      }
    })

    // ── Role-specific sound events (NO notification dispatch here) ────────────
    // These events play sounds only. If any of them also carry a notification
    // payload, the backend must emit notification:new separately.
    const soundEvents = Object.keys(ROLE_SOUND_MAP[role] || {})
    const unsubSounds = soundEvents.map((event) =>
      socketService.on(event, () => {
        const soundKey = ROLE_SOUND_MAP[role]?.[event]
        if (soundKey) playSound(soundKey, role)
      })
    )

    // ── Messages ──────────────────────────────────────────────────────────────
    const unsubMsg = socketService.on('message:received', (msg) => {
      dispatch(receiveMessage(msg))
      playSound('newMessage', role)
      playNotificationSound('message')
    })

    // ── Order: status update ──────────────────────────────────────────────────
    const unsubOrderStatus = socketService.on('order:status_update', (data) => {
      dispatch(socketStatusUpdate({
        orderId: data.orderId ?? data.order?._id,
        status:  data.status  ?? data.order?.status,
        order:   data.order   ?? null,
      }))
      playNotificationSound('order')
    })

    // ── Order: cancelled ──────────────────────────────────────────────────────
    const unsubOrderCancelled = socketService.on('order:cancelled', (data) => {
      dispatch(socketOrderCancelled({ order: data.order }))
      playNotificationSound('system')
    })

    // ── Order: updated (merge/add-on from same session) ───────────────────────
    // Was MISSING — this is emitted by backend when placeOrder merges items.
    const unsubOrderUpdated = socketService.on('order:updated', (data) => {
      if (data?.order) {
        dispatch(socketOrderUpdated({ order: data.order }))
      }
    })

    // ── Order: placed confirmation echo ───────────────────────────────────────
    const unsubOrderPlaced = socketService.on('order:placed', () => {
      playNotificationSound('order')
    })

    // ── Auth error ────────────────────────────────────────────────────────────
    const onAuthError = () => console.warn('[useSocket] auth error — token rejected')
    window.addEventListener('socket:auth-error', onAuthError)

    return () => {
      unsubNotif()
      unsubSounds.forEach((fn) => fn())
      unsubMsg()
      unsubOrderStatus()
      unsubOrderCancelled()
      unsubOrderUpdated()
      unsubOrderPlaced()
      window.removeEventListener('socket:auth-error', onAuthError)
    }
  }, [token, role, dispatch])

  return socketService
}

export default useSocket