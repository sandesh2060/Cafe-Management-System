// src/shared/hooks/useSocket.js
//
// FIXES:
// ✅ Added message:sent handler → dispatches messageSent (sender echo / multi-device)
// ✅ Added message:read-receipt handler → dispatches setReadReceipt (checkmarks)
// ✅ Removed addNotification from notification:new (was causing double bell entries)
// ✅ All other handlers preserved

import { useEffect, useRef }        from 'react'
import { useSelector, useDispatch } from 'react-redux'
import socketService                from '@shared/services/socket.service'
import { selectToken, selectRole }  from '@store/slices/authSlice'
import { ROLE_SOUND_MAP }           from '@sounds'
import { playSound }                from '@shared/utils/soundPlayer'
import {
  receiveMessage,
  messageSent,
  setReadReceipt,
}                                   from '@store/slices/messagingSlice'
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

    // ── notification:new — sound only (bell handled by useNotifications) ────
    const unsubNotif = socketService.on('notification:new', (data) => {
      const type = data?.notification?.type ?? data?.type ?? 'system'
      playNotificationSound(type)
    })

    // ── Role-specific sound events ────────────────────────────────────────────
    const soundEvents = Object.keys(ROLE_SOUND_MAP[role] || {})
    const unsubSounds = soundEvents.map((event) =>
      socketService.on(event, () => {
        const soundKey = ROLE_SOUND_MAP[role]?.[event]
        if (soundKey) playSound(soundKey, role)
      })
    )

    // ── message:received — incoming message from another user ─────────────────
    const unsubMsg = socketService.on('message:received', (msg) => {
      dispatch(receiveMessage(msg))
      playSound('newMessage', role)
      playNotificationSound('message')
    })

    // ── message:sent — echo back to sender (multi-device / multi-tab) ────────
    const unsubMsgSent = socketService.on('message:sent', (msg) => {
      dispatch(messageSent(msg))
    })

    // ── message:read-receipt — recipient read the message ─────────────────────
    const unsubReadReceipt = socketService.on('message:read-receipt', (data) => {
      dispatch(setReadReceipt(data))
    })

    // ── Order: status update ──────────────────────────────────────────────────
    const unsubOrderStatus = socketService.on('order:status_update', (data) => {
      dispatch(socketStatusUpdate({
        orderId: data.orderId ?? data.order?._id,
        status:  data.status  ?? data.order?.status,
        order:   data.order   ?? null,
      }))
    })

    // ── Order: cancelled ──────────────────────────────────────────────────────
    const unsubOrderCancelled = socketService.on('order:cancelled', (data) => {
      dispatch(socketOrderCancelled({ order: data.order }))
    })

    // ── Order: updated ────────────────────────────────────────────────────────
    const unsubOrderUpdated = socketService.on('order:updated', (data) => {
      if (data?.order) dispatch(socketOrderUpdated({ order: data.order }))
    })

    // ── Order: placed confirmation ────────────────────────────────────────────
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
      unsubMsgSent()
      unsubReadReceipt()
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