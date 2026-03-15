// src/modules/customer/pages/PaymentSuccessPage.jsx
//
// FIXES (this pass):
//  1. Countdown timer — was showing a static "8 seconds" forever. Now ticks down
//     each second with useState so user sees live "7… 6… 5…" countdown.
//  2. "Leave now" button added — calls logoutService.executeClient() immediately
//     so user isn't stuck waiting for the auto-logout timer.
//  3. COLORS.loyalty[newTier] crash guard — if backend returns an unexpected tier
//     string, falls back to saffron colors instead of crashing on undefined.
//  4. tierUpgraded sound plays after pointsEarned sound (1000ms delay) and
//     only when tierUpgraded is truthy — correct as before ✅, no change needed.

import { useEffect, useRef, useState } from 'react'
import { useLocation }                  from 'react-router-dom'
import { useSelector }                  from 'react-redux'
import { selectRole }                   from '@store/slices/authSlice'
import ConfettiEffect                   from '@shared/components/effects/ConfettiEffect'
import logoutService                    from '../services/logoutService'
import { playSound }                    from '@shared/utils/soundPlayer'
import { COLORS }                       from '@colors'
import { Star, Gift, LogOut }           from 'lucide-react'

const DELAY_MS = parseInt(import.meta.env.VITE_PAYMENT_LOGOUT_DELAY_MS || '8000')
// Pre-compute seconds so the render doesn't recalculate on every tick
const DELAY_S  = Math.ceil(DELAY_MS / 1000)

const PaymentSuccessPage = () => {
  const { state } = useLocation()
  const role      = useSelector(selectRole)
  const {
    pointsEarned = 0,
    tierUpgraded = false,
    newTier      = null,
    totalAmount  = 0,
  } = state || {}

  // FIX: live countdown — ticks every second
  const [countdown, setCountdown] = useState(DELAY_S)
  const timerRef                  = useRef(null)
  const intervalRef               = useRef(null)

  useEffect(() => {
    playSound('pointsEarned', role)
    if (tierUpgraded) {
      setTimeout(() => playSound('tierUpgraded', role), 1000)
    }

    // Auto-logout after full delay
    timerRef.current = setTimeout(() => {
      logoutService.executeClient()
    }, DELAY_MS)

    // FIX: countdown tick — decrements every second so the UI shows live "7… 6…"
    intervalRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(intervalRef.current)
          return 0
        }
        return c - 1
      })
    }, 1000)

    return () => {
      clearTimeout(timerRef.current)
      clearInterval(intervalRef.current)
    }
  }, [role, tierUpgraded])

  // FIX: "Leave now" handler — clears timers and logs out immediately
  const handleLeaveNow = () => {
    clearTimeout(timerRef.current)
    clearInterval(intervalRef.current)
    logoutService.executeClient()
  }

  // FIX: loyalty color lookup with fallback — backend could return an unexpected tier
  const LOYALTY_FALLBACK = {
    color:   COLORS.saffron?.DEFAULT ?? '#FF9F1C',
    bg:      COLORS.saffron?.soft    ?? '#FFF3DC',
    text:    COLORS.brew?.DEFAULT    ?? '#5C3317',
    DEFAULT: COLORS.saffron?.DEFAULT ?? '#FF9F1C',
  }
  const tierColor = (COLORS.loyalty?.[newTier] ?? LOYALTY_FALLBACK)

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-matcha-soft to-white
                 flex items-center justify-center p-6"
    >
      <ConfettiEffect trigger duration={5000} />

      <div className="text-center max-w-sm w-full space-y-6 animate-slide-up">

        {/* Success icon */}
        <div
          className="w-24 h-24 rounded-full bg-matcha flex items-center justify-center
                     mx-auto shadow-lg text-5xl animate-bounce-soft"
        >
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
            <p className="text-2xl font-bold text-brew">Rs {totalAmount}</p>
          </div>
        )}

        {/* Points earned */}
        {pointsEarned > 0 && (
          <div className="card flex items-center gap-3 bg-saffron-soft border-saffron/30">
            <div className="w-10 h-10 rounded-full bg-saffron/20 flex items-center justify-center flex-shrink-0">
              <Star
                size={20}
                color={COLORS.saffron?.DEFAULT ?? '#FF9F1C'}
                fill={COLORS.saffron?.DEFAULT  ?? '#FF9F1C'}
              />
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
              backgroundColor: tierColor.bg,
              borderColor:     tierColor.DEFAULT,
            }}
          >
            <Gift size={24} color={tierColor.DEFAULT} />
            <div className="text-left">
              <p className="font-bold" style={{ color: tierColor.text }}>
                🎉 Welcome to {newTier.charAt(0).toUpperCase() + newTier.slice(1)} Tier!
              </p>
              <p className="text-sm" style={{ color: tierColor.text }}>
                You now get{' '}
                {newTier === 'gold'
                  ? '15%'
                  : newTier === 'silver'
                  ? '10%'
                  : '5%'}{' '}
                discount
              </p>
            </div>
          </div>
        )}

        {/* FIX: live countdown + "Leave now" button */}
        <div className="space-y-3">
          <p className="text-brew-soft text-sm">
            {countdown > 0
              ? `Logging out automatically in ${countdown} second${countdown !== 1 ? 's' : ''}…`
              : 'Logging out…'}
          </p>
          <button
            onClick={handleLeaveNow}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl
                       border-2 border-brew-soft/30 text-brew-soft text-sm font-semibold
                       active:scale-95 transition-all"
          >
            <LogOut size={16} />
            Leave now
          </button>
        </div>

      </div>
    </div>
  )
}

export default PaymentSuccessPage