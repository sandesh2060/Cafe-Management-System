// src/modules/customer/components/menu/WelcomeCard.jsx
//
// Physics upgrade: text colors now derived from full SkyState object
// (luminance + warmth + chromatic tint + saturation) instead of a raw
// brightness scalar. Single source of truth: skyPhysics.js

import { useRef, useEffect, useContext, useMemo, useState, lazy, Suspense, useCallback } from "react"
import { useSelector } from "react-redux"
import gsap from "gsap"
import { Clock, Wifi, ShoppingBag } from "lucide-react"
import { ThemeContext } from "@shared/context/ThemeContext"
import { BRAND, FONTS, getWeatherTheme, WEATHER_META, LOYALTY_TIERS } from "@shared/config/brand"
import { selectUser, selectIsGuest } from "@store/slices/authSlice"
import { selectTableNumber, selectSession } from "@store/slices/tableSessionSlice"
import { selectCartItems } from "@store/slices/cartSlice"
import { useDeviceTier } from "@shared/hooks/useDeviceTier"
import { useUIPrefs } from "@shared/hooks/useUIPrefs"

// ── Physics-based sky state + text color engine ──────────────────────────────
// Single source of truth for both canvas rendering and text legibility.
import { getBootstrapSkyState, getWeatherTextColors } from './skyPhysics'

// SkyCanvas re-exports getWeatherTextColors from skyPhysics — but WelcomeCard
// now imports directly from skyPhysics to avoid the circular dependency risk.
import SkyCanvasComponent from './SkyCanvas'

const SkyCanvas = lazy(() => import('./SkyCanvas'))

// ── Luminance threshold (must stay in sync with skyPhysics zones) ─────────────
const BRIGHT_THRESHOLD = 0.58

const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 5)  return { label: "Late Night",     sub: "Something special awaits" }
  if (h < 12) return { label: "Good Morning",   sub: "Start your day deliciously" }
  if (h < 17) return { label: "Good Afternoon", sub: "Time for a flavourful break" }
  if (h < 21) return { label: "Good Evening",   sub: "Dinner is served" }
  return             { label: "Good Night",      sub: "Late night cravings sorted" }
}

const WelcomeCardSkeleton = () => (
  <>
    <style>{`@keyframes wc-sk{0%{background-position:-200% center}100%{background-position:200% center}}`}</style>
    <div style={{ margin: 16, borderRadius: 24, minHeight: 196, overflow: "hidden", background: "var(--pill-bg)", padding: "20px 20px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      {[{ h: 9, w: "38%" }, { h: 9, w: "18%" }, { h: 40, w: "65%", mt: 4, r: 10 }, { h: 9, w: "50%", mt: 2 }].map((s, i) => (
        <div key={i} style={{ height: s.h, width: s.w, borderRadius: s.r ?? 8, marginTop: s.mt ?? 0, background: "linear-gradient(90deg,var(--pill-bg) 0%,var(--card-shimmer) 50%,var(--pill-bg) 100%)", backgroundSize: "200% 100%", animation: "wc-sk 1.6s ease-in-out infinite" }} />
      ))}
    </div>
  </>
)

const SkyFallback = ({ theme }) => (
  <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: `linear-gradient(160deg,${theme.bg[0]} 0%,${theme.bg[1]} 55%,${theme.bg[2]} 100%)`, borderRadius: "inherit", pointerEvents: "none", zIndex: 0 }} />
)

const WelcomeCard = ({ weather, loading = false }) => {
  const { isDark }               = useContext(ThemeContext)
  const { isLow, gsapEnabled }   = useDeviceTier()
  const { skyAnimationsEnabled } = useUIPrefs()

  const user        = useSelector(selectUser)
  const isGuest     = useSelector(selectIsGuest)
  const tableNumber = useSelector(selectTableNumber)
  const session     = useSelector(selectSession)
  const cartItems   = useSelector(selectCartItems)

  const [tableVisible, setTableVisible] = useState(false)

  const condition = weather?.condition ?? "cloudy"
  const theme     = useMemo(() => getWeatherTheme(condition, isDark), [condition, isDark])

  const showCanvas = !isLow && skyAnimationsEnabled

  // ── Sky state: start with physics bootstrap, update from canvas ───────────
  // getBootstrapSkyState() computes the real physical sky state for the
  // current hour + condition — much more accurate than old hardcoded values.
  const initialSkyState = useMemo(
    () => getBootstrapSkyState(condition, isDark),
    [condition, isDark]
  )
  const [skyState, setSkyState] = useState(initialSkyState)

  // Re-bootstrap when canvas is off, or condition/theme changes
  useEffect(() => {
    if (!showCanvas) setSkyState(getBootstrapSkyState(condition, isDark))
  }, [condition, isDark, showCanvas])

  // Canvas fires onBrightness with full SkyState (luminance + warmth + tint)
  // or with a legacy scalar for backwards compat
  const handleBrightness = useCallback((stateOrScalar) => {
    if (!showCanvas) return
    if (typeof stateOrScalar === 'object' && stateOrScalar !== null && 'luminance' in stateOrScalar) {
      setSkyState(stateOrScalar)
    } else if (typeof stateOrScalar === 'number') {
      // Legacy fallback — reconstruct state from scalar
      setSkyState(prev => ({ ...prev, luminance: stateOrScalar }))
    }
  }, [showCanvas])

  const wMeta = WEATHER_META[condition] ?? WEATHER_META.cloudy
  const tc    = LOYALTY_TIERS[user?.loyaltyTier || "none"] ?? LOYALTY_TIERS.none

  const displayName = isGuest ? "Guest" : user?.name?.split(" ")[0] || "Friend"
  const cartCount   = cartItems?.reduce((a, i) => a + i.quantity, 0) ?? 0
  const { label: greetLabel, sub: greetSub } = getGreeting()

  const sessionStart = session?.createdAt
    ? new Date(session.createdAt).toLocaleTimeString(BRAND.locale, { hour: "2-digit", minute: "2-digit" })
    : null

  // ── TEXT COLORS from physics state ────────────────────────────────────────
  // getWeatherTextColors now accepts the full SkyState object and derives
  // all colors from: luminance + warmth + chromatic tint + saturation.
  // At dawn: warm amber-tinted text. At night: cool blue-white text.
  // In rain: desaturated steel-blue. At noon clear: dark crisp text.
  const tc2 = useMemo(
    () => getWeatherTextColors(skyState, isDark, condition),
    [skyState, isDark, condition]
  )

  // Convenience: raw luminance for overlay/shimmer opacity math
  const skyBrightness = typeof skyState === 'object' ? (skyState.luminance ?? 0.5) : skyState

  const cardRef    = useRef(null)
  const greetRef   = useRef(null)
  const prefixRef  = useRef(null)
  const nameRowRef = useRef(null)
  const subRef     = useRef(null)
  const pillsRef   = useRef(null)
  const stripRef   = useRef(null)
  const shimmerRef = useRef(null)
  const tableRef   = useRef(null)

  useEffect(() => {
    if (!gsapEnabled) return
    if (!cardRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const tl = gsap.timeline({ delay: 0.05, defaults: { ease: "power3.out" } })
    tl.fromTo(cardRef.current,
      { y: 24, opacity: 0, scale: 0.97 },
      { y: 0, opacity: 1, scale: 1, duration: 0.6, force3D: true, clearProps: "transform" })
    const els = [greetRef, prefixRef, nameRowRef, subRef, pillsRef, stripRef].map(r => r.current).filter(Boolean)
    if (els.length)
      tl.fromTo(els, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.28, stagger: 0.06 }, "-=0.4")
    if (shimmerRef.current)
      tl.fromTo(shimmerRef.current, { x: "-115%" }, { x: "215%", duration: 1.6, ease: "power1.inOut" }, 0.22)
    return () => tl.kill()
  }, [condition, gsapEnabled])

  useEffect(() => {
    if (!tableNumber) return
    setTableVisible(false)
    const t = setTimeout(() => setTableVisible(true), 500)
    return () => clearTimeout(t)
  }, [tableNumber])

  useEffect(() => {
    if (!tableVisible || !tableRef.current) return
    if (!gsapEnabled) {
      gsap.set(tableRef.current, { opacity: 1, scale: 1, y: 0, rotateZ: 0 })
      return
    }
    gsap.fromTo(tableRef.current,
      { scale: 0.5, opacity: 0, y: 10, rotateZ: -8 },
      { scale: 1, opacity: 1, y: 0, rotateZ: 0, duration: 0.7, ease: "back.out(2.6)", force3D: true, clearProps: "transform" })
  }, [tableVisible, gsapEnabled])

  if (loading && !weather) return <WelcomeCardSkeleton />

  return (
    <>
      <style>{`
        .wc-root        { font-family: ${FONTS.welcomeBody}; -webkit-tap-highlight-color: transparent; }
        .wc-pill        { display: inline-flex; align-items: center; gap: 5px; padding: 5px 13px; border-radius: 99px; font-size: 11.5px; font-weight: 600; font-family: ${FONTS.welcomeBody}; letter-spacing: 0.01em; white-space: nowrap; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); transition: background 0.5s ease, color 0.5s ease, border-color 0.5s ease; flex-shrink: 0; }
        .wc-strip-item  { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 500; font-family: ${FONTS.welcomeBody}; letter-spacing: 0.02em; opacity: 0.65; white-space: nowrap; }
        @keyframes wc-ring  { 0%{transform:scale(1);opacity:0.5} 70%{transform:scale(1.6);opacity:0} 100%{transform:scale(1.6);opacity:0} }
        @keyframes wc-glow  { 0%,100%{opacity:0.65} 50%{opacity:1.0} }
        .wc-badge-ring  { animation: wc-ring 2.6s ease-out infinite; }
        .wc-greet-label { animation: wc-glow 3s ease-in-out infinite; }
        .wc-table-num   { font-family: ${FONTS.welcomeBody}; font-weight: 900; letter-spacing: -0.03em; line-height: 1; }
        .wc-name        { font-family: ${FONTS.welcomeName}; font-weight: 700; letter-spacing: 0.01em; line-height: 1; font-size: clamp(36px,10vw,52px); }
        .wc-card        { min-height: 196px; }
        .wc-card-inner  { position: relative; z-index: 5; padding: 20px 20px 18px; display: flex; flex-direction: column; gap: 0; }
        @media(min-width:640px)  { .wc-card{min-height:220px;} .wc-card-inner{padding:24px 24px 20px;} .wc-name{font-size:clamp(42px,8vw,60px)!important;} .wc-pill{font-size:12.5px;padding:6px 15px;} .wc-strip-item{font-size:10.5px;} }
        @media(min-width:1024px) { .wc-card{min-height:236px;} .wc-card-inner{padding:28px 32px 24px;} .wc-name{font-size:clamp(48px,5vw,68px)!important;} .wc-pill{font-size:13px;padding:7px 17px;gap:6px;} .wc-strip-item{font-size:11px;} }
      `}</style>

      <div
        ref={cardRef}
        className="wc-root wc-card"
        style={{
          position: "relative", overflow: "hidden",
          margin: 16, borderRadius: 24,
          background: theme.bg[1],
          boxShadow: [
            `0 16px 48px ${theme.shadow}`,
            `0 1px 0 rgba(255,255,255,${isDark ? "0.08" : "0.55"}) inset`,
            `0 0 0 1px rgba(${isDark ? "255,255,255,0.06" : "0,0,0,0.04"})`,
          ].join(", "),
          transition: "box-shadow 0.55s ease",
          contain: "layout style paint",
        }}
      >
        {showCanvas
          ? (
            <Suspense fallback={<SkyFallback theme={theme} />}>
              <SkyCanvas condition={condition} weather={weather} isDark={isDark} onBrightness={handleBrightness} />
            </Suspense>
          )
          : <SkyFallback theme={theme} />
        }

        {/* Gradient overlay — bottom to top fade, intensity from physics luminance */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "55%",
          background: `linear-gradient(to top,${tc2.overlay} 0%,transparent 100%)`,
          pointerEvents: "none", zIndex: 2, transition: "background 0.5s ease"
        }} />

        {/* Top highlight line — stronger on bright sky */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          zIndex: 3, pointerEvents: "none",
          background: `linear-gradient(90deg,transparent 5%,rgba(255,255,255,${skyBrightness > BRIGHT_THRESHOLD ? "0.70" : "0.14"}) 50%,transparent 95%)`,
          transition: "background 0.5s ease"
        }} />

        {/* Entry shimmer */}
        <div ref={shimmerRef} style={{
          position: "absolute", inset: 0, width: "40%",
          zIndex: 4, pointerEvents: "none",
          background: `linear-gradient(108deg,transparent 20%,rgba(255,255,255,${skyBrightness > BRIGHT_THRESHOLD ? "0.18" : "0.07"}) 50%,transparent 80%)`,
          transform: "translateX(-115%)"
        }} />

        {/* Table badge */}
        {tableNumber && tableVisible && (
          <div ref={tableRef} style={{ position: "absolute", top: 14, right: 14, zIndex: 10, opacity: 0 }}>
            <div className="wc-badge-ring" style={{
              position: "absolute", inset: -6, borderRadius: 18, pointerEvents: "none",
              border: `1.5px solid ${tc2.badgeBorder}`,
              transition: "border-color 0.5s ease"
            }} />
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "10px 14px", borderRadius: 18,
              background: tc2.badge,
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              border: `1px solid ${tc2.badgeBorder}`,
              boxShadow: `0 6px 24px rgba(0,0,0,${skyBrightness > BRIGHT_THRESHOLD ? 0.10 : 0.24}),0 1px 0 rgba(255,255,255,${skyBrightness > BRIGHT_THRESHOLD ? 0.55 : 0.10}) inset`,
              minWidth: 76, gap: 2,
              transition: "background 0.5s ease, border-color 0.5s ease",
            }}>
              <span style={{ fontSize: 11, lineHeight: 1, opacity: 0.6, marginBottom: 2 }}>🪑</span>
              <span style={{ fontFamily: FONTS.welcomeBody, fontSize: 7, fontWeight: 800, color: tc2.sub, textTransform: "uppercase", letterSpacing: "0.18em", lineHeight: 1, transition: "color 0.5s ease" }}>Table</span>
              <span className="wc-table-num" style={{ fontSize: tableNumber.length > 3 ? 18 : 24, color: tc2.badgeText, marginTop: 1, transition: "color 0.5s ease" }}>{tableNumber}</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="wc-card-inner" style={{ paddingRight: tableNumber ? "96px" : undefined }}>
          <p ref={greetRef} className="wc-greet-label" style={{ fontFamily: FONTS.welcomeBody, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: tc2.sub, lineHeight: 1, marginBottom: 6, transition: "color 0.5s ease" }}>{greetLabel}</p>
          <p ref={prefixRef} style={{ fontFamily: FONTS.welcomeBody, fontSize: 12, fontWeight: 300, color: tc2.sub, letterSpacing: "0.04em", lineHeight: 1, marginBottom: 2, transition: "color 0.5s ease" }}>{isGuest ? "Welcome," : "Hey,"}</p>
          <div ref={nameRowRef} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <span className="wc-name capitalize" style={{ color: tc2.name, textShadow: tc2.shadow, transition: "color 0.5s ease, text-shadow 0.5s ease" }}>{displayName}</span>
          </div>
          <p ref={subRef} style={{ fontFamily: FONTS.welcomeBody, fontSize: 12, fontWeight: 400, color: tc2.sub, letterSpacing: "0.01em", lineHeight: 1.4, marginBottom: 12, transition: "color 0.5s ease" }}>{greetSub}</p>

          <div ref={pillsRef} style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 7, alignItems: "center", marginBottom: 10 }}>
            <span className="wc-pill" style={{ background: tc2.pill, color: tc2.pillText, border: `1px solid ${tc2.pillBorder}`, boxShadow: `0 1px 0 ${tc2.pillInset} inset` }}>
              <span style={{ fontSize: 13, lineHeight: 1 }}>{wMeta.icon}</span>
              <span>{wMeta.label}</span>
              {weather?.temp != null && <span style={{ opacity: 0.62, fontWeight: 500 }}>· {Math.round(weather.temp)}°C</span>}
            </span>
            {!isGuest && (
              <span className="wc-pill" style={{ background: tc2.pill, color: tc2.pillText, border: `1px solid ${tc2.pillBorder}`, boxShadow: `0 1px 0 ${tc2.pillInset} inset` }}>
                <span style={{ fontSize: 12 }}>{tc.emoji}</span>
                <span>{tc.label}</span>
              </span>
            )}
          </div>

          <div ref={stripRef} style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
            {sessionStart && <span className="wc-strip-item" style={{ color: tc2.sub, transition: "color 0.5s ease" }}><Clock size={9} strokeWidth={2.5} /><span>Since {sessionStart}</span></span>}
            {cartCount > 0 && <span className="wc-strip-item" style={{ color: tc2.sub, transition: "color 0.5s ease" }}><ShoppingBag size={9} strokeWidth={2.5} /><span>{cartCount} item{cartCount !== 1 ? "s" : ""} in cart</span></span>}
            {session?.status === "active" && <span className="wc-strip-item" style={{ color: tc2.sub, transition: "color 0.5s ease" }}><Wifi size={9} strokeWidth={2.5} /><span>Active session</span></span>}
          </div>
        </div>
      </div>
    </>
  )
}

export default WelcomeCard