// src/shared/hooks/useSocket.js
import { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import socketService from '@shared/services/socket.service'
import { selectToken, selectRole } from '@store/slices/authSlice'
import { ROLE_SOUND_MAP } from '@sounds'
import { playSound } from '@shared/utils/soundPlayer'
import { addNotification } from '@store/slices/notificationSlice'
import { receiveMessage } from '@store/slices/messagingSlice'

export const useSocket = () => {
  const token    = useSelector(selectToken)
  const role     = useSelector(selectRole)
  const dispatch = useDispatch()

  useEffect(() => {
    // ── Don't connect until we actually have a valid token ──────
    if (!token) {
      // If there's a lingering socket from a previous session, kill it
      if (socketService.isConnected) {
        console.log('[useSocket] Token gone — disconnecting socket')
        socketService.disconnect()
      }
      return
    }

    // connect() internally handles "already connected with same token" case
    const socket = socketService.connect(token)
    if (!socket) return   // connect() returned null (bad token guard in service)

    // ── Role-aware notification handler ─────────────────────────
    const handleNotification = (event, data) => {
      const soundKey = ROLE_SOUND_MAP[role]?.[event]
      if (soundKey) playSound(soundKey, role)

      if (data?.notification) {
        dispatch(addNotification({ ...data.notification, id: Date.now().toString() }))
      }
    }

    // Bind all events relevant to this role
    const soundEvents = Object.keys(ROLE_SOUND_MAP[role] || {})
    const unsubs = soundEvents.map((event) =>
      socketService.on(event, (data) => handleNotification(event, data))
    )

    // Message handler
    const unsubMsg = socketService.on('message:received', (msg) => {
      dispatch(receiveMessage(msg))
      playSound('newMessage', role)
    })

    // ── Listen for auth errors dispatched by socket.service.js ──
    const onAuthError = () => {
      console.warn('[useSocket] socket:auth-error received — token likely expired')
      // You can dispatch a logout action here if needed:
      // dispatch(logout())
    }
    window.addEventListener('socket:auth-error', onAuthError)

    return () => {
      unsubs.forEach((fn) => fn())
      unsubMsg()
      window.removeEventListener('socket:auth-error', onAuthError)
      // Don't disconnect here — socket should persist across re-renders.
      // It only disconnects when token becomes null (handled above).
    }
  }, [token, role, dispatch])  // re-runs if token or role changes

  return socketService
}

export default useSocket