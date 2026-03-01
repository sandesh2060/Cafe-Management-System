// src/modules/customer/components/menu/CategoryPills.jsx
import { useRef, useLayoutEffect, useEffect, useContext } from 'react'
import gsap from 'gsap'
import { ThemeContext } from '@shared/context/ThemeContext'

const LABELS = {
  all:          { icon: '✦',  text: 'All'      },
  hot_drinks:   { icon: '☕', text: 'Hot'      },
  cold_drinks:  { icon: '🧋', text: 'Cold'     },
  snacks:       { icon: '🥐', text: 'Snacks'   },
  meals:        { icon: '🍛', text: 'Meals'    },
  soups:        { icon: '🍲', text: 'Soups'    },
  dessert:      { icon: '🍰', text: 'Dessert'  },
  light_food:   { icon: '🥪', text: 'Light'    },
  fresh_juice:  { icon: '🍹', text: 'Juice'    },
  smoothies:    { icon: '🥤', text: 'Smoothie' },
  comfort_food: { icon: '🫕', text: 'Comfort'  },
  tea:          { icon: '🍵', text: 'Tea'      },
  coffee:       { icon: '☕', text: 'Coffee'   },
}

const CategoryPills = ({ categories = [], active = 'all', onChange }) => {
  const { isDark } = useContext(ThemeContext)
  const D = isDark

  const scrollRef  = useRef(null)
  const trackRef   = useRef(null)
  const pillRefs   = useRef({})
  const prevActive = useRef(null)
  const isFirst    = useRef(true)
  const tlRef      = useRef(null)

  const IDLE_COLOR   = D ? 'rgba(255,200,120,0.45)' : 'rgba(92,51,23,0.45)'
  const ACTIVE_COLOR = '#ffffff'

  /* ── Stagger mount animation ────────────────────────────────────────── */
  useEffect(() => {
    const pills = Object.values(pillRefs.current).filter(Boolean)
    if (!pills.length) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(pills,
      { y: 16, opacity: 0, scale: 0.8 },
      {
        y: 0, opacity: 1, scale: 1,
        duration: 0.42, stagger: 0.055,
        ease: 'back.out(2.4)',
        force3D: true, clearProps: 'all',
        delay: 0.08,
      }
    )
  }, [categories])

  /* ── Liquid morphing track ──────────────────────────────────────────── */
  useLayoutEffect(() => {
    const activePill = pillRefs.current[active]
    const wrap       = scrollRef.current
    const track      = trackRef.current
    if (!activePill || !wrap || !track) return

    const pillRect = activePill.getBoundingClientRect()
    const wrapRect = wrap.getBoundingClientRect()
    const targetX  = pillRect.left - wrapRect.left + wrap.scrollLeft
    const targetW  = pillRect.width

    if (tlRef.current) tlRef.current.kill()

    if (isFirst.current) {
      gsap.set(track, { x: targetX, width: targetW, opacity: 1 })
      categories.forEach(cat => {
        const el = pillRefs.current[cat]
        if (el) gsap.set(el, { color: cat === active ? ACTIVE_COLOR : IDLE_COLOR })
      })
      isFirst.current = false
      prevActive.current = active
      return
    }

    const currentX    = gsap.getProperty(track, 'x')
    const movingRight = targetX > currentX
    const stretchX    = movingRight ? currentX : targetX
    const stretchW    = Math.abs((targetX + targetW) - currentX)

    const tl = gsap.timeline()
    tlRef.current = tl

    // Phase 1: stretch toward target
    tl.to(track, {
      x: stretchX, width: stretchW,
      duration: 0.2, ease: 'power2.in', force3D: true,
    })

    // Phase 2: snap to final
    tl.to(track, {
      x: targetX, width: targetW,
      duration: 0.3, ease: 'expo.out', force3D: true,
    }, '-=0.04')

    // Previous pill → idle color
    if (prevActive.current && prevActive.current !== active) {
      const prevEl = pillRefs.current[prevActive.current]
      if (prevEl) {
        tl.to(prevEl, { color: IDLE_COLOR, duration: 0.2, ease: 'power1.out' }, 0)
      }
    }

    // New active pill → white + micro bounce
    tl.to(activePill, { color: ACTIVE_COLOR, duration: 0.18, ease: 'power2.out' }, 0.14)
    tl.fromTo(activePill,
      { scale: 0.92 },
      { scale: 1, duration: 0.42, ease: 'elastic.out(1.2, 0.5)', force3D: true },
      0.16
    )

    prevActive.current = active

    // Scroll active pill into view
    activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })

  }, [active, categories])

  /* ── Handle theme change — reset colors ─────────────────────────────── */
  useEffect(() => {
    categories.forEach(cat => {
      const el = pillRefs.current[cat]
      if (!el) return
      gsap.to(el, {
        color: cat === active ? ACTIVE_COLOR : IDLE_COLOR,
        duration: 0.22, ease: 'power2.out',
      })
    })
  }, [isDark])

  return (
    <>
      <div className="cp-root">
        <div ref={scrollRef} className="cp-scroll">

          {/* Liquid morphing track */}
          <div ref={trackRef} className="cp-track" style={{ opacity: 0 }} aria-hidden="true" />

          {categories.map((cat) => {
            const meta = LABELS[cat] || { icon: '•', text: cat.replace(/_/g, ' ') }
            return (
              <button
                key={cat}
                ref={el => { if (el) pillRefs.current[cat] = el }}
                onClick={() => { if (cat !== active) onChange(cat) }}
                className="cp-pill"
                aria-pressed={cat === active}
                aria-label={`Filter by ${meta.text}`}
                style={{ color: IDLE_COLOR }}
              >
                <span className="cp-icon" aria-hidden="true">{meta.icon}</span>
                <span className="cp-text">{meta.text}</span>
              </button>
            )
          })}
        </div>

        {/* Right-edge fade */}
        <div className="cp-edge-fade" aria-hidden="true" />
      </div>

      <style>{`
        .cp-root {
          position: relative;
          overflow: hidden;
        }

        .cp-scroll {
          position: relative;
          display: flex;
          align-items: center;
          gap: 5px;
          overflow-x: auto;
          padding: 2px 16px 6px;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .cp-scroll::-webkit-scrollbar { display: none; }

        /* ── Liquid track ── */
        .cp-track {
          position: absolute;
          top: 2px;
          left: 0;
          height: calc(100% - 8px);
          border-radius: 100px;
          background: linear-gradient(135deg, #FF9F1C 0%, #E05C2A 100%);
          box-shadow:
            0 4px 20px rgba(255,130,0,0.38),
            0 1px 0 rgba(255,255,255,0.22) inset;
          pointer-events: none;
          z-index: 0;
          will-change: transform, width;
          transform-origin: left center;
        }

        /* ── Pill ── */
        .cp-pill {
          position: relative;
          z-index: 1;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 0 13px;
          height: 34px;
          border-radius: 100px;
          border: 1px solid ${D ? 'rgba(255,255,255,0.07)' : 'rgba(237,217,184,0.7)'};
          background: ${D ? 'rgba(255,255,255,0.03)' : 'rgba(255,248,238,0.6)'};
          cursor: pointer;
          white-space: nowrap;
          font-family: "DM Sans", sans-serif;
          font-size: 12.5px;
          font-weight: 600;
          letter-spacing: 0.005em;
          -webkit-tap-highlight-color: transparent;
          outline: none;
          transition:
            background 0.18s ease,
            border-color 0.18s ease;
        }
        .cp-pill:hover {
          background: ${D ? 'rgba(255,255,255,0.07)' : 'rgba(237,217,184,0.35)'};
          border-color: ${D ? 'rgba(255,255,255,0.12)' : 'rgba(237,170,80,0.5)'};
        }
        .cp-pill:active { transform: scale(0.94); }
        .cp-pill:focus-visible {
          outline: 2px solid rgba(255,159,28,0.5);
          outline-offset: 2px;
        }

        .cp-icon { font-size: 13px; line-height: 1; }
        .cp-text  { line-height: 1; }

        /* ── Right edge fade ── */
        .cp-edge-fade {
          position: absolute;
          top: 0; right: 0;
          width: 48px; height: 100%;
          background: linear-gradient(
            to left,
            ${D ? 'rgba(12,8,4,1)' : 'rgba(253,249,242,1)'} 0%,
            transparent 100%
          );
          pointer-events: none;
          z-index: 5;
          transition: background var(--transition-theme);
        }
      `}</style>
    </>
  )
}

export default CategoryPills