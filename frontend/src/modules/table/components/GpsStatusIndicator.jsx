// src/modules/table/components/GpsStatusIndicator.jsx
import { useEffect, useRef } from 'react'
import { MapPin }            from 'lucide-react'
import { COLORS }            from '@colors'
import gsap                  from 'gsap'

const STATE_CONFIG = {
  idle: {
    label:  'Tap to find your table',
    color:  COLORS.brew.soft,
    pulse:  false,
  },
  requestingGPS: {
    label:  'Requesting GPS…',
    color:  COLORS.saffron.DEFAULT,
    pulse:  true,
  },
  collectingReadings: {
    label:  'Collecting GPS readings…',
    color:  COLORS.saffron.DEFAULT,
    pulse:  true,
  },
  creatingSession: {
    label:  'Almost there!',
    color:  COLORS.matcha.DEFAULT,
    pulse:  false,
  },
}

const GpsStatusIndicator = ({ state }) => {
  const pinRef    = useRef(null)
  const ring1Ref  = useRef(null)
  const ring2Ref  = useRef(null)
  const cfg       = STATE_CONFIG[state] || STATE_CONFIG.idle

  useEffect(() => {
    if (!cfg.pulse || !ring1Ref.current) return

    const tl = gsap.timeline({ repeat: -1 })
    tl.fromTo([ring1Ref.current, ring2Ref.current],
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
            style={{ backgroundColor: cfg.color + '30' }}
          />
          <div
            ref={ring2Ref}
            className="absolute w-16 h-16 rounded-full opacity-0"
            style={{ backgroundColor: cfg.color + '20' }}
          />
        </>
      )}

      {/* Center icon */}
      <div
        ref={pinRef}
        className="w-16 h-16 rounded-full flex items-center justify-center z-10"
        style={{ backgroundColor: cfg.color + '15' }}
      >
        <MapPin size={32} color={cfg.color} />
      </div>
    </div>
  )
}

export default GpsStatusIndicator