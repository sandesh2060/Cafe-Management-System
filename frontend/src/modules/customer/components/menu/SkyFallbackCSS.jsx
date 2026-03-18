// src/modules/customer/components/menu/SkyFallbackCSS.jsx
//
// ─── LOW-TIER WEATHER CANVAS — pure CSS, zero JS animation loops ─────────────
//
// Used automatically when detectTier() returns 'low'
// Every condition has its own CSS @keyframes animation:
//   sunny   → pulsing sun glow + gradient sky
//   rainy   → falling rain streaks (CSS transform)
//   windy   → drifting cloud shapes (CSS translate)
//   snowy   → floating snowflakes (CSS opacity + translate)
//   hot     → heat shimmer wave (CSS scale + opacity)
//   cloudy  → slow cloud drift
//   cold    → frost opacity pulse
//   night   → star twinkle (CSS opacity)
//
// ALL animations use only transform + opacity → GPU composited, zero repaint
// will-change: transform on every animated element → own GPU layer
// prefers-reduced-motion: all animations disabled automatically
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, memo } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// SKY GRADIENTS per condition
// ─────────────────────────────────────────────────────────────────────────────
const SKY_GRADIENTS = {
  sunny:  { light: 'linear-gradient(180deg,#4888c8 0%,#90c0f0 55%,#b8d8f8 100%)', dark: 'linear-gradient(180deg,#1c2f58 0%,#4878b8 55%,#6898d0 100%)' },
  hot:    { light: 'linear-gradient(180deg,#d04828 0%,#f89858 50%,#fcc080 100%)', dark: 'linear-gradient(180deg,#281408 0%,#b04018 55%,#e06028 100%)' },
  rainy:  { light: 'linear-gradient(180deg,#304868 0%,#6080a0 55%,#8098b8 100%)', dark: 'linear-gradient(180deg,#0c1018 0%,#1c2430 55%,#222c3a 100%)' },
  cloudy: { light: 'linear-gradient(180deg,#7888a8 0%,#a0aec8 55%,#b8c4d8 100%)', dark: 'linear-gradient(180deg,#3a4868 0%,#6070a0 55%,#7888b0 100%)' },
  windy:  { light: 'linear-gradient(180deg,#5898c8 0%,#a0d0f8 55%,#c8e8ff 100%)', dark: 'linear-gradient(180deg,#1a3060 0%,#4070c8 55%,#5898e0 100%)' },
  snowy:  { light: 'linear-gradient(180deg,#8898c0 0%,#b8c4de 55%,#d0d8ee 100%)', dark: 'linear-gradient(180deg,#182030 0%,#303848 55%,#404860 100%)' },
  cold:   { light: 'linear-gradient(180deg,#4888b8 0%,#88c0e0 55%,#a8d4f0 100%)', dark: 'linear-gradient(180deg,#101a2c 0%,#20305a 55%,#2a3a6a 100%)' },
  night:  { light: 'linear-gradient(180deg,#141028 0%,#282050 55%,#342860 100%)', dark: 'linear-gradient(180deg,#020510 0%,#080c28 55%,#0c1030 100%)' },
  dawn:   { light: 'linear-gradient(180deg,#6a3860 0%,#f09060 55%,#f8b878 100%)', dark: 'linear-gradient(180deg,#1c0a30 0%,#d04828 55%,#e86830 100%)' },
}

function getSkyGradient(condition, isDark) {
  const key = isDark ? 'dark' : 'light'
  return (SKY_GRADIENTS[condition] ?? SKY_GRADIENTS.cloudy)[key]
}

// ─────────────────────────────────────────────────────────────────────────────
// TIME-OF-DAY CONDITION OVERRIDE
// ─────────────────────────────────────────────────────────────────────────────
function resolveDisplayCondition(condition) {
  const h = new Date().getHours()
  if (h < 5 || h >= 20) return 'night'
  if (h < 7)  return 'dawn'
  return condition
}

// ─────────────────────────────────────────────────────────────────────────────
// BRIGHTNESS — matches SkyCanvas computeBrightness logic
// ─────────────────────────────────────────────────────────────────────────────
const BRIGHTNESS_MAP = {
  sunny: { light: 0.88, dark: 0.62 },
  hot:   { light: 0.85, dark: 0.58 },
  windy: { light: 0.82, dark: 0.58 },
  rainy: { light: 0.42, dark: 0.22 },
  snowy: { light: 0.52, dark: 0.30 },
  cloudy:{ light: 0.48, dark: 0.28 },
  cold:  { light: 0.56, dark: 0.32 },
  night: { light: 0.25, dark: 0.18 },
  dawn:  { light: 0.55, dark: 0.38 },
}

function getBrightness(condition, isDark) {
  const map = BRIGHTNESS_MAP[condition] ?? BRIGHTNESS_MAP.cloudy
  return isDark ? map.dark : map.light
}

// ─────────────────────────────────────────────────────────────────────────────
// KEYFRAMES — injected once into document head
// Only transform + opacity used → GPU composited, no layout/paint
// ─────────────────────────────────────────────────────────────────────────────
const CSS_KEYFRAMES = `
@media (prefers-reduced-motion: no-preference) {
  @keyframes sky-sun-pulse   { 0%,100%{opacity:.82;transform:scale(1)}   50%{opacity:1;transform:scale(1.08)} }
  @keyframes sky-rain-fall   { 0%{transform:translateY(-8%) rotate(12deg)} 100%{transform:translateY(108%) rotate(12deg)} }
  @keyframes sky-cloud-drift { 0%{transform:translateX(-18%)} 100%{transform:translateX(110%)} }
  @keyframes sky-cloud-slow  { 0%{transform:translateX(0%)}  100%{transform:translateX(28%)} }
  @keyframes sky-snow-fall   { 0%{transform:translateY(-5%) translateX(0px);opacity:.9} 100%{transform:translateY(110%) translateX(18px);opacity:.2} }
  @keyframes sky-hot-haze    { 0%,100%{transform:scaleY(1);opacity:.18}   50%{transform:scaleY(1.06);opacity:.30} }
  @keyframes sky-frost-pulse { 0%,100%{opacity:.28} 50%{opacity:.48} }
  @keyframes sky-star-twinkle{ 0%,100%{opacity:.6}  40%{opacity:1}  70%{opacity:.3} }
  @keyframes sky-moon-glow   { 0%,100%{opacity:.80} 50%{opacity:1.0} }
  @keyframes sky-dawn-blush  { 0%,100%{opacity:.60} 50%{opacity:.85} }
}
`

let keyframesInjected = false
function ensureKeyframes() {
  if (keyframesInjected || typeof document === 'undefined') return
  const style = document.createElement('style')
  style.textContent = CSS_KEYFRAMES
  document.head.appendChild(style)
  keyframesInjected = true
}

// ─────────────────────────────────────────────────────────────────────────────
// WEATHER LAYERS — each returns an array of absolutely-positioned divs
// All use will-change:transform for GPU layer promotion
// ─────────────────────────────────────────────────────────────────────────────

// SUNNY — radial sun glow + pulsing core
function SunnyLayer({ isDark }) {
  const sunColor = isDark ? 'rgba(255,200,50,0.55)' : 'rgba(255,220,80,0.70)'
  const coreColor= isDark ? 'rgba(255,230,120,0.80)' : 'rgba(255,245,160,0.95)'
  return (
    <>
      {/* Sun halo */}
      <div style={{
        position:'absolute', top:'6%', right:'14%',
        width:80, height:80, borderRadius:'50%',
        background:`radial-gradient(circle, ${sunColor} 0%, transparent 72%)`,
        willChange:'transform',
        animation:'sky-sun-pulse 4s ease-in-out infinite',
      }}/>
      {/* Sun core */}
      <div style={{
        position:'absolute', top:'13%', right:'21%',
        width:28, height:28, borderRadius:'50%',
        background:coreColor,
        boxShadow:`0 0 18px 8px ${sunColor}`,
        willChange:'transform',
        animation:'sky-sun-pulse 4s ease-in-out infinite 0.5s',
      }}/>
    </>
  )
}

// RAINY — falling rain streak divs
function RainyLayer({ isDark }) {
  const streaks = useMemo(() => Array.from({length: 18}, (_, i) => ({
    left: `${(i * 5.8) % 100}%`,
    top:  `${(i * 7.3) % 30 - 10}%`,
    height: `${28 + (i * 13) % 22}px`,
    delay: `${(i * 0.18) % 1.2}s`,
    duration: `${0.55 + (i * 0.07) % 0.35}s`,
    opacity: 0.18 + (i % 5) * 0.06,
  })), [])

  const color = isDark ? 'rgba(140,180,220,0.55)' : 'rgba(100,140,200,0.45)'

  return (
    <>
      {streaks.map((s, i) => (
        <div key={i} style={{
          position:'absolute',
          left: s.left, top: s.top,
          width: 1.5, height: s.height,
          background: `linear-gradient(to bottom, transparent, ${color})`,
          borderRadius: 2,
          opacity: s.opacity,
          willChange:'transform',
          animation:`sky-rain-fall ${s.duration} linear ${s.delay} infinite`,
        }}/>
      ))}
    </>
  )
}

// WINDY — fast drifting cloud blobs
function WindyLayer({ isDark }) {
  const clouds = useMemo(() => [
    { top:'12%', width:120, height:28, blur:12, delay:'0s',   duration:'5s',  opacity:.55 },
    { top:'24%', width:90,  height:20, blur:10, delay:'1.8s', duration:'4.2s',opacity:.40 },
    { top:'38%', width:150, height:32, blur:14, delay:'0.6s', duration:'6s',  opacity:.30 },
  ], [])

  const cloudColor = isDark ? 'rgba(180,210,255,0.60)' : 'rgba(255,255,255,0.75)'

  return (
    <>
      {clouds.map((c, i) => (
        <div key={i} style={{
          position:'absolute',
          top: c.top, left:'-15%',
          width: c.width, height: c.height,
          borderRadius: '50%',
          background: cloudColor,
          filter: `blur(${c.blur}px)`,
          opacity: c.opacity,
          willChange:'transform',
          animation:`sky-cloud-drift ${c.duration} linear ${c.delay} infinite`,
        }}/>
      ))}
    </>
  )
}

// SNOWY — floating snowflake dots
function SnowyLayer({ isDark }) {
  const flakes = useMemo(() => Array.from({length: 20}, (_, i) => ({
    left:     `${(i * 4.9 + 2) % 98}%`,
    top:      `${(i * 6.1) % 20 - 5}%`,
    size:     2 + (i % 4),
    delay:    `${(i * 0.22) % 2}s`,
    duration: `${2.2 + (i * 0.18) % 1.5}s`,
    opacity:  0.5 + (i % 3) * 0.15,
  })), [])

  const flakeColor = isDark ? 'rgba(200,225,255,0.90)' : 'rgba(220,235,255,0.95)'

  return (
    <>
      {flakes.map((f, i) => (
        <div key={i} style={{
          position:'absolute',
          left: f.left, top: f.top,
          width: f.size, height: f.size,
          borderRadius: '50%',
          background: flakeColor,
          opacity: f.opacity,
          willChange:'transform',
          animation:`sky-snow-fall ${f.duration} ease-in ${f.delay} infinite`,
        }}/>
      ))}
    </>
  )
}

// HOT — heat shimmer horizontal bands
function HotLayer({ isDark }) {
  const hazeColor = isDark
    ? 'rgba(200,80,10,0.22)'
    : 'rgba(255,140,40,0.18)'
  return (
    <>
      {[0,1,2].map(i => (
        <div key={i} style={{
          position:'absolute',
          bottom: `${28 + i * 8}%`,
          left: 0, right: 0,
          height: 12,
          background: `linear-gradient(90deg, transparent, ${hazeColor}, transparent)`,
          willChange:'transform',
          animation:`sky-hot-haze ${1.8 + i * 0.4}s ease-in-out ${i * 0.5}s infinite`,
        }}/>
      ))}
    </>
  )
}

// CLOUDY — slow drifting wide cloud blobs
function CloudyLayer({ isDark }) {
  const clouds = useMemo(() => [
    { top:'8%',  width:200, height:50, blur:20, delay:'0s',   duration:'18s', opacity:.70 },
    { top:'22%', width:160, height:40, blur:16, delay:'6s',   duration:'22s', opacity:.55 },
    { top:'36%', width:220, height:44, blur:18, delay:'12s',  duration:'26s', opacity:.45 },
  ], [])

  const cloudColor = isDark ? 'rgba(130,150,190,0.70)' : 'rgba(200,210,230,0.80)'

  return (
    <>
      {clouds.map((c, i) => (
        <div key={i} style={{
          position:'absolute',
          top: c.top, left: `${i * 10}%`,
          width: c.width, height: c.height,
          borderRadius: '50%',
          background: cloudColor,
          filter: `blur(${c.blur}px)`,
          opacity: c.opacity,
          willChange:'transform',
          animation:`sky-cloud-slow ${c.duration} ease-in-out ${c.delay} infinite alternate`,
        }}/>
      ))}
    </>
  )
}

// COLD — subtle frost shimmer
function ColdLayer({ isDark }) {
  const frostColor = isDark
    ? 'rgba(160,200,240,0.30)'
    : 'rgba(180,220,255,0.35)'
  return (
    <div style={{
      position:'absolute', inset:0,
      background:`radial-gradient(ellipse at 50% 80%, ${frostColor} 0%, transparent 65%)`,
      willChange:'opacity',
      animation:'sky-frost-pulse 3.5s ease-in-out infinite',
    }}/>
  )
}

// NIGHT — twinkling star dots
function NightLayer({ isDark }) {
  const stars = useMemo(() => Array.from({length: 28}, (_, i) => ({
    left:     `${(i * 3.6 + 1) % 96}%`,
    top:      `${(i * 2.8 + 2) % 72}%`,
    size:     1 + (i % 3),
    delay:    `${(i * 0.35) % 3}s`,
    duration: `${2 + (i * 0.22) % 2}s`,
    opacity:  isDark ? 0.7 + (i%3)*0.1 : 0.4 + (i%3)*0.1,
  })), [isDark])

  const starColor = isDark ? 'rgba(200,215,255,0.95)' : 'rgba(180,200,255,0.70)'

  return (
    <>
      {/* Moon glow */}
      <div style={{
        position:'absolute', top:'8%', right:'16%',
        width:36, height:36, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(200,215,255,0.85) 0%, rgba(160,180,255,0.30) 55%, transparent 75%)',
        willChange:'opacity',
        animation:'sky-moon-glow 5s ease-in-out infinite',
      }}/>
      {/* Stars */}
      {stars.map((s, i) => (
        <div key={i} style={{
          position:'absolute',
          left: s.left, top: s.top,
          width: s.size, height: s.size,
          borderRadius: '50%',
          background: starColor,
          opacity: s.opacity,
          willChange:'opacity',
          animation:`sky-star-twinkle ${s.duration} ease-in-out ${s.delay} infinite`,
        }}/>
      ))}
    </>
  )
}

// DAWN — orange-pink blush glow
function DawnLayer({ isDark }) {
  const blushColor = isDark
    ? 'rgba(220,80,40,0.45)'
    : 'rgba(255,160,80,0.50)'
  return (
    <div style={{
      position:'absolute', inset:0,
      background:`radial-gradient(ellipse at 30% 85%, ${blushColor} 0%, transparent 60%)`,
      willChange:'opacity',
      animation:'sky-dawn-blush 4s ease-in-out infinite',
    }}/>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUND STRIP — simple green gradient at bottom, no animation
// ─────────────────────────────────────────────────────────────────────────────
function GroundStrip({ isDark }) {
  return (
    <div style={{
      position:'absolute', bottom:0, left:0, right:0,
      height:'28%',
      background: isDark
        ? 'linear-gradient(to top, #0a1208 0%, #0e1a0c 40%, transparent 100%)'
        : 'linear-gradient(to top, #1a3010 0%, #2a4818 40%, transparent 100%)',
      pointerEvents:'none',
    }}/>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const SkyFallbackCSS = memo(({ condition = 'cloudy', isDark = true, onBrightness }) => {
  const displayCondition = useMemo(() => resolveDisplayCondition(condition), [condition])
  const skyGradient      = useMemo(() => getSkyGradient(displayCondition, isDark), [displayCondition, isDark])

  // Inject keyframes once
  useEffect(() => { ensureKeyframes() }, [])

  // Report brightness to WelcomeCard (same as SkyCanvas does)
  useEffect(() => {
    if (onBrightness) onBrightness(getBrightness(displayCondition, isDark))
  }, [displayCondition, isDark, onBrightness])

  return (
    <div
      aria-hidden="true"
      style={{
        position:'absolute', inset:0,
        borderRadius:'inherit', overflow:'hidden',
        pointerEvents:'none', zIndex:0,
        background: skyGradient,
        // Promote to own GPU layer — prevents repaint affecting parent
        willChange:'transform',
        transform:'translateZ(0)',
      }}
    >
      {/* Weather-specific animation layer */}
      {displayCondition === 'sunny'  && <SunnyLayer  isDark={isDark}/>}
      {displayCondition === 'rainy'  && <RainyLayer  isDark={isDark}/>}
      {displayCondition === 'windy'  && <WindyLayer  isDark={isDark}/>}
      {displayCondition === 'snowy'  && <SnowyLayer  isDark={isDark}/>}
      {displayCondition === 'hot'    && <HotLayer    isDark={isDark}/>}
      {displayCondition === 'cloudy' && <CloudyLayer isDark={isDark}/>}
      {displayCondition === 'cold'   && <ColdLayer   isDark={isDark}/>}
      {displayCondition === 'night'  && <NightLayer  isDark={isDark}/>}
      {displayCondition === 'dawn'   && <DawnLayer   isDark={isDark}/>}

      {/* Ground strip */}
      <GroundStrip isDark={isDark}/>

      {/* Bottom readability gradient */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0, height:'50%',
        background:`linear-gradient(to top, rgba(0,0,0,${isDark?0.45:0.20}) 0%, transparent 100%)`,
        pointerEvents:'none',
      }}/>
    </div>
  )
})

SkyFallbackCSS.displayName = 'SkyFallbackCSS'

export default SkyFallbackCSS