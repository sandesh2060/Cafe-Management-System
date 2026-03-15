// src/modules/customer/pages/PaymentPage.jsx
//
// FIXES (this pass):
//  1. order.subtotal ?? order.total fallback — backend may omit subtotal or use
//     different casing; prevents "Rs undefined" render.
//  2. order.discountAmt / order.discountPct ?? 0 null guards added.
//  3. pointsToEarn now applies loyalty tier multiplier (matches ItemDetailPage's
//     calcPoints logic: Bronze ×1, Silver ×1.5, Gold ×2).
//  4. COLORS.brew.light replaced with COLORS.brew.soft (confirmed existing token).
//  5. (order.items ?? []).map() — crash guard for undefined items array.

import { useSelector }             from 'react-redux'
import { selectActiveOrder }       from '@store/slices/orderSlice'
import { selectLoyalty }           from '@store/slices/loyaltySlice'
import BottomNav                   from '@shared/components/layout/BottomNav'
import { COLORS }                  from '@colors'
import { CreditCard, Banknote, Smartphone } from 'lucide-react'

// FIX: mirrors calcPoints in ItemDetailPage — applies tier multiplier so the
// preview is consistent with what OrderStatusPage will show after payment.
const TIER_MULTIPLIER = { bronze: 1, silver: 1.5, gold: 2, none: 1 }
const calcPoints = (total, tier) =>
  Math.floor((total / 10) * (TIER_MULTIPLIER[tier] ?? 1))

const PaymentPage = () => {
  const order   = useSelector(selectActiveOrder)
  const loyalty = useSelector(selectLoyalty)

  if (!order)
    return (
      <div className="customer-container min-h-screen bg-cream flex items-center justify-center">
        <p className="text-brew-soft">No order to pay for.</p>
      </div>
    )

  // FIX: tier-aware points preview
  const tier        = loyalty?.tier ?? 'none'
  const pointsToEarn = calcPoints(order.total ?? 0, tier)

  // FIX: backend may use 'subtotal' or omit it — fall back to total
  const subtotal    = order.subtotal ?? order.subTotal ?? order.total ?? 0
  const discountAmt = order.discountAmt ?? 0
  const discountPct = order.discountPct ?? 0

  return (
    <div className="customer-container min-h-screen bg-cream flex flex-col">
      <header
        className="px-4 pt-5 pb-3 sticky top-0 z-20 bg-cream/95 backdrop-blur-md
                   border-b border-cream-border"
      >
        <h1 className="text-2xl font-bold text-brew">Payment</h1>
      </header>

      <div className="flex-1 overflow-auto px-4 pt-4 pb-bottom-nav space-y-4">

        {/* Bill summary */}
        <div className="card space-y-3">
          <h2 className="font-bold text-brew text-base">Bill Summary</h2>
          {/* FIX: null guard on items array */}
          {(order.items ?? []).map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-brew-soft">
                {item.emoji} {item.name}
                {item.portionLabel && (
                  <span className="opacity-60"> · {item.portionLabel}</span>
                )}
                {' '}× {item.quantity}
              </span>
              <span className="text-brew font-medium">
                Rs {(item.price ?? 0) * (item.quantity ?? 1)}
              </span>
            </div>
          ))}
          <div className="border-t border-cream-border pt-2 space-y-1">
            <div className="flex justify-between text-sm text-brew-soft">
              <span>Subtotal</span>
              {/* FIX: subtotal fallback */}
              <span>Rs {subtotal}</span>
            </div>
            {/* FIX: ?? 0 guard */}
            {discountAmt > 0 && (
              <div className="flex justify-between text-sm text-matcha font-medium">
                <span>Loyalty ({discountPct}%)</span>
                <span>−Rs {discountAmt}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-brew text-lg pt-1">
              <span>Total</span>
              <span>Rs {order.total ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Points to earn — tier-aware */}
        {pointsToEarn > 0 && (
          <div className="card flex items-center gap-3 bg-saffron-soft border-saffron/20">
            <span className="text-2xl">⭐</span>
            <p className="text-sm text-brew">
              You'll earn{' '}
              <span className="font-bold">{pointsToEarn} points</span> on this
              order
            </p>
          </div>
        )}

        {/* Payment methods — informational, cashier handles actual payment */}
        <div className="card space-y-3">
          <h2 className="font-bold text-brew text-base">Payment Methods</h2>
          <p className="text-sm text-brew-soft">
            Please pay at the counter or call your waiter for bill payment.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Banknote,    label: 'Cash' },
              { icon: CreditCard,  label: 'Card' },
              { icon: Smartphone,  label: 'UPI'  },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-cream-dark"
              >
                {/* FIX: brew.soft is the confirmed token; brew.light is undefined */}
                <Icon size={20} color={COLORS.brew?.soft ?? '#8B5E3C'} />
                <span className="text-xs text-brew-soft font-medium">{label}</span>
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