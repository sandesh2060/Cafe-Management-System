// src/modules/cashier/components/billing/BillingPanel.jsx
import { useState, useEffect, useCallback } from 'react'
import api           from '@api/axios'
import socketService from '@shared/services/socket.service'
import { COLORS }    from '@colors'
import { CreditCard, Banknote, Smartphone, CheckCircle } from 'lucide-react'
import toast         from 'react-hot-toast'

const PAYMENT_METHODS = [
  { key: 'cash',  label: 'Cash',  Icon: Banknote   },
  { key: 'card',  label: 'Card',  Icon: CreditCard  },
  { key: 'upi',   label: 'UPI',   Icon: Smartphone  },
]

const BillingPanel = () => {
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [method,   setMethod]   = useState('cash')
  const [confirming, setConfirming] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/billing/pending')
      setOrders(data.orders || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    const unsub = socketService.on('order:delivered', refresh)
    return () => unsub()
  }, [refresh])

  const confirmPayment = async () => {
    if (!selected) return
    setConfirming(true)
    try {
      await api.post(`/billing/${selected._id}/confirm`, { paymentMethod: method })
      toast.success(`Payment confirmed! ₹${selected.total}`)
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
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-brew">Pending Bills ({orders.length})</h2>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2].map((i) => <div key={i} className="h-16 bg-cream-deep rounded-xl animate-pulse" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-10 text-center text-brew-soft text-sm">No pending bills</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {orders.map((order) => (
              <button
                key={order._id}
                onClick={() => setSelected(order)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                  ${selected?._id === order._id ? 'bg-saffron/5 border-l-2 border-saffron' : 'hover:bg-gray-50'}`}
              >
                <div className="flex-1">
                  <p className="font-bold text-brew text-sm">Table #{order.tableNumber || '?'}</p>
                  <p className="text-xs text-brew-soft">
                    {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <p className="font-bold text-brew">₹{order.total}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Payment form */}
      {selected && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
          <h3 className="font-bold text-brew">Confirm Payment</h3>

          {/* Order summary */}
          <div className="space-y-1.5">
            {selected.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-brew-soft">{item.emoji} {item.name} ×{item.quantity}</span>
                <span className="text-brew font-medium">₹{item.price * item.quantity}</span>
              </div>
            ))}
            {selected.discountAmt > 0 && (
              <div className="flex justify-between text-sm text-matcha font-medium">
                <span>Loyalty discount</span><span>−₹{selected.discountAmt}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-brew text-lg pt-1 border-t border-gray-100">
              <span>Total</span><span>₹{selected.total}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setMethod(key)}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all"
                style={method === key
                  ? { borderColor: COLORS.saffron.DEFAULT, backgroundColor: COLORS.saffron.DEFAULT + '10' }
                  : { borderColor: '#e5e7eb' }
                }
              >
                <Icon size={20} color={method === key ? COLORS.saffron.DEFAULT : COLORS.brew.soft} />
                <span className="text-xs font-semibold" style={{ color: method === key ? COLORS.saffron.DEFAULT : COLORS.brew.soft }}>{label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={confirmPayment}
            disabled={confirming}
            className="btn-brand w-full py-4 text-base min-h-[52px]"
          >
            {confirming ? '…' : <><CheckCircle size={18} /> Confirm ₹{selected.total}</>}
          </button>
        </div>
      )}
    </div>
  )
}

export default BillingPanel