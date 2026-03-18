// src/modules/customer/pages/PaymentSuccessPage.jsx
//
// ✅ useContext(ThemeContext) added — page had no dark mode awareness
// ✅ All Tailwind color classes (bg-matcha, text-brew, bg-saffron-soft etc.)
//    replaced with var(--token) inline styles
// ✅ COLORS import removed — all icon colors use var(--accent) / var(--success)
// ✅ BRAND.name replaces hardcoded 'कौसी चिया'
// ✅ BRAND.currency replaces hardcoded 'Rs' in total display
// ✅ Tier color lookup uses brand palette tokens instead of COLORS.loyalty
// ✅ Live countdown, leave-now button, sound logic all unchanged

import { useEffect, useRef, useState, useContext } from 'react'
import { useLocation }                              from 'react-router-dom'
import { useSelector }                              from 'react-redux'
import { selectRole }                               from '@store/slices/authSlice'
import { ThemeContext }                             from '@shared/context/ThemeContext'
import { BRAND, getPalette }                        from '@shared/config/brand'
import ConfettiEffect                               from '@shared/components/effects/ConfettiEffect'
import logoutService                                from '../services/logoutService'
import { playSound }                                from '@shared/utils/soundPlayer'
import { Star, Gift, LogOut }                       from 'lucide-react'

const DELAY_MS = parseInt(import.meta.env.VITE_PAYMENT_LOGOUT_DELAY_MS || '8000')
const DELAY_S  = Math.ceil(DELAY_MS / 1000)

const PaymentSuccessPage = () => {
  const { isDark }  = useContext(ThemeContext)
  const { state }   = useLocation()
  const role        = useSelector(selectRole)

  const {
    pointsEarned = 0,
    tierUpgraded = false,
    newTier      = null,
    totalAmount  = 0,
  } = state || {}

  const [countdown, setCountdown] = useState(DELAY_S)
  const timerRef                  = useRef(null)
  const intervalRef               = useRef(null)

  useEffect(() => {
    playSound('pointsEarned', role)
    if (tierUpgraded) {
      setTimeout(() => playSound('tierUpgraded', role), 1000)
    }

    timerRef.current = setTimeout(() => {
      logoutService.executeClient()
    }, DELAY_MS)

    intervalRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(intervalRef.current); return 0 }
        return c - 1
      })
    }, 1000)

    return () => {
      clearTimeout(timerRef.current)
      clearInterval(intervalRef.current)
    }
  }, [role, tierUpgraded])

  const handleLeaveNow = () => {
    clearTimeout(timerRef.current)
    clearInterval(intervalRef.current)
    logoutService.executeClient()
  }

  // ✅ Tier colors from brand palette instead of COLORS.loyalty lookup
  // Maps tier names to brand token suffixes — fully dynamic
  const TIER_COLORS = {
    bronze: { bg: 'var(--accent-dim)',   border: 'var(--accent-border)',  text: 'var(--accent)'    },
    silver: { bg: 'var(--info-bg)',      border: 'var(--info-border)',    text: 'var(--info)'      },
    gold:   { bg: 'var(--loyalty-bg)',   border: 'var(--loyalty-border)', text: 'var(--loyalty-text)' },
  }
  const tierStyle = TIER_COLORS[newTier] ?? TIER_COLORS.bronze

  const discountByTier = { gold: '15%', silver: '10%', bronze: '5%' }

  return (
    <div style={{
      minHeight: '100vh',
      // ✅ var(--bg) — was bg-gradient-to-br from-matcha-soft to-white
      background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <ConfettiEffect trigger duration={5000} />

      <div style={{
        textAlign: 'center', maxWidth: 384, width: '100%',
        display: 'flex', flexDirection: 'column', gap: 24,
        animation: 'slideUp 0.5s ease-out both',
      }}>

        {/* Success icon */}
        <div style={{
          width: 96, height: 96, borderRadius: '50%',
          // ✅ var(--success-bg) — was bg-matcha
          background: 'var(--success-bg)',
          border: '2px solid var(--success-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto',
          fontSize: 44,
          boxShadow: '0 8px 24px var(--success-bg)',
          animation: 'bounceSoft 2s ease-in-out infinite',
        }}>
          ✅
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{
            margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em',
            // ✅ var(--text-primary) — was text-brew
            color: 'var(--text-primary)',
          }}>
            Payment Done!
          </h1>
          {/* ✅ BRAND.name replaces hardcoded 'कौसी चिया' */}
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>
            Thank you for visiting {BRAND.name} {BRAND.emoji}
          </p>
        </div>

        {/* Total */}
        {totalAmount > 0 && (
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 16, padding: '14px 20px',
            textAlign: 'center',
          }}>
            <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--text-muted)' }}>
              Total Paid
            </p>
            {/* ✅ BRAND.currency replaces hardcoded 'Rs' */}
            <p style={{
              margin: 0, fontSize: 26, fontWeight: 800,
              color: 'var(--text-primary)', letterSpacing: '-0.02em',
            }}>
              {BRAND.currency} {totalAmount}
            </p>
          </div>
        )}

        {/* Points earned */}
        {pointsEarned > 0 && (
          <div style={{
            background: 'var(--loyalty-bg)',
            border: '1px solid var(--loyalty-border)',
            borderRadius: 16, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--accent-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {/* ✅ var(--accent) — was COLORS.saffron?.DEFAULT */}
              <Star size={20} style={{ color: 'var(--accent)' }} fill="currentColor" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{
                margin: '0 0 2px', fontWeight: 800, fontSize: 14,
                color: 'var(--loyalty-text)',
              }}>
                +{pointsEarned} Points Earned!
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--loyalty-sub-text)' }}>
                Added to your loyalty balance
              </p>
            </div>
          </div>
        )}

        {/* Tier upgrade — ✅ tierStyle uses var(--token) instead of COLORS.loyalty */}
        {tierUpgraded && newTier && (
          <div style={{
            background: tierStyle.bg,
            border: `2px solid ${tierStyle.border}`,
            borderRadius: 16, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            {/* ✅ color from tierStyle.text — no COLORS import needed */}
            <Gift size={24} style={{ color: tierStyle.text, flexShrink: 0 }} />
            <div style={{ textAlign: 'left' }}>
              <p style={{
                margin: '0 0 2px', fontWeight: 800, fontSize: 14,
                color: tierStyle.text,
              }}>
                🎉 Welcome to {newTier.charAt(0).toUpperCase() + newTier.slice(1)} Tier!
              </p>
              <p style={{ margin: 0, fontSize: 12, color: tierStyle.text }}>
                You now get {discountByTier[newTier] ?? '5%'} discount
              </p>
            </div>
          </div>
        )}

        {/* Live countdown + leave now */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-muted)' }}>
            {countdown > 0
              ? `Logging out automatically in ${countdown} second${countdown !== 1 ? 's' : ''}…`
              : 'Logging out…'}
          </p>
          <button
            onClick={handleLeaveNow}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              padding: '13px 20px', borderRadius: 14,
              // ✅ var(--card-border) — was border-brew-soft/30
              border: '1.5px solid var(--card-border)',
              // ✅ var(--pill-bg) — was transparent
              background: 'var(--pill-bg)',
              color: 'var(--text-secondary)',
              fontSize: 13.5, fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.15s, background 0.15s',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <LogOut size={16} />
            Leave now
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounceSoft {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  )
}

export default PaymentSuccessPage