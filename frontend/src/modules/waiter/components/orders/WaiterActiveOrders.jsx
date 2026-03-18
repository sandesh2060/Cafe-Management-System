// src/modules/waiter/components/orders/WaiterActiveOrders.jsx
//
// ✅ COLORS import removed — was imported but unused
// ✅ Tailwind gray dark conditionals → var(--card-bg), var(--card-border), var(--text-*)
// ✅ Hardcoded 'en-IN' locale → BRAND.locale
// ✅ STATUS_META colors are semantic order status colors — intentionally kept fixed
// ✅ GSAP card entrance unchanged

import { useContext, useEffect, useRef } from 'react'
import { useWaiterOrders }  from '../../hooks/useWaiterOrders'
import { ThemeContext }      from '@shared/context/ThemeContext'
import { BRAND }             from '@shared/config/brand'
import gsap                  from 'gsap'
import { CheckCircle, RefreshCw, Clock, ShoppingBag } from 'lucide-react'

// Semantic order status colors — fixed, not brand-themed
const STATUS_META = {
  pending:    { label: 'Pending',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  preparing:  { label: 'Preparing', color: '#F97316', bg: 'rgba(249,115,22,0.12)'  },
  on_the_way: { label: 'On Way',    color: '#3B82F6', bg: 'rgba(59,130,246,0.12)'  },
  delivered:  { label: 'Delivered', color: '#22C55E', bg: 'rgba(34,197,94,0.12)'   },
}

const OrderCard = ({ order, onDeliver }) => {
  const cardRef = useRef(null)
  const meta    = STATUS_META[order.status] || STATUS_META.pending

  useEffect(() => {
    if (cardRef.current)
      gsap.fromTo(cardRef.current,
        { opacity: 0, y: 12, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' }
      )
  }, [])

  return (
    <div ref={cardRef} style={{
      borderRadius: 16, padding: 16,
      // ✅ var(--card-bg/border/shadow) — was dk ? 'bg-gray-800/60 border-gray-700/50' : 'bg-white border-gray-100 shadow-sm'
      background:   'var(--card-bg)',
      border:       '1px solid var(--card-border)',
      boxShadow:    'var(--card-shadow)',
      display:      'flex', flexDirection: 'column', gap: 12,
      transition:   'background var(--transition-theme)',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13,
            // ✅ var(--accent-dim/accent) — was dk ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600'
            background: 'var(--accent-dim)', color: 'var(--accent)',
          }}>
            T{order.tableNumber || '?'}
          </div>
          <div>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              #{order._id?.slice(-5).toUpperCase()}
            </span>
            <div style={{ marginTop: 2 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                color: meta.color, background: meta.bg,
              }}>
                {meta.label}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 12 }}>
          <Clock size={11} />
          {/* ✅ BRAND.locale — was hardcoded 'en-IN' */}
          {new Date(order.placedAt || order.createdAt).toLocaleTimeString(BRAND.locale, { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Items */}
      <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-muted)' }}>
        {order.items?.map((item, idx) => (
          <span key={idx}>
            {idx > 0 && <span style={{ margin: '0 4px', opacity: 0.4 }}>·</span>}
            {item.emoji} {item.name} <span style={{ fontWeight: 700 }}>×{item.quantity}</span>
          </span>
        ))}
      </div>

      {/* Special note */}
      {order.specialNote && (
        <p style={{
          fontSize: 12, padding: '6px 10px', borderRadius: 10, margin: 0,
          // ✅ var(--warning-bg/warning) — was dk ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700'
          background: 'var(--warning-bg)', color: 'var(--warning)',
        }}>
          📌 {order.specialNote}
        </p>
      )}

      {/* Deliver button */}
      {order.status === 'on_the_way' && (
        <button
          onClick={() => onDeliver(order._id)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 16px', borderRadius: 12, border: 'none',
            // Semantic success — intentional fixed gradient
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: '#fff', fontSize: 13, fontWeight: 700,
            fontFamily: 'var(--font-body)', cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
            transition: 'transform 0.15s', WebkitTapHighlightColor: 'transparent',
          }}
          onTouchStart={e => e.currentTarget.style.transform = 'scale(0.96)'}
          onTouchEnd={e => e.currentTarget.style.transform = ''}
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
  const { isDark } = useContext(ThemeContext)

  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      // ✅ var(--card-bg/border) — was dk ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'
      background: 'var(--card-bg)',
      border: '1px solid var(--card-border)',
      boxShadow: 'var(--card-shadow)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', flexShrink: 0,
        borderBottom: '1px solid var(--divider)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* ✅ var(--accent) — was dk ? text-amber-400 : text-amber-500 */}
          <ShoppingBag size={17} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-body)' }}>
            Active Orders
          </h2>
          {orders.length > 0 && (
            <span style={{
              width: 20, height: 20, borderRadius: '50%',
              background: 'var(--accent)', color: 'var(--text-inverse)',
              fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
            }}>
              {orders.length}
            </span>
          )}
        </div>
        <button
          onClick={refresh}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            // ✅ var(--pill-bg/text-muted) — was dk ? 'bg-white/8 text-gray-400' : 'bg-gray-100 text-gray-500'
            background: 'var(--pill-bg)', color: 'var(--text-muted)',
            border: 'none', cursor: 'pointer',
            transition: 'background var(--transition-fast), color var(--transition-fast)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--pill-bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--pill-bg)'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2].map(i => (
              <div key={i} className="skeleton" style={{ height: 96, borderRadius: 12 }} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '48px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 28 }}>🎉</span>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, fontFamily: 'var(--font-body)' }}>
              All clear!
            </p>
          </div>
        ) : (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {orders.map(order => (
              <OrderCard key={order._id} order={order} onDeliver={markDelivered} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default WaiterActiveOrders