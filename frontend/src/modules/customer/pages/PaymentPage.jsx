// src/modules/customer/pages/PaymentPage.jsx
import { useSelector }           from 'react-redux'
import { selectActiveOrder }     from '@store/slices/orderSlice'
import { selectLoyalty }         from '@store/slices/loyaltySlice'
import BottomNav                 from '@shared/components/layout/BottomNav'
import { COLORS }                from '@colors'
import { CreditCard, Banknote, Smartphone } from 'lucide-react'

const PaymentPage = () => {
  const order   = useSelector(selectActiveOrder)
  const loyalty = useSelector(selectLoyalty)

  if (!order) return (
    <div className="customer-container min-h-screen bg-cream flex items-center justify-center">
      <p className="text-brew-soft">No order to pay for.</p>
    </div>
  )

  const pointsToEarn = Math.floor(order.total / 10)

  return (
    <div className="customer-container min-h-screen bg-cream flex flex-col">
      <header className="px-4 pt-5 pb-3 sticky top-0 z-20 bg-cream/95 backdrop-blur-md
                          border-b border-cream-border">
        <h1 className="text-2xl font-bold text-brew">Payment</h1>
      </header>

      <div className="flex-1 overflow-auto px-4 pt-4 pb-bottom-nav space-y-4">
        {/* Bill summary */}
        <div className="card space-y-3">
          <h2 className="font-bold text-brew text-base">Bill Summary</h2>
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-brew-soft">
                {item.emoji} {item.name} × {item.quantity}
              </span>
              <span className="text-brew font-medium">₹{item.price * item.quantity}</span>
            </div>
          ))}
          <div className="border-t border-cream-border pt-2 space-y-1">
            <div className="flex justify-between text-sm text-brew-soft">
              <span>Subtotal</span><span>₹{order.subtotal}</span>
            </div>
            {order.discountAmt > 0 && (
              <div className="flex justify-between text-sm text-matcha font-medium">
                <span>Loyalty ({order.discountPct}%)</span>
                <span>−₹{order.discountAmt}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-brew text-lg pt-1">
              <span>Total</span><span>₹{order.total}</span>
            </div>
          </div>
        </div>

        {/* Points to earn */}
        {pointsToEarn > 0 && (
          <div className="card flex items-center gap-3 bg-saffron-soft border-saffron/20">
            <span className="text-2xl">⭐</span>
            <p className="text-sm text-brew">
              You'll earn <span className="font-bold">{pointsToEarn} points</span> on this order
            </p>
          </div>
        )}

        {/* Payment methods (informational — cashier handles actual payment) */}
        <div className="card space-y-3">
          <h2 className="font-bold text-brew text-base">Payment Methods</h2>
          <p className="text-sm text-brew-soft">
            Please pay at the counter or call your waiter for bill payment.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Banknote,    label: 'Cash'  },
              { icon: CreditCard,  label: 'Card'  },
              { icon: Smartphone,  label: 'UPI'   },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 py-3
                                          rounded-xl bg-cream-dark">
                <Icon size={20} color={COLORS.brew.light} />
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