// src/modules/customer/components/menu/RecommendedSection.jsx
//
// ZERO JITTER MOBILE CAROUSEL
//
// Why it's smooth:
//   • ZERO React state updates during drag — only refs + rAF
//   • transform applied via direct style mutation (no GSAP overhead in hot path)
//   • touchstart calls e.preventDefault() early to kill scroll competition
//   • Single rAF loop — no setTimeout, no GSAP during active drag
//   • Velocity sampled with EMA, momentum decay applied in rAF
//   • React state only updates AFTER snap completes (dots, scale)
//   • will-change: transform on track → GPU layer promoted from first paint

import {
  useRef, useEffect, useContext, useState,
  useCallback, useLayoutEffect,
} from 'react'
import gsap            from 'gsap'
import { ThemeContext } from '@shared/context/ThemeContext'
import RecommendedCard  from './RecommendedCard'

// ── Constants ──────────────────────────────────────────────────────────────────
const CARD_W    = 148
const GAP       = 12
const STRIDE    = CARD_W + GAP
const PAD_L     = 16
const AUTO_MS   = 2800
const RESUME_MS = 2800
const FRICTION  = 0.88   // momentum decay per frame
const MIN_VEL   = 0.3    // stop momentum below this

const WEATHER_META = {
  sunny:  { icon: '☀️', label: 'Sunny',  accent: '#FF9F1C' },
  hot:    { icon: '🌡️', label: 'Hot',    accent: '#E05C2A' },
  rainy:  { icon: '🌧️', label: 'Rainy',  accent: '#2563EB' },
  cold:   { icon: '❄️', label: 'Cold',   accent: '#1D4ED8' },
  cloudy: { icon: '☁️', label: 'Cloudy', accent: '#6B7280' },
  windy:  { icon: '💨', label: 'Windy',  accent: '#059669' },
  snowy:  { icon: '🌨️', label: 'Snowy',  accent: '#0284C7' },
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div style={{
    width: CARD_W, borderRadius: 20, overflow: 'hidden', flexShrink: 0,
    background: 'var(--bg-surface,rgba(255,248,238,0.8))',
    border: '1px solid var(--border-color,rgba(240,217,181,0.5))',
  }}>
    <div style={{ height: 104, background: 'var(--bg-surface-2,#FFE4B5)', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.45) 50%,transparent)',
        backgroundSize: '200% 100%',
        animation: 'rs-shimmer 1.5s ease-in-out infinite',
      }} />
    </div>
    <div style={{ padding: '10px 11px 11px', display: 'flex', flexDirection: 'column', gap: 7 }}>
      {[['44%',8],['76%',11],['54%',11]].map(([w,h],i)=>(
        <div key={i} style={{ height:h, width:w, borderRadius:6, background:'var(--bg-surface-2,#FFE4B5)' }} />
      ))}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:4 }}>
        <div style={{ height:14, width:36, borderRadius:6, background:'var(--bg-surface-2,#FFE4B5)' }} />
        <div style={{ width:30, height:30, borderRadius:10, background:'var(--bg-surface-2,#FFE4B5)' }} />
      </div>
    </div>
  </div>
)

// ── Dots (only re-renders when activeIdx changes) ──────────────────────────────
const SlideDots = ({ total, active, accent }) => {
  const count = Math.min(total, 7)
  const refs  = useRef([])

  useEffect(() => {
    refs.current.forEach((el, i) => {
      if (!el) return
      const on = i === ((active % count + count) % count)
      gsap.to(el, {
        width: on ? 22 : 5, opacity: on ? 1 : 0.22,
        backgroundColor: on ? accent : 'rgba(140,90,30,0.28)',
        duration: 0.38, ease: 'expo.out', overwrite: true,
      })
    })
  }, [active, accent, count])

  if (count <= 1) return null

  return (
    <div style={{ display:'flex', alignItems:'center', gap:4, paddingTop:10, paddingLeft:2 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} ref={el => (refs.current[i] = el)}
          style={{ height:5, width:5, borderRadius:99, flexShrink:0,
                   backgroundColor:'rgba(140,90,30,0.28)',
                   willChange:'width,opacity,background-color' }} />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CAROUSEL  — all drag logic lives here, 100% imperative
// ─────────────────────────────────────────────────────────────────────────────
const Carousel = ({ items, weather, accent }) => {
  const wrapRef    = useRef(null)   // overflow:hidden container
  const trackRef   = useRef(null)   // the moving strip
  const rafRef     = useRef(null)   // requestAnimationFrame id
  const autoRef    = useRef(null)   // auto-slide setTimeout
  const resumeRef  = useRef(null)   // resume setTimeout

  // All drag state in ONE ref — never triggers re-render
  const D = useRef({
    x:          0,      // current translateX
    idx:        0,      // snapped index
    dragging:   false,
    startX:     0,
    startY:     0,
    prevX:      0,
    vel:        0,
    isScroll:   null,   // null | true | false
    momentum:   false,  // in momentum phase
    n:          0,
  })

  const [activeIdx, setActiveIdx] = useState(0)
  const n = items.length

  // Sync n into ref
  useEffect(() => { D.current.n = n }, [n])

  // ── Direct DOM write — fastest possible ─────────────────────────────────
  const setTranslate = useCallback((x) => {
    if (!trackRef.current) return
    trackRef.current.style.transform = `translate3d(${x}px,0,0)`
    D.current.x = x
  }, [])

  // ── Scale cards imperatively ────────────────────────────────────────────
  const applyScale = useCallback((idx) => {
    if (!trackRef.current) return
    Array.from(trackRef.current.children).forEach((child, i) => {
      const active = i === idx
      gsap.to(child, {
        scale:   active ? 1.03 : 0.97,
        opacity: active ? 1    : 0.80,
        duration: 0.36,
        ease: 'back.out(1.6)',
        overwrite: true,
      })
    })
  }, [])

  // ── Clamp x with rubber-band ─────────────────────────────────────────────
  const clampX = useCallback((x) => {
    const max = 0
    const min = -(n - 1) * STRIDE
    if (x > max) return max + (x - max) * 0.15
    if (x < min) return min + (x - min) * 0.15
    return x
  }, [n])

  // ── Snap to index ────────────────────────────────────────────────────────
  const snapTo = useCallback((idx, dur = 0.44) => {
    cancelAnimationFrame(rafRef.current)
    D.current.momentum = false

    const clamped = Math.max(0, Math.min(n - 1, idx))
    const target  = -clamped * STRIDE
    D.current.idx = clamped

    gsap.to({ v: D.current.x }, {
      v: target,
      duration: dur,
      ease: 'expo.out',
      onUpdate: function() { setTranslate(this.targets()[0].v) },
      onComplete: () => {
        setTranslate(target)
        setActiveIdx(clamped)   // ← React state only after snap
        applyScale(clamped)
      },
    })
  }, [n, setTranslate, applyScale])

  // ── Auto-slide ───────────────────────────────────────────────────────────
  const stopAuto = useCallback(() => {
    clearTimeout(autoRef.current)
    clearTimeout(resumeRef.current)
  }, [])

  const startAuto = useCallback(() => {
    clearTimeout(autoRef.current)
    autoRef.current = setTimeout(() => {
      if (!D.current.dragging && !D.current.momentum) {
        const next = (D.current.idx + 1) % n
        snapTo(next, 0.52)
        startAuto()
      }
    }, AUTO_MS)
  }, [n, snapTo])

  const scheduleResume = useCallback(() => {
    clearTimeout(resumeRef.current)
    resumeRef.current = setTimeout(() => startAuto(), RESUME_MS)
  }, [startAuto])

  // ── Mount ────────────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    setTranslate(0)
    gsap.set(trackRef.current?.children[0] ?? {}, {})
    applyScale(0)
  }, [n, setTranslate, applyScale])

  useEffect(() => {
    const t = setTimeout(() => startAuto(), 1400)
    return () => {
      clearTimeout(t)
      stopAuto()
      cancelAnimationFrame(rafRef.current)
    }
  }, [startAuto, stopAuto])

  // ── Touch handlers — attached imperatively, NOT as React props ───────────
  // This is critical: React synthetic events go through the event delegation
  // system which adds latency. Native addEventListener is immediate.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    function onTouchStart(e) {
      stopAuto()
      cancelAnimationFrame(rafRef.current)
      D.current.momentum  = false

      const t = e.touches[0]
      D.current.dragging  = true
      D.current.startX    = t.clientX
      D.current.startY    = t.clientY
      D.current.prevX     = t.clientX
      D.current.vel       = 0
      D.current.isScroll  = null
    }

    function onTouchMove(e) {
      if (!D.current.dragging) return
      const t  = e.touches[0]
      const dx = t.clientX - D.current.prevX
      const dy = t.clientY - D.current.prevY || 0

      // Determine scroll axis on first move
      if (D.current.isScroll === null) {
        const adx = Math.abs(t.clientX - D.current.startX)
        const ady = Math.abs(t.clientY - D.current.startY)
        D.current.isScroll = ady > adx
        D.current.prevY    = t.clientY
      }

      if (D.current.isScroll) {
        // Vertical scroll — release drag
        D.current.dragging = false
        scheduleResume()
        return
      }

      // Horizontal drag — prevent page scroll
      e.preventDefault()

      // EMA velocity
      D.current.vel    = dx * 0.5 + D.current.vel * 0.5
      D.current.prevX  = t.clientX
      D.current.prevY  = t.clientY

      setTranslate(clampX(D.current.x + dx))
    }

    function onTouchEnd() {
      if (!D.current.dragging) return
      D.current.dragging = false

      const vel = D.current.vel

      // Fast fling → momentum scroll in rAF
      if (Math.abs(vel) > 2) {
        D.current.momentum = true
        let v = vel * 1.6   // amplify for feel

        function step() {
          if (!D.current.momentum) return
          v *= FRICTION
          const next = clampX(D.current.x + v)
          setTranslate(next)

          if (Math.abs(v) < MIN_VEL) {
            // Momentum done — snap to nearest
            D.current.momentum = false
            const nearest = Math.round(-D.current.x / STRIDE)
            snapTo(nearest)
            scheduleResume()
            return
          }
          rafRef.current = requestAnimationFrame(step)
        }
        rafRef.current = requestAnimationFrame(step)
      } else {
        // Slow drag — snap to nearest or in direction of drag
        let nearest = Math.round(-D.current.x / STRIDE)
        if (vel < -1.5 && nearest < n - 1) nearest++
        if (vel >  1.5 && nearest > 0)     nearest--
        snapTo(nearest)
        scheduleResume()
      }
    }

    el.addEventListener('touchstart',  onTouchStart, { passive: true })
    el.addEventListener('touchmove',   onTouchMove,  { passive: false })
    el.addEventListener('touchend',    onTouchEnd,   { passive: true })
    el.addEventListener('touchcancel', onTouchEnd,   { passive: true })

    return () => {
      el.removeEventListener('touchstart',  onTouchStart)
      el.removeEventListener('touchmove',   onTouchMove)
      el.removeEventListener('touchend',    onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [n, clampX, setTranslate, snapTo, stopAuto, scheduleResume])

  // ── Mouse (desktop) ──────────────────────────────────────────────────────
  const onMouseEnter = useCallback(() => stopAuto(),              [stopAuto])
  const onMouseLeave = useCallback(() => scheduleResume(),        [scheduleResume])

  return (
    <div
      ref={wrapRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ overflow: 'hidden', paddingLeft: PAD_L, cursor: 'grab' }}
    >
      {/* Track */}
      <div
        ref={trackRef}
        style={{
          display: 'flex',
          gap: GAP,
          willChange: 'transform',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          paddingRight: PAD_L,
        }}
      >
        {items.map((item, i) => (
          <div
            key={item._id || item.id || i}
            style={{
              flexShrink: 0,
              width: CARD_W,
              willChange: 'transform, opacity',
              transformOrigin: 'center bottom',
            }}
          >
            <RecommendedCard rec={item} index={i} weather={weather} />
          </div>
        ))}
      </div>

      {/* Dots */}
      <SlideDots total={n} active={activeIdx} accent={accent} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
const RecommendedSection = ({ items = [], weather, loading }) => {
  const headerRef = useRef(null)

  useEffect(() => {
    if (loading || !items.length || !headerRef.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(headerRef.current,
      { x: -14, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.44, ease: 'power3.out', delay: 0.1 }
    )
  }, [loading, items.length])

  useEffect(() => {
    if (!weather) return
    window.__qocWeather = weather
    window.dispatchEvent(new CustomEvent('qoc:weather', { detail: weather }))
  }, [weather])

  const valid  = items.filter(r => r && (r._id || r.id) && r.name)
  const wMeta  = WEATHER_META[weather?.condition]
  const accent = wMeta?.accent ?? '#FF9F1C'

  if (!loading && valid.length === 0) return null

  return (
    <section style={{ marginTop: 20 }}>

      {/* Header */}
      <div ref={headerRef} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 3, height: 18, borderRadius: 99, flexShrink: 0,
            background: 'linear-gradient(180deg,#FF9F1C,#E05C2A)',
          }} />
          <h2 style={{
            fontSize: 14, fontWeight: 900, margin: 0, lineHeight: 1,
            color: 'var(--text-primary,#2C1810)', letterSpacing: '-0.02em',
          }}>
            Recommended
          </h2>
          <span style={{ fontSize: 15, lineHeight: 1, userSelect: 'none' }}>✨</span>
        </div>

        {weather && wMeta && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px 4px 7px', borderRadius: 99,
            background: `${wMeta.accent}16`, border: `1px solid ${wMeta.accent}28`,
          }}>
            <span style={{ fontSize: 12, lineHeight: 1 }}>{wMeta.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: wMeta.accent, letterSpacing: '0.03em' }}>
              {wMeta.label}
              {weather.temp != null && (
                <span style={{ fontWeight: 500, marginLeft: 3, opacity: 0.8 }}>
                  {Math.round(weather.temp)}°C
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div style={{ display:'flex', gap:12, paddingLeft:PAD_L, overflowX:'auto', scrollbarWidth:'none' }}>
          {[1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <Carousel items={valid} weather={weather} accent={accent} />
      )}

      <style>{`
        @keyframes rs-shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
    </section>
  )
}

export default RecommendedSection