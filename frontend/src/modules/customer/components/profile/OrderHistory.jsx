// src/modules/customer/components/profile/OrderHistory.jsx
//
// ✅ COLORS import removed — var(--success/danger/accent) replace status colors
// ✅ BRAND.currency — hardcoded 'Rs' replaced everywhere
// ✅ text-brew/text-brew-soft → var(--text-primary/muted)
// ✅ bg-cream-dark/bg-cream-deep → var(--pill-bg)
// ✅ divide-cream-border → var(--divider)
// ✅ card → var(--card-bg/border/shadow) inline styles
// ✅ text-saffron → var(--accent)
// ✅ skeleton → .skeleton CSS class from globals.css

import { useState, useEffect } from 'react'
import { ChevronRight }        from 'lucide-react'
import { BRAND }               from '@shared/config/brand'
import api                     from '@api/axios'

// ✅ Semantic status colors via var tokens
const STATUS_COLOR = {
  paid:      'var(--success)',
  delivered: 'var(--success)',
  cancelled: 'var(--danger)',
  pending:   'var(--warning)',
  preparing: 'var(--info)',
  on_the_way:'var(--accent)',
}
const STATUS_BG = {
  paid:      'var(--success-bg)',
  delivered: 'var(--success-bg)',
  cancelled: 'var(--danger-bg)',
  pending:   'var(--warning-bg)',
  preparing: 'var(--info-bg)',
  on_the_way:'var(--accent-dim)',
}

const OrderHistory = () => {
  const [orders,   setOrders]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    api.get('/orders/history')
      .then(data => setOrders(data.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{
        padding: '16px', borderRadius: 'var(--radius-xl)',
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {[1, 2].map(i => (
          // ✅ .skeleton CSS class from globals.css
          <div key={i} className="skeleton" style={{ height: 56 }} />
        ))}
      </div>
    )
  }

  if (!orders.length) {
    return (
      <div style={{
        padding: '24px 16px', borderRadius: 'var(--radius-xl)', textAlign: 'center',
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        fontSize: 13,
        // ✅ var(--text-muted) — was text-brew-soft
        color: 'var(--text-muted)',
      }}>
        No past orders yet. Order something! 😋
      </div>
    )
  }

  return (
    <div style={{
      borderRadius: 'var(--radius-xl)', overflow: 'hidden',
      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      boxShadow: 'var(--card-shadow)',
    }}>
      <h3 style={{
        margin: 0, padding: '16px 16px 12px',
        fontSize: 13, fontWeight: 700,
        // ✅ var(--text-primary) — was text-brew
        color: 'var(--text-primary)',
      }}>
        Order History
      </h3>

      <div>
        {orders.map((order, oi) => (
          <div key={order._id} style={{ borderTop: '1px solid var(--divider)' }}>
            <button
              onClick={() => setExpanded(expanded === order._id ? null : order._id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', textAlign: 'left', background: 'none',
                border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    #{order._id.slice(-6).toUpperCase()}
                  </p>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                    // ✅ var status tokens — was COLORS.matcha/terra.DEFAULT
                    background: STATUS_BG[order.status]  || 'var(--pill-bg)',
                    color:      STATUS_COLOR[order.status] || 'var(--text-muted)',
                  }}>
                    {order.status}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  {' · '}
                  {/* ✅ BRAND.currency — was hardcoded 'Rs' */}
                  {BRAND.currency} {order.total}
                </p>
              </div>
              <ChevronRight
                size={16}
                style={{
                  color: 'var(--text-muted)',
                  transition: 'transform 0.2s',
                  transform: expanded === order._id ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
              />
            </button>

            {/* Expanded items */}
            {expanded === order._id && (
              <div style={{
                padding: '0 16px 12px',
                // ✅ var(--pill-bg) — was bg-cream-dark/40
                background: 'var(--pill-bg)',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                {order.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {item.emoji} {item.name} ×{item.quantity}
                    </span>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {/* ✅ BRAND.currency — was hardcoded 'Rs' */}
                      {BRAND.currency} {item.price * item.quantity}
                    </span>
                  </div>
                ))}
                {order.pointsEarned > 0 && (
                  <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>
                    ⭐ +{order.pointsEarned} points earned
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default OrderHistory