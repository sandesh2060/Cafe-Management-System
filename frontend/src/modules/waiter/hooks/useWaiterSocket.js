// src/modules/waiter/hooks/useWaiterSocket.js
import { useEffect }   from 'react'
import { useDispatch } from 'react-redux'
import socketService   from '@shared/services/socket.service'
import { playSound }   from '@shared/utils/soundPlayer'
import { addNotification } from '@store/slices/notificationSlice'
import { useSelector } from 'react-redux'
import { selectRole }  from '@store/slices/authSlice'

export const useWaiterSocket = () => {
  const dispatch = useDispatch()
  const role     = useSelector(selectRole)

  useEffect(() => {
    const unsubs = [
      // New order placed — waiter notified
      socketService.on('order:new', ({ orderId, tableId, notification }) => {
        playSound('newOrder', role)
        dispatch(addNotification({ ...notification, type: 'order', id: orderId }))
      }),

      // New waiter call from customer
      socketService.on('waiter:call-incoming', ({ callId, tableId, reasons, note, notification }) => {
        playSound('newWaiterCall', role)
        dispatch(addNotification({ ...notification, type: 'waiter', id: callId }))
      }),

      // Kitchen ready for pickup
      socketService.on('order:ready-pickup', ({ orderId, tableId, notification }) => {
        playSound('orderReadyPickup', role)
        dispatch(addNotification({ ...notification, type: 'order', id: orderId }))
      }),

      // Session customer left
      socketService.on('session:customer-left', ({ sessionId, tableId }) => {
        dispatch(addNotification({
          message: `Table guest left`, type: 'system',
          timestamp: new Date().toISOString(), id: sessionId,
        }))
      }),
    ]

    return () => unsubs.forEach((fn) => fn())
  }, [dispatch, role])
}