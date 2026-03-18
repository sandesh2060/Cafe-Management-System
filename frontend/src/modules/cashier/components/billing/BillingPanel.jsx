// src/modules/cashier/components/billing/BillingPanel.jsx
//
// ✅ COLORS import removed
// ✅ dk ? 'bg-gray-900' Tailwind → var(--card-bg/pill-bg/header-bg)
// ✅ Hardcoded #22C55E, #3B82F6, #8B5CF6 → var(--success/info/accent)
// ✅ Hardcoded 'Rs' → BRAND.currency
// ✅ border/divider → var(--card-border/divider)
// ✅ text → var(--text-primary/muted/secondary)
// ✅ skeleton → .skeleton class from globals.css
// ✅ GSAP animation unchanged
// ✅ FIX: empty state now uses var(--text-secondary) — visible on cream bg
// ✅ FIX: catch block now sets error state so API failures are visible

import { useState, useEffect, useCallback, useContext, useRef } from 'react'
import api           from '@api/axios'
import socketService from '@shared/services/socket.service'
import { ThemeContext } from '@shared/context/ThemeContext'
import { BRAND }     from '@shared/config/brand'
import gsap          from 'gsap'
import { CreditCard, Banknote, Smartphone, CheckCircle, Receipt, AlertCircle } from 'lucide-react'
import toast         from 'react-hot-toast'

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash',  Icon: Banknote,    color: 'var(--success)' },
  { key: 'card', label: 'Card',  Icon: CreditCard,  color: 'var(--info)'    },
  { key: 'upi',  label: 'UPI',   Icon: Smartphone,  color: 'var(--accent)'  },
]

const BillingPanel = () => {
  const { isDark }  = useContext(ThemeContext)
  const [orders, setOrders]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [selected, setSelected]     = useState(null)
  const [method, setMethod]         = useState('cash')
  const [confirming, setConfirming] = useState(false)
  const formRef = useRef(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const data = await api.get('/billing/pending')
      setOrders(data.orders || data.data?.orders || [])
    } catch (err) {
      setError(err?.message || 'Could not load pending bills')
    }
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
      toast.success(`${BRAND.currency} ${selected.total} confirmed via ${method.toUpperCase()}!`, { icon: '✅' })
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
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow)' }}
      >
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--divider)' }}>
          <Receipt size={17} style={{ color: 'var(--success)' }} />
          <h2 className="font-bold text-base flex-1" style={{ color: 'var(--text-primary)' }}>Pending Bills</h2>
          {orders.length > 0 && (
            <span
              className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
              style={{ background: 'var(--success)', color: 'var(--text-inverse)' }}
            >
              {orders.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2].map(i => <div key={i} className="h-16 rounded-xl skeleton" />)}
          </div>
        ) : error ? (
          /* ── API error state ─────────────────────────────────────────── */
          <div className="py-8 px-4 flex flex-col items-center gap-3 text-center">
            <AlertCircle size={28} style={{ color: 'var(--danger, #EF4444)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Could not load bills
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary, var(--text-muted))' }}>
              {error}
            </p>
            <button
              onClick={refresh}
              className="mt-1 px-4 py-1.5 rounded-lg text-xs font-bold border transition-opacity hover:opacity-80"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
            >
              Retry
            </button>
          </div>
        ) : orders.length === 0 ? (
          /* ── Empty state — fixed contrast ───────────────────────────── */
          <div className="py-10 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              No pending bills
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary, var(--text-muted))' }}>
              All tables are settled
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--divider)' }}>
            {orders.map(order => {
              const isActive = selected?._id === order._id
              return (
                <button
                  key={order._id}
                  onClick={() => selectOrder(order)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
                  style={{
                    background:  isActive ? 'var(--success-bg)' : 'transparent',
                    borderLeft:  isActive ? '2px solid var(--success)' : '2px solid transparent',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--pill-bg)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={
                      isActive
                        ? { background: 'var(--success)', color: 'var(--text-inverse)' }
                        : { background: 'var(--success-bg)', color: 'var(--success)' }
                    }
                  >
                    T{order.tableNumber || '?'}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                      Table #{order.tableNumber || '?'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                    {BRAND.currency} {order.total}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Payment form */}
      {selected && (
        <div
          ref={formRef}
          className="rounded-2xl border p-4 space-y-4"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow)' }}
        >
          <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
            Confirm Payment — Table #{selected.tableNumber}
          </h3>

          {/* Order summary */}
          <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--pill-bg)' }}>
            {selected.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-muted)' }}>{item.emoji} {item.name} ×{item.quantity}</span>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {BRAND.currency} {item.price * item.quantity}
                </span>
              </div>
            ))}
            {selected.discountAmt > 0 && (
              <div className="flex justify-between text-sm font-bold" style={{ color: 'var(--success)' }}>
                <span>Loyalty discount</span>
                <span>−{BRAND.currency} {selected.discountAmt}</span>
              </div>
            )}
            <div
              className="flex justify-between font-black text-xl pt-2 border-t"
              style={{ borderColor: 'var(--divider)', color: 'var(--text-primary)' }}
            >
              <span>Total</span>
              <span>{BRAND.currency} {selected.total}</span>
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
                  style={
                    active
                      ? { borderColor: color, background: 'var(--success-bg)' }
                      : { borderColor: 'var(--card-border)' }
                  }
                >
                  <Icon size={20} color={active ? color : 'var(--text-muted)'} />
                  <span className="text-xs font-bold" style={{ color: active ? color : 'var(--text-muted)' }}>
                    {label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Confirm */}
          <button
            onClick={confirmPayment}
            disabled={confirming}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-bold text-base active:scale-[0.98] transition-transform shadow-md disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, var(--success), #16A34A)', color: 'var(--text-inverse)' }}
          >
            {confirming
              ? <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : <CheckCircle size={18} />}
            {confirming ? 'Processing…' : `Confirm ${BRAND.currency} ${selected.total}`}
          </button>
        </div>
      )}
    </div>
  )
}

export default BillingPanel