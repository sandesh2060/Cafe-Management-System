// src/modules/table/components/GpsStatusIndicator.jsx
//
// ✅ COLORS import removed — var(--token) replaces all COLORS.* references
// ✅ State colors: brew.soft → var(--text-muted), saffron → var(--accent), matcha → var(--success)
// ✅ Pulse ring bg now uses CSS custom property pattern instead of hex string concatenation
// ✅ GSAP pulse animation unchanged

import { useEffect, useRef } from 'react'
import { MapPin }            from 'lucide-react'
import gsap                  from 'gsap'

// ✅ All colors via var(--token) — was COLORS.brew.soft / saffron.DEFAULT / matcha.DEFAULT
const STATE_CONFIG = {
  idle: {
    label:     'Tap to find your table',
    color:     'var(--text-muted)',
    ringColor: 'var(--pill-bg)',
    pulse:     false,
  },
  requestingGPS: {
    label:     'Requesting GPS…',
    color:     'var(--accent)',
    ringColor: 'var(--accent-dim)',
    pulse:     true,
  },
  collectingReadings: {
    label:     'Collecting GPS readings…',
    color:     'var(--accent)',
    ringColor: 'var(--accent-dim)',
    pulse:     true,
  },
  creatingSession: {
    label:     'Almost there!',
    color:     'var(--success)',
    ringColor: 'var(--success-bg)',
    pulse:     false,
  },
}

const GpsStatusIndicator = ({ state }) => {
  const pinRef   = useRef(null)
  const ring1Ref = useRef(null)
  const ring2Ref = useRef(null)
  const cfg      = STATE_CONFIG[state] || STATE_CONFIG.idle

  useEffect(() => {
    if (!cfg.pulse || !ring1Ref.current) return
    const tl = gsap.timeline({ repeat: -1 })
    tl.fromTo(
      [ring1Ref.current, ring2Ref.current],
      { scale: 1, opacity: 0.7 },
      { scale: 2.5, opacity: 0, duration: 1.5, stagger: 0.5, ease: 'power2.out' }
    )
    return () => tl.kill()
  }, [cfg.pulse])

  return (
    <div className="relative flex items-center justify-center w-24 h-24 mx-auto">
      {/* Pulse rings */}
      {cfg.pulse && (
        <>
          <div
            ref={ring1Ref}
            className="absolute w-16 h-16 rounded-full opacity-0"
            // ✅ var(--accent-dim) — was COLORS.saffron.DEFAULT + '30' (hex concat)
            style={{ background: 'var(--accent-dim)' }}
          />
          <div
            ref={ring2Ref}
            className="absolute w-16 h-16 rounded-full opacity-0"
            style={{ background: 'var(--accent-dim)', opacity: 0.6 }}
          />
        </>
      )}

      {/* Center icon */}
      <div
        ref={pinRef}
        className="w-16 h-16 rounded-full flex items-center justify-center z-10"
        // ✅ ringColor from config — var(--pill-bg), var(--accent-dim), var(--success-bg)
        style={{ background: cfg.ringColor }}
      >
        {/* ✅ cfg.color is a var(--token) string — valid for SVG stroke/fill via currentColor */}
        <MapPin size={32} style={{ color: cfg.color }} />
      </div>
    </div>
  )
}

export default GpsStatusIndicator