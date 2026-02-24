// src/modules/customer/components/menu/CategoryPills.jsx
import { useRef, useLayoutEffect, useEffect, useContext } from 'react'
import gsap from 'gsap'
import { ThemeContext } from '@shared/context/ThemeContext'

const LABELS = {
  all:          { icon: '✦', text: 'All'      },
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

  const scrollRef  = useRef(null)
  const trackRef   = useRef(null)
  const pillRefs   = useRef({})
  const prevActive = useRef(null)
  const isFirst    = useRef(true)
  const tlRef      = useRef(null)   // current animation timeline

  const IDLE_COLOR   = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(100,60,15,0.5)'
  const ACTIVE_COLOR = '#ffffff'

  // ── Stagger in on mount ──────────────────────────────────────
  useEffect(() => {
    const pills = Object.values(pillRefs.current).filter(Boolean)
    if (!pills.length) return
    gsap.fromTo(pills,
      { y: 14, opacity: 0, scale: 0.82 },
      { y: 0, opacity: 1, scale: 1, duration: 0.44, stagger: 0.06,
        ease: 'back.out(2.2)', force3D: true, clearProps: 'all', delay: 0.1 }
    )
  }, [categories])

  // ── Liquid morph animation ───────────────────────────────────
  useLayoutEffect(() => {
    const activePill = pillRefs.current[active]
    const wrap       = scrollRef.current
    const track      = trackRef.current
    if (!activePill || !wrap || !track) return

    // Geometry of target pill
    const pillRect = activePill.getBoundingClientRect()
    const wrapRect = wrap.getBoundingClientRect()
    const targetX  = pillRect.left - wrapRect.left + wrap.scrollLeft
    const targetW  = pillRect.width

    // Kill any running animation
    if (tlRef.current) tlRef.current.kill()

    if (isFirst.current) {
      // Snap immediately on first render
      gsap.set(track, { x: targetX, width: targetW, opacity: 1 })
      categories.forEach(cat => {
        const el = pillRefs.current[cat]
        if (el) gsap.set(el, { color: cat === active ? ACTIVE_COLOR : IDLE_COLOR })
      })
      isFirst.current = false
      prevActive.current = active
      return
    }

    // Get current track position
    const currentX = gsap.getProperty(track, 'x')
    const currentW = gsap.getProperty(track, 'width')

    // Decide direction: moving left or right?
    const movingRight = targetX > currentX

    // Mid-stretch: bridge between old and new position
    // Stretch the pill to cover both from-position and to-position
    const stretchX = movingRight ? currentX : targetX
    const stretchW = (targetX + targetW) - currentX

    const tl = gsap.timeline()
    tlRef.current = tl

    // Phase 1 — STRETCH toward target (like a rubber band pulling)
    tl.to(track, {
      x: stretchX,
      width: Math.abs(stretchW),
      duration: 0.22,
      ease: 'power2.in',
      force3D: true,
    })

    // Phase 2 — SNAP to final position (rubber band releases)
    tl.to(track, {
      x: targetX,
      width: targetW,
      duration: 0.32,
      ease: 'expo.out',
      force3D: true,
    }, '-=0.04')  // slight overlap for seamlessness

    // Color transitions — sync with the timeline
    // Previous active pill fades to idle
    if (prevActive.current && prevActive.current !== active) {
      const prevEl = pillRefs.current[prevActive.current]
      if (prevEl) {
        tl.to(prevEl, {
          color: IDLE_COLOR,
          duration: 0.22,
          ease: 'power1.out',
        }, 0)
      }
    }

    // New active pill brightens to white — slightly delayed so it starts as track arrives
    tl.to(activePill, {
      color: ACTIVE_COLOR,
      duration: 0.2,
      ease: 'power2.out',
    }, 0.16)

    // Tiny bounce on the activated pill
    tl.fromTo(activePill,
      { scale: 0.94 },
      { scale: 1, duration: 0.45, ease: 'elastic.out(1.2, 0.55)', force3D: true },
      0.18
    )

    prevActive.current = active

    // Scroll into view
    activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [active, categories])

  return (
    <>
      <div className="cp-root">
        <div ref={scrollRef} className="cp-scroll">

          {/* Liquid morphing track */}
          <div ref={trackRef} className="cp-track" style={{ opacity: 0 }} />

          {categories.map((cat) => {
            const meta = LABELS[cat] || { icon: '•', text: cat.replace(/_/g, ' ') }
            return (
              <button
                key={cat}
                ref={el => { if (el) pillRefs.current[cat] = el }}
                onClick={() => { if (cat !== active) onChange(cat) }}
                className="cp-pill"
                aria-pressed={cat === active}
                style={{ color: IDLE_COLOR }}
              >
                <span className="cp-icon">{meta.icon}</span>
                <span className="cp-text">{meta.text}</span>
              </button>
            )
          })}
        </div>

        {/* Right-edge fade */}
        <div className="cp-fade" />
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
          padding: 3px 16px 6px;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .cp-scroll::-webkit-scrollbar { display: none; }

        /* Liquid track */
        .cp-track {
          position: absolute;
          top: 3px;
          left: 0;
          height: calc(100% - 9px);
          border-radius: 100px;
          background: linear-gradient(135deg, #FF9F1C 0%, #E05C2A 100%);
          box-shadow:
            0 4px 20px rgba(255,130,0,0.4),
            0 1px 0 rgba(255,255,255,0.2) inset;
          pointer-events: none;
          z-index: 0;
          will-change: transform, width;
          transform-origin: left center;
        }

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
          border: 1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'};
          background: ${isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)'};
          cursor: pointer;
          white-space: nowrap;
          font-family: "DM Sans", sans-serif;
          font-size: 12.5px;
          font-weight: 600;
          letter-spacing: 0.01em;
          -webkit-tap-highlight-color: transparent;
          outline: none;
          transition: background 0.18s, border-color 0.18s;
        }
        .cp-pill:hover {
          background: ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'};
          border-color: ${isDark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.09)'};
        }
        .cp-pill:active { transform: scale(0.95); }

        .cp-icon {
          font-size: 14px;
          line-height: 1;
        }
        .cp-text {
          line-height: 1;
        }

        .cp-fade {
          position: absolute;
          top: 0; right: 0;
          width: 40px; height: 100%;
          background: linear-gradient(
            to left,
            ${isDark ? 'rgba(10,7,4,1)' : 'rgba(255,251,244,1)'} 0%,
            transparent 100%
          );
          pointer-events: none;
          z-index: 3;
        }
      `}</style>
    </>
  )
}

export default CategoryPills