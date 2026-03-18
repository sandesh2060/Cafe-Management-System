// src/modules/customer/pages/PaymentPage.jsx
//
// ✅ Dark/light mode — useContext(ThemeContext) added
// ✅ var(--token) replaces all bg-cream, text-brew, text-matcha Tailwind color classes
// ✅ BRAND.currency — all hardcoded Rs replaced
// ✅ COLORS import removed — icon color uses var(--accent) instead
// ✅ All logic unchanged — subtotal fallback, tier multiplier, null guards

import { useContext }              from 'react'
import { useSelector }             from 'react-redux'
import { selectActiveOrder }       from '@store/slices/orderSlice'
import { selectLoyalty }           from '@store/slices/loyaltySlice'
import { ThemeContext }             from '@shared/context/ThemeContext'
import { BRAND }                   from '@shared/config/brand'
import BottomNav                   from '@shared/components/layout/BottomNav'
import { CreditCard, Banknote, Smartphone } from 'lucide-react'

const TIER_MULTIPLIER = { bronze: 1, silver: 1.5, gold: 2, none: 1 }
const calcPoints = (total, tier) =>
  Math.floor((total / 10) * (TIER_MULTIPLIER[tier] ?? 1))

const PaymentPage = () => {
  const order      = useSelector(selectActiveOrder)
  const loyalty    = useSelector(selectLoyalty)
  const { isDark } = useContext(ThemeContext)

  if (!order) {
    return (
      <div className="customer-container min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg)' }}>
        <p style={{ color: 'var(--text-muted)' }}>No order to pay for.</p>
      </div>
    )
  }

  const tier         = loyalty?.tier ?? 'none'
  const pointsToEarn = calcPoints(order.total ?? 0, tier)
  const subtotal     = order.subtotal ?? order.subTotal ?? order.total ?? 0
  const discountAmt  = order.discountAmt ?? 0
  const discountPct  = order.discountPct ?? 0

  return (
    <div className="customer-container min-h-screen flex flex-col"
      style={{ background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <header
        className="px-4 pt-5 pb-3 sticky top-0 z-20 backdrop-blur-md"
        style={{
          background: 'var(--header-bg)',
          borderBottom: '1px solid var(--divider)',
        }}
      >
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Payment
        </h1>
      </header>

      <div className="flex-1 overflow-auto px-4 pt-4 pb-bottom-nav space-y-4">

        {/* Bill summary card */}
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
          }}
        >
          <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
            Bill Summary
          </h2>

          {(order.items ?? []).map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>
                {item.emoji} {item.name}
                {item.portionLabel && (
                  <span style={{ color: 'var(--text-muted)' }}> · {item.portionLabel}</span>
                )}
                {' '}× {item.quantity}
              </span>
              {/* ✅ BRAND.currency */}
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {BRAND.currency} {(item.price ?? 0) * (item.quantity ?? 1)}
              </span>
            </div>
          ))}

          <div className="pt-2 space-y-1" style={{ borderTop: '1px solid var(--divider)' }}>
            <div className="flex justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span>Subtotal</span>
              {/* ✅ BRAND.currency */}
              <span>{BRAND.currency} {subtotal}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-sm font-medium" style={{ color: 'var(--success)' }}>
                <span>Loyalty ({discountPct}%)</span>
                {/* ✅ BRAND.currency */}
                <span>−{BRAND.currency} {discountAmt}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-1"
              style={{ color: 'var(--text-primary)' }}>
              <span>Total</span>
              {/* ✅ BRAND.currency */}
              <span style={{ color: 'var(--accent)' }}>
                {BRAND.currency} {order.total ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Points to earn */}
        {pointsToEarn > 0 && (
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{
              background: 'var(--loyalty-bg)',
              border: '1px solid var(--loyalty-border)',
            }}
          >
            <span className="text-2xl">⭐</span>
            <p className="text-sm m-0" style={{ color: 'var(--loyalty-text)' }}>
              You'll earn{' '}
              <span className="font-bold">{pointsToEarn} points</span> on this order
            </p>
          </div>
        )}

        {/* Payment methods */}
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
          }}
        >
          <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
            Payment Methods
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Please pay at the counter or call your waiter for bill payment.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Banknote,   label: 'Cash' },
              { icon: CreditCard, label: 'Card' },
              { icon: Smartphone, label: 'UPI'  },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl"
                style={{
                  background: 'var(--pill-bg)',
                  border: '1px solid var(--pill-border)',
                }}
              >
                {/* ✅ var(--accent) replaces COLORS.brew.soft */}
                <Icon size={20} color="var(--accent)" />
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <BottomNav />
    </div>
  )
}

export default PaymentPage