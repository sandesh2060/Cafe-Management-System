// src/modules/customer/components/menu/skyPhysics.js
//
// ─── PHYSICALLY-BASED SKY STATE ENGINE ───────────────────────────────────────
//
// Single source of truth for sky luminance, chromatic state, and derived
// text colors. Both SkyCanvas and WelcomeCard import from here.
//
// Science implemented:
//   • Solar altitude via declination + hour angle (latitude: Kathmandu 27.7°N)
//   • Air mass via Kasten-Young formula (accounts for refraction near horizon)
//   • Rayleigh transmittance: exponential extinction with AM
//   • Civil twilight scattered light (below-horizon glow)
//   • Cloud attenuation: Beer-Lambert law (optical depth τ = cd × k)
//   • Cloud diffuse bounce: fraction of blocked light scattered downward
//   • ACES filmic tone mapping on raw luminance
//   • Chromatic state: time-varying RGB tint from scattering physics
//   • Condition desaturation: Mie scattering reduces saturation for fog/rain
// ─────────────────────────────────────────────────────────────────────────────

const LAT_RAD = 27.7 * Math.PI / 180   // Kathmandu latitude
const DECL_RAD = 15.0 * Math.PI / 180  // approximate solar declination (equinox midpoint)

// ── 1. SOLAR GEOMETRY ────────────────────────────────────────────────────────

/**
 * Solar altitude angle in radians for a given decimal hour.
 * Uses the spherical law of cosines.
 * alt > 0 → sun above horizon
 * alt < 0 → below horizon (civil twilight: alt > -6°)
 */
export function solarAltitude(h) {
  const HA = ((h - 12) / 12) * Math.PI  // hour angle
  return Math.asin(
    Math.sin(LAT_RAD) * Math.sin(DECL_RAD) +
    Math.cos(LAT_RAD) * Math.cos(DECL_RAD) * Math.cos(HA)
  )
}

/**
 * Air mass via Kasten-Young formula.
 * At zenith: AM = 1. At horizon: AM ≈ 38. Below horizon: extrapolated.
 * Accounts for atmospheric refraction bending light around the horizon.
 */
export function airMass(altRad) {
  const altDeg = altRad * 180 / Math.PI
  if (altDeg < -2) return 40  // fully below horizon, maximum extinction
  // Kasten-Young (1989): most accurate formula for low elevation angles
  return 1 / (Math.sin(altRad + 0.50572 * Math.pow(altDeg + 6.07995, -1.6364)) + 0.0001)
}

/**
 * Rayleigh scattering transmittance.
 * T_R = exp(-0.0903 × AM^0.84)
 * From Bird & Hulstrom (1981) simplified broadband model.
 */
export function rayleighTransmittance(AM) {
  return Math.exp(-0.0903 * Math.pow(Math.min(AM, 40), 0.84))
}

/**
 * Civil twilight contribution: sky is faintly lit when sun is 0–6° below horizon.
 * Exponential decay in scattered light.
 */
function twilightGlow(altRad) {
  const altDeg = altRad * 180 / Math.PI
  if (altDeg >= 0) return 0
  if (altDeg < -6) return 0
  // Maximum glow at horizon (alt=0), zero at civil twilight limit (-6°)
  return 0.055 * Math.exp(altDeg / 1.8)
}

// ── 2. CLOUD ATTENUATION (Beer-Lambert) ──────────────────────────────────────

// Extinction coefficients per cloud type
// k_ext: optical depth per unit cloud density
// k_diffuse: fraction scattered downward (cloud base illumination)
const CLOUD_K = {
  rainy:  { ext: 4.2, diff: 0.22 },  // deep cumulonimbus — nearly opaque
  snowy:  { ext: 2.8, diff: 0.30 },  // stratus — thick, diffuse
  cloudy: { ext: 2.4, diff: 0.32 },  // altostratus
  cold:   { ext: 1.8, diff: 0.28 },  // stratocumulus
  hot:    { ext: 0.6, diff: 0.18 },  // thin cirrus/haze
  windy:  { ext: 1.2, diff: 0.22 },  // broken cumulus
  sunny:  { ext: 0.8, diff: 0.20 },  // fair-weather cumulus
}

/**
 * Net luminance through cloud layer.
 * L_through = I_direct × exp(-cd × k_ext)
 * L_diffuse = I_direct × (1 - exp(-cd × k_ext)) × k_diff
 * L_cloud = L_through + L_diffuse
 */
function cloudLuminance(I_direct, cd, condition) {
  const k = CLOUD_K[condition] ?? CLOUD_K.cloudy
  const τ = cd * k.ext
  const transmittance = Math.exp(-τ)
  const blocked = 1 - transmittance
  return I_direct * transmittance + I_direct * blocked * k.diff
}

// ── 3. SKY LUMINANCE (full model) ────────────────────────────────────────────

/**
 * Rayleigh sky scatter: even with no direct sun, Rayleigh scattering from
 * sunlit upper atmosphere illuminates the sky dome.
 * Scales with solar altitude above horizon.
 */
function rayleighScatter(altRad, cd) {
  const sinAlt = Math.max(0, Math.sin(altRad))
  const clearSkyScatter = 0.18 * sinAlt  // Lambertian hemisphere coefficient
  return clearSkyScatter * (1 - cd * 0.6)  // clouds partially occlude scattered dome
}

/**
 * ACES filmic tone mapping.
 * Maps raw physical luminance [0,∞) → perceptual [0,1].
 * Matches the toneMappingExposure used in the WebGL renderer.
 */
function acesToneMap(L) {
  const a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14
  const Lm = L * 1.05  // slight exposure boost
  return Math.min(1, Math.max(0, (Lm * (a * Lm + b)) / (Lm * (c * Lm + d) + e)))
}

/**
 * Core physics function: compute sky luminance [0,1] for given time + weather.
 * This is the SAME luminance the WebGL renderer produces — text colors
 * computed from this will always match what you see on screen.
 */
export function computeSkyLuminance(h, condition, cd) {
  const alt = solarAltitude(h)
  const AM  = airMass(alt)
  const T_R = rayleighTransmittance(AM)

  // Direct solar irradiance — Lambert cosine law (sin = cos of zenith angle)
  const sinAlt     = Math.max(0, Math.sin(alt))
  const I_direct   = sinAlt * T_R  // max ≈ 0.89 at Kathmandu noon

  // Add civil twilight scattered glow
  const I_twilight = twilightGlow(alt)

  // Total above-cloud irradiance
  const I_total    = I_direct + I_twilight

  // Cloud Beer-Lambert attenuation
  const L_cloud    = cloudLuminance(I_total, cd, condition)

  // Rayleigh sky dome contribution (always present while sun is up)
  const L_scatter  = rayleighScatter(alt, cd)

  // Moon contribution at night (weak reflected sunlight, ~400,000× less)
  const L_moon     = (h < 5.5 || h >= 19) ? 0.035 : 0

  // Total raw luminance
  const L_raw      = L_cloud + L_scatter + L_moon

  // Apply ACES tone mapping
  return acesToneMap(L_raw)
}

// ── 4. CHROMATIC STATE ────────────────────────────────────────────────────────

/**
 * Returns the ambient chromatic tint of the sky at hour h.
 * Based on Rayleigh scattering physics:
 * - High sun: blue sky (short λ dominate scatter → sky appears blue)
 * - Low sun: warm (long path → short λ scattered away → red/orange dominates)
 * - Night: moonlight color temperature ~4100K → slightly blue
 *
 * Returns { r, g, b, warmth, saturationScale }
 * r/g/b: multiplicative tint applied to text colors (1.0 = neutral)
 * warmth: -1 (cool) → 0 (neutral) → 1 (warm)
 * saturationScale: how much to desaturate (condition + time dependent)
 */
export function chromaticState(h, condition) {
  // Smooth interpolation helpers
  const smoothstep = (e0, e1, x) => {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)
  }
  const lerp = (a, b, t) => a + (b - a) * t

  // Define chromatic keyframes (physically motivated)
  // Each: { r, g, b, warmth }
  const CHROMA = {
    night:      { r: 0.72, g: 0.80, b: 1.00, warmth: -1.0 }, // moonlight ~4100K
    deepDawn:   { r: 0.92, g: 0.58, b: 0.45, warmth:  0.9 }, // red/orange horizon
    dawn:       { r: 1.00, g: 0.75, b: 0.55, warmth:  0.8 }, // warm pink glow
    morning:    { r: 1.00, g: 0.90, b: 0.78, warmth:  0.4 }, // transitioning warm
    midday:     { r: 0.96, g: 0.97, b: 1.00, warmth:  0.0 }, // neutral white-blue
    goldenHour: { r: 1.00, g: 0.65, b: 0.30, warmth:  1.0 }, // deep amber
    dusk:       { r: 0.88, g: 0.50, b: 0.75, warmth:  0.5 }, // magenta-purple
    deepDusk:   { r: 0.55, g: 0.38, b: 0.65, warmth:  0.3 }, // twilight purple
  }

  let chroma

  if (h < 5.5) {
    chroma = CHROMA.night
  } else if (h < 6.2) {
    // Deep dawn: orange-red sun just below/at horizon
    const t = (h - 5.5) / 0.7
    chroma = {
      r: lerp(CHROMA.night.r, CHROMA.deepDawn.r, t),
      g: lerp(CHROMA.night.g, CHROMA.deepDawn.g, t),
      b: lerp(CHROMA.night.b, CHROMA.deepDawn.b, t),
      warmth: lerp(CHROMA.night.warmth, CHROMA.deepDawn.warmth, t),
    }
  } else if (h < 7.5) {
    // Dawn → morning: pinks fade to warm yellow-white
    const t = (h - 6.2) / 1.3
    chroma = {
      r: lerp(CHROMA.deepDawn.r, CHROMA.morning.r, t),
      g: lerp(CHROMA.deepDawn.g, CHROMA.morning.g, t),
      b: lerp(CHROMA.deepDawn.b, CHROMA.morning.b, t),
      warmth: lerp(CHROMA.deepDawn.warmth, CHROMA.morning.warmth, t),
    }
  } else if (h < 10) {
    // Morning → midday: warm fades to neutral
    const t = (h - 7.5) / 2.5
    chroma = {
      r: lerp(CHROMA.morning.r, CHROMA.midday.r, t),
      g: lerp(CHROMA.morning.g, CHROMA.midday.g, t),
      b: lerp(CHROMA.morning.b, CHROMA.midday.b, t),
      warmth: lerp(CHROMA.morning.warmth, CHROMA.midday.warmth, t),
    }
  } else if (h < 15) {
    // Full midday: neutral white-blue sky
    chroma = CHROMA.midday
  } else if (h < 16.5) {
    // Afternoon: slight warming begins
    const t = (h - 15) / 1.5
    chroma = {
      r: lerp(CHROMA.midday.r, CHROMA.goldenHour.r, t * 0.4),
      g: lerp(CHROMA.midday.g, CHROMA.goldenHour.g, t * 0.4),
      b: lerp(CHROMA.midday.b, CHROMA.goldenHour.b, t * 0.4),
      warmth: lerp(CHROMA.midday.warmth, CHROMA.goldenHour.warmth, t * 0.4),
    }
  } else if (h < 18.5) {
    // Golden hour: deep amber
    const t = (h - 16.5) / 2.0
    chroma = {
      r: lerp(CHROMA.midday.r, CHROMA.goldenHour.r, t),
      g: lerp(CHROMA.midday.g, CHROMA.goldenHour.g, t),
      b: lerp(CHROMA.midday.b, CHROMA.goldenHour.b, t),
      warmth: lerp(CHROMA.midday.warmth, CHROMA.goldenHour.warmth, t),
    }
  } else if (h < 19.5) {
    // Golden hour → dusk: amber to magenta-purple
    const t = (h - 18.5) / 1.0
    chroma = {
      r: lerp(CHROMA.goldenHour.r, CHROMA.dusk.r, t),
      g: lerp(CHROMA.goldenHour.g, CHROMA.dusk.g, t),
      b: lerp(CHROMA.goldenHour.b, CHROMA.dusk.b, t),
      warmth: lerp(CHROMA.goldenHour.warmth, CHROMA.dusk.warmth, t),
    }
  } else if (h < 20.5) {
    // Dusk → deep dusk → night
    const t = (h - 19.5) / 1.0
    chroma = {
      r: lerp(CHROMA.dusk.r, CHROMA.deepDusk.r, t),
      g: lerp(CHROMA.dusk.g, CHROMA.deepDusk.g, t),
      b: lerp(CHROMA.dusk.b, CHROMA.deepDusk.b, t),
      warmth: lerp(CHROMA.dusk.warmth, CHROMA.deepDusk.warmth, t),
    }
  } else if (h < 21.5) {
    const t = (h - 20.5) / 1.0
    chroma = {
      r: lerp(CHROMA.deepDusk.r, CHROMA.night.r, t),
      g: lerp(CHROMA.deepDusk.g, CHROMA.night.g, t),
      b: lerp(CHROMA.deepDusk.b, CHROMA.night.b, t),
      warmth: lerp(CHROMA.deepDusk.warmth, CHROMA.night.warmth, t),
    }
  } else {
    chroma = CHROMA.night
  }

  // Condition desaturation — Mie vs Rayleigh scattering physics
  // Mie scattering (large particles: water droplets) → wavelength-independent → grey
  // Rayleigh (gas molecules) → wavelength-selective → saturated colors
  const SAT_SCALE = {
    rainy:  0.30,  // cumulonimbus: dense water droplets → strong Mie → nearly grey
    snowy:  0.50,  // stratus: ice crystals → white diffuse
    foggy:  0.20,  // extreme Mie scattering → almost pure white
    cloudy: 0.55,  // thick overcast → partial Mie dominance
    cold:   0.72,  // partly cloudy → moderate desaturation
    hot:    0.90,  // thin haze → slight desaturation
    windy:  0.82,  // broken clouds → mostly clear
    sunny:  1.00,  // clear air → pure Rayleigh → maximum saturation
  }
  const saturationScale = SAT_SCALE[condition] ?? 0.65

  // Apply desaturation: lerp chroma tints toward neutral (1.0)
  const sat = saturationScale
  return {
    r: 1.0 + (chroma.r - 1.0) * sat,
    g: 1.0 + (chroma.g - 1.0) * sat,
    b: 1.0 + (chroma.b - 1.0) * sat,
    warmth: chroma.warmth * sat,
    saturationScale: sat,
  }
}

// ── 5. FULL SKY STATE (exported — used by both SkyCanvas and WelcomeCard) ────

/**
 * Compute complete physical sky state for a given time and weather.
 * This is called once per frame in SkyCanvas and passed via onBrightness.
 * WelcomeCard uses the same function for accurate static estimates.
 *
 * @param {number} h - decimal hour (e.g. 14.5 = 2:30 PM)
 * @param {string} condition - 'sunny'|'rainy'|'cloudy'|'snowy'|'hot'|'cold'|'windy'
 * @param {number} cd - cloud density [0,1] from SKY palette
 * @returns SkyState object used by getWeatherTextColors
 */
export function computeSkyState(h, condition, cd = 0.5) {
  const luminance = computeSkyLuminance(h, condition, cd)
  const chroma    = chromaticState(h, condition)

  return {
    luminance,          // [0,1] physical sky brightness (ACES tonemapped)
    warmth:  chroma.warmth,        // [-1,1] cold→warm
    tint:    { r: chroma.r, g: chroma.g, b: chroma.b },
    saturationScale: chroma.saturationScale,
    condition,
    h,
    cd,
    // Convenience flags
    isDawn:      h >= 5.5 && h < 7.5,
    isGolden:    h >= 16.5 && h < 18.5,
    isDusk:      h >= 18.5 && h < 20.5,
    isNight:     h < 5.5 || h >= 20.5,
    isMidday:    h >= 10 && h < 15,
  }
}

// ── 6. TEXT COLORS FROM PHYSICS STATE ────────────────────────────────────────

/**
 * Derive all text/UI colors from the physical sky state.
 *
 * The key insight: text must be legible against the *actual rendered sky*.
 * We model three axes:
 *   1. LUMINANCE → determines dark-text vs light-text (contrast requirement)
 *   2. WARMTH → tints text colors to match ambient chromatic state
 *   3. SATURATION → desaturation for rain/fog (muted palette)
 *
 * All colors use rgba() so they work on any background without fighting it.
 */
export function getWeatherTextColors(luminanceOrState, _isDark, condition) {
  // Accept either a raw number (legacy) or a full SkyState object
  let lum, warmth, tint, satScale, h, cond

  if (typeof luminanceOrState === 'object' && luminanceOrState !== null && 'luminance' in luminanceOrState) {
    // Full physics state — most accurate
    const s = luminanceOrState
    lum      = s.luminance
    warmth   = s.warmth
    tint     = s.tint
    satScale = s.saturationScale
    h        = s.h
    cond     = s.condition
  } else {
    // Legacy scalar path — reconstruct from rough brightness
    const rawBrightness = typeof luminanceOrState === 'number' ? luminanceOrState : 0.5
    const now = new Date()
    h = now.getHours() + now.getMinutes() / 60
    cond = condition ?? 'cloudy'
    // We can't recover cd from scalar, estimate from condition
    const CD_EST = { sunny: 0.15, hot: 0.08, windy: 0.25, cold: 0.55, cloudy: 0.88, rainy: 0.98, snowy: 0.85 }
    const state  = computeSkyState(h, cond, CD_EST[cond] ?? 0.5)
    // Use physics luminance but blend with provided scalar for backwards compat
    lum      = state.luminance * 0.6 + rawBrightness * 0.4
    warmth   = state.warmth
    tint     = state.tint
    satScale = state.saturationScale
  }

  const accent = {
    sunny:'#FF9F1C', hot:'#FF5820', rainy:'#6898d0', cold:'#78c8ff',
    snowy:'#c8e8ff', windy:'#FFF060', cloudy:'#a8b8d0',
  }[cond] ?? '#FF9F1C'

  // ── Color mixing helpers ──
  // Mix a color toward white or black based on warmth
  // Positive warmth → shift toward amber. Negative → shift toward blue.
  const applyTint = (base, strength = 0.28) => {
    // base is an rgba string — we'll inline-compose new ones based on tint
    return { tintR: tint.r, tintG: tint.g, tintB: tint.b, strength }
  }

  // ── Build warm/cool accent colors ──
  // These are used for pill backgrounds, borders, and text shadows.
  // They shift chromatically with warmth so they always feel "in scene".
  let ambientR, ambientG, ambientB

  if (warmth > 0.6) {
    // Warm: amber/gold — golden hour, dawn
    ambientR = Math.round(255 * tint.r)
    ambientG = Math.round(Math.min(255, 180 * tint.g))
    ambientB = Math.round(Math.min(255, 80 * tint.b))
  } else if (warmth > 0) {
    // Slightly warm: soft yellow-white
    ambientR = Math.round(240 * tint.r)
    ambientG = Math.round(235 * tint.g)
    ambientB = Math.round(200 * tint.b)
  } else if (warmth > -0.5) {
    // Neutral to slightly cool: white-blue
    ambientR = Math.round(210 * tint.r)
    ambientG = Math.round(218 * tint.g)
    ambientB = Math.round(238 * tint.b)
  } else {
    // Cool/night: moonlight blue
    ambientR = Math.round(170 * tint.r)
    ambientG = Math.round(192 * tint.g)
    ambientB = Math.round(238 * tint.b)
  }

  // Saturation blend: rainy/foggy desaturate toward grey
  const grey = (ambientR + ambientG + ambientB) / 3
  const aR = Math.round(grey + (ambientR - grey) * satScale)
  const aG = Math.round(grey + (ambientG - grey) * satScale)
  const aB = Math.round(grey + (ambientB - grey) * satScale)

  // ── Shadow physics ──
  // On bright sky: shadow darkens slightly (strong sunlight casts crisp shadows)
  // On dark sky: shadow is a luminous halo (like night photography bokeh)
  let shadowStr
  if (lum > 0.6) {
    // Bright midday — dark text needs subtle shadow
    shadowStr = `0 1px 3px rgba(255,255,255,0.95),0 2px 12px rgba(0,0,0,0.12)`
  } else if (lum > 0.38) {
    // Medium — adaptive tinted shadow
    if (warmth > 0.5) {
      shadowStr = `0 1px 0 rgba(${aR},${aG},${aB},0.55),0 2px 16px rgba(0,6,28,0.30)`
    } else {
      shadowStr = `0 1px 0 rgba(0,0,0,0.55),0 2px 18px rgba(0,10,48,0.42)`
    }
  } else {
    // Dark sky — luminous halo effect
    const haloAlpha = lum < 0.15 ? 0.65 : 0.42
    shadowStr = `0 1px 0 rgba(0,0,0,0.72),0 2px 24px rgba(${aR * 0.3},${aG * 0.3},${aB * 0.3},${haloAlpha}),0 0 40px rgba(${aR * 0.2},${aG * 0.2},${aB * 0.2},0.32)`
  }

  // ── Zone A: BRIGHT SKY (luminance > 0.58) ─────────────────────────────────
  // Midday clear / hot — sky is bright, must use dark text for contrast.
  // WCAG AA requires contrast ratio ≥ 4.5:1 for normal text.
  if (lum > 0.58) {
    // On very bright sky: pure dark text.
    // But on golden-hour bright sky: warm-dark text with amber tint.
    const nameColor = warmth > 0.7
      ? `rgba(${Math.round(28 * tint.r)},${Math.round(16 * tint.g)},${Math.round(4 * tint.b)},0.95)`  // deep amber-dark
      : '#0d1322'
    const subColor  = warmth > 0.7
      ? `rgba(${Math.round(40 * tint.r)},${Math.round(24 * tint.g)},${Math.round(8 * tint.b)},0.78)`
      : 'rgba(8,12,32,0.76)'
    const pillBg    = warmth > 0.5
      ? `rgba(${Math.round(255 * tint.r)},${Math.round(240 * tint.g)},${Math.round(200 * tint.b)},0.52)`
      : 'rgba(255,255,255,0.52)'
    const pillBorder= warmth > 0.5
      ? `rgba(${aR},${aG},${aB},0.72)`
      : 'rgba(255,255,255,0.72)'

    return {
      name:        nameColor,
      sub:         subColor,
      pill:        pillBg,
      pillBorder,
      pillText:    warmth > 0.5 ? `rgba(${Math.round(30*tint.r)},${Math.round(18*tint.g)},0,0.90)` : 'rgba(8,12,32,0.88)',
      pillInset:   'rgba(255,255,255,0.65)',
      badge:       warmth > 0.5 ? `rgba(${aR},${aG},${aB},0.38)` : 'rgba(255,255,255,0.38)',
      badgeBorder: warmth > 0.5 ? `rgba(${aR},${aG},${aB},0.65)` : 'rgba(255,255,255,0.60)',
      badgeText:   warmth > 0.5 ? `rgba(${Math.round(30*tint.r)},${Math.round(18*tint.g)},0,0.92)` : 'rgba(8,12,32,0.92)',
      shadow:      shadowStr,
      overlay:     warmth > 0.5 ? `rgba(${Math.round(8*tint.r)},${Math.round(4*tint.g)},0,0.08)` : 'rgba(0,0,0,0.08)',
      accent,
    }
  }

  // ── Zone B: MEDIUM SKY (luminance 0.28–0.58) ─────────────────────────────
  // Cloudy day, thick overcast, afternoon transition.
  // Text can go either way — use adaptive contrast + chromatic tint.
  if (lum > 0.28) {
    // Determine if we lean dark-text or light-text
    const useDark = lum > 0.44

    // Warm tones (golden hour medium): dark amber text
    // Cool/neutral (cloudy noon): light or dark text on grey sky
    // Rainy (desaturated): high-contrast forced

    let nameCol, subCol, pillCol, pillBorderCol, pillTextCol

    if (cond === 'rainy') {
      // Rain: steel-blue desaturated — always light text for drama
      nameCol       = '#eef4ff'
      subCol        = 'rgba(200,218,245,0.80)'
      pillCol       = 'rgba(20,32,52,0.55)'
      pillBorderCol = 'rgba(120,160,220,0.38)'
      pillTextCol   = 'rgba(200,225,255,0.92)'
    } else if (warmth > 0.65) {
      // Golden hour / sunset medium sky — warm amber text
      nameCol       = `rgba(${Math.round(255*tint.r)},${Math.round(210*tint.g)},${Math.round(100*tint.b)},0.96)`
      subCol        = `rgba(${aR},${aG},${aB},0.82)`
      pillCol       = `rgba(${Math.round(255*tint.r*0.25)},${Math.round(200*tint.g*0.18)},${Math.round(60*tint.b*0.12)},0.50)`
      pillBorderCol = `rgba(${aR},${aG},${aB},0.55)`
      pillTextCol   = `rgba(${Math.round(255*tint.r)},${Math.round(210*tint.g)},${Math.round(100*tint.b)},0.92)`
    } else if (warmth < -0.4) {
      // Dusk/pre-night: cool purple-blue light text
      nameCol       = `rgba(${aR + 40},${aG + 30},${Math.min(255, aB + 40)},0.95)`
      subCol        = `rgba(${aR},${aG},${aB},0.78)`
      pillCol       = 'rgba(8,12,32,0.48)'
      pillBorderCol = `rgba(${aR},${aG},${aB},0.38)`
      pillTextCol   = `rgba(${aR + 40},${aG + 30},${Math.min(255, aB + 40)},0.92)`
    } else {
      // Default medium: adaptive dark/light
      nameCol       = useDark ? '#0e1428' : '#f8f4ff'
      subCol        = useDark ? 'rgba(10,16,42,0.78)' : 'rgba(215,225,252,0.78)'
      pillCol       = useDark ? 'rgba(255,255,255,0.44)' : 'rgba(0,0,0,0.32)'
      pillBorderCol = useDark ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.22)'
      pillTextCol   = useDark ? 'rgba(8,14,38,0.90)' : 'rgba(215,228,255,0.94)'
    }

    return {
      name:        nameCol,
      sub:         subCol,
      pill:        pillCol,
      pillBorder:  pillBorderCol,
      pillText:    pillTextCol,
      pillInset:   useDark ? 'rgba(255,255,255,0.50)' : 'rgba(255,255,255,0.08)',
      badge:       useDark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.32)',
      badgeBorder: useDark ? 'rgba(255,255,255,0.52)' : `rgba(${aR},${aG},${aB},0.28)`,
      badgeText:   useDark ? 'rgba(8,14,38,0.92)' : '#f8f4ff',
      shadow:      shadowStr,
      overlay:     useDark ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.32)',
      accent,
    }
  }

  // ── Zone C: DARK SKY (luminance < 0.28) ──────────────────────────────────
  // Night, heavy storm, deep overcast — always light text.
  // Text tinted by ambient chromatic state for in-scene feel.
  // e.g. night: cool blue-white; stormy-night: grey-blue.

  // Base light text tinted with ambient chroma
  const textLightBase = Math.min(255, Math.round(220 + lum * 35 * tint.r))
  const nameR = Math.round(textLightBase * tint.r)
  const nameG = Math.round(textLightBase * tint.g)
  const nameB = Math.round(textLightBase * tint.b)

  // Sub text slightly dimmer, more tinted
  const subR  = Math.round((textLightBase - 25) * tint.r)
  const subG  = Math.round((textLightBase - 25) * tint.g)
  const subB  = Math.round((textLightBase - 25) * tint.b)

  // Rain night: steely desaturated blue-white
  if (cond === 'rainy') {
    return {
      name:        'rgba(210,228,255,0.96)',
      sub:         'rgba(180,205,240,0.78)',
      pill:        'rgba(12,22,40,0.58)',
      pillBorder:  'rgba(100,145,210,0.32)',
      pillText:    'rgba(190,218,255,0.94)',
      pillInset:   'rgba(255,255,255,0.06)',
      badge:       'rgba(10,18,36,0.55)',
      badgeBorder: 'rgba(100,140,210,0.30)',
      badgeText:   'rgba(200,222,255,0.95)',
      shadow:      shadowStr,
      overlay:     'rgba(0,0,0,0.52)',
      accent,
    }
  }

  return {
    name:        `rgba(${nameR},${nameG},${nameB},0.96)`,
    sub:         `rgba(${subR},${subG},${subB},0.76)`,
    pill:        `rgba(0,0,0,0.32)`,
    pillBorder:  `rgba(${aR},${aG},${aB},0.22)`,
    pillText:    `rgba(${nameR},${nameG},${nameB},0.92)`,
    pillInset:   `rgba(${aR},${aG},${aB},0.08)`,
    badge:       `rgba(0,0,0,0.36)`,
    badgeBorder: `rgba(${aR},${aG},${aB},0.22)`,
    badgeText:   `rgba(${nameR},${nameG},${nameB},0.95)`,
    shadow:      shadowStr,
    overlay:     'rgba(0,0,0,0.48)',
    accent,
  }
}

// ── 7. STATIC BOOTSTRAP (for first render before canvas reports) ──────────────

/**
 * Get a physically accurate sky state without knowing exact hour.
 * Used by WelcomeCard as initialBrightness before the canvas fires onBrightness.
 * Much more accurate than the old hardcoded STATIC_BRIGHTNESS table.
 */
export function getBootstrapSkyState(condition, isDark) {
  const now = new Date()
  const h   = now.getHours() + now.getMinutes() / 60
  // Estimate cd from condition (typical cloud density for that weather type)
  const CD_TYPICAL = {
    sunny: 0.15, hot: 0.08, windy: 0.28, cold: 0.58,
    cloudy: 0.90, rainy: 0.98, snowy: 0.88,
  }
  return computeSkyState(h, condition, CD_TYPICAL[condition] ?? 0.6)
}