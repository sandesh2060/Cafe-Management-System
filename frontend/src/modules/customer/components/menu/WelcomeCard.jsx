// src/modules/customer/components/menu/WelcomeCard.jsx
//
// ─── WHAT CHANGED v2 ─────────────────────────────────────────────────────────
//
// 1. MoonOverlay — now night-only (hour >= 20 || hour < 6)
//    • Previously showed moon during daytime hours which was wrong
//    • Real lunar phase from getLunarPhase() — waxing/waning shadow matches today
//    • getMoonPosition() unchanged (arc calculation)
//    • Moon breathe animation kept
//
// 2. Text colors — unchanged, onBrightness callback from SkyCanvas drives them
//    • SkyCanvas v2 now passes a more accurate brightness value since
//      cloud occlusion of sun is factored in
//
// 3. All other logic — identical to v1
//    • GSAP entrance animation
//    • Table badge with brightness adaptation
//    • Greeting label, prefix, name, sub, pills, strip
//    • Skeleton / SkyFallback
//
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useEffect, useContext, useMemo, useState, lazy, Suspense, useCallback } from "react"
import { useSelector } from "react-redux"
import gsap from "gsap"
import { Clock, Wifi, ShoppingBag } from "lucide-react"
import { ThemeContext } from "@shared/context/ThemeContext"
import { BRAND, FONTS, getWeatherTheme, WEATHER_META, LOYALTY_TIERS } from "@shared/config/brand"
import { selectUser, selectIsGuest } from "@store/slices/authSlice"
import { selectTableNumber, selectSession } from "@store/slices/tableSessionSlice"
import { selectCartItems } from "@store/slices/cartSlice"

const SkyCanvas = lazy(() => import('./SkyCanvas'))

// ─────────────────────────────────────────────────────────────────────────────
// REAL LUNAR PHASE — mirrors SkyCanvas calculation
// Returns 0–1: 0=new moon, 0.25=first quarter, 0.5=full, 0.75=last quarter
// ─────────────────────────────────────────────────────────────────────────────
function getLunarPhase(date = new Date()) {
  const KNOWN_NEW_MOON = new Date('2024-01-11T11:57:00Z')
  const CYCLE_DAYS     = 29.53058867
  const elapsed        = (date - KNOWN_NEW_MOON) / (1000 * 60 * 60 * 24)
  const phase          = ((elapsed % CYCLE_DAYS) + CYCLE_DAYS) % CYCLE_DAYS
  return phase / CYCLE_DAYS
}

// ─────────────────────────────────────────────────────────────────────────────
// MOON POSITION — arc across night sky
// Returns null if hour is in daytime (6–20)
// ─────────────────────────────────────────────────────────────────────────────
function getMoonPosition(h) {
  // Night-only: before 6am or after 8pm
  if (h >= 6 && h < 20) return null
  const hNorm = h >= 20 ? h - 20 : h + 4
  const frac  = Math.max(0, Math.min(1, hNorm / 12))
  return {
    x:    88 - frac * 76,
    y:    68 - Math.sin(frac * Math.PI) * 44,
    frac,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MOON OVERLAY — CSS only, updates every 60s
// Sun is rendered inside SkyCanvas (Three.js).
// Moon position and phase are handled here in CSS.
// ─────────────────────────────────────────────────────────────────────────────
const MoonOverlay = ({ condition, isDark }) => {
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const now   = new Date()
  const h     = now.getHours() + now.getMinutes() / 60
  const moon  = getMoonPosition(h)

  // Don't render moon during daytime or rainy (fully overcast)
  if (!moon || condition === 'rainy') return null

  const phase = getLunarPhase(now)
  const illum = Math.abs(Math.sin(phase * Math.PI)) // 0=new, 1=full

  // Skip new moon (illum too low to see)
  if (illum < 0.04) return null

  const moonSize = 24

  // Phase shadow offset:
  // Waxing (phase < 0.5): shadow on LEFT  → negative offset
  // Waning (phase >= 0.5): shadow on RIGHT → positive offset
  // Full moon (phase≈0.5): no shadow (illum=1, shadow pushed far away)
  const isWaxing      = phase < 0.5
  const phaseFrac     = isWaxing ? phase * 2 : (1 - phase) * 2  // 0=new, 1=full
  // Shadow disc offset — 0 at new moon (full coverage), 0 at full moon (no coverage)
  const shadowCover   = 1 - phaseFrac                             // 1=new, 0=full
  const shadowOffset  = moonSize * (isWaxing ? -shadowCover : shadowCover) * 0.55

  return (
    <>
      <style>{`
        @keyframes wc-moon-breathe { 0%,100%{opacity:0.82} 50%{opacity:1.0} }
      `}</style>
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        borderRadius: 'inherit', overflow: 'hidden',
        pointerEvents: 'none', zIndex: 1,
      }}>
        <div style={{
          position: 'absolute',
          left: `${moon.x}%`, top: `${moon.y}%`,
          width: moonSize, height: moonSize,
          transform: 'translate(-50%, -50%)',
          animation: 'wc-moon-breathe 6s ease-in-out infinite',
        }}>
          {/* Soft halo */}
          <div style={{
            position: 'absolute', inset: -(moonSize * 0.9),
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(180,200,255,0.16) 0%, rgba(140,170,255,0.05) 55%, transparent 72%)',
          }}/>
          {/* Moon disc — clipped container */}
          <div style={{
            position: 'absolute', inset: 0,
            borderRadius: '50%', overflow: 'hidden',
            boxShadow: isDark
              ? '0 0 12px 4px rgba(180,200,255,0.28), 0 0 28px 10px rgba(140,170,255,0.10)'
              : '0 0 8px 3px rgba(180,200,255,0.18)',
          }}>
            {/* Moon surface */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: isDark
                ? 'radial-gradient(circle at 34% 34%, #FFFEF8 0%, #EDE3CA 52%, #C8B880 100%)'
                : 'radial-gradient(circle at 34% 34%, #FFFEF8 0%, #F2EAD4 52%, #DDD0A0 100%)',
            }}/>
            {/* Craters */}
            {[
              {t:'28%', l:'22%', s:moonSize*0.16},
              {t:'52%', l:'38%', s:moonSize*0.11},
              {t:'38%', l:'56%', s:moonSize*0.08},
              {t:'20%', l:'58%', s:moonSize*0.06},
            ].map((c, i) => (
              <div key={i} style={{
                position:'absolute', top:c.t, left:c.l,
                width:c.s, height:c.s, borderRadius:'50%',
                background:'rgba(150,130,90,0.18)',
              }}/>
            ))}
            {/* Phase shadow — waxing=left, waning=right */}
            {shadowCover > 0.04 && (
              <div style={{
                position: 'absolute',
                width:  moonSize * 1.14,
                height: moonSize * 1.14,
                borderRadius: '50%',
                background: isDark ? 'rgba(1,0,8,0.97)' : 'rgba(8,4,20,0.94)',
                left: `${50 + (shadowOffset / moonSize) * 100}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}/>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SKY BRIGHTNESS → TEXT COLORS
//
// brightness is 0–1 from SkyCanvas.onBrightness callback
// > 0.55 = light sky → dark text
// ≤ 0.55 = dark sky  → light text
// ─────────────────────────────────────────────────────────────────────────────
function getSkyTextColors(brightness, isDark, weatherTheme) {
  if (brightness > 0.70) return {
    name:       '#1a1a2e',
    sub:        'rgba(20,20,40,0.65)',
    pill:       'rgba(255,255,255,0.45)',
    pillBorder: 'rgba(255,255,255,0.60)',
    pillText:   'rgba(20,20,40,0.85)',
    shadow:     '0 1px 0 rgba(255,255,255,0.7), 0 2px 12px rgba(0,0,0,0.12)',
    overlay:    'rgba(0,0,0,0.18)',
  }
  if (brightness > 0.45) return {
    name:       isDark ? '#ffffff' : '#1a2035',
    sub:        isDark ? 'rgba(220,230,255,0.65)' : 'rgba(20,30,60,0.60)',
    pill:       isDark ? 'rgba(0,0,0,0.30)' : 'rgba(255,255,255,0.40)',
    pillBorder: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.55)',
    pillText:   isDark ? 'rgba(220,230,255,0.90)' : 'rgba(15,25,50,0.85)',
    shadow:     isDark
      ? '0 1px 0 rgba(0,0,0,0.5), 0 2px 16px rgba(0,20,60,0.45)'
      : '0 1px 0 rgba(255,255,255,0.6), 0 2px 12px rgba(0,20,60,0.20)',
    overlay:    isDark ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0.14)',
  }
  return {
    name:       '#ffffff',
    sub:        'rgba(200,215,240,0.65)',
    pill:       'rgba(0,0,0,0.28)',
    pillBorder: 'rgba(255,255,255,0.16)',
    pillText:   'rgba(220,230,255,0.90)',
    shadow:     '0 1px 0 rgba(0,0,0,0.6), 0 2px 20px rgba(0,10,40,0.55), 0 0 40px rgba(0,10,40,0.30)',
    overlay:    'rgba(0,0,0,0.40)',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GREETING
// ─────────────────────────────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 5)  return { label: "Late Night",     sub: "Something special awaits" }
  if (h < 12) return { label: "Good Morning",   sub: "Start your day deliciously" }
  if (h < 17) return { label: "Good Afternoon", sub: "Time for a flavourful break" }
  if (h < 21) return { label: "Good Evening",   sub: "Dinner is served" }
  return             { label: "Good Night",      sub: "Late night cravings sorted" }
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────
const WelcomeCardSkeleton = () => (
  <>
    <style>{`@keyframes wc-sk{0%{background-position:-200% center}100%{background-position:200% center}}`}</style>
    <div style={{
      margin:16, borderRadius:24, minHeight:196, overflow:"hidden",
      background:"var(--pill-bg)", padding:"20px 20px 18px",
      display:"flex", flexDirection:"column", gap:10,
    }}>
      {[{h:9,w:"38%"},{h:9,w:"18%"},{h:40,w:"65%",mt:4,r:10},{h:9,w:"50%",mt:2}].map((s,i) => (
        <div key={i} style={{
          height:s.h, width:s.w, borderRadius:s.r??8, marginTop:s.mt??0,
          background:"linear-gradient(90deg,var(--pill-bg) 0%,var(--card-shimmer) 50%,var(--pill-bg) 100%)",
          backgroundSize:"200% 100%", animation:"wc-sk 1.6s ease-in-out infinite",
        }}/>
      ))}
    </div>
  </>
)

// ─────────────────────────────────────────────────────────────────────────────
// SKY FALLBACK — instant gradient while Three.js loads
// ─────────────────────────────────────────────────────────────────────────────
const SkyFallback = ({ theme }) => (
  <div aria-hidden="true" style={{
    position:"absolute", inset:0,
    background:`linear-gradient(160deg, ${theme.bg[0]} 0%, ${theme.bg[1]} 55%, ${theme.bg[2]} 100%)`,
    borderRadius:"inherit", pointerEvents:"none", zIndex:0,
  }}/>
)

// ─────────────────────────────────────────────────────────────────────────────
// WELCOME CARD
// ─────────────────────────────────────────────────────────────────────────────
const WelcomeCard = ({ weather, loading = false }) => {
  const { isDark }  = useContext(ThemeContext)
  const user        = useSelector(selectUser)
  const isGuest     = useSelector(selectIsGuest)
  const tableNumber = useSelector(selectTableNumber)
  const session     = useSelector(selectSession)
  const cartItems   = useSelector(selectCartItems)

  const [tableVisible,  setTableVisible]  = useState(false)
  const [skyBrightness, setSkyBrightness] = useState(isDark ? 0.3 : 0.7)

  const cardRef    = useRef(null)
  const greetRef   = useRef(null)
  const prefixRef  = useRef(null)
  const nameRowRef = useRef(null)
  const subRef     = useRef(null)
  const pillsRef   = useRef(null)
  const stripRef   = useRef(null)
  const shimmerRef = useRef(null)
  const tableRef   = useRef(null)

  const condition = weather?.condition ?? "cloudy"
  const theme     = useMemo(() => getWeatherTheme(condition, isDark), [condition, isDark])
  const wMeta     = WEATHER_META[condition] ?? WEATHER_META.cloudy
  const tc        = LOYALTY_TIERS[user?.loyaltyTier || "none"] ?? LOYALTY_TIERS.none

  const displayName = isGuest ? "Guest" : user?.name?.split(" ")[0] || "Friend"
  const cartCount   = cartItems?.reduce((a, i) => a + i.quantity, 0) ?? 0
  const { label: greetLabel, sub: greetSub } = getGreeting()

  const sessionStart = session?.createdAt
    ? new Date(session.createdAt).toLocaleTimeString(BRAND.locale, { hour:"2-digit", minute:"2-digit" })
    : null

  const handleBrightness = useCallback((b) => {
    setSkyBrightness(b)
  }, [])

  const tc2 = useMemo(
    () => getSkyTextColors(skyBrightness, isDark, theme),
    [skyBrightness, isDark, theme]
  )

  // ── Entrance animation ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!cardRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const tl = gsap.timeline({ delay:0.05, defaults:{ ease:"power3.out" } })
    tl.fromTo(cardRef.current,
      { y:24, opacity:0, scale:0.97 },
      { y:0, opacity:1, scale:1, duration:0.6, force3D:true, clearProps:"transform" })
    const els = [greetRef, prefixRef, nameRowRef, subRef, pillsRef, stripRef]
      .map(r => r.current).filter(Boolean)
    if (els.length)
      tl.fromTo(els, { y:10, opacity:0 }, { y:0, opacity:1, duration:0.28, stagger:0.06 }, "-=0.4")
    if (shimmerRef.current)
      tl.fromTo(shimmerRef.current, { x:"-115%" }, { x:"215%", duration:1.6, ease:"power1.inOut" }, 0.22)
    return () => tl.kill()
  }, [condition])

  // ── Table badge reveal ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!tableNumber) return
    setTableVisible(false)
    const t = setTimeout(() => setTableVisible(true), 500)
    return () => clearTimeout(t)
  }, [tableNumber])

  useEffect(() => {
    if (!tableVisible || !tableRef.current) return
    gsap.fromTo(tableRef.current,
      { scale:0.5, opacity:0, y:10, rotateZ:-8 },
      { scale:1, opacity:1, y:0, rotateZ:0, duration:0.7, ease:"back.out(2.6)", force3D:true, clearProps:"transform" })
  }, [tableVisible])

  if (loading && !weather) return <WelcomeCardSkeleton />

  const badgeBg     = skyBrightness > 0.55 ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.32)'
  const badgeBorder = skyBrightness > 0.55 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.15)'
  const badgeText   = skyBrightness > 0.55 ? 'rgba(20,20,40,0.85)'   : '#ffffff'

  return (
    <>
      <style>{`
        .wc-root { font-family: ${FONTS.welcomeBody}; -webkit-tap-highlight-color:transparent; }
        .wc-pill {
          display:inline-flex; align-items:center; gap:5px;
          padding:5px 13px; border-radius:99px;
          font-size:11.5px; font-weight:600;
          font-family:${FONTS.welcomeBody}; letter-spacing:0.01em;
          white-space:nowrap; backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
          transition:background 0.4s, color 0.4s, border-color 0.4s; flex-shrink:0;
        }
        .wc-strip-item {
          display:inline-flex; align-items:center; gap:4px;
          font-size:9.5px; font-weight:500;
          font-family:${FONTS.welcomeBody}; letter-spacing:0.02em;
          opacity:0.55; white-space:nowrap;
        }
        @keyframes wc-ring  { 0%{transform:scale(1);opacity:0.5} 70%{transform:scale(1.6);opacity:0} 100%{transform:scale(1.6);opacity:0} }
        @keyframes wc-glow  { 0%,100%{opacity:0.50} 50%{opacity:0.82} }
        .wc-badge-ring  { animation:wc-ring 2.6s ease-out infinite; }
        .wc-greet-label { animation:wc-glow 3s ease-in-out infinite; }
        .wc-table-num   { font-family:${FONTS.welcomeBody}; font-weight:900; letter-spacing:-0.03em; line-height:1; }
        .wc-name        { font-family:${FONTS.welcomeName}; font-weight:700; letter-spacing:0.01em; line-height:1; }
        .wc-card-inner  { position:relative; z-index:5; padding:20px 20px 18px; display:flex; flex-direction:column; gap:0; }
        .wc-name  { font-size:clamp(36px,10vw,52px); }
        .wc-card  { min-height:196px; }
        @media (min-width:640px){
          .wc-card       { min-height:220px; }
          .wc-card-inner { padding:24px 24px 20px; }
          .wc-name       { font-size:clamp(42px,8vw,60px)!important; }
          .wc-pill       { font-size:12.5px; padding:6px 15px; }
          .wc-strip-item { font-size:10.5px; }
        }
        @media (min-width:1024px){
          .wc-card       { min-height:236px; }
          .wc-card-inner { padding:28px 32px 24px; }
          .wc-name       { font-size:clamp(48px,5vw,68px)!important; }
          .wc-pill       { font-size:13px; padding:7px 17px; gap:6px; }
          .wc-strip-item { font-size:11px; }
        }
      `}</style>

      <div
        ref={cardRef}
        className="wc-root wc-card"
        style={{
          position:"relative", overflow:"hidden",
          margin:16, borderRadius:24,
          background: theme.bg[1],
          boxShadow:[
            `0 16px 48px ${theme.shadow}`,
            `0 1px 0 rgba(255,255,255,${isDark?"0.08":"0.55"}) inset`,
            `0 0 0 1px rgba(${isDark?"255,255,255,0.06":"0,0,0,0.04"})`,
          ].join(", "),
          transition:"box-shadow 0.55s ease",
        }}
      >
        {/* Layer 0 — Three.js sky + grass 2D overlay */}
        <Suspense fallback={<SkyFallback theme={theme}/>}>
          <SkyCanvas
            condition={condition}
            weather={weather}
            isDark={isDark}
            onBrightness={handleBrightness}
          />
        </Suspense>

        {/* Layer 1 — Moon CSS overlay (night hours only, real phase) */}
        <MoonOverlay condition={condition} isDark={isDark}/>

        {/* Layer 2 — Bottom gradient overlay for text legibility */}
        <div style={{
          position:"absolute", bottom:0, left:0, right:0, height:"55%",
          background:`linear-gradient(to top, ${tc2.overlay} 0%, transparent 100%)`,
          pointerEvents:"none", zIndex:2,
        }}/>

        {/* Layer 3 — Top edge highlight */}
        <div style={{
          position:"absolute", top:0, left:0, right:0, height:1, zIndex:3, pointerEvents:"none",
          background:`linear-gradient(90deg,transparent 5%,rgba(255,255,255,${skyBrightness>0.55?"0.70":"0.14"}) 50%,transparent 95%)`,
        }}/>

        {/* Layer 4 — GSAP shimmer sweep */}
        <div ref={shimmerRef} style={{
          position:"absolute", inset:0, width:"40%", zIndex:4, pointerEvents:"none",
          background:`linear-gradient(108deg,transparent 20%,rgba(255,255,255,${skyBrightness>0.55?"0.18":"0.07"}) 50%,transparent 80%)`,
          transform:"translateX(-115%)",
        }}/>

        {/* Table badge */}
        {tableNumber && tableVisible && (
          <div ref={tableRef} style={{position:"absolute",top:14,right:14,zIndex:10,opacity:0}}>
            <div className="wc-badge-ring" style={{
              position:"absolute", inset:-6, borderRadius:18, pointerEvents:"none",
              border:`1.5px solid ${badgeBorder}`,
            }}/>
            <div style={{
              display:"flex", flexDirection:"column", alignItems:"center",
              justifyContent:"center", padding:"10px 14px", borderRadius:18,
              background: badgeBg,
              backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
              border:`1px solid ${badgeBorder}`,
              boxShadow:`0 6px 24px rgba(0,0,0,${skyBrightness>0.55?0.12:0.22}), 0 1px 0 rgba(255,255,255,${skyBrightness>0.55?0.6:0.10}) inset`,
              minWidth:76, gap:2,
            }}>
              <span style={{fontSize:11,lineHeight:1,opacity:0.6,marginBottom:2}}>🪑</span>
              <span style={{
                fontFamily:FONTS.welcomeBody, fontSize:7, fontWeight:800,
                color: skyBrightness>0.55 ? 'rgba(20,20,40,0.55)' : 'rgba(255,255,255,0.45)',
                textTransform:"uppercase", letterSpacing:"0.18em", lineHeight:1,
              }}>Table</span>
              <span className="wc-table-num" style={{
                fontSize:tableNumber.length>3?18:24,
                color: badgeText, marginTop:1,
              }}>{tableNumber}</span>
            </div>
          </div>
        )}

        {/* Card content — z-index 5, text colors driven by sky brightness */}
        <div className="wc-card-inner" style={{ paddingRight: tableNumber ? "96px" : undefined }}>

          <p ref={greetRef} className="wc-greet-label" style={{
            fontFamily:FONTS.welcomeBody, fontSize:9, fontWeight:700,
            textTransform:"uppercase", letterSpacing:"0.22em",
            color: tc2.sub, lineHeight:1, marginBottom:6,
            transition:"color 0.5s ease",
          }}>
            {greetLabel}
          </p>

          <p ref={prefixRef} style={{
            fontFamily:FONTS.welcomeBody, fontSize:12, fontWeight:300,
            color: tc2.sub, letterSpacing:"0.04em", lineHeight:1, marginBottom:2,
            transition:"color 0.5s ease",
          }}>
            {isGuest ? "Welcome," : "Hey,"}
          </p>

          <div ref={nameRowRef} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
            <span
              className="wc-name capitalize"
              style={{
                color: tc2.name,
                textShadow: tc2.shadow,
                transition:"color 0.5s ease, text-shadow 0.5s ease",
              }}
            >
              {displayName}
            </span>
          </div>

          <p ref={subRef} style={{
            fontFamily:FONTS.welcomeBody, fontSize:12, fontWeight:400,
            color: tc2.sub, letterSpacing:"0.01em", lineHeight:1.4, marginBottom:12,
            transition:"color 0.5s ease",
          }}>
            {greetSub}
          </p>

          {/* Pills */}
          <div ref={pillsRef} style={{display:"flex",flexDirection:"row",flexWrap:"wrap",gap:7,alignItems:"center",marginBottom:10}}>
            <span className="wc-pill" style={{
              background: tc2.pill,
              color: tc2.pillText,
              border: `1px solid ${tc2.pillBorder}`,
              boxShadow:`0 1px 0 rgba(255,255,255,${skyBrightness>0.55?0.65:0.08}) inset`,
            }}>
              <span style={{fontSize:13,lineHeight:1}}>{wMeta.icon}</span>
              <span>{wMeta.label}</span>
              {weather?.temp != null && (
                <span style={{opacity:0.62,fontWeight:500}}>· {Math.round(weather.temp)}°C</span>
              )}
            </span>
            {!isGuest && (
              <span className="wc-pill" style={{
                background: tc2.pill,
                color: tc2.pillText,
                border: `1px solid ${tc2.pillBorder}`,
                boxShadow:`0 1px 0 rgba(255,255,255,${skyBrightness>0.55?0.65:0.08}) inset`,
              }}>
                <span style={{fontSize:12}}>{tc.emoji}</span>
                <span>{tc.label}</span>
              </span>
            )}
          </div>

          {/* Status strip */}
          <div ref={stripRef} style={{display:"flex",flexDirection:"row",flexWrap:"wrap",alignItems:"center",gap:10}}>
            {sessionStart && (
              <span className="wc-strip-item" style={{color:tc2.sub, transition:"color 0.5s ease"}}>
                <Clock size={9} strokeWidth={2.5}/><span>Since {sessionStart}</span>
              </span>
            )}
            {cartCount > 0 && (
              <span className="wc-strip-item" style={{color:tc2.sub, transition:"color 0.5s ease"}}>
                <ShoppingBag size={9} strokeWidth={2.5}/><span>{cartCount} item{cartCount!==1?"s":""} in cart</span>
              </span>
            )}
            {session?.status === "active" && (
              <span className="wc-strip-item" style={{color:tc2.sub, transition:"color 0.5s ease"}}>
                <Wifi size={9} strokeWidth={2.5}/><span>Active session</span>
              </span>
            )}
          </div>

        </div>
      </div>
    </>
  )
}

export default WelcomeCard