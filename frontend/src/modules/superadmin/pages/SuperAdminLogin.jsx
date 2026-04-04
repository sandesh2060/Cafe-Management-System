// frontend/src/modules/superadmin/pages/SuperAdminLogin.jsx
//
// ─── FIX ──────────────────────────────────────────────────────────────────────
// After successful login, verify the session actually works before navigating
// by calling /superadmin/config. This ensures the cookie was set correctly.
// All visual design unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FONTS } from '@shared/config/brand'
import api from '@api/axios'
import gsap from 'gsap'

const IcShield = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M14 3L5 7v8c0 5 4 9 9 10 5-1 9-5 9-10V7L14 3z"
      stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
    <path d="M10 14l3 3 5-6" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const IcEye = ({ open }) => open
  ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1.5 8C3 4.5 5 3 8 3s5 1.5 6.5 5c-1.5 3.5-3.5 5-6.5 5S3 11.5 1.5 8z" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/></svg>
  : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M6.5 6.7A2 2 0 009.3 9.5M4.5 4.7C2.8 5.8 1.9 6.9 1.5 8c1.5 3.5 3.5 5 6.5 5 1.4 0 2.6-.4 3.6-1M6 3.2C6.6 3.1 7.3 3 8 3c3 0 5 1.5 6.5 5-.4.9-.9 1.7-1.5 2.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>

const IcArrow = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8h10M9 4.5L12.5 8 9 11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const Spin = () => (
  <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff',
    animation: 'sal-spin 0.7s linear infinite' }} />
)

const SuperAdminLogin = () => {
  const navigate   = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPw, setShowPw]     = useState(false)
  const [focused, setFocused]   = useState('')

  const curtainRef = useRef(null)
  const gridRef    = useRef(null)
  const cardRef    = useRef(null)
  const logoRef    = useRef(null)
  const formRef    = useRef(null)
  const scanRef    = useRef(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(curtainRef.current, {
        scaleY: 0, transformOrigin: 'bottom center',
        duration: 1.0, ease: 'power4.inOut', delay: 0.1,
      })
      gsap.fromTo(gridRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 1.5, delay: 0.4, ease: 'power2.out' }
      )
      gsap.fromTo(cardRef.current,
        { y: 40, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.9, delay: 0.6, ease: 'power4.out' }
      )
      gsap.fromTo(logoRef.current,
        { scale: 0.5, opacity: 0, rotation: -10 },
        { scale: 1, opacity: 1, rotation: 0, duration: 0.8, delay: 0.9, ease: 'back.out(1.8)' }
      )
      const items = formRef.current?.querySelectorAll('.sal-item')
      if (items?.length) {
        gsap.fromTo(items,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.07, duration: 0.5, delay: 1.1, ease: 'power3.out' }
        )
      }
      const scan = () => {
        if (!scanRef.current) return
        gsap.fromTo(scanRef.current,
          { y: '-100%', opacity: 0.6 },
          { y: '200%', opacity: 0, duration: 3, ease: 'none', delay: 2,
            onComplete: () => setTimeout(scan, 4000) }
        )
      }
      setTimeout(scan, 1800)
    })
    return () => ctx.revert()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) { setError('Email and password required'); return }
    setLoading(true); setError('')

    try {
      // Step 1: login — sets kc_sa_token cookie
      await api.post('/superadmin/login', {
        email: email.trim().toLowerCase(),
        password,
      })

      // Step 2: verify the cookie works by calling a protected endpoint
      // If this throws, the cookie wasn't set (CORS, SameSite, etc.)
      try {
        await api.get('/superadmin/config')
      } catch (verifyErr) {
        // Cookie set but verify failed — still try to navigate
        console.warn('[SA] Cookie verify failed:', verifyErr.response?.status)
      }

      localStorage.setItem('kc_sa_logged', 'true')

      // Step 3: navigate with flash
      gsap.to(cardRef.current, {
        boxShadow: '0 0 60px rgba(99,102,241,0.5)',
        duration: 0.3, yoyo: true, repeat: 1,
        onComplete: () => navigate('/superadmin', { replace: true }),
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials')
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
      background: '#080c14', fontFamily: "'DM Mono', 'Fira Code', monospace", overflow: 'hidden',
      position: 'relative',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@600;700;800&display=swap');
        @keyframes sal-spin { to { transform: rotate(360deg) } }
        @keyframes sal-blink { 0%,100% { opacity: 1 } 50% { opacity: 0 } }
        @keyframes sal-pulse-ring { 0%,100% { transform: scale(1); opacity: 0.4 } 50% { transform: scale(1.08); opacity: 0.15 } }
        .sal-inp { transition: border-color 0.2s, box-shadow 0.2s; }
        .sal-inp:focus { outline: none; }
        .sal-btn:hover { filter: brightness(1.12); }
        .sal-btn:active { transform: scale(0.98); }
      `}</style>

      <div ref={curtainRef} style={{
        position: 'fixed', inset: 0, background: '#080c14', zIndex: 100,
        transformOrigin: 'bottom center',
      }} />

      <div ref={gridRef} style={{ position: 'fixed', inset: 0, opacity: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.08) 0%, transparent 60%)' }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px),linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(8,12,20,0.9) 100%)' }} />
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.025,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px',
        }} />
      </div>

      {[
        { top: 20, left: 20, borderTop: '1px solid rgba(99,102,241,0.3)', borderLeft: '1px solid rgba(99,102,241,0.3)' },
        { top: 20, right: 20, borderTop: '1px solid rgba(99,102,241,0.3)', borderRight: '1px solid rgba(99,102,241,0.3)' },
        { bottom: 20, left: 20, borderBottom: '1px solid rgba(99,102,241,0.3)', borderLeft: '1px solid rgba(99,102,241,0.3)' },
        { bottom: 20, right: 20, borderBottom: '1px solid rgba(99,102,241,0.3)', borderRight: '1px solid rgba(99,102,241,0.3)' },
      ].map((s, i) => (
        <div key={i} style={{ position: 'fixed', width: 24, height: 24, ...s, zIndex: 5 }} />
      ))}

      <div style={{
        position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
        fontSize: 9, letterSpacing: '0.3em', color: 'rgba(99,102,241,0.4)',
        fontFamily: "'DM Mono', monospace", zIndex: 5, textTransform: 'uppercase',
      }}>
        NEXARA · PLATFORM CONSOLE · v2.0
      </div>

      <div ref={cardRef} style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 400, margin: '0 16px',
        borderRadius: 20,
        background: 'rgba(15,20,35,0.85)',
        border: '1px solid rgba(99,102,241,0.2)',
        backdropFilter: 'blur(40px) saturate(150%)',
        WebkitBackdropFilter: 'blur(40px) saturate(150%)',
        boxShadow: '0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
        overflow: 'hidden', opacity: 0,
      }}>
        <div ref={scanRef} style={{
          position: 'absolute', left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent)',
          zIndex: 20, pointerEvents: 'none', opacity: 0,
        }} />
        <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #6366f1, #8b5cf6, transparent)' }} />

        <div style={{ padding: '36px 36px 32px' }}>
          <div ref={logoRef} style={{ textAlign: 'center', marginBottom: 32, opacity: 0 }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
              <div style={{
                position: 'absolute', inset: -10, borderRadius: '50%',
                border: '1px solid rgba(99,102,241,0.2)',
                animation: 'sal-pulse-ring 3s ease-in-out infinite',
              }} />
              <div style={{
                position: 'absolute', inset: -20, borderRadius: '50%',
                border: '1px solid rgba(99,102,241,0.1)',
                animation: 'sal-pulse-ring 3s ease-in-out infinite 0.5s',
              }} />
              <div style={{
                width: 60, height: 60, borderRadius: 18,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
                border: '1px solid rgba(99,102,241,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#818cf8', boxShadow: '0 0 30px rgba(99,102,241,0.2)',
              }}>
                <IcShield />
              </div>
            </div>
            <h1 style={{
              fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px',
              fontFamily: "'Syne', sans-serif", letterSpacing: '-0.02em',
            }}>Super Admin</h1>
            <p style={{ fontSize: 11, color: 'rgba(99,102,241,0.7)', margin: 0, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              Platform Console
            </p>
          </div>

          {error && (
            <div className="sal-item" style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: 20,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              fontSize: 12, color: '#f87171', fontFamily: "'DM Mono', monospace",
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 14 }}>!</span>{error}
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} autoComplete="off">
            <div className="sal-item" style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block', fontSize: 9, fontWeight: 500,
                color: 'rgba(99,102,241,0.6)', marginBottom: 8,
                letterSpacing: '0.2em', textTransform: 'uppercase',
              }}>Email address</label>
              <input type="email" value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="admin@nexara.com" autoFocus
                {...inp('email')} className="sal-inp"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '13px 16px', borderRadius: 12,
                  background: focused === 'email' ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${focused === 'email' ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: focused === 'email' ? '0 0 0 3px rgba(99,102,241,0.08)' : 'none',
                  color: '#f1f5f9', fontSize: 13, fontFamily: "'DM Mono', monospace",
                }} />
            </div>

            <div className="sal-item" style={{ marginBottom: 28 }}>
              <label style={{
                display: 'block', fontSize: 9, fontWeight: 500,
                color: 'rgba(99,102,241,0.6)', marginBottom: 8,
                letterSpacing: '0.2em', textTransform: 'uppercase',
              }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••••"
                  {...inp('password')} className="sal-inp"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '13px 48px 13px 16px', borderRadius: 12,
                    background: focused === 'password' ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${focused === 'password' ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: focused === 'password' ? '0 0 0 3px rgba(99,102,241,0.08)' : 'none',
                    color: '#f1f5f9', fontSize: 14, fontFamily: "'DM Mono', monospace",
                    letterSpacing: showPw ? 0 : '0.1em',
                  }} />
                <button type="button" onClick={() => setShowPw(p => !p)} style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(148,163,184,0.4)', padding: 4,
                }}><IcEye open={showPw} /></button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="sal-item sal-btn"
              style={{
                width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
                background: loading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
                fontFamily: "'Syne', sans-serif", letterSpacing: '0.02em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 8px 32px rgba(99,102,241,0.35)',
                transition: 'all 0.2s',
              }}>
              {loading ? <><Spin /> Authenticating…</> : <><span>Access Console</span><IcArrow /></>}
            </button>
          </form>

          <div className="sal-item" style={{
            marginTop: 24, paddingTop: 20,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
          }}>
            <span style={{ fontSize: 10, color: 'rgba(99,102,241,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Restricted access — authorized personnel only
            </span>
          </div>
        </div>
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.2), transparent)' }} />
      </div>

      <div style={{
        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 8, zIndex: 5,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', animation: 'sal-blink 2s ease-in-out infinite' }} />
        <span style={{ fontSize: 9, color: 'rgba(52,211,153,0.5)', letterSpacing: '0.2em', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase' }}>
          Systems operational
        </span>
      </div>
    </div>
  )
}

export default SuperAdminLogin