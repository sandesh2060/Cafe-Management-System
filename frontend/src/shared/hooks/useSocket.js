// src/shared/hooks/useSocket.js
import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import socketService from '@shared/services/socket.service'
import { selectToken, selectRole } from '@store/slices/authSlice'
import { ROLE_SOUND_MAP } from '@sounds'
import { playSound } from '@shared/utils/soundPlayer'
import { useDispatch } from 'react-redux'
import { addNotification } from '@store/slices/notificationSlice'
import { receiveMessage } from '@store/slices/messagingSlice'

export const useSocket = () => {
  const token    = useSelector(selectToken)
  const role     = useSelector(selectRole)
  const dispatch = useDispatch()
  const connected = useRef(false)

  useEffect(() => {
    if (!token || connected.current) return

    const socket = socketService.connect(token)
    connected.current = true

    // Role-aware notification handler
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

    return () => {
      unsubs.forEach((fn) => fn())
      unsubMsg()
      connected.current = false
    }
  }, [token, role, dispatch])

  return socketService
}

export default useSocket