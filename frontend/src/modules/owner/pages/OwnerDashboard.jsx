// frontend/src/modules/owner/pages/OwnerDashboard.jsx
//
// ─── REAL PAGE (replaces placeholder) ────────────────────────────────────────
// Owner dashboard — KPIs, revenue chart, cafe list, recent orders,
// subscription status. Same centralized style system as MenuPage + SA panel.
// Emerald green (#10b981) accent — distinct from cafe orange & SA indigo.
// Uses ThemeContext + FONTS + BRAND. All colors: neutral SA-style tokens.
// GSAP entrance animations. Recharts AreaChart + BarChart.
// ─────────────────────────────────────────────────────────────────────────────

import {
  useState, useEffect, useCallback,
  useRef, useLayoutEffect, useContext,
} from 'react'
import { useNavigate }   from 'react-router-dom'
import { useDispatch }   from 'react-redux'
import { clearAuth }     from '@store/slices/authSlice'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  LayoutDashboard, Store, TrendingUp, CreditCard, LogOut,
  ShoppingBag, Users, ArrowUpRight, ArrowDownRight, RefreshCw,
  ChevronRight, Clock, CheckCircle2, AlertCircle, Building2,
  Settings, Zap, CalendarDays, Wallet,
} from 'lucide-react'
import gsap from 'gsap'
import { ThemeContext } from '@shared/context/ThemeContext'
import { FONTS, BRAND } from '@shared/config/brand'
import api from '@api/axios'

/* ── Emerald owner palette — neutral tokens, theme-aware ────────────────────
   Independent of cafe brand color. Green = owner identity.               */
const mkG = (D) => ({
  accent:   '#10b981',
  accentDk: '#059669',
  accentLt: '#34d399',
  glow:     'rgba(16,185,129,0.25)',
  dim:      D ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)',
  bd:       D ? 'rgba(16,185,129,0.28)' : 'rgba(16,185,129,0.18)',
  amber:    D ? '#fbbf24' : '#d97706',
  amberDim: D ? 'rgba(251,191,36,0.1)'  : 'rgba(217,119,6,0.08)',
  amberBd:  D ? 'rgba(251,191,36,0.2)'  : 'rgba(217,119,6,0.15)',
  red:      D ? '#f87171' : '#dc2626',
  redDim:   D ? 'rgba(248,113,113,0.1)' : 'rgba(220,38,38,0.07)',
  redBd:    D ? 'rgba(248,113,113,0.2)' : 'rgba(220,38,38,0.15)',
  violet:   D ? '#a78bfa' : '#7c3aed',
  // Neutral text — white variants in dark, slate in light
  textPri:  D ? 'rgba(248,250,252,0.95)' : 'rgba(15,23,42,0.9)',
  textSub:  D ? 'rgba(203,213,225,0.8)'  : 'rgba(51,65,85,0.75)',
  textMut:  D ? 'rgba(148,163,184,0.6)'  : 'rgba(100,116,139,0.6)',
  // Surfaces
  bg:       D ? '#080f0c'                : '#f0fdf9',
  cardBg:   D ? 'rgba(15,23,42,0.75)'   : 'rgba(255,255,255,0.9)',
  cardBd:   D ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.1)',
  headerBg: D ? 'rgba(8,15,12,0.94)'    : 'rgba(240,253,249,0.96)',
  headerBd: D ? 'rgba(16,185,129,0.1)'  : 'rgba(16,185,129,0.08)',
  sidebarBg:D ? 'rgba(8,15,12,0.92)'    : 'rgba(240,253,249,0.95)',
  divider:  D ? 'rgba(255,255,255,0.07)': 'rgba(0,0,0,0.06)',
  pillBg:   D ? 'rgba(255,255,255,0.05)': 'rgba(0,0,0,0.04)',
  pillBd:   D ? 'rgba(255,255,255,0.09)': 'rgba(0,0,0,0.07)',
  inputBg:  D ? 'rgba(255,255,255,0.05)': 'rgba(0,0,0,0.04)',
  inputBd:  D ? 'rgba(255,255,255,0.11)': 'rgba(0,0,0,0.1)',
  modalBg:  D ? 'rgba(8,15,12,0.98)'    : 'rgba(255,255,255,0.98)',
  shadow:   D ? '0 8px 32px rgba(0,0,0,0.45)' : '0 4px 20px rgba(16,185,129,0.08)',
})

const STATUS_ORDER = ['pending','preparing','on_the_way','delivered','paid','cancelled']
const STATUS_COLOR = (s, G) => ({
  pending:    { bg: G.amberDim, bd: G.amberBd, c: G.amber },
  preparing:  { bg: G.dim,      bd: G.bd,      c: G.accent },
  on_the_way: { bg: G.dim,      bd: G.bd,      c: G.accentLt },
  delivered:  { bg: G.dim,      bd: G.bd,      c: G.accentLt },
  paid:       { bg: G.dim,      bd: G.bd,      c: G.accent },
  cancelled:  { bg: G.redDim,   bd: G.redBd,   c: G.red },
}[s] || { bg: G.pillBg, bd: G.pillBd, c: G.textMut })

/* ── Sub-components ──────────────────────────────────────────────────────────*/

const Bdg = ({ s, G }) => {
  const t = STATUS_COLOR(s, G)
  return (
    <span style={{
      padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700,
      letterSpacing: '0.07em', textTransform: 'uppercase',
      background: t.bg, border: `1px solid ${t.bd}`, color: t.c,
      fontFamily: FONTS.body,
    }}>
      {s?.replace(/_/g, ' ')}
    </span>
  )
}

const SubStatus = ({ status, daysLeft, G, FONTS }) => {
  const urgent = daysLeft !== null && daysLeft <= 7
  const ok     = status === 'active'
  const trial  = status === 'trial'
  const bg     = ok ? G.dim : trial ? G.amberDim : G.redDim
  const bd     = ok ? G.bd  : trial ? G.amberBd  : G.redBd
  const c      = ok ? G.accent : trial ? G.amber  : G.red
  const Icon   = ok ? CheckCircle2 : trial ? Clock : AlertCircle
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px', borderRadius: 12,
      background: bg, border: `1px solid ${bd}`,
    }}>
      <Icon size={13} style={{ color: c, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: c, fontFamily: FONTS.body, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {status ?? 'unknown'}
        </p>
        {daysLeft !== null && (
          <p style={{ margin: 0, fontSize: 10, color: urgent ? G.red : G.textMut, fontFamily: FONTS.body }}>
            {daysLeft > 0 ? `${daysLeft}d remaining` : 'Expired'}
          </p>
        )}
      </div>
    </div>
  )
}

const Sk = ({ h = 16, w = '60%', r = 10, G }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: G.divider, animation: 'od-pulse 1.5s ease-in-out infinite' }} />
)

const SH = ({ title, sub, action, G }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
        <div style={{ width: 3, height: 18, borderRadius: 4, background: `linear-gradient(180deg,${G.accent},${G.accentDk})`, flexShrink: 0 }} />
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: G.textPri, fontFamily: FONTS.heading, letterSpacing: '-0.02em' }}>
          {title}
        </h2>
      </div>
      {sub && <p style={{ margin: 0, fontSize: 11, color: G.textMut, fontFamily: FONTS.body, paddingLeft: 13 }}>{sub}</p>}
    </div>
    {action}
  </div>
)

const Tip = ({ active, payload, label, G, prefix = 'Rs ' }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: G.modalBg, border: `1px solid ${G.cardBd}`,
      boxShadow: G.shadow, borderRadius: 12,
      padding: '10px 14px', fontSize: 12, fontFamily: FONTS.body,
    }}>
      <p style={{ margin: '0 0 6px', fontSize: 10, color: G.textMut }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: 0, fontWeight: 700, color: p.color ?? G.accent }}>
          {prefix}{p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

const Kpi = ({ label, value, sub, icon: Icon, trend, loading, color, G }) => {
  const ref = useRef(null)
  const c   = color ?? G.accent

  useLayoutEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out', delay: 0.1 + Math.random() * 0.2 }
    )
  }, [])

  return (
    <div ref={ref}
      style={{
        background: G.cardBg, border: `1px solid ${G.cardBd}`,
        borderRadius: 20, padding: '18px 20px',
        boxShadow: G.shadow, opacity: 0,
        display: 'flex', flexDirection: 'column', gap: 12,
        transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = G.bd
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = `0 12px 40px ${G.glow}, ${G.shadow}`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = G.cardBd
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = G.shadow
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: G.textMut, textTransform: 'uppercase', letterSpacing: '0.17em', fontFamily: FONTS.body }}>
          {label}
        </p>
        {Icon && (
          <div style={{ width: 32, height: 32, borderRadius: 10, background: G.dim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={14} strokeWidth={2} style={{ color: c }} />
          </div>
        )}
      </div>
      {loading ? (
        <><Sk G={G} h={28} w="55%" r={8} /><Sk G={G} h={10} w="40%" r={6} /></>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: G.textPri, lineHeight: 1, letterSpacing: '-0.04em', fontFamily: FONTS.heading }}>
            {value ?? '—'}
          </p>
          {(sub || trend !== undefined) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {trend !== undefined && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700, color: trend >= 0 ? G.accent : G.red, fontFamily: FONTS.body }}>
                  {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(trend)}%
                </span>
              )}
              {sub && <p style={{ margin: 0, fontSize: 11, color: G.textMut, fontFamily: FONTS.body }}>{sub}</p>}
            </div>
          )}
        </>
      )}
    </div>
  )
}

const NavBtn = ({ id, label, Icon, active, onClick, G }) => (
  <button onClick={() => onClick(id)} style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
    background: active ? G.dim : 'transparent',
    color: active ? G.accent : G.textMut,
    borderLeft: `2px solid ${active ? G.accent : 'transparent'}`,
    fontFamily: FONTS.body, fontSize: 13, fontWeight: 600,
    textAlign: 'left', width: '100%', transition: 'all 0.15s',
    WebkitTapHighlightColor: 'transparent',
  }}
    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = G.pillBg; e.currentTarget.style.color = G.textPri } }}
    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = G.textMut } }}
  >
    <Icon size={15} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
    <span>{label}</span>
    {active && <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: G.accent }} />}
  </button>
)

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════════════════════════ */
export default function OwnerDashboard() {
  const navigate    = useNavigate()
  const dispatch    = useDispatch()
  const { isDark: D } = useContext(ThemeContext)
  const G = mkG(D)

  const [tab, setTab]         = useState('overview')
  const [dash, setDash]       = useState(null)
  const [chart, setChart]     = useState(null)
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [mobileNav, setMobileNav] = useState(false)
  const [chartDays, setChartDays] = useState(30)

  const wrapRef   = useRef(null)
  const headerRef = useRef(null)
  const sideRef   = useRef(null)
  const mainRef   = useRef(null)

  /* ── Entrance ── */
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.fromTo(headerRef.current, { y: -24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55 }, 0)
      tl.fromTo(sideRef.current,   { x: -18, opacity: 0 }, { x: 0,  opacity: 1, duration: 0.55 }, 0.1)
      tl.fromTo(mainRef.current,   { y: 20,  opacity: 0 }, { y: 0,  opacity: 1, duration: 0.55 }, 0.18)
    }, wrapRef)
    return () => ctx.revert()
  }, [])

  /* ── Tab crossfade ── */
  const animMain = useCallback(() => {
    if (!mainRef.current) return
    gsap.fromTo(mainRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.28, ease: 'power3.out' })
  }, [])

  const go = useCallback((t) => {
    if (!mainRef.current) { setTab(t); return }
    gsap.to(mainRef.current, {
      opacity: 0, y: -6, duration: 0.12, ease: 'power2.in',
      onComplete: () => { setTab(t); setTimeout(animMain, 20) },
    })
  }, [animMain])

  /* ── Data ── */
  useEffect(() => {
    api.get('/owner/dashboard')
      .then(r => setDash(r.data?.data ?? r.data ?? r))
      .catch(e => {
        if (e.response?.status === 401 || e.response?.status === 403)
          navigate('/owner/login', { replace: true })
      })
      .finally(() => setLoading(false))
  }, [navigate])

  useEffect(() => {
    if (tab !== 'orders') return
    api.get('/owner/orders/recent')
      .then(r => setOrders((r.data?.data ?? r.data)?.orders ?? []))
      .catch(() => {})
  }, [tab])

  useEffect(() => {
    if (tab !== 'revenue') return
    api.get(`/owner/revenue/chart?days=${chartDays}`)
      .then(r => setChart((r.data?.data ?? r.data)?.chartData ?? []))
      .catch(() => {})
  }, [tab, chartDays])

  const logout = async () => {
    try { await api.post('/owner/logout') } catch {}
    // ★ FIX: clear Redux auth state so role:'owner' doesn't persist
    // Without this, GuestRoute sees isLoggedIn:true and redirects to /owner
    // causing a redirect loop after logout
    dispatch(clearAuth())
    navigate('/owner/login', { replace: true })
  }

  const o   = dash?.overview ?? {}
  const sub = dash?.subscription ?? {}
  const cafes = dash?.cafes ?? []
  const owner = dash?.owner ?? {}

  const NAV = [
    { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
    { id: 'cafes',    label: 'My Cafes', Icon: Store },
    { id: 'revenue',  label: 'Revenue',  Icon: TrendingUp },
    { id: 'orders',   label: 'Orders',   Icon: ShoppingBag },
    { id: 'billing',  label: 'Billing',  Icon: CreditCard },
  ]

  /* ── Shared btn ── */
  const PillBtn = ({ children, onClick, style = {} }) => (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '7px 14px', borderRadius: 10, border: `1px solid ${G.pillBd}`,
      background: G.pillBg, color: G.textMut, fontSize: 11, fontWeight: 600,
      fontFamily: FONTS.body, cursor: 'pointer', transition: 'all 0.15s',
      WebkitTapHighlightColor: 'transparent', ...style,
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = G.bd; e.currentTarget.style.color = G.accent }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = G.pillBd; e.currentTarget.style.color = G.textMut }}
    >
      {children}
    </button>
  )

  return (
    <div ref={wrapRef} style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: G.bg, fontFamily: FONTS.body, color: G.textPri }}>
      <style>{`
        @keyframes od-pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }
        @keyframes od-spin { to{transform:rotate(360deg)} }
      `}</style>

      {/* ── Header ── */}
      <header ref={headerRef} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', position: 'sticky', top: 0, zIndex: 50, flexShrink: 0,
        background: G.headerBg, borderBottom: `1px solid ${G.headerBd}`,
        backdropFilter: 'blur(20px) saturate(150%)', WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        opacity: 0,
      }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="lg-hide" onClick={() => setMobileNav(v => !v)} style={{
            width: 36, height: 36, borderRadius: 10, border: `1px solid ${G.pillBd}`,
            background: G.pillBg, color: G.textMut, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <LayoutDashboard size={14} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: `linear-gradient(135deg,${G.accent},${G.accentDk})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 14px ${G.glow}`,
              color: '#fff', fontSize: 11, fontWeight: 900, fontFamily: FONTS.heading,
            }}>OW</div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: G.textPri, fontFamily: FONTS.heading, lineHeight: 1.2 }}>
                {owner.name ?? 'Owner Portal'}
              </p>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: G.accent, letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: FONTS.body }}>
                {BRAND.name}
              </p>
            </div>
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Sub status pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 20,
            background: sub.status === 'active' ? G.dim : G.amberDim,
            border: `1px solid ${sub.status === 'active' ? G.bd : G.amberBd}`,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: sub.status === 'active' ? G.accent : G.amber,
              boxShadow: `0 0 6px ${sub.status === 'active' ? G.glow : G.amberDim}`,
              animation: 'od-pulse 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: sub.status === 'active' ? G.accent : G.amber, fontFamily: FONTS.body, letterSpacing: '0.07em' }}>
              {(sub.status ?? 'trial').toUpperCase()}
            </span>
          </div>

          <PillBtn onClick={logout}>
            <LogOut size={12} />
            <span style={{ display: 'none' }} className="sm-show">Sign out</span>
          </PillBtn>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ── Desktop sidebar ── */}
        <aside ref={sideRef} style={{
          width: 210, flexShrink: 0, display: 'flex', flexDirection: 'column',
          borderRight: `1px solid ${G.divider}`,
          background: G.sidebarBg, overflowY: 'auto', opacity: 0,
        }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 12, flex: 1 }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: G.textMut, padding: '6px 8px', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: FONTS.body }}>
              Navigation
            </p>
            {NAV.map(item => (
              <NavBtn key={item.id} {...item} active={tab === item.id} onClick={go} G={G} />
            ))}
          </nav>

          {/* Subscription card in sidebar */}
          <div style={{ margin: 12, padding: 14, borderRadius: 14, background: G.dim, border: `1px solid ${G.bd}` }}>
            <p style={{ margin: '0 0 8px', fontSize: 9, fontWeight: 700, color: G.accent, textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: FONTS.body }}>
              Subscription
            </p>
            <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 900, color: G.textPri, fontFamily: FONTS.heading }}>
              {sub.plan ?? 'Trial'}
            </p>
            {sub.daysLeft !== null && sub.daysLeft !== undefined && (
              <p style={{ margin: 0, fontSize: 10, color: sub.daysLeft <= 7 ? G.red : G.textMut, fontFamily: FONTS.body }}>
                {sub.daysLeft > 0 ? `${sub.daysLeft}d remaining` : 'Expired'}
              </p>
            )}
            <button onClick={() => go('billing')} style={{
              marginTop: 10, width: '100%', padding: '7px 0', borderRadius: 8, border: 'none',
              background: `linear-gradient(135deg,${G.accent},${G.accentDk})`,
              color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              fontFamily: FONTS.body,
            }}>
              Manage plan
            </button>
          </div>
        </aside>

        {/* ── Mobile nav overlay ── */}
        {mobileNav && (
          <div onClick={() => setMobileNav(false)} style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: D ? 'rgba(0,0,0,0.65)' : 'rgba(15,23,42,0.45)',
            backdropFilter: 'blur(6px)',
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              width: 230, height: '100%', background: G.sidebarBg,
              borderRight: `1px solid ${G.divider}`,
              display: 'flex', flexDirection: 'column', padding: 12, gap: 2,
            }}>
              {NAV.map(item => (
                <NavBtn key={item.id} {...item} active={tab === item.id}
                  onClick={(id) => { go(id); setMobileNav(false) }} G={G} />
              ))}
            </div>
          </div>
        )}

        {/* ── Main ── */}
        <main ref={mainRef} style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 40px', opacity: 0 }}>

          {/* ════ OVERVIEW ════ */}
          {tab === 'overview' && (
            <div>
              <SH G={G}
                title="Overview"
                sub={new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                action={
                  <PillBtn onClick={() => { setLoading(true); window.location.reload() }}>
                    <RefreshCw size={11} /> Refresh
                  </PillBtn>
                }
              />

              {/* KPI grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 14, marginBottom: 28 }}>
                <Kpi G={G} label="Total Revenue" value={`Rs ${(o.totalRevenue ?? 0).toLocaleString()}`} sub="All time paid" icon={Wallet} loading={loading} />
                <Kpi G={G} label="Orders Today" value={o.ordersToday} sub="Across all cafes" icon={ShoppingBag} loading={loading} />
                <Kpi G={G} label="This Month" value={o.ordersThisMonth} sub="Orders" icon={CalendarDays} loading={loading} />
                <Kpi G={G} label="Customers" value={o.totalCustomers?.toLocaleString()} sub="Registered" icon={Users} loading={loading} />
                <Kpi G={G} label="Active Cafes" value={`${o.activeCafes ?? 0} / ${o.totalCafes ?? 0}`} sub="Running" icon={Store} loading={loading} color={G.accentLt} />
              </div>

              {/* Subscription + cafe list */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
                {/* Subscription card */}
                <div style={{ background: G.cardBg, border: `1px solid ${G.cardBd}`, borderRadius: 20, padding: 20, boxShadow: G.shadow }}>
                  <p style={{ margin: '0 0 14px', fontSize: 9, fontWeight: 700, color: G.textMut, textTransform: 'uppercase', letterSpacing: '0.17em', fontFamily: FONTS.body }}>
                    Subscription
                  </p>
                  <SubStatus status={sub.status} daysLeft={sub.daysLeft} G={G} FONTS={FONTS} />
                  {sub.lastPayment && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${G.divider}` }}>
                      <p style={{ margin: '0 0 4px', fontSize: 10, color: G.textMut, fontFamily: FONTS.body }}>Last payment</p>
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: G.textPri, fontFamily: FONTS.heading }}>
                        Rs {sub.lastPayment.amount?.toLocaleString()}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: G.textMut, fontFamily: FONTS.body }}>
                        {sub.lastPayment.plan} · {new Date(sub.lastPayment.date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  )}
                  <button onClick={() => go('billing')} style={{
                    marginTop: 16, width: '100%', padding: '10px 0', borderRadius: 10,
                    border: 'none', cursor: 'pointer', fontFamily: FONTS.body, fontSize: 12, fontWeight: 700,
                    background: `linear-gradient(135deg,${G.accent},${G.accentDk})`,
                    color: '#fff', boxShadow: `0 6px 20px ${G.glow}`,
                  }}>
                    {sub.status === 'trial' ? 'Upgrade plan' : 'Manage billing'}
                  </button>
                </div>

                {/* Cafes quick list */}
                {cafes.length > 0 && (
                  <div style={{ background: G.cardBg, border: `1px solid ${G.cardBd}`, borderRadius: 20, padding: 20, boxShadow: G.shadow }}>
                    <p style={{ margin: '0 0 14px', fontSize: 9, fontWeight: 700, color: G.textMut, textTransform: 'uppercase', letterSpacing: '0.17em', fontFamily: FONTS.body }}>
                      Your Cafes
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {cafes.slice(0, 4).map((c, i) => (
                        <div key={c._id} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: i < cafes.length - 1 ? 10 : 0, borderBottom: i < cafes.length - 1 ? `1px solid ${G.divider}` : 'none' }}>
                          {c.logo
                            ? <img src={c.logo} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                            : <div style={{ width: 36, height: 36, borderRadius: 10, background: G.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: G.accent, fontFamily: FONTS.heading, flexShrink: 0 }}>
                                {c.name?.[0]?.toUpperCase() ?? 'C'}
                              </div>
                          }
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: G.textPri, fontFamily: FONTS.body, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</p>
                            <p style={{ margin: 0, fontSize: 10, color: G.textMut, fontFamily: FONTS.body }}>{c.ordersThisMonth ?? 0} orders this month</p>
                          </div>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: c.isActive ? G.accent : G.textMut }} />
                        </div>
                      ))}
                    </div>
                    {cafes.length > 4 && (
                      <button onClick={() => go('cafes')} style={{ marginTop: 12, width: '100%', padding: '8px 0', borderRadius: 8, border: `1px solid ${G.bd}`, background: G.dim, color: G.accent, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: FONTS.body }}>
                        View all {cafes.length} cafes
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════ CAFES ════ */}
          {tab === 'cafes' && (
            <div>
              <SH G={G} title="My Cafes" sub={`${cafes.length} venue${cafes.length !== 1 ? 's' : ''} registered`} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} style={{ background: G.cardBg, border: `1px solid ${G.cardBd}`, borderRadius: 18, padding: 20, height: 88, boxShadow: G.shadow }}>
                      <Sk G={G} h={16} w="40%" r={8} />
                    </div>
                  ))
                ) : cafes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <Store size={40} style={{ color: G.textMut, opacity: 0.3, margin: '0 auto 12px' }} />
                    <p style={{ fontSize: 13, color: G.textMut, fontFamily: FONTS.body }}>No cafes registered yet</p>
                  </div>
                ) : cafes.map(c => (
                  <div key={c._id}
                    style={{ background: G.cardBg, border: `1px solid ${G.cardBd}`, borderRadius: 18, padding: '18px 20px', boxShadow: G.shadow, display: 'flex', alignItems: 'center', gap: 16, transition: 'border-color 0.2s, transform 0.2s', cursor: 'default' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = G.bd; e.currentTarget.style.transform = 'translateX(4px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = G.cardBd; e.currentTarget.style.transform = 'translateX(0)' }}
                  >
                    {c.logo
                      ? <img src={c.logo} alt="" style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: 44, height: 44, borderRadius: 12, background: G.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: G.accent, fontFamily: FONTS.heading, flexShrink: 0 }}>
                          {c.name?.[0]?.toUpperCase() ?? 'C'}
                        </div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: G.textPri, fontFamily: FONTS.heading }}>{c.name}</p>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.isActive ? G.accent : G.textMut, flexShrink: 0 }} />
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: G.textMut, fontFamily: FONTS.body }}>/{c.slug} · {c.ordersThisMonth ?? 0} orders this month</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      {c.address && <p style={{ margin: 0, fontSize: 11, color: G.textMut, fontFamily: FONTS.body, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address}</p>}
                      <Bdg s={c.isActive ? 'active' : 'suspended'} G={G} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════ REVENUE ════ */}
          {tab === 'revenue' && (
            <div>
              <SH G={G} title="Revenue" sub="Daily performance across all cafes"
                action={
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[7, 30, 90].map(d => (
                      <button key={d} onClick={() => setChartDays(d)} style={{
                        padding: '5px 11px', borderRadius: 8, border: `1px solid ${chartDays === d ? G.bd : G.pillBd}`,
                        background: chartDays === d ? G.dim : G.pillBg,
                        color: chartDays === d ? G.accent : G.textMut,
                        fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: FONTS.body,
                      }}>
                        {d}d
                      </button>
                    ))}
                  </div>
                }
              />
              {!chart ? (
                <div style={{ background: G.cardBg, border: `1px solid ${G.cardBd}`, borderRadius: 20, padding: 24, boxShadow: G.shadow }}>
                  <Sk G={G} h={12} w="30%" r={6} />
                  <div style={{ marginTop: 20 }}><Sk G={G} h={200} w="100%" r={10} /></div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Area chart */}
                  <div style={{ background: G.cardBg, border: `1px solid ${G.cardBd}`, borderRadius: 20, padding: '20px 20px 10px', boxShadow: G.shadow }}>
                    <p style={{ margin: '0 0 20px', fontSize: 9, fontWeight: 700, color: G.textMut, textTransform: 'uppercase', letterSpacing: '0.17em', fontFamily: FONTS.body }}>Revenue (Rs)</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={chart}>
                        <defs>
                          <linearGradient id="ownerRg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={G.accent} stopOpacity={D ? 0.28 : 0.18} />
                            <stop offset="100%" stopColor={G.accent} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={G.divider} />
                        <XAxis dataKey="day" tick={{ fontSize: 9, fill: G.textMut, fontFamily: FONTS.body }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 9, fill: G.textMut, fontFamily: FONTS.body }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                        <Tooltip content={(p) => <Tip {...p} G={G} />} />
                        <Area type="monotone" dataKey="revenue" stroke={G.accent} strokeWidth={2.5} fill="url(#ownerRg)" dot={false} activeDot={{ fill: G.accent, r: 4, strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Orders bar */}
                  <div style={{ background: G.cardBg, border: `1px solid ${G.cardBd}`, borderRadius: 20, padding: '20px 20px 10px', boxShadow: G.shadow }}>
                    <p style={{ margin: '0 0 20px', fontSize: 9, fontWeight: 700, color: G.textMut, textTransform: 'uppercase', letterSpacing: '0.17em', fontFamily: FONTS.body }}>Daily orders</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={chart}>
                        <CartesianGrid strokeDasharray="3 3" stroke={G.divider} />
                        <XAxis dataKey="day" tick={{ fontSize: 9, fill: G.textMut, fontFamily: FONTS.body }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 9, fill: G.textMut, fontFamily: FONTS.body }} allowDecimals={false} />
                        <Tooltip content={(p) => <Tip {...p} G={G} prefix="" />} />
                        <Bar dataKey="orders" fill={G.accentDk} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════ ORDERS ════ */}
          {tab === 'orders' && (
            <div>
              <SH G={G} title="Recent Orders" sub="Last 20 orders across all cafes" />
              <div style={{ background: G.cardBg, border: `1px solid ${G.cardBd}`, borderRadius: 20, overflow: 'hidden', boxShadow: G.shadow }}>
                {/* Table header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', padding: '12px 18px', borderBottom: `1px solid ${G.divider}` }}>
                  {['Cafe', 'Items', 'Total', 'Status', 'Date'].map(h => (
                    <span key={h} style={{ fontSize: 9, fontWeight: 700, color: G.textMut, textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: FONTS.body }}>{h}</span>
                  ))}
                </div>

                {orders.length === 0 && (
                  <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                    <ShoppingBag size={32} style={{ color: G.textMut, opacity: 0.25, margin: '0 auto 10px' }} />
                    <p style={{ fontSize: 13, color: G.textMut, fontFamily: FONTS.body }}>No orders yet</p>
                  </div>
                )}

                {orders.map((ord, i) => (
                  <div key={ord._id} style={{
                    display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr',
                    padding: '13px 18px', alignItems: 'center',
                    borderTop: i > 0 ? `1px solid ${G.divider}` : 'none',
                    transition: 'background 0.1s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = G.dim}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: G.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: G.accent, fontFamily: FONTS.heading, flexShrink: 0 }}>
                        {(ord.cafeId?.name?.[0] ?? 'C').toUpperCase()}
                      </div>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: G.textPri, fontFamily: FONTS.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ord.cafeId?.name ?? '—'}
                      </p>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: G.textSub, fontFamily: FONTS.body }}>{ord.items?.length ?? 0} item{ord.items?.length !== 1 ? 's' : ''}</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: G.textPri, fontFamily: FONTS.body }}>Rs {ord.total?.toLocaleString()}</p>
                    <Bdg s={ord.status} G={G} />
                    <p style={{ margin: 0, fontSize: 11, color: G.textMut, fontFamily: FONTS.body }}>
                      {new Date(ord.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════ BILLING ════ */}
          {tab === 'billing' && (
            <div>
              <SH G={G} title="Billing & Subscription" sub="Manage your Nexara plan" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480 }}>

                {/* Current plan card */}
                <div style={{ background: G.cardBg, border: `1px solid ${G.bd}`, borderRadius: 20, padding: 22, boxShadow: `0 8px 32px ${G.glow}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: G.dim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Zap size={18} style={{ color: G.accent }} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 17, fontWeight: 900, color: G.textPri, fontFamily: FONTS.heading }}>
                        {sub.plan ?? 'Trial'} Plan
                      </p>
                      <SubStatus status={sub.status} daysLeft={sub.daysLeft} G={G} FONTS={FONTS} />
                    </div>
                  </div>

                  {sub.endsAt && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: G.pillBg, border: `1px solid ${G.pillBd}`, marginBottom: 14 }}>
                      <CalendarDays size={13} style={{ color: G.textMut, flexShrink: 0 }} />
                      <p style={{ margin: 0, fontSize: 12, color: G.textMut, fontFamily: FONTS.body }}>
                        {sub.status === 'trial' ? 'Trial ends' : 'Renews'} on {new Date(sub.endsAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  )}

                  <button style={{
                    width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: `linear-gradient(135deg,${G.accent},${G.accentDk})`,
                    color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: FONTS.heading,
                    boxShadow: `0 8px 28px ${G.glow}`,
                  }}>
                    {sub.status === 'trial' ? '✦ Upgrade to Pro' : '↺ Renew Plan'}
                  </button>
                </div>

                {/* Last payment */}
                {sub.lastPayment && (
                  <div style={{ background: G.cardBg, border: `1px solid ${G.cardBd}`, borderRadius: 20, padding: 20, boxShadow: G.shadow }}>
                    <p style={{ margin: '0 0 14px', fontSize: 9, fontWeight: 700, color: G.textMut, textTransform: 'uppercase', letterSpacing: '0.17em', fontFamily: FONTS.body }}>Last payment</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: G.dim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CreditCard size={16} style={{ color: G.accent }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: G.textPri, fontFamily: FONTS.heading }}>Rs {sub.lastPayment.amount?.toLocaleString()}</p>
                        <p style={{ margin: 0, fontSize: 11, color: G.textMut, fontFamily: FONTS.body }}>{sub.lastPayment.plan} · {new Date(sub.lastPayment.date).toLocaleDateString('en-IN')}</p>
                      </div>
                      <Bdg s="paid" G={G} />
                    </div>
                  </div>
                )}

                {/* Account info */}
                <div style={{ background: G.cardBg, border: `1px solid ${G.cardBd}`, borderRadius: 20, padding: 20, boxShadow: G.shadow }}>
                  <p style={{ margin: '0 0 14px', fontSize: 9, fontWeight: 700, color: G.textMut, textTransform: 'uppercase', letterSpacing: '0.17em', fontFamily: FONTS.body }}>Account</p>
                  {[
                    { label: 'Name',  value: owner.name },
                    { label: 'Email', value: owner.email },
                    { label: 'Phone', value: owner.phone ?? '—' },
                  ].map(f => (
                    <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${G.divider}` }}>
                      <p style={{ margin: 0, fontSize: 11, color: G.textMut, fontFamily: FONTS.body }}>{f.label}</p>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: G.textPri, fontFamily: FONTS.body }}>{f.value ?? '—'}</p>
                    </div>
                  ))}
                  <button onClick={logout} style={{
                    marginTop: 14, width: '100%', padding: '10px 0', borderRadius: 10,
                    border: `1px solid ${G.redBd}`, background: G.redDim,
                    color: G.red, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONTS.body,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  }}>
                    <LogOut size={13} /> Sign out
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}