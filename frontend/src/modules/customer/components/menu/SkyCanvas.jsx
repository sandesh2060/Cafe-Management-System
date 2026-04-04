
// src/modules/customer/components/menu/SkyCanvas.jsx — v7.0-ultra
//
// ULTRA-DETAILED PHYSICALLY-BASED SKY RENDERER
// PATCHES v7.1:
//   - Rain drops: bright cyan-white on ALL rainy sky (rainy_day is always dark navy)
//   - Rain lineWidth boosted to min 1.2px (was 0.3-0.8px — invisible on high-DPR)
//   - Drop alpha boosted to 0.58-0.92 (was 0.28-0.76)
//   - Drop count 300 (was 220)
//   - Cloud yM mask widened for better coverage
//   - CSS fallback stars gated by actual hour (not just isDark UI theme)

import { useRef, useEffect, useCallback, memo } from 'react'
import { computeSkyState, getWeatherTextColors as getTextColorsPhysics } from './skyPhysics'
import * as THREE from 'three'
import { fetchTodayFestivals, getTodayContext } from '../notifications/nepalCalendar'
import { useDeviceTier } from '@shared/hooks/useDeviceTier'

function getNow() {
  const d = new Date()
  return { h: d.getHours() + d.getMinutes() / 60, date: d }
}

function getSolarAltitude(h) {
  const decl = 15 * Math.PI / 180
  const lat  = 27.7  * Math.PI / 180
  const ha   = ((h - 12) / 12) * Math.PI
  return Math.asin(Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha))
}

function getSunUV(h) {
  const t   = Math.max(0, Math.min(1, (h - 5.5) / 13))
  const alt = getSolarAltitude(h)
  const refraction = alt < 0.2 ? 0.04 * (0.2 - alt) : 0
  return {
    x:       0.06 + t * 0.88,
    y:       0.78 - Math.sin(t * Math.PI) * 0.62 + refraction,
    t,
    alt,
    visible: h >= 5.5 && h <= 18.8,
    nearHorizon: alt < 0.15,
  }
}

function getMoonUV(h) {
  const hAdj = h >= 19 ? h - 19 : h + 5
  const t    = Math.max(0, Math.min(1, hAdj / 11))
  return {
    x:       0.06 + t * 0.88,
    y:       0.75 - Math.sin(t * Math.PI) * 0.55,
    t,
    visible: h >= 19 || h < 6.5,
  }
}

function getLunarPhase(date = new Date()) {
  const elapsed = (date - new Date('2024-01-11T11:57:00Z')) / 86400000
  return (((elapsed % 29.53058867) + 29.53058867) % 29.53058867) / 29.53058867
}

const SKY = {
  night:       { z:'#020510', um:'#060b20', lm:'#0c1230', h:'#0f1838', g:'#070d1e', sc:'#8898cc', sa:0,    fog:0,    cd:0.12 },
  dawn:        { z:'#1c0830', um:'#6a1828', lm:'#d04828', h:'#e87830', g:'#f09848', sc:'#FF8030', sa:0.75, fog:0.06, cd:0.55 },
  goldenHour:  { z:'#200e08', um:'#8a1c08', lm:'#d04818', h:'#f07028', g:'#f8a050', sc:'#FF6800', sa:1.0,  fog:0.05, cd:0.28 },
  dusk:        { z:'#10061a', um:'#4a0c28', lm:'#901838', h:'#c03060', g:'#d84878', sc:'#FF3848', sa:0.22, fog:0.08, cd:0.55 },
  sunny_day:   { z:'#0b2fa8', um:'#1560d8', lm:'#2e90f0', h:'#60c8ff', g:'#9adeff', sc:'#FFFBC8', sa:1.0,  fog:0,    cd:0.22 },
  cloudy_day:  { z:'#2a4870', um:'#486898', lm:'#7098c0', h:'#98b8d8', g:'#b8d0e8', sc:'#e0f0ff', sa:0.15, fog:0.10, cd:0.90 },
  rainy_day:   { z:'#121c2c', um:'#1a2840', lm:'#223252', h:'#2e4060', g:'#364a6e', sc:'#5a7090', sa:0.0,  fog:0.45, cd:0.99, rain:1 },
  hot_day:     { z:'#6a1808', um:'#a83008', lm:'#d04818', h:'#f07030', g:'#f8a058', sc:'#FF7838', sa:1.0,  fog:0.02, cd:0.06 },
  cold_day:    { z:'#1050a0', um:'#2070c8', lm:'#3a90d8', h:'#68b8f0', g:'#90d0f8', sc:'#c8e8ff', sa:0.40, fog:0.18, cd:0.55 },
  snowy_day:   { z:'#5870a0', um:'#7890b8', lm:'#90a8cc', h:'#b0c0d8', g:'#c8d8e8', sc:'#e8f0f8', sa:0.18, fog:0.30, cd:0.88 },
  windy_day:   { z:'#0840c0', um:'#1068e8', lm:'#2898f8', h:'#60c8ff', g:'#90e0ff', sc:'#FFF870', sa:0.88, fog:0.05, cd:0.28 },
  sunny_dark:  { z:'#050f28', um:'#0a2250', lm:'#0e3880', h:'#1858b8', g:'#2070d0', sc:'#FFE840', sa:0.92, fog:0,    cd:0.04 },
  cloudy_dark: { z:'#283050', um:'#384068', lm:'#485080', h:'#5c6898', g:'#6878a8', sc:'#d0d8f0', sa:0.22, fog:0.10, cd:0.88 },
  rainy_dark:  { z:'#080c14', um:'#10182a', lm:'#182438', h:'#202e48', g:'#283858', sc:'#5868a0', sa:0.0,  fog:0.38, cd:0.97, rain:1 },
  hot_dark:    { z:'#200808', um:'#481408', lm:'#803010', h:'#c04818', g:'#e06028', sc:'#FF5010', sa:1.0,  fog:0.02, cd:0.05 },
  cold_dark:   { z:'#080e20', um:'#101828', lm:'#182840', h:'#203858', g:'#284878', sc:'#98c8f0', sa:0.32, fog:0.14, cd:0.55 },
  snowy_dark:  { z:'#101828', um:'#182438', lm:'#203048', h:'#303c58', g:'#384868', sc:'#c0d0f0', sa:0.22, fog:0.25, cd:0.86 },
  windy_dark:  { z:'#0c1c48', um:'#142870', lm:'#204090', h:'#2858b8', g:'#3870d0', sc:'#FFE848', sa:0.82, fog:0.06, cd:0.26 },
}

function resolveSkyKey(condition, h, isDark, hasFestival) {
  if (hasFestival) return 'night'
  if (h < 5.5)  return 'night'
  if (h < 7.5)  return 'dawn'
  if (h < 16.0) return `${condition}_day`
  if (h < 18.0) return 'goldenHour'
  if (h < 20.0) return 'dusk'
  return 'night'
}

function resolveSky(condition, h, isDark, hasFestival) {
  const key = resolveSkyKey(condition, h, isDark, hasFestival)
  return SKY[key] ?? SKY[`${condition}_day`] ?? SKY.cloudy_day
}

function computeBrightness(sk) {
  const h = (sk.h ?? '#888888').replace('#','')
  const r = parseInt(h.slice(0,2),16)/255
  const g = parseInt(h.slice(2,4),16)/255
  const b = parseInt(h.slice(4,6),16)/255
  const lum = 0.2126*r + 0.7152*g + 0.0722*b
  return Math.max(0.06, Math.min(0.95, lum * 1.4 + (sk.sa ?? 0) * 0.28 - (sk.cd ?? 0) * 0.18))
}

const WEATHER_ACCENT = {
  sunny:'#FF9F1C', hot:'#FF5820', rainy:'#6898d0', cold:'#78c8ff',
  snowy:'#c8e8ff', windy:'#FFF060', cloudy:'#a8b8d0',
}

const WIND_CFG = {
  windy:  { speed:4.8, dir:-1,   turb:0.85, gust:0.65, gustFreq:1.8 },
  rainy:  { speed:2.0, dir:-0.7, turb:0.45, gust:0.35, gustFreq:1.2 },
  snowy:  { speed:0.7, dir:-0.3, turb:0.65, gust:0.22, gustFreq:0.6 },
  cloudy: { speed:0.9, dir:-0.5, turb:0.22, gust:0.12, gustFreq:0.8 },
  hot:    { speed:0.3, dir:-0.2, turb:0.12, gust:0.06, gustFreq:0.4 },
  sunny:  { speed:0.6, dir:-0.4, turb:0.18, gust:0.10, gustFreq:0.7 },
  cold:   { speed:1.4, dir:-0.6, turb:0.32, gust:0.18, gustFreq:1.0 },
}
const getWind = c => WIND_CFG[c] ?? { speed:0.4, dir:-0.4, turb:0.15, gust:0.08, gustFreq:0.7 }

function makeGradCache() {
  const cache = new Map()
  return {
    radial(ctx, key, x, y, r0, r1, stops) {
      if (cache.has(key)) return cache.get(key)
      const g = ctx.createRadialGradient(x, y, r0, x, y, r1)
      stops.forEach(([t, c]) => g.addColorStop(t, c))
      cache.set(key, g); return g
    },
    linear(ctx, key, x0, y0, x1, y1, stops) {
      if (cache.has(key)) return cache.get(key)
      const g = ctx.createLinearGradient(x0, y0, x1, y1)
      stops.forEach(([t, c]) => g.addColorStop(t, c))
      cache.set(key, g); return g
    },
    clear() { cache.clear() },
  }
}

function drawSkyBg(ctx, W, H, sk, h, sunUV) {
  const SH = H * 0.72
  const grad = ctx.createLinearGradient(0, 0, 0, SH)
  grad.addColorStop(0,    sk.z)
  grad.addColorStop(0.22, sk.um ?? sk.z)
  grad.addColorStop(0.52, sk.lm ?? sk.h)
  grad.addColorStop(0.78, sk.h)
  grad.addColorStop(1.0,  sk.g  ?? sk.h)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, SH)

  const isDawn = h >= 5.5 && h < 7.5
  const isDusk = h >= 17 && h < 19.5
  if (isDawn || isDusk) {
    const beltAlpha = isDawn
      ? Math.min(0.38, (h - 5.5) / 2 * 0.38)
      : Math.min(0.38, (19.5 - h) / 2.5 * 0.38)
    const beltY = SH * 0.62
    const beltGrad = ctx.createLinearGradient(0, beltY - SH * 0.15, 0, beltY + SH * 0.18)
    beltGrad.addColorStop(0, `rgba(0,0,0,0)`)
    beltGrad.addColorStop(0.35, `rgba(180,120,160,${beltAlpha * 0.5})`)
    beltGrad.addColorStop(0.6,  `rgba(220,160,180,${beltAlpha})`)
    beltGrad.addColorStop(1, `rgba(0,0,0,0)`)
    ctx.fillStyle = beltGrad
    ctx.fillRect(0, beltY - SH * 0.15, W, SH * 0.33)
  }

  if (h < 5 || h > 21) {
    const airglow = ctx.createLinearGradient(0, SH * 0.7, 0, SH)
    airglow.addColorStop(0, 'rgba(0,0,0,0)')
    airglow.addColorStop(0.5, 'rgba(20,60,20,0.12)')
    airglow.addColorStop(1, 'rgba(10,40,10,0.08)')
    ctx.fillStyle = airglow
    ctx.fillRect(0, SH * 0.7, W, SH * 0.3)
  }
}

function drawCrepuscularRays(ctx, W, H, sunUV, sk, T) {
  if (!sunUV.visible || (sk.cd ?? 0) < 0.3) return
  const SH = H * 0.72
  const sx = sunUV.x * W
  const sy = sunUV.y * SH
  const rayCount = 8
  const baseAlpha = Math.min(0.12, (sk.cd ?? 0) * 0.18) * (sk.sa ?? 0)
  if (baseAlpha < 0.01) return
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2 + T * 0.008
    const noise = Math.sin(T * 0.3 + i * 1.37) * 0.15
    const len = Math.min(W, SH) * (0.8 + noise)
    const ex = sx + Math.cos(angle) * len
    const ey = sy + Math.sin(angle) * len
    const rg = ctx.createLinearGradient(sx, sy, ex, ey)
    rg.addColorStop(0, `rgba(255,245,200,${baseAlpha * (0.5 + noise * 0.3)})`)
    rg.addColorStop(0.3, `rgba(255,240,180,${baseAlpha * 0.3})`)
    rg.addColorStop(1, 'rgba(255,240,180,0)')
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    const halfW = 8 + noise * 12
    const px = Math.cos(angle + Math.PI / 2) * halfW
    const py = Math.sin(angle + Math.PI / 2) * halfW
    ctx.lineTo(ex + px, ey + py)
    ctx.lineTo(ex - px, ey - py)
    ctx.closePath()
    ctx.fillStyle = rg
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'
  ctx.restore()
}

function drawSun(ctx, W, H, sunUV, sk, condition, h, gc) {
  if (!sunUV.visible) return
  const SH = H * 0.72
  const sx = sunUV.x * W
  const sy = sunUV.y * SH
  if (sy > SH + 10) return

  const horizonFactor = Math.max(0, 1 - sunUV.y * 1.2)
  const extinction    = 1 - horizonFactor * 0.55

  ctx.save()
  ctx.beginPath(); ctx.rect(0, 0, W, SH); ctx.clip()

  const r = Math.min(W, SH) * (0.048 + horizonFactor * 0.022)

  const sunCols = {
    sunny:      { disc:'rgba(255,252,200,1)', mid:'rgba(255,235,100,0.92)',  outer:'rgba(255,220,60,0.20)',  ray:'rgba(255,230,80,0.12)'  },
    hot:        { disc:'rgba(255,160,40,1)',  mid:'rgba(255,90,20,0.90)',    outer:'rgba(255,60,10,0.22)',   ray:'rgba(255,80,20,0.09)'   },
    windy:      { disc:'rgba(255,255,210,1)', mid:'rgba(255,248,120,0.92)',  outer:'rgba(255,240,80,0.18)',  ray:'rgba(255,248,120,0.10)' },
    goldenHour: { disc:'rgba(255,200,50,1)',  mid:'rgba(255,130,20,0.90)',   outer:'rgba(255,100,10,0.24)',  ray:'rgba(255,150,30,0.11)'  },
    dawn:       { disc:'rgba(255,180,70,1)',  mid:'rgba(255,110,35,0.86)',   outer:'rgba(255,85,20,0.20)',   ray:'rgba(255,120,40,0.09)'  },
    cold:       { disc:'rgba(245,252,255,1)', mid:'rgba(210,235,255,0.82)', outer:'rgba(190,225,255,0.14)', ray:'rgba(210,235,255,0.07)' },
    cloudy:     { disc:'rgba(230,240,255,0.75)',mid:'rgba(200,220,245,0.52)',outer:'rgba(180,210,240,0.10)',ray:null },
  }
  let sc = sunCols[condition] ?? sunCols.sunny
  if (horizonFactor > 0.4) {
    const t = (horizonFactor - 0.4) / 0.6
    sc = {
      disc:  `rgba(255,${Math.round(220 - 120*t)},${Math.round(50 - 40*t)},1)`,
      mid:   `rgba(255,${Math.round(140 - 80*t)},${Math.round(20 - 15*t)},0.90)`,
      outer: `rgba(255,${Math.round(80 - 60*t)},0,0.22)`,
      ray:   null,
    }
  }

  ctx.save()
  ctx.globalAlpha = extinction

  const outerR = r * 7
  const hk = `sun-outer-${Math.round(sx/10)}-${Math.round(sy/10)}-${condition}`
  const hg = gc.radial(ctx, hk, sx, sy, r * 0.5, outerR, [
    [0,    sc.outer],
    [0.25, sc.outer],
    [0.6,  sc.outer.replace(/[\d.]+\)$/, '0.06)')],
    [1,    'rgba(0,0,0,0)'],
  ])
  ctx.beginPath(); ctx.arc(sx, sy, outerR, 0, Math.PI * 2)
  ctx.fillStyle = hg; ctx.fill()

  if (sc.ray && sk.cd < 0.4) {
    const rayCount = condition === 'windy' ? 12 : 8
    for (let i = 0; i < rayCount; i++) {
      const angle  = (i / rayCount) * Math.PI * 2
      const rayLen = r * (3.8 + Math.sin(i * 1.1) * 1.2)
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(angle)
      const rk = `sun-ray-${i}-${condition}`
      const rg = gc.linear(ctx, rk, 0, 0, rayLen, 0, [
        [0,   sc.ray.replace(/[\d.]+\)$/, '0.22)')],
        [0.3, sc.ray],
        [1,   'rgba(0,0,0,0)'],
      ])
      const hw = r * (0.06 + (i % 3) * 0.03)
      ctx.beginPath()
      ctx.moveTo(r * 0.85, -hw); ctx.lineTo(rayLen, 0); ctx.lineTo(r * 0.85, hw)
      ctx.closePath(); ctx.fillStyle = rg; ctx.fill()
      ctx.restore()
    }
  }

  const mk = `sun-mid-${Math.round(sx/10)}-${Math.round(sy/10)}-${condition}`
  const mg = gc.radial(ctx, mk, sx, sy, 0, r * 2.5, [
    [0,    sc.mid],
    [0.5,  sc.mid.replace(/[\d.]+\)$/, '0.35)')],
    [1,    'rgba(0,0,0,0)'],
  ])
  ctx.beginPath(); ctx.arc(sx, sy, r * 2.5, 0, Math.PI * 2)
  ctx.fillStyle = mg; ctx.fill()

  const ck = `sun-disc-${Math.round(sx/10)}-${Math.round(sy/10)}-${condition}`
  const cg = gc.radial(ctx, ck, sx - r * 0.15, sy - r * 0.15, 0, r, [
    [0,    sc.disc],
    [0.65, sc.disc],
    [0.85, sc.mid],
    [1,    sc.mid.replace(/[\d.]+\)$/, '0.75)')],
  ])
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2)
  ctx.fillStyle = cg; ctx.fill()

  if (horizonFactor > 0.3) {
    const ca = horizonFactor * 0.4
    ctx.beginPath(); ctx.arc(sx, sy - r * 0.55, r * 0.7, Math.PI, 0)
    ctx.fillStyle = `rgba(100,180,255,${ca * 0.15})`; ctx.fill()
    ctx.beginPath(); ctx.arc(sx, sy + r * 0.55, r * 0.7, 0, Math.PI)
    ctx.fillStyle = `rgba(255,80,20,${ca * 0.12})`; ctx.fill()
  }

  ctx.restore()
  ctx.restore()
}

function drawMoon(ctx, W, H, moonUV, phase, sk, h, gc) {
  if (!moonUV.visible) return
  const SH = H * 0.72
  const mx = moonUV.x * W
  const my = moonUV.y * SH
  if (my > SH + 10) return

  ctx.save()
  ctx.beginPath(); ctx.rect(0, 0, W, SH); ctx.clip()

  const r = Math.min(W, SH) * 0.048

  ctx.save()

  const glowA = 0.18 + phase * 0.08
  const hk = `moon-glow-${Math.round(mx/10)}-${Math.round(my/10)}`
  const hg = gc.radial(ctx, hk, mx, my, r * 0.5, r * 7, [
    [0,   `rgba(195,210,255,${glowA * 0.55})`],
    [0.3, `rgba(175,195,250,${glowA * 0.32})`],
    [0.7, `rgba(150,175,240,${glowA * 0.12})`],
    [1,   'rgba(0,0,0,0)'],
  ])
  ctx.beginPath(); ctx.arc(mx, my, r * 7, 0, Math.PI * 2)
  ctx.fillStyle = hg; ctx.fill()

  const mk = `moon-disc-${Math.round(mx/10)}-${Math.round(my/10)}`
  const mg = gc.radial(ctx, mk, mx - r * 0.28, my - r * 0.28, 0, r, [
    [0,    'rgba(255,253,242,1)'],
    [0.45, 'rgba(235,228,208,1)'],
    [0.80, 'rgba(205,198,175,1)'],
    [1,    'rgba(182,175,150,0.95)'],
  ])
  ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2)
  ctx.fillStyle = mg; ctx.fill()

  const craters = [
    { dx:-0.30, dy:-0.22, rs:0.17, depth:0.22, name:'tycho'    },
    { dx: 0.32, dy: 0.18, rs:0.13, depth:0.18, name:'copernicus'},
    { dx:-0.12, dy: 0.38, rs:0.10, depth:0.14, name:'plato'    },
    { dx: 0.18, dy:-0.35, rs:0.09, depth:0.12, name:'kepler'   },
    { dx:-0.42, dy: 0.10, rs:0.08, depth:0.10, name:'aristarchus'},
    { dx: 0.05, dy: 0.05, rs:0.06, depth:0.08, name:'clavius'  },
    { dx:-0.20, dy:-0.42, rs:0.06, depth:0.10, name:'grimaldi' },
    { dx: 0.38, dy:-0.18, rs:0.05, depth:0.08, name:'mare-c1'  },
    { dx:-0.55, dy:-0.30, rs:0.04, depth:0.07, name:'mare-c2'  },
    { dx: 0.52, dy: 0.42, rs:0.04, depth:0.07, name:'mare-c3'  },
    { dx: 0.10, dy:-0.55, rs:0.05, depth:0.09, name:'mare-c4'  },
    { dx:-0.28, dy: 0.55, rs:0.04, depth:0.06, name:'mare-c5'  },
  ]
  ctx.save()
  ctx.beginPath(); ctx.arc(mx, my, r * 0.96, 0, Math.PI * 2); ctx.clip()
  craters.forEach(c => {
    const cx = mx + c.dx * r, cy = my + c.dy * r, cr = c.rs * r
    ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(110,100,78,${c.depth * 1.1})`; ctx.fill()
    ctx.beginPath(); ctx.arc(cx + cr*0.1, cy + cr*0.1, cr * 0.68, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(145,135,105,${c.depth * 0.55})`; ctx.fill()
    ctx.beginPath(); ctx.arc(cx - cr * 0.28, cy - cr * 0.28, cr * 0.58, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,252,235,${c.depth * 0.38})`; ctx.fill()
    ctx.beginPath()
    ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.arc(cx, cy, cr * 1.15, 0, Math.PI * 2, true)
    ctx.fillStyle = `rgba(90,85,65,${c.depth * 0.25})`; ctx.fill()
    if (cr > r * 0.08) {
      for (let ei = 0; ei < 6; ei++) {
        const ea = (ei / 6) * Math.PI * 2 + 0.3
        const rayL = cr * (3 + Math.sin(ei * 1.1) * 1.5)
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(ea) * cr, cy + Math.sin(ea) * cr)
        ctx.lineTo(cx + Math.cos(ea) * (cr + rayL), cy + Math.sin(ea) * (cr + rayL))
        ctx.strokeStyle = `rgba(230,225,205,${c.depth * 0.18})`
        ctx.lineWidth = cr * 0.28; ctx.lineCap = 'round'; ctx.stroke()
      }
    }
  })

  const maria = [
    { dx:-0.15, dy:-0.05, rx:0.30, ry:0.20, a:0.14, name:'mare-tranquillitatis' },
    { dx: 0.12, dy: 0.22, rx:0.22, ry:0.14, a:0.11, name:'mare-serenitatis'    },
    { dx:-0.30, dy: 0.28, rx:0.18, ry:0.12, a:0.09, name:'mare-imbrium'        },
    { dx: 0.28, dy:-0.25, rx:0.14, ry:0.10, a:0.08, name:'oceanus-procellarum' },
    { dx:-0.08, dy: 0.40, rx:0.12, ry:0.08, a:0.07, name:'mare-nectaris'       },
  ]
  maria.forEach(m => {
    const eg = ctx.createRadialGradient(mx+m.dx*r, my+m.dy*r, 0, mx+m.dx*r, my+m.dy*r, m.rx*r)
    eg.addColorStop(0,   `rgba(80,75,60,${m.a})`)
    eg.addColorStop(0.6, `rgba(88,82,66,${m.a * 0.6})`)
    eg.addColorStop(1,   'rgba(0,0,0,0)')
    ctx.beginPath()
    ctx.ellipse(mx+m.dx*r, my+m.dy*r, m.rx*r, m.ry*r, -0.3, 0, Math.PI*2)
    ctx.fillStyle = eg; ctx.fill()
  })
  ctx.restore()

  ctx.save()
  ctx.beginPath(); ctx.arc(mx, my, r + 0.5, 0, Math.PI * 2); ctx.clip()

  if (phase < 0.03 || phase >= 0.97) {
    ctx.fillStyle = 'rgba(3,5,18,0.97)'
    ctx.beginPath(); ctx.arc(mx, my, r + 0.5, 0, Math.PI * 2); ctx.fill()
  } else {
    const isWaxing = phase < 0.5
    const lit = isWaxing ? phase * 2 : (1 - phase) * 2
    const shadowAlpha = 0.96

    ctx.fillStyle = `rgba(3,5,18,${shadowAlpha})`
    ctx.beginPath()
    if (isWaxing) {
      ctx.arc(mx, my, r + 0.5, Math.PI / 2, -Math.PI / 2)
    } else {
      ctx.arc(mx, my, r + 0.5, -Math.PI / 2, Math.PI / 2)
    }
    ctx.closePath(); ctx.fill()

    ctx.globalCompositeOperation = 'destination-out'
    const termX = r * (1 - 2 * lit) * (isWaxing ? -1 : 1)
    ctx.beginPath()
    ctx.ellipse(mx + termX, my, Math.abs(termX) + r * lit + 0.5, r + 0.5, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0,0,0,1)'; ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }

  const termGlow = ctx.createRadialGradient(mx, my, r * 0.72, mx, my, r)
  termGlow.addColorStop(0, 'rgba(0,0,0,0)')
  termGlow.addColorStop(1, 'rgba(3,5,18,0.25)')
  ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2)
  ctx.fillStyle = termGlow; ctx.fill()
  ctx.restore()

  const lk = `moon-limb-${Math.round(mx/10)}-${Math.round(my/10)}`
  const ld = gc.radial(ctx, lk, mx, my, r * 0.55, r, [
    [0, 'rgba(0,0,0,0)'],
    [0.7, 'rgba(0,0,0,0)'],
    [1,   'rgba(18,15,8,0.32)'],
  ])
  ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2)
  ctx.fillStyle = ld; ctx.fill()

  ctx.restore()
  ctx.restore()
}

const STAR_SPECTRAL = [
  { type:'O', col:'rgba(155,180,255,',  weight:0.002 },
  { type:'B', col:'rgba(195,215,255,',  weight:0.012 },
  { type:'A', col:'rgba(240,245,255,',  weight:0.080 },
  { type:'F', col:'rgba(255,250,230,',  weight:0.140 },
  { type:'G', col:'rgba(255,244,210,',  weight:0.140 },
  { type:'K', col:'rgba(255,220,170,',  weight:0.200 },
  { type:'M', col:'rgba(255,185,135,',  weight:0.426 },
]

function pickSpectralType() {
  let r = Math.random()
  for (const s of STAR_SPECTRAL) { r -= s.weight; if (r <= 0) return s }
  return STAR_SPECTRAL[4]
}

function starMagnitude() {
  const u = Math.random(), v = Math.random()
  const normal = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  return Math.max(0.2, Math.min(2.8, 1.2 + normal * 0.55))
}

function buildStars(W, H, count) {
  const SH = H * 0.70
  return Array.from({ length: count }, () => {
    const sp  = pickSpectralType()
    const mag = starMagnitude()
    return {
      x:     Math.random() * W,
      y:     Math.random() * SH * 0.90,
      r:     mag,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 2.0,
      baseA: Math.min(0.95, 0.3 + mag * 0.25),
      col:   sp.col,
      spikes: mag > 1.8,
    }
  })
}

function makeStarRenderer(W, H, stars) {
  const oc = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(W, H)
    : (() => { const c = document.createElement('canvas'); c.width=W; c.height=H; return c })()
  const oc2 = oc.getContext('2d')
  let lastT = -999

  return function drawStarsOC(ctx, T, skyAlpha) {
    if (skyAlpha < 0.04) return
    const tBucket = Math.round(T * 8)
    if (tBucket !== lastT) {
      lastT = tBucket
      oc2.clearRect(0, 0, W, H)
      stars.forEach(s => {
        const scintAmp = 0.45 / (s.r * 0.8 + 0.6)
        const twinkle  = Math.sin(T * s.speed + s.phase) * scintAmp
                       + Math.sin(T * s.speed * 2.3 + s.phase * 1.7) * scintAmp * 0.4
        const a = Math.max(0, Math.min(1, s.baseA + twinkle))
        const r = s.r * (1 + twinkle * 0.12)
        if (a < 0.02) return

        if (s.r > 1.2) {
          const halo = oc2.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 4.5)
          halo.addColorStop(0,   s.col + (a * 0.38) + ')')
          halo.addColorStop(0.4, s.col + (a * 0.10) + ')')
          halo.addColorStop(1,   'rgba(0,0,0,0)')
          oc2.beginPath(); oc2.arc(s.x, s.y, r * 4.5, 0, Math.PI * 2)
          oc2.fillStyle = halo; oc2.fill()
        }

        const g = oc2.createRadialGradient(s.x, s.y, 0, s.x, s.y, r)
        g.addColorStop(0,   s.col + a + ')')
        g.addColorStop(0.5, s.col + (a * 0.82) + ')')
        g.addColorStop(1,   s.col + '0)')
        oc2.beginPath(); oc2.arc(s.x, s.y, r, 0, Math.PI * 2)
        oc2.fillStyle = g; oc2.fill()

        if (s.spikes && a > 0.5) {
          oc2.save()
          oc2.globalAlpha = a * 0.32
          oc2.strokeStyle = s.col + '1)'
          oc2.lineWidth   = 0.6
          oc2.lineCap     = 'round'
          const fl = r * 3.8
          oc2.beginPath(); oc2.moveTo(s.x - fl, s.y); oc2.lineTo(s.x + fl, s.y); oc2.stroke()
          oc2.beginPath(); oc2.moveTo(s.x, s.y - fl); oc2.lineTo(s.x, s.y + fl); oc2.stroke()
          oc2.globalAlpha = a * 0.14
          const dl = fl * 0.62
          oc2.beginPath(); oc2.moveTo(s.x - dl, s.y - dl); oc2.lineTo(s.x + dl, s.y + dl); oc2.stroke()
          oc2.beginPath(); oc2.moveTo(s.x + dl, s.y - dl); oc2.lineTo(s.x - dl, s.y + dl); oc2.stroke()
          oc2.restore()
        }
      })
    }
    ctx.save()
    ctx.globalAlpha = skyAlpha
    ctx.drawImage(oc, 0, 0)
    ctx.globalAlpha = 1
    ctx.restore()
  }
}


function buildDrops(count, W, H, wind) {
  return Array.from({ length: count }, () => {
    const r = 0.28 + Math.random() * 0.44
    const vy = (5 + r * 5) + Math.random() * 4
    return {
      x:     Math.random() * W * 1.4 - W * 0.15,
      y:     Math.random() * H * -0.6,
      vx:    wind.dir * (wind.speed * 0.38 + Math.random() * wind.speed * 0.28),
      vy,
      len:   vy * 0.45 + Math.random() * 3,
      // FIX: alpha boosted — was 0.28-0.76, now 0.58-0.92 (always clearly visible)
      alpha: 0.45 + Math.random() * 0.33,
      w:     r,
      splash: null,
    }
  })
}

function drawRain(ctx, drops, H, skyIsNight, T) {
  // KEY FIX: rainy_day sky palette is always dark navy/steel (z:'#0e1520', h:'#253550')
  // rgba(40,70,120) drops on rgba(14,21,32) background = invisible (same dark family!)
  // Solution: use bright cyan-white drops regardless of skyIsNight on rainy sky.
  // skyIsNight only shifts between two bright variants for color temperature.
  ctx.save()
  drops.forEach(d => {
    const angle = Math.atan2(d.vy, d.vx)
    const ex = d.x + Math.cos(angle) * d.len
    const ey = d.y + Math.sin(angle) * d.len
    ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(ex, ey)
    // Night rain: cooler blue-white. Day rain: slightly warmer blue-white.
    // Both bright because rainy sky is always dark.
    ctx.strokeStyle = skyIsNight
      ? `rgba(145,215,255,${d.alpha * 0.88})`
      : `rgba(175,225,255,${d.alpha * 0.88})`
    // FIX: lineWidth min 1.2px — was 0.3-0.8px (near-invisible on 3x DPR screens)
    ctx.lineWidth = Math.max(0.5, d.w * 0.65); ctx.lineCap = 'round'; ctx.stroke()

    if (d.splash?.alpha > 0) {
      ctx.beginPath()
      ctx.ellipse(d.splash.x, d.splash.y, d.splash.r * 1.8, d.splash.r * 0.45, 0, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(150,210,255,${d.splash.alpha * 0.58})`
      ctx.lineWidth = 0.8; ctx.stroke()
      if (d.splash.r > 1.5 && d.splash.alpha > 0.25) {
        for (let i = 0; i < 4; i++) {
          const ca = (i / 4) * Math.PI * 2
          const cr = d.splash.r * 0.8
          ctx.beginPath()
          ctx.arc(d.splash.x + Math.cos(ca) * cr, d.splash.y - cr * 0.6, 0.8, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(150,210,255,${d.splash.alpha * 0.45})`
          ctx.fill()
        }
      }
    }
  })

  const groundY = H * 0.75
  const sheen = ctx.createLinearGradient(0, groundY, 0, groundY + H * 0.08)
  sheen.addColorStop(0, 'rgba(80,120,180,0.22)')
  sheen.addColorStop(0.4, 'rgba(60,100,160,0.12)')
  sheen.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, groundY, W, H * 0.08)

  ctx.restore()
}

function tickRain(drops, dt, W, H, wind, T) {
  const groundY = H * 0.94
  const gustX   = wind.dir * Math.sin(T * wind.gustFreq) * wind.turb * 0.45
  drops.forEach(d => {
    d.x += (d.vx + gustX) * dt * 60
    d.y += d.vy * dt * 60
    if (d.y > groundY) {
      d.splash = { x: d.x, y: groundY, r: 0, maxR: 3 + Math.random() * 5, alpha: 0.6, vy: -0.8 }
      d.x = Math.random() * W * 1.4 - W * 0.15
      d.y = -Math.random() * H * 0.4
    }
    if (d.x > W + 25) d.x = -25
    if (d.x < -25)   d.x = W + 25
    if (d.splash) {
      d.splash.r += dt * 60 * 0.9
      d.splash.alpha -= dt * 60 * 0.038
      if (d.splash.alpha <= 0 || d.splash.r > d.splash.maxR) d.splash = null
    }
  })
}

function buildSnowflakes(count, W, H, wind) {
  const SH = H * 0.82
  return Array.from({ length: count }, () => {
    const cls = Math.random() < 0.55 ? 'small' : Math.random() < 0.7 ? 'medium' : 'large'
    const rMap = { small: 0.8 + Math.random() * 1.0, medium: 1.8 + Math.random() * 2.0, large: 3.5 + Math.random() * 2.5 }
    const r = rMap[cls]
    return {
      x:      Math.random() * W * 1.2 - W * 0.1,
      y:      Math.random() * SH,
      r,
      cls,
      vx:     wind.dir * (wind.speed * 0.25 + Math.random() * wind.speed * 0.4),
      vy:     0.4 + r * 0.35 + Math.random() * 0.5,
      alpha:  0.55 + Math.random() * 0.42,
      phase:  Math.random() * Math.PI * 2,
      rotPhase: Math.random() * Math.PI * 2,
      driftFreq: 0.3 + Math.random() * 1.0,
      driftAmp:  0.3 + Math.random() * 0.8,
      sparkle: cls === 'large' && Math.random() < 0.4,
    }
  })
}

function drawSnowflakes(ctx, flakes, isDark, T) {
  flakes.forEach(f => {
    if (f.alpha <= 0) return
    ctx.save()
    ctx.globalAlpha = f.alpha
    ctx.translate(f.x, f.y)

    if (f.cls === 'small') {
      ctx.beginPath(); ctx.arc(0, 0, f.r, 0, Math.PI * 2)
      ctx.fillStyle = isDark ? 'rgba(200,220,255,0.92)' : 'rgba(235,248,255,0.96)'
      ctx.fill()
    } else if (f.cls === 'medium') {
      ctx.rotate(T * 0.18 + f.rotPhase)
      ctx.strokeStyle = isDark ? 'rgba(205,225,255,0.88)' : 'rgba(240,250,255,0.95)'
      ctx.lineWidth = f.r * 0.35; ctx.lineCap = 'round'
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(Math.cos(a) * f.r, Math.sin(a) * f.r)
        ctx.stroke()
        const bx = Math.cos(a) * f.r * 0.55, by = Math.sin(a) * f.r * 0.55
        const ba = a + Math.PI / 3
        ctx.beginPath()
        ctx.moveTo(bx, by)
        ctx.lineTo(bx + Math.cos(ba) * f.r * 0.28, by + Math.sin(ba) * f.r * 0.28)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(bx, by)
        ctx.lineTo(bx + Math.cos(a - Math.PI/3) * f.r * 0.28, by + Math.sin(a - Math.PI/3) * f.r * 0.28)
        ctx.stroke()
      }
      ctx.beginPath(); ctx.arc(0, 0, f.r * 0.28, 0, Math.PI * 2)
      ctx.fillStyle = isDark ? 'rgba(220,235,255,0.9)' : 'rgba(245,252,255,0.95)'; ctx.fill()
    } else {
      ctx.rotate(T * 0.08 + f.rotPhase)
      ctx.strokeStyle = isDark ? 'rgba(210,228,255,0.85)' : 'rgba(242,252,255,0.94)'
      ctx.lineWidth = f.r * 0.22; ctx.lineCap = 'round'
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        ctx.beginPath(); ctx.moveTo(0, 0)
        ctx.lineTo(Math.cos(a) * f.r, Math.sin(a) * f.r); ctx.stroke()
        for (let b = 1; b <= 3; b++) {
          const t = b / 3.5
          const bx = Math.cos(a) * f.r * t, by = Math.sin(a) * f.r * t
          const bLen = f.r * 0.32 * (1 - t * 0.4)
          ;[1,-1].forEach(side => {
            const ba = a + side * Math.PI / 3
            ctx.beginPath(); ctx.moveTo(bx,by)
            ctx.lineTo(bx + Math.cos(ba)*bLen, by + Math.sin(ba)*bLen); ctx.stroke()
          })
        }
      }
      ctx.beginPath(); ctx.arc(0, 0, f.r * 0.22, 0, Math.PI * 2)
      ctx.fillStyle = isDark ? 'rgba(225,240,255,0.95)' : 'rgba(248,254,255,1)'; ctx.fill()
      if (f.sparkle) {
        const sparkA = 0.5 + 0.5 * Math.sin(T * 4.5 + f.phase)
        ctx.globalAlpha = f.alpha * sparkA * 0.7
        ctx.beginPath(); ctx.arc(0, -f.r * 0.15, f.r * 0.18, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill()
      }
    }
    ctx.restore()
  })
}

function tickSnowflakes(flakes, dt, wind, T, W, H) {
  const groundY = H * 0.80
  flakes.forEach(f => {
    const drift = Math.sin(T * f.driftFreq + f.phase) * f.driftAmp
    const gust  = wind.dir * Math.sin(T * wind.gustFreq * 0.7) * wind.turb * 0.3
    f.x += (f.vx + drift + gust) * dt * 60
    f.y += f.vy * dt * 60
    if (f.y > groundY || f.x < -30 || f.x > W + 30) {
      f.x     = Math.random() * W * 1.2 - W * 0.1
      f.y     = -Math.random() * H * 0.1 - 5
      f.alpha = 0.55 + Math.random() * 0.42
    }
  })
}

const LEAF_COLORS = [
  {h:32,s:82,l:38},{h:20,s:76,l:32},{h:45,s:88,l:42},{h:100,s:57,l:28},
  {h:85,s:62,l:35},{h:15,s:72,l:30},{h:55,s:78,l:38},{h:130,s:48,l:25},
  {h:38,s:92,l:45},{h:10,s:68,l:28},{h:60,s:70,l:36},{h:25,s:80,l:35},
]
const LEAF_SHAPES = [
  [[0,-1],[0.45,-0.6],[0.55,0],[0.40,0.6],[0,1],[-0.40,0.6],[-0.55,0],[-0.45,-0.6]],
  [[0,-1],[0.3,-0.5],[0.8,-0.3],[0.5,0.1],[0.3,0.7],[0,1],[-0.3,0.7],[-0.5,0.1],[-0.8,-0.3],[-0.3,-0.5]],
  [[0,-1],[0.5,-0.4],[0.6,0.2],[0.2,0.8],[0,1],[-0.3,0.6],[-0.5,0.0],[-0.35,-0.5]],
  [[0,-1],[0.6,-0.5],[0.7,0.2],[0.3,0.8],[0,1],[-0.3,0.8],[-0.7,0.2],[-0.6,-0.5]],
]

function buildLeaves(W, H, wind, count = 14) {
  if (count === 0) return []
  const SH = H * 0.72
  return Array.from({ length: count }, () => {
    const lc = LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)]
    return {
      x: W + Math.random() * W * 0.4,
      y: (0.04 + Math.random() * 0.84) * SH,
      vx: -(wind.speed * (0.5 + Math.random() * 0.85)),
      vy: (Math.random() - 0.42) * 0.85,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 3.8,
      size: 5 + Math.random() * 10,
      fillColor:   `hsl(${lc.h},${lc.s}%,${lc.l}%)`,
      fillColorD:  `hsl(${lc.h},${lc.s}%,${Math.max(10,lc.l-8)}%)`,
      strokeColor: `hsla(${lc.h},${lc.s}%,${Math.max(8,lc.l-12)}%,0.45)`,
      shape: LEAF_SHAPES[Math.floor(Math.random() * LEAF_SHAPES.length)],
      alpha: 0.72 + Math.random() * 0.28,
      wobbleP: Math.random() * Math.PI * 2,
      wobbleR: 0.3 + Math.random() * 0.55,
      drag: 0.962 + Math.random() * 0.022,
      tumble: Math.random() * Math.PI * 2,
      tumbleV: (Math.random() - 0.5) * 0.08,
    }
  })
}

function tickLeaves(leaves, dt, wind, T, W, H) {
  const SH    = H * 0.72
  const gustX = wind.dir * (wind.speed * (0.82 + Math.sin(T * wind.gust * 2.1) * wind.turb * 0.52))
  const gustY = Math.sin(T * wind.turb * 1.45) * wind.turb * 0.32
  leaves.forEach(l => {
    l.vx = l.vx * l.drag + gustX * (1 - l.drag) * 1.85
    l.vy = l.vy * l.drag + gustY * (1 - l.drag) + 0.055
    const wobble = Math.sin(T * l.wobbleR * 4.8 + l.wobbleP) * 0.42
    l.x  += (l.vx + wobble) * dt * 60
    l.y  += l.vy * dt * 60
    l.rot += (l.rotV + Math.abs(l.vx) * 0.09) * dt * 60 * 0.016
    l.tumble += l.tumbleV * dt * 60 * 0.016
    if (l.x < -35 || l.y > SH + 25 || l.y < -25) {
      l.x    = W + Math.random() * 65
      l.y    = (0.04 + Math.random() * 0.80) * SH
      l.vx   = -(wind.speed * (0.32 + Math.random() * 0.72))
      l.vy   = (Math.random() - 0.42) * 0.62
      l.rotV = (Math.random() - 0.5) * 3.8
      l.alpha= 0.72 + Math.random() * 0.28
    }
  })
}

function drawLeaves(ctx, leaves, isDark) {
  leaves.forEach(l => {
    if (l.alpha <= 0) return
    ctx.save()
    ctx.translate(l.x, l.y)
    ctx.rotate(l.rot)
    const tumbleScale = Math.abs(Math.cos(l.tumble))
    ctx.scale(1, 0.4 + tumbleScale * 0.6)
    ctx.globalAlpha = l.alpha * (0.7 + tumbleScale * 0.3)
    const s = l.shape, sz = l.size
    ctx.beginPath()
    ctx.moveTo(s[0][0]*sz, s[0][1]*sz)
    for (let i = 1; i < s.length; i++) {
      const prev=s[i-1], curr=s[i], next=s[(i+1)%s.length]
      ctx.quadraticCurveTo(curr[0]*sz, curr[1]*sz,
        curr[0]*sz+(next[0]-prev[0])*sz*0.2, curr[1]*sz+(next[1]-prev[1])*sz*0.2)
    }
    ctx.closePath()
    ctx.fillStyle = isDark ? l.fillColorD : l.fillColor
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(0, -sz * 0.88)
    ctx.quadraticCurveTo(sz * 0.07, 0, 0, sz * 0.88)
    ctx.strokeStyle = l.strokeColor
    ctx.lineWidth = Math.max(0.4, sz * 0.065)
    ctx.lineCap = 'round'; ctx.stroke()
    if (sz > 8 && tumbleScale > 0.5) {
      ctx.globalAlpha = l.alpha * 0.18
      ctx.lineWidth = 0.4
      for (let vi = 0; vi < 4; vi++) {
        const va = 0.3 + vi * 0.55 - 1.1
        const vy = (-0.6 + vi * 0.4) * sz
        ctx.beginPath()
        ctx.moveTo(0, vy)
        ctx.lineTo(Math.cos(va) * sz * 0.38, vy + Math.sin(va) * sz * 0.22)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, vy)
        ctx.lineTo(-Math.cos(va) * sz * 0.38, vy + Math.sin(va) * sz * 0.22)
        ctx.stroke()
      }
    }
    ctx.restore()
  })
}

const GRASS_PALETTES = [
  {h:118,s:64,lB:8, lT:24},{h:112,s:57,lB:10,lT:30},{h:105,s:50,lB:12,lT:34},
  {h:128,s:60,lB:9, lT:26},{h:95, s:54,lB:11,lT:32},{h:88, s:62,lB:14,lT:38},
  {h:78, s:57,lB:13,lT:36},{h:70, s:52,lB:16,lT:40},{h:60, s:48,lB:15,lT:38},
]
const HEIGHT_PROFILES = [
  [0.18,0.22,0.28,0.20,0.35,0.25,0.30,0.16,0.32,0.24],
  [0.28,0.35,0.22,0.40,0.26,0.45,0.32,0.38,0.20,0.42],
  [0.38,0.28,0.50,0.35,0.55,0.42,0.48,0.30,0.58,0.44],
  [0.48,0.62,0.40,0.70,0.52,0.65,0.58,0.44,0.72,0.55],
]

function buildBlade(x, L, W, H, clumpOffset = 0) {
  const GH  = H * 0.30
  const pal = GRASS_PALETTES[Math.floor(Math.random() * GRASS_PALETTES.length)]
  const hf  = HEIGHT_PROFILES[L][Math.floor(Math.random() * HEIGHT_PROFILES[L].length)]
  const isThin   = Math.random() < 0.38
  const hasSeed  = !isThin && hf > 0.4 && Math.random() < 0.28
  const hue = pal.h + (Math.random() - 0.5) * 14
  const sat = pal.s + (Math.random() - 0.5) * 10
  const lB  = pal.lB + Math.floor((Math.random() - 0.5) * 4)
  const lT  = pal.lT + Math.floor((Math.random() - 0.5) * 6)
  return {
    x: x + clumpOffset, L,
    h: hf * GH * (0.85 + Math.random() * 0.32),
    w: isThin ? 0.6 + Math.random() * 1.1 : 1.8 + Math.random() * 2.8,
    phase: Math.random() * Math.PI * 2,
    spd:   0.4 + Math.random() * 1.15,
    lean:  (Math.random() - 0.48) * 0.32,
    crv:   (Math.random() - 0.5) * 0.20,
    tipCurve: 0.06 + Math.random() * 0.15,
    isThin, hasSeed,
    springK: 18 + Math.random() * 12,
    damping: 0.72 + Math.random() * 0.18,
    vel: 0,
    ang: 0,
    colB_l: `hsl(${hue},${sat}%,${lB}%)`,
    colM_l: `hsl(${hue+5},${sat+8}%,${Math.round(lB+(lT-lB)*0.45)}%)`,
    colT_l: `hsl(${hue+16},${sat+18}%,${lT}%)`,
    colB_d: `hsl(${hue},${sat}%,${Math.max(4,Math.round(lB*0.58))}%)`,
    colM_d: `hsl(${hue+5},${sat+8}%,${Math.max(8,Math.round((lB*0.58+lT*0.62)/2))}%)`,
    colT_d: `hsl(${hue+16},${sat+18}%,${Math.max(10,Math.round(lT*0.62))}%)`,
    midrib_l: `hsla(${hue+12},${sat+8}%,${lT+12}%,0.24)`,
    midrib_d: `hsla(${hue+12},${sat+8}%,${Math.max(10,Math.round((lT+12)*0.62))}%,0.24)`,
  }
}

function buildClump(cx, L, W, H) {
  const count  = 2 + Math.floor(Math.random() * 3)
  const spread = 5 + Math.random() * 9
  return Array.from({ length: count }, (_, i) => buildBlade(cx, L, W, H, (i/(count-1)-0.5)*spread))
}

function buildGrass(W, H, n) {
  const blades = []
  const layerCounts = [Math.round(n*0.20), Math.round(n*0.25), Math.round(n*0.28), Math.round(n*0.27)]
  layerCounts.forEach((count, L) => {
    const clumpCount = Math.floor(count * 0.55)
    for (let i = 0; i < clumpCount; i++) {
      const cx = (i / clumpCount) * W + (Math.random() - 0.5) * (W / clumpCount)
      buildClump(Math.max(0, Math.min(W, cx)), L, W, H).forEach(b => blades.push(b))
    }
    for (let i = 0; i < Math.max(0, count - clumpCount * 2.5); i++)
      blades.push(buildBlade(Math.random() * W, L, W, H))
  })
  return blades.sort((a, b) => a.L - b.L)
}

function drawGrass(ctx, blades, isDark, T, W, H, wind, condition, h) {
  const windStrength = Math.min(1, wind.speed / 4.8)
  const ws   = wind.speed * 0.10
  const gust = Math.sin(T * wind.gustFreq * 1.8) * wind.turb * 0.22 * windStrength
  const hasDew = (h >= 5 && h < 10) && condition !== 'rainy' && condition !== 'snowy'
  const hasFrost = condition === 'cold' && h < 9
  const byLayer = [[], [], [], []]
  blades.forEach(b => byLayer[b.L].push(b))

  for (let L = 0; L < 4; L++) {
    byLayer[L].forEach(b => {
      const targetSway = ((Math.sin(T * b.spd + b.phase) * ws) + (gust * windStrength * 0.82)) * wind.dir * -1
      const springForce = -b.springK * (b.ang - targetSway)
      const dampForce   = -b.damping * b.vel
      b.vel += (springForce + dampForce) * 0.016
      b.ang += b.vel * 0.016

      const sway = b.ang
      const ts   = sway * b.h * 0.74
      const ms   = ts * 0.42
      const bx   = b.x + b.lean * b.h
      const baseX = bx, baseY = H
      const midX  = bx + ms + b.crv * b.h * 0.58, midY = H - b.h * 0.52
      const tipX  = bx + ts + b.crv * b.h * b.tipCurve, tipY = H - b.h
      const cB = isDark ? b.colB_d : b.colB_l
      const cM = isDark ? b.colM_d : b.colM_l
      const cT = isDark ? b.colT_d : b.colT_l
      const cR = isDark ? b.midrib_d : b.midrib_l

      if (b.isThin) {
        const hw = b.w * 0.5
        const g2 = ctx.createLinearGradient(baseX, baseY, tipX, tipY)
        g2.addColorStop(0,   cB)
        g2.addColorStop(0.55, cM)
        g2.addColorStop(1,   cT)
        ctx.beginPath()
        ctx.moveTo(baseX - hw, baseY)
        ctx.quadraticCurveTo(midX - hw * 0.6, midY, tipX, tipY)
        ctx.quadraticCurveTo(midX + hw * 0.6, midY, baseX + hw, baseY)
        ctx.closePath(); ctx.fillStyle = g2; ctx.fill()
      } else {
        const hw = b.w * 0.5
        ctx.beginPath()
        ctx.moveTo(baseX - hw, baseY)
        ctx.bezierCurveTo(midX-hw*0.72, midY+b.h*0.16, midX-hw*0.32, midY-b.h*0.14, tipX, tipY)
        ctx.bezierCurveTo(midX+hw*0.32, midY-b.h*0.14, midX+hw*0.72, midY+b.h*0.16, baseX+hw, baseY)
        ctx.closePath()
        const grad = ctx.createLinearGradient(baseX, baseY, tipX, tipY)
        grad.addColorStop(0,    cB)
        grad.addColorStop(0.42, cM)
        grad.addColorStop(0.85, cT)
        grad.addColorStop(1,    cT)
        ctx.fillStyle = grad; ctx.fill()
        ctx.beginPath(); ctx.moveTo(baseX, baseY)
        ctx.quadraticCurveTo(midX, midY, tipX, tipY)
        ctx.strokeStyle = cR; ctx.lineWidth = Math.max(0.3, b.w * 0.14)
        ctx.lineCap = 'round'; ctx.stroke()
      }

      if (b.hasSeed) {
        ctx.save()
        ctx.globalAlpha = 0.72
        const seedX = tipX, seedY = tipY - b.h * 0.04
        ctx.beginPath()
        ctx.ellipse(seedX, seedY, b.w * 1.2, b.h * 0.055, Math.atan2(tipY-midY, tipX-midX), 0, Math.PI*2)
        ctx.fillStyle = isDark ? '#c8a055' : '#d4a840'
        ctx.fill()
        ctx.restore()
      }

      if (hasDew && b.hasSeed && Math.random() < 0.3) {
        ctx.save()
        ctx.globalAlpha = 0.65
        ctx.beginPath(); ctx.arc(tipX, tipY + 2, b.w * 0.55, 0, Math.PI * 2)
        const dwg = ctx.createRadialGradient(tipX - b.w*0.2, tipY + 1.5, 0, tipX, tipY+2, b.w*0.55)
        dwg.addColorStop(0, 'rgba(200,235,255,0.95)')
        dwg.addColorStop(0.7, 'rgba(160,210,240,0.70)')
        dwg.addColorStop(1, 'rgba(120,180,220,0.30)')
        ctx.fillStyle = dwg; ctx.fill()
        ctx.restore()
      }

      if (hasFrost) {
        ctx.save()
        ctx.globalAlpha = 0.38
        ctx.strokeStyle = isDark ? 'rgba(180,210,240,0.65)' : 'rgba(200,230,255,0.70)'
        ctx.lineWidth = 0.4
        const frostT = 0.3 + Math.random() * 0.5
        const fx = baseX + (tipX - baseX) * frostT
        const fy = baseY + (tipY - baseY) * frostT
        for (let fi = 0; fi < 4; fi++) {
          const fa = (fi / 4) * Math.PI * 2 + T * 0.01 + b.phase
          ctx.beginPath(); ctx.moveTo(fx, fy)
          ctx.lineTo(fx + Math.cos(fa)*2.5, fy + Math.sin(fa)*2.5); ctx.stroke()
        }
        ctx.restore()
      }
    })
  }

  const shadowH = Math.min(16, H * 0.045)
  const sg = ctx.createLinearGradient(0, H - shadowH, 0, H)
  sg.addColorStop(0, 'rgba(0,0,0,0)')
  sg.addColorStop(1, isDark ? 'rgba(0,0,0,0.50)' : 'rgba(0,0,0,0.20)')
  ctx.fillStyle = sg; ctx.fillRect(0, H - shadowH, W, shadowH)
}

const BIRD_CONDITIONS = new Set(['sunny','windy','dawn','cloudy','hot'])

function buildBirds(condition, W, H, ok) {
  if (!ok || !BIRD_CONDITIONS.has(condition)) return []
  const configs = {
    sunny:  { n:6, yRange:[0.05,0.38], vRange:[0.35,0.85], flapR:[2.4,3.8], szR:[4,7],  formation:'V'      },
    windy:  { n:5, yRange:[0.12,0.44], vRange:[1.1,2.2],   flapR:[4.2,6.5], szR:[3,5],  formation:'scatter' },
    dawn:   { n:4, yRange:[0.26,0.55], vRange:[0.28,0.65], flapR:[1.8,3.2], szR:[3,6],  formation:'pair'    },
    cloudy: { n:3, yRange:[0.16,0.46], vRange:[0.28,0.55], flapR:[1.6,2.8], szR:[3,5],  formation:'scatter' },
    hot:    { n:3, yRange:[0.42,0.62], vRange:[0.18,0.45], flapR:[1.4,2.2], szR:[2,4],  formation:'thermal' },
  }
  const cfg = configs[condition]
  if (!cfg) return []
  const SH = H * 0.72
  const leader = {
    x: Math.random() * W * 0.6 + W * 0.1,
    y: (cfg.yRange[0] + Math.random() * (cfg.yRange[1] - cfg.yRange[0])) * SH,
    vx: (cfg.vRange[0] + Math.random() * (cfg.vRange[1] - cfg.vRange[0])) * (Math.random() < 0.12 ? -1 : 1),
    vy: (Math.random() - 0.5) * 0.10,
    bank: 0, bankTarget: 0, bankSpeed: 0.04 + Math.random() * 0.04,
  }
  return Array.from({ length: cfg.n }, (_, i) => ({
    x: leader.x + (i === 0 ? 0 : (Math.random() - 0.5) * 80),
    y: leader.y + (i === 0 ? 0 : (Math.random() - 0.5) * 40),
    vx: leader.vx * (0.88 + Math.random() * 0.24),
    vy: leader.vy + (Math.random() - 0.5) * 0.05,
    flapRate:  cfg.flapR[0] + Math.random() * (cfg.flapR[1] - cfg.flapR[0]),
    flapPhase: Math.random() * Math.PI * 2,
    size:      cfg.szR[0] + Math.random() * (cfg.szR[1] - cfg.szR[0]),
    wobble:    Math.random() * Math.PI * 2,
    wobbleR:   0.018 + Math.random() * 0.055,
    bank: 0, bankTarget: 0, bankSpeed: 0.03 + Math.random() * 0.04,
    formation: cfg.formation, isLeader: i === 0,
    thermalAngle: Math.random() * Math.PI * 2,
    thermalR: 30 + Math.random() * 50,
  }))
}

function drawBirds(ctx, birds, T, W, H) {
  const SH = H * 0.72
  birds.forEach(b => {
    if (b.formation === 'thermal') {
      b.thermalAngle += 0.012 / (b.thermalR / 30)
      const cx = W * 0.5, cy = SH * 0.5
      b.x = cx + Math.cos(b.thermalAngle) * b.thermalR
      b.y = cy + Math.sin(b.thermalAngle) * b.thermalR * 0.4
      b.vx = -Math.sin(b.thermalAngle) * 0.8
      b.vy = Math.cos(b.thermalAngle) * 0.3
    } else {
      if (Math.random() < 0.002) b.bankTarget = (Math.random() - 0.5) * 0.3
      b.bank += (b.bankTarget - b.bank) * b.bankSpeed
      b.x += b.vx + b.bank * 2
      b.y += b.vy + Math.sin(T * b.wobbleR + b.wobble) * 0.28
      b.y = Math.max(SH * 0.03, Math.min(SH * 0.86, b.y))
      if (b.vx > 0 && b.x > W + 35) b.x = -35
      if (b.vx < 0 && b.x < -35)    b.x = W + 35
    }

    const speed    = Math.sqrt(b.vx * b.vx + b.vy * b.vy)
    const isGlide  = speed < 0.4 && b.formation !== 'thermal'
    const flapAmt  = isGlide ? Math.sin(T * 0.4 + b.flapPhase) * 0.15 : Math.sin(T * b.flapRate + b.flapPhase)
    const sp       = b.size * 1.65
    const dr       = flapAmt * b.size * 0.58
    const fc       = b.vx >= 0 ? 1 : -1

    ctx.save()
    ctx.translate(b.x, b.y)
    ctx.scale(fc, 1)
    ctx.rotate(b.bank * 0.4)

    ctx.strokeStyle = 'rgba(8,8,18,0.68)'
    ctx.lineWidth   = Math.max(0.7, b.size * 0.22)
    ctx.lineCap     = 'round'; ctx.lineJoin = 'round'

    ctx.beginPath(); ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(-sp*0.52, -dr*0.52, -sp, dr); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, 0)
    ctx.quadraticCurveTo( sp*0.52, -dr*0.52,  sp, dr); ctx.stroke()

    ctx.beginPath(); ctx.arc(0, 0, b.size * 0.12, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(8,8,18,0.62)'; ctx.fill()

    ctx.restore()
  })
}

function buildLightning(W, H) {
  return { timer: 0, nextStrike: 3 + Math.random() * 8, flash: 0, bolts: [] }
}

function generateBolt(x, startY, endY) {
  const segments = []
  let cx = x, cy = startY
  const steps = 12 + Math.floor(Math.random() * 8)
  for (let i = 0; i < steps; i++) {
    const t  = i / steps
    const nx = cx + (Math.random() - 0.5) * 40
    const ny = startY + (endY - startY) * ((i + 1) / steps)
    segments.push({ x1: cx, y1: cy, x2: nx, y2: ny })
    if (Math.random() < 0.28) {
      const bLen = (steps - i) * 0.5
      let bx = nx, by = ny
      for (let b = 0; b < Math.min(6, bLen); b++) {
        const bnx = bx + (Math.random() - 0.5) * 30
        const bny = by + (endY - startY) / steps * (1 + Math.random())
        segments.push({ x1: bx, y1: by, x2: bnx, y2: bny, branch: true })
        bx = bnx; by = bny
      }
    }
    cx = nx; cy = ny
  }
  return segments
}

function tickLightning(lightning, dt, W, H, T) {
  lightning.timer += dt
  if (lightning.flash > 0) lightning.flash -= dt * 6
  if (lightning.timer >= lightning.nextStrike) {
    lightning.timer = 0
    lightning.nextStrike = 3 + Math.random() * 10
    lightning.flash = 1.0
    const x = W * 0.1 + Math.random() * W * 0.8
    lightning.bolts = [generateBolt(x, H * 0.0, H * 0.68)]
    setTimeout(() => { lightning.bolts = [] }, 180)
  }
}

function drawLightning(ctx, lightning, W, H, skyIsNight) {
  if (lightning.flash > 0) {
    ctx.save()
    ctx.globalAlpha = lightning.flash * 0.22
    ctx.fillStyle = skyIsNight ? 'rgba(180,200,255,1)' : 'rgba(220,230,255,1)'
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }
  lightning.bolts.forEach(bolt => {
    bolt.forEach(seg => {
      ctx.save()
      ctx.globalAlpha = seg.branch ? 0.55 : 0.9
      ctx.strokeStyle = seg.branch ? 'rgba(160,190,255,0.85)' : 'rgba(220,240,255,0.98)'
      ctx.lineWidth   = seg.branch ? 0.8 : 1.8
      ctx.shadowColor = 'rgba(140,180,255,0.9)'
      ctx.shadowBlur  = seg.branch ? 4 : 12
      ctx.beginPath(); ctx.moveTo(seg.x1, seg.y1); ctx.lineTo(seg.x2, seg.y2); ctx.stroke()
      ctx.restore()
    })
  })
}

// Cloud profiles — tlo/thi tuned for FBM(4 loops) which outputs ~0.30-0.72
// tlo < 0.45 needed to see clouds. Lower tlo = more coverage.
const CP = {
  sunny:{layers:[
    {spd:0.012,sc:1.6,op:0.88,yOff:0.05,tlo:0.38,thi:0.65},
    {spd:0.020,sc:2.8,op:0.55,yOff:0.14,tlo:0.44,thi:0.68}],
    cc:{dark:'#eaf2ff',light:'#ffffff'},
    cs:{dark:'#5888c0',light:'#80aad8'},
    sM:0.50,sG:0.40},

  hot:{layers:[
    {spd:0.005,sc:1.3,op:0.50,yOff:0.10,tlo:0.46,thi:0.68}],
    cc:{dark:'#ffe0a0',light:'#fff4d8'},
    cs:{dark:'#c04818',light:'#d86830'},
    sM:0.20,sG:0.06},

  cloudy:{layers:[
    {spd:0.003,sc:1.1,op:0.98,yOff:-0.02,tlo:0.22,thi:0.50},
    {spd:0.005,sc:1.8,op:0.90,yOff:0.07,tlo:0.24,thi:0.52},
    {spd:0.009,sc:2.8,op:0.75,yOff:0.18,tlo:0.26,thi:0.54}],
    cc:{dark:'#b8c8d8',light:'#e8f0f8'},
    cs:{dark:'#101820',light:'#304870'},
    sM:2.00,sG:0.05},

  rainy:{layers:[
    {spd:0.002,sc:0.9,op:1.00,yOff:-0.05,tlo:0.15,thi:0.45},
    {spd:0.003,sc:1.5,op:0.98,yOff:0.03,tlo:0.17,thi:0.47},
    {spd:0.006,sc:2.2,op:0.90,yOff:0.12,tlo:0.19,thi:0.49}],
    cc:{dark:'#8a9eb0',light:'#aabccc'},  // visible blue-grey lit tops
    cs:{dark:'#1c2a38',light:'#24323f'},  // dark steel base (not near-black)
    sM:2.80,sG:0.00},

  snowy:{layers:[
    {spd:0.002,sc:1.0,op:0.98,yOff:-0.02,tlo:0.20,thi:0.48},
    {spd:0.004,sc:1.7,op:0.85,yOff:0.08,tlo:0.22,thi:0.50}],
    cc:{dark:'#d0dce8',light:'#eef4ff'},
    cs:{dark:'#283040',light:'#7888a8'},
    sM:1.20,sG:0.03},

  cold:{layers:[
    {spd:0.006,sc:1.4,op:0.75,yOff:0.03,tlo:0.35,thi:0.60},
    {spd:0.012,sc:2.5,op:0.55,yOff:0.15,tlo:0.38,thi:0.63}],
    cc:{dark:'#c0d0e8',light:'#ddeeff'},
    cs:{dark:'#1a2840',light:'#5070a0'},
    sM:0.85,sG:0.14},

  windy:{layers:[
    {spd:0.055,sc:2.6,op:0.60,yOff:0.02,tlo:0.40,thi:0.66},
    {spd:0.090,sc:4.8,op:0.42,yOff:0.12,tlo:0.43,thi:0.68},
    {spd:0.125,sc:7.0,op:0.28,yOff:0.22,tlo:0.46,thi:0.70}],
    cc:{dark:'#c8e0ff',light:'#ffffff'},
    cs:{dark:'#1838a0',light:'#6090cc'},
    sM:0.38,sG:0.32},
}

const SKY_CSS = {
  light:{sunny:'linear-gradient(180deg,#0a3d8f 0%,#2a7cd8 40%,#70c0f8 70%,#a8deff 100%)',cloudy:'linear-gradient(180deg,#4a6898 0%,#7898c8 55%,#b8cce8 100%)',rainy:'linear-gradient(180deg,#182030 0%,#304858 55%,#485870 100%)',hot:'linear-gradient(180deg,#7a2010 0%,#d85018 55%,#f8aa68 100%)',cold:'linear-gradient(180deg,#1858a8 0%,#4898d8 55%,#98d0f0 100%)',snowy:'linear-gradient(180deg,#6878a8 0%,#a0b0d0 55%,#d8e0ee 100%)',windy:'linear-gradient(180deg,#0a50c8 0%,#38a0f8 55%,#b0e8ff 100%)'},
  dark:{sunny:'linear-gradient(180deg,#050f28 0%,#0e3880 55%,#2070d0 100%)',cloudy:'linear-gradient(180deg,#283050 0%,#485080 55%,#6878a8 100%)',rainy:'linear-gradient(180deg,#080c14 0%,#182438 55%,#283858 100%)',hot:'linear-gradient(180deg,#200808 0%,#803010 55%,#e06028 100%)',cold:'linear-gradient(180deg,#080e20 0%,#182840 55%,#284878 100%)',snowy:'linear-gradient(180deg,#101828 0%,#203048 55%,#384868 100%)',windy:'linear-gradient(180deg,#0c1c48 0%,#204090 55%,#3870d0 100%)'},
}

let _kfDone = false
const KF = `@media(prefers-reduced-motion:no-preference){
@keyframes sk-rain{0%{transform:translateY(-8%)rotate(12deg)}100%{transform:translateY(108%)rotate(12deg)}}
@keyframes sk-snow{0%{transform:translateY(-5%)translateX(0);opacity:.9}100%{transform:translateY(110%)translateX(18px);opacity:.2}}
@keyframes sk-cloud{0%{transform:translateX(-20%)}100%{transform:translateX(112%)}}
@keyframes sk-sun{0%,100%{opacity:.85;transform:scale(1)}50%{opacity:1;transform:scale(1.07)}}
@keyframes sk-star{0%,100%{opacity:.5}50%{opacity:1}}
@keyframes sk-leaf{0%{transform:translateX(0)translateY(0)rotate(0deg);opacity:.8}100%{transform:translateX(-150px)translateY(45px)rotate(290deg);opacity:0}}
@keyframes sk-wind{0%{transform:translateX(105%)}100%{transform:translateX(-125%)}}
@keyframes sk-lightning{0%,95%,100%{opacity:0}96%,99%{opacity:.7}}
}`
function injectKF() {
  if (_kfDone || typeof document === 'undefined') return
  const s = document.createElement('style'); s.textContent = KF
  document.head.appendChild(s); _kfDone = true
}

const SkyCSS = memo(({ condition, isDark, onBrightness }) => {
  const bg = (isDark ? SKY_CSS.dark : SKY_CSS.light)[condition] ?? (isDark ? SKY_CSS.dark.cloudy : SKY_CSS.light.cloudy)
  // Use physics model even for CSS fallback — same accuracy
  const { h: nowH } = getNow()
  const CD_CSS = { sunny:0.15, hot:0.08, windy:0.28, cold:0.58, cloudy:0.90, rainy:0.98, snowy:0.88 }
  const cssSkyState = computeSkyState(nowH, condition, CD_CSS[condition] ?? 0.6)
  if (onBrightness) onBrightness(cssSkyState)
  injectKF()
  const { h } = getNow()
  const sunUV = getSunUV(h)
  const sunX = sunUV.x * 100, sunY = Math.max(4, sunUV.y * 68)
  // FIX: stars in CSS fallback now gated by actual hour (not just isDark UI)
  const showStars = isDark && (h < 6.5 || h >= 19.0)
  const hillBack  = isDark ? '#0a1208' : condition==='snowy'?'#485870':'#2e6818'
  const hillMid   = isDark ? '#0e1a10' : condition==='snowy'?'#384858':'#3a7e28'
  const hillFront = isDark ? '#0a1208' : condition==='snowy'?'#283848':'#2a6018'
  return (
    <div aria-hidden style={{position:'absolute',inset:0,borderRadius:'inherit',overflow:'hidden',pointerEvents:'none',zIndex:0,background:bg}}>
      {sunUV.visible && ['sunny','hot','windy'].includes(condition) && (
        <div style={{position:'absolute',left:`${sunX}%`,top:`${sunY}%`,transform:'translate(-50%,-50%)'}}>
          <div style={{width:70,height:70,borderRadius:'50%',background:condition==='hot'?'radial-gradient(circle,rgba(255,80,20,0.72)0%,transparent 72%)':'radial-gradient(circle,rgba(255,235,80,0.78)0%,transparent 72%)',animation:'sk-sun 4s ease-in-out infinite'}}/>
          <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:24,height:24,borderRadius:'50%',background:condition==='hot'?'rgba(255,100,20,0.96)':'rgba(255,252,180,0.96)',boxShadow:condition==='hot'?'0 0 18px 8px rgba(255,80,20,0.55)':'0 0 18px 8px rgba(255,230,80,0.55)'}}/>
        </div>
      )}
      {showStars && Array.from({length:18},(_,i)=><div key={i} style={{position:'absolute',top:`${4+(i*16.8)%58}%`,left:`${(i*22.4+3)%96}%`,width:1+(i%3),height:1+(i%3),borderRadius:'50%',background:'rgba(200,220,255,0.92)',animation:`sk-star ${1.6+(i%5)*0.35}s ease-in-out ${(i*0.28)%2}s infinite`}}/>)}
      {['cloudy','rainy','snowy','cold','windy'].includes(condition) && [{t:'8%',w:'58%',h:40,dur:condition==='windy'?3:20},{t:'20%',w:'48%',h:30,dur:condition==='windy'?4:24},{t:'4%',w:'40%',h:26,dur:condition==='windy'?5.5:30}].map((c,i)=><div key={i} style={{position:'absolute',top:c.t,left:'-18%',width:c.w,height:c.h,borderRadius:'50%',background:isDark?'rgba(100,120,160,0.78)':'rgba(255,255,255,0.88)',filter:'blur(9px)',animation:`sk-cloud ${c.dur}s linear ${i*0.55}s infinite`}}/>)}
      {condition==='rainy' && Array.from({length:22},(_,i)=><div key={i} style={{position:'absolute',top:'-12%',left:`${(i*4.8+1)%100}%`,width:1.5,height:16+(i%4)*4,background:isDark?'linear-gradient(to bottom,transparent,rgba(140,185,250,0.72))':'linear-gradient(to bottom,transparent,rgba(100,145,210,0.62))',borderRadius:2,transform:`rotate(${8+(i%4)*2}deg)`,animation:`sk-rain ${0.55+(i%5)*0.14}s linear ${(i*0.11)%0.9}s infinite`}}/>)}
      {condition==='snowy' && Array.from({length:22},(_,i)=><div key={i} style={{position:'absolute',top:'-6%',left:`${(i*4.4+1)%100}%`,width:4+(i%4)*2,height:4+(i%4)*2,borderRadius:'50%',background:isDark?`rgba(200,218,255,${0.52+(i%4)*0.11})`:`rgba(238,248,255,${0.62+(i%4)*0.09})`,animation:`sk-snow ${2.2+(i%6)*0.5}s ease-in ${(i*0.17)%2.8}s infinite`}}/>)}
      {condition==='windy' && Array.from({length:10},(_,i)=><div key={i} style={{position:'absolute',top:`${12+(i*8.5)%55}%`,right:'-5%',width:9+(i%3)*5,height:(9+(i%3)*5)*0.3,borderRadius:'50%',background:['#3a7228','#4a8030','#5a9038','#6a9a40','#7aaa48','#7a5828','#6a4c20','#8a7830'][i%8],animation:`sk-leaf ${1.1+(i%4)*0.38}s ease-in-out ${(i*0.20)%1.8}s infinite`}}/>)}
      {condition==='windy' && [0,1,2,3,4].map(i=><div key={i} style={{position:'absolute',top:`${18+i*14}%`,left:0,right:0,height:1,background:`linear-gradient(to left,transparent,${isDark?'rgba(200,220,255,0.18)':'rgba(200,230,255,0.28)'},transparent)`,animation:`sk-wind ${0.75+i*0.28}s linear ${i*0.18}s infinite`}}/>)}
      {condition==='rainy' && isDark && <div style={{position:'absolute',top:'5%',left:'15%',width:2,height:'65%',background:'rgba(200,220,255,0)',animation:'sk-lightning 8s linear 2s infinite'}}/>}
      <div style={{position:'absolute',bottom:0,left:'-6%',right:'-6%',height:'34%',background:hillBack,borderRadius:'62% 62% 0 0 / 42% 42% 0 0'}}/>
      <div style={{position:'absolute',bottom:0,left:'-9%',right:'-4%',height:'26%',background:hillMid,borderRadius:'58% 72% 0 0 / 38% 48% 0 0'}}/>
      <div style={{position:'absolute',bottom:0,left:'-4%',right:'-9%',height:'20%',background:hillFront,borderRadius:'72% 58% 0 0 / 48% 38% 0 0'}}/>
      {condition==='snowy' && <div style={{position:'absolute',bottom:'30%',left:'-6%',right:'-6%',height:'7%',background:'rgba(215,232,255,0.72)',borderRadius:'62% 62% 0 0 / 82% 82% 0 0',filter:'blur(2px)'}}/>}
      <div style={{position:'absolute',bottom:0,left:0,right:0,height:'20%',background:`linear-gradient(to top,${isDark?'rgba(0,0,0,0.58)':'rgba(0,0,0,0.20)'},transparent)`,pointerEvents:'none'}}/>
    </div>
  )
})

const SkyGL = ({ condition, isDark, onBrightness, cfg, tier }) => {
  const mountRef = useRef(null)
  const sceneRef = useRef(null)
  const grassRef = useRef(null)
  const rafRef   = useRef(null)
  const visRef   = useRef(true)
  const fpsMsec  = 1000 / cfg.fps
  const noMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion:reduce)').matches

  const startCanvas = useCallback((container, W, H, sk, wind, sunUV, moonUV, phase, h, glRenderer, glScene, glCam, glMats) => {
    if (noMotion) return null
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    let cv = grassRef.current
    if (!cv) {
      cv = document.createElement('canvas')
      cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;border-radius:inherit;'
      container.appendChild(cv); grassRef.current = cv
    }
    const DPR = Math.min(window.devicePixelRatio || 1, cfg.dpr)
    cv.width  = Math.round(W * DPR); cv.height = Math.round(H * DPR)
    const ctx = cv.getContext('2d'); ctx.scale(DPR, DPR)

    const gc = makeGradCache()

    // Stars: zero during all daylight (h 7.0-18.0)
    const starAlpha = Math.max(0, Math.min(1,
      h < 5.5  ? 0.96 :
      h < 7.0  ? 0.96 * (1 - (h - 5.5) / 1.5) :
      h < 18.0 ? 0 :
      h < 20.0 ? (h - 18.0) / 2.0 * 0.96 :
                 0.96
    ))

    const starCount = tier === 'high' ? 140 : 80
    const stars     = starAlpha > 0.02 ? buildStars(W, H, starCount) : []
    const drawStars = stars.length ? makeStarRenderer(W, H, stars) : null

    let blades = []
    const scheduleGrass = typeof requestIdleCallback !== 'undefined'
      ? cb => requestIdleCallback(cb, { timeout: 600 })
      : cb => setTimeout(cb, 0)
    scheduleGrass(() => { blades = buildGrass(W, H, cfg.blades) })

    const birds   = buildBirds(condition, W, H, cfg.birds)
    const leaves  = condition === 'windy' && cfg.leaves ? buildLeaves(W, H, wind, 16) : []
    // FIX: 300 drops (was 220), always use condition string not sk.rain flag
    const drops   = condition === 'rainy' ? buildDrops(300, W, H, wind) : []
    const flakes  = condition === 'snowy' && cfg.snowPN > 0 ? buildSnowflakes(Math.min(cfg.snowPN, 200), W, H, wind) : []
    // skyIsNight: true when actual sky is dark (hour-based), used for drop color temperature
    const skyIsNight = h < 7.0 || h >= 18.0
    // Lightning: fires on rainy regardless of UI theme
    const lightning = condition === 'rainy' ? buildLightning(W, H) : null

    let T = 0, last = 0, prev = 0

    const tick = (ts) => {
      rafRef.current = requestAnimationFrame(tick)
      if (ts - last < fpsMsec || !visRef.current) return
      const dt = Math.min((ts - prev) / 1000, 0.06)
      prev = ts; last = ts; T += dt

      if (glMats) {
        glMats.sky.uniforms.uT.value = T
        if (glMats.stars) glMats.stars.uniforms.uT.value = T
        glMats.clouds.forEach(m => m.uniforms.uT.value = T)
        if (glMats.precip) glMats.precip.uniforms.uT.value = T
        if (glMats.fog)    glMats.fog.uniforms.uT.value    = T
        glRenderer.render(glScene, glCam)
      }

      ctx.clearRect(0, 0, W, H)

      if (!glMats) drawSkyBg(ctx, W, H, sk, h, sunUV)

      if (drawStars) drawStars(ctx, T, starAlpha)
      if (starAlpha < 0.95) {
        drawCrepuscularRays(ctx, W, H, sunUV, sk, T)
        drawSun(ctx, W, H, sunUV, sk, condition, h, gc)
      }
      drawMoon(ctx, W, H, moonUV, phase, sk, h, gc)

      if (lightning) {
        tickLightning(lightning, dt, W, H, T)
        drawLightning(ctx, lightning, W, H, skyIsNight)
      }

      // Ground gradient (smooth, no hills)
      {
        const groundGrad = ctx.createLinearGradient(0, H * 0.72, 0, H)
        if (h < 5.5 || h >= 20) {
          groundGrad.addColorStop(0, 'rgba(2,4,12,0)')
          groundGrad.addColorStop(0.5, 'rgba(2,4,12,0.55)')
          groundGrad.addColorStop(1, 'rgba(1,2,8,0.85)')
        } else if (h < 7.5) {
          groundGrad.addColorStop(0, 'rgba(0,0,0,0)')
          groundGrad.addColorStop(0.4, 'rgba(20,10,5,0.45)')
          groundGrad.addColorStop(1, 'rgba(10,5,2,0.72)')
        } else if (h < 16.0) {
          groundGrad.addColorStop(0, 'rgba(0,0,0,0)')
          groundGrad.addColorStop(0.35, isDark ? 'rgba(4,14,4,0.38)' : 'rgba(8,28,8,0.28)')
          groundGrad.addColorStop(1, isDark ? 'rgba(2,8,2,0.65)' : 'rgba(4,16,4,0.52)')
        } else if (h < 18.0) {
          groundGrad.addColorStop(0, 'rgba(0,0,0,0)')
          groundGrad.addColorStop(0.4, 'rgba(24,12,2,0.42)')
          groundGrad.addColorStop(1, 'rgba(12,6,1,0.68)')
        } else {
          groundGrad.addColorStop(0, 'rgba(0,0,0,0)')
          groundGrad.addColorStop(0.45, 'rgba(4,4,12,0.48)')
          groundGrad.addColorStop(1, 'rgba(2,2,8,0.75)')
        }
        ctx.fillStyle = groundGrad
        ctx.fillRect(0, H * 0.72, W, H * 0.28)
      }

      // Draw rain FIRST (behind grass but in front of sky)
      if (drops.length)  { tickRain(drops, dt, W, H, wind, T); drawRain(ctx, drops, H, skyIsNight, T) }
      // Snow behind grass
      if (flakes.length) { tickSnowflakes(flakes, dt, wind, T, W, H); drawSnowflakes(ctx, flakes, isDark, T) }
      // Grass in front of rain/snow
      if (blades.length)   drawGrass(ctx, blades, isDark, T, W, H, wind, condition, h)
      // Leaves and birds always on top
      if (leaves.length) { tickLeaves(leaves, dt, wind, T, W, H); drawLeaves(ctx, leaves, isDark) }
      drawBirds(ctx, birds, T, W, H)
    }
    rafRef.current = requestAnimationFrame(tick)

    const onVisChange = () => {
      if (document.hidden) {
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      } else {
        if (!rafRef.current) rafRef.current = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVisChange)

    const onResize = () => {
      const nW = container.clientWidth || 360, nH = container.clientHeight || 220
      glRenderer.setSize(nW, nH)
      gc.clear()
    }
    window.addEventListener('resize', onResize)

    return {
      stopVis:    () => document.removeEventListener('visibilitychange', onVisChange),
      stopResize: () => window.removeEventListener('resize', onResize),
    }
  }, [condition, isDark, noMotion, cfg, fpsMsec, tier])

  const build = useCallback(async (container) => {
    if (!container) return
    const W   = container.clientWidth  || 360
    const H   = container.clientHeight || 220
    const DPR = Math.min(window.devicePixelRatio || 1, cfg.dpr)

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' })
    renderer.setPixelRatio(DPR); renderer.setSize(W, H)
    renderer.toneMapping         = THREE.ACESFilmicToneMapping
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;border-radius:inherit;z-index:0;'
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1,1,1,-1,0,1)
    const { h, date } = getNow()
    const _skyDark = h < 7.0 || h >= 18.0
    renderer.toneMappingExposure = _skyDark ? 0.88 : 1.25

    let festival = null
    fetchTodayFestivals()
      .then(fs => { const cx = getTodayContext(null, fs); if (cx.festivals?.length > 0) festival = cx.festivals[0] })
      .catch(() => {})

    const sk     = resolveSky(condition, h, isDark, false)
    const wind   = getWind(condition)
    const sunUV  = getSunUV(h)
    const moonUV = getMoonUV(h)
    const phase  = getLunarPhase(date)
    const cd     = sk.cd ?? 0.5
    const occ    = Math.max(0, 1 - Math.pow(Math.max(0, cd - 0.25) / 0.75, 1.5))
    const eSa    = (sk.sa || 0) * occ
    const bloom  = 1 + Math.max(0, cd - 0.25) * 2.2
    const brightness = computeBrightness(sk)

    // ── Physics-based sky state — passed to WelcomeCard for accurate text colors ──
    const skyState = computeSkyState(h, condition, cd)
    if (onBrightness) onBrightness(skyState)

    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uZ:{value:new THREE.Color(sk.z)}, uUM:{value:new THREE.Color(sk.um??sk.z)},
        uLM:{value:new THREE.Color(sk.lm??sk.h)}, uH:{value:new THREE.Color(sk.h)},
        uG:{value:new THREE.Color(sk.g??sk.h)}, uSc:{value:new THREE.Color(sk.sc)},
        uSp:{value:new THREE.Vector2(sunUV.x, sunUV.y)},
        uSa:{value:eSa}, uBE:{value:bloom}, uBr:{value:isDark?0.82:1.0}, uT:{value:0},
        uHorizonAlt:{value:sunUV.nearHorizon?0.7:0.0},
      },
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}`,
      fragmentShader:`
uniform vec3 uZ,uUM,uLM,uH,uG,uSc;
uniform vec2 uSp;
uniform float uSa,uBr,uT,uBE,uHorizonAlt;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
  float y=vUv.y;
  vec3 col;
  if(y<0.18)       col=mix(uG,  uLM, y/0.18);
  else if(y<0.40)  col=mix(uLM, uH,  (y-0.18)/0.22);
  else if(y<0.62)  col=mix(uH,  uUM, (y-0.40)/0.22);
  else if(y<0.82)  col=mix(uUM, uZ,  (y-0.62)/0.20);
  else             col=uZ;
  if(uSa>0.01){
    vec2 dv=vUv-uSp; dv.x*=1.75;
    float d=length(dv);
    float r=0.020/uBE;
    col+=uSc*(smoothstep(r*1.5,r*0.5,d)+
         pow(max(0.,1.-d*(12./uBE)),2.6)*0.90+
         pow(max(0.,1.-d*(2.8/uBE)),4.8)*0.34*uBE)*uSa;
    float hg=pow(max(0.,1.-abs(vUv.x-uSp.x)*2.8),2.5)*smoothstep(0.55,0.0,abs(y-0.18))*0.32;
    col+=uSc*hg*uSa*(0.5+uHorizonAlt*0.5);
  }
  col*=uBr;
  col+=(hash(vUv+uT*0.001)-0.5)*0.0035;
  gl_FragColor=vec4(clamp(col,0.,1.),1.);
}`,
      depthWrite:false, depthTest:false,
    })
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2), skyMat))

    const vm = new THREE.Mesh(new THREE.PlaneGeometry(2,2), new THREE.ShaderMaterial({
      uniforms:{uS:{value:isDark?0.50:0.30}},
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}`,
      fragmentShader:`uniform float uS;varying vec2 vUv;void main(){float a=uS*pow(max(0.,1.-vUv.y*1.75),1.95);gl_FragColor=vec4(0.,0.,0.,clamp(a,0.,.68));}`,
      transparent:true, depthWrite:false,
    }))
    vm.position.z = 0.04; scene.add(vm)

    // WebGL stars: only build when hour-based sky is dark
    const glStarAlpha = _skyDark ? (sk.sa || 0) : 0
    let starMesh = null
    if (!noMotion && glStarAlpha > 0.04) {
      const SN = tier==='high'?420:200
      const sP = new Float32Array(SN*3), sS = new Float32Array(SN), sC = new Float32Array(SN*3)
      const spectralColors = [[0.6,0.7,1.0],[0.76,0.84,1.0],[0.95,0.97,1.0],[1.0,0.98,0.9],[1.0,0.96,0.8],[1.0,0.88,0.65],[1.0,0.72,0.52]]
      for (let i=0;i<SN;i++){
        sP[i*3]=(Math.random()-.5)*2.2;sP[i*3+1]=Math.random()*.88+.08;sP[i*3+2]=.5;
        sS[i]=1.2+Math.random()*3.0
        const sc=spectralColors[Math.floor(Math.random()*spectralColors.length)]
        sC[i*3]=sc[0];sC[i*3+1]=sc[1];sC[i*3+2]=sc[2]
      }
      const sg = new THREE.BufferGeometry()
      sg.setAttribute('position',new THREE.BufferAttribute(sP,3))
      sg.setAttribute('size',new THREE.BufferAttribute(sS,1))
      sg.setAttribute('color',new THREE.BufferAttribute(sC,3))
      starMesh = new THREE.Points(sg, new THREE.ShaderMaterial({
        uniforms:{uA:{value:glStarAlpha},uT:{value:0}},
        vertexShader:`attribute float size;attribute vec3 color;uniform float uT,uA;varying float vA;varying vec3 vC;void main(){float tw=0.55+0.45*sin(uT*2.4+position.x*5.5+position.y*7.2);vA=uA*tw;vC=color;gl_PointSize=size*tw;gl_Position=vec4(position.xy,0.5,1.);}`,
        fragmentShader:`varying float vA;varying vec3 vC;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float a=(1.-d*d)*vA;gl_FragColor=vec4(vC,a);}`,
        transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
      }))
      starMesh.position.z = 0.05; scene.add(starMesh)
    }

    const cp = CP[condition] ?? CP.cloudy
    const cloudCC = cp.cc[_skyDark?'dark':'light'], cloudCS = cp.cs[_skyDark?'dark':'light']
    const sunBloom = (sk.sunBloom ?? 0.5) * occ, cloudMats = []
    const fbm = `float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<${cfg.fbmLoops};i++){v+=a*n(p);p=p*2.1+.7;a*=.5;}return v;}`

    if (!noMotion) {
      cp.layers.forEach((def, idx) => {
        const mat = new THREE.ShaderMaterial({
          uniforms:{
            uT:{value:0},uSpd:{value:def.spd},uCol:{value:new THREE.Color(cloudCC)},
            uShd:{value:new THREE.Color(cloudCS)},uA:{value:def.op*cd},uSc:{value:def.sc},
            uTlo:{value:def.tlo??0.42},uThi:{value:def.thi??0.70},uSM:{value:cp.sM??1},
            uSG:{value:cp.sG??0.18},uSp:{value:new THREE.Vector2(sunUV.x,sunUV.y)},
            uSa:{value:eSa},uSB:{value:sunBloom},uYO:{value:def.yOff},
            uSt:{value:new THREE.Color(sk.z)},uSb:{value:new THREE.Color(sk.h)},uGY:{value:0.0},
          },
          vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}`,
          fragmentShader:`
uniform float uT,uSpd,uA,uSc,uTlo,uThi,uSM,uSG,uSa,uSB,uYO,uGY;
uniform vec2 uSp;uniform vec3 uCol,uShd,uSt,uSb;varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
float n(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
${fbm}
void main(){
  if(vUv.y<uGY)discard;
  vec2 uv=vec2(vUv.x+uT*uSpd,vUv.y);
  // FIX: widened yM mask — clouds now fill more of the canvas height
  float yM=smoothstep(0.,.20,vUv.y-(uGY+uYO*.10))*smoothstep(1.,.08,vUv.y);
  if(yM<.01)discard;
  float f=fbm(uv*uSc);
  float cl=smoothstep(uTlo,uThi,f)*yM*smoothstep(0.,.08,vUv.x)*smoothstep(1.,.92,vUv.x);
  if(cl<.005)discard;
  vec3 col=mix(uShd*0.72,uCol,smoothstep(uTlo+.05,uThi,f)*.88);
  col=mix(col,uShd*0.38,(1.-vUv.y)*.48*uSM*cl);  // was 0.18 — too dark, lost on dark sky
  float es=1.-pow(1.-cl,1.6);  // softer power = clouds cover more of sky sooner
  col=mix(mix(uSb,uSt,vUv.y),col,min(es*1.4,1.0));
  if(uSa>.03&&uSB>.02){
    vec2 sd=vUv-uSp;sd.x*=1.8;float sd2=length(sd);
    float bl=pow(max(0.,1.-sd2*4.2),3.)*uSB*uSa;
    col=mix(col,vec3(1.,.98,.92),pow(max(0.,1.-sd2*8.5),2.5)*bl*cl*.88);
    col+=vec3(1.,.76,.55)*pow(max(0.,1.-sd2*3.0),2.)*bl*cl*.48;
  }
  if(uSa>.08&&uSG>.01)col+=vec3(1.,.92,.64)*max(0.,1.-abs(vUv.x-uSp.x)*5.5)*uSG*cl;
  gl_FragColor=vec4(col,cl*uA);
}`,
          transparent:true, depthWrite:false,
        })
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2,2), mat)
        mesh.position.z = 0.07 + idx * 0.01; scene.add(mesh); cloudMats.push(mat)
      })
    }

    let precipMesh = null
    if (!noMotion && condition === 'snowy' && cfg.snowPN > 0) {
      const PN=cfg.snowPN, pp=new Float32Array(PN*3), ps=new Float32Array(PN)
      for(let i=0;i<PN;i++){pp[i*3]=(Math.random()-.5)*2.4;pp[i*3+1]=(Math.random()-.5)*2.4;pp[i*3+2]=.9;ps[i]=Math.random()}
      const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pp,3));pg.setAttribute('seed',new THREE.BufferAttribute(ps,1))
      precipMesh=new THREE.Points(pg, new THREE.ShaderMaterial({
        uniforms:{uA:{value:isDark?.50:.36},uT:{value:0}},
        vertexShader:`attribute float seed;uniform float uT;void main(){vec3 p=position;p.y=mod(p.y-uT*.30+seed*2.,2.4)-1.2;p.x+=sin(uT*1.1+seed*6.28)*.055;gl_PointSize=3.8*(.65+seed*.7);gl_Position=vec4(p.xy,.9,1.);}`,
        fragmentShader:`uniform float uA;void main(){vec2 p=gl_PointCoord-.5;float d=length(p);if(d>.5)discard;gl_FragColor=vec4(.88,.93,1.,(1.-d*2.)*(1.-d*2.)*uA*.75);}`,
        transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
      }))
      scene.add(precipMesh)
    }

    let fogMesh = null
    if (!noMotion && (sk.fog||0) > 0.06) {
      fogMesh = new THREE.Mesh(new THREE.PlaneGeometry(2,2), new THREE.ShaderMaterial({
        uniforms:{uA:{value:(sk.fog||0)*(isDark?1.:.56)},uT:{value:0}},
        vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}`,
        fragmentShader:`uniform float uA,uT;varying vec2 vUv;float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}float sn(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*sn(p);p=p*2.+.4;a*=.5;}return v;}void main(){vec2 uv=vec2(vUv.x+uT*.014,vUv.y+uT*.005);float f=fbm(uv*2.0);float a=f*uA*smoothstep(0.,.30,vUv.y)*smoothstep(1.,.20,vUv.y);gl_FragColor=vec4(.65,.67,.72,clamp(a,0.,1.));}`,
        transparent:true, depthWrite:false,
      }))
      fogMesh.position.z = 0.11; scene.add(fogMesh)
    }

    const glMats = {
      sky:    skyMat,
      stars:  starMesh?.material ?? null,
      clouds: cloudMats,
      precip: precipMesh?.material ?? null,
      fog:    fogMesh?.material ?? null,
    }

    const handlers = startCanvas(container, W, H, sk, wind, sunUV, moonUV, phase, h, renderer, scene, cam, glMats)

    sceneRef.current = {
      dispose: () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null
        handlers?.stopVis(); handlers?.stopResize()
        scene.traverse(o => {
          if (o.geometry) o.geometry.dispose()
          if (o.material) Array.isArray(o.material) ? o.material.forEach(m=>m.dispose()) : o.material.dispose()
        })
        renderer.dispose()
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
        if (grassRef.current?.parentNode) grassRef.current.parentNode.removeChild(grassRef.current)
        grassRef.current = null
      }
    }
  }, [condition, isDark, noMotion, onBrightness, startCanvas, cfg, fpsMsec, tier])

  useEffect(() => {
    const el = mountRef.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { visRef.current = e.isIntersecting }, { threshold: 0.01 })
    obs.observe(el); build(el)
    return () => { obs.disconnect(); sceneRef.current?.dispose(); sceneRef.current = null }
  }, [build])

  return <div ref={mountRef} aria-hidden style={{position:'absolute',inset:0,width:'100%',height:'100%',borderRadius:'inherit',overflow:'hidden',pointerEvents:'none',zIndex:0}}/>
}

const SkyCanvas = ({ condition='cloudy', weather=null, isDark=true, onBrightness }) => {
  const { tier, config: cfg, isLow } = useDeviceTier()

  const handleBrightness = useCallback((val) => {
    if (!onBrightness) return
    onBrightness(typeof val === 'object' ? val.brightness : val)
  }, [onBrightness])

  if (isLow) return <SkyCSS condition={condition} isDark={isDark} onBrightness={handleBrightness} />
  return <SkyGL condition={condition} isDark={isDark} onBrightness={handleBrightness} cfg={cfg} tier={tier} />
}

export default SkyCanvas

// Re-export from skyPhysics — single source of truth
export { getWeatherTextColors } from './skyPhysics'

// Legacy signature kept for backwards compat — maps to physics version
function _getWeatherTextColorsLegacy(brightness, isDark, condition) {
  const accent = WEATHER_ACCENT[condition] ?? '#FF9F1C'

  if (brightness > 0.58) return {
    name:        '#0d1322',
    sub:         'rgba(8,12,32,0.74)',
    pill:        'rgba(255,255,255,0.55)',
    pillBorder:  'rgba(255,255,255,0.75)',
    pillText:    'rgba(8,12,32,0.88)',
    pillInset:   'rgba(255,255,255,0.65)',
    badge:       'rgba(255,255,255,0.40)',
    badgeBorder: 'rgba(255,255,255,0.62)',
    badgeText:   'rgba(8,12,32,0.92)',
    shadow:      '0 1px 4px rgba(255,255,255,0.90),0 2px 12px rgba(0,0,0,0.14)',
    overlay:     'rgba(0,0,0,0.08)',
    accent,
  }

  if (brightness > 0.40) {
    const useDark = brightness > 0.50
    return {
      name:        useDark ? '#0e1428' : '#f8f4ff',
      sub:         useDark ? 'rgba(10,16,42,0.76)' : 'rgba(215,225,252,0.76)',
      pill:        useDark ? 'rgba(255,255,255,0.46)' : 'rgba(0,0,0,0.30)',
      pillBorder:  useDark ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.22)',
      pillText:    useDark ? 'rgba(8,14,38,0.90)'     : 'rgba(215,228,255,0.92)',
      pillInset:   useDark ? 'rgba(255,255,255,0.52)' : 'rgba(255,255,255,0.09)',
      badge:       useDark ? 'rgba(255,255,255,0.34)' : 'rgba(0,0,0,0.30)',
      badgeBorder: useDark ? 'rgba(255,255,255,0.54)' : 'rgba(255,255,255,0.18)',
      badgeText:   useDark ? 'rgba(8,14,38,0.92)'     : '#f8f4ff',
      shadow:      useDark
        ? '0 1px 0 rgba(255,255,255,0.72),0 2px 14px rgba(0,10,42,0.14)'
        : '0 1px 0 rgba(0,0,0,0.50),0 2px 18px rgba(0,20,65,0.44)',
      overlay: useDark ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.30)',
      accent,
    }
  }

  return {
    name:        '#f8f4ff',
    sub:         'rgba(210,224,250,0.76)',
    pill:        'rgba(0,0,0,0.30)',
    pillBorder:  'rgba(255,255,255,0.18)',
    pillText:    'rgba(220,235,255,0.93)',
    pillInset:   'rgba(255,255,255,0.07)',
    badge:       'rgba(0,0,0,0.34)',
    badgeBorder: 'rgba(255,255,255,0.16)',
    badgeText:   '#f8f4ff',
    shadow:      '0 1px 0 rgba(0,0,0,0.68),0 2px 24px rgba(0,10,42,0.65),0 0 40px rgba(0,10,42,0.38)',
    overlay:     'rgba(0,0,0,0.44)',
    accent,
  }
}