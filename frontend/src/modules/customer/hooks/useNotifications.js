// src/modules/customer/hooks/useNotifications.js
import { useEffect }   from 'react'
import { useDispatch } from 'react-redux'
import { addNotification } from '@store/slices/notificationSlice'
import { updateOrderStatus } from '@store/slices/orderSlice'
import { setCallStatus }     from '@store/slices/callWaiterSlice'
import socketService          from '@shared/services/socket.service'
import { playSound }          from '@shared/utils/soundPlayer'
import { useSelector }        from 'react-redux'
import { selectRole }         from '@store/slices/authSlice'

export const useNotifications = () => {
  const dispatch = useDispatch()
  const role     = useSelector(selectRole)

  useEffect(() => {
    const handlers = [
      // Waiter call updates
      socketService.on('waiter:acknowledged', ({ notification }) => {
        dispatch(setCallStatus('acknowledged'))
        dispatch(addNotification({ ...notification, type: 'waiter' }))
        playSound('waiterComing', role)
      }),

      socketService.on('waiter:on_the_way', ({ notification }) => {
        dispatch(setCallStatus('on_the_way'))
        dispatch(addNotification({ ...notification, type: 'waiter' }))
        playSound('waiterComing', role)
      }),

      socketService.on('waiter:call-done', () => {
        dispatch(setCallStatus('done'))
        dispatch(addNotification({
          message:   'Waiter request resolved ✓',
          type:      'waiter',
          timestamp: new Date().toISOString(),
        }))
      }),

      // Order status updates
      socketService.on('order:preparing', ({ orderId, notification }) => {
        dispatch(updateOrderStatus({ orderId, status: 'preparing' }))
        dispatch(addNotification({ ...notification, type: 'order' }))
        playSound('orderPreparing', role)
      }),

      socketService.on('order:on_the_way', ({ orderId, notification }) => {
        dispatch(updateOrderStatus({ orderId, status: 'on_the_way' }))
        dispatch(addNotification({ ...notification, type: 'order' }))
        playSound('orderOnTheWay', role)
      }),

      socketService.on('order:delivered', ({ orderId, notification }) => {
        dispatch(updateOrderStatus({ orderId, status: 'delivered' }))
        dispatch(addNotification({ ...notification, type: 'order' }))
        playSound('orderDelivered', role)
      }),
    ]

    return () => handlers.forEach((fn) => fn())
  }, [dispatch, role])
}