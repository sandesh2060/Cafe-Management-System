// src/modules/kitchen/pages/KitchenDisplayPage.jsx
import { useState, useEffect, useCallback, useContext } from 'react'
import api               from '@api/axios'
import socketService     from '@shared/services/socket.service'
import { playSound }     from '@shared/utils/soundPlayer'
import { useSelector }   from 'react-redux'
import { selectRole }    from '@store/slices/authSlice'
import { ThemeContext }  from '@shared/context/ThemeContext'
import KdsOrderCard      from '../components/kds/KdsOrderCard'
import KitchenChatSidebar from '../components/chat/KitchenChatSidebar'
import InventoryAlerts   from '../components/inventory/InventoryAlerts'
import { COLORS }        from '@colors'
import { ChefHat, Bell, Sun, Moon, AlertTriangle } from 'lucide-react'

const CAFE_ID = import.meta.env.VITE_CAFE_ID

const KitchenDisplayPage = () => {
  const role = useSelector(selectRole)
  const { isDark: dk, toggleTheme } = useContext(ThemeContext)
  const [orders, setOrders]   = useState([])
  const [alerts, setAlerts]   = useState(false)
  const [newIds, setNewIds]   = useState(new Set())

  const refresh = useCallback(async () => {
    try {
      const data = await api.get(`/orders/kds?cafeId=${CAFE_ID}`)
      setOrders(data.orders || data.data?.orders || [])
    } catch {}
  }, [])

  useEffect(() => {
    refresh()
    const unsubs = [
      socketService.on('order:new', (data) => {
        const order = data.order || data
        playSound('newOrderBell', role)
        setOrders(prev => [order, ...prev])
        setNewIds(prev => new Set([...prev, order._id]))
        setTimeout(() => setNewIds(prev => { const n = new Set(prev); n.delete(order._id); return n }), 2000)
      }),
      socketService.on('order:status-changed', refresh),
    ]
    return () => unsubs.forEach(fn => fn())
  }, [refresh, role])

  const startOrder = (orderId) => socketService.emit('kitchen:order-start', { orderId })
  const readyOrder = (orderId) => socketService.emit('kitchen:order-ready', { orderId })

  const pending   = orders.filter(o => o.status === 'pending')
  const preparing = orders.filter(o => o.status === 'preparing')

  return (
    <div className={`min-h-dvh flex flex-col transition-colors duration-300
      ${dk ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900'}`}>

      {/* ── Header ── */}
      <header className={`flex items-center justify-between px-4 md:px-6 py-3 border-b flex-shrink-0 sticky top-0 z-30
        ${dk ? 'bg-gray-900/95 border-gray-800 backdrop-blur-sm' : 'bg-white/95 border-gray-200 backdrop-blur-sm'}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-600 to-red-500
                          flex items-center justify-center shadow-md">
            <ChefHat size={18} className="text-white" />
          </div>
          <div>
            <h1 className={`font-bold text-base leading-tight ${dk ? 'text-white' : 'text-gray-900'}`}>
              Kitchen Display
            </h1>
            <p className={`text-[10px] ${dk ? 'text-gray-500' : 'text-gray-400'}`}>
              कौसी चिया
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Stats */}
          <div className="hidden sm:flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold
              ${dk ? 'bg-yellow-500/15 text-yellow-400' : 'bg-yellow-50 text-yellow-700'}`}>
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              {pending.length} pending
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold
              ${dk ? 'bg-orange-500/15 text-orange-400' : 'bg-orange-50 text-orange-700'}`}>
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              {preparing.length} cooking
            </div>
          </div>

          {/* Mobile stats */}
          <div className="sm:hidden flex items-center gap-1.5 text-sm font-bold"
               style={{ color: COLORS.saffron.DEFAULT }}>
            {pending.length + preparing.length} active
          </div>

          <button onClick={() => setAlerts(a => !a)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors relative
              ${dk ? 'bg-white/8 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}>
            <Bell size={17} />
            {alerts && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />}
          </button>

          <button onClick={toggleTheme}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors
              ${dk ? 'bg-white/8' : 'bg-gray-100'}`}>
            {dk ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-500" />}
          </button>
        </div>
      </header>

      {/* ── Inventory alerts ── */}
      {alerts && (
        <div className="px-4 pt-3">
          <InventoryAlerts onClose={() => setAlerts(false)} />
        </div>
      )}

      {/* ── Main: KDS + sidebar ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* KDS grid */}
        <div className="flex-1 overflow-auto p-3 md:p-4">
          {pending.length === 0 && preparing.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center
                ${dk ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
                <ChefHat size={36} className={dk ? 'text-gray-700' : 'text-gray-300'} />
              </div>
              <p className={`text-lg font-medium ${dk ? 'text-gray-600' : 'text-gray-400'}`}>
                All caught up! Waiting for orders…
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                    <h2 className={`text-xs font-bold uppercase tracking-widest
                      ${dk ? 'text-yellow-500' : 'text-yellow-700'}`}>
                      Pending — {pending.length}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {pending.map(order => (
                      <KdsOrderCard
                        key={order._id}
                        order={order}
                        onStart={() => startOrder(order._id)}
                        color="yellow"
                        isNew={newIds.has(order._id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {preparing.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                    <h2 className={`text-xs font-bold uppercase tracking-widest
                      ${dk ? 'text-orange-500' : 'text-orange-700'}`}>
                      Cooking — {preparing.length}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {preparing.map(order => (
                      <KdsOrderCard
                        key={order._id}
                        order={order}
                        onReady={() => readyOrder(order._id)}
                        color="orange"
                        isNew={false}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* Chat sidebar — desktop */}
        <KitchenChatSidebar />
      </div>
    </div>
  )
}

export default KitchenDisplayPage