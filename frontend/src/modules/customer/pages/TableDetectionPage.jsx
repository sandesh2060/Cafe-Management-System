// src/modules/customer/pages/TableDetectionPage.jsx
//
// FIX: On refresh, the old page mounted immediately (no auth guard on /detect),
// started GPS detection, and called createSession — even though the user was
// already logged in with an active session. By the time App.jsx finished the
// /auth/me bootstrap, GPS had already fired and navigate('/login') ran.
//
// Fixes applied:
// 1. BOOTSTRAP WAIT — renders a spinner until bootstrapReady=true. This prevents
//    GPS from starting before auth state is known.
// 2. EARLY REDIRECT — if already logged in AND session exists, redirect to /menu
//    immediately, before useTableDetection / GPS is even called.
// 3. startGPS guard — only fires when state is 'idle' AND bootstrapReady (extra safety).

import { useEffect, useRef, useContext, useState } from 'react'
import { useTableDetection }    from '@modules/table/hooks/useTableDetection'
import { useNavigate }          from 'react-router-dom'
import { useSelector }          from 'react-redux'
import { selectIsLoggedIn, selectBootstrapReady } from '@store/slices/authSlice'
import { selectTableId }        from '@store/slices/tableSessionSlice'
import { ThemeContext }          from '@shared/context/ThemeContext'
import QrScannerOverlay         from '@modules/table/components/QrScannerOverlay'
import { Navigation, QrCode, Hash, Wifi, RefreshCw, MapPin } from 'lucide-react'
import gsap                     from 'gsap'

const LOGO = 'https://res.cloudinary.com/dszy3sf5c/image/upload/v1771076878/kausi_chiya_logo_q8qult.png'

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

  // FIX 1: Wait for bootstrap, then redirect if already authed with a session.
  // This runs BEFORE GPS starts — prevents the whole detection flow.
  useEffect(() => {
    if (!bootstrapReady) return          // still loading — wait
    if (isLoggedIn && tableId) {
      navigate('/menu', { replace: true })
    }
  }, [bootstrapReady, isLoggedIn, tableId, navigate])

  // GSAP entrance + cleanup
  useEffect(() => {
    const targets = [ring1Ref.current, ring2Ref.current, ring3Ref.current, orbRef.current]
      .filter(Boolean)

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

    if (orbRef.current) {
      gsap.to(orbRef.current, { y: -20, duration: 3.8, repeat: -1, yoyo: true, ease: 'sine.inOut' })
    }

    return () => {
      tl.kill()
      gsap.killTweensOf(targets)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // FIX 2: Only start GPS after bootstrap is ready AND user is not already authed.
  const startGPSRef = useRef(startGPS)
  useEffect(() => { startGPSRef.current = startGPS }, [startGPS])
  useEffect(() => {
    if (state === 'idle' && bootstrapReady && !(isLoggedIn && tableId)) {
      startGPSRef.current()
    }
  }, [state, bootstrapReady, isLoggedIn, tableId])

  const isScanning = state === 'requestingGPS' || state === 'collectingReadings'
  const isReady    = state === 'idle'

  const bg         = D ? '#0C0804'                     : '#F0EAD6'
  const cardBg     = D ? 'rgba(14, 8, 3, 0.82)'        : 'rgba(255, 252, 244, 0.87)'
  const cardBorder = D ? 'rgba(255,159,28,0.13)'        : 'rgba(255,255,255,0.84)'
  const cardShadow = D
    ? '0 32px 80px rgba(0,0,0,0.72), 0 0 0 1px rgba(255,159,28,0.07)'
    : '0 24px 60px rgba(92,51,23,0.18), 0 0 0 1px rgba(210,175,110,0.2)'
  const textPri    = D ? '#FFF8EE'                     : '#120D06'
  const textMut    = D ? 'rgba(255,196,100,0.42)'       : 'rgba(92,51,23,0.44)'
  const ringColor  = D ? 'rgba(255,159,28,0.38)'        : 'rgba(200,104,10,0.28)'
  const orbColor   = D ? 'rgba(255,140,20,0.18)'        : 'rgba(255,159,28,0.14)'

  // FIX 3: Show spinner while bootstrap is in progress — don't render GPS UI yet
  if (!bootstrapReady) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: bg,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '2.5px solid rgba(255,159,28,0.2)',
          borderTopColor: '#FF9F1C',
          animation: 'tdp-spin 0.82s linear infinite',
        }} />
        <style>{`@keyframes tdp-spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: bg, position: 'relative', overflow: 'hidden',
      padding: 'max(52px, calc(env(safe-area-inset-top) + 28px)) 18px max(36px, calc(env(safe-area-inset-bottom) + 20px))',
    }}>

      {/* Ambient top orb */}
      <div ref={orbRef} style={{
        position: 'absolute', top: '-6%', left: '50%', transform: 'translateX(-50%)',
        width: 360, height: 360, borderRadius: '50%',
        background: `radial-gradient(circle, ${orbColor} 0%, transparent 72%)`,
        filter: 'blur(50px)', pointerEvents: 'none', zIndex: 0, willChange: 'transform',
      }} />
      <div style={{
        position: 'absolute', bottom: '-8%', right: '-12%',
        width: 240, height: 240, borderRadius: '50%',
        background: D
          ? 'radial-gradient(circle, rgba(224,92,42,0.12) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(224,92,42,0.1) 0%, transparent 70%)',
        filter: 'blur(36px)', pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ═══ LOGO / BRAND ══════════════════════════════════════════════ */}
      <div ref={logoRef} style={{ textAlign: 'center', marginBottom: 30, position: 'relative', zIndex: 10 }}>
        <div style={{ position: 'relative', width: 82, height: 82, margin: '0 auto 14px' }}>
          <div style={{
            position: 'absolute', inset: -10, borderRadius: 26,
            background: 'radial-gradient(circle, rgba(255,159,28,0.32) 0%, transparent 72%)',
            filter: 'blur(10px)',
          }} />
          <img
            src={LOGO} alt="कौसी चिया"
            style={{
              width: 82, height: 82, borderRadius: 22, objectFit: 'contain',
              position: 'relative', zIndex: 1, padding: 9,
              background: D ? 'rgba(12,6,2,0.56)' : 'rgba(255,250,240,0.74)',
              backdropFilter: 'blur(14px)',
              border: D ? '1px solid rgba(255,159,28,0.2)' : '1px solid rgba(255,255,255,0.78)',
              boxShadow: D
                ? '0 8px 30px rgba(0,0,0,0.52), 0 0 0 1px rgba(255,159,28,0.1)'
                : '0 8px 24px rgba(92,51,23,0.18), 0 0 0 1px rgba(255,255,255,0.55)',
            }}
          />
        </div>
        <h1 style={{
          fontFamily: '"Noto Sans Devanagari", serif',
          fontWeight: 900, fontSize: 'clamp(28px, 7.5vw, 34px)',
          letterSpacing: '-0.025em', lineHeight: 1.1, margin: '0 0 7px',
          background: D
            ? 'linear-gradient(128deg, #FFE8A0 0%, #FF9F1C 42%, #E05C2A 100%)'
            : 'linear-gradient(128deg, #C8680A 0%, #E05C2A 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text', filter: 'drop-shadow(0 2px 8px rgba(255,140,20,0.3))',
        }}>
          कौसी चिया
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 1, background: D ? 'rgba(255,159,28,0.25)' : 'rgba(200,104,10,0.22)', borderRadius: 99 }} />
          <p style={{
            fontFamily: '"DM Sans", system-ui, sans-serif',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase',
            color: D ? 'rgba(255,184,77,0.38)' : 'rgba(92,51,23,0.36)', margin: 0,
          }}>
            Smart Café · Kathmandu
          </p>
          <div style={{ width: 26, height: 1, background: D ? 'rgba(255,159,28,0.25)' : 'rgba(200,104,10,0.22)', borderRadius: 99 }} />
        </div>
      </div>

      {/* ═══ DETECTION CARD ════════════════════════════════════════════ */}
      <div ref={cardRef} style={{
        width: '100%', maxWidth: 368, position: 'relative', zIndex: 10,
        borderRadius: 28, overflow: 'hidden',
        background: cardBg,
        backdropFilter: 'blur(36px) saturate(165%)',
        WebkitBackdropFilter: 'blur(36px) saturate(165%)',
        border: `1px solid ${cardBorder}`, boxShadow: cardShadow,
      }}>
        <div style={{
          position: 'absolute', top: 0, left: '12%', right: '12%',
          height: 1.5, borderRadius: 99,
          background: 'linear-gradient(90deg, transparent, #FF9F1C 28%, #FFD580 50%, #E05C2A 72%, transparent)',
          opacity: D ? 0.6 : 0.48,
        }} />

        {/* IDLE/READY */}
        {isReady && (
          <div style={{ padding: '36px 26px 30px', textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 20px',
              background: 'linear-gradient(135deg, #FF9F1C 0%, #E05C2A 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 26px rgba(255,159,28,0.42)',
            }}>
              <MapPin size={22} color="#fff" strokeWidth={2.5} />
            </div>
            <h2 style={{
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontWeight: 800, fontSize: 'clamp(19px, 5vw, 22px)',
              letterSpacing: '-0.03em', color: textPri, margin: '0 0 8px', lineHeight: 1.2,
            }}>
              Welcome to कौसी चिया
            </h2>
            <p style={{
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: 13, lineHeight: 1.55, color: textMut, margin: 0, padding: '0 6px',
            }}>
              Detecting your table…
            </p>
          </div>
        )}

        {/* GPS SCANNING */}
        {isScanning && (
          <div style={{ padding: '36px 26px 30px', textAlign: 'center' }}>
            <div style={{
              position: 'relative', width: 96, height: 96,
              margin: '0 auto 28px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {[ring1Ref, ring2Ref, ring3Ref].map((ref, i) => (
                <div key={i} ref={ref} style={{
                  position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
                  border: `1.5px solid ${ringColor}`, transformOrigin: 'center',
                  opacity: 0.5 - i * 0.12,
                }} />
              ))}
              <div style={{
                width: 56, height: 56, borderRadius: '50%', zIndex: 5, position: 'relative',
                background: 'linear-gradient(135deg, #FF9F1C 0%, #E05C2A 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 26px rgba(255,159,28,0.42), 0 2px 8px rgba(224,92,42,0.3)',
                border: '1.5px solid rgba(255,255,255,0.22)',
              }}>
                <Navigation size={22} color="#fff" strokeWidth={2.5} />
              </div>
            </div>

            <h2 style={{
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontWeight: 800, fontSize: 'clamp(19px, 5vw, 22px)',
              letterSpacing: '-0.03em', color: textPri, margin: '0 0 8px', lineHeight: 1.2,
            }}>
              Finding Your Table
            </h2>
            <p style={{
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: 13, lineHeight: 1.55, color: textMut, margin: '0 0 24px', padding: '0 6px',
            }}>
              {state === 'collectingReadings'
                ? 'Collecting GPS readings…'
                : 'Allow location access to detect your table automatically'}
            </p>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 99, marginBottom: 22,
              background: D ? 'rgba(255,159,28,0.08)' : 'rgba(255,159,28,0.09)',
              border: D ? '1px solid rgba(255,159,28,0.18)' : '1px solid rgba(255,159,28,0.22)',
            }}>
              <Wifi size={12} color="#FF9F1C" strokeWidth={2.2} />
              <span style={{
                fontFamily: '"DM Sans", system-ui, sans-serif',
                fontSize: 11, fontWeight: 700, color: '#FF9F1C', letterSpacing: '0.04em',
              }}>
                GPS · No QR Needed
              </span>
            </div>

            <div style={{ height: 2, borderRadius: 99, overflow: 'hidden', background: D ? 'rgba(255,255,255,0.05)' : 'rgba(92,51,23,0.06)' }}>
              <div style={{
                height: '100%', width: '42%', borderRadius: 99,
                background: 'linear-gradient(90deg, transparent, #FF9F1C, transparent)',
                animation: 'tdp-slide 1.85s ease-in-out infinite',
              }} />
            </div>

            {import.meta.env.DEV && (
              <p style={{
                marginTop: 12, fontSize: 10,
                fontFamily: '"DM Mono", monospace',
                color: D ? 'rgba(255,159,28,0.28)' : 'rgba(92,51,23,0.28)',
              }}>
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
                background: D ? 'rgba(255,159,28,0.09)' : 'rgba(255,159,28,0.09)',
                border: D ? '1px solid rgba(255,159,28,0.2)' : '1px solid rgba(255,159,28,0.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <QrCode size={25} color="#FF9F1C" />
              </div>
              <h2 style={{
                fontFamily: '"DM Sans", system-ui, sans-serif',
                fontWeight: 800, fontSize: 20, letterSpacing: '-0.03em', color: textPri, margin: '0 0 6px',
              }}>
                Scan Table QR
              </h2>
              <p style={{ fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: 13, color: textMut, margin: 0, lineHeight: 1.5 }}>
                GPS unavailable — scan the QR on your table
              </p>
            </div>

            <QrScannerOverlay onScan={onQrScanned} />

            <div style={{
              marginTop: 20, paddingTop: 20,
              borderTop: D ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(92,51,23,0.07)',
            }}>
              <p style={{
                textAlign: 'center', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                color: textMut, margin: '0 0 12px',
                fontFamily: '"DM Sans", system-ui, sans-serif',
              }}>
                No QR Code?
              </p>
              <ManualTableEntry onSubmit={onManualEntry} isDark={D} textPri={textPri} />
            </div>

            {import.meta.env.DEV && (
              <p style={{
                marginTop: 14, textAlign: 'center', fontSize: 10,
                fontFamily: '"DM Mono", monospace',
                color: D ? 'rgba(255,159,28,0.28)' : 'rgba(92,51,23,0.28)',
              }}>
                state: {state}
              </p>
            )}
          </div>
        )}

        {/* CREATING SESSION */}
        {state === 'creatingSession' && (
          <div style={{ padding: '48px 26px', textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 56, height: 56, margin: '0 auto 20px' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(255,159,28,0.14)', filter: 'blur(10px)' }} />
              <div style={{
                width: 56, height: 56, borderRadius: '50%', border: '3px solid',
                borderColor: D ? 'rgba(255,159,28,0.14)' : 'rgba(200,104,10,0.14)',
                borderTopColor: '#FF9F1C',
                animation: 'tdp-spin 0.82s linear infinite',
              }} />
            </div>
            <p style={{ fontFamily: '"DM Sans", system-ui, sans-serif', fontWeight: 700, fontSize: 16, color: textPri, margin: '0 0 5px' }}>
              Setting up your session…
            </p>
            <p style={{ fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: 12, color: textMut, margin: 0 }}>
              Just a moment
            </p>
          </div>
        )}

        {/* ERROR */}
        {isError && (
          <div style={{ padding: '38px 26px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16, lineHeight: 1 }}>😕</div>
            <h2 style={{
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontWeight: 800, fontSize: 20, letterSpacing: '-0.03em', color: textPri, margin: '0 0 8px',
            }}>
              Detection Failed
            </h2>
            <p style={{ fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: 13, color: textMut, margin: '0 0 28px', lineHeight: 1.55 }}>
              {context?.error || 'Could not detect your table. Please try again.'}
            </p>
            <button onClick={retry}
              onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.97)' }}
              onTouchEnd={(e) => { e.currentTarget.style.transform = '' }}
              style={{
                width: '100%', padding: '15px 20px', borderRadius: 16, border: 'none',
                background: 'linear-gradient(135deg, #FF9F1C 0%, #E05C2A 100%)', color: '#fff',
                fontFamily: '"DM Sans", system-ui, sans-serif', fontWeight: 700, fontSize: 15,
                boxShadow: '0 6px 24px rgba(255,159,28,0.38)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                WebkitTapHighlightColor: 'transparent', transition: 'transform 0.15s',
              }}>
              <RefreshCw size={16} strokeWidth={2.4} />
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <p style={{
        marginTop: 26, position: 'relative', zIndex: 10,
        fontFamily: '"DM Sans", system-ui, sans-serif',
        fontSize: 10, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase',
        color: D ? 'rgba(255,159,28,0.16)' : 'rgba(92,51,23,0.2)',
      }}>
        Powered by ConvoS
      </p>

      <style>{`
        @keyframes tdp-slide {
          0%   { transform: translateX(-130%) }
          100% { transform: translateX(340%)  }
        }
        @keyframes tdp-spin {
          to { transform: rotate(360deg) }
        }
      `}</style>
    </div>
  )
}

/* ── Manual Table Entry ── */
const ManualTableEntry = ({ onSubmit, isDark, textPri }) => {
  const [value, setValue] = useState('')
  const D = isDark

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
          color: D ? 'rgba(255,159,28,0.32)' : 'rgba(92,51,23,0.28)', pointerEvents: 'none',
        }} />
        <input
          type="text"
          inputMode="numeric"
          placeholder="Table number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
          style={{
            width: '100%', padding: '13px 12px 13px 32px', borderRadius: 14,
            background: D ? 'rgba(255,255,255,0.05)' : 'rgba(92,51,23,0.05)',
            border: D ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(92,51,23,0.1)',
            color: textPri,
            fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: 13, fontWeight: 500,
            outline: 'none', WebkitAppearance: 'none',
          }}
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        onTouchStart={(e) => { if (value.trim()) e.currentTarget.style.transform = 'scale(0.95)' }}
        onTouchEnd={(e) => { e.currentTarget.style.transform = '' }}
        style={{
          flexShrink: 0, padding: '13px 20px', borderRadius: 14, border: 'none',
          background: value.trim()
            ? 'linear-gradient(135deg, #FF9F1C 0%, #E05C2A 100%)'
            : (D ? 'rgba(255,255,255,0.06)' : 'rgba(92,51,23,0.08)'),
          color: value.trim() ? '#fff' : (D ? 'rgba(255,255,255,0.25)' : 'rgba(92,51,23,0.3)'),
          fontFamily: '"DM Sans", system-ui, sans-serif', fontWeight: 700, fontSize: 13,
          cursor: value.trim() ? 'pointer' : 'not-allowed',
          boxShadow: value.trim() ? '0 4px 16px rgba(255,159,28,0.32)' : 'none',
          WebkitTapHighlightColor: 'transparent', transition: 'all 0.15s',
        }}
      >
        Go
      </button>
    </div>
  )
}

export default TableDetectionPage