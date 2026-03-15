// src/modules/customer/components/notifications/ExploreToasts.jsx
//
// FIXES:
// • animPolaroid1/2 and shutterBlink now guard against null refs before
//   animating. delayedCall fires after 4-5s; if the component unmounts
//   before then, ctx.revert() kills the tweens but the callback itself
//   still executes — the null check prevents the "Invalid scope" /
//   "GSAP target null" spam on every rAF tick.
// • All gsap.delayedCall handles stored and killed explicitly in cleanup
//   so they never fire after unmount, even in StrictMode double-invoke.
// • sparkRef orbit loop guards el existence before animating.
// • useExploreToasts: addToast wrapped in useRef so timer callbacks never
//   capture a stale closure — eliminates the "called after unmount" case
//   that caused new toast to show after navigate-away.
// • useState import moved to top of file.

import { useEffect, useRef, useCallback, useContext, useState } from 'react'
import { createPortal }             from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate }              from 'react-router-dom'
import gsap                         from 'gsap'
import { ThemeContext }             from '@shared/context/ThemeContext'
import { selectRole, selectIsGuest } from '@store/slices/authSlice'
import { selectActiveOrder }        from '@store/slices/orderSlice'

const genId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`

// ─── GALLERY SVG ──────────────────────────────────────────────────────────────
const GallerySVG = ({ accent }) => {
  const svgRef       = useRef(null)
  const shutterRef   = useRef(null)
  const lens1Ref     = useRef(null)
  const lens2Ref     = useRef(null)
  const flashRef     = useRef(null)
  const polaroid1Ref = useRef(null)
  const polaroid2Ref = useRef(null)
  const sparkRef     = useRef([])
  // Store delayedCall handles so we can kill them on cleanup
  const callsRef     = useRef([])

  useEffect(() => {
    if (!svgRef.current) return

    const ctx = gsap.context(() => {
      // Camera body breathe
      gsap.to(svgRef.current, {
        scale: 1.04, duration: 2.2, ease: 'sine.inOut',
        yoyo: true, repeat: -1,
      })

      // Lens pulse
      if (lens1Ref.current) {
        gsap.to(lens1Ref.current, {
          scale: 1.18, opacity: 0.5, duration: 1.4,
          ease: 'sine.inOut', yoyo: true, repeat: -1,
          transformOrigin: 'center',
        })
      }
      if (lens2Ref.current) {
        gsap.to(lens2Ref.current, {
          scale: 0.88, opacity: 0.85, duration: 1.8,
          ease: 'sine.inOut', yoyo: true, repeat: -1,
          transformOrigin: 'center', delay: 0.3,
        })
      }

      // Shutter blink — FIX: guard null before animating
      const shutterBlink = () => {
        if (!shutterRef.current || !flashRef.current) return
        gsap.timeline()
          .to(shutterRef.current, { scaleY: 0.05, duration: 0.07, ease: 'power3.in', transformOrigin: 'center' })
          .to(flashRef.current,   { opacity: 0.9, duration: 0.05 }, '<')
          .to(shutterRef.current, { scaleY: 1,    duration: 0.14, ease: 'back.out(2)', transformOrigin: 'center' })
          .to(flashRef.current,   { opacity: 0,   duration: 0.18 }, '<0.04')
      }
      callsRef.current.push(
        gsap.delayedCall(0.8, shutterBlink),
        gsap.delayedCall(3.2, shutterBlink),
        gsap.delayedCall(5.6, shutterBlink),
      )

      // Polaroid 1 — FIX: guard null, store handles
      const animPolaroid1 = () => {
        if (!polaroid1Ref.current) return
        gsap.set(polaroid1Ref.current, { y: 0, x: -2, opacity: 0, rotation: -8, scale: 0.7 })
        gsap.timeline()
          .to(polaroid1Ref.current, { opacity: 1, scale: 1, y: -14, x: -6, rotation: -12, duration: 0.5, ease: 'back.out(2)' })
          .to(polaroid1Ref.current, { y: -22, x: -8, rotation: -14, duration: 1.8, ease: 'sine.inOut' })
          .to(polaroid1Ref.current, { opacity: 0, y: -30, duration: 0.4, ease: 'power2.in' })
      }
      callsRef.current.push(
        gsap.delayedCall(0.4, animPolaroid1),
        gsap.delayedCall(4.0, animPolaroid1),
      )

      // Polaroid 2 — FIX: guard null, store handles
      const animPolaroid2 = () => {
        if (!polaroid2Ref.current) return
        gsap.set(polaroid2Ref.current, { y: 0, x: 2, opacity: 0, rotation: 6, scale: 0.7 })
        gsap.timeline()
          .to(polaroid2Ref.current, { opacity: 1, scale: 1, y: -12, x: 8, rotation: 11, duration: 0.5, ease: 'back.out(2)' })
          .to(polaroid2Ref.current, { y: -20, x: 10, rotation: 13, duration: 1.8, ease: 'sine.inOut' })
          .to(polaroid2Ref.current, { opacity: 0, y: -28, duration: 0.4, ease: 'power2.in' })
      }
      callsRef.current.push(
        gsap.delayedCall(1.6, animPolaroid2),
        gsap.delayedCall(5.2, animPolaroid2),
      )

      // Sparks orbit — FIX: guard el before animating
      sparkRef.current.forEach((el, i) => {
        if (!el) return
        const angle  = (i / sparkRef.current.length) * Math.PI * 2
        const radius = 16 + i * 1.5
        gsap.to(el, {
          keyframes: [
            { x: Math.cos(angle) * radius,           y: Math.sin(angle) * radius,           duration: (2.8 + i * 0.4) * 0.5 },
            { x: Math.cos(angle + Math.PI) * radius, y: Math.sin(angle + Math.PI) * radius, duration: (2.8 + i * 0.4) * 0.5 },
          ],
          repeat: -1, ease: 'none', delay: i * 0.22,
        })
        gsap.to(el, { opacity: 0.15, duration: 0.8 + i * 0.3, yoyo: true, repeat: -1, ease: 'sine.inOut' })
      })

    }, svgRef)

    return () => {
      // FIX: kill all delayedCalls explicitly before reverting context
      callsRef.current.forEach(c => c?.kill())
      callsRef.current = []
      ctx.revert()
    }
  }, [])

  return (
    <svg ref={svgRef} width="52" height="52" viewBox="0 0 52 52" fill="none"
      style={{ flexShrink: 0, transformOrigin: 'center' }}>
      <rect ref={flashRef} x="0" y="0" width="52" height="52" rx="13"
        fill="white" opacity="0" style={{ pointerEvents: 'none' }} />
      <rect x="6" y="14" width="40" height="28" rx="6"
        fill={`${accent}22`} stroke={accent} strokeWidth="1.8" />
      <rect x="18" y="9" width="16" height="8" rx="3"
        fill={`${accent}18`} stroke={accent} strokeWidth="1.5" />
      <circle cx="38" cy="20" r="2.5" fill={accent} opacity="0.7" />
      <circle cx="24" cy="28" r="10" fill={`${accent}14`}
        stroke={accent} strokeWidth="1.6" />
      <circle ref={lens1Ref} cx="24" cy="28" r="6.5"
        fill={`${accent}20`} stroke={accent} strokeWidth="1.2" opacity="0.8" />
      <circle ref={lens2Ref} cx="24" cy="28" r="3.5"
        fill={accent} opacity="0.9" />
      <line ref={shutterRef} x1="24" y1="22" x2="24" y2="34"
        stroke="white" strokeWidth="1.5" opacity="0.6"
        style={{ transformOrigin: '24px 28px' }} />
      {[0,1,2,3].map(i => (
        <circle key={i} ref={el => { sparkRef.current[i] = el }}
          cx="24" cy="12" r={1.2 - i * 0.15}
          fill={accent} opacity="0.6" />
      ))}
      <g ref={polaroid1Ref} opacity="0">
        <rect x="4" y="24" width="14" height="16" rx="2"
          fill="white" stroke={`${accent}60`} strokeWidth="1" />
        <rect x="5.5" y="25.5" width="11" height="9" rx="1" fill={`${accent}30`} />
        <line x1="7" y1="28" x2="15" y2="28" stroke={`${accent}60`} strokeWidth="0.8" />
        <line x1="7" y1="30" x2="13" y2="30" stroke={`${accent}40`} strokeWidth="0.8" />
      </g>
      <g ref={polaroid2Ref} opacity="0">
        <rect x="34" y="24" width="14" height="16" rx="2"
          fill="white" stroke={`${accent}60`} strokeWidth="1" />
        <rect x="35.5" y="25.5" width="11" height="9" rx="1" fill={`${accent}30`} />
        <line x1="37" y1="28" x2="45" y2="28" stroke={`${accent}60`} strokeWidth="0.8" />
        <line x1="37" y1="30" x2="43" y2="30" stroke={`${accent}40`} strokeWidth="0.8" />
      </g>
    </svg>
  )
}

// ─── REVIEWS SVG ──────────────────────────────────────────────────────────────
const ReviewsSVG = ({ accent }) => {
  const starRefs  = useRef([])
  const orbitRef  = useRef(null)
  const quote1Ref = useRef(null)
  const quote2Ref = useRef(null)
  const lineRefs  = useRef([])
  const glowRef   = useRef(null)
  const callsRef  = useRef([])

  const STARS = [
    { cx: 26, cy: 14, r: 5.5 },
    { cx: 14, cy: 24, r: 3.5 },
    { cx: 38, cy: 24, r: 3.5 },
    { cx: 18, cy: 36, r: 3 },
    { cx: 34, cy: 36, r: 3 },
  ]
  const LINES = [[0,1],[0,2],[1,3],[2,4],[1,2]]

  useEffect(() => {
    if (!starRefs.current.length) return
    const ctx = gsap.context(() => {

      starRefs.current.forEach((el, i) => {
        if (!el) return
        gsap.set(el, { scale: 0, opacity: 0, transformOrigin: 'center' })
        gsap.timeline({ delay: i * 0.22 + 0.1 })
          .to(el, { scale: 1.35, opacity: 1, duration: 0.22, ease: 'back.out(4)' })
          .to(el, { scale: 1, duration: 0.18, ease: 'elastic.out(1, 0.5)' })
      })

      lineRefs.current.forEach((el, i) => {
        if (!el) return
        const length = el.getTotalLength?.() ?? 20
        gsap.set(el, { strokeDasharray: length, strokeDashoffset: length, opacity: 0 })
        gsap.to(el, { strokeDashoffset: 0, opacity: 0.45, duration: 0.5, ease: 'power2.out', delay: 0.6 + i * 0.12 })
      })

      starRefs.current.forEach((el, i) => {
        if (!el) return
        gsap.to(el, {
          scale: 1.12, duration: 1.4 + i * 0.2,
          ease: 'sine.inOut', yoyo: true, repeat: -1,
          delay: 1.2 + i * 0.15, transformOrigin: 'center',
        })
      })

      if (glowRef.current) {
        gsap.to(glowRef.current, {
          scale: 1.6, opacity: 0.12, duration: 1.8,
          ease: 'sine.inOut', yoyo: true, repeat: -1,
          transformOrigin: 'center',
        })
      }

      // FIX: guard null refs in quote callbacks
      const animQuote1 = () => {
        if (!quote1Ref.current) return
        gsap.set(quote1Ref.current, { x: 0, y: 4, opacity: 0, scale: 0.6 })
        gsap.timeline()
          .to(quote1Ref.current, { opacity: 1, scale: 1, y: -4, duration: 0.4, ease: 'back.out(2.5)' })
          .to(quote1Ref.current, { y: -8, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: 1 })
          .to(quote1Ref.current, { opacity: 0, scale: 0.7, y: -12, duration: 0.3, ease: 'power2.in' })
      }
      callsRef.current.push(
        gsap.delayedCall(0.3, animQuote1),
        gsap.delayedCall(4.2, animQuote1),
      )

      const animQuote2 = () => {
        if (!quote2Ref.current) return
        gsap.set(quote2Ref.current, { x: 0, y: 4, opacity: 0, scale: 0.6 })
        gsap.timeline()
          .to(quote2Ref.current, { opacity: 1, scale: 1, y: -4, duration: 0.4, ease: 'back.out(2.5)' })
          .to(quote2Ref.current, { y: -8, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: 1 })
          .to(quote2Ref.current, { opacity: 0, scale: 0.7, y: -12, duration: 0.3, ease: 'power2.in' })
      }
      callsRef.current.push(
        gsap.delayedCall(1.8, animQuote2),
        gsap.delayedCall(5.6, animQuote2),
      )

      if (orbitRef.current) {
        gsap.to(orbitRef.current, {
          rotation: 360, duration: 8, ease: 'none', repeat: -1,
          transformOrigin: '26px 26px',
        })
      }

    })
    return () => {
      callsRef.current.forEach(c => c?.kill())
      callsRef.current = []
      ctx.revert()
    }
  }, [])

  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ flexShrink: 0 }}>
      <circle ref={orbitRef} cx="26" cy="26" r="22"
        stroke={accent} strokeWidth="0.6" strokeDasharray="3 6" opacity="0.25" />
      <circle ref={glowRef} cx="26" cy="14" r="9" fill={accent} opacity="0.08" />
      {LINES.map(([a, b], i) => (
        <line key={i} ref={el => { lineRefs.current[i] = el }}
          x1={STARS[a].cx} y1={STARS[a].cy}
          x2={STARS[b].cx} y2={STARS[b].cy}
          stroke={accent} strokeWidth="0.8" opacity="0" />
      ))}
      {STARS.map((s, i) => (
        <g key={i} ref={el => { starRefs.current[i] = el }}
          style={{ transformOrigin: `${s.cx}px ${s.cy}px` }}>
          <circle cx={s.cx} cy={s.cy} r={s.r + 3} fill={accent} opacity="0.12" />
          <polygon points={starPoints(s.cx, s.cy, s.r, s.r * 0.42, 5)} fill={accent} />
        </g>
      ))}
      <g ref={quote1Ref} opacity="0" style={{ transformOrigin: '10px 40px' }}>
        <rect x="2" y="34" width="18" height="12" rx="4"
          fill={`${accent}22`} stroke={accent} strokeWidth="1" />
        <text x="6" y="43" fontSize="8" fill={accent} opacity="0.9" fontFamily="Georgia, serif">"</text>
        <text x="13" y="43" fontSize="8" fill={accent} opacity="0.9" fontFamily="Georgia, serif">"</text>
        <polygon points="6,46 10,46 8,50" fill={`${accent}22`} />
      </g>
      <g ref={quote2Ref} opacity="0" style={{ transformOrigin: '42px 40px' }}>
        <rect x="32" y="34" width="18" height="12" rx="4"
          fill={`${accent}22`} stroke={accent} strokeWidth="1" />
        <text x="36" y="43" fontSize="8" fill={accent} opacity="0.9" fontFamily="Georgia, serif">"</text>
        <text x="43" y="43" fontSize="8" fill={accent} opacity="0.9" fontFamily="Georgia, serif">"</text>
        <polygon points="44,46 48,46 46,50" fill={`${accent}22`} />
      </g>
    </svg>
  )
}

function starPoints(cx, cy, outerR, innerR, points) {
  const pts = []
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI / points) * i - Math.PI / 2
    const r     = i % 2 === 0 ? outerR : innerR
    pts.push(`${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`)
  }
  return pts.join(' ')
}

// ─── ExploreToastCard ─────────────────────────────────────────────────────────
const ExploreToastCard = ({
  id, title, message, accent, glow, border,
  isDark, svg, onDismiss, onNavigate, duration = 9000,
}) => {
  const wrapRef     = useRef(null)
  const barRef      = useRef(null)
  const barTweenRef = useRef(null)
  const timerRef    = useRef(null)
  const shimRef     = useRef(null)
  const dismissedRef = useRef(false)  // FIX: prevent double-dismiss

  useEffect(() => {
    if (!wrapRef.current) return
    gsap.set(wrapRef.current, { y: -90, opacity: 0, scale: 0.88, rotateX: 8 })
    gsap.to(wrapRef.current, { y: 0, opacity: 1, scale: 1, rotateX: 0, duration: 0.6, ease: 'back.out(1.8)' })
    if (shimRef.current) {
      gsap.fromTo(shimRef.current, { x: '-110%' }, { x: '110%', duration: 1.0, ease: 'power2.inOut', delay: 0.3 })
    }
  }, [])

  useEffect(() => {
    if (!barRef.current) return
    gsap.set(barRef.current, { scaleX: 1, transformOrigin: 'left center' })
    barTweenRef.current = gsap.to(barRef.current, {
      scaleX: 0, duration: duration / 1000, ease: 'none',
      onComplete: handleDismiss,
    })
    return () => barTweenRef.current?.kill()
  }, [duration])

  useEffect(() => {
    timerRef.current = setTimeout(handleDismiss, duration)
    return () => clearTimeout(timerRef.current)
  }, [duration])

  const handleDismiss = useCallback(() => {
    if (dismissedRef.current) return   // FIX: guard double-call
    dismissedRef.current = true
    if (!wrapRef.current) { onDismiss(id); return }
    gsap.timeline()
      .to(wrapRef.current, { y: -80, opacity: 0, scale: 0.88, duration: 0.3, ease: 'power3.in' })
      .call(() => onDismiss(id))
  }, [id, onDismiss])

  const pauseAll = () => {
    clearTimeout(timerRef.current)
    barTweenRef.current?.pause()
  }

  const resumeAll = () => {
    barTweenRef.current?.resume()
    timerRef.current = setTimeout(handleDismiss, 2000)
  }

  const handleClick = () => {
    if (!wrapRef.current) { onNavigate(); return }
    gsap.timeline()
      .to(wrapRef.current, { scale: 0.96, duration: 0.08, ease: 'power2.in' })
      .to(wrapRef.current, { scale: 1.02, duration: 0.15, ease: 'back.out(3)' })
      .to(wrapRef.current, { y: -80, opacity: 0, scale: 0.9, duration: 0.28, ease: 'power3.in' })
      .call(() => { onDismiss(id); onNavigate() })
  }

  const bg = isDark ? 'rgba(8,4,1,0.88)' : 'rgba(255,253,248,0.9)'

  return (
    <div ref={wrapRef}
      onClick={handleClick}
      onMouseEnter={pauseAll}
      onMouseLeave={resumeAll}
      onTouchStart={pauseAll}
      onTouchEnd={resumeAll}
      style={{
        position: 'relative', overflow: 'hidden', borderRadius: 22,
        cursor: 'pointer', userSelect: 'none',
        background: bg,
        backdropFilter: 'blur(52px) saturate(200%)',
        WebkitBackdropFilter: 'blur(52px) saturate(200%)',
        border: `1px solid ${border}`,
        boxShadow: isDark
          ? `0 1px 0 rgba(255,255,255,0.08) inset,0 16px 56px rgba(0,0,0,0.65),0 0 32px ${glow}`
          : `0 1px 0 rgba(255,255,255,1) inset,0 8px 36px rgba(130,80,20,0.1),0 0 24px ${glow}`,
        WebkitTapHighlightColor: 'transparent',
      }}>
      <div ref={shimRef} aria-hidden style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: '45%',
        background: isDark
          ? 'linear-gradient(105deg,transparent,rgba(255,255,255,0.07) 50%,transparent)'
          : 'linear-gradient(105deg,transparent,rgba(255,255,255,0.35) 50%,transparent)',
        pointerEvents: 'none', zIndex: 1, transform: 'translateX(-110%)',
      }} />
      <div aria-hidden style={{
        position: 'absolute', top: 0, left: '6%', right: '6%', height: 1, pointerEvents: 'none',
        background: isDark
          ? 'linear-gradient(90deg,transparent,rgba(255,255,255,0.18) 50%,transparent)'
          : 'linear-gradient(90deg,transparent,rgba(255,255,255,1) 50%,transparent)',
      }} />
      <div aria-hidden style={{
        position: 'absolute', left: 0, top: '12%', bottom: '12%', width: 3,
        borderRadius: '0 3px 3px 0',
        background: `linear-gradient(180deg,${accent}66,${accent},${accent}66)`,
      }} />
      <div aria-hidden style={{
        position: 'absolute', top: -20, right: 16, width: 80, height: 80,
        borderRadius: '50%', background: glow, filter: 'blur(20px)',
        opacity: 0.7, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'relative', zIndex: 2,
        padding: '14px 42px 14px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 52, height: 52, flexShrink: 0, borderRadius: 14,
          background: isDark ? `${accent}14` : `${accent}0e`,
          border: `1px solid ${border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 16px ${glow}`, overflow: 'hidden',
        }}>
          {svg}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: '-0.025em',
            lineHeight: 1.2, marginBottom: 4,
            color: isDark ? '#FFF8EE' : '#2D1000',
            fontFamily: "'Baloo 2', system-ui, sans-serif",
          }}>{title}</p>
          <p style={{
            margin: 0, fontSize: 11.5, lineHeight: 1.5, fontWeight: 440,
            color: isDark ? 'rgba(255,232,180,0.72)' : 'rgba(90,45,5,0.78)',
            fontFamily: "'Baloo 2', system-ui, sans-serif",
          }}>{message}</p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            marginTop: 7, padding: '4px 10px', borderRadius: 8,
            background: `${accent}18`, border: `1px solid ${accent}35`,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: accent,
              fontFamily: "'Baloo 2', system-ui, sans-serif", letterSpacing: '0.02em' }}>
              Tap to explore →
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); handleDismiss() }}
        style={{
          position: 'absolute', top: 10, right: 10, zIndex: 3,
          width: 22, height: 22, borderRadius: '50%', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          color: isDark ? 'rgba(255,220,160,0.5)' : 'rgba(80,40,10,0.4)',
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        }}>
        <svg width="10" height="10" viewBox="0 0 10 10">
          <line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      <div aria-hidden style={{
        position: 'absolute', bottom: 0, left: '18%', right: '18%', height: 1, pointerEvents: 'none',
        background: `linear-gradient(90deg,transparent,${accent}80 50%,transparent)`, opacity: 0.7,
      }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5 }}>
        <div ref={barRef} style={{
          position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
          background: `linear-gradient(90deg,${accent}aa,${accent})`,
          borderRadius: 2, transformOrigin: 'left center',
        }} />
      </div>
    </div>
  )
}

// ─── Toast configs ────────────────────────────────────────────────────────────
const GALLERY_TOASTS = [
  { title: "Ever seen where your Momo comes from? 📸", message: "Swipe through our kitchen gallery. The steam is real.", condition: ({ visitCount }) => visitCount === 0 },
  { title: "This place looks even better in photos 📷", message: "Gallery vibes: Thukpa, Momos, and that one table by the window.", condition: () => true },
  { title: "You've been here before. Seen the photos? 📸", message: "Your favourite table is probably in there. Go check.", condition: ({ visitCount }) => visitCount >= 3 },
  { title: "Dal Bhat just hit different tonight 🍛", message: "Someone photographed it beautifully. Go be jealous. Then order it.", condition: ({ timeSlot }) => timeSlot === 'evening' || timeSlot === 'latenight' },
  { title: "Gold member. Have you seen the gallery? 👑", message: "The Chocolate Brownie photos will haunt you. Beautifully.", condition: ({ tier }) => tier === 'gold' },
  { title: "Rainy day + gallery browsing = peak 🌧️", message: "Warm food. Good photos. Zero reason to rush.", condition: ({ weatherKey }) => weatherKey === 'rain' || weatherKey === 'drizzle' },
]

const REVIEWS_TOASTS = [
  { title: "147 people tried the Masala Chiya ☕", message: "They all left reviews. Suspiciously good ones. Just saying.", condition: () => true },
  { title: "Someone reviewed your favourite item 👀", message: "They gave it 5 stars. You probably agree. Read what they wrote.", condition: ({ favouriteItem }) => !!favouriteItem, messageBuilder: ({ favouriteItem }) => `Someone left a review on ${favouriteItem}. 5 stars. You probably agree.` },
  { title: "Be the first to review your order 📝", message: "You just ate. Your opinion is hot. Share it while the memory is fresh.", condition: ({ lastOrderStatus }) => lastOrderStatus === 'served' || lastOrderStatus === 'delivered' },
  { title: "First visit and already a critic? 😄", message: "Review your first meal here. Future you will appreciate the archive.", condition: ({ visitCount }) => visitCount === 1 },
  { title: "People are very honest about the Momo 🥟", message: "Some reviews are emotional. Like, genuinely moved by dumplings.", condition: () => true },
  { title: "Your ${visitCount}th visit. No review yet? 🤔", message: "That's information. Share it with someone who needs it.", condition: ({ visitCount }) => visitCount >= 5, titleBuilder: ({ visitCount }) => `Your ${visitCount}th visit. No review yet? 🤔` },
]

const pickToast = (pool, ctx) => {
  const eligible = pool.filter(t => !t.condition || t.condition(ctx))
  if (!eligible.length) return pool[Math.floor(Math.random() * pool.length)]
  return eligible[Math.floor(Math.random() * eligible.length)]
}

// ─── ExploreToastPortal ───────────────────────────────────────────────────────
export const ExploreToastPortal = ({ toasts, onDismiss, onNavigate }) => {
  const { isDark } = useContext(ThemeContext)
  if (!toasts.length) return null
  return createPortal(
    <div style={{
      position: 'fixed',
      top: 'calc(env(safe-area-inset-top, 0px) + 88px)',
      left: 0, right: 0, zIndex: 9400,
      padding: '0 16px', pointerEvents: 'none',
    }}>
      <div style={{ position: 'relative', margin: '0 auto', width: '100%', maxWidth: 440, pointerEvents: 'auto' }}>
        {toasts.map((t, i) => (
          <div key={t.id} style={{ marginBottom: i < toasts.length - 1 ? 10 : 0 }}>
            <ExploreToastCard
              {...t}
              isDark={isDark}
              onDismiss={onDismiss}
              onNavigate={() => onNavigate(t.route)}
            />
          </div>
        ))}
      </div>
    </div>,
    document.body
  )
}

// ─── useExploreToasts hook ────────────────────────────────────────────────────
export const useExploreToasts = ({
  weather = null,
  orderHistory = [],
  activeOrder = null,
  visitCount = 0,
  favouriteItem = null,
  favouriteCategory = null,
  tier = 'none',
  timeSlot = 'morning',
} = {}) => {
  const navigate   = useNavigate()
  const { isDark } = useContext(ThemeContext)
  const [toasts, setToasts] = useState([])

  const firedRef      = useRef(new Set())
  const sessionCount  = useRef(0)
  const timer1Ref     = useRef(null)
  const timer2Ref     = useRef(null)
  const timer3Ref     = useRef(null)
  const orderFiredRef = useRef(new Set())
  const mountedRef    = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const weatherKey = weather ? (() => {
    const desc = (weather.description ?? '').toLowerCase()
    const temp = weather.temperature ?? 20
    if (desc.includes('rain'))    return 'rain'
    if (desc.includes('drizzle')) return 'drizzle'
    if (temp < 14)                return 'cold'
    if (temp > 30)                return 'hot'
    return 'clear'
  })() : null

  const lastOrderStatus = activeOrder?.status ?? orderHistory[0]?.status ?? null

  // FIX: use a ref for ctx so addToast timer callbacks never capture stale closure
  const ctxRef = useRef({})
  ctxRef.current = { visitCount, favouriteItem, favouriteCategory, tier, timeSlot, weatherKey, lastOrderStatus }

  const addToast = useCallback((type) => {
    // FIX: guard against firing after unmount
    if (!mountedRef.current) return
    if (sessionCount.current >= 3) return

    const isGallery = type === 'gallery'
    const pool      = isGallery ? GALLERY_TOASTS : REVIEWS_TOASTS
    const picked    = pickToast(pool, ctxRef.current)
    const id        = genId()

    const title   = picked.titleBuilder?.(ctxRef.current)   ?? picked.title
    const message = picked.messageBuilder?.(ctxRef.current) ?? picked.message

    const accent = isGallery ? '#F472B6' : '#FBBF24'
    const glow   = isGallery ? 'rgba(244,114,182,0.28)' : 'rgba(251,191,36,0.28)'
    const border = isGallery ? 'rgba(244,114,182,0.25)' : 'rgba(251,191,36,0.25)'
    const route  = isGallery ? '/gallery' : '/reviews'
    const svg    = isGallery ? <GallerySVG accent={accent} /> : <ReviewsSVG accent={accent} />

    sessionCount.current++
    setToasts(prev => [...prev, { id, title, message, accent, glow, border, svg, route, duration: 9000 }])
  }, []) // stable — reads ctxRef.current at call time, not at creation time

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const navigateTo = useCallback((route) => {
    navigate(route)
  }, [navigate])

  // After order served — reviews nudge
  useEffect(() => {
    if (!activeOrder?._id) return
    const id     = activeOrder._id
    const status = activeOrder.status
    if ((status === 'served' || status === 'delivered') && !orderFiredRef.current.has(id)) {
      orderFiredRef.current.add(id)
      timer1Ref.current = setTimeout(() => addToast('reviews'), 8000)
    }
    return () => clearTimeout(timer1Ref.current)
  }, [activeOrder, addToast])

  // Browsing interval toasts
  useEffect(() => {
    timer2Ref.current = setTimeout(() => {
      addToast('gallery')
      timer3Ref.current = setTimeout(() => addToast('reviews'), 4 * 60 * 1000)
    }, 2.5 * 60 * 1000)
    return () => {
      clearTimeout(timer2Ref.current)
      clearTimeout(timer3Ref.current)
    }
  }, [addToast])

  return { toasts, dismissToast, navigateTo }
}