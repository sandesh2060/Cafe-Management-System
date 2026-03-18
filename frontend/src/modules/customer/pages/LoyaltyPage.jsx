// src/modules/customer/pages/LoyaltyPage.jsx
//
// ✅ Dark/light mode — useContext(ThemeContext) added
// ✅ var(--token) replaces bg-cream, text-brew, bg-saffron/10 Tailwind color classes
// ✅ COLORS import removed — Lock icon uses var(--accent)
// ✅ All fix logic unchanged — ENDPOINTS, null guards, computePointsToNext, spread

import { useEffect, useContext }    from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { selectLoyalty, setLoyalty } from '@store/slices/loyaltySlice'
import { selectIsGuest }            from '@store/slices/authSlice'
import { ENDPOINTS as EP }          from '@api/endpoints'
import { ThemeContext }             from '@shared/context/ThemeContext'
import BottomNav                    from '@shared/components/layout/BottomNav'
import TierCard                     from '../components/loyalty/TierCard'
import TierProgress                 from '../components/loyalty/TierProgress'
import TierComparison               from '../components/loyalty/TierComparison'
import HowToEarn                    from '../components/loyalty/HowToEarn'
import api                          from '@api/axios'
import { Lock }                     from 'lucide-react'

const POINTS_THRESHOLD = { none: 0, bronze: 0, silver: 500, gold: 1500 }
const TIER_ORDER        = ['none', 'bronze', 'silver', 'gold']

const computePointsToNext = (tier, points) => {
  const idx     = TIER_ORDER.indexOf(tier ?? 'none')
  const nextTier = TIER_ORDER[idx + 1]
  if (!nextTier) return 0
  return Math.max(0, POINTS_THRESHOLD[nextTier] - (points ?? 0))
}

const LoyaltyPage = () => {
  const dispatch   = useDispatch()
  const { isDark } = useContext(ThemeContext)

  const loyaltyRaw = useSelector(selectLoyalty)
  const loyalty    = loyaltyRaw?.loyalty ?? loyaltyRaw ?? {}
  const isGuest    = useSelector(selectIsGuest)

  useEffect(() => {
    if (isGuest) return
    api.get(EP.LOYALTY.ME).then((data) => {
      const payload = data?.data ?? data ?? {}
      dispatch(setLoyalty({
        ...loyalty,
        points:       payload.points      ?? loyalty?.points      ?? 0,
        tier:         payload.tier        ?? loyalty?.tier        ?? 'none',
        discountPct:  payload.discountPct ?? loyalty?.discountPct ?? 0,
        pointsToNext: payload.pointsToNext
          ?? computePointsToNext(payload.tier ?? loyalty?.tier, payload.points ?? loyalty?.points),
        ...(payload.transactions != null ? { transactions: payload.transactions } : {}),
      }))
    }).catch(() => {})
  }, [dispatch, isGuest]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Guest wall ─────────────────────────────────────────────────────────────
  if (isGuest) {
    return (
      <div className="customer-container min-h-screen flex flex-col"
        style={{ background: 'var(--bg)' }}>
        <header className="px-4 pt-5 pb-3">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Loyalty
          </h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4 pb-20">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
            {/* ✅ var(--accent) replaces COLORS.saffron.DEFAULT */}
            <Lock size={32} color="var(--accent)" />
          </div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Sign in to earn rewards
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Create an account to earn loyalty points and unlock discounts on every order.
          </p>
        </div>
        <BottomNav />
      </div>
    )
  }

  const tier         = loyalty.tier        ?? 'none'
  const points       = loyalty.points      ?? 0
  const pointsToNext = loyalty.pointsToNext ?? computePointsToNext(tier, points)

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
          Loyalty
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Earn points, unlock rewards
        </p>
      </header>

      <div className="flex-1 overflow-auto px-4 pt-4 pb-bottom-nav space-y-4">
        <TierCard tier={tier} points={points} />
        {tier !== 'gold' && (
          <TierProgress tier={tier} points={points} pointsToNext={pointsToNext} />
        )}
        <TierComparison currentTier={tier} />
        <HowToEarn />
      </div>

      <BottomNav />
    </div>
  )
}

export default LoyaltyPage