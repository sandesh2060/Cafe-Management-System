// frontend/src/modules/customer/components/pricing/HappyHourBanner.jsx
//
// Module 22 — Happy Hour Banner
//
// Shows at the top of MenuPage when any time-based pricing rule is active.
// Features:
//   - Fetches active rules from GET /api/pricing-rules/active?cafeId=xxx
//   - Live countdown timer to rule expiry (updates every second)
//   - Dismissible per session (sessionStorage)
//   - Listens to socket events: pricing:rule_activated / pricing:rule_expired
//   - GSAP slide-down entrance + slide-up dismiss
//
// Place below the navbar island in MenuPage — same portal pattern as
// RemoteOrderBanner.

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { FONTS, BRAND } from '@shared/config/brand'
import api from '@api/axios'
import { getSocket } from '@shared/services/socket.service'
import { X, Clock, Tag } from 'lucide-react'

// ── Format seconds → HH:MM:SS or MM:SS ───────────────────────────────────────
const fmtCountdown = (secs) => {
  if (!secs || secs <= 0) return null
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

// ── Dismiss key: once per session per rule ────────────────────────────────────
const DISMISS_KEY = (id) => `hh_dismissed_${id}`
const isDismissed = (id) => !!sessionStorage.getItem(DISMISS_KEY(id))
const setDismissed = (id) => sessionStorage.setItem(DISMISS_KEY(id), '1')

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
const HappyHourBanner = ({ cafeId, navbarRef }) => {
  const [rules,    setRules]    = useState([])   // active rules
  const [active,   setActive]   = useState(null) // currently displayed rule
  const [countdown, setCountdown] = useState(null)
  const [dismissed, setDismissedState] = useState(false)

  const bannerRef = useRef(null)
  const timerRef  = useRef(null)

  // ── Load active rules ────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!cafeId) return
    try {
      const r = await api.get(`/pricing-rules/active?cafeId=${cafeId}`)
      const list = r.rules ?? r.data?.rules ?? []
      setRules(list)
    } catch {}
  }, [cafeId])

  useEffect(() => { load() }, [load])

  // ── Pick the most relevant undismissed rule ──────────────────────────────
  useEffect(() => {
    const undismissed = rules.filter(r => !isDismissed(r._id))
    // Priority: happy_hour first, then any time-based rule with countdown
    const best = undismissed.find(r => r.type === 'happy_hour' && r.secondsRemaining)
      ?? undismissed.find(r => r.secondsRemaining)
      ?? undismissed[0]
      ?? null
    setActive(best)
    setDismissedState(false)
  }, [rules])

  // ── GSAP entrance / exit ──────────────────────────────────────────────────
  useEffect(() => {
    if (!bannerRef.current) return
    if (active && !dismissed) {
      gsap.fromTo(bannerRef.current,
        { height: 0, opacity: 0, y: -8 },
        { height: 'auto', opacity: 1, y: 0, duration: 0.38, ease: 'power3.out' }
      )
    }
  }, [active, dismissed])

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!active?.secondsRemaining) { setCountdown(null); return }

    let secs = active.secondsRemaining
    setCountdown(secs)

    timerRef.current = setInterval(() => {
      secs -= 1
      if (secs <= 0) {
        clearInterval(timerRef.current)
        setCountdown(null)
        // Rule expired — remove it
        setRules(prev => prev.filter(r => r._id !== active._id))
      } else {
        setCountdown(secs)
      }
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [active?._id, active?.secondsRemaining])

  // ── Socket events ─────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const onActivated = (data) => {
      // Reload rules when a new one activates
      load()
    }

    const onExpired = (data) => {
      setRules(prev => prev.filter(r => r._id.toString() !== data.ruleId?.toString()))
    }

    socket.on('pricing:rule_activated', onActivated)
    socket.on('pricing:rule_expired',   onExpired)
    return () => {
      socket.off('pricing:rule_activated', onActivated)
      socket.off('pricing:rule_expired',   onExpired)
    }
  }, [load])

  // ── Dismiss ───────────────────────────────────────────────────────────────
  const dismiss = useCallback(() => {
    if (!bannerRef.current || !active) return
    gsap.to(bannerRef.current, {
      height: 0, opacity: 0, y: -8, duration: 0.28, ease: 'power2.in',
      onComplete: () => {
        setDismissed(active._id)
        setDismissedState(true)
      },
    })
  }, [active])

  if (!active || dismissed) return null

  // ── Rule description ──────────────────────────────────────────────────────
  const discountLabel = active.discountType === 'percentage'
    ? `${active.discountValue}% off`
    : active.discountType === 'fixed_amount'
    ? `${BRAND.currency} ${active.discountValue} off`
    : 'Special price'

  const scopeLabel = active.scope === 'all'
    ? 'all items'
    : active.scope === 'category'
    ? (active.targetCategories?.join(', ') ?? 'selected categories')
    : 'selected items'

  const typeEmoji = {
    happy_hour:   '🎉',
    day_of_week:  '📅',
    date_range:   '🎊',
    combo:        '🍱',
    surcharge:    '⚡',
    loyalty_tier: '⭐',
    min_order:    '🛒',
    quantity:     '📦',
  }[active.type] ?? '✨'

  return createPortal(
    <div ref={bannerRef}
      style={{
        overflow: 'hidden',
        position: 'fixed',
        left: 0, right: 0,
        top: 'calc(env(safe-area-inset-top, 0px) + 72px)', // below navbar island
        zIndex: 48,
        pointerEvents: 'auto',
      }}>
      <div style={{
        margin: '0 12px 4px',
        borderRadius: 14,
        background: 'linear-gradient(135deg, #FF9F1C 0%, #E05C2A 100%)',
        boxShadow: '0 4px 20px rgba(255,159,28,0.4)',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        {/* Emoji */}
        <span style={{ fontSize: 18, flexShrink: 0 }}>{typeEmoji}</span>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#fff', fontFamily: FONTS.heading, lineHeight: 1.2 }}>
            {active.name}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: FONTS.body, marginTop: 2 }}>
            {discountLabel} on {scopeLabel}
          </p>
        </div>

        {/* Countdown */}
        {countdown && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 20,
            background: 'rgba(0,0,0,0.2)',
            flexShrink: 0,
          }}>
            <Clock size={11} style={{ color: '#fff' }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', fontFamily: FONTS.mono, letterSpacing: '0.05em' }}>
              {fmtCountdown(countdown)}
            </span>
          </div>
        )}

        {/* Dismiss */}
        <button onClick={dismiss} style={{
          background: 'rgba(0,0,0,0.15)', border: 'none', borderRadius: 8,
          width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#fff', flexShrink: 0,
          WebkitTapHighlightColor: 'transparent',
        }}>
          <X size={12} />
        </button>
      </div>
    </div>,
    document.body
  )
}

export default HappyHourBanner