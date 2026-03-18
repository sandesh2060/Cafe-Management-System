// src/shared/context/DeviceTierContext.jsx
//
// ─── CENTRALIZED DEVICE TIER DETECTION ───────────────────────────────────────
//
// Detects device capability ONCE at app start, provides it to every component.
// Any component calls useDeviceTier() — no re-detection, no duplication.
//
// Tiers:
//   'low'  → low-end Android (≤4 cores, ≤2GB RAM, weak GPU)
//   'mid'  → mid-range phones / most iPhones
//   'high' → flagship phones / MacBook / Desktop
//
// Usage in any component:
//   import { useDeviceTier } from '@shared/hooks/useDeviceTier'
//   const { tier, config, isLow, gsapEnabled } = useDeviceTier()
//
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useMemo } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// DETECTION — runs once, cached at module level (never runs again)
// ─────────────────────────────────────────────────────────────────────────────
function detectTier() {
  if (typeof window === 'undefined') return 'mid'

  const cores  = navigator.hardwareConcurrency || 4
  const memory = navigator.deviceMemory        || 4  // Chrome/Android only

  // GPU string — best signal for truly weak devices
  const gpu = (() => {
    try {
      const gl  = document.createElement('canvas').getContext('webgl')
      const dbg = gl?.getExtension('WEBGL_debug_renderer_info')
      return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : ''
    } catch { return '' }
  })()

  // Known weak GPU patterns
  const isLowGpu = /mali-4|mali-t|adreno 3[0-2]|powervr sgx/i.test(gpu)

  if (isLowGpu || (cores <= 4 && memory <= 2)) return 'low'
  if (cores <= 6 && memory <= 4)               return 'mid'
  return 'high'
}

// Cached at module level — detectTier() runs exactly once per page load
const DETECTED_TIER = detectTier()

// ─────────────────────────────────────────────────────────────────────────────
// TIER CONFIG — single source of truth for ALL animation parameters
// Every component reads from here — no hardcoded values anywhere else
// ─────────────────────────────────────────────────────────────────────────────
export const TIER_CONFIGS = {
  low: {
    // ── SkyCanvas ──────────────────────────────────────────────────────────
    useWebGL:         false,  // use SkyFallbackCSS (pure CSS animations)
    blades:           0,      // no grass canvas at all
    fps:              20,
    dpr:              1,
    fbmLoops:         0,
    birds:            false,
    leaves:           false,
    rainPN:           0,
    snowPN:           0,
    // ── General UI animations ──────────────────────────────────────────────
    animationsEnabled: true,  // CSS keyframe animations still run (GPU composited)
    gsapEnabled:      false,  // skip all GSAP entrance/exit animations
    transitionMs:     0,      // instant page transitions
    skeletonAnimate:  false,  // static skeleton (no shimmer loop)
    confettiEnabled:  false,  // skip confetti on payment success
    toastAnimation:   'none', // no toast slide-in animations
    hoverEffects:     false,  // no hover scale/shadow on cards
  },
  mid: {
    useWebGL:         true,
    blades:           200,
    fps:              30,
    dpr:              1,
    fbmLoops:         4,
    birds:            true,
    leaves:           false,
    rainPN:           400,
    snowPN:           200,
    animationsEnabled: true,
    gsapEnabled:      true,
    transitionMs:     200,
    skeletonAnimate:  true,
    confettiEnabled:  true,
    toastAnimation:   'slide',
    hoverEffects:     true,
  },
  high: {
    useWebGL:         true,
    blades:           500,
    fps:              60,
    dpr:              1.5,
    fbmLoops:         6,
    birds:            true,
    leaves:           true,
    rainPN:           1400,
    snowPN:           550,
    animationsEnabled: true,
    gsapEnabled:      true,
    transitionMs:     300,
    skeletonAnimate:  true,
    confettiEnabled:  true,
    toastAnimation:   'slide',
    hoverEffects:     true,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────────────────────
export const DeviceTierContext = createContext(null)

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER — added once in providers.jsx, nothing ever re-renders from this
// ─────────────────────────────────────────────────────────────────────────────
export const DeviceTierProvider = ({ children }) => {
  const value = useMemo(() => ({
    tier:              DETECTED_TIER,
    config:            TIER_CONFIGS[DETECTED_TIER],
    // Convenience booleans — avoid tier === 'low' comparisons everywhere
    isLow:             DETECTED_TIER === 'low',
    isMid:             DETECTED_TIER === 'mid',
    isHigh:            DETECTED_TIER === 'high',
    // Most-used flags surfaced directly for ergonomics
    animationsEnabled: TIER_CONFIGS[DETECTED_TIER].animationsEnabled,
    gsapEnabled:       TIER_CONFIGS[DETECTED_TIER].gsapEnabled,
    hoverEffects:      TIER_CONFIGS[DETECTED_TIER].hoverEffects,
  }), []) // stable — tier never changes after mount

  return (
    <DeviceTierContext.Provider value={value}>
      {children}
    </DeviceTierContext.Provider>
  )
}

export default DeviceTierContext