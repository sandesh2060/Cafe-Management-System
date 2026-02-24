// src/modules/customer/pages/PaymentSuccessPage.jsx
import { useEffect, useRef } from 'react'
import { useLocation }       from 'react-router-dom'
import { useSelector }       from 'react-redux'
import { selectRole }        from '@store/slices/authSlice'
import ConfettiEffect        from '@shared/components/effects/ConfettiEffect'
import logoutService         from '../services/logoutService'
import { playSound }         from '@shared/utils/soundPlayer'
import { COLORS }            from '@colors'
import { Star, Gift }        from 'lucide-react'

const DELAY = parseInt(import.meta.env.VITE_PAYMENT_LOGOUT_DELAY_MS || '8000')

const PaymentSuccessPage = () => {
  const { state }   = useLocation()
  const role        = useSelector(selectRole)
  const { pointsEarned = 0, tierUpgraded = false, newTier = null, totalAmount = 0 } = state || {}

  const timerRef = useRef(null)

  useEffect(() => {
    // Play success sounds
    playSound('pointsEarned', role)
    if (tierUpgraded) {
      setTimeout(() => playSound('tierUpgraded', role), 1000)
    }

    // Rule 3 — auto-logout after delay
    timerRef.current = setTimeout(() => {
      logoutService.executeClient()
    }, DELAY)

    return () => clearTimeout(timerRef.current)
  }, [role, tierUpgraded])

  const tierColors = {
    bronze: COLORS.loyalty.bronze.DEFAULT,
    silver: COLORS.loyalty.silver.DEFAULT,
    gold:   COLORS.loyalty.gold.DEFAULT,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-matcha-soft to-white
                    flex items-center justify-center p-6">
      <ConfettiEffect trigger duration={5000} />

      <div className="text-center max-w-sm w-full space-y-6 animate-slide-up">
        {/* Success icon */}
        <div className="w-24 h-24 rounded-full bg-matcha flex items-center justify-center
                        mx-auto shadow-lg text-5xl animate-bounce-soft">
          ✅
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-brew">Payment Done!</h1>
          <p className="text-brew-soft">Thank you for visiting कौसी चिया ☕</p>
        </div>

        {/* Total */}
        {totalAmount > 0 && (
          <div className="card text-center py-3">
            <p className="text-brew-soft text-sm">Total Paid</p>
            <p className="text-2xl font-bold text-brew">₹{totalAmount}</p>
          </div>
        )}

        {/* Points earned */}
        {pointsEarned > 0 && (
          <div className="card flex items-center gap-3 bg-saffron-soft border-saffron/30">
            <div className="w-10 h-10 rounded-full bg-saffron/20 flex items-center justify-center flex-shrink-0">
              <Star size={20} color={COLORS.saffron.DEFAULT} fill={COLORS.saffron.DEFAULT} />
            </div>
            <div className="text-left">
              <p className="font-bold text-brew">+{pointsEarned} Points Earned!</p>
              <p className="text-sm text-brew-soft">Added to your loyalty balance</p>
            </div>
          </div>
        )}

        {/* Tier upgrade */}
        {tierUpgraded && newTier && (
          <div
            className="card flex items-center gap-3 border-2"
            style={{
              backgroundColor: COLORS.loyalty[newTier]?.bg,
              borderColor:     COLORS.loyalty[newTier]?.DEFAULT,
            }}
          >
            <Gift size={24} color={tierColors[newTier]} />
            <div className="text-left">
              <p className="font-bold" style={{ color: COLORS.loyalty[newTier]?.text }}>
                🎉 Welcome to {newTier.charAt(0).toUpperCase() + newTier.slice(1)} Tier!
              </p>
              <p className="text-sm" style={{ color: COLORS.loyalty[newTier]?.text }}>
                You now get {newTier === 'gold' ? '15%' : newTier === 'silver' ? '10%' : '5%'} discount
              </p>
            </div>
          </div>
        )}

        {/* Auto-logout countdown hint */}
        <p className="text-brew-soft text-sm">
          Logging out automatically in {Math.ceil(DELAY / 1000)} seconds…
        </p>
      </div>
    </div>
  )
}

export default PaymentSuccessPage