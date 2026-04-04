// frontend/src/modules/owner/pages/OwnerLoginPage.jsx
//
// ─── CHANGES ──────────────────────────────────────────────────────────────────
// ★ Replaced direct api.post('/owner/login') with dispatch(ownerLogin(...))
//   so Redux state gets role:'owner' set before navigate('/owner').
//   Without this the role stayed null → getRoleHome(null) → '/detect' loop.
// All UI, animations, theme, brand unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useLayoutEffect, useContext } from 'react'
import { useNavigate }    from 'react-router-dom'
import { useDispatch }    from 'react-redux'
import gsap               from 'gsap'
import { ThemeContext }   from '@shared/context/ThemeContext'
import { FONTS, BRAND }   from '@shared/config/brand'
import { ownerLogin }     from '@store/slices/authSlice'

const IcBuilding = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="3" y="6" width="22" height="18" rx="2" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M9 24V18h10v6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
    <rect x="8" y="10" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.5"/>
    <rect x="13" y="10" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.5"/>
    <rect x="17" y="10" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.5"/>
    <path d="M14 6V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
)

const IcEye = ({ open }) => open
  ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1.5 8C3 4.5 5 3 8 3s5 1.5 6.5 5c-1.5 3.5-3.5 5-6.5 5S3 11.5 1.5 8z" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/></svg>
  : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M6.5 6.7A2 2 0 009.3 9.5M4.5 4.7C2.8 5.8 1.9 6.9 1.5 8c1.5 3.5 3.5 5 6.5 5 1.4 0 2.6-.4 3.6-1M6 3.2C6.6 3.1 7.3 3 8 3c3 0 5 1.5 6.5 5-.4.9-.9 1.7-1.5 2.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>

const Spin = () => (
  <span style={{
    display: 'inline-block', width: 16, height: 16, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff',
    animation: 'ol-spin 0.7s linear infinite',
  }} />
)

const OwnerLoginPage = () => {
  const navigate    = useNavigate()
  const dispatch    = useDispatch()
  const { isDark: D } = useContext(ThemeContext)

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPw, setShowPw]     = useState(false)
  const [focused, setFocused]   = useState('')

  const cardRef = useRef(null)
  const logoRef = useRef(null)
  const formRef = useRef(null)

  // Emerald green — owner accent, distinct from cafe orange and SA indigo
  const G = {
    accent:  '#10b981',
    accentDk:'#059669',
    glow:    'rgba(16,185,129,0.25)',
    dim:     D ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)',
    bd:      D ? 'rgba(16,185,129,0.3)'  : 'rgba(16,185,129,0.2)',
    textPri: D ? 'rgba(248,250,252,0.95)': 'rgba(15,23,42,0.9)',
    textMut: D ? 'rgba(148,163,184,0.6)' : 'rgba(100,116,139,0.6)',
    cardBg:  D ? 'rgba(15,23,42,0.8)'    : 'rgba(255,255,255,0.9)',
    cardBd:  D ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.12)',
    inputBg: D ? 'rgba(255,255,255,0.05)': 'rgba(0,0,0,0.04)',
    inputBd: D ? 'rgba(255,255,255,0.12)': 'rgba(0,0,0,0.1)',
    bg:      D ? '#080f0c'               : '#f0fdf4',
  }

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(cardRef.current,
        { y: 32, opacity: 0, scale: 0.97 },
        { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'power4.out', delay: 0.1 }
      )
      gsap.fromTo(logoRef.current,
        { scale: 0.6, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(1.8)', delay: 0.4 }
      )
      const items = formRef.current?.querySelectorAll('.ol-item')
      if (items?.length) {
        gsap.fromTo(items,
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.07, duration: 0.45, delay: 0.6, ease: 'power3.out' }
        )
      }
    })
    return () => ctx.revert()
  }, [])

  // ★ CHANGED: dispatch ownerLogin thunk instead of direct api.post
  // This sets role:'owner' in Redux before navigation so getRoleHome works.
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) { setError('Email and password required'); return }
    setLoading(true)
    setError('')

    const result = await dispatch(ownerLogin({
      email:    email.trim().toLowerCase(),
      password,
    }))

    if (ownerLogin.fulfilled.match(result)) {
      // Flash success glow then navigate — role is now 'owner' in Redux
      gsap.to(cardRef.current, {
        boxShadow: `0 0 48px ${G.glow}`,
        duration: 0.3, yoyo: true, repeat: 1,
        onComplete: () => navigate('/owner', { replace: true }),
      })
    } else {
      const msg = result.payload ?? 'Invalid credentials'
      setError(typeof msg === 'string' ? msg : 'Invalid credentials')
      setLoading(false)
      gsap.to(cardRef.current, {
        x: -8, duration: 0.05, ease: 'power2.in', yoyo: true, repeat: 7,
        onComplete: () => gsap.set(cardRef.current, { x: 0 }),
      })
    }
  }

  const inp = (name) => ({
    onFocus: () => setFocused(name),
    onBlur:  () => setFocused(''),
  })

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: G.bg, fontFamily: FONTS.body, padding: '16px',
    }}>
      <style>{`
        @keyframes ol-spin { to { transform: rotate(360deg) } }
        @keyframes ol-pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
      `}</style>

      {/* Background glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 50% 30%, ${G.dim} 0%, transparent 65%)`,
      }} />

      <div ref={cardRef} style={{
        width: '100%', maxWidth: 400, opacity: 0,
        borderRadius: 24,
        background: G.cardBg,
        border: `1px solid ${G.cardBd}`,
        backdropFilter: 'blur(40px) saturate(150%)',
        WebkitBackdropFilter: 'blur(40px) saturate(150%)',
        boxShadow: D
          ? '0 32px 80px rgba(0,0,0,0.5)'
          : '0 24px 60px rgba(16,185,129,0.12), 0 0 0 1px rgba(16,185,129,0.08)',
        overflow: 'hidden',
      }}>
        {/* Top accent line */}
        <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${G.accent}, #34d399, transparent)` }} />

        <div style={{ padding: '36px 32px 32px' }}>
          {/* Logo */}
          <div ref={logoRef} style={{ textAlign: 'center', marginBottom: 28, opacity: 0 }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 14 }}>
              <div style={{
                position: 'absolute', inset: -10, borderRadius: '50%',
                border: `1px solid ${G.bd}`,
                animation: 'ol-pulse 3s ease-in-out infinite',
              }} />
              <div style={{
                width: 56, height: 56, borderRadius: 18,
                background: G.dim, border: `1px solid ${G.bd}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: G.accent, boxShadow: `0 0 24px ${G.glow}`,
              }}>
                <IcBuilding />
              </div>
            </div>
            <h1 style={{
              fontSize: 20, fontWeight: 800, color: G.textPri,
              margin: '0 0 4px', fontFamily: FONTS.heading, letterSpacing: '-0.02em',
            }}>
              Owner Portal
            </h1>
            <p style={{
              fontSize: 12, color: G.textMut, margin: 0,
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              {BRAND.name} · Business Console
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="ol-item" style={{
              padding: '10px 14px', borderRadius: 12, marginBottom: 18,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              fontSize: 12, color: '#f87171', fontFamily: FONTS.body,
            }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form ref={formRef} onSubmit={handleSubmit} autoComplete="off">
            {/* Email */}
            <div className="ol-item" style={{ marginBottom: 14 }}>
              <label style={{
                display: 'block', fontSize: 10, fontWeight: 700,
                color: G.textMut, marginBottom: 7, letterSpacing: '0.15em', textTransform: 'uppercase',
              }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="owner@example.com"
                autoFocus
                {...inp('email')}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '12px 16px', borderRadius: 12,
                  background: focused === 'email'
                    ? (D ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.04)')
                    : G.inputBg,
                  border: `1.5px solid ${focused === 'email' ? G.bd : G.inputBd}`,
                  boxShadow: focused === 'email' ? `0 0 0 3px ${G.dim}` : 'none',
                  color: G.textPri, fontSize: 14, fontFamily: FONTS.body,
                  outline: 'none', transition: 'all 0.2s',
                }}
              />
            </div>

            {/* Password */}
            <div className="ol-item" style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block', fontSize: 10, fontWeight: 700,
                color: G.textMut, marginBottom: 7, letterSpacing: '0.15em', textTransform: 'uppercase',
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••"
                  {...inp('password')}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '12px 48px 12px 16px', borderRadius: 12,
                    background: focused === 'password'
                      ? (D ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.04)')
                      : G.inputBg,
                    border: `1.5px solid ${focused === 'password' ? G.bd : G.inputBd}`,
                    boxShadow: focused === 'password' ? `0 0 0 3px ${G.dim}` : 'none',
                    color: G.textPri, fontSize: 14, fontFamily: FONTS.body,
                    outline: 'none', transition: 'all 0.2s',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: G.textMut, padding: 4,
                  }}
                >
                  <IcEye open={showPw} />
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="ol-item"
              style={{
                width: '100%', padding: '13px 20px', borderRadius: 12, border: 'none',
                background: loading
                  ? `${G.accent}80`
                  : `linear-gradient(135deg, ${G.accent}, ${G.accentDk})`,
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
                fontFamily: FONTS.heading, letterSpacing: '0.01em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : `0 8px 28px ${G.glow}`,
                transition: 'all 0.2s', WebkitTapHighlightColor: 'transparent',
              }}
            >
              {loading ? <><Spin /> Signing in…</> : 'Access Owner Portal'}
            </button>
          </form>

          <div className="ol-item" style={{
            marginTop: 20, paddingTop: 18,
            borderTop: `1px solid ${G.inputBd}`,
            textAlign: 'center',
          }}>
            <button
              onClick={() => navigate('/venue')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: G.textMut, fontFamily: FONTS.body,
              }}
            >
              Customer login →
            </button>
          </div>
        </div>

        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${G.bd}, transparent)` }} />
      </div>
    </div>
  )
}

export default OwnerLoginPage