// src/modules/customer/pages/LoyaltyPage.jsx
import { useEffect }              from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { selectLoyalty }          from '@store/slices/loyaltySlice'
import { selectIsGuest }          from '@store/slices/authSlice'
import BottomNav                  from '@shared/components/layout/BottomNav'
import TierCard                   from '../components/loyalty/TierCard'
import TierProgress               from '../components/loyalty/TierProgress'
import TierComparison             from '../components/loyalty/TierComparison'
import HowToEarn                  from '../components/loyalty/HowToEarn'
import api                        from '@api/axios'
import { setLoyalty }             from '@store/slices/loyaltySlice'
import { COLORS }                 from '@colors'
import { Lock }                   from 'lucide-react'

const LoyaltyPage = () => {
  const dispatch = useDispatch()
  const loyalty  = useSelector(selectLoyalty)
  const isGuest  = useSelector(selectIsGuest)

  useEffect(() => {
    if (isGuest) return
    api.get('/loyalty/me').then((data) => {
      dispatch(setLoyalty({ points: data.points, tier: data.tier }))
    }).catch(() => {})
  }, [dispatch, isGuest])

  if (isGuest) {
    return (
      <div className="customer-container min-h-screen bg-cream flex flex-col">
        <header className="px-4 pt-5 pb-3">
          <h1 className="text-2xl font-bold text-brew">Loyalty</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4 pb-20">
          <div className="w-16 h-16 rounded-2xl bg-saffron/10 flex items-center justify-center">
            <Lock size={32} color={COLORS.saffron.DEFAULT} />
          </div>
          <h2 className="text-xl font-bold text-brew">Sign in to earn rewards</h2>
          <p className="text-brew-soft text-sm">
            Create an account with Google to earn loyalty points and unlock discounts on every order.
          </p>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="customer-container min-h-screen bg-cream flex flex-col">
      <header className="px-4 pt-5 pb-3 sticky top-0 z-20 bg-cream/95 backdrop-blur-md
                          border-b border-cream-border">
        <h1 className="text-2xl font-bold text-brew">Loyalty</h1>
        <p className="text-brew-soft text-sm mt-0.5">Earn points, unlock rewards</p>
      </header>

      <div className="flex-1 overflow-auto px-4 pt-4 pb-bottom-nav space-y-4">
        {/* Current tier card */}
        <TierCard tier={loyalty.tier} points={loyalty.points} />

        {/* Progress to next tier */}
        {loyalty.tier !== 'gold' && (
          <TierProgress
            tier={loyalty.tier}
            points={loyalty.points}
            pointsToNext={loyalty.pointsToNext}
          />
        )}

        {/* Tier comparison table */}
        <TierComparison currentTier={loyalty.tier} />

        {/* How to earn */}
        <HowToEarn />
      </div>

      <BottomNav />
    </div>
  )
}

export default LoyaltyPage