// src/modules/customer/components/menu/SkyCanvas.jsx — v5
//
// ─── WHAT CHANGED FROM v4 ────────────────────────────────────────────────────
//
// • Removed local detectTier() function
// • Removed local TIER_CONFIG object
// • Now reads tier + config from centralized useDeviceTier() hook
// • Everything else identical to v4
//
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { fetchTodayFestivals, getTodayContext } from '../notifications/nepalCalendar'
import SkyFallbackCSS from './SkyFallbackCSS'
import { useDeviceTier } from '@shared/hooks/useDeviceTier'

// ─────────────────────────────────────────────────────────────────────────────
// LUNAR PHASE
// ─────────────────────────────────────────────────────────────────────────────
function getLunarPhase(date = new Date()) {
  const KNOWN_NEW = new Date('2024-01-11T11:57:00Z')
  const CYCLE     = 29.53058867
  const elapsed   = (date - KNOWN_NEW) / 86400000
  return (((elapsed % CYCLE) + CYCLE) % CYCLE) / CYCLE
}

// ─────────────────────────────────────────────────────────────────────────────
// SKY STATE TABLES
// ─────────────────────────────────────────────────────────────────────────────
const TIME_SKIES = {
  dark: {
    dawn:       { z:'#1c0a30',h1:'#6c2030',h2:'#d04828',g:'#e86830',sc:'#FF7028',sa:0.80,ma:0.0,sta:0.10,fog:0.06,cloudDensity:0.52 },
    goldenHour: { z:'#200e08',h1:'#581a08',h2:'#d04818',g:'#f07028',sc:'#FF5800',sa:1.00,ma:0.00,sta:0.04,fog:0.05,cloudDensity:0.28 },
    dusk:       { z:'#10061a',h1:'#381038',h2:'#901838',g:'#c03050',sc:'#FF3838',sa:0.14,ma:0.0,sta:0.10,fog:0.08,cloudDensity:0.55 },
    night:      { z:'#020510',h1:'#040818',h2:'#080c28',g:'#0c1030',sc:'#4466aa',sa:0.00,ma:1.00,sta:1.00,fog:0.00,cloudDensity:0.12 },
  },
  light: {
    dawn:       { z:'#6a3860',h1:'#d05848',h2:'#f09060',g:'#f8b878',sc:'#FF8838',sa:0.78,ma:0.0,sta:0.05,fog:0.06,cloudDensity:0.48 },
    goldenHour: { z:'#904030',h1:'#e07030',h2:'#f0a040',g:'#f8c050',sc:'#FF6818',sa:1.00,ma:0.00,sta:0.02,fog:0.04,cloudDensity:0.26 },
    dusk:       { z:'#704050',h1:'#b85070',h2:'#d88090',g:'#eea8b0',sc:'#FF7070',sa:0.20,ma:0.0,sta:0.06,fog:0.08,cloudDensity:0.52 },
    night:      { z:'#141028',h1:'#201840',h2:'#282050',g:'#342860',sc:'#4466aa',sa:0.00,ma:0.88,sta:0.90,fog:0.00,cloudDensity:0.18 },
  },
}

const DAYTIME = {
  dark: {
    cloudy: { z:'#3a4868',h1:'#4a5878',h2:'#6070a0',g:'#7888b0',sc:'#d0d8f0',sa:0.22,fog:0.10,sunBloom:0.35,cloudDensity:0.88,rain:0,snow:0 },
    sunny:  { z:'#1c2f58',h1:'#2a4880',h2:'#4878b8',g:'#6898d0',sc:'#FFE040',sa:0.92,fog:0.00,sunBloom:0.85,cloudDensity:0.04,rain:0,snow:0 },
    hot:    { z:'#281408',h1:'#581c08',h2:'#b04018',g:'#e06028',sc:'#FF4800',sa:1.00,fog:0.00,sunBloom:0.76,cloudDensity:0.05,rain:0,snow:0 },
    rainy:  { z:'#0c1018',h1:'#141820',h2:'#1c2430',g:'#222c3a',sc:'#606878',sa:0.04,fog:0.35,sunBloom:0.03,cloudDensity:0.96,rain:1,snow:0 },
    cold:   { z:'#101a2c',h1:'#182038',h2:'#20305a',g:'#2a3a6a',sc:'#a0c0e8',sa:0.35,fog:0.12,sunBloom:0.45,cloudDensity:0.55,rain:0,snow:0,ma:0,sta:0.12 },
    snowy:  { z:'#182030',h1:'#202838',h2:'#303848',g:'#404860',sc:'#c8d8f0',sa:0.22,fog:0.22,sunBloom:0.22,cloudDensity:0.86,rain:0,snow:1,ma:0,sta:0.08 },
    windy:  { z:'#1a3060',h1:'#2848a0',h2:'#4070c8',g:'#5898e0',sc:'#FFE840',sa:0.85,fog:0.06,sunBloom:0.80,cloudDensity:0.26,rain:0,snow:0 },
  },
  light: {
    cloudy: { z:'#7888a8',h1:'#8898b8',h2:'#a0aec8',g:'#b8c4d8',sc:'#e8eeff',sa:0.26,fog:0.06,sunBloom:0.45,cloudDensity:0.86,rain:0,snow:0 },
    sunny:  { z:'#4888c8',h1:'#68a8e0',h2:'#90c0f0',g:'#b8d8f8',sc:'#FFF080',sa:1.00,fog:0.00,sunBloom:0.95,cloudDensity:0.03,rain:0,snow:0 },
    hot:    { z:'#d04828',h1:'#e87030',h2:'#f89858',g:'#fcc080',sc:'#FF5820',sa:1.00,fog:0.00,sunBloom:0.92,cloudDensity:0.04,rain:0,snow:0 },
    rainy:  { z:'#304868',h1:'#486888',h2:'#6080a0',g:'#8098b8',sc:'#8898b8',sa:0.08,fog:0.22,sunBloom:0.06,cloudDensity:0.94,rain:1,snow:0 },
    cold:   { z:'#4888b8',h1:'#68a8d0',h2:'#88c0e0',g:'#a8d4f0',sc:'#c8e8ff',sa:0.40,fog:0.10,sunBloom:0.55,cloudDensity:0.52,rain:0,snow:0,ma:0,sta:0.04 },
    snowy:  { z:'#8898c0',h1:'#a0aed0',h2:'#b8c4de',g:'#d0d8ee',sc:'#d8e8f8',sa:0.28,fog:0.16,sunBloom:0.28,cloudDensity:0.84,rain:0,snow:1,ma:0,sta:0.04 },
    windy:  { z:'#5898c8',h1:'#78b8e8',h2:'#a0d0f8',g:'#c8e8ff',sc:'#FFF060',sa:0.90,fog:0.05,sunBloom:0.88,cloudDensity:0.24,rain:0,snow:0 },
  },
}

function computeBrightness(sk, isDark) {
  const base     = isDark ? 0.50 : 1.0
  const cd       = sk.cloudDensity ?? 0.5
  const cloudDim = cd * (isDark ? 0.55 : 0.44)
  const sunAdd   = (sk.sa || 0) * (isDark ? 0.20 : 0.28)
  return Math.max(0.06, Math.min(0.95, base - cloudDim + sunAdd))
}

function resolveSky(condition, hour, hasFestival, isDark) {
  const T = isDark ? TIME_SKIES.dark  : TIME_SKIES.light
  const D = isDark ? DAYTIME.dark     : DAYTIME.light
  if (hasFestival) return { ...T.night, ma:0.80, sta:1.0 }
  if (hour < 5.5)  return T.night
  if (hour < 6.8)  return T.dawn
  if (hour < 16.5) return D[condition] ?? D.cloudy
  if (hour < 17.5) return T.goldenHour
  if (hour < 19.5) return T.dusk
  return T.night
}

const CLOUD_PROFILES = {
  sunny:  { layers:[{spd:0.018,sc:2.2,op:0.26,yOff:0.08,tlo:0.62,thi:0.80},{spd:0.028,sc:3.8,op:0.14,yOff:0.20,tlo:0.66,thi:0.84}],
            cc:{dark:'#e8f0ff',light:'#ffffff'},cs:{dark:'#4868a0',light:'#8098c0'},shadowMult:0.35,sunGlow:0.28 },
  hot:    { layers:[{spd:0.008,sc:1.6,op:0.11,yOff:0.14,tlo:0.68,thi:0.84}],
            cc:{dark:'#ffe8b0',light:'#fff4e0'},cs:{dark:'#a04020',light:'#d06030'},shadowMult:0.24,sunGlow:0.06 },
  cloudy: { layers:[{spd:0.005,sc:1.5,op:0.86,yOff:0.02,tlo:0.34,thi:0.60},{spd:0.009,sc:2.3,op:0.73,yOff:0.11,tlo:0.36,thi:0.62},{spd:0.013,sc:3.4,op:0.56,yOff:0.21,tlo:0.38,thi:0.64}],
            cc:{dark:'#c8d0e2',light:'#ffffff'},cs:{dark:'#0e1620',light:'#5060a0'},shadowMult:1.65,sunGlow:0.10 },
  rainy:  { layers:[{spd:0.004,sc:1.3,op:0.97,yOff:0.00,tlo:0.26,thi:0.54},{spd:0.006,sc:2.0,op:0.91,yOff:0.06,tlo:0.28,thi:0.56},{spd:0.009,sc:2.8,op:0.76,yOff:0.15,tlo:0.30,thi:0.58}],
            cc:{dark:'#505860',light:'#7888a0'},cs:{dark:'#030406',light:'#182030'},shadowMult:2.80,sunGlow:0.01 },
  snowy:  { layers:[{spd:0.004,sc:1.4,op:0.89,yOff:0.01,tlo:0.30,thi:0.56},{spd:0.007,sc:2.1,op:0.75,yOff:0.11,tlo:0.32,thi:0.58},{spd:0.010,sc:2.9,op:0.57,yOff:0.21,tlo:0.34,thi:0.60}],
            cc:{dark:'#d0dce8',light:'#eef4ff'},cs:{dark:'#303850',light:'#8090b8'},shadowMult:0.95,sunGlow:0.07 },
  cold:   { layers:[{spd:0.009,sc:1.8,op:0.60,yOff:0.05,tlo:0.44,thi:0.66},{spd:0.016,sc:3.1,op:0.45,yOff:0.17,tlo:0.46,thi:0.68}],
            cc:{dark:'#c8d8ec',light:'#e0f0ff'},cs:{dark:'#283858',light:'#5888a8'},shadowMult:0.80,sunGlow:0.14 },
  windy:  { layers:[{spd:0.055,sc:3.2,op:0.44,yOff:0.03,tlo:0.54,thi:0.74},{spd:0.085,sc:5.5,op:0.30,yOff:0.14,tlo:0.56,thi:0.76},{spd:0.115,sc:7.5,op:0.18,yOff:0.24,tlo:0.58,thi:0.78}],
            cc:{dark:'#d0e0f8',light:'#ffffff'},cs:{dark:'#2030a0',light:'#6888d0'},shadowMult:0.36,sunGlow:0.28 },
}

function detectFestivalType(f) {
  if (!f) return null
  const n = (f.name||f.type||'').toLowerCase()
  if (n.includes('tihar'))   return 'tihar'
  if (n.includes('dashain')) return 'dashain'
  if (n.includes('holi'))    return 'holi'
  return 'lantern'
}

// ─────────────────────────────────────────────────────────────────────────────
// BIRD SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
const BIRD_CONDITIONS = new Set(['sunny','windy','dawn','cloudy','hot'])

function buildBirds(condition, W, H, enabled) {
  if (!enabled || !BIRD_CONDITIONS.has(condition)) return []
  const cfgs = {
    sunny:  { count:6,  yRange:[0.06,0.40], spdRange:[0.4,0.9],  flapRange:[2.5,4.0], szRange:[4,7]  },
    windy:  { count:5,  yRange:[0.14,0.46], spdRange:[1.2,2.4],  flapRange:[4.5,7.0], szRange:[3,5]  },
    dawn:   { count:4,  yRange:[0.28,0.58], spdRange:[0.3,0.7],  flapRange:[2.0,3.5], szRange:[3,6]  },
    cloudy: { count:3,  yRange:[0.18,0.48], spdRange:[0.3,0.6],  flapRange:[1.8,3.0], szRange:[3,5]  },
    hot:    { count:3,  yRange:[0.45,0.65], spdRange:[0.2,0.5],  flapRange:[1.5,2.5], szRange:[2,4]  },
  }
  const cfg = cfgs[condition]; if (!cfg) return []
  const skyH = H * 0.72
  return Array.from({ length: cfg.count }, () => {
    const yFrac = cfg.yRange[0] + Math.random() * (cfg.yRange[1] - cfg.yRange[0])
    return {
      x: Math.random() * W * 1.4 - W * 0.2, y: yFrac * skyH,
      vx: (cfg.spdRange[0] + Math.random() * (cfg.spdRange[1] - cfg.spdRange[0])) * (Math.random() < 0.15 ? -1 : 1),
      vy: (Math.random() - 0.5) * 0.12,
      flapRate: cfg.flapRange[0] + Math.random() * (cfg.flapRange[1] - cfg.flapRange[0]),
      flapPhase: Math.random() * Math.PI * 2,
      size: cfg.szRange[0] + Math.random() * (cfg.szRange[1] - cfg.szRange[0]),
      altitude: condition === 'dawn' ? 'rising' : 'fixed',
      wobble: Math.random() * Math.PI * 2,
      wobbleR: 0.02 + Math.random() * 0.06,
    }
  })
}

function drawBirds(ctx, birds, T, W, H) {
  if (!birds.length) return
  const skyH = H * 0.72
  birds.forEach(b => {
    b.x += b.vx
    b.y += b.vy + Math.sin(T * b.wobbleR + b.wobble) * 0.3
    if (b.altitude === 'rising') b.y = Math.max(skyH * 0.06, b.y - 0.04)
    b.y = Math.max(skyH * 0.04, Math.min(skyH * 0.84, b.y))
    if (b.vx > 0 && b.x > W + 30) b.x = -30
    if (b.vx < 0 && b.x < -30)    b.x = W + 30
    const flap = Math.sin(T * b.flapRate + b.flapPhase)
    const span = b.size * 1.6, drop = flap * b.size * 0.55
    const facing = b.vx >= 0 ? 1 : -1
    ctx.save()
    ctx.translate(b.x, b.y); ctx.scale(facing, 1)
    ctx.strokeStyle = 'rgba(10,10,20,0.72)'
    ctx.lineWidth = Math.max(0.7, b.size * 0.20)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(-span*0.5,-drop*0.5,-span,drop); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(span*0.5,-drop*0.5,span,drop); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-b.size*0.7,b.size*0.28); ctx.stroke()
    ctx.restore()
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// LEAF SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
const LEAF_PALETTE = [
  {h:112,s:58,l:28},{h:120,s:62,l:32},{h:128,s:55,l:24},{h:105,s:52,l:30},
  {h:135,s:50,l:20},{h:118,s:60,l:36},{h:100,s:56,l:34},{h:108,s:64,l:26},
  {h:122,s:48,l:22},{h:132,s:52,l:28},{h:88,s:60,l:36},{h:78,s:55,l:40},
  {h:68,s:65,l:44},{h:60,s:70,l:48},{h:32,s:72,l:44},{h:18,s:68,l:40},
]

function buildLeaves(W, H, enabled) {
  if (!enabled) return []
  return Array.from({ length: 7 }, (_, i) => {
    const p = LEAF_PALETTE[i % LEAF_PALETTE.length]
    return {
      x: W + Math.random() * W * 0.5, y: Math.random() * H * 0.68,
      vx: -(1.5 + Math.random() * 3.5), vy: 0.2 + Math.random() * 0.8,
      rot: Math.random() * Math.PI * 2, rv: (Math.random() - 0.5) * 5.0,
      sz: 3.5 + Math.random() * 6.0, asp: 0.35 + Math.random() * 0.30,
      hue: p.h + (Math.random() - 0.5) * 12, sat: p.s + (Math.random() - 0.5) * 10,
      lit: p.l + (Math.random() - 0.5) * 8, alpha: 0.55 + Math.random() * 0.40,
    }
  })
}

function drawLeaves(ctx, leaves, ws, T, W, H) {
  leaves.forEach(l => {
    l.x += l.vx * ws * 1.8; l.y += l.vy + Math.sin(T * 1.8 + l.rot) * 0.38; l.rot += l.rv * ws * 0.038
    if (l.x < -20) { l.x = W + 12; l.y = Math.random() * H * 0.65 }
    ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.rot)
    ctx.fillStyle   = `hsla(${l.hue},${l.sat}%,${l.lit}%,${l.alpha})`
    ctx.strokeStyle = `hsla(${l.hue-5},${l.sat-10}%,${l.lit-12}%,${l.alpha*0.5})`
    ctx.lineWidth = 0.5; ctx.beginPath(); ctx.ellipse(0,0,l.sz,l.sz*l.asp,0,0,Math.PI*2); ctx.fill(); ctx.stroke()
    ctx.strokeStyle = `hsla(${l.hue-8},${l.sat-15}%,${l.lit-18}%,${l.alpha*0.42})`
    ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(-l.sz,0); ctx.lineTo(l.sz,0); ctx.stroke()
    ctx.restore()
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// GRASS SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
function buildGrassBlade(x, layer, W, H) {
  const GH = H * 0.28
  const lp = [
    { rMin:0.28,rMax:0.55,wlo:1.2,whi:2.4,sc:0.82,seedP:0.52 },
    { rMin:0.35,rMax:0.65,wlo:1.8,whi:3.2,sc:0.90,seedP:0.40 },
    { rMin:0.45,rMax:0.78,wlo:2.2,whi:3.8,sc:0.96,seedP:0.28 },
    { rMin:0.55,rMax:0.92,wlo:2.8,whi:4.5,sc:1.00,seedP:0.16 },
  ]
  const p = lp[layer]
  return {
    x, layer, h:(p.rMin+Math.random()*(p.rMax-p.rMin))*GH,
    w:p.wlo+Math.random()*(p.whi-p.wlo), sc:p.sc,
    phase:Math.random()*Math.PI*2, spd:0.5+Math.random()*0.9,
    lean:(Math.random()-0.47)*0.26, crv:(Math.random()-0.5)*0.13,
    hasSeed:Math.random()<p.seedP,
    seedTilt:(Math.random()-0.5)*0.88, seedLen:0.16+Math.random()*0.26,
    hue:88+Math.floor(Math.random()*28), sat:38+Math.floor(Math.random()*22),
    litBase:9+Math.floor(Math.random()*6), litTip:26+Math.floor(Math.random()*14),
    subCount:Math.random()<0.38?1+Math.floor(Math.random()*2):0,
    subAngles:[(Math.random()-0.5)*0.55+0.28,(Math.random()-0.5)*0.55-0.28,(Math.random()-0.5)*0.40],
  }
}

function buildGrassBlades(W, H, totalCount) {
  const ratios = [0.42, 0.29, 0.19, 0.10]
  const counts = ratios.map(r => Math.round(r * totalCount))
  const blades = []
  for (let L = 0; L < 4; L++) {
    for (let i = 0; i < counts[L]; i++) {
      let x; const r = Math.random()
      if (r < 0.08)      x = Math.random() * W * 0.06
      else if (r > 0.92) x = W * 0.94 + Math.random() * W * 0.06
      else               x = Math.random() * W
      blades.push(buildGrassBlade(Math.max(0, Math.min(W, x)), L, W, H))
    }
  }
  return blades.sort((a, b) => a.layer - b.layer)
}

function getWindStrength(condition) {
  return ({ windy:1.25, rainy:0.42, snowy:0.28, cloudy:0.14, hot:0.04 })[condition] ?? 0.09
}

function drawSharpBlade(ctx, baseX, baseY, midX, midY, tipX, tipY, bw, getColor) {
  const segments = 8, points = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, mt = 1 - t
    const cx = mt*mt*baseX + 2*mt*t*midX + t*t*tipX
    const cy = mt*mt*baseY + 2*mt*t*midY + t*t*tipY
    const halfW = bw * 0.5 * Math.pow(1 - t, 1.4)
    const dx = 2*(1-t)*(midX-baseX) + 2*t*(tipX-midX)
    const dy = 2*(1-t)*(midY-baseY) + 2*t*(tipY-midY)
    const len = Math.sqrt(dx*dx + dy*dy) || 1
    points.push({ cx, cy, nx: -dy/len, ny: dx/len, halfW })
  }
  ctx.beginPath()
  ctx.moveTo(points[0].cx + points[0].nx * points[0].halfW, points[0].cy + points[0].ny * points[0].halfW)
  for (let i = 1; i <= segments; i++)
    ctx.lineTo(points[i].cx + points[i].nx * points[i].halfW, points[i].cy + points[i].ny * points[i].halfW)
  for (let i = segments; i >= 0; i--)
    ctx.lineTo(points[i].cx - points[i].nx * points[i].halfW, points[i].cy - points[i].ny * points[i].halfW)
  ctx.closePath()
  const grd = ctx.createLinearGradient(baseX, baseY, tipX, tipY)
  for (let s = 0; s <= 4; s++) grd.addColorStop(s/4, getColor(s/4))
  ctx.fillStyle = grd; ctx.fill()
  ctx.strokeStyle = getColor(0.8).replace('hsl(','hsla(').replace(')',',0.22)')
  ctx.lineWidth = Math.max(0.1, bw * 0.18); ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(baseX, baseY); ctx.quadraticCurveTo(midX, midY, tipX, tipY); ctx.stroke()
}

function drawGrassFrame(ctx2d, blades, birds, leaves, condition, isDark, T, W, H, sk) {
  const ws = getWindStrength(condition)
  const isRain = (sk.rain===1)||condition==='rainy', isFrost = condition==='snowy'||condition==='cold'
  const isHot = condition==='hot', sunBoost = (sk.sa||0) > 0.35 ? 10 : 0, rainDim = isRain ? -8 : 0
  const gH = Math.min(16, H*0.055)
  const grd = ctx2d.createLinearGradient(0,H-gH,0,H)
  if (isDark) { grd.addColorStop(0,'rgba(0,0,0,0)'); grd.addColorStop(1,'hsl(96,18%,5%)') }
  else { grd.addColorStop(0,'rgba(0,0,0,0)'); grd.addColorStop(1,`hsl(90,${42+sunBoost*0.4}%,${9+sunBoost*0.3}%)`) }
  ctx2d.fillStyle=grd; ctx2d.fillRect(0,H-gH,W,gH)
  drawBirds(ctx2d, birds, T, W, H)
  if (condition==='windy') drawLeaves(ctx2d, leaves, ws, T, W, H)
  for (let L=0; L<4; L++) {
    const layerBlades = blades.filter(b=>b.layer===L), dFade = 1 - L*0.13
    layerBlades.forEach(b => {
      const stormX = isRain ? ws*0.55 : 0
      const wB = Math.sin(T*b.spd+b.phase)*ws, wG = Math.sin(T*b.spd*0.32+b.x*0.02)*ws*0.38
      const totalSway = (wB+wG+stormX)*b.h*0.68, midSway = totalSway*0.38
      const baseX = b.x+b.lean*b.h, baseY=H, tipY = H-b.h, midY=H-b.h*0.5
      const midX = baseX+midSway+b.crv*b.h*0.5, tipX = baseX+totalSway, bw = b.w*dFade*b.sc
      if (isDark) {
        const h=b.hue,s=b.sat
        const lB=Math.max(4,Math.min(32,Math.round((b.litBase+sunBoost*0.6)*0.62)))
        const lT=Math.max(10,Math.min(40,Math.round((b.litTip+sunBoost*0.6)*0.62)))
        drawSharpBlade(ctx2d,baseX,baseY,midX,midY,tipX,tipY,bw,t=>`hsl(${h+t*14},${s+t*16}%,${lB+(lT-lB)*t}%)`)
        if (bw>1.2) { ctx2d.strokeStyle=`hsla(${h+14},${s+10}%,${lT+14}%,0.16)`; ctx2d.lineWidth=bw*0.24; ctx2d.lineCap='round'; ctx2d.beginPath(); ctx2d.moveTo(baseX+0.5,baseY); ctx2d.quadraticCurveTo(midX+0.42,midY,tipX+0.32,tipY); ctx2d.stroke() }
      } else {
        const h=b.hue,s=b.sat
        const lB=Math.max(6,Math.min(52,b.litBase+sunBoost+rainDim)), lT=Math.max(18,Math.min(78,b.litTip+sunBoost+rainDim+(isHot?6:0)))
        drawSharpBlade(ctx2d,baseX,baseY,midX,midY,tipX,tipY,bw,t=>`hsl(${h+t*14},${s+t*18}%,${lB+(lT-lB)*t}%)`)
        ctx2d.strokeStyle=`hsla(${h+16},${s+12}%,${lT+20}%,0.26)`; ctx2d.lineWidth=bw*0.28; ctx2d.lineCap='round'
        ctx2d.beginPath(); ctx2d.moveTo(baseX+0.5,baseY); ctx2d.quadraticCurveTo(midX+0.42,midY,tipX+0.32,tipY); ctx2d.stroke()
      }
      if (b.hasSeed) {
        const tA=b.seedTilt+(totalSway/b.h)*0.32, sL=b.seedLen*b.h*0.58
        const sx2=tipX+Math.sin(tA)*sL, sy2=tipY-Math.abs(Math.cos(tA))*sL
        ctx2d.strokeStyle = isDark ? `hsl(${b.hue+6},${b.sat+5}%,${Math.max(10,Math.min(38,Math.round(b.litTip*0.58)))}%)` : `hsl(${b.hue+8},${b.sat+8}%,${Math.max(22,Math.min(72,b.litTip+sunBoost+13))}%)`
        ctx2d.lineWidth=0.65; ctx2d.lineCap='round'; ctx2d.beginPath(); ctx2d.moveTo(tipX,tipY); ctx2d.lineTo(sx2,sy2); ctx2d.stroke()
        const cnt=3+L
        for (let k=0;k<cnt;k++) {
          const fr=k/((cnt-1)||1), bpx=tipX+(sx2-tipX)*(fr*0.78+0.12), bpy=tipY+(sy2-tipY)*(fr*0.78+0.12)
          const bA=tA+(fr-0.5)*1.1+Math.sin(T*1.5+b.phase+k)*ws*0.10, bL=(2.2+L*0.8)*(1-fr*0.35)
          ctx2d.beginPath(); ctx2d.moveTo(bpx,bpy); ctx2d.lineTo(bpx+Math.sin(bA)*bL,bpy-Math.abs(Math.cos(bA))*bL); ctx2d.stroke()
          ctx2d.beginPath(); ctx2d.moveTo(bpx,bpy); ctx2d.lineTo(bpx-Math.sin(bA)*bL*0.65,bpy-Math.abs(Math.cos(bA))*bL*0.65); ctx2d.stroke()
        }
      }
      for (let k=0;k<b.subCount;k++) {
        const ang=b.subAngles[k]||0.3, sMX=baseX+midSway*0.58*ang+b.crv*b.h*0.28*ang, sMY=H-b.h*0.36
        const sTX=baseX+totalSway*0.62*ang, sTY=H-b.h*0.62
        ctx2d.strokeStyle = isDark ? `hsl(${b.hue+3},${b.sat+4}%,${Math.max(4,Math.min(28,Math.round((b.litTip-4)*0.60)))}%)` : `hsl(${b.hue+4},${b.sat+5}%,${Math.max(18,Math.min(62,b.litTip+sunBoost-2))}%)`
        ctx2d.lineWidth=bw*0.40; ctx2d.lineCap='round'; ctx2d.beginPath(); ctx2d.moveTo(baseX,H); ctx2d.quadraticCurveTo(sMX,sMY,sTX,sTY); ctx2d.stroke()
      }
    })
  }
  if (isFrost) {
    for (let i=0;i<60;i++) {
      const b=blades[Math.floor(i*(blades.length/60))]; if(!b) continue
      const bX=b.x+b.lean*b.h, sw=Math.sin(T*b.spd+b.phase)*ws*0.68*b.h
      const t_=0.08+((i*7.3)%0.82), tw=0.5+0.5*Math.sin(T*3+i*0.94)
      ctx2d.fillStyle=`rgba(210,238,255,${(0.3+(i%7)*0.04)*tw*(isDark?0.88:0.68)})`
      ctx2d.beginPath(); ctx2d.arc(bX+sw*t_,H-b.h*t_,(0.5+(i%13)*0.09)*tw,0,Math.PI*2); ctx2d.fill()
    }
  }
  if (isHot||condition==='windy') {
    const GH=H*0.28
    for (let i=0;i<30;i++) {
      const life=((T*0.007+i*0.018)%1), x_=((i/30)*W+T*0.8*(1+i%3))%W, y_=H-life*GH*0.6
      const a_=Math.max(0,0.22*(1-life)); if(a_<0.01) continue
      ctx2d.fillStyle=isDark?`rgba(172,152,112,${a_})`:`rgba(202,178,102,${a_})`
      ctx2d.beginPath(); ctx2d.arc(x_,y_,1.0+(i%3)*0.9,0,Math.PI*2); ctx2d.fill()
    }
  }
  const ef=ctx2d.createLinearGradient(0,H-12,0,H)
  ef.addColorStop(0,'rgba(0,0,0,0)'); ef.addColorStop(1,`rgba(0,0,0,${isDark?0.55:0.22})`)
  ctx2d.fillStyle=ef; ctx2d.fillRect(0,H-12,W,12)
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const SkyCanvas = ({ condition='cloudy', weather=null, isDark=true, onBrightness }) => {
  // ── Centralized tier — no local detection ─────────────────────────────────
  const { tier, config: cfg } = useDeviceTier()

  const mountRef   = useRef(null)
  const sceneRef   = useRef(null)
  const grassRef   = useRef(null)
  const grassRaf   = useRef(null)
  const visibleRef = useRef(true)

  const fpsMsec = 1000 / cfg.fps

  const reducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false

  // LOW tier → CSS-only weather, zero canvas/WebGL
  if (!cfg.useWebGL) {
    return <SkyFallbackCSS condition={condition} isDark={isDark} onBrightness={onBrightness}/>
  }

  const startGrass = useCallback((container, W, H, sk) => {
    if (reducedMotion) return
    if (grassRaf.current) cancelAnimationFrame(grassRaf.current)
    let cv2 = grassRef.current
    if (!cv2) {
      cv2 = document.createElement('canvas')
      cv2.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;border-radius:inherit;'
      container.appendChild(cv2); grassRef.current = cv2
    }
    const DPR = Math.min(window.devicePixelRatio || 1, cfg.dpr)
    cv2.width = Math.round(W * DPR); cv2.height = Math.round(H * DPR)
    const ctx2 = cv2.getContext('2d'); ctx2.scale(DPR, DPR)
    const blades = buildGrassBlades(W, H, cfg.blades)
    const birds  = buildBirds(condition, W, H, cfg.birds)
    const leaves = buildLeaves(W, H, cfg.leaves)
    let tG = 0, lastTs = 0
    const tick = (timestamp) => {
      grassRaf.current = requestAnimationFrame(tick)
      if (timestamp - lastTs < fpsMsec) return
      if (!visibleRef.current) return
      lastTs = timestamp
      ctx2.clearRect(0, 0, W, H)
      drawGrassFrame(ctx2, blades, birds, leaves, condition, isDark, tG, W, H, sk)
      tG += fpsMsec / 1000
    }
    grassRaf.current = requestAnimationFrame(tick)
  }, [condition, isDark, reducedMotion, cfg, fpsMsec])

  const buildScene = useCallback(async (container) => {
    if (!container) return
    const W = container.clientWidth || 360, H = container.clientHeight || 220
    const DPR = Math.min(window.devicePixelRatio || 1, cfg.dpr)
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' })
    renderer.setPixelRatio(DPR); renderer.setSize(W, H)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = isDark ? 0.92 : 1.12
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;border-radius:inherit;z-index:0;'
    container.appendChild(renderer.domElement)
    const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1,1,1,-1,0,1)
    const now = new Date(), h = now.getHours() + now.getMinutes()/60
    const sFrac = Math.max(0, Math.min(1, (h - 5.5) / 13))
    let festival = null, festType = null
    try {
      const festivals = await fetchTodayFestivals()
      const ctx = getTodayContext(null, festivals)
      if (ctx.festivals?.length > 0) { festival = ctx.festivals[0]; festType = detectFestivalType(festival) }
    } catch (_) {}
    const sk = resolveSky(condition, h, !!festival, isDark)
    if (onBrightness) onBrightness(computeBrightness(sk, isDark))
    const sunUV = { x: 0.88 - sFrac * 0.76, y: 0.10 + Math.sin(sFrac * Math.PI) * 0.72 }
    const cloudDensity = sk.cloudDensity ?? 0.5
    const sunOcclude   = Math.max(0, 1 - Math.pow(Math.max(0, cloudDensity - 0.25) / 0.75, 1.5))
    const effectiveSa  = (sk.sa || 0) * sunOcclude
    const bloomExpand  = 1.0 + Math.max(0, cloudDensity - 0.25) * 2.2

    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uZ:{value:new THREE.Color(sk.z)},uH1:{value:new THREE.Color(sk.h1)},uH2:{value:new THREE.Color(sk.h2)},uG:{value:new THREE.Color(sk.g)},
        uSunCol:{value:new THREE.Color(sk.sc)},uSunPos:{value:new THREE.Vector2(sunUV.x,sunUV.y)},
        uSunA:{value:effectiveSa},uBloomExp:{value:bloomExpand},uBright:{value:isDark?0.80:1.0},uTime:{value:0},
      },
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}`,
      fragmentShader:`uniform vec3 uZ,uH1,uH2,uG,uSunCol;uniform vec2 uSunPos;uniform float uSunA,uBright,uTime,uBloomExp;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){float y=vUv.y;vec3 col;if(y<0.22)col=mix(uG,uH2,y/0.22);else if(y<0.48)col=mix(uH2,uH1,(y-0.22)/0.26);else if(y<0.76)col=mix(uH1,uZ,(y-0.48)/0.28);else col=uZ;if(uSunA>0.01){vec2 dv=vUv-uSunPos;dv.x*=1.8;float dist=length(dv);float discR=0.022/uBloomExp;float disc=smoothstep(discR*1.5,discR*0.5,dist);float corona=pow(max(0.,1.-dist*(13./uBloomExp)),2.5)*0.88;float scatter=pow(max(0.,1.-dist*(3.0/uBloomExp)),4.5)*0.32*uBloomExp;float az=abs(vUv.x-uSunPos.x);float hband=pow(max(0.,1.-az*3.5),3.)*smoothstep(0.40,0.,abs(y-0.20))*0.28;col+=uSunCol*(disc+corona+scatter+hband)*uSunA;}col*=uBright;col+=(hash(vUv+uTime*0.001)-0.5)*0.004;gl_FragColor=vec4(clamp(col,0.,1.),1.);}`,
      depthWrite:false,depthTest:false,
    })
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2), skyMat))
    const overlayQ = new THREE.Mesh(new THREE.PlaneGeometry(2,2), new THREE.ShaderMaterial({
      uniforms:{uStr:{value:isDark?0.48:0.28}},
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}`,
      fragmentShader:`uniform float uStr;varying vec2 vUv;void main(){float a=uStr*pow(max(0.,1.-vUv.y*1.80),1.9);gl_FragColor=vec4(0.,0.,0.,clamp(a,0.,0.65));}`,
      transparent:true,depthWrite:false,
    }))
    overlayQ.position.z=0.04; scene.add(overlayQ)

    let starMesh=null
    if(!reducedMotion&&(sk.sta||0)>0.04){
      const SN=tier==='high'?380:180,sPos=new Float32Array(SN*3),sSiz=new Float32Array(SN)
      for(let i=0;i<SN;i++){sPos[i*3]=(Math.random()-0.5)*2.2;sPos[i*3+1]=Math.random()*0.88+0.08;sPos[i*3+2]=0.5;sSiz[i]=1.4+Math.random()*2.8}
      const sg=new THREE.BufferGeometry(); sg.setAttribute('position',new THREE.BufferAttribute(sPos,3)); sg.setAttribute('size',new THREE.BufferAttribute(sSiz,1))
      starMesh=new THREE.Points(sg,new THREE.ShaderMaterial({uniforms:{uAlpha:{value:sk.sta||0},uTime:{value:0}},vertexShader:`attribute float size;uniform float uTime,uAlpha;varying float vA;void main(){float tw=0.6+0.4*sin(uTime*2.2+position.x*5.+position.y*7.);vA=uAlpha*tw;gl_PointSize=size*tw;gl_Position=vec4(position.xy,0.5,1.);}`,fragmentShader:`varying float vA;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(.88,.92,1.,(1.-d)*vA);}`,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}))
      starMesh.position.z=0.05; scene.add(starMesh)
    }

    let moonMesh=null
    if(!reducedMotion&&(sk.ma||0)>0.04&&(h>=20||h<6)){
      const phase=getLunarPhase(now),illum=Math.abs(Math.sin(phase*Math.PI))
      if(illum>0.04){
        const mFrac=Math.max(0,Math.min(1,((h>=20?h-20:h+4))/12))
        const mUV={x:-0.78+mFrac*1.56,y:0.40+Math.sin(mFrac*Math.PI)*0.52}
        moonMesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({
          uniforms:{uAlpha:{value:(sk.ma||0)*illum},uPos:{value:new THREE.Vector2(mUV.x,mUV.y)},uAspect:{value:W/H},uPhase:{value:phase},uBlur:{value:Math.min(2.5,bloomExpand)}},
          vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}`,
          fragmentShader:`uniform float uAlpha,uAspect,uPhase,uBlur;uniform vec2 uPos;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}void main(){vec2 p=(vUv-.5)*vec2(uAspect*2.,2.),mp=uPos*vec2(uAspect,1.);float dist=length(p-mp),moonR=0.075*uBlur;if(dist>moonR*4.)discard;if(dist>moonR){float h2=pow(max(0.,1.-dist/(moonR*4.)),3.)*0.28*uAlpha;if(h2<.003)discard;gl_FragColor=vec4(.5,.62,.88,h2/uBlur);return;}vec2 sp=(p-mp)/moonR;float d=length(sp);float n=noise(sp*5.+1.3)*.14+noise(sp*11.)*.05+noise(sp*22.)*.02;vec3 col=vec3(.95,.90,.78)+n;col*=0.68+0.32*(1.-d*d);float illumFrac=abs(sin(uPhase*3.14159));float shadowDir=uPhase<0.5?-sp.x:sp.x;float shadowEdge=mix(-1.0,0.6,illumFrac);float shadow=smoothstep(shadowEdge,shadowEdge+0.5,shadowDir)*0.97;float edgeSoft=smoothstep(1.0,1.0-0.2*(uBlur-1.),d);float a=(1.-d*d)*edgeSoft*(1.-shadow)*uAlpha;gl_FragColor=vec4(col*(1.-shadow),clamp(a,0.,1.));}`,
          transparent:true,depthWrite:false,
        }))
        moonMesh.position.z=0.06; scene.add(moonMesh)
      }
    }

    const cp=CLOUD_PROFILES[condition]??CLOUD_PROFILES.cloudy
    const cloudCC=cp.cc[isDark?'dark':'light'],cloudCS=cp.cs[isDark?'dark':'light']
    const sunBloom=(sk.sunBloom??0.5)*sunOcclude, cloudMats=[]
    const fbmShader=`float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<${cfg.fbmLoops};i++){v+=a*n(p);p=p*2.1+.7;a*=.5;}return v;}`
    if(!reducedMotion){
      cp.layers.forEach((def,idx)=>{
        const mat=new THREE.ShaderMaterial({
          uniforms:{uTime:{value:0},uSpd:{value:def.spd},uCol:{value:new THREE.Color(cloudCC)},uShadow:{value:new THREE.Color(cloudCS)},uAlpha:{value:def.op*cloudDensity},uSc:{value:def.sc},uTlo:{value:def.tlo??0.44},uThi:{value:def.thi??0.72},uShadowMult:{value:cp.shadowMult??1.0},uSunGlow:{value:cp.sunGlow??0.18},uSunPos:{value:new THREE.Vector2(sunUV.x,sunUV.y)},uSunA:{value:effectiveSa},uSunBloom:{value:sunBloom},uYOff:{value:def.yOff},uSkyTop:{value:new THREE.Color(sk.z)},uSkyBot:{value:new THREE.Color(sk.h2)},uGrassY:{value:0.0}},
          vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}`,
          fragmentShader:`uniform float uTime,uSpd,uAlpha,uSc,uTlo,uThi,uShadowMult,uSunGlow,uSunA,uSunBloom,uYOff,uGrassY;uniform vec2 uSunPos;uniform vec3 uCol,uShadow,uSkyTop,uSkyBot;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}float n(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}${fbmShader}void main(){if(vUv.y<uGrassY)discard;vec2 uv=vec2(vUv.x+uTime*uSpd,vUv.y);float yBase=uGrassY+uYOff*0.22;float yMask=smoothstep(0.,0.18,vUv.y-yBase)*smoothstep(1.,0.48,vUv.y);if(yMask<0.01)discard;float f=fbm(uv*uSc);float cloud=smoothstep(uTlo,uThi,f)*yMask;cloud*=smoothstep(0.,0.07,vUv.x)*smoothstep(1.,0.93,vUv.x);if(cloud<0.006)discard;float lit=smoothstep(uTlo+0.04,uThi,f)*0.85;float shadowStr=(1.-vUv.y)*0.54*uShadowMult;vec3 col=mix(uShadow,uCol,lit);col=mix(col,uShadow*0.20,shadowStr*cloud);float edgeSoft=1.-pow(1.-cloud,3.);col=mix(mix(uSkyBot,uSkyTop,vUv.y),col,edgeSoft);if(uSunA>0.03&&uSunBloom>0.02){vec2 sd=vUv-uSunPos;sd.x*=1.8;float sunDist=length(sd);float bloom=pow(max(0.,1.-sunDist*4.5),3.)*uSunBloom*uSunA;float inner=pow(max(0.,1.-sunDist*9.0),2.5)*bloom;float outer=pow(max(0.,1.-sunDist*3.2),2.)*bloom*0.55;col=mix(col,vec3(1.,0.97,0.90),inner*cloud*0.85);col+=vec3(1.,0.75,0.55)*outer*cloud*0.45;}if(uSunA>0.08&&uSunGlow>0.01){float az=abs(vUv.x-uSunPos.x);col+=vec3(1.,.90,.62)*max(0.,1.-az*5.)*uSunGlow*cloud;}gl_FragColor=vec4(col,cloud*uAlpha);}`,
          transparent:true,depthWrite:false,
        })
        const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat); mesh.position.z=0.07+idx*0.01; scene.add(mesh); cloudMats.push(mat)
      })
    }

    let precipMesh=null
    const isRain=(sk.rain||0)>0,isSnow=(sk.snow||0)>0,PN=isSnow?cfg.snowPN:(isRain?cfg.rainPN:0)
    if(!reducedMotion&&PN>0&&(isRain||isSnow)){
      const pPos=new Float32Array(PN*3),pSeed=new Float32Array(PN)
      for(let i=0;i<PN;i++){pPos[i*3]=(Math.random()-.5)*2.4;pPos[i*3+1]=(Math.random()-.5)*2.4;pPos[i*3+2]=0.9;pSeed[i]=Math.random()}
      const pg=new THREE.BufferGeometry(); pg.setAttribute('position',new THREE.BufferAttribute(pPos,3)); pg.setAttribute('seed',new THREE.BufferAttribute(pSeed,1))
      precipMesh=new THREE.Points(pg,new THREE.ShaderMaterial({uniforms:{uAlpha:{value:isDark?.52:.38},uTime:{value:0},uIsSnow:{value:isSnow?1.:0.}},vertexShader:`attribute float seed;uniform float uTime,uIsSnow;void main(){vec3 p=position;float speed=uIsSnow>.5?0.32:1.75;float drift=uIsSnow>.5?sin(uTime*1.2+seed*6.28)*.045:-seed*.016;float phase=mod(p.y-uTime*speed+seed*2.,2.4)-1.2;p.y=phase;p.x+=drift+(uIsSnow>.5?0.:phase*(-.024));gl_PointSize=(uIsSnow>.5?3.5:1.2)*(0.7+seed*.6);gl_Position=vec4(p.xy,.9,1.);}`,fragmentShader:`uniform float uAlpha,uIsSnow;void main(){vec2 p=gl_PointCoord-.5;float d=length(p);if(d>.5)discard;if(uIsSnow>.5){gl_FragColor=vec4(.88,.93,1.,(1.-d*2.)*(1.-d*2.)*uAlpha*.72);}else{float s=max(0.,1.-abs(p.x)*10.)*max(0.,1.-abs(p.y)*2.5);gl_FragColor=vec4(.65,.78,.92,s*uAlpha*.55);}}`,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}))
      scene.add(precipMesh)
    }

    let fogMesh=null
    if(!reducedMotion&&(sk.fog||0)>0.06){
      fogMesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:{uAlpha:{value:(sk.fog||0)*(isDark?1.:.58)},uTime:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}`,fragmentShader:`uniform float uAlpha,uTime;varying vec2 vUv;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float sn(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*sn(p);p=p*2.+.4;a*=.5;}return v;}void main(){vec2 uv=vec2(vUv.x+uTime*.016,vUv.y+uTime*.006);float f=fbm(uv*2.2);float a=f*uAlpha*smoothstep(0.,.28,vUv.y)*smoothstep(1.,.22,vUv.y);gl_FragColor=vec4(.68,.70,.74,clamp(a,0.,1.));}`,transparent:true,depthWrite:false}))
      fogMesh.position.z=0.11; scene.add(fogMesh)
    }

    // Festival meshes unchanged from v4 — omitted here for brevity, paste from v4
    let festMesh=null
    if(!reducedMotion&&festival){
      if(festType==='tihar'){const DN=28,dp=new Float32Array(DN*3),dc=new Float32Array(DN*3),ds=new Float32Array(DN);for(let i=0;i<DN;i++){dp[i*3]=-1.+(i/DN)*2.;dp[i*3+1]=-.82+Math.sin(i*.9)*.03;dp[i*3+2]=.95;dc[i*3]=1.;dc[i*3+1]=.55+Math.random()*.3;dc[i*3+2]=.05;ds[i]=Math.random()}const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.BufferAttribute(dp,3));dg.setAttribute('color',new THREE.BufferAttribute(dc,3));dg.setAttribute('seed',new THREE.BufferAttribute(ds,1));festMesh=new THREE.Points(dg,new THREE.ShaderMaterial({uniforms:{uTime:{value:0}},vertexShader:`attribute vec3 color;attribute float seed;varying vec3 vC;uniform float uTime;void main(){vC=color;float f=.7+.3*sin(uTime*8.+seed*9.);gl_PointSize=14.*f;gl_Position=vec4(position.xy,.95,1.);}`,fragmentShader:`varying vec3 vC;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vC,pow(1.-d,1.5));}`,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexColors:true}));scene.add(festMesh)
      }else if(festType==='dashain'){const kg=new THREE.Group();const kc=[0xFF2020,0x20AAFF,0xFFEE20,0xFF44AA,0x20FF88,0xFF6820];for(let i=0;i<6;i++){const g2=new THREE.BufferGeometry();g2.setAttribute('position',new THREE.BufferAttribute(new Float32Array([0,.18,0,-.10,0,0,0,-.13,0,.10,0,0]),3));g2.setIndex(new THREE.BufferAttribute(new Uint16Array([0,1,2,0,2,3]),1));const kite=new THREE.Mesh(g2,new THREE.MeshBasicMaterial({color:kc[i%kc.length],side:THREE.DoubleSide,transparent:true,opacity:.9}));kite.position.set(-.65+i*.26,.22+Math.sin(i)*.14,.9);kite.rotation.z=(Math.random()-.5)*.5;kite.userData={bx:-.65+i*.26,by:.22+Math.sin(i)*.14,ph:Math.random()*Math.PI*2,spd:.3+Math.random()*.4};kg.add(kite)}scene.add(kg);festMesh=kg
      }else if(festType==='holi'){const HN=240,hp=new Float32Array(HN*3),hc=new Float32Array(HN*3);for(let i=0;i<HN;i++){hp[i*3]=(Math.random()-.5)*2.2;hp[i*3+1]=(Math.random()-.5)*2.2;hp[i*3+2]=.9;const hue=Math.random();hc[i*3]=.5+hue*.5;hc[i*3+1]=Math.random()*.8;hc[i*3+2]=Math.random()*.6}const hg=new THREE.BufferGeometry();hg.setAttribute('position',new THREE.BufferAttribute(hp,3));hg.setAttribute('color',new THREE.BufferAttribute(hc,3));festMesh=new THREE.Points(hg,new THREE.ShaderMaterial({uniforms:{uTime:{value:0}},vertexShader:`attribute vec3 color;varying vec3 vC;uniform float uTime;void main(){vC=color;vec3 p=position;p.y+=uTime*(-.22+color.r*.10);p.x+=sin(uTime*.6+p.x*3.)*.038;if(p.y<-1.2)p.y+=2.4;gl_PointSize=4.;gl_Position=vec4(p.xy,.9,1.);}`,fragmentShader:`varying vec3 vC;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vC,(1.-d)*.78);}`,transparent:true,depthWrite:false,vertexColors:true}));scene.add(festMesh)
      }else{const LN=20,lp=new Float32Array(LN*3),ls=new Float32Array(LN);for(let i=0;i<LN;i++){lp[i*3]=(Math.random()-.5)*2.2;lp[i*3+1]=(Math.random()-.5)*2.2;lp[i*3+2]=.9;ls[i]=Math.random()}const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.BufferAttribute(lp,3));lg.setAttribute('seed',new THREE.BufferAttribute(ls,1));festMesh=new THREE.Points(lg,new THREE.ShaderMaterial({uniforms:{uTime:{value:0}},vertexShader:`attribute float seed;uniform float uTime;varying float vS;void main(){vS=seed;vec3 p=position;p.y+=uTime*(.11+seed*.055);p.x+=sin(uTime*.6+seed*6.28)*.048;if(p.y>1.2)p.y-=2.4;float f=.7+.3*sin(uTime*5.+seed*9.);gl_PointSize=15.*f;gl_Position=vec4(p.xy,.9,1.);}`,fragmentShader:`varying float vS;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(mix(vec3(1.,.6,.1),vec3(1.,.85,.3),vS),pow(1.-d,1.8));}`,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));scene.add(festMesh)}
    }

    let Tm=0,rafId=null,alive=true,lastWglTs=0
    const tick=(timestamp)=>{
      if(!alive)return; rafId=requestAnimationFrame(tick)
      if(timestamp-lastWglTs<fpsMsec)return
      if(!visibleRef.current)return
      lastWglTs=timestamp; Tm+=fpsMsec/1000
      skyMat.uniforms.uTime.value=Tm
      if(starMesh) starMesh.material.uniforms.uTime.value=Tm
      cloudMats.forEach(m=>{m.uniforms.uTime.value=Tm})
      if(precipMesh) precipMesh.material.uniforms.uTime.value=Tm
      if(fogMesh)    fogMesh.material.uniforms.uTime.value=Tm
      if(festMesh){
        if(festType==='dashain'){festMesh.children?.forEach(k=>{k.position.x=k.userData.bx+Math.sin(Tm*k.userData.spd+k.userData.ph)*0.055;k.position.y=k.userData.by+Math.cos(Tm*k.userData.spd*0.7+k.userData.ph)*0.038;k.rotation.z=Math.sin(Tm*k.userData.spd+k.userData.ph)*0.28})}
        else if(festMesh.material?.uniforms?.uTime){festMesh.material.uniforms.uTime.value=Tm}
      }
      renderer.render(scene,camera)
    }
    tick(0)
    startGrass(container,W,H,sk)
    const onResize=()=>{const nW=container.clientWidth||360,nH=container.clientHeight||220;renderer.setSize(nW,nH);if(moonMesh)moonMesh.material.uniforms.uAspect.value=nW/nH}
    window.addEventListener('resize',onResize)
    sceneRef.current={dispose:()=>{
      alive=false;cancelAnimationFrame(rafId)
      if(grassRaf.current)cancelAnimationFrame(grassRaf.current)
      window.removeEventListener('resize',onResize)
      scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose()}})
      renderer.dispose()
      if(renderer.domElement.parentNode)renderer.domElement.parentNode.removeChild(renderer.domElement)
      if(grassRef.current?.parentNode)grassRef.current.parentNode.removeChild(grassRef.current)
      grassRef.current=null
    }}
  },[condition,isDark,reducedMotion,onBrightness,startGrass,cfg,fpsMsec,tier])

  useEffect(()=>{
    const container=mountRef.current; if(!container)return
    const observer=new IntersectionObserver(([e])=>{visibleRef.current=e.isIntersecting},{threshold:0.01})
    observer.observe(container)
    buildScene(container)
    return()=>{observer.disconnect();if(sceneRef.current?.dispose)sceneRef.current.dispose();sceneRef.current=null}
  },[buildScene])

  return(
    <div ref={mountRef} aria-hidden="true" style={{
      position:'absolute',inset:0,width:'100%',height:'100%',
      borderRadius:'inherit',overflow:'hidden',pointerEvents:'none',zIndex:0,
    }}/>
  )
}

export default SkyCanvas