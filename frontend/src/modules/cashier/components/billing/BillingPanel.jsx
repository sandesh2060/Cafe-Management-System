// src/modules/cashier/components/billing/BillingPanel.jsx
//
// UPGRADES vs previous version:
//   ✅ payment:requested socket → live popup queue at top of panel
//   ✅ Each request shows: table, method, amount, customer name + action buttons
//   ✅ "Confirm" button on popup calls /billing/:id/confirm directly
//   ✅ "Dismiss" removes from local queue (cashier can re-visit from main list)
//   ✅ Payment method updated: upi → esewa
//   ✅ Badge count exported via window event for CashierDashboard nav badge
//   ✅ Animated popup entrance with GSAP per-item
//   ✅ Sound ping on new payment request (uses existing notification sound)

import { useState, useEffect, useCallback, useContext, useRef } from 'react'
import api                   from '@api/axios'
import socketService         from '@shared/services/socket.service'
import { ThemeContext }      from '@shared/context/ThemeContext'
import { BRAND, FONTS, getPalette } from '@shared/config/brand'
import gsap                  from 'gsap'
import {
  CreditCard, Banknote, Smartphone,
  CheckCircle, Receipt, AlertCircle,
  Bell, X, Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'

// eSewa brand
const ESEWA_GREEN = '#60BB46'

const METHOD_META = {
  cash:  { label: 'Cash',  icon: Banknote,   color: 'var(--success)' },
  card:  { label: 'Card',  icon: CreditCard, color: 'var(--info)'    },
  esewa: { label: 'eSewa', icon: Smartphone, color: ESEWA_GREEN       },
}

const PAYMENT_METHODS = [
  { key: 'cash',  label: 'Cash',  Icon: Banknote,   color: 'var(--success)' },
  { key: 'card',  label: 'Card',  Icon: CreditCard, color: 'var(--info)'    },
  { key: 'esewa', label: 'eSewa', Icon: Smartphone, color: ESEWA_GREEN       },
]

// ── Single payment request popup card ────────────────────────────────────────
const RequestCard = ({ request, onConfirm, onDismiss, P, confirming }) => {
  const cardRef = useRef(null)
  const meta    = METHOD_META[request.paymentMethod] ?? METHOD_META.cash
  const Icon    = meta.icon

  useEffect(() => {
    if (!cardRef.current) return
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: -14, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: 'back.out(1.6)' }
    )
  }, [])

  return (
    <div
      ref={cardRef}
      style={{
        borderRadius: 14,
        background: `linear-gradient(135deg, ${meta.color}18 0%, transparent 60%)`,
        border: `1.5px solid ${meta.color}40`,
        padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 10,
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Dismiss */}
      <button
        onClick={() => onDismiss(request.orderId)}
        style={{
          position: 'absolute', top: 8, right: 8,
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--pill-bg)', border: '1px solid var(--divider)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--text-muted)',
        }}
      >
        <X size={11} strokeWidth={2.5} />
      </button>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: `${meta.color}20`,
          border: `1px solid ${meta.color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} color={meta.color} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0, fontSize: 13, fontWeight: 800,
            fontFamily: FONTS.heading ?? FONTS.body,
            color: 'var(--text-primary)', letterSpacing: '-0.01em',
          }}>
            {request.customerName ?? 'Customer'} · Table #{request.tableNumber ?? '?'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: meta.color,
              background: `${meta.color}15`, border: `1px solid ${meta.color}30`,
              padding: '1px 7px', borderRadius: 99,
            }}>
              {meta.label}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {request.items?.length ?? 0} items
            </span>
          </div>
        </div>
        <p style={{
          margin: 0, fontSize: 18, fontWeight: 900,
          fontFamily: FONTS.brand ?? FONTS.heading,
          color: 'var(--text-primary)', letterSpacing: '-0.03em', flexShrink: 0,
        }}>
          {BRAND.currency} {request.total}
        </p>
      </div>

      {/* Item mini list */}
      {request.items?.length > 0 && (
        <div style={{
          background: 'var(--pill-bg)', borderRadius: 8,
          padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {request.items.slice(0, 3).map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--text-muted)' }}>
                {item.emoji} {item.name} ×{item.quantity}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                {BRAND.currency} {item.price * item.quantity}
              </span>
            </div>
          ))}
          {request.items.length > 3 && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              +{request.items.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onDismiss(request.orderId)}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 10,
            border: '1px solid var(--card-border)',
            background: 'var(--pill-bg)', color: 'var(--text-muted)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: FONTS.body,
          }}
        >
          Later
        </button>
        <button
          onClick={() => onConfirm(request.orderId, request.paymentMethod)}
          disabled={confirming === request.orderId}
          style={{
            flex: 2, padding: '8px 12px', borderRadius: 10, border: 'none',
            background: request.paymentMethod === 'esewa'
              ? `linear-gradient(135deg, ${ESEWA_GREEN}, #3D9930)`
              : `linear-gradient(135deg, var(--success), #16A34A)`,
            color: '#fff', fontSize: 12, fontWeight: 700,
            cursor: confirming === request.orderId ? 'not-allowed' : 'pointer',
            fontFamily: FONTS.body,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            opacity: confirming === request.orderId ? 0.7 : 1,
          }}
        >
          {confirming === request.orderId
            ? <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'bp-spin 0.7s linear infinite' }} />
            : <><CheckCircle size={13} /> Confirm {BRAND.currency} {request.total}</>
          }
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
const BillingPanel = () => {
  const { isDark }  = useContext(ThemeContext)
  const P           = getPalette(isDark)

  const [orders,    setOrders]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [selected,  setSelected]  = useState(null)
  const [method,    setMethod]    = useState('cash')
  const [confirming,setConfirming]= useState(null)  // orderId string or null

  // Live payment request queue from socket
  const [requestQueue, setRequestQueue] = useState([])

  const queueRef  = useRef(requestQueue)
  const formRef   = useRef(null)
  const queueTopRef = useRef(null)

  useEffect(() => { queueRef.current = requestQueue }, [requestQueue])

  // Broadcast badge count to CashierDashboard
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('billing:queue-count', {
      detail: { count: requestQueue.length }
    }))
  }, [requestQueue.length])

  // ── Fetch pending bills ───────────────────────────────────────────────────
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
    const unsubDelivered = socketService.on('order:delivered', refresh)
    const unsubStatus    = socketService.on('order:status_update', (data) => {
      if (data.status === 'paid') {
        // Remove from request queue if confirmed from elsewhere
        setRequestQueue(q => q.filter(r => r.orderId?.toString() !== data.orderId?.toString()))
        refresh()
      }
    })
    return () => { unsubDelivered(); unsubStatus() }
  }, [refresh])

  // ── Listen for payment:requested from socket ──────────────────────────────
  useEffect(() => {
    const unsub = socketService.on('payment:requested', (data) => {
      // Dedup — don't push same orderId twice
      const alreadyQueued = queueRef.current.some(
        r => r.orderId?.toString() === data.orderId?.toString()
      )
      if (alreadyQueued) return

      setRequestQueue(q => [data, ...q])

      // Play notification sound
      try {
        const { playSound } = require('@shared/utils/soundPlayer')
        playSound('paymentRequest', 'cashier')
      } catch {}

      toast(`💳 Payment request from Table #${data.tableNumber ?? '?'}`, {
        icon: '🔔',
        duration: 5000,
        style: {
          background: P.cardBg,
          color: P.textPrimary,
          border: `1px solid ${P.cardBorder}`,
        },
      })

      // Scroll queue into view
      setTimeout(() => {
        queueTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    })
    return unsub
  }, [P.cardBg, P.cardBorder, P.textPrimary])

  // ── Confirm from popup ────────────────────────────────────────────────────
  const confirmFromQueue = useCallback(async (orderId, paymentMethod) => {
    setConfirming(orderId)
    try {
      await api.post(`/billing/${orderId}/confirm`, { paymentMethod })
      toast.success(`${BRAND.currency} confirmed via ${paymentMethod.toUpperCase()}!`, { icon: '✅' })
      setRequestQueue(q => q.filter(r => r.orderId?.toString() !== orderId?.toString()))
      refresh()
    } catch {
      toast.error('Failed to confirm payment')
    }
    setConfirming(null)
  }, [refresh])

  const dismissFromQueue = useCallback((orderId) => {
    setRequestQueue(q => q.filter(r => r.orderId?.toString() !== orderId?.toString()))
  }, [])

  // ── Select order from list ────────────────────────────────────────────────
  const selectOrder = (order) => {
    setSelected(order)
    if (formRef.current)
      gsap.fromTo(formRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out' }
      )
  }

  // ── Confirm from main form ────────────────────────────────────────────────
  const confirmPayment = async () => {
    if (!selected || confirming) return
    setConfirming(selected._id)
    try {
      await api.post(`/billing/${selected._id}/confirm`, { paymentMethod: method })
      toast.success(`${BRAND.currency} ${selected.total} confirmed via ${method.toUpperCase()}!`, { icon: '✅' })
      setSelected(null)
      refresh()
    } catch {
      toast.error('Failed to confirm payment')
    }
    setConfirming(null)
  }

  return (
    <div className="space-y-4">

      {/* ── Live payment request queue ───────────────────────────────────── */}
      {requestQueue.length > 0 && (
        <div
          ref={queueTopRef}
          style={{
            borderRadius: 18,
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--card-shadow)',
            overflow: 'hidden',
          }}
        >
          {/* Queue header */}
          <div style={{
            padding: '12px 14px 10px',
            borderBottom: '1px solid var(--divider)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(245,158,11,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'bp-bell 2s ease-in-out infinite',
            }}>
              <Bell size={14} color="#F59E0B" />
            </div>
            <h2 style={{
              margin: 0, fontSize: 13, fontWeight: 800, flex: 1,
              fontFamily: FONTS.heading ?? FONTS.body,
              color: 'var(--text-primary)',
            }}>
              Payment Requests
            </h2>
            <span style={{
              fontSize: 11, fontWeight: 700,
              background: '#F59E0B', color: '#fff',
              padding: '2px 9px', borderRadius: 99,
            }}>
              {requestQueue.length}
            </span>
          </div>

          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {requestQueue.map(req => (
              <RequestCard
                key={req.orderId}
                request={req}
                onConfirm={confirmFromQueue}
                onDismiss={dismissFromQueue}
                P={P}
                confirming={confirming}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Pending bills list ────────────────────────────────────────────── */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          background: 'var(--card-bg)',
          borderColor: 'var(--card-border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--divider)' }}>
          <Receipt size={17} style={{ color: 'var(--success)' }} />
          <h2 className="font-bold text-base flex-1" style={{ color: 'var(--text-primary)' }}>
            Pending Bills
          </h2>
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
          <div className="py-8 px-4 flex flex-col items-center gap-3 text-center">
            <AlertCircle size={28} style={{ color: 'var(--danger, #EF4444)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Could not load bills</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{error}</p>
            <button
              onClick={refresh}
              className="mt-1 px-4 py-1.5 rounded-lg text-xs font-bold border"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
            >
              Retry
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No pending bills</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>All tables are settled</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--divider)' }}>
            {orders.map(order => {
              const isActive  = selected?._id === order._id
              const hasRequest = requestQueue.some(r => r.orderId?.toString() === order._id?.toString())
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
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'  }}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                        Table #{order.tableNumber || '?'}
                      </p>
                      {/* Badge if customer has requested payment */}
                      {hasRequest && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: '#F59E0B',
                          background: 'rgba(245,158,11,0.15)',
                          border: '1px solid rgba(245,158,11,0.3)',
                          padding: '1px 6px', borderRadius: 99,
                        }}>
                          REQUESTED
                        </span>
                      )}
                    </div>
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

      {/* ── Payment confirm form ─────────────────────────────────────────── */}
      {selected && (
        <div
          ref={formRef}
          className="rounded-2xl border p-4 space-y-4"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow)' }}
        >
          <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
            Confirm Payment — Table #{selected.tableNumber}
          </h3>

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
            <div className="flex justify-between font-black text-xl pt-2 border-t"
              style={{ borderColor: 'var(--divider)', color: 'var(--text-primary)' }}>
              <span>Total</span>
              <span>{BRAND.currency} {selected.total}</span>
            </div>
          </div>

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

          <button
            onClick={confirmPayment}
            disabled={!!confirming}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-bold text-base active:scale-[0.98] transition-transform shadow-md disabled:opacity-60"
            style={{
              background: method === 'esewa'
                ? `linear-gradient(135deg, ${ESEWA_GREEN}, #3D9930)`
                : 'linear-gradient(135deg, var(--success), #16A34A)',
              color: 'var(--text-inverse)',
            }}
          >
            {confirming
              ? <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : <CheckCircle size={18} />
            }
            {confirming ? 'Processing…' : `Confirm ${BRAND.currency} ${selected.total}`}
          </button>
        </div>
      )}

      <style>{`
        @keyframes bp-spin { to { transform: rotate(360deg); } }
        @keyframes bp-bell {
          0%, 100% { transform: rotate(0deg); }
          20%       { transform: rotate(-12deg); }
          40%       { transform: rotate(12deg); }
          60%       { transform: rotate(-8deg); }
          80%       { transform: rotate(8deg); }
        }
      `}</style>
    </div>
  )
}

export default BillingPanel