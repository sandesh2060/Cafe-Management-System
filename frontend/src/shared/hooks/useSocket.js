// src/shared/hooks/useSocket.js
import { useEffect, useRef }          from 'react'
import { useSelector, useDispatch }   from 'react-redux'
import socketService                  from '@shared/services/socket.service'
import { selectToken, selectRole }    from '@store/slices/authSlice'
import { ROLE_SOUND_MAP }             from '@sounds'
import { playSound }                  from '@shared/utils/soundPlayer'
import { addNotification }            from '@store/slices/notificationSlice'
import { receiveMessage }             from '@store/slices/messagingSlice'
import { playNotificationSound }      from '@shared/hooks/useNotificationSound'
import {
  socketStatusUpdate,
  socketOrderCancelled,
}                                     from '@store/slices/orderSlice'

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

    // ── Notification handler ─────────────────────────────────────────────────
    const handleNotification = (event, data) => {
      const soundKey = ROLE_SOUND_MAP[role]?.[event]
      if (soundKey) playSound(soundKey, role)
      if (data?.notification) {
        dispatch(addNotification({
          ...data.notification,
          id: data.notification.id || Date.now().toString(),
        }))
        playNotificationSound(data.notification.type || 'system')
      }
    }

    // notification:new
    const unsubNotif = socketService.on('notification:new', (data) => {
      if (data?.notification) {
        dispatch(addNotification({
          ...data.notification,
          id: data.notification.id || Date.now().toString(),
        }))
        playNotificationSound(data.notification.type || 'system')
      }
    })

    // Role sound events
    const soundEvents = Object.keys(ROLE_SOUND_MAP[role] || {})
    const unsubs = soundEvents.map((event) =>
      socketService.on(event, (data) => handleNotification(event, data))
    )

    // Messages
    const unsubMsg = socketService.on('message:received', (msg) => {
      dispatch(receiveMessage(msg))
      playSound('newMessage', role)
      playNotificationSound('message')
    })

    // ── Order events ─────────────────────────────────────────────────────────
    const unsubOrderStatus = socketService.on('order:status_update', (data) => {
      dispatch(socketStatusUpdate({
        orderId: data.orderId ?? data.order?._id,
        status:  data.status  ?? data.order?.status,
        order:   data.order   ?? null,
      }))
      playNotificationSound('order')
    })

    const unsubOrderCancelled = socketService.on('order:cancelled', (data) => {
      dispatch(socketOrderCancelled({ order: data.order }))
      playNotificationSound('system')
    })

    const unsubOrderPlaced = socketService.on('order:placed', (data) => {
      // Confirmation echo — already handled by placeOrder thunk, just play sound
      playNotificationSound('order')
    })

    // Auth error
    const onAuthError = () => console.warn('[useSocket] auth error')
    window.addEventListener('socket:auth-error', onAuthError)

    return () => {
      unsubNotif()
      unsubs.forEach(fn => fn())
      unsubMsg()
      unsubOrderStatus()
      unsubOrderCancelled()
      unsubOrderPlaced()
      window.removeEventListener('socket:auth-error', onAuthError)
    }
  }, [token, role, dispatch])

  return socketService
}

export default useSocket