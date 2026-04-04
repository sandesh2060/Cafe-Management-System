// src/modules/customer/components/menu/QuoteOrderCard.jsx
//
// ─── RULES ────────────────────────────────────────────────────────────────────
// 1. No order  → fixed 160px card, quote + dots only, no loading flash
// 2. Has order → replaces card with order view (crossfade, own height)
// 3. "Checking your order" NEVER shows — quote renders on first paint
// 4. Card never grows/shrinks during quote transitions
// 5. "See more" only appears when text genuinely overflows 3 lines
// 6. Crossfade: outgoing fades out while incoming fades in — zero jitter
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useContext, useRef, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { ThemeContext } from "@shared/context/ThemeContext"
import { BRAND, FONTS } from "@shared/config/brand"
import { selectActiveOrder } from "@store/slices/orderSlice"
import { selectUser, selectIsGuest } from "@store/slices/authSlice"
import { ShoppingBag, CreditCard, ChevronRight, ChevronDown, ChevronUp } from "lucide-react"

// ─── Constants ────────────────────────────────────────────────────────────────
const CARD_H   = 160   // fixed quote card height in px
const INTERVAL = 60_000

const ACTIVE_STATUSES  = new Set(["pending","confirmed","preparing","ready","on_the_way","served","delivered"])
const PAYABLE_STATUSES = new Set(["served","delivered"])
const GALLERY_STATUSES = new Set(["pending","confirmed","preparing","ready","on_the_way"])

const STATUS_CFG = {
  pending:    { label:"Order Placed",   emoji:"📋", fill:0.15, speed:0.6, color:"#F59E0B" },
  confirmed:  { label:"Confirmed",      emoji:"✅", fill:0.32, speed:0.9, color:"#10B981" },
  preparing:  { label:"Being Prepared", emoji:"👨‍🍳", fill:0.58, speed:1.6, color:"#3B82F6" },
  ready:      { label:"Ready!",         emoji:"🔔", fill:0.85, speed:2.4, color:"#8B5CF6" },
  on_the_way: { label:"On the Way",     emoji:"🛵", fill:0.78, speed:2.0, color:"#F97316" },
  served:     { label:"Served!",        emoji:"🍽️", fill:1.0,  speed:0.4, color:"#06B6D4" },
  delivered:  { label:"Delivered!",     emoji:"🎉", fill:1.0,  speed:0.4, color:"#06B6D4" },
  cancelled:  { label:"Cancelled",      emoji:"❌", fill:0.0,  speed:0.3, color:"#6B7280" },
}

// ─── Wave canvas ──────────────────────────────────────────────────────────────
function WaveFill({ fillLevel, speed, isDark }) {
  const cvRef   = useRef(null)
  const rafRef  = useRef(null)
  const fillRef = useRef(fillLevel)

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return
    const ctx = cv.getContext("2d")
    const W = cv.offsetWidth || 300, H = cv.offsetHeight || 120
    cv.width = W; cv.height = H
    const draw = (ts) => {
      const t   = ts * 0.001 * speed
      const diff = fillLevel - fillRef.current
      fillRef.current += Math.abs(diff) > 0.001 ? diff * 0.04 : 0
      const f = fillRef.current, yB = H * (1 - f)
      ctx.clearRect(0, 0, W, H)
      ctx.beginPath(); ctx.moveTo(0, H)
      for (let x = 0; x <= W; x += 2)
        ctx.lineTo(x, yB + Math.sin((x/W)*2.8*Math.PI+t*1.8)*5 + Math.sin((x/W)*1.2*Math.PI-t*1.1)*3)
      ctx.lineTo(W, H); ctx.closePath()
      const g = ctx.createLinearGradient(0, yB-10, 0, H)
      if (isDark) { g.addColorStop(0,"rgba(56,189,248,.28)"); g.addColorStop(1,"rgba(2,132,199,.18)") }
      else        { g.addColorStop(0,"rgba(56,189,248,.18)"); g.addColorStop(1,"rgba(2,132,199,.10)") }
      ctx.fillStyle = g; ctx.fill()
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [fillLevel, speed, isDark])

  return <canvas ref={cvRef}
    style={{position:"absolute",inset:0,width:"100%",height:"100%",borderRadius:16,pointerEvents:"none"}}/>
}

// ─── Quote bank ───────────────────────────────────────────────────────────────
const Q = {
  coffee:[
    {t:"First coffee. Then adulting.",e:"☕"},
    {t:"Sip slowly. Life moves fast enough.",e:"☕"},
    {t:"चिया एक कप मात्र — तर असर सारा दिन।",e:"🍵"},
    {t:"Good conversations start with good chai.",e:"🫖"},
    {t:"Life begins after coffee.",e:"☕"},
    {t:"Espresso yourself.",e:"☕"},
    {t:"A cup of tea solves everything. Try it.",e:"🫖"},
    {t:"Masala chiya: proof that spice makes everything better.",e:"🌶️"},
  ],
  food:[
    {t:"Hunger is the best seasoning.",e:"🍜"},
    {t:"You can't buy happiness — but you can order it.",e:"😋"},
    {t:"Good food, good mood. It's that simple.",e:"🌶️"},
    {t:"खाना भनेको माया हो — पकाइएको।",e:"🍲"},
    {t:"Diet starts tomorrow. Today, we feast.",e:"😅"},
    {t:"The secret ingredient is always love. And momos.",e:"🥟"},
    {t:"Dal bhat power — twenty-four hour.",e:"💪"},
    {t:"The best time for momo is always now.",e:"🥟"},
    {t:"Life is too short for bad food.",e:"🙅"},
  ],
  life:[
    {t:"Life is short. Eat the good stuff first.",e:"✨"},
    {t:"Every day is a fresh start. Make it delicious.",e:"🌅"},
    {t:"Slow down. The best moments can't be rushed.",e:"🍃"},
    {t:"You don't need a reason to treat yourself.",e:"🎁"},
    {t:"जिन्दगी छोटो छ, मज्जाले बाँच।",e:"🌸"},
    {t:"Breathe. It's just a bad day, not a bad life.",e:"🌈"},
    {t:"The comeback is always stronger than the setback.",e:"💪"},
    {t:"Happiness is a warm bowl of thukpa on a cold night.",e:"🍜"},
    {t:"You are enough. You have always been enough.",e:"💫"},
  ],
  order:[
    {t:"Good things are on their way to you.",e:"🛵"},
    {t:"Patience is the secret ingredient.",e:"⏱️"},
    {t:"Worth the wait. We promise.",e:"🍽️"},
    {t:"The kitchen is working its magic right now.",e:"✨"},
    {t:"Almost ready. Good things take a little time.",e:"🕐"},
  ],
  morning:[
    {t:"The early bird gets the best table.",e:"🐦"},
    {t:"बिहान चिया र राम्रो सोच — दिन सुरु गर्ने सबैभन्दा राम्रो तरिका।",e:"🍵"},
    {t:"Mornings are for coffee and contemplation.",e:"☕"},
    {t:"Rise up, start fresh. Today has potential.",e:"🌞"},
  ],
  afternoon:[
    {t:"A good lunch is the foundation of a good afternoon.",e:"🍛"},
    {t:"Mid-day reset: eat well, think clearly.",e:"⚡"},
    {t:"दिउँसो खाना ठीकसँग खाए साँझ एकदम राम्रो हुन्छ।",e:"🌞"},
  ],
  evening:[
    {t:"Evenings are proof that endings can be beautiful.",e:"🌇"},
    {t:"साँझको खाना परिवारसँग — यही नै सुख।",e:"🏠"},
    {t:"Dinner isn't just food. It's the pause button on the day.",e:"⏸️"},
    {t:"End your day the way you want the next one to begin.",e:"🌙"},
  ],
  latenight:[
    {t:"Still awake? The night has its own kind of magic.",e:"🌙"},
    {t:"Night owls make the best decisions about food.",e:"🦉"},
    {t:"रात परेको छ, तर भोक नपरेको छैन।",e:"🌙"},
  ],
  weather:{
    sunny: [{t:"Sunny day energy — radiate it.",e:"☀️"},{t:"A bright sky deserves a bright mood.",e:"✨"}],
    rainy: [{t:"Rain outside, warmth inside. Perfect.",e:"🌧️"},{t:"पानी परेको दिन गरमागरम खाना — स्वर्ग।",e:"🫖"},{t:"Monsoon and momos: a love story.",e:"🥟"}],
    cold:  [{t:"Cold weather was invented to justify warm food.",e:"❄️"},{t:"ठन्डीमा तातो खाना — जिन्दगीको सबैभन्दा राम्रो अनुभव।",e:"🔥"}],
    cloudy:[{t:"Cloudy days call for comfort food.",e:"☁️"},{t:"Even grey skies have silver linings — and good meals.",e:"🌥️"}],
    hot:   [{t:"Cool down. You've earned this break.",e:"🌡️"},{t:"The hottest days deserve the coldest drinks.",e:"🧊"}],
    windy: [{t:"The wind brought you here. Good call.",e:"💨"},{t:"हावा चलेको दिन — तातो चिया अनिवार्य।",e:"🍵"}],
    snowy: [{t:"Let it snow — as long as the food is hot.",e:"⛄"},{t:"हिउँमा तातो खाना — स्वर्ग जस्तै।",e:"❄️"}],
  },
  loyal_gold:   [{t:"Gold member. You are the reason we do this.",e:"🥇"},{t:"You could eat anywhere. You keep choosing here.",e:"🏆"}],
  loyal_silver: [{t:"Silver member — taste and loyalty. Rare combo.",e:"🥈"}],
  loyal_bronze: [{t:"Bronze member: you know what you like. We like that.",e:"🥉"}],
  guest:        [{t:"New here? You picked the right place.",e:"👋"},{t:"Every regular was once a first-timer. Welcome.",e:"🌟"}],
  frequent:     [{t:"Back again? That makes our day. Every time.",e:"🎊"},{t:"The familiar face we look forward to. That's you.",e:"😊"}],
  nepali:       [{t:"खाना भनेको माया हो — पकाइएको।",e:"🍲"},{t:"मोमोसँग कहिल्यै झगडा नगर्नू — हारिन्छ।",e:"🥟"},{t:"दाल भात तरकारी — जिन्दगी सारा।",e:"🍲"}],
}

function buildPool({ weather, hour, isGuest, orderCount, hasActiveOrder, loyaltyTier, dow }) {
  if (hasActiveOrder) return Q.order
  const pool = []
  const cond = weather?.condition
  if (cond && Q.weather[cond]) pool.push(...Q.weather[cond])
  if (dow === 1)              pool.push({t:"Monday called. It wants to know your order.",e:"📅"})
  else if (dow === 5)         pool.push({t:"It's Friday. You made it. Time to eat.",e:"🎉"})
  else if (dow===0||dow===6)  pool.push({t:"No alarm. No rush. Just good food.",e:"😌"})
  if (hour < 5)        pool.push(...Q.latenight,...Q.coffee)
  else if (hour < 11)  pool.push(...Q.morning,...Q.coffee)
  else if (hour < 14)  pool.push(...Q.afternoon,...Q.food)
  else if (hour < 18)  pool.push(...Q.afternoon,...Q.life)
  else if (hour < 21)  pool.push(...Q.evening,...Q.food)
  else                 pool.push(...Q.evening,...Q.latenight,...Q.coffee)
  if (loyaltyTier==="gold")   pool.push(...Q.loyal_gold)
  else if (loyaltyTier==="silver") pool.push(...Q.loyal_silver)
  else if (loyaltyTier==="bronze") pool.push(...Q.loyal_bronze)
  if (isGuest||!orderCount)   pool.push(...Q.guest)
  else if (orderCount>=8)     pool.push(...Q.frequent)
  pool.push(...Q.nepali,...Q.life)
  return pool.length ? pool : [...Q.food,...Q.life]
}

function nextQuote(pool, lastIdx) {
  if (!pool.length) return { q:{t:"Good food. Good vibes.",e:"✨"}, idx:0 }
  let idx = Math.floor(Math.random() * pool.length)
  if (pool.length > 1 && idx === lastIdx) idx = (idx+1) % pool.length
  return { q:pool[idx], idx }
}

// ─── TimerRing ────────────────────────────────────────────────────────────────
const TimerRing = ({ progress, color }) => {
  const r = 8, circ = 2*Math.PI*r
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" style={{flexShrink:0}}>
      <circle cx="10" cy="10" r={r} fill="none" stroke={color} strokeOpacity=".15" strokeWidth="1.8"/>
      <circle cx="10" cy="10" r={r} fill="none" stroke={color} strokeOpacity=".7"  strokeWidth="1.8"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ*(1-progress)}
        transform="rotate(-90 10 10)" style={{transition:"stroke-dashoffset 1.1s linear"}}/>
    </svg>
  )
}

// ─── Design tokens ────────────────────────────────────────────────────────────
function useT(isDark) {
  const D = isDark
  return {
    bg:       D ? "rgba(10,18,30,.97)"         : "rgba(240,249,255,.98)",
    border:   D ? "rgba(56,189,248,.14)"        : "rgba(14,165,233,.20)",
    shadow:   D ? "0 4px 28px rgba(0,0,0,.55),0 1px 0 rgba(56,189,248,.08) inset"
                : "0 4px 20px rgba(14,165,233,.10),0 1px 0 rgba(255,255,255,1) inset",
    pri:      D ? "#E0F2FE"  : "#0C2340",
    sec:      D ? "#BAE6FD"  : "#075985",
    mut:      D ? "rgba(186,230,253,.42)" : "rgba(7,89,133,.42)",
    div:      D ? "rgba(56,189,248,.10)"  : "rgba(14,165,233,.12)",
    accent:   D ? "#38BDF8"  : "#0369A1",
    btnBg:    D ? "rgba(56,189,248,.10)"  : "rgba(14,165,233,.08)",
    btnBrd:   D ? "rgba(56,189,248,.20)"  : "rgba(14,165,233,.20)",
    totalBg:  D ? "rgba(14,165,233,.12)"  : "rgba(14,165,233,.08)",
    totalBrd: D ? "rgba(56,189,248,.22)"  : "rgba(14,165,233,.18)",
    totalTxt: D ? "#38BDF8"  : "#0369A1",
    drop:     D ? "rgba(56,189,248,.55)"  : "rgba(14,165,233,.45)",
    qty:      D ? "#38BDF8"  : "#0284C7",
    kitBg:    D ? "rgba(56,189,248,.08)"  : "rgba(14,165,233,.06)",
    kitBrd:   D ? "rgba(56,189,248,.18)"  : "rgba(14,165,233,.16)",
    kitTxt:   D ? "#7DD3FC"  : "#0369A1",
    revBg:    D ? "rgba(251,191,36,.08)"  : "rgba(245,158,11,.06)",
    revBrd:   D ? "rgba(251,191,36,.18)"  : "rgba(245,158,11,.16)",
    revTxt:   D ? "#FCD34D"  : "#B45309",
    dotOff:   D ? "rgba(56,189,248,.18)"  : "rgba(14,165,233,.18)",
    fadeMask: D ? "linear-gradient(to bottom,transparent 30%,rgba(10,18,30,.96) 100%)"
                : "linear-gradient(to bottom,transparent 30%,rgba(240,249,255,.97) 100%)",
    moreBg:   D ? "rgba(56,189,248,.08)"  : "rgba(14,165,233,.07)",
    moreTxt:  D ? "#7DD3FC"  : "#0369A1",
  }
}

const normItem = i => ({
  name:  i?.menuItem?.name ?? i?.name ?? "Item",
  qty:   i?.quantity ?? i?.qty ?? 1,
  price: i?.price ?? i?.menuItem?.price ?? null,
})

const selectHistoryLen = s => s.order?.orderHistory?.length ?? 0

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function QuoteOrderCard({ onViewOrder, onPay }) {
  const { isDark }  = useContext(ThemeContext)
  const T           = useT(isDark)
  const navigate    = useNavigate()
  const activeOrder = useSelector(selectActiveOrder)
  const historyLen  = useSelector(selectHistoryLen)
  const user        = useSelector(selectUser)
  const isGuest     = useSelector(selectIsGuest)

  const isActive  = !!activeOrder && ACTIVE_STATUSES.has(activeOrder?.status)
  const isPayable = isActive && PAYABLE_STATUSES.has(activeOrder?.status)
  const isGallery = isActive && GALLERY_STATUSES.has(activeOrder?.status)
  const cfg       = useMemo(() => STATUS_CFG[activeOrder?.status] ?? STATUS_CFG.pending, [activeOrder?.status])

  const normItems    = useMemo(() => (activeOrder?.items ?? []).map(normItem), [activeOrder?.items])
  const displayItems = normItems.slice(0, 2)
  const extraCount   = Math.max(0, normItems.length - 2)
  const total        = activeOrder?.totalAmount ?? activeOrder?.total ?? null
  const tableLabel   = activeOrder?.tableNumber ?? activeOrder?.table?.number ?? null
  const orderNum     = activeOrder?.orderNumber ?? activeOrder?.displayId ?? null

  // Quote state — A/B slots for crossfade
  const [weather,    setWeather]    = useState(null)
  const [slotA,      setSlotA]      = useState(null)
  const [slotB,      setSlotB]      = useState(null)
  const [live,       setLive]       = useState("A")   // which slot is current
  const [fadeKey,    setFadeKey]    = useState(0)
  const [progress,   setProgress]   = useState(1)
  const [expanded,   setExpanded]   = useState(false)
  const [overflows,  setOverflows]  = useState(false)

  const poolRef    = useRef([])
  const lastIdxRef = useRef(-1)
  const startRef   = useRef(Date.now())
  const timerRef   = useRef(null)
  const tickRef    = useRef(null)
  const measureRef = useRef(null)  // hidden div for overflow detection

  const currentQ  = live === "A" ? slotA : slotB
  const prevQ     = live === "A" ? slotB : slotA
  const isNepali  = /[\u0900-\u097F]/.test(currentQ?.t ?? "")

  // Weather bridge
  useEffect(() => {
    const h = e => setWeather(e.detail)
    window.addEventListener("qoc:weather", h)
    if (window.__qocWeather) setWeather(window.__qocWeather)
    return () => window.removeEventListener("qoc:weather", h)
  }, [])

  // Rebuild pool + first quote whenever context changes
  useEffect(() => {
    const now  = new Date()
    const pool = buildPool({
      weather, hour:now.getHours(), isGuest,
      orderCount:historyLen, hasActiveOrder:isActive,
      loyaltyTier:user?.loyaltyTier, dow:now.getDay(),
    })
    poolRef.current    = pool
    lastIdxRef.current = -1
    const { q, idx }   = nextQuote(pool, -1)
    lastIdxRef.current = idx
    setSlotA(q); setSlotB(null); setLive("A")
    setFadeKey(k => k+1)
    setProgress(1); setExpanded(false)
    startRef.current = Date.now()
  }, [weather, isGuest, historyLen, isActive, user?.loyaltyTier])

  // Advance quote
  const advance = useCallback(() => {
    const { q, idx } = nextQuote(poolRef.current, lastIdxRef.current)
    lastIdxRef.current = idx
    setExpanded(false)
    if (live === "A") { setSlotB(q); setLive("B") }
    else              { setSlotA(q); setLive("A") }
    setFadeKey(k => k+1)
    setProgress(1)
    startRef.current = Date.now()
  }, [live])

  // Auto-advance + progress ring
  useEffect(() => {
    clearInterval(timerRef.current); clearInterval(tickRef.current)
    if (isActive) return
    startRef.current = Date.now()
    timerRef.current = setInterval(advance, INTERVAL)
    tickRef.current  = setInterval(() =>
      setProgress(Math.max(0, 1-(Date.now()-startRef.current)/INTERVAL)), 1000)
    return () => { clearInterval(timerRef.current); clearInterval(tickRef.current) }
  }, [isActive, advance])

  // Overflow detection — runs after currentQ changes
  useEffect(() => {
    if (!measureRef.current || !currentQ) return
    setExpanded(false)
    // rAF so DOM paints the new text first
    const id = requestAnimationFrame(() => {
      const el = measureRef.current; if (!el) return
      const lh = parseFloat(getComputedStyle(el).lineHeight) || 24
      setOverflows(el.scrollHeight > lh * 3 + 6)
    })
    return () => cancelAnimationFrame(id)
  }, [currentQ])

  const goOrder   = useCallback(() => onViewOrder ? onViewOrder() : navigate("/order/status"), [onViewOrder, navigate])
  const goPay     = useCallback(() => onPay       ? onPay()       : navigate("/payment"),       [onPay,       navigate])
  const goGallery = useCallback(() => navigate("/gallery"),  [navigate])
  const goReviews = useCallback(() => navigate("/reviews"),  [navigate])

  return (
    <>
      <style>{`
        .qoc{margin:0 16px 12px;font-family:${FONTS.body}}
        .qoc *{box-sizing:border-box}
        .qoc-btn{display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border-radius:10px;font-size:11.5px;font-weight:600;cursor:pointer;border:1px solid transparent;transition:opacity .15s,transform .12s;white-space:nowrap;outline:none;font-family:${FONTS.body};-webkit-tap-highlight-color:transparent}
        .qoc-btn:active{transform:scale(.93);opacity:.80}
        .qoc-ghost{background:${T.btnBg};border-color:${T.btnBrd};color:${T.sec}}
        .qoc-primary{background:linear-gradient(135deg,#0EA5E9,#0284C7);color:#fff;box-shadow:0 3px 14px rgba(14,165,233,.40)}
        @keyframes qoc-ring{0%{transform:scale(1);opacity:.7}70%,100%{transform:scale(2.4);opacity:0}}
        .qoc-pulse{animation:qoc-ring 2s ease-out infinite}
        @keyframes qoc-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}
        .qoc-shim{position:absolute;top:0;left:0;width:40%;height:100%;background:linear-gradient(105deg,transparent,rgba(255,255,255,.10) 50%,transparent);animation:qoc-shimmer 3.5s ease-in-out infinite;pointer-events:none;border-radius:16px}
        .qoc-lora{font-family:${FONTS.serif};font-style:italic;font-weight:400;letter-spacing:-.005em;margin:0}
        .qoc-clamp{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
      `}</style>

      <div className="qoc">
        {/* ── Outer card shell — FIXED height when quote, auto when order ── */}
        <div style={{
          position:"relative", overflow:"hidden", borderRadius:16,
          background:T.bg, border:`1px solid ${T.border}`, boxShadow:T.shadow,
          // Fixed height only when showing quote, auto when order (order has more content)
          height: isActive ? "auto" : expanded ? "auto" : CARD_H,
          transition:"height .35s cubic-bezier(.4,0,.2,1)",
        }}>
          <div className="qoc-shim"/>

          {/* ════ ORDER VIEW ════ */}
          <AnimatePresence mode="wait">
            {isActive && (
              <motion.div key={`ord-${activeOrder._id}-${activeOrder.status}`}
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                transition={{duration:.30, ease:"easeInOut"}}
                style={{position:"relative"}}>

                {/* Wave background */}
                <div style={{position:"absolute",inset:0,borderRadius:16,overflow:"hidden",pointerEvents:"none"}}>
                  <WaveFill fillLevel={cfg.fill} speed={cfg.speed} isDark={isDark}/>
                </div>

                <div style={{position:"relative",zIndex:1,padding:"13px 15px",display:"flex",flexDirection:"column",gap:9}}>
                  {/* Status */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <div style={{position:"relative",width:10,height:10,flexShrink:0}}>
                        <div className="qoc-pulse" style={{position:"absolute",inset:-3,borderRadius:"50%",border:`1.5px solid ${cfg.color}`}}/>
                        <div style={{width:10,height:10,borderRadius:"50%",background:cfg.color,boxShadow:`0 0 6px ${cfg.color}80`}}/>
                      </div>
                      <span style={{fontSize:11,fontWeight:700,color:cfg.color,letterSpacing:".04em",textTransform:"uppercase",fontFamily:FONTS.body}}>
                        {cfg.emoji} {cfg.label}
                      </span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      {tableLabel && <span style={{fontSize:10,color:T.mut,fontWeight:600,background:T.kitBg,border:`1px solid ${T.kitBrd}`,padding:"2px 7px",borderRadius:6,fontFamily:FONTS.body}}>🪑 {tableLabel}</span>}
                      {orderNum   && <span style={{fontSize:9.5,color:T.mut,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",fontFamily:FONTS.mono}}>#{orderNum}</span>}
                    </div>
                  </div>

                  <div style={{height:1,background:T.div}}/>

                  {/* Items */}
                  <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                    <div style={{flex:1,display:"flex",flexDirection:"column",gap:4}}>
                      <span style={{fontSize:8,fontWeight:700,color:T.mut,textTransform:"uppercase",letterSpacing:".14em",fontFamily:FONTS.body}}>Your Order</span>
                      {displayItems.map((item,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
                          <svg width="6" height="8" viewBox="0 0 7 9" style={{flexShrink:0}}>
                            <path d="M3.5 0C3.5 0 0 3.5 0 5.5A3.5 3.5 0 007 5.5C7 3.5 3.5 0 3.5 0Z" fill={T.drop}/>
                          </svg>
                          <span style={{fontSize:12,fontWeight:600,color:T.pri,flex:1,lineHeight:1.3,fontFamily:FONTS.body}}>
                            {item.qty>1 && <span style={{color:T.qty,fontWeight:800,marginRight:3}}>{item.qty}×</span>}
                            {item.name}
                          </span>
                          {item.price!=null && <span style={{fontSize:11,color:T.mut,flexShrink:0,fontFamily:FONTS.mono}}>{BRAND.currency} {item.price*item.qty}</span>}
                        </div>
                      ))}
                      {extraCount>0 && <span style={{fontSize:11,color:T.mut,paddingLeft:12,fontFamily:FONTS.body}}>+{extraCount} more</span>}
                    </div>
                    {total!=null && (
                      <div style={{flexShrink:0,background:T.totalBg,border:`1px solid ${T.totalBrd}`,borderRadius:10,padding:"7px 11px",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                        <span style={{fontSize:7.5,fontWeight:700,color:T.mut,textTransform:"uppercase",letterSpacing:".12em",fontFamily:FONTS.body}}>Total</span>
                        <span style={{fontSize:15,fontWeight:800,color:T.totalTxt,letterSpacing:"-.04em",lineHeight:1,fontFamily:FONTS.mono}}>{BRAND.currency} {total}</span>
                      </div>
                    )}
                  </div>

                  <div style={{height:1,background:T.div}}/>

                  {/* Buttons */}
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                    <button className="qoc-btn qoc-ghost" onClick={goOrder}><ShoppingBag size={11} strokeWidth={2.4}/> View Order</button>
                    {isGallery && <>
                      <button className="qoc-btn qoc-ghost" onClick={goGallery} style={{background:T.kitBg,borderColor:T.kitBrd,color:T.kitTxt}}>📸 Kitchen</button>
                      <button className="qoc-btn qoc-ghost" onClick={goReviews} style={{background:T.revBg,borderColor:T.revBrd,color:T.revTxt}}>⭐ Reviews</button>
                    </>}
                    {isPayable && <button className="qoc-btn qoc-primary" onClick={goPay}><CreditCard size={11} strokeWidth={2.4}/> Pay Now <ChevronRight size={10} strokeWidth={2.5}/></button>}
                    <span style={{marginLeft:"auto",fontSize:9,fontWeight:700,color:T.mut,letterSpacing:".06em",textTransform:"uppercase",fontFamily:FONTS.mono}}>{Math.round(cfg.fill*100)}%</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ════ QUOTE VIEW ════ */}
          {!isActive && (
            <div style={{
              position:"absolute", inset:0,
              display:"flex", flexDirection:"column",
              // When expanded we need overflow visible — but card height won't change
              // We instead handle expansion via the outer card height transition above
            }}>
              {/* Header row — always static */}
              <div style={{display:"flex",alignItems:"center",padding:"10px 14px 0",gap:6,flexShrink:0}}>
                <TimerRing progress={progress} color={T.accent}/>
                <span style={{fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:".20em",color:T.mut,lineHeight:1,flex:1,fontFamily:FONTS.body}}>
                  Quote of the moment
                </span>
              </div>

              {/*
                Quote body — fills remaining space.
                Both slots (A and B) live here simultaneously.
                The outgoing fades to opacity 0 (absolute), incoming fades to 1 (relative).
                No size change = no jitter.
              */}
              <div style={{flex:1,position:"relative",padding:"8px 14px 0",overflow:"hidden"}}>

                {/* Hidden overflow-detection div */}
                <div ref={measureRef} aria-hidden style={{
                  position:"absolute", visibility:"hidden", pointerEvents:"none",
                  left:14, right:14, top:0,
                  fontFamily:FONTS.serif, fontStyle:"italic", fontSize:13,
                  lineHeight:1.72, letterSpacing:"-.005em",
                }}>
                  {currentQ?.t ?? ""}
                </div>

                {/* OUTGOING — fades out, absolutely positioned so it doesn't affect layout */}
                <AnimatePresence>
                  {prevQ && (
                    <motion.div key={`out-${fadeKey-1}`}
                      initial={{opacity:1}} animate={{opacity:0}} exit={{opacity:0}}
                      transition={{duration:.25,ease:"easeInOut"}}
                      style={{position:"absolute",inset:0,padding:"0 0 0 0",pointerEvents:"none"}}>
                      <QuoteBody q={prevQ} incoming={false} accentC={T.accent} priC={T.pri} animKey={fadeKey-1} clamped/>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* INCOMING — fades in, relative so it sets block height */}
                <motion.div key={`in-${fadeKey}`}
                  initial={{opacity:0}} animate={{opacity:1}}
                  transition={{duration:.35,ease:"easeInOut",delay:prevQ ? .18 : 0}}
                  style={{position:"relative",zIndex:1}}>
                  <QuoteBody q={currentQ} incoming accentC={T.accent} priC={T.pri} animKey={fadeKey}
                    clamped={!expanded} isNepali={isNepali}/>
                </motion.div>

                {/* Bottom fade mask — only when overflowing and not expanded */}
                <AnimatePresence>
                  {overflows && !expanded && (
                    <motion.div key="mask"
                      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                      transition={{duration:.2}}
                      style={{position:"absolute",bottom:0,left:0,right:0,height:44,background:T.fadeMask,pointerEvents:"none"}}/>
                  )}
                </AnimatePresence>
              </div>

              {/* See more / less — only when overflowing */}
              {overflows && (
                <div style={{padding:"2px 14px 0",flexShrink:0}}>
                  <button
                    onClick={() => {
                      setExpanded(e => !e)
                      // Expand the card height dynamically
                      // We do this by toggling a class or direct style — handled via parent height
                    }}
                    style={{
                      display:"inline-flex",alignItems:"center",gap:3,
                      fontSize:10,fontWeight:700,color:T.moreTxt,
                      background:T.moreBg,border:`1px solid ${T.btnBrd}`,
                      borderRadius:7,padding:"3px 9px",cursor:"pointer",
                      outline:"none",fontFamily:FONTS.body,
                      WebkitTapHighlightColor:"transparent",
                    }}
                  >
                    {expanded ? <><ChevronUp size={9} strokeWidth={2.5}/> See less</> : <><ChevronDown size={9} strokeWidth={2.5}/> See more</>}
                  </button>
                </div>
              )}

              {/* Progress dots */}
              <div style={{display:"flex",gap:3.5,padding:"6px 14px 10px",justifyContent:"flex-end",alignItems:"center",flexShrink:0}}>
                {Array.from({length:Math.min(poolRef.current.length,8)},(_,i)=>{
                  const ai = lastIdxRef.current % 8
                  return (
                    <motion.div key={i}
                      animate={{width:i===ai?16:3.5,background:i===ai?T.accent:T.dotOff}}
                      transition={{duration:.45,ease:[.34,1.56,.64,1]}}
                      style={{height:3,borderRadius:99}}/>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// Dynamically expand card when "see more" is tapped
// We patch the outer div height through a ref approach in the parent above.
// Simpler: we drive height from a state:
// The outer div style already does: height: isActive ? "auto" : CARD_H
// For expanded state we need: height: expanded ? "auto" : CARD_H
// Patch: wrap with expanded check
// NOTE: The above component uses `CARD_H` constant for height.
// The "See more" button sets expanded=true, which we need to wire to the outer div.
// Re-export with corrected outer div height logic:

// ─── Quote body ───────────────────────────────────────────────────────────────
function QuoteBody({ q, incoming, accentC, priC, animKey, clamped, isNepali }) {
  if (!q) return null
  const lh = isNepali ? 1.88 : 1.72
  return (
    <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
      {/* Quote marks */}
      <motion.div
        initial={incoming ? {opacity:0,scale:.5,x:-3} : false}
        animate={incoming ? {opacity:1,scale:1,x:0}   : false}
        transition={{duration:.38,ease:[.34,1.56,.64,1],delay:.05}}
        style={{marginTop:3,flexShrink:0}}>
        <svg width="20" height="14" viewBox="0 0 44 30" fill="none">
          <path d="M0 30V18C0 12.4 1.6 8 4.8 4.8C8 1.6 12.4 0 18 0L19.2 2.8C16.4 3.4 14.2 4.7 12.6 6.7C11.1 8.6 10.2 10.8 10.1 13.3H18V30H0Z" fill={accentC} fillOpacity=".22"/>
          <path d="M25 30V18C25 12.4 26.6 8 29.8 4.8C33 1.6 37.4 0 43 0L44.2 2.8C41.4 3.4 39.2 4.7 37.6 6.7C36.1 8.6 35.2 10.8 35.1 13.3H43V30H25Z" fill={accentC} fillOpacity=".22"/>
        </svg>
      </motion.div>

      <div style={{flex:1,minWidth:0}}>
        {/* Emoji */}
        <motion.span
          initial={incoming ? {opacity:0,scale:.3,rotate:-12} : false}
          animate={incoming ? {opacity:1,scale:1,rotate:0}    : false}
          transition={{duration:.38,ease:[.34,1.56,.64,1],delay:.07}}
          style={{display:"inline-block",fontSize:17,lineHeight:1,marginBottom:4}}>
          {q.e ?? "💬"}
        </motion.span>

        {/* Text */}
        <p className={`qoc-lora${clamped ? " qoc-clamp" : ""}`}
          style={{fontSize:13,color:priC,lineHeight:lh}}>
          {incoming
            ? q.t.split(" ").map((w,i)=>(
                <motion.span key={`${animKey}-${i}`}
                  initial={{opacity:0,y:5,filter:"blur(3px)"}}
                  animate={{opacity:1,y:0,filter:"blur(0px)"}}
                  transition={{duration:.28,delay:.08+i*.022,ease:[.22,1,.36,1]}}
                  style={{display:"inline-block",marginRight:".25em"}}>
                  {w}
                </motion.span>
              ))
            : q.t
          }
        </p>
      </div>
    </div>
  )
}