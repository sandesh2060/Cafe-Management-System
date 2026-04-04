// src/modules/customer/pages/PaymentSuccessPage.jsx
//
// ─── MODULE 21 CHANGES ────────────────────────────────────────────────────────
// ★ FeedbackSheet wired in:
//   - Auto-prompts 1.5s after page mounts (enough time for confetti animation)
//   - orderId read from location.state (set by payment success flow)
//   - Order reconstructed from state for FeedbackSheet's item display
//   - Auto-logout countdown pauses while FeedbackSheet is open,
//     resumes from where it left off when dismissed
//   - If orderId not in state, feedback prompt is silently skipped
//
// ALL other logic — confetti, countdown, tier upgrade, leave now — IDENTICAL
// ─────────────────────────────────────────────────────────────────────────────

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
// ★ NEW
import FeedbackSheet from '../components/feedback/FeedbackSheet'

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
    // ★ orderId + order items passed from payment success flow
    orderId      = null,
    order        = null,
  } = state || {}

  const [countdown,     setCountdown]     = useState(DELAY_S)
  // ★ Feedback state
  const [feedbackOpen,  setFeedbackOpen]  = useState(false)
  const [feedbackDone,  setFeedbackDone]  = useState(false)

  const timerRef    = useRef(null)
  const intervalRef = useRef(null)
  const pausedRef   = useRef(false)
  const remainingRef = useRef(DELAY_MS)
  const lastTickRef  = useRef(Date.now())

  // ── Auto-logout with pause-on-feedback support ────────────────────────────
  useEffect(() => {
    playSound('pointsEarned', role)
    if (tierUpgraded) setTimeout(() => playSound('tierUpgraded', role), 1000)

    const startCountdown = () => {
      lastTickRef.current = Date.now()
      timerRef.current = setTimeout(() => {
        logoutService.executeClient()
      }, remainingRef.current)

      intervalRef.current = setInterval(() => {
        if (pausedRef.current) return
        const now     = Date.now()
        const elapsed = now - lastTickRef.current
        lastTickRef.current = now
        remainingRef.current = Math.max(0, remainingRef.current - elapsed)
        setCountdown(c => {
          if (c <= 1) { clearInterval(intervalRef.current); return 0 }
          return c - 1
        })
      }, 1000)
    }

    // ★ Show feedback prompt after 1.5s, then start countdown
    const feedbackDelay = orderId ? 1500 : 0
    const feedbackTimer = setTimeout(() => {
      if (orderId && !feedbackDone) setFeedbackOpen(true)
      startCountdown()
    }, feedbackDelay)

    return () => {
      clearTimeout(feedbackTimer)
      clearTimeout(timerRef.current)
      clearInterval(intervalRef.current)
    }
  }, [role, tierUpgraded]) // eslint-disable-line

  // ★ Pause countdown when feedback sheet is open
  useEffect(() => {
    if (feedbackOpen) {
      pausedRef.current = true
      clearTimeout(timerRef.current)
    } else {
      pausedRef.current = false
      // Resume countdown from where it left off
      if (remainingRef.current > 0) {
        lastTickRef.current = Date.now()
        timerRef.current = setTimeout(() => {
          logoutService.executeClient()
        }, remainingRef.current)
      }
    }
  }, [feedbackOpen])

  const handleLeaveNow = () => {
    clearTimeout(timerRef.current)
    clearInterval(intervalRef.current)
    logoutService.executeClient()
  }

  const TIER_COLORS = {
    bronze: { bg: 'var(--accent-dim)',   border: 'var(--accent-border)',  text: 'var(--accent)'    },
    silver: { bg: 'var(--info-bg)',      border: 'var(--info-border)',    text: 'var(--info)'      },
    gold:   { bg: 'var(--loyalty-bg)',   border: 'var(--loyalty-border)', text: 'var(--loyalty-text)' },
  }
  const tierStyle = TIER_COLORS[newTier] ?? TIER_COLORS.bronze
  const discountByTier = { gold: '15%', silver: '10%', bronze: '5%' }

  // ★ Reconstruct minimal order object for FeedbackSheet
  const feedbackOrder = order ?? (orderId ? { _id: orderId, items: [] } : null)

  return (
    <div style={{
      minHeight: '100vh',
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
            color: 'var(--text-primary)',
          }}>
            Payment Done!
          </h1>
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

        {/* ★ Feedback prompt card — shown if orderId available + not done */}
        {orderId && !feedbackDone && (
          <div style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 16, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
            cursor: 'pointer',
          }}
            onClick={() => setFeedbackOpen(true)}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>⭐</span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                How was your order?
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                Tap to rate — takes 30 seconds
              </p>
            </div>
            <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 700 }}>Rate →</span>
          </div>
        )}

        {/* Feedback submitted confirmation */}
        {feedbackDone && (
          <div style={{
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 16, padding: '12px 16px',
            fontSize: 13, color: '#10B981', fontWeight: 600,
          }}>
            ✅ Feedback submitted — thank you!
          </div>
        )}

        {/* Tier upgrade */}
        {tierUpgraded && newTier && (
          <div style={{
            background: tierStyle.bg,
            border: `2px solid ${tierStyle.border}`,
            borderRadius: 16, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
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
            {feedbackOpen
              ? 'Auto-logout paused while rating…'
              : countdown > 0
              ? `Logging out automatically in ${countdown} second${countdown !== 1 ? 's' : ''}…`
              : 'Logging out…'}
          </p>
          <button
            onClick={handleLeaveNow}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              padding: '13px 20px', borderRadius: 14,
              border: '1.5px solid var(--card-border)',
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

      {/* ★ FeedbackSheet */}
      {feedbackOrder && (
        <FeedbackSheet
          isOpen={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          order={feedbackOrder}
          onSuccess={() => {
            setFeedbackDone(true)
            setFeedbackOpen(false)
          }}
        />
      )}

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