// src/modules/cashier/components/billing/BillingPanel.jsx
import { useState, useEffect, useCallback, useContext, useRef } from 'react'
import api           from '@api/axios'
import socketService from '@shared/services/socket.service'
import { ThemeContext } from '@shared/context/ThemeContext'
import { COLORS }    from '@colors'
import gsap          from 'gsap'
import { CreditCard, Banknote, Smartphone, CheckCircle, Receipt } from 'lucide-react'
import toast         from 'react-hot-toast'

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash', Icon: Banknote,    color: '#22C55E' },
  { key: 'card', label: 'Card', Icon: CreditCard,  color: '#3B82F6' },
  { key: 'upi',  label: 'UPI',  Icon: Smartphone,  color: '#8B5CF6' },
]

const BillingPanel = () => {
  const { isDark: dk } = useContext(ThemeContext)
  const [orders,     setOrders]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [selected,   setSelected]   = useState(null)
  const [method,     setMethod]     = useState('cash')
  const [confirming, setConfirming] = useState(false)
  const formRef = useRef(null)

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/billing/pending')
      setOrders(data.orders || data.data?.orders || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    const unsub = socketService.on('order:delivered', refresh)
    return () => unsub()
  }, [refresh])

  const selectOrder = (order) => {
    setSelected(order)
    if (formRef.current)
      gsap.fromTo(formRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out' })
  }

  const confirmPayment = async () => {
    if (!selected || confirming) return
    setConfirming(true)
    try {
      await api.post(`/billing/${selected._id}/confirm`, { paymentMethod: method })
      toast.success(`₹${selected.total} confirmed via ${method.toUpperCase()}!`, { icon: '✅' })
      setSelected(null)
      refresh()
    } catch {
      toast.error('Failed to confirm payment')
    }
    setConfirming(false)
  }

  return (
    <div className="space-y-4">

      {/* Pending bills */}
      <div className={`rounded-2xl border overflow-hidden
        ${dk ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className={`px-4 py-3 border-b flex items-center gap-2
          ${dk ? 'border-gray-800' : 'border-gray-100'}`}>
          <Receipt size={17} className={dk ? 'text-emerald-400' : 'text-emerald-600'} />
          <h2 className={`font-bold text-base flex-1 ${dk ? 'text-white' : 'text-gray-900'}`}>
            Pending Bills
          </h2>
          {orders.length > 0 && (
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold
                             flex items-center justify-center">
              {orders.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2].map(i => (
              <div key={i} className={`h-16 rounded-xl animate-pulse ${dk ? 'bg-gray-800' : 'bg-gray-100'}`} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-10 text-center">
            <p className={`text-sm ${dk ? 'text-gray-600' : 'text-gray-400'}`}>No pending bills 🎉</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: dk ? 'rgba(255,255,255,0.05)' : '#f9fafb' }}>
            {orders.map(order => (
              <button
                key={order._id}
                onClick={() => selectOrder(order)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all
                  ${selected?._id === order._id
                    ? dk ? 'bg-emerald-500/10 border-l-2 border-emerald-500' : 'bg-emerald-50 border-l-2 border-emerald-500'
                    : dk ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                  }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0
                  ${selected?._id === order._id
                    ? 'bg-emerald-500 text-white'
                    : dk ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                  T{order.tableNumber || '?'}
                </div>
                <div className="flex-1">
                  <p className={`font-bold text-sm ${dk ? 'text-white' : 'text-gray-900'}`}>
                    Table #{order.tableNumber || '?'}
                  </p>
                  <p className={`text-xs ${dk ? 'text-gray-500' : 'text-gray-400'}`}>
                    {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <p className={`font-bold text-lg ${dk ? 'text-white' : 'text-gray-900'}`}>
                  ₹{order.total}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Payment form */}
      {selected && (
        <div ref={formRef} className={`rounded-2xl border p-4 space-y-4
          ${dk ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>

          <h3 className={`font-bold text-base ${dk ? 'text-white' : 'text-gray-900'}`}>
            Confirm Payment — Table #{selected.tableNumber}
          </h3>

          {/* Order summary */}
          <div className={`rounded-xl p-3 space-y-2 ${dk ? 'bg-gray-800/60' : 'bg-gray-50'}`}>
            {selected.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className={dk ? 'text-gray-400' : 'text-gray-500'}>
                  {item.emoji} {item.name} ×{item.quantity}
                </span>
                <span className={`font-medium ${dk ? 'text-white' : 'text-gray-900'}`}>
                  ₹{item.price * item.quantity}
                </span>
              </div>
            ))}
            {selected.discountAmt > 0 && (
              <div className="flex justify-between text-sm font-bold text-emerald-500">
                <span>Loyalty discount</span>
                <span>−₹{selected.discountAmt}</span>
              </div>
            )}
            <div className={`flex justify-between font-black text-xl pt-2 border-t
              ${dk ? 'border-gray-700 text-white' : 'border-gray-200 text-gray-900'}`}>
              <span>Total</span>
              <span>₹{selected.total}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="grid grid-cols-3 gap-2.5">
            {PAYMENT_METHODS.map(({ key, label, Icon, color }) => {
              const active = method === key
              return (
                <button
                  key={key}
                  onClick={() => setMethod(key)}
                  className="flex flex-col items-center gap-2 py-3.5 rounded-xl border-2 transition-all active:scale-95"
                  style={active
                    ? { borderColor: color, background: `${color}15` }
                    : { borderColor: dk ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }
                  }
                >
                  <Icon size={20} color={active ? color : dk ? '#6B7280' : '#9CA3AF'} />
                  <span className="text-xs font-bold"
                        style={{ color: active ? color : dk ? '#6B7280' : '#9CA3AF' }}>
                    {label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Confirm button */}
          <button
            onClick={confirmPayment}
            disabled={confirming}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl
                       bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold text-base
                       active:scale-98 transition-transform shadow-md disabled:opacity-60"
          >
            {confirming
              ? <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : <CheckCircle size={18} />
            }
            {confirming ? 'Processing…' : `Confirm ₹${selected.total}`}
          </button>
        </div>
      )}
    </div>
  )
}

export default BillingPanel