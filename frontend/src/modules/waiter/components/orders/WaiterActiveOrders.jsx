// src/modules/waiter/components/orders/WaiterActiveOrders.jsx
import { useWaiterOrders } from '../../hooks/useWaiterOrders'
import { COLORS }          from '@colors'
import { CheckCircle, RefreshCw, Clock } from 'lucide-react'

const STATUS_COLOR = {
  pending:    COLORS.orderStatus.pending,
  preparing:  COLORS.orderStatus.preparing,
  on_the_way: COLORS.orderStatus.on_the_way,
  delivered:  COLORS.orderStatus.delivered,
}

const WaiterActiveOrders = () => {
  const { orders, loading, refresh, markDelivered } = useWaiterOrders()

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="font-bold text-brew text-base">Active Orders ({orders.length})</h2>
        <button onClick={refresh} className="w-8 h-8 rounded-full bg-cream-dark flex items-center justify-center">
          <RefreshCw size={14} color={COLORS.brew.soft} />
        </button>
      </div>

      {loading ? (
        <div className="p-4 space-y-3">
          {[1,2].map((i) => <div key={i} className="h-20 bg-cream-deep rounded-xl animate-pulse" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="py-10 text-center text-brew-soft text-sm">No active orders 🎉</div>
      ) : (
        <div className="divide-y divide-gray-50 max-h-[60vh] overflow-auto">
          {orders.map((order) => (
            <div key={order._id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-brew text-sm">T-{order.tableNumber || '?'}</span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white capitalize"
                    style={{ backgroundColor: STATUS_COLOR[order.status] }}
                  >
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-brew-soft">
                  <Clock size={12} />
                  {new Date(order.placedAt || order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div className="text-sm text-brew-soft">
                {order.items?.map((i) => `${i.emoji} ${i.name} ×${i.quantity}`).join(' · ')}
              </div>

              {order.status === 'on_the_way' && (
                <button
                  onClick={() => markDelivered(order._id)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl
                             bg-matcha text-white text-sm font-semibold active:scale-95 transition-transform"
                >
                  <CheckCircle size={16} />
                  Mark Delivered
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default WaiterActiveOrders