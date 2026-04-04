// src/modules/customer/pages/EsewaReturn.jsx
//
// Handles the frontend leg of eSewa return URLs.
//
// The backend /api/esewa/success verifies signature + marks order paid,
// THEN redirects to:
//   /payment/success?orderId=...&method=esewa&points=...&total=...  ← success
//   /payment?error=esewa_*                                           ← failure
//
// This component mounts at /payment/success (replace PaymentSuccessPage route)
// and reads the query params to populate the success state.
//
// ROUTE in AppRoutes.jsx:
//   <Route path="/payment/success" element={<EsewaReturn />} />
//   (replaces the old navigate(..., { state: {...} }) approach for eSewa)
//
// For cash/card, PaymentPage still uses navigate('/payment/success', { state })
// so both paths converge here.

import { useEffect, useRef, useState, useContext } from 'react'
import { useSearchParams, useNavigate }            from 'react-router-dom'
import { useLocation }                             from 'react-router-dom'
import { useSelector }                             from 'react-redux'
import { selectRole }                              from '@store/slices/authSlice'
import { ThemeContext }                            from '@shared/context/ThemeContext'
import { BRAND, FONTS, getPalette }                from '@shared/config/brand'
import ConfettiEffect                              from '@shared/components/effects/ConfettiEffect'
import logoutService                               from '../services/logoutService'
import { playSound }                               from '@shared/utils/soundPlayer'
import { Star, Gift, LogOut, CheckCircle2 }        from 'lucide-react'

const DELAY_MS = parseInt(import.meta.env.VITE_PAYMENT_LOGOUT_DELAY_MS || '8000')
const DELAY_S  = Math.ceil(DELAY_MS / 1000)

const EsewaReturn = () => {
  const { isDark }        = useContext(ThemeContext)
  const { state }         = useLocation()
  const [params]          = useSearchParams()
  const role              = useSelector(selectRole)
  const navigate          = useNavigate()
  const P                 = getPalette(isDark)

  // Resolve data from either:
  //   A) navigate('/payment/success', { state: {...} })  — cash/card path
  //   B) ?orderId=...&method=esewa&points=...&total=...  — eSewa redirect path
  const pointsEarned  = state?.pointsEarned  ?? parseInt(params.get('points')  || '0')
  const tierUpgraded  = state?.tierUpgraded  ?? false
  const newTier       = state?.newTier       ?? null
  const totalAmount   = state?.totalAmount   ?? parseFloat(params.get('total') || '0')
  const paymentMethod = state?.paymentMethod ?? params.get('method') ?? 'cash'

  const [countdown, setCountdown] = useState(DELAY_S)
  const timerRef    = useRef(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    playSound('pointsEarned', role)
    if (tierUpgraded) setTimeout(() => playSound('tierUpgraded', role), 1000)

    timerRef.current = setTimeout(() => logoutService.executeClient(), DELAY_MS)
    intervalRef.current = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(intervalRef.current); return 0 } return c - 1 })
    }, 1000)

    return () => { clearTimeout(timerRef.current); clearInterval(intervalRef.current) }
  }, [role, tierUpgraded])

  const handleLeaveNow = () => {
    clearTimeout(timerRef.current)
    clearInterval(intervalRef.current)
    logoutService.executeClient()
  }

  const TIER_COLORS = {
    bronze: { bg: 'var(--accent-dim)',   border: 'var(--accent-border)',  text: 'var(--accent)' },
    silver: { bg: 'var(--info-bg)',      border: 'var(--info-border)',    text: 'var(--info)'   },
    gold:   { bg: 'var(--loyalty-bg)',   border: 'var(--loyalty-border)', text: 'var(--loyalty-text)' },
  }
  const tierStyle = TIER_COLORS[newTier] ?? TIER_COLORS.bronze

  const METHOD_ICONS = {
    cash:  '💵',
    card:  '💳',
    esewa: '📱',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: FONTS.body,
    }}>
      <ConfettiEffect trigger duration={5000} />

      <div style={{
        textAlign: 'center', maxWidth: 384, width: '100%',
        display: 'flex', flexDirection: 'column', gap: 20,
        animation: 'psp-slideUp 0.5s ease-out both',
      }}>

        {/* Success icon */}
        <div style={{
          width: 96, height: 96, borderRadius: '50%',
          background: 'var(--success-bg)',
          border: '2px solid var(--success-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto', fontSize: 44,
          boxShadow: '0 8px 24px var(--success-bg)',
          animation: 'psp-bounce 2s ease-in-out infinite',
        }}>
          ✅
        </div>

        <div>
          <h1 style={{
            margin: 0, fontSize: 30, fontWeight: 800,
            letterSpacing: '-0.03em',
            fontFamily: FONTS.heading,
            color: 'var(--text-primary)',
          }}>
            Payment Done!
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-muted)', fontFamily: FONTS.body }}>
            Thank you for visiting {BRAND.name} {BRAND.emoji}
          </p>
        </div>

        {/* Method pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: 'var(--pill-bg)', border: '1px solid var(--pill-border)',
          borderRadius: 99, padding: '5px 14px',
          margin: '0 auto',
        }}>
          <span style={{ fontSize: 15 }}>{METHOD_ICONS[paymentMethod] ?? '💳'}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'capitalize', fontFamily: FONTS.body }}>
            Paid via {paymentMethod === 'esewa' ? 'eSewa' : paymentMethod}
          </span>
          <CheckCircle2 size={13} color="var(--success)" strokeWidth={2.5} />
        </div>

        {/* Total */}
        {totalAmount > 0 && (
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            borderRadius: 16, padding: '14px 20px', textAlign: 'center',
          }}>
            <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--text-muted)', fontFamily: FONTS.body }}>
              Total Paid
            </p>
            <p style={{
              margin: 0, fontSize: 28, fontWeight: 900,
              color: 'var(--text-primary)', letterSpacing: '-0.04em',
              fontFamily: FONTS.brand ?? FONTS.heading,
            }}>
              {BRAND.currency} {totalAmount}
            </p>
          </div>
        )}

        {/* Points */}
        {pointsEarned > 0 && (
          <div style={{
            background: 'var(--loyalty-bg)', border: '1px solid var(--loyalty-border)',
            borderRadius: 16, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--accent-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Star size={20} style={{ color: 'var(--accent)' }} fill="currentColor" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: 14, color: 'var(--loyalty-text)', fontFamily: FONTS.body }}>
                +{pointsEarned} Points Earned!
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--loyalty-sub-text)', fontFamily: FONTS.body }}>
                Added to your loyalty balance
              </p>
            </div>
          </div>
        )}

        {/* Tier upgrade */}
        {tierUpgraded && newTier && (
          <div style={{
            background: tierStyle.bg, border: `2px solid ${tierStyle.border}`,
            borderRadius: 16, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <Gift size={24} style={{ color: tierStyle.text, flexShrink: 0 }} />
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: 14, color: tierStyle.text, fontFamily: FONTS.body }}>
                🎉 Welcome to {newTier.charAt(0).toUpperCase() + newTier.slice(1)} Tier!
              </p>
              <p style={{ margin: 0, fontSize: 12, color: tierStyle.text, fontFamily: FONTS.body }}>
                You now get {{ gold: '15%', silver: '10%', bronze: '5%' }[newTier] ?? '5%'} discount
              </p>
            </div>
          </div>
        )}

        {/* Countdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-muted)', fontFamily: FONTS.body }}>
            {countdown > 0
              ? `Logging out in ${countdown}s…`
              : 'Logging out…'}
          </p>
          <button
            onClick={handleLeaveNow}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              padding: '13px 20px', borderRadius: 14,
              border: '1.5px solid var(--card-border)',
              background: 'var(--pill-bg)', color: 'var(--text-secondary)',
              fontSize: 13.5, fontWeight: 600, fontFamily: FONTS.body,
              cursor: 'pointer', transition: 'transform 0.15s',
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
            onMouseUp={e   => { e.currentTarget.style.transform = 'scale(1)'    }}
          >
            <LogOut size={16} /> Leave now
          </button>
        </div>
      </div>

      <style>{`
        @keyframes psp-slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes psp-bounce {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  )
}

export default EsewaReturn