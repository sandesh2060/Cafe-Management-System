// src/modules/customer/pages/TrackingPage.jsx
import { useEffect }            from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchActiveOrder, selectActiveOrder, selectOrderStatus,
         updateOrderStatus }    from '@store/slices/orderSlice'
import BottomNav                from '@shared/components/layout/BottomNav'
import OrderTracker             from '../components/tracking/OrderTracker'
import OrderSummaryCard         from '../components/tracking/OrderSummaryCard'
import EstimatedTime            from '../components/tracking/EstimatedTime'
import CallStatusBanner         from '../components/callwaiter/CallStatusBanner'
import { openCallSheet }        from '@store/slices/callWaiterSlice'
import socketService             from '@shared/services/socket.service'
import { COLORS }               from '@colors'
import { Bell, RefreshCw }      from 'lucide-react'

const TrackingPage = () => {
  const dispatch     = useDispatch()
  const activeOrder  = useSelector(selectActiveOrder)
  const status       = useSelector(selectOrderStatus)

  useEffect(() => {
    dispatch(fetchActiveOrder())
  }, [dispatch])

  // Live status updates via socket
  useEffect(() => {
    if (!activeOrder?._id) return

    const statuses = ['order:preparing', 'order:on_the_way', 'order:delivered', 'order:cancelled']
    const unsubs   = statuses.map((event) =>
      socketService.on(event, ({ orderId, status: s }) => {
        if (orderId === activeOrder._id) {
          dispatch(updateOrderStatus({ orderId, status: s }))
        }
      })
    )
    return () => unsubs.forEach((fn) => fn())
  }, [activeOrder?._id, dispatch])

  if (!activeOrder) {
    return (
      <div className="customer-container min-h-screen bg-cream flex flex-col">
        <header className="px-4 pt-5 pb-3">
          <h1 className="text-2xl font-bold text-brew">Track Order</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4 pb-20">
          <div className="text-5xl">🍽️</div>
          <h2 className="text-xl font-bold text-brew">No Active Order</h2>
          <p className="text-brew-soft text-sm">Place an order from the menu to track it here.</p>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="customer-container min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="px-4 pt-5 pb-3 sticky top-0 z-20 bg-cream/95 backdrop-blur-md
                          border-b border-cream-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brew">Your Order</h1>
            <p className="text-xs text-brew-soft mt-0.5">
              Order #{activeOrder._id?.slice(-6).toUpperCase()}
            </p>
          </div>
          <button
            onClick={() => dispatch(fetchActiveOrder())}
            className="w-9 h-9 rounded-full bg-cream-dark flex items-center justify-center"
            aria-label="Refresh"
          >
            <RefreshCw size={16} color={COLORS.brew.soft} />
          </button>
        </div>
      </header>

      {/* Call status banner */}
      <CallStatusBanner />

      <div className="flex-1 overflow-auto px-4 pt-4 pb-bottom-nav space-y-4">
        {/* Estimated time */}
        <EstimatedTime status={status} placedAt={activeOrder.placedAt} />

        {/* Step tracker */}
        <OrderTracker status={status} order={activeOrder} />

        {/* Order summary */}
        <OrderSummaryCard order={activeOrder} />

        {/* Call waiter CTA */}
        {['pending', 'preparing', 'on_the_way'].includes(status) && (
          <button
            onClick={() => dispatch(openCallSheet())}
            className="w-full flex items-center justify-center gap-2 py-4
                       border-2 border-saffron text-saffron font-semibold rounded-2xl
                       active:scale-95 transition-all min-h-[56px]"
          >
            <Bell size={20} />
            Call Waiter
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

export default TrackingPage