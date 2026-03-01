// src/modules/waiter/components/orders/WaiterActiveOrders.jsx
import { useContext, useEffect, useRef } from 'react'
import { useWaiterOrders }  from '../../hooks/useWaiterOrders'
import { ThemeContext }      from '@shared/context/ThemeContext'
import { COLORS }            from '@colors'
import gsap                  from 'gsap'
import { CheckCircle, RefreshCw, Clock, ShoppingBag } from 'lucide-react'

const STATUS_META = {
  pending:    { label: 'Pending',    color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  preparing:  { label: 'Preparing', color: '#F97316', bg: 'rgba(249,115,22,0.12)'  },
  on_the_way: { label: 'On Way',    color: '#3B82F6', bg: 'rgba(59,130,246,0.12)'  },
  delivered:  { label: 'Delivered', color: '#22C55E', bg: 'rgba(34,197,94,0.12)'   },
}

const OrderCard = ({ order, onDeliver, dk }) => {
  const cardRef = useRef(null)
  const meta = STATUS_META[order.status] || STATUS_META.pending

  useEffect(() => {
    if (cardRef.current)
      gsap.fromTo(cardRef.current,
        { opacity: 0, y: 12, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' }
      )
  }, [])

  return (
    <div ref={cardRef} className={`rounded-2xl border p-4 space-y-3 transition-colors
      ${dk ? 'bg-gray-800/60 border-gray-700/50' : 'bg-white border-gray-100 shadow-sm'}`}>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm
            ${dk ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
            T{order.tableNumber || '?'}
          </div>
          <div>
            <span className="text-xs font-mono text-gray-400">
              #{order._id?.slice(-5).toUpperCase()}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ color: meta.color, background: meta.bg }}>
                {meta.label}
              </span>
            </div>
          </div>
        </div>
        <div className={`flex items-center gap-1 text-xs ${dk ? 'text-gray-500' : 'text-gray-400'}`}>
          <Clock size={11} />
          {new Date(order.placedAt || order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div className={`text-xs leading-relaxed ${dk ? 'text-gray-400' : 'text-gray-500'}`}>
        {order.items?.map((i, idx) => (
          <span key={idx}>
            {idx > 0 && <span className="mx-1 opacity-40">·</span>}
            {i.emoji} {i.name} <span className="font-bold">×{i.quantity}</span>
          </span>
        ))}
      </div>

      {order.specialNote && (
        <p className={`text-xs px-2.5 py-1.5 rounded-lg ${dk ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>
          📌 {order.specialNote}
        </p>
      )}

      {order.status === 'on_the_way' && (
        <button
          onClick={() => onDeliver(order._id)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                     bg-gradient-to-r from-emerald-500 to-green-500 text-white text-sm font-bold
                     active:scale-95 transition-transform shadow-sm"
        >
          <CheckCircle size={15} />
          Mark Delivered
        </button>
      )}
    </div>
  )
}

const WaiterActiveOrders = () => {
  const { orders, loading, refresh, markDelivered } = useWaiterOrders()
  const { isDark: dk } = useContext(ThemeContext)

  return (
    <div className={`rounded-2xl border overflow-hidden flex flex-col
      ${dk ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>

      <div className={`flex items-center justify-between px-4 py-3 border-b flex-shrink-0
        ${dk ? 'border-gray-800' : 'border-gray-100'}`}>
        <div className="flex items-center gap-2">
          <ShoppingBag size={17} className={dk ? 'text-amber-400' : 'text-amber-500'} />
          <h2 className={`font-bold text-base ${dk ? 'text-white' : 'text-gray-900'}`}>
            Active Orders
          </h2>
          {orders.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold
                             flex items-center justify-center">
              {orders.length}
            </span>
          )}
        </div>
        <button onClick={refresh}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors
            ${dk ? 'bg-white/8 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}>
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2].map(i => (
              <div key={i} className={`h-24 rounded-xl animate-pulse ${dk ? 'bg-gray-800' : 'bg-gray-100'}`} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-2">
            <span className="text-3xl">🎉</span>
            <p className={`text-sm ${dk ? 'text-gray-500' : 'text-gray-400'}`}>All clear!</p>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {orders.map(order => (
              <OrderCard key={order._id} order={order} onDeliver={markDelivered} dk={dk} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default WaiterActiveOrders