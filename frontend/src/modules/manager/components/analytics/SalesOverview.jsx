// src/modules/manager/components/analytics/SalesOverview.jsx
// ═══════════════════════════════════════════════════════════════════════════
//  Premium design · Playfair Display + DM Sans · Rich GSAP animations
//  Full dark / light · Espresso / eggshell palette
//  API: GET /reports/sales?days=N  → { summary, byDay, byCategory }
//       GET /reports/staff?days=N  → { waiters }
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useContext, useCallback } from 'react'
import { ThemeContext } from '@shared/context/ThemeContext'
import api from '@api/axios'
import gsap from 'gsap'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  TrendingUp, ShoppingBag, Star, ChefHat,
  Calendar, Flame, BarChart2, RefreshCw, Users,
} from 'lucide-react'
import {
  T, tv, glass, GlassCard, SecHead, Skeleton,
  Divider, AnimCounter, GlobalStyles, BtnPrimary, Input,
} from '../../../../shared/components/ui/ui'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtNum    = (n) => typeof n === 'number' ? n.toLocaleString('en-IN') : '0'
const shortDate = (d) => {
  if (!d) return ''
  const [, m, day] = d.split('-')
  return `${parseInt(day)} ${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m]}`
}
const periodToDays = { today: 1, yesterday: 1, '7d': 7, '30d': 30 }
const PERIODS = [
  { key: 'today', label: 'Today' }, { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: '7 Days' }, { key: '30d', label: '30 Days' }, { key: 'custom', label: 'Custom' },
]
const CAT_COLOR = (i) => `hsl(${28 + i * 22}, 80%, 54%)`

// ─── Chart tooltip ────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ ...glass(isDark, { radius: 12 }), padding: '10px 14px', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: tv(isDark, T.dMuted, T.lMuted), margin: '0 0 6px', fontFamily: 'DM Sans,sans-serif' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ fontSize: 14, fontWeight: 800, color: p.color, margin: '2px 0', fontFamily: 'DM Sans,sans-serif', letterSpacing: '-0.3px' }}>
          {p.dataKey === 'revenue' ? `Rs ${fmtNum(p.value)}` : fmtNum(p.value)}
          <span style={{ fontWeight: 500, fontSize: 10, marginLeft: 5, opacity: 0.6 }}>{p.name}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, prefix, icon: Icon, color, isDark, delay = 0 }) => {
  const cardRef = useRef(null)
  const glowRef = useRef(null)
  const bloomRef = useRef(null)

  useEffect(() => {
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 24, scale: 0.91 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, delay, ease: 'back.out(1.8)' }
    )
  }, [])

  return (
    <div ref={cardRef}
      onMouseEnter={() => {
        gsap.to(cardRef.current, { y: -4, duration: 0.2, ease: 'power2.out' })
        gsap.to(glowRef.current, { opacity: 1, duration: 0.22 })
        gsap.to(bloomRef.current, { scale: 1.35, opacity: 0.85, duration: 0.28 })
      }}
      onMouseLeave={() => {
        gsap.to(cardRef.current, { y: 0, duration: 0.3, ease: 'power2.out' })
        gsap.to(glowRef.current, { opacity: 0, duration: 0.28 })
        gsap.to(bloomRef.current, { scale: 1, opacity: 0.5, duration: 0.28 })
      }}
      style={{
        ...glass(isDark, { radius: 18 }),
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
        borderLeft: `3px solid ${color}`, position: 'relative', overflow: 'hidden', cursor: 'default',
      }}
    >
      <div ref={glowRef} style={{ position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none', background: `radial-gradient(ellipse at 10% 50%, ${color}16 0%, transparent 65%)` }} />
      <div ref={bloomRef} style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, borderRadius: '50%', opacity: 0.5, pointerEvents: 'none', background: `radial-gradient(circle, ${color}22 0%, transparent 70%)` }} />
      <div style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0, background: `linear-gradient(135deg, ${color}1E, ${color}38)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 16px ${color}2E`, position: 'relative', zIndex: 1 }}>
        <Icon size={18} color={color} strokeWidth={2.1} />
      </div>
      <div style={{ minWidth: 0, flex: 1, position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: 10, fontWeight: 700, margin: '0 0 4px', letterSpacing: '0.5px', textTransform: 'uppercase', color: tv(isDark, T.dMuted, T.lMuted), fontFamily: 'DM Sans,sans-serif' }}>{label}</p>
        <p style={{ fontSize: 21, fontWeight: 900, margin: 0, lineHeight: 1, letterSpacing: '-0.8px', color: tv(isDark, T.dText, T.lText), fontFamily: 'DM Sans,sans-serif' }}>
          <AnimCounter value={value} prefix={prefix ?? ''} />
        </p>
      </div>
    </div>
  )
}

// ─── Category row ─────────────────────────────────────────────────────────────
const CatRow = ({ item, rank, max, isDark }) => {
  const rowRef = useRef(null)
  const barRef = useRef(null)
  const pct = max > 0 ? (item.revenue / max) * 100 : 0
  const clr = CAT_COLOR(rank)
  useEffect(() => {
    gsap.fromTo(rowRef.current, { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.45, delay: 0.05 + rank * 0.065, ease: 'power3.out' })
    gsap.fromTo(barRef.current, { scaleX: 0 }, { scaleX: 1, duration: 0.75, delay: 0.15 + rank * 0.065, ease: 'power3.out', transformOrigin: 'left' })
  }, [])
  return (
    <div ref={rowRef} style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 20, height: 20, borderRadius: 7, flexShrink: 0, background: `${clr}22`, color: clr, border: `1px solid ${clr}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, fontFamily: 'DM Sans,sans-serif' }}>{rank + 1}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: tv(isDark, '#E8D9C0', '#2A1A0A'), fontFamily: 'DM Sans,sans-serif' }}>{item.category}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: tv(isDark, T.dMuted, T.lMuted), fontFamily: 'DM Sans,sans-serif' }}>{item.qty}× sold</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: clr, fontFamily: 'DM Sans,sans-serif' }}>Rs {fmtNum(item.revenue)}</span>
        </div>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: tv(isDark, 'rgba(255,255,255,0.06)', 'rgba(0,0,0,0.07)'), overflow: 'hidden' }}>
        <div ref={barRef} style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: `linear-gradient(90deg, ${clr}, ${clr}99)` }} />
      </div>
    </div>
  )
}

// ─── Waiter row ───────────────────────────────────────────────────────────────
const WaiterRow = ({ w, rank, isDark }) => {
  const ref = useRef(null)
  useEffect(() => { gsap.fromTo(ref.current, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.45, delay: 0.05 + rank * 0.07, ease: 'power3.out' }) }, [])
  const medals = ['🥇', '🥈', '🥉']
  const grads = [`${T.saffron}, ${T.terra}`, `${T.matcha}, #1B6B3A`, `${T.purple}, #5848C0`]
  return (
    <div ref={ref}
      onMouseEnter={e => gsap.to(e.currentTarget, { x: 4, duration: 0.18, ease: 'power2.out' })}
      onMouseLeave={e => gsap.to(e.currentTarget, { x: 0, duration: 0.24, ease: 'power2.out' })}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${tv(isDark, 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.05)')}`, cursor: 'default' }}
    >
      <span style={{ fontSize: 15, width: 22, textAlign: 'center', flexShrink: 0 }}>{medals[rank] ?? `#${rank + 1}`}</span>
      <div style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0, background: `linear-gradient(135deg, ${grads[rank] ?? grads[0]})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 14, fontFamily: 'DM Sans,sans-serif', boxShadow: '0 4px 12px rgba(0,0,0,0.22)' }}>
        {(w.name || 'W')[0].toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: tv(isDark, '#F0E4C8', '#1A0E04'), fontFamily: 'DM Sans,sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.name || 'Waiter'}</p>
        <p style={{ fontSize: 10, margin: '1px 0 0', color: tv(isDark, T.dMuted, T.lMuted) }}>{w.calls} orders delivered</p>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: 16, fontWeight: 900, margin: 0, color: T.saffron, letterSpacing: '-0.5px', fontFamily: 'DM Sans,sans-serif' }}>{w.calls}</p>
        <p style={{ fontSize: 10, margin: '1px 0 0', color: tv(isDark, T.dMuted, T.lMuted) }}>Rs {fmtNum(w.revenue)}</p>
      </div>
    </div>
  )
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────
const DayHeatmap = ({ byDay, isDark }) => {
  const cellRefs = useRef([])
  useEffect(() => {
    if (!byDay?.length) return
    gsap.fromTo(cellRefs.current.filter(Boolean),
      { opacity: 0, scale: 0.45, y: 8 },
      { opacity: 1, scale: 1, y: 0, duration: 0.42, stagger: { amount: 0.55 }, ease: 'back.out(1.5)' }
    )
  }, [byDay])
  if (!byDay?.length) return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <Flame size={22} color={tv(isDark, T.dFaint, '#D4BFA0')} strokeWidth={1.5} />
      <p style={{ fontSize: 12, margin: '8px 0 0', color: tv(isDark, T.dMuted, T.lMuted), fontFamily: 'DM Sans,sans-serif' }}>No activity this period</p>
    </div>
  )
  const max = Math.max(...byDay.map(d => d.revenue), 1)
  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
      {byDay.map((d, i) => {
        const v = d.revenue / max
        const bright = v > 0.45
        return (
          <div key={i} ref={el => cellRefs.current[i] = el}
            title={`${shortDate(d.date)} · Rs ${fmtNum(d.revenue)} · ${d.orders} orders`}
            onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.14, zIndex: 2, duration: 0.18, ease: 'back.out(2)' })}
            onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, zIndex: 1, duration: 0.22, ease: 'power2.out' })}
            style={{
              flex: '1 1 calc(14% - 5px)', minWidth: 30, height: 52, borderRadius: 10,
              background: v === 0 ? tv(isDark, 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.04)') : `rgba(255,159,28,${0.07 + v * 0.88})`,
              border: `1px solid ${v > 0 ? `rgba(255,159,28,${0.08 + v * 0.3})` : 'transparent'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, cursor: 'default', position: 'relative',
            }}
          >
            <span style={{ fontSize: 9, fontWeight: 700, color: bright ? '#fff' : tv(isDark, '#7A5C3A', '#A07850'), fontFamily: 'DM Sans,sans-serif' }}>{shortDate(d.date)}</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: bright ? '#fff' : T.saffron, lineHeight: 1, fontFamily: 'DM Sans,sans-serif' }}>{d.orders}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Period pill ──────────────────────────────────────────────────────────────
const PeriodPill = ({ label, active, onClick, isDark }) => {
  const ref = useRef(null)
  return (
    <button ref={ref} onClick={() => {
      gsap.timeline().to(ref.current, { scale: 0.88, duration: 0.08 }).to(ref.current, { scale: 1, duration: 0.32, ease: 'back.out(2.5)' })
      onClick()
    }} style={{
      padding: '7px 15px', borderRadius: 99,
      border: active ? 'none' : `1px solid ${tv(isDark, 'rgba(255,255,255,0.09)', 'rgba(0,0,0,0.09)')}`,
      cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', fontSize: 12,
      fontWeight: active ? 700 : 500,
      background: active ? `linear-gradient(135deg, ${T.saffron}, ${T.terra})` : tv(isDark, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.65)'),
      color: active ? '#fff' : tv(isDark, '#9E7D5A', '#7A5C3A'),
      boxShadow: active ? `0 4px 16px ${T.saffron}44` : 'none',
      transition: 'box-shadow 0.2s',
    }}>{label}</button>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const SalesOverview = () => {
  const { isDark } = useContext(ThemeContext)
  const [period, setPeriod]       = useState('7d')
  const [custom, setCustom]       = useState({ from: '', to: '' })
  const [showCustom, setShowCustom] = useState(false)
  const [summary, setSummary]     = useState(null)
  const [byDay, setByDay]         = useState([])
  const [byCategory, setByCategory] = useState([])
  const [waiters, setWaiters]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const headerRef = useRef(null)
  const gradId    = isDark ? 'sod' : 'sol'
  const axisColor = tv(isDark, '#5A3E25', '#B09070')

  const fetchAll = useCallback(async (p = period, range = custom) => {
    setRefreshing(true)
    try {
      let days = periodToDays[p] ?? 7
      if (p === 'custom' && range.from && range.to)
        days = Math.max(1, Math.min(Math.round((new Date(range.to) - new Date(range.from)) / 86400000) + 1, 90))
      const [sR, stR] = await Promise.allSettled([
        api.get(`/reports/sales?days=${days}`),
        api.get(`/reports/staff?days=${Math.min(days, 30)}`),
      ])
      if (sR.status === 'fulfilled') {
        setSummary(sR.value.summary ?? null)
        setByDay((sR.value.byDay ?? []).map(x => ({ ...x, label: shortDate(x.date) })))
        setByCategory(sR.value.byCategory ?? [])
      }
      if (stR.status === 'fulfilled') setWaiters(stR.value.waiters ?? [])
    } catch {}
    setLoading(false); setRefreshing(false)
  }, [period, custom])

  useEffect(() => {
    fetchAll()
    gsap.fromTo(headerRef.current, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' })
  }, [])

  const handlePeriod = (p) => {
    setPeriod(p)
    if (p === 'custom') { setShowCustom(true); return }
    setShowCustom(false); fetchAll(p)
  }
  const maxCat = Math.max(...byCategory.map(x => x.revenue), 1)

  if (loading) return (
    <div>
      <Skeleton h={34} isDark={isDark} mb={14} radius={10} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[0,1,2,3].map(i => <Skeleton key={i} h={72} isDark={isDark} mb={0} />)}
      </div>
      {[220, 140, 280].map((h, i) => <Skeleton key={i} h={h} isDark={isDark} mb={10} />)}
      <GlobalStyles />
    </div>
  )

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <GlobalStyles />

      {/* Header */}
      <div ref={headerRef} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ fontFamily: 'Playfair Display,serif', fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: '-0.5px', color: tv(isDark, T.dText, T.lText) }}>
            Sales Overview
          </h2>
          <p style={{ fontSize: 11, margin: '3px 0 0', color: tv(isDark, T.dMuted, T.lMuted), letterSpacing: '0.2px' }}>Revenue · Orders · Performance</p>
        </div>
        <button onClick={() => fetchAll()} disabled={refreshing} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 11,
          border: 'none', cursor: 'pointer', background: tv(isDark, 'rgba(255,159,28,0.10)', 'rgba(255,159,28,0.09)'),
          color: T.saffron, fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans,sans-serif',
        }}>
          <RefreshCw size={13} className={refreshing ? 'kc-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Period pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {PERIODS.map(({ key, label }) => (
          <PeriodPill key={key} label={label} active={period === key} onClick={() => handlePeriod(key)} isDark={isDark} />
        ))}
      </div>

      {/* Custom date range */}
      {showCustom && (
        <GlassCard isDark={isDark} style={{ padding: '12px 16px', marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', animation: 'kc-fadein 0.3s ease' }}>
          <Calendar size={13} color={T.saffron} />
          <Input isDark={isDark} type="date" value={custom.from} style={{ width: 'auto', padding: '7px 10px', fontSize: 12 }} onChange={e => setCustom(r => ({ ...r, from: e.target.value }))} />
          <span style={{ fontSize: 11, color: tv(isDark, T.dMuted, T.lMuted) }}>to</span>
          <Input isDark={isDark} type="date" value={custom.to} style={{ width: 'auto', padding: '7px 10px', fontSize: 12 }} onChange={e => setCustom(r => ({ ...r, to: e.target.value }))} />
          <BtnPrimary style={{ padding: '8px 16px', fontSize: 12 }} onClick={() => { if (custom.from && custom.to) { fetchAll('custom', custom); setShowCustom(false) } }}>Apply</BtnPrimary>
        </GlassCard>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <StatCard label="Total Revenue" value={summary?.totalRevenue} prefix="Rs " icon={TrendingUp} color={T.saffron} isDark={isDark} delay={0}    />
        <StatCard label="Total Orders"  value={summary?.totalOrders}             icon={ShoppingBag} color={T.terra}   isDark={isDark} delay={0.07} />
        <StatCard label="Avg Order"     value={summary?.avgOrder}    prefix="Rs " icon={BarChart2}   color={T.matcha}  isDark={isDark} delay={0.14} />
        <StatCard label="Days Tracked"  value={byDay.length}                     icon={Users}       color={T.purple}  isDark={isDark} delay={0.21} />
      </div>

      {/* Trend chart */}
      <GlassCard isDark={isDark} style={{ padding: '16px', marginBottom: 10 }}>
        <SecHead icon={TrendingUp} title="Revenue & Orders Trend" isDark={isDark}
          sub={byDay.length > 0 ? `${shortDate(byDay[0]?.date)} – ${shortDate(byDay.at(-1)?.date)}` : 'No data yet'} />
        {byDay.length > 0 ? (
          <ResponsiveContainer width="100%" height={185}>
            <AreaChart data={byDay} margin={{ top: 4, right: 2, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`rev-${gradId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={T.saffron} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={T.saffron} stopOpacity={0} />
                </linearGradient>
                <linearGradient id={`ord-${gradId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={T.matcha} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={T.matcha} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke={tv(isDark, 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.05)')} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: axisColor, fontFamily: 'DM Sans,sans-serif' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} width={40} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
              <Tooltip content={<ChartTip isDark={isDark} />} />
              <Legend iconType="circle" iconSize={6} formatter={v => <span style={{ fontSize: 10, fontFamily: 'DM Sans,sans-serif', color: axisColor, textTransform: 'capitalize' }}>{v}</span>} />
              <Area type="monotone" dataKey="revenue" name="revenue" stroke={T.saffron} strokeWidth={2.5} fill={`url(#rev-${gradId})`} dot={{ r: 2.5, fill: T.saffron, strokeWidth: 0 }} activeDot={{ r: 5, fill: T.saffron }} />
              <Area type="monotone" dataKey="orders"  name="orders"  stroke={T.matcha}  strokeWidth={2}   fill={`url(#ord-${gradId})`} dot={{ r: 2.5, fill: T.matcha,  strokeWidth: 0 }} activeDot={{ r: 5, fill: T.matcha }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 185, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <TrendingUp size={28} color={tv(isDark, T.dFaint, '#D4BFA0')} strokeWidth={1.3} />
            <p style={{ margin: 0, fontSize: 12, color: tv(isDark, T.dMuted, T.lMuted) }}>No orders this period</p>
          </div>
        )}
      </GlassCard>

      {/* Heatmap */}
      <GlassCard isDark={isDark} style={{ padding: '16px', marginBottom: 10 }}>
        <SecHead icon={Flame} title="Daily Activity" isDark={isDark}
          right={
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ fontSize: 9, color: axisColor, marginRight: 2 }}>Low</span>
              {[0.07, 0.28, 0.54, 0.88].map(v => <div key={v} style={{ width: 12, height: 8, borderRadius: 3, background: `rgba(255,159,28,${v})` }} />)}
              <span style={{ fontSize: 9, color: axisColor, marginLeft: 2 }}>High</span>
            </div>
          }
        />
        <DayHeatmap byDay={byDay} isDark={isDark} />
      </GlassCard>

      {/* Category + Waiter */}
      <GlassCard isDark={isDark} style={{ padding: '16px', marginBottom: 10 }}>
        <SecHead icon={Star} title="Revenue by Category" isDark={isDark}
          sub={byCategory.length > 0 ? `Top ${Math.min(byCategory.length, 6)} categories` : undefined} />
        {byCategory.length > 0 ? (
          <>
            {byCategory.slice(0, 6).map((item, i) => <CatRow key={i} item={item} rank={i} max={maxCat} isDark={isDark} />)}
            <div style={{ marginTop: 12 }}>
              <ResponsiveContainer width="100%" height={95}>
                <BarChart data={byCategory.slice(0, 6)} margin={{ top: 0, right: 2, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke={tv(isDark, 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.04)')} vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 9, fill: axisColor }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: axisColor }} axisLine={false} tickLine={false} width={30} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                  <Tooltip content={<ChartTip isDark={isDark} />} />
                  <Bar dataKey="revenue" name="revenue" radius={[5,5,0,0]}>
                    {byCategory.slice(0,6).map((_,i) => <rect key={i} fill={CAT_COLOR(i)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <p style={{ textAlign: 'center', fontSize: 12, padding: '16px 0', margin: 0, color: tv(isDark, T.dMuted, T.lMuted) }}>No category data yet</p>
        )}

        <Divider isDark={isDark} my={18} />

        <SecHead icon={ChefHat} title="Waiter Performance" isDark={isDark}
          sub={waiters.length > 0 ? `${waiters.length} staff members` : undefined} />
        {waiters.length > 0 ? (
          <>
            {waiters.slice(0, 5).map((w, i) => <WaiterRow key={i} w={w} rank={i} isDark={isDark} />)}
            <div style={{ marginTop: 12 }}>
              <ResponsiveContainer width="100%" height={85}>
                <BarChart data={waiters} margin={{ top: 0, right: 2, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={T.saffron} /><stop offset="100%" stopColor={T.terra} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke={tv(isDark, 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.04)')} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} width={22} />
                  <Tooltip content={<ChartTip isDark={isDark} />} />
                  <Bar dataKey="calls" name="orders" radius={[6,6,0,0]} fill="url(#wg)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <p style={{ textAlign: 'center', fontSize: 12, padding: '14px 0', margin: 0, color: tv(isDark, T.dMuted, T.lMuted) }}>No staff data yet</p>
        )}
      </GlassCard>
    </div>
  )
}

export default SalesOverview