// src/modules/customer/pages/LoyaltyPage.jsx
//
// FIXES (this pass):
//  1. api.get() now uses ENDPOINTS constant instead of hardcoded '/loyalty/me'.
//  2. Axios interceptor unwrap fix — interceptor returns response.data, so if
//     backend wraps in { success, data: {...} }, we read data.data ?? data
//     to handle both shapes safely.
//  3. loyalty null guard added — selectLoyalty can return null before first fetch.
//     All loyalty accesses are behind a loyalty ?? {} fallback.
//  4. pointsToNext computed locally if backend doesn't return it, so TierProgress
//     never receives undefined.
//  5. setLoyalty dispatch now spreads existing loyalty state and only overrides
//     fields returned by the API — prevents wiping discountPct/transactions/etc.
//     that the slice may store from other sources.

import { useEffect }                from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { selectLoyalty, setLoyalty } from '@store/slices/loyaltySlice'
import { selectIsGuest }            from '@store/slices/authSlice'
import { ENDPOINTS as EP }          from '@api/endpoints'
import BottomNav                    from '@shared/components/layout/BottomNav'
import TierCard                     from '../components/loyalty/TierCard'
import TierProgress                 from '../components/loyalty/TierProgress'
import TierComparison               from '../components/loyalty/TierComparison'
import HowToEarn                    from '../components/loyalty/HowToEarn'
import api                          from '@api/axios'
import { COLORS }                   from '@colors'
import { Lock }                     from 'lucide-react'

// Points thresholds per tier (mirrors POINTS_FOR_TIER in ProfilePage / ItemDetailPage)
const POINTS_THRESHOLD = { none: 0, bronze: 0, silver: 500, gold: 1500 }
const TIER_ORDER        = ['none', 'bronze', 'silver', 'gold']

// FIX: compute pointsToNext locally so TierProgress never receives undefined
// even if the backend omits the field
const computePointsToNext = (tier, points) => {
  const idx = TIER_ORDER.indexOf(tier ?? 'none')
  const nextTier = TIER_ORDER[idx + 1]
  if (!nextTier) return 0
  return Math.max(0, POINTS_THRESHOLD[nextTier] - (points ?? 0))
}

const LoyaltyPage = () => {
  const dispatch = useDispatch()
  // FIX: loyalty can be null — use fallback {} for safe property access
  const loyaltyRaw = useSelector(selectLoyalty)
  const loyalty    = loyaltyRaw?.loyalty ?? loyaltyRaw ?? {}
  const isGuest    = useSelector(selectIsGuest)

  useEffect(() => {
    if (isGuest) return

    // FIX: use ENDPOINTS constant, not hardcoded string
    api.get(EP.LOYALTY.ME).then((data) => {
      // FIX: handle both { points, tier } and { success, data: { points, tier } }
      // Axios interceptor unwraps response.data, so 'data' here is response.data.
      // If backend further wraps in a 'data' key, fall through to the inner object.
      const payload = data?.data ?? data ?? {}

      // FIX: spread existing loyalty state — only override fields from API
      // so we don't wipe discountPct / pointsToNext / transactions etc.
      dispatch(setLoyalty({
        ...loyalty,
        points:       payload.points      ?? loyalty?.points      ?? 0,
        tier:         payload.tier        ?? loyalty?.tier        ?? 'none',
        discountPct:  payload.discountPct ?? loyalty?.discountPct ?? 0,
        pointsToNext: payload.pointsToNext
          ?? computePointsToNext(payload.tier ?? loyalty?.tier, payload.points ?? loyalty?.points),
        ...(payload.transactions != null ? { transactions: payload.transactions } : {}),
      }))
    }).catch(() => {
      // Silently ignore — existing Redux state is still shown
    })
  }, [dispatch, isGuest]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Guest wall ─────────────────────────────────────────────────────────────
  if (isGuest) {
    return (
      <div className="customer-container min-h-screen bg-cream flex flex-col">
        <header className="px-4 pt-5 pb-3">
          <h1 className="text-2xl font-bold text-brew">Loyalty</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4 pb-20">
          <div className="w-16 h-16 rounded-2xl bg-saffron/10 flex items-center justify-center">
            <Lock size={32} color={COLORS.saffron?.DEFAULT ?? '#FF9F1C'} />
          </div>
          <h2 className="text-xl font-bold text-brew">Sign in to earn rewards</h2>
          <p className="text-brew-soft text-sm">
            Create an account to earn loyalty points and unlock discounts on every order.
          </p>
        </div>
        <BottomNav />
      </div>
    )
  }

  // FIX: safe field reads with fallbacks — loyalty may be {} on first render
  const tier         = loyalty.tier        ?? 'none'
  const points       = loyalty.points      ?? 0
  // FIX: compute locally if backend didn't return it
  const pointsToNext = loyalty.pointsToNext ?? computePointsToNext(tier, points)

  return (
    <div className="customer-container min-h-screen bg-cream flex flex-col">
      <header className="px-4 pt-5 pb-3 sticky top-0 z-20 bg-cream/95 backdrop-blur-md
                         border-b border-cream-border">
        <h1 className="text-2xl font-bold text-brew">Loyalty</h1>
        <p className="text-brew-soft text-sm mt-0.5">Earn points, unlock rewards</p>
      </header>

      <div className="flex-1 overflow-auto px-4 pt-4 pb-bottom-nav space-y-4">

        {/* Current tier card */}
        <TierCard tier={tier} points={points} />

        {/* Progress to next tier — only when not gold */}
        {/* FIX: loyalty.tier check replaced with local `tier` which has null fallback */}
        {tier !== 'gold' && (
          <TierProgress
            tier={tier}
            points={points}
            pointsToNext={pointsToNext}
          />
        )}

        {/* Tier comparison table */}
        <TierComparison currentTier={tier} />

        {/* How to earn */}
        <HowToEarn />

      </div>

      <BottomNav />
    </div>
  )
}

export default LoyaltyPage