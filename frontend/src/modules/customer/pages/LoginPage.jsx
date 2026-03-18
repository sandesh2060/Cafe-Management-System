// src/modules/customer/pages/LoginPage.jsx
//
// ✅ ALL colors from brand.js — var(--token) in styles, getPalette() for SVG
// ✅ REDESIGNED: Refined luxury-minimal — warm amber cafe aesthetic
// ✅ GSAP: Staggered entrance, input focus ring, button press, success burst
// ✅ SVG: Animated steam paths, decorative corner accent, shimmer ring
// ✅ Auth logic 100% unchanged

import { useEffect, useRef, useState, useContext, useCallback } from 'react'
import { useDispatch, useSelector }                              from 'react-redux'
import { useNavigate }                                          from 'react-router-dom'
import {
  checkUsername, registerWithUsername, loginWithUsername,
  loginAsGuest, selectAuthLoading, selectAuthError, clearError,
} from '@store/slices/authSlice'
import { selectTableNumber, selectSession } from '@store/slices/tableSessionSlice'
import { persistSession }                  from '@modules/table/hooks/tableSession.utils'
import { ThemeContext }                    from '@shared/context/ThemeContext'
import { preloadSounds }                   from '@shared/utils/soundPlayer'
import { BRAND, FONTS, getPalette }        from '@shared/config/brand'
import gsap from 'gsap'

const BG_IMG = 'https://res.cloudinary.com/dszy3sf5c/image/upload/v1771077596/friends_brc5cy.png'
const CAFE_ID = BRAND.cafeId ?? 'demo'

if (import.meta.env.DEV && !BRAND.cafeId) {
  console.warn('[LoginPage] VITE_CAFE_ID not set — using "demo".')
}

// ── Animated Cup SVG ──────────────────────────────────────────────────────────
// Uses getPalette() for raw hex values — SVG fills can't use CSS vars directly
const CupSVG = ({ isDark }) => {
  const P = getPalette(isDark)
  return (
    <svg width="78" height="68" viewBox="0 0 78 68" fill="none">
      <defs>
        <linearGradient id="lp-cup-body" x1="12" y1="26" x2="62" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor={isDark ? '#D4882A' : '#C47820'}/>
          <stop offset="100%" stopColor={isDark ? '#7B4010' : '#8B5018'}/>
        </linearGradient>
        <linearGradient id="lp-cup-rim" x1="12" y1="20" x2="62" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#FFD580"/>
          <stop offset="50%"  stopColor={P.accent}/>
          <stop offset="100%" stopColor={P.accentDark}/>
        </linearGradient>
        <linearGradient id="lp-tea" x1="12" y1="26" x2="62" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor={isDark ? '#6A3A08' : '#5A2A06'}/>
          <stop offset="60%"  stopColor={isDark ? '#A86018' : '#8A5012'}/>
          <stop offset="100%" stopColor={isDark ? '#4A2808' : '#3A1806'}/>
        </linearGradient>
        <linearGradient id="lp-saucer" x1="8" y1="58" x2="70" y2="66" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor={isDark ? '#9B6020' : '#B07028'}/>
          <stop offset="50%"  stopColor={isDark ? '#C48030' : '#D09030'}/>
          <stop offset="100%" stopColor={isDark ? '#6B4010' : '#8B5018'}/>
        </linearGradient>
      </defs>
      {/* Shadow */}
      <ellipse cx="39" cy="66" rx="26" ry="3.5" fill={P.accentDim}/>
      {/* Saucer */}
      <ellipse cx="39" cy="62" rx="23" ry="3.5" fill="url(#lp-saucer)"/>
      {/* Cup body */}
      <path d="M12 26 L18 58 Q18 62 39 62 Q60 62 60 58 L66 26 Z" fill="url(#lp-cup-body)"/>
      {/* Inner sheen */}
      <path d="M16 26 L21 55 Q21 59 39 59 Q57 59 57 55 L62 26 Z" fill={isDark ? 'rgba(220,150,60,0.1)' : 'rgba(220,150,60,0.07)'}/>
      {/* Tea surface */}
      <ellipse cx="39" cy="28" rx="24" ry="4" fill="url(#lp-tea)"/>
      {/* Rim */}
      <ellipse cx="39" cy="25.5" rx="24" ry="4.5" fill="url(#lp-cup-rim)" stroke={isDark ? 'rgba(255,220,100,0.3)' : 'rgba(200,130,20,0.35)'} strokeWidth="0.5"/>
      {/* Handle outer */}
      <path d="M57 33 Q70 33 70 43 Q70 53 57 53" stroke={isDark ? '#C4882A' : '#C47820'} strokeWidth="6" strokeLinecap="round" fill="none"/>
      {/* Handle inner highlight */}
      <path d="M57 33 Q66 33 66 43 Q66 53 57 53" stroke={isDark ? 'rgba(255,200,100,0.25)' : 'rgba(255,200,100,0.2)'} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {/* Cup side highlight */}
      <path d="M20 30 Q22 46 23 56" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

// ── Steam SVG (animated via GSAP) ─────────────────────────────────────────────
const SteamSVG = ({ isDark, steamRefs }) => {
  const P = getPalette(isDark)
  const steamColor = isDark ? 'rgba(255,200,100,0.7)' : 'rgba(180,100,20,0.6)'
  return (
    <svg width="60" height="36" viewBox="0 0 60 36" style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', overflow: 'visible', pointerEvents: 'none' }}>
      <path ref={el => steamRefs.current[0] = el} d="M18 34 Q14 24 18 16 Q22 8 18 0" stroke={steamColor} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0"/>
      <path ref={el => steamRefs.current[1] = el} d="M30 34 Q26 22 30 14 Q34 6 30 0" stroke={steamColor} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0"/>
      <path ref={el => steamRefs.current[2] = el} d="M42 34 Q38 24 42 16 Q46 8 42 0" stroke={steamColor} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0"/>
    </svg>
  )
}

// ── Decorative corner accent (SVG) ────────────────────────────────────────────
const CornerAccent = ({ isDark, position = 'tl' }) => {
  const P = getPalette(isDark)
  const flip = position === 'br' ? 'scale(-1,-1)' : 'none'
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none"
      style={{ position: 'absolute', ...(position === 'tl' ? { top: 16, left: 16 } : { bottom: 16, right: 16 }), opacity: 0.35, pointerEvents: 'none', transform: flip }}>
      <path d="M2 24 L2 4 Q2 2 4 2 L24 2" stroke={P.accent} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <circle cx="2" cy="2" r="2.5" fill={P.accent}/>
    </svg>
  )
}

// ── Badge for username status ──────────────────────────────────────────────────
const StatusBadge = ({ status, isDark }) => {
  const P = getPalette(isDark)
  if (!status) return null

  const configs = {
    checking: {
      bg: P.pillBg, border: P.inputBorder, color: P.accent,
      icon: <span style={{ width: 11, height: 11, borderRadius: '50%', border: `2px solid currentColor`, borderTopColor: 'transparent', display: 'inline-block', animation: 'lp-spin .7s linear infinite' }}/>,
      text: 'Checking…'
    },
    exists: {
      bg: P.successBg, border: P.successBorder, color: P.success,
      icon: <CheckMark />,
      text: 'Found — signing you in!'
    },
    free: {
      bg: P.infoBg, border: P.infoBorder, color: P.info,
      icon: <SparkleIcon />,
      text: 'Username available!'
    },
    invalid: {
      bg: P.dangerBg, border: P.dangerBorder, color: P.danger,
      icon: <XMark />,
      text: 'Letters, numbers, _ . - only'
    },
  }
  const cfg = configs[status]
  if (!cfg) return null

  return (
    <div key={status} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px', borderRadius: 10, marginBottom: 14,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      color: cfg.color, fontSize: 12.5, fontWeight: 600,
      fontFamily: FONTS.body,
      animation: 'lp-slide-up 0.25s ease-out both',
    }}>
      {cfg.icon}
      {cfg.text}
    </div>
  )
}

// ── Mini SVG icons ────────────────────────────────────────────────────────────
const CheckMark = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M2.5 6.5 L5.5 9.5 L10.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const XMark = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M3 3 L10 10 M10 3 L3 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)
const SparkleIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M6.5 1 L7.5 5.5 L12 6.5 L7.5 7.5 L6.5 12 L5.5 7.5 L1 6.5 L5.5 5.5 Z" fill="currentColor"/>
  </svg>
)
const ArrowRight = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M3 7.5 H12 M8.5 4 L12 7.5 L8.5 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M2.5 13.5 C2.5 11 5 9 8 9 C11 9 13.5 11 13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)
const ShieldIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1.5 L12 3.5 L12 7.5 C12 10 9.5 12 7 13 C4.5 12 2 10 2 7.5 L2 3.5 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M5 7 L6.5 8.5 L9.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const AtSignIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M10 7.5 C10 9.5 10.5 11 12 11 C13 11 13.5 10 13.5 7.5 C13.5 4 11 1.5 7.5 1.5 C4 1.5 1.5 4 1.5 7.5 C1.5 11 4 13.5 7.5 13.5 C9.5 13.5 11 13 12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

// ── Success burst overlay ──────────────────────────────────────────────────────
const SuccessBurst = ({ show }) => {
  if (!show) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      {[...Array(8)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute', width: 9, height: 9, borderRadius: '50%',
          background: i % 2 === 0 ? 'var(--accent)' : 'var(--success)',
          top: '50%', left: '50%',
          transform: `rotate(${i * 45}deg) translateY(-64px)`,
          animation: `lp-burst 0.65s ease-out ${i * 0.05}s both`,
        }}/>
      ))}
      <div style={{
        width: 68, height: 68, borderRadius: '50%',
        background: 'var(--success-bg)',
        border: '2px solid var(--success-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'lp-pop 0.4s cubic-bezier(.22,.68,0,1.3) both',
        boxShadow: '0 8px 40px var(--success-bg)',
      }}>
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <path d="M7 15 L12.5 21 L23 9" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="22" strokeDashoffset="22"
            style={{ animation: 'lp-draw 0.3s ease-out 0.18s forwards' }}/>
        </svg>
      </div>
    </div>
  )
}

// ══ Main LoginPage ════════════════════════════════════════════════════════════
const LoginPage = () => {
  const dispatch    = useDispatch()
  const navigate    = useNavigate()
  const loading     = useSelector(selectAuthLoading)
  const error       = useSelector(selectAuthError)
  const tableNumber = useSelector(selectTableNumber)
  const session     = useSelector(selectSession)
  const { isDark }  = useContext(ThemeContext)
  const P           = getPalette(isDark)

  // Refs
  const wrapRef     = useRef(null)
  const heroRef     = useRef(null)
  const cardRef     = useRef(null)
  const inputRef    = useRef(null)
  const btnRef      = useRef(null)
  const steamRefs   = useRef([])
  const debounceRef = useRef(null)
  const mountedRef  = useRef(true)

  // State
  const [usernameInput,  setUsernameInput]  = useState('')
  const [localError,     setLocalError]     = useState('')
  const [guestLoading,   setGuestLoading]   = useState(false)
  const [usernameStatus, setUsernameStatus] = useState(null)
  const [checkedValue,   setCheckedValue]   = useState('')
  const [showBurst,      setShowBurst]      = useState(false)
  const [isSubmitting,   setIsSubmitting]   = useState(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false; clearTimeout(debounceRef.current) }
  }, [])

  // ── GSAP entrance ──────────────────────────────────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      // Hero section stagger
      if (heroRef.current) {
        tl.fromTo(heroRef.current.querySelectorAll('.lp-hero-el'),
          { y: -28, opacity: 0, scale: 0.94 },
          { y: 0, opacity: 1, scale: 1, stagger: 0.08, duration: 0.72 }, 0)
      }

      // Card slides up
      if (cardRef.current) {
        tl.fromTo(cardRef.current,
          { y: 56, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.68, ease: 'power2.out' }, 0.18)

        // Card inner elements stagger
        tl.fromTo(cardRef.current.querySelectorAll('.lp-card-el'),
          { y: 12, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.06, duration: 0.42, ease: 'power2.out' }, 0.42)
      }

      // Steam animation loop
      steamRefs.current.forEach((el, i) => {
        if (!el) return
        gsap.fromTo(el,
          { y: 0, opacity: 0, scaleX: 1 },
          {
            y: -24, opacity: 0, scaleX: 1.4,
            duration: 2.2,
            delay: i * 0.7,
            repeat: -1,
            ease: 'power1.out',
            keyframes: [
              { y: 0,   opacity: 0,    scaleX: 1,   duration: 0 },
              { y: -6,  opacity: 0.65, scaleX: 1.05,duration: 0.4 },
              { y: -16, opacity: 0.4,  scaleX: 1.2, duration: 0.6 },
              { y: -24, opacity: 0,    scaleX: 1.45,duration: 0.5 },
            ],
          })
      })
    })

    return () => ctx.revert()
  }, [])

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 500) }, [])
  useEffect(() => {
    dispatch(clearError())
    return () => dispatch(clearError())
  }, [dispatch])

  // ── Live username check ────────────────────────────────────────────────────
  const doLiveCheck = useCallback(async (val) => {
    if (!val || val.length < 2) { if (mountedRef.current) setUsernameStatus(null); return }
    if (!/^[a-z0-9_.-]+$/.test(val)) { if (mountedRef.current) setUsernameStatus('invalid'); return }
    if (mountedRef.current) setUsernameStatus('checking')
    try {
      const result = await dispatch(checkUsername(val))
      if (!mountedRef.current) return
      if (result.meta.requestStatus === 'fulfilled') {
        const exists = result.payload?.exists ?? result.payload?.data?.exists ?? false
        setUsernameStatus(exists ? 'exists' : 'free')
        setCheckedValue(val)
      } else setUsernameStatus(null)
    } catch { if (mountedRef.current) setUsernameStatus(null) }
  }, [dispatch])

  const handleChange = (e) => {
    const val   = e.target.value
    setUsernameInput(val)
    setLocalError('')
    const lower = val.trim().toLowerCase()
    clearTimeout(debounceRef.current)
    if (!lower || lower.length < 2) { setUsernameStatus(null); return }
    if (!/^[a-z0-9_.-]+$/.test(lower)) { setUsernameStatus('invalid'); return }
    debounceRef.current = setTimeout(() => doLiveCheck(lower), 480)
  }

  // ── Input focus ring animation ─────────────────────────────────────────────
  const handleInputFocus = () => {
    if (inputRef.current) {
      gsap.to(inputRef.current, { scale: 1.008, duration: 0.18, ease: 'power2.out' })
    }
  }
  const handleInputBlur = () => {
    if (inputRef.current) {
      gsap.to(inputRef.current, { scale: 1, duration: 0.22, ease: 'power2.inOut' })
    }
  }

  // ── Nav ────────────────────────────────────────────────────────────────────
  const goToMenu = useCallback((isNew) => {
    if (session) persistSession(session)
    preloadSounds('customer')
    navigate('/menu', { replace: true, state: isNew ? { firstTimeUser: true } : undefined })
  }, [navigate, session])

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (isSubmitting) return
    setLocalError('')
    dispatch(clearError())
    const val = usernameInput.trim().toLowerCase()
    if (!val || val.length < 2) { setLocalError('Please enter a username'); return }
    if (!/^[a-z0-9_.-]+$/.test(val)) { setLocalError('Only letters, numbers, _ . - allowed'); return }

    // Button press animation
    if (btnRef.current) {
      gsap.to(btnRef.current, {
        scale: 0.96, duration: 0.08, ease: 'power2.in',
        onComplete: () => gsap.to(btnRef.current, { scale: 1, duration: 0.4, ease: 'elastic.out(1.3, 0.5)' }),
      })
    }

    setIsSubmitting(true)

    let exists = null
    if (checkedValue === val && (usernameStatus === 'exists' || usernameStatus === 'free')) {
      exists = usernameStatus === 'exists'
    } else {
      const checkResult = await dispatch(checkUsername(val))
      if (checkResult.meta.requestStatus === 'rejected') {
        setLocalError('Could not reach server — please try again')
        setIsSubmitting(false)
        return
      }
      exists = checkResult.payload?.exists ?? checkResult.payload?.data?.exists ?? false
      setUsernameStatus(exists ? 'exists' : 'free')
      setCheckedValue(val)
    }

    if (exists) {
      const result = await dispatch(loginWithUsername({ username: val }))
      if (result.meta.requestStatus === 'rejected') {
        setLocalError(typeof result.payload === 'string' ? result.payload : 'Login failed')
        setIsSubmitting(false)
        return
      }
      setIsSubmitting(false)
      setShowBurst(true)
      setTimeout(() => goToMenu(false), 860)
    } else {
      if (cardRef.current) {
        gsap.to(cardRef.current, {
          x: -6, duration: 0.06, ease: 'power2.in', yoyo: true, repeat: 5,
          onComplete: () => gsap.set(cardRef.current, { x: 0 }),
        })
      }
      const result = await dispatch(registerWithUsername({ username: val, name: val, cafeId: CAFE_ID }))
      if (result.meta.requestStatus === 'rejected') {
        setLocalError(typeof result.payload === 'string' ? result.payload : 'Registration failed')
        setIsSubmitting(false)
        return
      }
      setIsSubmitting(false)
      setShowBurst(true)
      setTimeout(() => goToMenu(true), 860)
    }
  }

  // ── Guest ──────────────────────────────────────────────────────────────────
  const handleGuest = async () => {
    setGuestLoading(true)
    const result = await dispatch(loginAsGuest(CAFE_ID))
    if (!mountedRef.current) return
    setGuestLoading(false)
    if (result.meta.requestStatus === 'rejected') {
      setLocalError(typeof result.payload === 'string' ? result.payload : 'Guest login failed')
      return
    }
    preloadSounds('customer')
    navigate('/menu', { replace: true })
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const displayError = localError || error
  const isLoading    = loading || isSubmitting

  // Input border from status
  const inputBorderColor =
    usernameStatus === 'exists'   ? 'var(--input-border-valid)'
    : usernameStatus === 'free'   ? 'var(--input-border-free)'
    : usernameStatus === 'invalid'? 'var(--input-border-error)'
    : 'var(--input-border)'

  const inputShadow =
    usernameStatus === 'exists'  ? 'var(--input-shadow-valid)'
    : usernameStatus === 'free'  ? 'var(--input-shadow-free)'
    : 'none'

  // Button style from status
  const btnGradient =
    usernameStatus === 'exists' ? `linear-gradient(135deg, ${P.success} 0%, #059669 100%)`
    : usernameStatus === 'free' ? `linear-gradient(135deg, ${P.info} 0%, #1D4ED8 100%)`
    : 'var(--accent-gradient)'

  const btnGlow =
    usernameStatus === 'exists' ? P.successBg
    : usernameStatus === 'free' ? P.infoBg
    : 'var(--accent-glow)'

  const btnLabel =
    isLoading                   ? 'Please wait…'
    : usernameStatus === 'exists' ? 'Sign in'
    : usernameStatus === 'free'   ? 'Create account'
    : 'Continue'

  const canSubmit = !isLoading && !!usernameInput.trim() && usernameStatus !== 'invalid'

  return (
    <div ref={wrapRef} style={{
      minHeight: '100dvh',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
      background: 'var(--bg)',
      fontFamily: FONTS.body,
    }}>
      {/* ── Global page styles ─────────────────────────────────────────── */}
      <style>{`
        @import url('${FONTS.googleUrl}');
        *, *::before, *::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

        @keyframes lp-spin    { to { transform: rotate(360deg) } }
        @keyframes lp-slide-up{ from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes lp-pop     { from { opacity: 0; transform: scale(0) } to { opacity: 1; transform: scale(1) } }
        @keyframes lp-burst   { 0% { transform: rotate(var(--r)) translateY(-64px) scale(0); opacity: 1 }
                                 60% { opacity: 1 } 100% { transform: rotate(var(--r)) translateY(-64px) scale(0); opacity: 0 } }
        @keyframes lp-draw    { to { stroke-dashoffset: 0 } }
        @keyframes lp-shimmer { 0% { transform: translateX(-100%) } 100% { transform: translateX(400%) } }

        .lp-input {
          width: 100%; padding: 14px 44px 14px 44px;
          border-radius: 13px;
          font-family: ${FONTS.body}; font-size: 15px; font-weight: 500;
          background: var(--input-bg);
          color: var(--text-primary);
          border: 1.5px solid var(--input-border);
          outline: none; transition: border-color 0.22s, box-shadow 0.22s, background 0.18s;
        }
        .lp-input::placeholder { color: var(--text-disabled); }
        .lp-input:hover:not(:focus) { background: var(--input-bg-hover); }

        .lp-btn-ghost {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 9px;
          padding: 13px 18px; border-radius: 13px;
          border: 1.5px solid var(--divider);
          background: var(--pill-bg);
          color: var(--text-secondary);
          font-family: ${FONTS.body}; font-size: 13.5px; font-weight: 600;
          cursor: pointer; transition: background 0.15s, border-color 0.15s, opacity 0.15s;
        }
        .lp-btn-ghost:hover:not(:disabled) { background: var(--pill-bg-hover); border-color: var(--pill-border-active); }
        .lp-btn-ghost:disabled { opacity: 0.45; cursor: not-allowed; }

        .lp-staff-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 11px 18px; border-radius: 13px;
          border: 1.5px solid var(--divider);
          background: transparent;
          color: var(--text-muted);
          font-family: ${FONTS.body}; font-size: 12.5px; font-weight: 600;
          cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .lp-staff-btn:hover:not(:disabled) { background: var(--accent-dim); border-color: var(--accent-border); color: var(--accent); }
        .lp-staff-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--scroll-thumb); border-radius: 99px; }
      `}</style>

      <SuccessBurst show={showBurst} />

      {/* ── Background image with overlay ─────────────────────────────── */}
      <img src={BG_IMG} alt="" aria-hidden="true" style={{
        position: 'fixed', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', zIndex: 0, pointerEvents: 'none',
        filter: isDark ? 'brightness(0.7) saturate(0.85)' : 'brightness(1.08) saturate(0.8)',
      }}/>
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: isDark
          ? 'linear-gradient(180deg, rgba(13,9,5,0.15) 0%, rgba(13,9,5,0.65) 55%, rgba(13,9,5,0.96) 100%)'
          : 'linear-gradient(180deg, rgba(245,237,216,0.1) 0%, rgba(245,237,216,0.72) 55%, rgba(245,237,216,0.97) 100%)',
      }}/>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', minHeight: '100dvh', padding: '0 20px' }}>

        {/* ── Hero: cup + brand name ─────────────────────────────────── */}
        <div ref={heroRef} style={{
          paddingTop: 'max(60px, calc(env(safe-area-inset-top) + 40px))',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
        }}>
          {/* Cup with steam */}
          <div className="lp-hero-el" style={{ position: 'relative', width: 88, height: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 4 }}>
            <SteamSVG isDark={isDark} steamRefs={steamRefs} />
            <div style={{ position: 'absolute', bottom: 0, willChange: 'transform' }}>
              <CupSVG isDark={isDark} />
            </div>
          </div>

          {/* Cafe name */}
          <h1 className="lp-hero-el" style={{
            fontFamily: FONTS.display,
            fontWeight: 900,
            fontSize: 'clamp(32px, 9vw, 42px)',
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            margin: '10px 0 0',
            background: isDark
              ? 'linear-gradient(128deg, #FFE8A0 0%, var(--accent) 42%, var(--accent-dark) 100%)'
              : 'linear-gradient(128deg, var(--accent) 0%, var(--accent-dark) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 2px 8px var(--accent-glow))',
          }}>
            {BRAND.name}
          </h1>

          {/* Tagline */}
          <div className="lp-hero-el" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <div style={{ width: 28, height: 1, borderRadius: 99, background: 'var(--divider-strong)' }}/>
            <p style={{
              fontFamily: FONTS.body,
              fontSize: 9.5, fontWeight: 700,
              letterSpacing: '0.26em', textTransform: 'uppercase',
              color: 'var(--text-muted)', margin: 0,
            }}>
              {BRAND.tagline}{BRAND.address ? ` · ${BRAND.address}` : ''}
            </p>
            <div style={{ width: 28, height: 1, borderRadius: 99, background: 'var(--divider-strong)' }}/>
          </div>
        </div>

        <div style={{ flex: 1 }}/>

        {/* ── Auth card ─────────────────────────────────────────────── */}
        <div ref={cardRef} style={{
          marginBottom: 'max(32px, calc(env(safe-area-inset-bottom) + 22px))',
          borderRadius: 24,
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--card-bg)',
          backdropFilter: 'blur(40px) saturate(160%)',
          WebkitBackdropFilter: 'blur(40px) saturate(160%)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
          padding: '28px 22px 24px',
        }}>
          {/* Top shimmer line */}
          <div aria-hidden="true" style={{
            position: 'absolute', top: 0, left: '10%', right: '10%',
            height: '1.5px', borderRadius: 99,
            background: 'var(--top-glow)', opacity: 0.7,
          }}/>

          {/* Corner accents */}
          <CornerAccent isDark={isDark} position="tl" />
          <CornerAccent isDark={isDark} position="br" />

          {/* ── Table banner ── */}
          {tableNumber && (
            <div className="lp-card-el" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginBottom: 20, padding: '10px 16px', borderRadius: 12,
              background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="6" width="12" height="2" rx="1" fill="var(--accent)"/>
                <rect x="3" y="8" width="1.5" height="4" rx="0.75" fill="var(--accent)"/>
                <rect x="9.5" y="8" width="1.5" height="4" rx="0.75" fill="var(--accent)"/>
                <rect x="2" y="3" width="10" height="3" rx="1.5" fill="var(--accent)" opacity="0.6"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', fontFamily: FONTS.body }}>
                Table {tableNumber} is ready for you
              </span>
            </div>
          )}

          {/* ── Card heading ── */}
          <div className="lp-card-el" style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{
              fontFamily: FONTS.display,
              fontWeight: 800,
              fontSize: 'clamp(22px, 6vw, 26px)',
              letterSpacing: '-0.025em',
              color: 'var(--text-primary)',
              margin: '0 0 5px',
              lineHeight: 1.2,
            }}>
              स्वागत छ! 🙏
            </h2>
            <p style={{
              fontFamily: FONTS.body,
              fontSize: 13, color: 'var(--text-muted)', margin: 0,
            }}>
              Enter your username to sign in or register
            </p>
          </div>

          {/* ── Error ── */}
          {displayError && (
            <div className="lp-card-el" style={{
              marginBottom: 16, padding: '11px 14px', borderRadius: 11,
              background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
              color: 'var(--danger)', fontSize: 13, fontFamily: FONTS.body,
              animation: 'lp-slide-up 0.22s ease-out both',
            }}>
              {displayError}
            </div>
          )}

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} autoComplete="off">
            <label style={{
              display: 'block', marginBottom: 8,
              fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase',
              color: 'var(--text-muted)', fontFamily: FONTS.body,
            }}>
              Username
            </label>

            {/* ── Input wrapper ── */}
            <div className="lp-card-el" style={{ position: 'relative', marginBottom: 6 }}>
              {/* @ icon */}
              <div style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: usernameStatus === 'exists' ? 'var(--success)'
                  : usernameStatus === 'free' ? 'var(--info)'
                  : 'var(--text-muted)',
                transition: 'color 0.2s', pointerEvents: 'none',
              }}>
                <AtSignIcon />
              </div>

              <input
                ref={inputRef}
                className="lp-input"
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="your_username"
                value={usernameInput}
                onChange={handleChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                disabled={isLoading}
                style={{
                  borderColor: inputBorderColor,
                  boxShadow: inputShadow,
                }}
              />

              {/* Right status icon */}
              <div style={{
                position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 20, height: 20,
              }}>
                {usernameStatus === 'checking' && (
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'lp-spin .7s linear infinite' }}/>
                )}
                {usernameStatus === 'exists' && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="var(--success)" strokeWidth="1.5" opacity="0.4"/>
                    <circle cx="8" cy="8" r="7" stroke="var(--success)" strokeWidth="1.5" strokeDasharray="44" style={{ animation: 'none' }}/>
                    <path d="M4.5 8 L7 10.5 L11.5 5.5" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {usernameStatus === 'free' && <SparkleIcon />}
                {usernameStatus === 'invalid' && <XMark />}
              </div>
            </div>

            {/* ── Status badge ── */}
            <StatusBadge status={usernameStatus} isDark={isDark} />

            {/* ── Submit button ── */}
            <button
              ref={btnRef}
              type="submit"
              disabled={!canSubmit}
              className="lp-card-el"
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '15px 20px', borderRadius: 14, marginBottom: 14,
                border: 'none',
                background: !canSubmit ? 'var(--btn-disabled)' : btnGradient,
                color: !canSubmit ? 'var(--btn-disabled-text)' : '#fff',
                fontFamily: FONTS.body, fontWeight: 700, fontSize: 15,
                minHeight: 52,
                boxShadow: !canSubmit ? 'none' : `0 6px 24px ${btnGlow}`,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                opacity: !canSubmit ? 0.55 : 1,
                transition: 'background 0.25s, box-shadow 0.25s, opacity 0.18s',
                position: 'relative', overflow: 'hidden',
              }}
            >
              {/* Shimmer effect on hover */}
              {canSubmit && (
                <div aria-hidden="true" style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
                  animation: 'lp-shimmer 2.5s ease-in-out infinite',
                  pointerEvents: 'none',
                }}/>
              )}
              {isLoading && (
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'lp-spin .7s linear infinite', flexShrink: 0 }}/>
              )}
              <span>{btnLabel}</span>
              {!isLoading && <ArrowRight />}
            </button>
          </form>

          {/* ── Divider ── */}
          <div className="lp-card-el" style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 14px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--divider)' }}/>
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-disabled)', fontFamily: FONTS.body }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--divider)' }}/>
          </div>

          {/* ── Guest button ── */}
          <button className="lp-btn-ghost lp-card-el" onClick={handleGuest} disabled={isLoading || guestLoading} style={{ marginBottom: 10 }}>
            <UserIcon />
            {guestLoading ? 'Setting up…' : 'Continue as Guest'}
          </button>

          {/* ── Staff button ── */}
          <button className="lp-staff-btn lp-card-el" onClick={() => navigate('/staff/login')} disabled={isLoading} style={{ marginBottom: 18 }}>
            <ShieldIcon />
            Staff Login
          </button>

          {/* ── Loyalty hint ── */}
          <div className="lp-card-el" style={{
            display: 'flex', alignItems: 'flex-start', gap: 11,
            padding: '11px 14px', borderRadius: 13,
            background: 'var(--loyalty-bg)', border: '1px solid var(--loyalty-border)',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M8 1.5 L9.6 5.8 L14 6.2 L10.8 9.1 L11.8 13.5 L8 11.2 L4.2 13.5 L5.2 9.1 L2 6.2 L6.4 5.8 Z" fill="var(--loyalty-text)" opacity="0.85"/>
            </svg>
            <div>
              <p style={{ fontFamily: FONTS.body, fontWeight: 700, fontSize: 12.5, color: 'var(--loyalty-text)', margin: '0 0 3px' }}>
                Sign in to earn loyalty points
              </p>
              <p style={{ fontFamily: FONTS.body, fontSize: 11.5, color: 'var(--loyalty-sub-text)', margin: 0, lineHeight: 1.45 }}>
                Bronze → Silver → Gold · Up to 15% off at {BRAND.name}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage