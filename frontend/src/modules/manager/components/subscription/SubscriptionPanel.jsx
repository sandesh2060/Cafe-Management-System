// frontend/src/modules/manager/components/subscription/SubscriptionPanel.jsx

import { useState }                    from 'react'
import {
  useGetSubscriptionQuery,
  useInitiateSubscriptionMutation,
  useUpgradeSeatsMutation,
  useCancelSubscriptionMutation,
}                                      from '@api/endpoints/subscriptionApi'
import LoadingSpinner                  from '@shared/components/feedback/LoadingSpinner'

const PLANS = [
  { id: 'basic_starter', label: 'Starter',   price: 1000, orders: '500',      seats: 3  },
  { id: 'basic_growth',  label: 'Growth',    price: 1500, orders: '1,000',    seats: 5  },
  { id: 'basic_scale',   label: 'Scale',     price: 2500, orders: '2,000',    seats: 10 },
  { id: 'pro',           label: 'Pro',       price: 4999, orders: 'Unlimited', seats: 20 },
]

const STATUS_BADGE = {
  trial:       'bg-blue-500/20 text-blue-400',
  active:      'bg-green-500/20 text-green-400',
  grace:       'bg-yellow-500/20 text-yellow-400',
  readonly:    'bg-orange-500/20 text-orange-400',
  suspended:   'bg-red-500/20 text-red-400',
}

export default function SubscriptionPanel() {
  const { data, isLoading } = useGetSubscriptionQuery()
  const [initiate, { isLoading: initiating }] = useInitiateSubscriptionMutation()
  const [upgradeSeats]                         = useUpgradeSeatsMutation()
  const [cancelSub]                            = useCancelSubscriptionMutation()

  const [selectedPlan, setSelectedPlan] = useState(null)
  const [seatSlider, setSeatSlider]     = useState(0)
  const [showCancel, setShowCancel]     = useState(false)

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <LoadingSpinner size="lg" />
    </div>
  )

  const sub     = data?.data
  const current = sub?.plan
  const status  = sub?.status
  const usage   = sub?.usage ?? {}
  const limits  = sub?.limits ?? {}
  const pricing = sub?.pricing ?? {}

  const orderPct = limits.maxOrders
    ? Math.min(100, Math.round(((usage.orderCount ?? 0) / limits.maxOrders) * 100))
    : 0

  const handleUpgrade = async (planId) => {
    try {
      const result = await initiate({ plan: planId, seatCount: seatSlider || limits.maxStaff }).unwrap()
      // Redirect to eSewa
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = result.data.paymentUrl
      Object.entries(result.data.formData).forEach(([k, v]) => {
        const input = document.createElement('input')
        input.type  = 'hidden'
        input.name  = k
        input.value = v
        form.appendChild(input)
      })
      document.body.appendChild(form)
      form.submit()
    } catch (err) {
      console.error('[SubscriptionPanel] initiate error:', err)
    }
  }

  const handleSeatUpgrade = async () => {
    if (!seatSlider) return
    try {
      await upgradeSeats({ seatCount: seatSlider }).unwrap()
    } catch {}
  }

  const handleCancel = async () => {
    try {
      await cancelSub().unwrap()
      setShowCancel(false)
    } catch {}
  }

  return (
    <div className="space-y-8 p-4">

      {/* ── Current Status ── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Current Plan</p>
            <h2 className="text-2xl font-bold text-[var(--text)] capitalize">
              {PLANS.find(p => p.id === current)?.label ?? current ?? '—'}
            </h2>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_BADGE[status] ?? ''}`}>
            {status}
          </span>
        </div>

        {/* Grace / Expiry warning */}
        {status === 'grace' && sub?.gracePeriodEndsAt && (
          <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-3 text-sm text-yellow-400">
            ⚠️ Grace period active — access continues until{' '}
            {new Date(sub.gracePeriodEndsAt).toLocaleDateString()}. Please renew.
          </div>
        )}
        {status === 'readonly' && (
          <div className="rounded-xl bg-orange-500/10 border border-orange-500/30 p-3 text-sm text-orange-400">
            🔒 Read-only mode — no new orders until you renew.
          </div>
        )}

        {/* Order usage meter */}
        {limits.maxOrders && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[var(--muted)]">
              <span>Orders this month</span>
              <span>{usage.orderCount ?? 0} / {limits.maxOrders}</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  orderPct >= 100 ? 'bg-red-500' :
                  orderPct >= 80  ? 'bg-yellow-500' : 'bg-[var(--accent)]'
                }`}
                style={{ width: `${orderPct}%` }}
              />
            </div>
            {orderPct >= 80 && (
              <p className="text-xs text-yellow-400">
                {orderPct >= 100 ? '⛔ Cap reached — grace period active (+50 orders)' : `⚠️ ${orderPct}% of order limit used`}
              </p>
            )}
          </div>
        )}

        {/* Staff usage */}
        <div className="flex items-center justify-between text-sm text-[var(--muted)]">
          <span>Staff accounts</span>
          <span className="text-[var(--text)] font-medium">
            {usage.staffCount ?? 0} / {limits.maxStaff ?? '—'}
          </span>
        </div>
      </div>

      {/* ── Plan Cards ── */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-4">
          Choose a Plan
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PLANS.map((plan) => {
            const isCurrent  = plan.id === current
            const isSelected = plan.id === selectedPlan
            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(isSelected ? null : plan.id)}
                className={`text-left p-4 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                    : isSelected
                    ? 'border-[var(--accent)] bg-[var(--card)]'
                    : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[var(--text)]">{plan.label}</span>
                  {isCurrent && (
                    <span className="text-xs bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-[var(--accent)]">
                  Rs {plan.price.toLocaleString()}
                  <span className="text-sm font-normal text-[var(--muted)]">/mo</span>
                </p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  {plan.orders} orders · {plan.seats} staff included
                </p>
              </button>
            )
          })}
        </div>

        {selectedPlan && selectedPlan !== current && (
          <button
            onClick={() => handleUpgrade(selectedPlan)}
            disabled={initiating}
            className="mt-4 w-full py-3 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm disabled:opacity-50"
          >
            {initiating ? 'Redirecting to eSewa…' : `Pay with eSewa — Rs ${PLANS.find(p => p.id === selectedPlan)?.price.toLocaleString()}`}
          </button>
        )}
      </div>

      {/* ── Seat Slider ── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[var(--text)]">Extra Staff Seats</h3>
        <p className="text-xs text-[var(--muted)]">
          Rs {pricing.extraSeatPrice ?? 200}/seat/month beyond your plan's included seats
        </p>
        <div className="space-y-2">
          <input
            type="range"
            min={limits.maxStaff ?? 3}
            max={(limits.maxStaff ?? 3) + 20}
            value={seatSlider || limits.maxStaff || 3}
            onChange={(e) => setSeatSlider(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
          <div className="flex justify-between text-xs text-[var(--muted)]">
            <span>Included: {limits.maxStaff ?? 3}</span>
            <span>Total: {seatSlider || limits.maxStaff || 3} seats</span>
          </div>
        </div>
        {seatSlider > (limits.maxStaff ?? 3) && (
          <button
            onClick={handleSeatUpgrade}
            className="w-full py-2.5 rounded-xl border border-[var(--accent)] text-[var(--accent)] text-sm font-semibold"
          >
            Update to {seatSlider} seats
          </button>
        )}
      </div>

      {/* ── Cancel ── */}
      {status === 'active' && (
        <div className="text-center">
          {!showCancel ? (
            <button
              onClick={() => setShowCancel(true)}
              className="text-xs text-[var(--muted)] hover:text-red-400 underline underline-offset-2"
            >
              Cancel auto-renew
            </button>
          ) : (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 space-y-3">
              <p className="text-sm text-red-400">
                Auto-renew will be disabled. You keep access until expiry.
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={handleCancel} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold">
                  Confirm
                </button>
                <button onClick={() => setShowCancel(false)} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--muted)] text-sm">
                  Keep subscription
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}