// src/modules/customer/hooks/useActiveOrder.js
import { useEffect }         from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchActiveOrder, selectActiveOrder, selectOrderStatus,
         updateOrderStatus } from '@store/slices/orderSlice'
import socketService          from '@shared/services/socket.service'

export const useActiveOrder = () => {
  const dispatch    = useDispatch()
  const activeOrder = useSelector(selectActiveOrder)
  const status      = useSelector(selectOrderStatus)

  useEffect(() => {
    dispatch(fetchActiveOrder())
  }, [dispatch])

  // Real-time status updates
  useEffect(() => {
    if (!activeOrder?._id) return

    const events = ['order:preparing', 'order:on_the_way', 'order:delivered', 'order:cancelled']
    const unsubs = events.map((event) =>
      socketService.on(event, ({ orderId, status: s }) => {
        if (orderId === activeOrder._id) {
          dispatch(updateOrderStatus({ orderId, status: s }))
        }
      })
    )

    return () => unsubs.forEach((fn) => fn())
  }, [activeOrder?._id, dispatch])

  return { activeOrder, status }
}