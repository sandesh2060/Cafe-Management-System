// src/modules/customer/components/menu/WelcomeCard.jsx
import { useRef, useEffect, useContext } from 'react'
import { useSelector }                   from 'react-redux'
import gsap                              from 'gsap'
import { Clock, Wifi, Armchair, ShoppingBag } from 'lucide-react'
import { ThemeContext }                  from '@shared/context/ThemeContext'
import { selectUser, selectIsGuest }     from '@store/slices/authSlice'
import { selectTableNumber, selectSession } from '@store/slices/tableSessionSlice'
import { selectCartItems }               from '@store/slices/cartSlice'

// ── Inject fonts reliably into <head> (idempotent) ─────────────
const injectFonts = () => {
  if (document.getElementById('wc-fonts')) return
  ;['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].forEach((href, i) => {
    const l = document.createElement('link')
    l.rel = 'preconnect'; l.href = href
    if (i === 1) l.crossOrigin = 'anonymous'
    document.head.appendChild(l)
  })
  const link = document.createElement('link')
  link.id   = 'wc-fonts'
  link.rel  = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Playfair+Display:wght@700;800&display=swap'
  document.head.appendChild(link)
}

// ── Weather configs ─────────────────────────────────────────────
const WEATHER = {
  sunny:  { g: ['#D97706','#F59E0B','#FDE68A'], mesh: 'radial-gradient(ellipse at 82% 14%, rgba(255,255,255,0.28) 0%, transparent 54%)', icon: '☀️', label: 'Sunny',  particle: '✦', glow: 'rgba(245,158,11,0.55)'  },
  hot:    { g: ['#B91C1C','#EF4444','#FB923C'], mesh: 'radial-gradient(ellipse at 80% 18%, rgba(255,255,255,0.22) 0%, transparent 50%)', icon: '🌡️', label: 'Hot',    particle: '●', glow: 'rgba(239,68,68,0.55)'   },
  rainy:  { g: ['#1E1B4B','#4338CA','#818CF8'], mesh: 'radial-gradient(ellipse at 83% 16%, rgba(255,255,255,0.16) 0%, transparent 56%)', icon: '🌧️', label: 'Rainy',  particle: '|', glow: 'rgba(99,102,241,0.5)'   },
  cold:   { g: ['#1E3A5F','#1D4ED8','#60A5FA'], mesh: 'radial-gradient(ellipse at 79% 20%, rgba(255,255,255,0.22) 0%, transparent 54%)', icon: '❄️', label: 'Cold',   particle: '❄', glow: 'rgba(96,165,250,0.5)'   },
  cloudy: { g: ['#3D2B1F','#6B4C35','#A07850'], mesh: 'radial-gradient(ellipse at 80% 18%, rgba(255,255,255,0.14) 0%, transparent 52%)', icon: '☁️', label: 'Cloudy', particle: '○', glow: 'rgba(160,120,80,0.45)'  },
  windy:  { g: ['#3B0764','#7C3AED','#A78BFA'], mesh: 'radial-gradient(ellipse at 82% 16%, rgba(255,255,255,0.18) 0%, transparent 54%)', icon: '💨', label: 'Windy',  particle: '~', glow: 'rgba(167,139,250,0.5)'  },
}

const TIER = {
  none:   { emoji: '☕', label: 'New Member' },
  bronze: { emoji: '🥉', label: 'Bronze'     },
  silver: { emoji: '🥈', label: 'Silver'     },
  gold:   { emoji: '🥇', label: 'Gold'       },
}

const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 5)  return { label: 'Late Night',     sub: 'Something special for you' }
  if (h < 12) return { label: 'Good Morning',   sub: 'Start your day deliciously' }
  if (h < 17) return { label: 'Good Afternoon', sub: 'Time for a flavourful break' }
  if (h < 21) return { label: 'Good Evening',   sub: 'Dinner is served' }
  return              { label: 'Good Night',     sub: 'Late night cravings sorted' }
}

// ───────────────────────────────────────────────────────────────
const WelcomeCard = ({ weather }) => {
  useEffect(() => { injectFonts() }, [])

  const { isDark }  = useContext(ThemeContext)
  const user        = useSelector(selectUser)
  const isGuest     = useSelector(selectIsGuest)
  const tableNumber = useSelector(selectTableNumber)
  const session     = useSelector(selectSession)
  const cartItems   = useSelector(selectCartItems)

  const cardRef    = useRef(null)
  const shimmerRef = useRef(null)
  const greetRef   = useRef(null)
  const prefixRef  = useRef(null)
  const nameRowRef = useRef(null)
  const subRef     = useRef(null)
  const pillsRef   = useRef(null)
  const stripRef   = useRef(null)
  const badgeRef   = useRef(null)
  const ptcRef     = useRef([])

  const wc          = WEATHER[weather?.condition] || WEATHER.cloudy
  const tc          = TIER[user?.loyaltyTier || 'none']
  const firstName   = user?.name?.split(' ')[0] || 'Friend'
  const displayName = isGuest ? 'Guest' : firstName
  const cartCount   = cartItems?.reduce((a, i) => a + i.quantity, 0) ?? 0
  const { label: greetLabel, sub: greetSub } = getGreeting()

  const sessionStart = session?.createdAt
    ? new Date(session.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null

  // ── Card + surrounding GSAP ─────────────────────────────────
  useEffect(() => {
    if (!cardRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const tl = gsap.timeline({ delay: 0.12, defaults: { ease: 'power3.out' } })

    // Card entrance
    tl.fromTo(cardRef.current,
      { y: 28, opacity: 0, scale: 0.96 },
      { y:  0, opacity: 1, scale: 1, duration: 0.6, force3D: true, clearProps: 'transform' }
    )
    // Greeting label
    tl.fromTo(greetRef.current,
      { y: 10, opacity: 0 },
      { y:  0, opacity: 1, duration: 0.3 },
      '-=0.42'
    )
    // "Hey," prefix
    tl.fromTo(prefixRef.current,
      { y: 8, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.28 },
      '-=0.22'
    )
    // Name row
    tl.fromTo(nameRowRef.current,
      { y: 8, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.28 },
      '-=0.18'
    )
    // Sub + pills + strip stagger
    const els = [subRef.current, pillsRef.current, stripRef.current].filter(Boolean)
    tl.fromTo(els,
      { y: 10, opacity: 0 },
      { y:  0, opacity: 1, duration: 0.32, stagger: 0.09 },
      '-=0.1'
    )
    // Badge pop
    if (badgeRef.current) {
      tl.fromTo(badgeRef.current,
        { scale: 0.5, opacity: 0, rotation: -12 },
        { scale: 1, opacity: 1, rotation: 0, duration: 0.5, ease: 'back.out(3)', force3D: true, clearProps: 'transform' },
        0.3
      )
    }
    // Shimmer sweep
    if (shimmerRef.current) {
      tl.fromTo(shimmerRef.current,
        { x: '-115%' },
        { x: '215%', duration: 1.5, ease: 'power1.inOut' },
        0.3
      )
    }
    // Particles
    const ptcs = ptcRef.current.filter(Boolean)
    if (ptcs.length) {
      gsap.fromTo(ptcs,
        { opacity: 0, scale: 0.2, y: 4 },
        { opacity: 1, scale: 1, y: 0, duration: 0.45, stagger: 0.12, delay: 0.9, ease: 'back.out(2)' }
      )
      gsap.to(ptcs, { y: '-=9', duration: 2.6, repeat: -1, yoyo: true, stagger: 0.5, ease: 'sine.inOut', delay: 1.5 })
    }

    return () => tl.kill()
  }, [])

  return (
    <>
      <style>{`
        .wc-pill {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 10px; border-radius: 99px;
          font-size: 11px; font-weight: 600;
          font-family: "DM Sans", sans-serif;
          background: rgba(0,0,0,0.22);
          color: rgba(255,255,255,0.88);
          border: 1px solid rgba(255,255,255,0.15);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          letter-spacing: 0.01em; white-space: nowrap;
        }
        .wc-strip-item {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 10px; font-weight: 400;
          color: rgba(255,255,255,0.46);
          font-family: "DM Sans", sans-serif;
        }
      `}</style>

      <div ref={cardRef}
        className="relative overflow-hidden mx-4 mt-4 rounded-[22px]"
        style={{
          background: `linear-gradient(148deg, ${wc.g[0]} 0%, ${wc.g[1]} 50%, ${wc.g[2]} 100%)`,
          boxShadow:  `0 12px 44px ${wc.glow}, 0 1px 0 rgba(255,255,255,0.14) inset`,
          minHeight:  170,
        }}
      >
        {/* Mesh highlight */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: wc.mesh }} />
        {/* Bottom depth */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.22) 0%, transparent 55%)' }} />
        {/* Top edge glow */}
        <div className="absolute top-0 inset-x-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg,transparent 5%,rgba(255,255,255,0.32) 50%,transparent 95%)' }} />

        {/* Shimmer sweep */}
        <div ref={shimmerRef} className="absolute inset-y-0 w-[38%] pointer-events-none"
          style={{
            background: 'linear-gradient(112deg,transparent 15%,rgba(255,255,255,0.09) 50%,transparent 85%)',
            transform: 'translateX(-115%)',
          }} />

        {/* Particles */}
        <div className="absolute top-3 right-16 flex flex-col gap-2.5 pointer-events-none select-none" aria-hidden>
          {[10, 7, 13].map((sz, i) => (
            <span key={i} ref={el => ptcRef.current[i] = el}
              style={{ fontSize: sz, opacity: 0, color: 'rgba(255,255,255,0.2)', fontWeight: 900, lineHeight: 1 }}>
              {wc.particle}
            </span>
          ))}
        </div>

        {/* Table badge */}
        {tableNumber && (
          <div ref={badgeRef} className="absolute top-3.5 right-3.5">
            <div className="flex flex-col items-center px-3 py-2 rounded-2xl"
              style={{
                background: 'rgba(0,0,0,0.28)',
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.13)',
                boxShadow: '0 4px 18px rgba(0,0,0,0.28)',
              }}>
              <Armchair size={11} color="rgba(255,255,255,0.6)" strokeWidth={2} />
              <span style={{
                fontFamily: '"DM Sans",sans-serif', fontSize: 8, fontWeight: 600,
                color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
                letterSpacing: '0.14em', marginTop: 2, lineHeight: 1,
              }}>Table</span>
              <span style={{
                fontFamily: '"DM Sans",sans-serif',
                fontSize: 24, fontWeight: 800, color: '#fff',
                lineHeight: 1.1, letterSpacing: '-0.02em',
              }}>{tableNumber}</span>
            </div>
          </div>
        )}

        {/* ── Content ───────────────────────────────────────── */}
        <div className="relative z-10 p-5 pr-20 flex flex-col" style={{ gap: 4 }}>

          {/* Greeting label */}
          <p ref={greetRef} style={{
            fontFamily: '"DM Sans",sans-serif',
            fontSize: 10, fontWeight: 500,
            textTransform: 'uppercase', letterSpacing: '0.18em',
            color: 'rgba(255,255,255,0.5)', lineHeight: 1,
            marginBottom: 2,
          }}>
            {greetLabel}
          </p>

          {/* "Hey," prefix */}
          <p ref={prefixRef} style={{
            fontFamily: '"DM Sans",sans-serif',
            fontSize: 13, fontWeight: 300,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.03em',
            lineHeight: 1, marginBottom: 1,
          }}>
            {isGuest ? 'Welcome,' : 'Hey,'}
          </p>

          {/* ── NAME — instant, no animation ─────────────────── */}
          <div ref={nameRowRef} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 52 }}>
            <span style={{
              fontFamily:    '"Playfair Display", serif',
              fontSize:      'clamp(32px, 9vw, 44px)',
              fontWeight:    700,
              color:         '#ffffff',
              letterSpacing: '0.01em',
              lineHeight:    1.15,
              textShadow:    '0 3px 20px rgba(0,0,0,0.22)',
            }}>
              {displayName}
            </span>
            <span style={{
              fontSize: 'clamp(20px, 5.5vw, 26px)',
              lineHeight: 1,
              filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.18))',
            }}>
              👋
            </span>
          </div>

          {/* Sub line */}
          <p ref={subRef} style={{
            fontFamily: '"DM Sans",sans-serif',
            fontSize: 12, fontWeight: 300,
            color: 'rgba(255,255,255,0.48)',
            letterSpacing: '0.01em',
            marginTop: 2,
          }}>
            {greetSub}
          </p>

          {/* Pills */}
          <div ref={pillsRef} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 5 }}>
            <span className="wc-pill">
              {wc.icon}&nbsp;{wc.label}
              {weather?.temp && <span style={{ opacity: 0.6 }}>&nbsp;·&nbsp;{weather.temp}°C</span>}
            </span>
            {!isGuest && <span className="wc-pill">{tc.emoji}&nbsp;{tc.label}</span>}
          </div>

          {/* Strip */}
          <div ref={stripRef} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 2 }}>
            {sessionStart && (
              <span className="wc-strip-item"><Clock size={9} strokeWidth={2} />Since {sessionStart}</span>
            )}
            {cartCount > 0 && (
              <span className="wc-strip-item"><ShoppingBag size={9} strokeWidth={2} />{cartCount} item{cartCount !== 1 ? 's' : ''} in cart</span>
            )}
            {session?.status === 'active' && (
              <span className="wc-strip-item"><Wifi size={9} strokeWidth={2} />Active session</span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default WelcomeCard