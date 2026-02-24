// src/modules/kitchen/pages/KitchenDisplayPage.jsx
import { useState, useEffect, useCallback } from 'react'
import api                                   from '@api/axios'
import socketService                          from '@shared/services/socket.service'
import { playSound }                          from '@shared/utils/soundPlayer'
import { useSelector }                        from 'react-redux'
import { selectRole }                         from '@store/slices/authSlice'
import KdsOrderCard                           from '../components/kds/KdsOrderCard'
import KitchenChatSidebar                     from '../components/chat/KitchenChatSidebar'
import InventoryAlerts                        from '../components/inventory/InventoryAlerts'
import { COLORS }                             from '@colors'
import { ChefHat, Bell }                      from 'lucide-react'

const CAFE_ID = import.meta.env.VITE_CAFE_ID

const KitchenDisplayPage = () => {
  const role    = useSelector(selectRole)
  const [orders, setOrders]  = useState([])
  const [alerts, setAlerts]  = useState(false)

  const refresh = useCallback(async () => {
    try {
      const data = await api.get(`/orders/kds?cafeId=${CAFE_ID}`)
      setOrders(data.orders || [])
    } catch {}
  }, [])

  useEffect(() => {
    refresh()
    const unsubs = [
      socketService.on('order:new', (data) => {
        playSound('newOrderBell', role)
        setOrders((prev) => [data.order || data, ...prev])
      }),
      socketService.on('order:status-changed', refresh),
    ]
    return () => unsubs.forEach((fn) => fn())
  }, [refresh, role])

  const startOrder  = (orderId) => socketService.emit('kitchen:order-start', { orderId })
  const readyOrder  = (orderId) => socketService.emit('kitchen:order-ready', { orderId })

  const pending   = orders.filter((o) => o.status === 'pending')
  const preparing = orders.filter((o) => o.status === 'preparing')

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Main KDS area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* KDS Header */}
        <header className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <ChefHat size={24} color={COLORS.saffron.DEFAULT} />
            <h1 className="text-xl font-bold">Kitchen Display</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-400">
              <span className="text-yellow-400 font-bold">{pending.length}</span> pending
            </span>
            <span className="text-gray-400">
              <span className="text-orange-400 font-bold">{preparing.length}</span> preparing
            </span>
            <button onClick={() => setAlerts(!alerts)}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white">
              <Bell size={16} />
            </button>
          </div>
        </header>

        {alerts && <InventoryAlerts onClose={() => setAlerts(false)} />}

        {/* KDS Grid */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 auto-rows-min">
            {/* Pending orders */}
            {pending.map((order) => (
              <KdsOrderCard
                key={order._id}
                order={order}
                onStart={() => startOrder(order._id)}
                color="yellow"
              />
            ))}

            {/* Preparing orders */}
            {preparing.map((order) => (
              <KdsOrderCard
                key={order._id}
                order={order}
                onReady={() => readyOrder(order._id)}
                color="orange"
              />
            ))}

            {pending.length === 0 && preparing.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
                <ChefHat size={48} className="text-gray-700" />
                <p className="text-gray-500 text-lg">All caught up! Waiting for orders…</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat sidebar */}
      <KitchenChatSidebar />
    </div>
  )
}

export default KitchenDisplayPage