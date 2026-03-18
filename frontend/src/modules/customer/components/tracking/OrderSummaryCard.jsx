// src/modules/customer/components/tracking/OrderSummaryCard.jsx
//
// ✅ BRAND.currency — hardcoded 'Rs' replaced everywhere
// ✅ text-brew → var(--text-primary), text-brew-soft → var(--text-muted)
// ✅ text-saffron → var(--accent), border-cream-border → var(--divider)
// ✅ card div uses var(--card-bg/border) inline styles — no Tailwind color deps
// ✅ item.emoji fallback to '🍽️'
// ✅ item.portionLabel shown when present

import { BRAND } from '@shared/config/brand'

const OrderSummaryCard = ({ order }) => {
  if (!order?.items?.length) return null

  return (
    <div style={{
      padding: '16px', borderRadius: 'var(--radius-xl)',
      background: 'var(--card-bg)',
      border: '1px solid var(--card-border)',
      boxShadow: 'var(--card-shadow)',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
        Your Order
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {order.items.map((item, i) => (
          <div key={item._id ?? item.menuItemId ?? i}
            style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>
              {item.emoji || '🍽️'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: 0, fontSize: 13, fontWeight: 500,
                // ✅ var(--text-primary) — was text-brew
                color: 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {item.name}
              </p>
              {item.portionLabel && (
                <p style={{
                  margin: '1px 0 0', fontSize: 11, fontWeight: 600,
                  // ✅ var(--accent) — was text-saffron
                  color: 'var(--accent)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {item.portionLabel}
                </p>
              )}
              {item.notes && (
                <p style={{
                  margin: '1px 0 0', fontSize: 11,
                  color: 'var(--text-muted)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  Note: {item.notes}
                </p>
              )}
            </div>
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                ×{item.quantity}
              </p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                {/* ✅ BRAND.currency — was hardcoded 'Rs' */}
                {BRAND.currency} {item.price * item.quantity}
              </p>
            </div>
          </div>
        ))}
      </div>

      {order.specialNote && (
        <div style={{
          paddingTop: 10,
          // ✅ var(--divider) — was border-cream-border
          borderTop: '1px solid var(--divider)',
        }}>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
            📝 {order.specialNote}
          </p>
        </div>
      )}

      <div style={{
        paddingTop: 10,
        borderTop: '1px solid var(--divider)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
          {/* ✅ BRAND.currency — was hardcoded 'Rs' */}
          {BRAND.currency} {order.total}
        </span>
      </div>
    </div>
  )
}

export default OrderSummaryCard