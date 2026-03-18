// src/modules/manager/pages/ManagerDashboard.jsx
//
// ✅ Google Fonts @import in <style> tag removed — ThemeContext already injects
//    FONTS.googleUrl globally. No duplicate font load.
// ✅ Hardcoded 'Playfair Display', 'DM Sans', 'DM Mono' font strings
//    → FONTS.serif / FONTS.body / FONTS.mono
// ✅ Hardcoded 'कौसी चिया' / 'Kausī Chiyā' → BRAND.name
// ✅ Hardcoded 'Rs ' currency → BRAND.currency
// ✅ Local P palette kept intentionally — ManagerDashboard has its own
//    financial-dashboard aesthetic separate from the customer theme
// ✅ All logic, GSAP, motion animations unchanged

import { useState, useEffect, useRef, useContext, useCallback } from 'react'
import {
  motion, AnimatePresence,
  useMotionValue, useSpring, useTransform, useMotionTemplate,
} from 'motion/react'
import { ThemeContext }  from '@shared/context/ThemeContext'
import { BRAND, FONTS }  from '@shared/config/brand'
import { useSelector }   from 'react-redux'
import gsap              from 'gsap'
import api               from '@api/axios'
import DashboardLayout   from '@shared/components/layout/DashboardLayout'
import TableManagementPanel from '../components/tables/TableManagementPanel'
import InventoryPanel    from '../components/inventory/InventoryPanel'
import LoyaltyPanel      from '../components/loyalty/LoyaltyPanel'
import ReportsPanel      from '../components/reports/ReportsPanel'
import StaffList         from '../components/staff/StaffList'
import ManagerMessageHub from '../components/messaging/ManagerMessageHub'
import {
  LayoutDashboard, Users, Map, Package, Star, FileText, MessageSquare,
  TrendingUp, ShoppingBag, IndianRupee, Bell, Clock, Activity,
  ChevronRight, CheckCircle, ArrowUpRight, ArrowDownRight, Coffee, Zap,
} from 'lucide-react'
import { selectUser } from '@store/slices/authSlice'

// ─── Local palette — financial-dashboard aesthetic (intentionally separate) ───
const P = {
  pageBg: '#0D0B09', card: '#161210', cardHi: '#1D1712', cardHov: '#211913',
  orange: '#FF5500', orangeHi: '#FF7733', orangeLo: '#CC3D00', orangeGlo: 'rgba(255,85,0,0.18)',
  green: '#22C55E', blue: '#6366F1', rose: '#F43F5E', amber: '#F59E0B',
  textPri: '#F5F0E8', textSec: '#7A6550', textMut: '#3D2E22', textAcc: '#FF7733',
  border: 'rgba(255,85,0,0.09)', div: 'rgba(255,255,255,0.05)',
  lBg: '#E8DDD0', lCard: '#FAF7F3', lTextPri: '#1A0E04', lTextSec: '#7A5840',
  lBorder: 'rgba(100,50,10,0.20)', lDiv: 'rgba(0,0,0,0.10)',
}

const dk   = (isDark, dark, light) => isDark ? dark : light
const bg   = (isDark) => dk(isDark, P.card, P.lCard)
const bdr  = (isDark) => dk(isDark, P.border, P.lBorder)
const div  = (isDark) => dk(isDark, P.div, P.lDiv)
const tp   = (isDark) => dk(isDark, P.textPri, P.lTextPri)
const ts   = (isDark) => dk(isDark, P.textSec, P.lTextSec)
const tm   = (isDark) => dk(isDark, P.textMut, 'rgba(0,0,0,0.25)')

const cardBase = (isDark, extra = {}) => ({
  background:  bg(isDark),
  border:      `1px solid ${bdr(isDark)}`,
  borderRadius: 18,
  boxShadow:   isDark
    ? '0 1px 4px rgba(0,0,0,0.45)'
    : '0 2px 16px rgba(60,20,0,0.10), 0 1px 4px rgba(60,20,0,0.07)',
  ...extra,
})

const NAV = [
  { key: 'overview',   label: 'Overview',  Icon: LayoutDashboard },
  { key: 'staff',      label: 'Staff',     Icon: Users           },
  { key: 'tables',     label: 'Tables',    Icon: Map             },
  { key: 'inventory',  label: 'Inventory', Icon: Package         },
  { key: 'loyalty',    label: 'Loyalty',   Icon: Star            },
  { key: 'reports',    label: 'Reports',   Icon: FileText        },
  { key: 'messages',   label: 'Messages',  Icon: MessageSquare   },
]

function useBP() {
  const get = () => {
    if (typeof window === 'undefined') return 'desktop'
    return window.innerWidth < 640 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop'
  }
  const [bp, set] = useState(get)
  useEffect(() => {
    const h = () => set(get())
    window.addEventListener('resize', h, { passive: true })
    return () => window.removeEventListener('resize', h)
  }, [])
  return bp
}

function CometCard({ children, style, depth = 12 }) {
  const ref = useRef(null)
  const x = useMotionValue(0), y = useMotionValue(0)
  const xs = useSpring(x, { stiffness: 280, damping: 30 })
  const ys = useSpring(y, { stiffness: 280, damping: 30 })
  const rX = useTransform(ys, [-0.5, 0.5], [`-${depth}deg`, `${depth}deg`])
  const rY = useTransform(xs, [-0.5, 0.5], [`${depth}deg`, `-${depth}deg`])
  const tX = useTransform(xs, [-0.5, 0.5], [`-${depth}px`, `${depth}px`])
  const tY = useTransform(ys, [-0.5, 0.5], [`${depth}px`, `-${depth}px`])
  const gX = useTransform(xs, [-0.5, 0.5], [0, 100])
  const gY = useTransform(ys, [-0.5, 0.5], [0, 100])
  const gBg = useMotionTemplate`radial-gradient(ellipse at ${gX}% ${gY}%, rgba(255,100,30,0.12) 0%, rgba(255,255,255,0.04) 45%, transparent 70%)`
  const onMove = (e) => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    x.set((e.clientX - r.left) / r.width - 0.5)
    y.set((e.clientY - r.top) / r.height - 0.5)
  }
  return (
    <div style={{ perspective: '1000px' }}>
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={() => { x.set(0); y.set(0) }}
        style={{ rotateX: rX, rotateY: rY, translateX: tX, translateY: tY, transformStyle: 'preserve-3d', position: 'relative', ...style }}
        whileHover={{ scale: 1.016, transition: { duration: 0.18 } }}
      >
        {children}
        <motion.div style={{ background: gBg, position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none', zIndex: 30, mixBlendMode: 'overlay' }} />
      </motion.div>
    </div>
  )
}

function AnimNum({ value = 0, prefix = '', suffix = '' }) {
  const el = useRef(null), obj = useRef({ n: 0 })
  useEffect(() => {
    const tgt = parseFloat(String(value).replace(/[^\d.]/g, '')) || 0
    gsap.to(obj.current, {
      n: tgt, duration: 1.6, ease: 'expo.out',
      onUpdate: () => {
        if (el.current) el.current.textContent = `${prefix}${Math.round(obj.current.n).toLocaleString('en-IN')}${suffix}`
      },
    })
  }, [value])
  return <span ref={el}>{prefix}0{suffix}</span>
}

function Sparkline({ data = [], color = P.orange, prefix = '' }) {
  const lineRef = useRef(null), areaRef = useRef(null), dotRef = useRef(null)
  const uid = useRef(`sp_${Math.random().toString(36).slice(2, 8)}`).current
  const raw = data.length >= 2 ? data : [1, 1, 1, 1, 1, 1, 1]
  const real = data.length >= 2
  const mn = Math.min(...raw), mx = Math.max(...raw, mn + 1)
  const W = 200, H = 54
  const xs = raw.map((_, i) => (i / (raw.length - 1)) * W)
  const ys = raw.map(v => 5 + (1 - (v - mn) / (mx - mn)) * (H - 10))
  const line = xs.reduce((acc, x, i) => {
    if (i === 0) return `M${x.toFixed(1)},${ys[i].toFixed(1)}`
    const px = xs[i - 1], py = ys[i - 1], cx = (px + x) / 2
    return `${acc} C${cx.toFixed(1)},${py.toFixed(1)} ${cx.toFixed(1)},${ys[i].toFixed(1)} ${x.toFixed(1)},${ys[i].toFixed(1)}`
  }, '')
  const area = `${line} L${W},${H} L0,${H} Z`
  const lx = xs[xs.length - 1], ly = ys[ys.length - 1]
  const trend = real ? ((raw[raw.length - 1] - raw[0]) / (raw[0] || 1)) * 100 : 0
  const up = trend >= 0

  useEffect(() => {
    if (!lineRef.current) return
    const len = lineRef.current.getTotalLength() || 240
    gsap.set(lineRef.current, { strokeDasharray: len, strokeDashoffset: len })
    gsap.to(lineRef.current, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.out', delay: 0.1 })
    gsap.fromTo(areaRef.current, { opacity: 0 }, { opacity: 1, duration: 0.8, delay: 0.6 })
    gsap.fromTo(dotRef.current, { scale: 0 }, { scale: 1, duration: 0.4, delay: 1.0, ease: 'back.out(3)', transformOrigin: `${lx}px ${ly}px` })
  }, [JSON.stringify(data)])

  const fmt = v => prefix ? `${prefix}${Math.round(v).toLocaleString('en-IN')}` : Math.round(v).toLocaleString('en-IN')
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={real ? 0.35 : 0.04} />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <filter id={`${uid}glow`}><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <path ref={areaRef} d={area} fill={`url(#${uid})`} opacity={0} />
        <path ref={lineRef} d={line} fill="none" stroke={real ? color : `${color}33`} strokeWidth={real ? 2.4 : 1.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={real ? undefined : '4 6'} filter={real ? `url(#${uid}glow)` : undefined} />
        <g ref={dotRef}>
          <circle cx={lx} cy={ly} r={10} fill={color} opacity={0.12} />
          <circle cx={lx} cy={ly} r={4} fill={color} />
          <circle cx={lx} cy={ly} r={4} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth={1.5} />
        </g>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <span style={{ fontSize: 10, fontFamily: FONTS.mono, color: `${color}55`, letterSpacing: '0.2px' }}>{fmt(raw[0])}</span>
        {real ? (
          <span style={{ fontSize: 10, fontWeight: 700, color: up ? P.green : P.rose, display: 'flex', alignItems: 'center', gap: 2, fontFamily: FONTS.body }}>
            {up ? <ArrowUpRight size={11} strokeWidth={2.5} /> : <ArrowDownRight size={11} strokeWidth={2.5} />}
            {Math.abs(Math.round(trend))}%
          </span>
        ) : (
          <span style={{ fontSize: 9, color: `${color}44`, fontFamily: FONTS.body }}>no data yet</span>
        )}
        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: FONTS.mono, color, letterSpacing: '0.2px' }}>{fmt(raw[raw.length - 1])}</span>
      </div>
    </div>
  )
}

function SectionLabel({ children, isDark }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.8px', fontFamily: FONTS.body, color: ts(isDark), whiteSpace: 'nowrap' }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: isDark ? `linear-gradient(90deg, ${bdr(isDark)}, transparent)` : `linear-gradient(90deg, rgba(100,50,10,0.20), transparent)` }} />
    </div>
  )
}

function StatCard({ label, value, prefix = '', icon: Icon, color, sub, graphData, graphPrefix, delay = 0, onClick, isDark }) {
  const ref = useRef(null)
  useEffect(() => {
    gsap.fromTo(ref.current, { opacity: 0, y: 24, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, delay, ease: 'back.out(1.8)' })
  }, [])
  return (
    <div ref={ref} style={{ opacity: 0 }}>
      <CometCard depth={10} style={{ ...cardBase(isDark), overflow: 'hidden' }}>
        <div style={{ height: 2, background: `linear-gradient(90deg, ${color}, ${color}44, transparent)`, borderRadius: '18px 18px 0 0' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: 80, height: 80, background: `radial-gradient(ellipse at 0% 0%, ${color}10, transparent 70%)`, borderRadius: 'inherit', pointerEvents: 'none' }} />
        <div onClick={onClick} style={{ padding: '16px 16px 13px', display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}14`, border: `1px solid ${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={16} color={color} strokeWidth={2.1} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1, letterSpacing: '-1.5px', color: tp(isDark), fontFamily: FONTS.body }}>
                <AnimNum value={value} prefix={prefix} />
              </div>
              <div style={{ fontSize: 9, fontWeight: 800, marginTop: 4, textTransform: 'uppercase', letterSpacing: '1px', color, fontFamily: FONTS.body }}>{label}</div>
              {sub && <div style={{ fontSize: 10, marginTop: 2, color: ts(isDark), fontFamily: FONTS.body }}>{sub}</div>}
            </div>
          </div>
          <Sparkline data={graphData} color={color} prefix={graphPrefix} />
        </div>
      </CometCard>
    </div>
  )
}

function Widget({ title, sub, icon: Icon, color, badge, badgeColor, onClick, delay = 0, isDark, children }) {
  const ref = useRef(null)
  useEffect(() => {
    gsap.fromTo(ref.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.48, delay, ease: 'power3.out' })
  }, [])
  return (
    <div ref={ref} style={{ opacity: 0 }}>
      <CometCard depth={8} style={{ ...cardBase(isDark), overflow: 'hidden' }}>
        <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 15px', cursor: 'pointer', borderBottom: `1px solid ${div(isDark)}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}13`, border: `1px solid ${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={14} color={color} strokeWidth={2.1} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: tp(isDark), fontFamily: FONTS.body, lineHeight: 1.2 }}>{title}</p>
              {sub && <p style={{ fontSize: 10, margin: '2px 0 0', color: ts(isDark), fontFamily: FONTS.body }}>{sub}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {badge != null && (
              <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: `${badgeColor || color}16`, color: badgeColor || color, fontFamily: FONTS.body, border: `1px solid ${badgeColor || color}22`, letterSpacing: '0.3px' }}>
                {badge}
              </span>
            )}
            <ChevronRight size={13} color={tm(isDark)} />
          </div>
        </div>
        <div style={{ padding: '13px 15px 15px' }}>{children}</div>
      </CometCard>
    </div>
  )
}

function TablesWidget({ isDark, go }) {
  const [sess, setSess] = useState([])
  useEffect(() => { api.get('/table-session/active').then(r => setSess(r.data?.sessions ?? r.sessions ?? [])).catch(() => {}) }, [])
  const zClr = { Indoor: P.blue, Outdoor: P.green, Terrace: P.orange }
  const byZone = sess.reduce((a, s) => { const z = s.zone || 'Indoor'; a[z] = (a[z] || 0) + 1; return a }, {})
  return (
    <Widget title="Tables" sub={`${sess.length} active sessions`} icon={Map} color={P.green} badge={sess.length || null} badgeColor={P.green} onClick={() => go('tables')} delay={0.08} isDark={isDark}>
      {sess.length === 0 ? (
        <p style={{ fontSize: 12, color: ts(isDark), margin: 0, fontFamily: FONTS.body }}>No active sessions right now</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 11 }}>
            {Object.entries(byZone).map(([z, c]) => (
              <span key={z} style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: `${zClr[z] || P.green}13`, color: zClr[z] || P.green, fontFamily: FONTS.body, border: `1px solid ${zClr[z] || P.green}20` }}>
                {z} · {c}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {sess.slice(0, 9).map((s, i) => {
              const c = zClr[s.zone || 'Indoor'] || P.green
              return (
                <div key={i} style={{ width: 34, height: 34, borderRadius: 9, background: `${c}13`, border: `1px solid ${c}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: c, fontFamily: FONTS.body, flexShrink: 0 }}>
                  {s.tableNumber ?? i + 1}
                </div>
              )
            })}
            {sess.length > 9 && (
              <div style={{ width: 34, height: 34, borderRadius: 9, background: div(isDark), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: ts(isDark), fontFamily: FONTS.body }}>
                +{sess.length - 9}
              </div>
            )}
          </div>
        </>
      )}
    </Widget>
  )
}

function StaffWidget({ isDark, go }) {
  const [staff, setStaff] = useState([])
  useEffect(() => { api.get('/staff').then(r => setStaff((r.data?.staff ?? r.staff ?? []).slice(0, 5))).catch(() => {}) }, [])
  const rClr = { waiter: P.orange, kitchen: '#F97316', cashier: P.green, manager: P.blue }
  const active = staff.filter(s => s.isActive).length
  return (
    <Widget title="Staff" sub={`${active} currently on duty`} icon={Users} color={P.blue} badge={active || null} badgeColor={P.green} onClick={() => go('staff')} delay={0.12} isDark={isDark}>
      {staff.length === 0 ? (
        <p style={{ fontSize: 12, color: ts(isDark), margin: 0, fontFamily: FONTS.body }}>Loading…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {staff.map(s => {
            const c = rClr[s.role] || P.orange
            return (
              <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg, ${c}CC, ${c}66)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 800, flexShrink: 0, fontFamily: FONTS.body }}>
                  {(s.name || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: tp(isDark), fontFamily: FONTS.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                  <p style={{ fontSize: 10, margin: 0, color: c, fontFamily: FONTS.body, textTransform: 'capitalize' }}>{s.role}</p>
                </div>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.isActive ? P.green : tm(isDark), boxShadow: s.isActive ? `0 0 8px ${P.green}80` : 'none', flexShrink: 0 }} />
              </div>
            )
          })}
        </div>
      )}
    </Widget>
  )
}

function InventoryWidget({ isDark, go }) {
  const [low, setLow] = useState([])
  const [allOk, setAllOk] = useState(true)
  useEffect(() => {
    api.get('/inventory').then(r => {
      const items = r.data?.items ?? r.items ?? []
      const bad = items.filter(i => i.quantity <= i.lowThreshold)
      setLow(bad.slice(0, 4)); setAllOk(bad.length === 0)
    }).catch(() => {})
  }, [])
  return (
    <Widget title="Inventory" sub={allOk ? 'All items stocked' : `${low.length} items running low`} icon={Package} color="#F97316" badge={low.length > 0 ? `${low.length} low` : null} badgeColor={P.rose} onClick={() => go('inventory')} delay={0.14} isDark={isDark}>
      {allOk ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={14} color={P.green} />
          <p style={{ fontSize: 12, margin: 0, fontWeight: 600, color: P.green, fontFamily: FONTS.body }}>All items fully stocked</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {low.map(item => {
            const pct = Math.min(100, (item.quantity / item.lowThreshold) * 100)
            const c = item.quantity === 0 ? P.rose : '#F97316'
            return (
              <div key={item._id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: tp(isDark), fontFamily: FONTS.body }}>{item.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: c, fontFamily: FONTS.mono }}>{item.quantity} {item.unit}</span>
                </div>
                <div style={{ height: 4, borderRadius: 99, background: div(isDark), overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: c, transition: 'width 1s ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Widget>
  )
}

function LoyaltyWidget({ isDark, go }) {
  const [tiers, setTiers] = useState({ gold: 0, silver: 0, bronze: 0 })
  const [top, setTop]     = useState([])
  useEffect(() => {
    api.get('/loyalty/leaderboard').then(r => {
      const lb = r.data?.leaderboard ?? r.leaderboard ?? []
      setTop(lb.slice(0, 3))
      setTiers({ gold: lb.filter(x => x.tier === 'gold').length, silver: lb.filter(x => x.tier === 'silver').length, bronze: lb.filter(x => x.tier === 'bronze').length })
    }).catch(() => {})
  }, [])
  const total = tiers.gold + tiers.silver + tiers.bronze
  return (
    <Widget title="Loyalty" sub={`${total} active members`} icon={Star} color={P.amber} badge={tiers.gold > 0 ? `${tiers.gold} gold` : null} badgeColor={P.amber} onClick={() => go('loyalty')} delay={0.16} isDark={isDark}>
      <div style={{ display: 'flex', gap: 7, marginBottom: 12 }}>
        {[{ label: 'Gold', count: tiers.gold, color: '#D97706', emoji: '🥇' }, { label: 'Silver', count: tiers.silver, color: '#9CA3AF', emoji: '🥈' }, { label: 'Bronze', count: tiers.bronze, color: '#B45309', emoji: '🥉' }].map(({ label, count, color, emoji }) => (
          <div key={label} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 10, background: `${color}10`, border: `1px solid ${color}18` }}>
            <div style={{ fontSize: 16, marginBottom: 2 }}>{emoji}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color, fontFamily: FONTS.body, letterSpacing: '-0.5px' }}>{count}</div>
            <div style={{ fontSize: 9, color: ts(isDark), fontFamily: FONTS.body, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</div>
          </div>
        ))}
      </div>
      {top.map((m, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0', borderTop: `1px solid ${div(isDark)}` }}>
          <span style={{ fontSize: 14, width: 22 }}>{['🥇', '🥈', '🥉'][i]}</span>
          <p style={{ flex: 1, fontSize: 12, fontWeight: 600, margin: 0, color: tp(isDark), fontFamily: FONTS.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.userId?.name ?? 'Member'}</p>
          <span style={{ fontSize: 11, fontWeight: 700, color: P.amber, fontFamily: FONTS.mono }}>{m.points?.toLocaleString('en-IN')} pts</span>
        </div>
      ))}
    </Widget>
  )
}

function RevenueHero({ daily, loading, onClick, isDark }) {
  const ref = useRef(null)
  useEffect(() => { gsap.fromTo(ref.current, { opacity: 0, y: 16, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.5)' }) }, [])
  const pct = Math.min(100, ((daily?.orders ?? 0) / 50) * 100)
  return (
    <div ref={ref} style={{ opacity: 0 }}>
      <CometCard depth={8}>
        <div onClick={onClick} style={{ background: 'linear-gradient(140deg, #FF5500 0%, #CC3300 55%, #991F00 100%)', borderRadius: 18, padding: '20px 20px 18px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -50, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.09)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -40, left: -10, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,200,100,0.07)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.16)', borderRadius: 8, padding: '3px 11px' }}>
                <IndianRupee size={9} color="#fff" />
                <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', fontFamily: FONTS.body, letterSpacing: '0.3px' }}>Today's Revenue</span>
              </div>
              <ArrowUpRight size={16} color="rgba(255,255,255,0.6)" />
            </div>
            <p style={{ fontSize: 38, fontWeight: 900, margin: '0 0 3px', lineHeight: 1, color: '#fff', fontFamily: FONTS.body, letterSpacing: '-1.8px' }}>
              {BRAND.currency} {loading ? '—' : (daily?.revenue ?? 0).toLocaleString('en-IN')}
            </p>
            <p style={{ fontSize: 12, margin: '0 0 16px', color: 'rgba(255,255,255,0.68)', fontFamily: FONTS.body }}>
              {daily?.orders ?? 0} orders · avg {BRAND.currency} {daily?.avgOrderValue ?? 0}
            </p>
            <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.4, ease: 'expo.out', delay: 0.5 }} style={{ height: '100%', borderRadius: 99, background: 'rgba(255,255,255,0.82)' }} />
            </div>
            <p style={{ fontSize: 9, margin: '5px 0 0', color: 'rgba(255,255,255,0.45)', fontFamily: FONTS.body }}>{daily?.orders ?? 0} / 50 daily target</p>
          </div>
        </div>
      </CometCard>
    </div>
  )
}

function OrdersList({ orders, loading, onClick, isDark }) {
  const sClr = { pending: P.orange, preparing: P.blue, delivered: P.green, paid: P.green, cancelled: P.rose }
  return (
    <CometCard depth={5} style={{ ...cardBase(isDark), overflow: 'hidden' }}>
      <div onClick={onClick} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', cursor: 'pointer', borderBottom: `1px solid ${div(isDark)}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Activity size={13} color={P.orange} />
          <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: tp(isDark), fontFamily: FONTS.body }}>Recent Orders</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <motion.div animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} style={{ width: 7, height: 7, borderRadius: '50%', background: P.green, boxShadow: `0 0 7px ${P.green}` }} />
          <span style={{ fontSize: 10, color: P.green, fontWeight: 700, fontFamily: FONTS.body }}>Live</span>
        </div>
      </div>
      <div style={{ maxHeight: 280, overflowY: 'auto', scrollbarWidth: 'none' }}>
        {loading ? (
          [1, 2, 3].map(i => <div key={i} style={{ margin: '8px 14px', height: 42, borderRadius: 9, background: div(isDark), animation: 'kcShimmer 1.5s ease-in-out infinite' }} />)
        ) : orders.length === 0 ? (
          <div style={{ padding: '26px 16px', textAlign: 'center' }}>
            <Coffee size={20} color={tm(isDark)} strokeWidth={1.4} style={{ marginBottom: 8 }} />
            <p style={{ fontSize: 12, color: ts(isDark), margin: 0, fontFamily: FONTS.body }}>No orders today yet</p>
          </div>
        ) : (
          orders.slice(0, 12).map((o, i) => {
            const sc = sClr[o.status] || P.orange
            return (
              <div key={o._id ?? i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 15px', borderBottom: `1px solid ${div(isDark)}`, animation: `kcFadeIn 0.3s ease ${i * 0.05}s both` }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${sc}14`, border: `1px solid ${sc}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, margin: 0, color: tp(isDark), fontFamily: FONTS.body }}>Table {o.tableNumber ?? o.table?.tableNumber ?? '?'}</p>
                  <p style={{ fontSize: 10, margin: '1px 0 0', color: sc, fontFamily: FONTS.body, textTransform: 'capitalize', fontWeight: 600 }}>{o.status ?? 'pending'}</p>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: tp(isDark), fontFamily: FONTS.body, letterSpacing: '-0.3px' }}>
                  {BRAND.currency} {(o.total ?? o.totalAmount ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
            )
          })
        )}
      </div>
    </CometCard>
  )
}

function QuickActions({ go, isDark, cols }) {
  const btns = [
    { label: 'Reports',  Icon: FileText,      color: P.orange, tab: 'reports'  },
    { label: 'Tables',   Icon: Map,           color: P.green,  tab: 'tables'   },
    { label: 'Staff',    Icon: Users,         color: P.blue,   tab: 'staff'    },
    { label: 'Messages', Icon: MessageSquare, color: '#F97316',tab: 'messages' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: 9 }}>
      {btns.map(({ label, Icon, color, tab }, i) => (
        <CometCard key={tab} depth={9} style={{ ...cardBase(isDark), animation: `kcFadeIn 0.35s ease ${i * 0.07}s both`, overflow: 'hidden' }}>
          <div style={{ height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
          <button onClick={() => go(tab)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px 8px', background: 'transparent', border: 'none', color, fontSize: 11, fontWeight: 800, fontFamily: FONTS.body, cursor: 'pointer', letterSpacing: '0.3px' }}>
            <Icon size={13} strokeWidth={2.3} />{label}
          </button>
        </CometCard>
      ))}
    </div>
  )
}

function RightSidebar({ daily, orders, loading, isDark, go }) {
  const ref = useRef(null)
  useEffect(() => { gsap.fromTo(ref.current, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.55, delay: 0.2, ease: 'expo.out' }) }, [])
  return (
    <div ref={ref} style={{ width: 'clamp(238px,24%,272px)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', scrollbarWidth: 'none', paddingBottom: 32 }}>
      <RevenueHero daily={daily} loading={loading} onClick={() => go('reports')} isDark={isDark} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        {[
          { label: 'Waiter Calls',  val: daily?.waiterCalls ?? 0,          Icon: Bell,  color: P.orange, raw: false },
          { label: 'Avg Response',  val: `${daily?.avgResponseMinutes ?? 0}m`, Icon: Clock, color: P.blue,   raw: true  },
        ].map(({ label, val, Icon, color, raw }) => (
          <CometCard key={label} depth={7} style={{ ...cardBase(isDark) }}>
            <div style={{ padding: '13px 13px 12px' }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 9 }}>
                <Icon size={12} color={color} strokeWidth={2.1} />
              </div>
              <p style={{ fontSize: 24, fontWeight: 900, margin: '0 0 2px', letterSpacing: '-0.8px', color: tp(isDark), fontFamily: FONTS.body, lineHeight: 1 }}>
                {raw ? val : <AnimNum value={val} />}
              </p>
              <p style={{ fontSize: 9, margin: 0, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: ts(isDark), fontFamily: FONTS.body }}>{label}</p>
            </div>
          </CometCard>
        ))}
      </div>
      <OrdersList orders={orders} loading={loading} onClick={() => go('reports')} isDark={isDark} />
    </div>
  )
}

function CoffeeCup({ size = 48 }) {
  const root = useRef(null), s1 = useRef(null), s2 = useRef(null), s3 = useRef(null), liq = useRef(null)
  useEffect(() => {
    gsap.fromTo(root.current, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(2.5)', transformOrigin: 'center 80%' })
    const mkSteam = (el, delay, dx) => {
      const tl = gsap.timeline({ repeat: -1, delay })
      tl.set(el, { y: 0, opacity: 0.7, x: 0 })
      tl.to(el, { y: -13, x: dx, opacity: 0, scaleX: 1.4, duration: 1.7, ease: 'power1.out' })
      return tl
    }
    const t1 = mkSteam(s1.current, 0, -2), t2 = mkSteam(s2.current, 0.6, 2), t3 = mkSteam(s3.current, 1.2, -1)
    gsap.to(liq.current, { opacity: 0.45, duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut' })
    return () => { t1.kill(); t2.kill(); t3.kill() }
  }, [])
  return (
    <svg ref={root} width={size} height={size} viewBox="0 0 56 56" fill="none" style={{ display: 'block', flexShrink: 0 }}>
      <defs>
        <linearGradient id="cupBody" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#1C0A02"/><stop offset="100%" stopColor="#0D0502"/></linearGradient>
        <linearGradient id="cupLiq" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#7A3A10"/><stop offset="50%" stopColor="#A05020"/><stop offset="100%" stopColor="#6B2E0C"/></linearGradient>
      </defs>
      <path ref={s1} d="M20 18 C20 16 23 14 23 12 C23 10 20 8 20 6" stroke={P.orange} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path ref={s2} d="M28 17 C28 15 31 13 31 11 C31 9 28 7 28 5" stroke="#FFB060" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path ref={s3} d="M36 18 C36 16 33 14 33 12 C33 10 36 8 36 6" stroke={P.orangeHi} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path d="M10 22 L14 48 H42 L46 22 Z" fill="url(#cupBody)"/>
      <path d="M10 22 L46 22" stroke={P.orange} strokeWidth="2.8" strokeLinecap="round" opacity="0.9"/>
      <ellipse ref={liq} cx="28" cy="24.5" rx="15" ry="3.8" fill="url(#cupLiq)" opacity="0.85"/>
      <path d="M45 30 C53 30 53 42 45 42" stroke={P.orange} strokeWidth="2.2" strokeLinecap="round" fill="none"/>
      <ellipse cx="28" cy="50" rx="20" ry="3" fill={P.orange} opacity="0.08"/>
    </svg>
  )
}

function Background({ isDark }) {
  const b0 = useRef(null), b1 = useRef(null), b2 = useRef(null)
  useEffect(() => {
    const anims = [
      gsap.timeline({ repeat: -1, yoyo: true }).to(b0.current, { x: 55, y: -35, duration: 20, ease: 'sine.inOut' }),
      gsap.timeline({ repeat: -1, yoyo: true, delay: 7 }).to(b1.current, { x: -45, y: 45, duration: 24, ease: 'sine.inOut' }),
      gsap.timeline({ repeat: -1, yoyo: true, delay: 13 }).to(b2.current, { x: 35, y: -40, duration: 17, ease: 'sine.inOut' }),
    ]
    return () => anims.forEach(a => a.kill())
  }, [])
  const base = isDark ? '#0D0B09' : 'linear-gradient(155deg, #E8DDD0 0%, #EDE3D5 50%, #E4D8C8 100%)'
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, background: base, overflow: 'hidden', pointerEvents: 'none' }}>
      {isDark && (
        <>
          <div ref={b0} style={{ position: 'absolute', top: '-5%', left: '-8%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,75,0,0.06) 0%, transparent 65%)', filter: 'blur(80px)' }} />
          <div ref={b1} style={{ position: 'absolute', bottom: '-5%', right: '-8%', width: '45vw', height: '45vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,50,0,0.05) 0%, transparent 65%)', filter: 'blur(90px)' }} />
          <div ref={b2} style={{ position: 'absolute', top: '45%', right: '15%', width: '35vw', height: '35vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,120,0,0.03) 0%, transparent 65%)', filter: 'blur(70px)' }} />
        </>
      )}
    </div>
  )
}

function Overview({ isDark, go }) {
  const bp = useBP()
  const mobile = bp === 'mobile', desktop = bp === 'desktop'
  const user = useSelector(selectUser)
  const [sales, setSales]   = useState(null)
  const [daily, setDaily]   = useState(null)
  const [orders, setOrders] = useState([])
  const [revData, setRevData] = useState([])
  const [ordData, setOrdData] = useState([])
  const [loading, setLoading] = useState(true)
  const root = useRef(null)

  useEffect(() => {
    gsap.fromTo(root.current, { opacity: 0 }, { opacity: 1, duration: 0.45 })
    Promise.allSettled([api.get('/reports/sales?days=7'), api.get('/reports/daily')])
      .then(([s, d]) => {
        if (s.status === 'fulfilled') {
          const sd = s.value?.data ?? s.value ?? {}
          setSales(sd.summary ?? null)
          const bd = sd.byDay ?? []
          setRevData(bd.map(x => x.revenue ?? 0))
          setOrdData(bd.map(x => x.orders ?? 0))
          setOrders(sd.recentOrders ?? [])
        }
        if (d.status === 'fulfilled') {
          const dd = d.value?.data ?? d.value ?? {}
          setDaily({ orders: dd.orders ?? 0, revenue: dd.revenue ?? 0, avgOrderValue: Math.round(dd.avgOrderValue ?? 0), waiterCalls: dd.waiterCalls ?? 0, avgResponseMinutes: dd.avgResponseMinutes ?? 0 })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }
  const avgData = revData.length >= 2 && ordData.length >= 2 ? revData.map((r, i) => ordData[i] > 0 ? Math.round(r / ordData[i]) : 0) : []
  const callData = daily?.waiterCalls ? [0, 0, 0, 0, 0, 0, daily.waiterCalls] : []

  return (
    <div ref={root} style={{ display: 'flex', gap: desktop ? 18 : 0, height: '100%', minHeight: 0 }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: mobile ? 20 : 24, overflowY: 'auto', scrollbarWidth: 'none', paddingBottom: mobile ? 90 : 32 }}>
        {/* Greeting */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <CoffeeCup size={mobile ? 42 : 50} />
            <div>
              <h1 style={{ fontFamily: FONTS.serif, fontSize: mobile ? 21 : 26, fontWeight: 900, margin: '0 0 3px', lineHeight: 1.1, letterSpacing: '-0.6px', color: isDark ? P.textAcc : '#6B2600' }}>
                {greet()}, {user?.name?.split(' ')[0] || 'Manager'} 👋
              </h1>
              <p style={{ fontSize: 11, margin: 0, color: ts(isDark), fontFamily: FONTS.body }}>
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} · {BRAND.name}
              </p>
            </div>
          </div>
          {!mobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 10, background: bg(isDark), border: `1px solid ${bdr(isDark)}` }}>
                <Zap size={11} color={P.orange} />
                <span style={{ fontSize: 11, fontWeight: 600, color: ts(isDark), fontFamily: FONTS.body }}>
                  {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>
          )}
        </div>

        {!desktop && <RevenueHero daily={daily} loading={loading} onClick={() => go('reports')} isDark={isDark} />}

        <div>
          <SectionLabel isDark={isDark}>This Week</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: mobile ? 9 : 12 }}>
            <StatCard label="7D Revenue"   value={sales?.totalRevenue ?? 0} prefix={`${BRAND.currency} `} icon={TrendingUp}  color={P.orange} isDark={isDark} delay={0.04} sub={`${sales?.totalOrders ?? 0} orders`} graphData={revData} graphPrefix={`${BRAND.currency} `} onClick={() => go('reports')} />
            <StatCard label="Avg Order"    value={sales?.avgOrder ?? 0}     prefix={`${BRAND.currency} `} icon={ShoppingBag} color="#F97316"  isDark={isDark} delay={0.09} graphData={avgData} graphPrefix={`${BRAND.currency} `} onClick={() => go('reports')} />
            <StatCard label="Orders Today" value={daily?.orders ?? 0}                                      icon={Activity}    color={P.green}  isDark={isDark} delay={0.14} sub={`avg ${BRAND.currency} ${daily?.avgOrderValue ?? 0}`} graphData={ordData} onClick={() => go('reports')} />
            <StatCard label="Waiter Calls" value={daily?.waiterCalls ?? 0}                                 icon={Bell}        color={P.blue}   isDark={isDark} delay={0.19} sub={daily?.avgResponseMinutes ? `${daily.avgResponseMinutes}m avg` : undefined} graphData={callData} onClick={() => go('reports')} />
          </div>
        </div>

        <div>
          <SectionLabel isDark={isDark}>Operations</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(2,1fr)', gap: 12 }}>
            <TablesWidget isDark={isDark} go={go} />
            <StaffWidget  isDark={isDark} go={go} />
            <InventoryWidget isDark={isDark} go={go} />
            <LoyaltyWidget   isDark={isDark} go={go} />
          </div>
        </div>

        {!desktop && (
          <div>
            <SectionLabel isDark={isDark}>Recent Orders</SectionLabel>
            <OrdersList orders={orders} loading={loading} onClick={() => go('reports')} isDark={isDark} />
          </div>
        )}

        <div>
          <SectionLabel isDark={isDark}>Quick Actions</SectionLabel>
          <QuickActions go={go} isDark={isDark} cols={mobile ? 2 : 4} />
        </div>
      </div>

      {desktop && <RightSidebar daily={daily} orders={orders} loading={loading} isDark={isDark} go={go} />}
    </div>
  )
}

function Section({ active, go }) {
  const { isDark } = useContext(ThemeContext)
  const bp = useBP()
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: 'expo.out' })
  }, [active])
  const PANELS = {
    overview:  <Overview isDark={isDark} go={go} />,
    staff:     <StaffList />,
    tables:    <TableManagementPanel />,
    inventory: <InventoryPanel />,
    loyalty:   <LoyaltyPanel />,
    reports:   <ReportsPanel />,
    messages:  <ManagerMessageHub />,
  }
  const mobile = bp === 'mobile', isOv = active === 'overview'
  return (
    <div ref={ref} style={{ maxWidth: isOv ? '100%' : 880, margin: isOv ? 0 : '0 auto', padding: `16px ${mobile ? '12px' : '22px'} ${mobile ? '20px' : '28px'}`, height: isOv ? '100%' : 'auto', boxSizing: 'border-box' }}>
      {PANELS[active] ?? PANELS.overview}
    </div>
  )
}

export default function ManagerDashboard() {
  const [active, setActive] = useState('overview')
  const { isDark } = useContext(ThemeContext)
  const go = useCallback(k => setActive(k), [])

  return (
    <>
      {/* Only keyframe animations — fonts injected by ThemeContext globally */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes kcFadeIn  { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        @keyframes kcPulse   { 0%,100%{opacity:1} 50%{opacity:0.22} }
        @keyframes kcShimmer { 0%,100%{opacity:0.45} 50%{opacity:0.18} }
      `}</style>
      <Background isDark={isDark} />
      <DashboardLayout role="manager" title={BRAND.name} navItems={NAV} activeNav={active} onNavChange={go}>
        <Section active={active} go={go} />
      </DashboardLayout>
    </>
  )
}