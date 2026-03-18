// src/modules/customer/pages/TableDetectionPage.jsx
//
// ✅ Local color vars (bg, cardBg, cardBorder, textPri, textMut, ringColor, orbColor)
//    replaced with var(--token) from ThemeContext — no more isDark ternaries for colors
// ✅ Hardcoded font strings → FONTS.heading, FONTS.body, FONTS.mono
// ✅ @import url() removed — ThemeContext injects FONTS.googleUrl globally
// ✅ BRAND.name, BRAND.tagline, BRAND.address, BRAND.poweredBy — already correct
// ✅ All detection logic, bootstrap guards, GSAP animations — unchanged

import { useEffect, useRef, useContext, useState } from 'react'
import { useTableDetection }    from '@modules/table/hooks/useTableDetection'
import { useNavigate }          from 'react-router-dom'
import { useSelector }          from 'react-redux'
import { selectIsLoggedIn, selectBootstrapReady } from '@store/slices/authSlice'
import { selectTableId }        from '@store/slices/tableSessionSlice'
import { ThemeContext }          from '@shared/context/ThemeContext'
import { BRAND, FONTS }         from '@shared/config/brand'
import QrScannerOverlay         from '@modules/table/components/QrScannerOverlay'
import { Navigation, QrCode, Hash, Wifi, RefreshCw, MapPin } from 'lucide-react'
import gsap                     from 'gsap'

// ✅ Logo from env — change VITE_CAFE_LOGO in .env.local per deployment
const LOGO = import.meta.env.VITE_CAFE_LOGO
  ?? 'https://res.cloudinary.com/dszy3sf5c/image/upload/v1771076878/kausi_chiya_logo_q8qult.png'

const getState = (s) => {
  if (!s) return ''
  if (typeof s === 'string') return s
  if (typeof s === 'object' && s.value) return typeof s.value === 'string' ? s.value : Object.keys(s.value)[0]
  return String(s)
}

const TableDetectionPage = () => {
  const isLoggedIn      = useSelector(selectIsLoggedIn)
  const bootstrapReady  = useSelector(selectBootstrapReady)
  const tableId         = useSelector(selectTableId)
  const navigate        = useNavigate()
  const { isDark }      = useContext(ThemeContext)
  const D               = isDark

  const logoRef  = useRef(null)
  const cardRef  = useRef(null)
  const ring1Ref = useRef(null)
  const ring2Ref = useRef(null)
  const ring3Ref = useRef(null)
  const orbRef   = useRef(null)

  const {
    state: rawState, context, startGPS, onQrScanned, onManualEntry, retry, isQR, isError,
  } = useTableDetection()

  const state = getState(rawState)

  useEffect(() => {
    if (!bootstrapReady) return
    if (isLoggedIn && tableId) navigate('/menu', { replace: true })
  }, [bootstrapReady, isLoggedIn, tableId, navigate])

  useEffect(() => {
    const targets = [ring1Ref.current, ring2Ref.current, ring3Ref.current, orbRef.current].filter(Boolean)
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    if (logoRef.current) tl.fromTo(logoRef.current, { y: -34, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.85 }, 0)
    if (cardRef.current) tl.fromTo(cardRef.current, { y: 48, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0.2)
    ;[ring1Ref, ring2Ref, ring3Ref].forEach((ref, i) => {
      if (!ref.current) return
      gsap.fromTo(ref.current,
        { scale: 1, opacity: D ? 0.5 : 0.4 },
        { scale: 3.4, opacity: 0, duration: 2.8, delay: i * 0.88, repeat: -1, ease: 'power2.out' }
      )
    })
    if (orbRef.current) gsap.to(orbRef.current, { y: -20, duration: 3.8, repeat: -1, yoyo: true, ease: 'sine.inOut' })
    return () => { tl.kill(); gsap.killTweensOf(targets) }
  }, []) // eslint-disable-line

  const startGPSRef = useRef(startGPS)
  useEffect(() => { startGPSRef.current = startGPS }, [startGPS])
  useEffect(() => {
    if (state === 'idle' && bootstrapReady && !(isLoggedIn && tableId)) startGPSRef.current()
  }, [state, bootstrapReady, isLoggedIn, tableId])

  const isScanning = state === 'requestingGPS' || state === 'collectingReadings'
  const isReady    = state === 'idle'

  // Show spinner while bootstrap is in progress
  if (!bootstrapReady) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        // ✅ var(--bg) — was hardcoded '#0C0804' / '#F0EAD6'
        background: 'var(--bg)',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          // ✅ var(--card-border) / var(--accent) — was hardcoded rgba(255,159,28,0.2) / #FF9F1C
          border: '2.5px solid var(--card-border)',
          borderTopColor: 'var(--accent)',
          animation: 'tdp-spin 0.82s linear infinite',
        }} />
        <style>{`@keyframes tdp-spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      // ✅ var(--bg)
      background: 'var(--bg)',
      position: 'relative', overflow: 'hidden',
      padding: 'max(52px, calc(env(safe-area-inset-top) + 28px)) 18px max(36px, calc(env(safe-area-inset-bottom) + 20px))',
      // ✅ FONTS.body
      fontFamily: FONTS.body,
    }}>

      {/* Orb */}
      <div ref={orbRef} style={{
        position: 'absolute', top: '-6%', left: '50%', transform: 'translateX(-50%)',
        width: 360, height: 360, borderRadius: '50%',
        // ✅ var(--orb-color) — was hardcoded rgba(255,140,20,0.18/0.14)
        background: 'radial-gradient(circle, var(--orb-color) 0%, transparent 72%)',
        filter: 'blur(50px)', pointerEvents: 'none', zIndex: 0, willChange: 'transform',
      }} />
      <div style={{
        position: 'absolute', bottom: '-8%', right: '-12%', width: 240, height: 240,
        borderRadius: '50%',
        // ✅ var(--orb-color2)
        background: 'radial-gradient(circle, var(--orb-color2) 0%, transparent 70%)',
        filter: 'blur(36px)', pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ── BRAND HEADER ─────────────────────────────────────────────────── */}
      <div ref={logoRef} style={{ textAlign: 'center', marginBottom: 30, position: 'relative', zIndex: 10 }}>
        <div style={{ position: 'relative', width: 82, height: 82, margin: '0 auto 14px' }}>
          <div style={{
            position: 'absolute', inset: -10, borderRadius: 26,
            // ✅ var(--accent-dim) — was hardcoded rgba(255,159,28,0.32)
            background: 'radial-gradient(circle, var(--accent-dim) 0%, transparent 72%)',
            filter: 'blur(10px)',
          }} />
          <img
            src={LOGO} alt={BRAND.name}
            style={{
              width: 82, height: 82, borderRadius: 22, objectFit: 'contain',
              position: 'relative', zIndex: 1, padding: 9,
              // ✅ var(--card-bg) / var(--card-border) / var(--card-shadow)
              background: 'var(--card-bg)',
              backdropFilter: 'blur(14px)',
              border: '1px solid var(--card-border)',
              boxShadow: 'var(--card-shadow)',
            }}
          />
        </div>

        {/* ✅ BRAND.name — was correct, FONTS.display for Devanagari */}
        <h1 style={{
          fontFamily: FONTS.display,
          fontWeight: 900,
          fontSize: 'clamp(28px, 7.5vw, 34px)',
          letterSpacing: '-0.025em', lineHeight: 1.1, margin: '0 0 7px',
          // ✅ var(--accent-gradient) as text gradient
          background: 'var(--accent-gradient)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          filter: 'drop-shadow(0 2px 8px var(--accent-glow))',
        }}>
          {BRAND.name}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 1, background: 'var(--divider-strong)', borderRadius: 99 }} />
          {/* ✅ BRAND.tagline + BRAND.address */}
          <p style={{
            fontFamily: FONTS.body,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase',
            // ✅ var(--text-muted)
            color: 'var(--text-muted)', margin: 0,
          }}>
            {BRAND.tagline}{BRAND.address ? ` · ${BRAND.address}` : ''}
          </p>
          <div style={{ width: 26, height: 1, background: 'var(--divider-strong)', borderRadius: 99 }} />
        </div>
      </div>

      {/* ── DETECTION CARD ───────────────────────────────────────────────── */}
      <div ref={cardRef} style={{
        width: '100%', maxWidth: 368, position: 'relative', zIndex: 10,
        borderRadius: 28, overflow: 'hidden',
        // ✅ var(--card-bg) / var(--card-border) / var(--card-shadow)
        background: 'var(--card-bg)',
        backdropFilter: 'blur(36px) saturate(165%)',
        WebkitBackdropFilter: 'blur(36px) saturate(165%)',
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--card-shadow)',
      }}>
        {/* Top glow line */}
        <div style={{
          position: 'absolute', top: 0, left: '12%', right: '12%', height: 1.5,
          borderRadius: 99,
          // ✅ var(--top-glow)
          background: 'var(--top-glow)', opacity: D ? 0.6 : 0.48,
        }} />

        {/* IDLE */}
        {isReady && (
          <div style={{ padding: '36px 26px 30px', textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 20px',
              background: 'var(--accent-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 26px var(--accent-glow)',
            }}>
              <MapPin size={22} color="var(--text-inverse)" strokeWidth={2.5} />
            </div>
            <h2 style={{
              fontFamily: FONTS.body, fontWeight: 800,
              fontSize: 'clamp(19px, 5vw, 22px)', letterSpacing: '-0.03em',
              // ✅ var(--text-primary)
              color: 'var(--text-primary)', margin: '0 0 8px', lineHeight: 1.2,
            }}>
              Welcome to {BRAND.name}
            </h2>
            <p style={{ fontFamily: FONTS.body, fontSize: 13, lineHeight: 1.55, color: 'var(--text-muted)', margin: 0, padding: '0 6px' }}>
              Detecting your table…
            </p>
          </div>
        )}

        {/* GPS SCANNING */}
        {isScanning && (
          <div style={{ padding: '36px 26px 30px', textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {[ring1Ref, ring2Ref, ring3Ref].map((ref, i) => (
                <div key={i} ref={ref} style={{
                  position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
                  // ✅ var(--accent-border) — was hardcoded ringColor
                  border: '1.5px solid var(--accent-border)',
                  transformOrigin: 'center', opacity: 0.5 - i * 0.12,
                }} />
              ))}
              <div style={{
                width: 56, height: 56, borderRadius: '50%', zIndex: 5, position: 'relative',
                background: 'var(--accent-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 26px var(--accent-glow)',
                border: '1.5px solid rgba(255,255,255,0.22)',
              }}>
                <Navigation size={22} color="#fff" strokeWidth={2.5} />
              </div>
            </div>
            <h2 style={{ fontFamily: FONTS.body, fontWeight: 800, fontSize: 'clamp(19px, 5vw, 22px)', letterSpacing: '-0.03em', color: 'var(--text-primary)', margin: '0 0 8px', lineHeight: 1.2 }}>
              Finding Your Table
            </h2>
            <p style={{ fontFamily: FONTS.body, fontSize: 13, lineHeight: 1.55, color: 'var(--text-muted)', margin: '0 0 24px', padding: '0 6px' }}>
              {state === 'collectingReadings' ? 'Collecting GPS readings…' : 'Allow location access to detect your table automatically'}
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px',
              borderRadius: 99, marginBottom: 22,
              // ✅ var(--accent-dim) / var(--accent-border)
              background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
            }}>
              <Wifi size={12} color="var(--accent)" strokeWidth={2.2} />
              <span style={{ fontFamily: FONTS.body, fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.04em' }}>
                GPS · No QR Needed
              </span>
            </div>
            <div style={{ height: 2, borderRadius: 99, overflow: 'hidden', background: 'var(--pill-bg)' }}>
              <div style={{ height: '100%', width: '42%', borderRadius: 99, background: 'var(--top-glow)', animation: 'tdp-slide 1.85s ease-in-out infinite' }} />
            </div>
            {import.meta.env.DEV && (
              <p style={{ marginTop: 12, fontSize: 10, fontFamily: FONTS.mono, color: 'var(--text-muted)' }}>
                state: {state}
              </p>
            )}
          </div>
        )}

        {/* QR FALLBACK */}
        {isQR && (
          <div style={{ padding: '28px 22px' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 54, height: 54, borderRadius: 16, margin: '0 auto 14px',
                background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <QrCode size={25} color="var(--accent)" />
              </div>
              <h2 style={{ fontFamily: FONTS.body, fontWeight: 800, fontSize: 20, letterSpacing: '-0.03em', color: 'var(--text-primary)', margin: '0 0 6px' }}>
                Scan Table QR
              </h2>
              <p style={{ fontFamily: FONTS.body, fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                GPS unavailable — scan the QR on your table
              </p>
            </div>
            <QrScannerOverlay onScan={onQrScanned} />
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--divider)' }}>
              <p style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 12px', fontFamily: FONTS.body }}>
                No QR Code?
              </p>
              <ManualTableEntry onSubmit={onManualEntry} isDark={D} />
            </div>
            {import.meta.env.DEV && (
              <p style={{ marginTop: 14, textAlign: 'center', fontSize: 10, fontFamily: FONTS.mono, color: 'var(--text-muted)' }}>
                state: {state}
              </p>
            )}
          </div>
        )}

        {/* CREATING SESSION */}
        {state === 'creatingSession' && (
          <div style={{ padding: '48px 26px', textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 56, height: 56, margin: '0 auto 20px' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--accent-dim)', filter: 'blur(10px)' }} />
              <div style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid var(--card-border)', borderTopColor: 'var(--accent)', animation: 'tdp-spin 0.82s linear infinite' }} />
            </div>
            <p style={{ fontFamily: FONTS.body, fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', margin: '0 0 5px' }}>
              Setting up your session…
            </p>
            <p style={{ fontFamily: FONTS.body, fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Just a moment
            </p>
          </div>
        )}

        {/* ERROR */}
        {isError && (
          <div style={{ padding: '38px 26px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16, lineHeight: 1 }}>😕</div>
            <h2 style={{ fontFamily: FONTS.body, fontWeight: 800, fontSize: 20, letterSpacing: '-0.03em', color: 'var(--text-primary)', margin: '0 0 8px' }}>
              Detection Failed
            </h2>
            <p style={{ fontFamily: FONTS.body, fontSize: 13, color: 'var(--text-muted)', margin: '0 0 28px', lineHeight: 1.55 }}>
              {context?.error || 'Could not detect your table. Please try again.'}
            </p>
            <button
              onClick={retry}
              onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
              onTouchEnd={e => { e.currentTarget.style.transform = '' }}
              style={{
                width: '100%', padding: '15px 20px', borderRadius: 16, border: 'none',
                background: 'var(--accent-gradient)',
                color: 'var(--text-inverse)',
                fontFamily: FONTS.body, fontWeight: 700, fontSize: 15,
                boxShadow: '0 6px 24px var(--accent-glow)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                WebkitTapHighlightColor: 'transparent', transition: 'transform 0.15s',
              }}
            >
              <RefreshCw size={16} strokeWidth={2.4} />
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* ✅ BRAND.poweredBy — unchanged, correct */}
      {BRAND.poweredBy && (
        <p style={{
          marginTop: 26, position: 'relative', zIndex: 10,
          fontFamily: FONTS.body,
          fontSize: 10, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase',
          color: 'var(--text-muted)', opacity: 0.55,
        }}>
          Powered by {BRAND.poweredBy}
        </p>
      )}

      <style>{`
        @keyframes tdp-slide { 0% { transform: translateX(-130%) } 100% { transform: translateX(340%) } }
        @keyframes tdp-spin  { to  { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}

/* ── Manual Table Entry ── */
const ManualTableEntry = ({ onSubmit, isDark }) => {
  const [value, setValue] = useState('')

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setValue('')
  }

  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <Hash size={13} style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)', pointerEvents: 'none',
        }} />
        <input
          type="text"
          inputMode="numeric"
          placeholder="Table number"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
          style={{
            width: '100%', padding: '13px 12px 13px 32px', borderRadius: 14,
            // ✅ var(--input-bg) / var(--input-border) / var(--text-primary)
            background: 'var(--input-bg)',
            border: '1px solid var(--input-border)',
            color: 'var(--text-primary)',
            fontFamily: FONTS.body, fontSize: 13, fontWeight: 500,
            outline: 'none', WebkitAppearance: 'none',
          }}
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        onTouchStart={e => { if (value.trim()) e.currentTarget.style.transform = 'scale(0.95)' }}
        onTouchEnd={e => { e.currentTarget.style.transform = '' }}
        style={{
          flexShrink: 0, padding: '13px 20px', borderRadius: 14, border: 'none',
          // ✅ Active: var(--accent-gradient); disabled: var(--btn-disabled)
          background: value.trim() ? 'var(--accent-gradient)' : 'var(--btn-disabled)',
          color: value.trim() ? 'var(--text-inverse)' : 'var(--text-disabled)',
          fontFamily: FONTS.body, fontWeight: 700, fontSize: 13,
          cursor: value.trim() ? 'pointer' : 'not-allowed',
          boxShadow: value.trim() ? '0 4px 16px var(--accent-glow)' : 'none',
          WebkitTapHighlightColor: 'transparent', transition: 'all 0.15s',
        }}
      >
        Go
      </button>
    </div>
  )
}

export default TableDetectionPage