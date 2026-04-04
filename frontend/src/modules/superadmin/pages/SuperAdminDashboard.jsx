// frontend/src/modules/superadmin/pages/SuperAdminDashboard.jsx
//
// ─── CENTRALIZED STYLE — same system as MenuPage ─────────────────────────────
// Uses ThemeContext + getPalette + BRAND + FONTS exactly like MenuPage.
// All colors: var(--text-primary), var(--card-bg), var(--accent) etc.
// SA-specific accent: indigo — distinct from cafe orange, but respects theme.
// GSAP entrance animations. Recharts for graphs. Lucide icons.
// ─────────────────────────────────────────────────────────────────────────────

import {
  useState, useEffect, useCallback,
  useRef, useLayoutEffect, useContext,
} from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  LayoutDashboard, Users, TrendingUp, CreditCard,
  Settings, LogOut, RefreshCw, ChevronRight,
  ArrowUpRight, ArrowDownRight, Building2, ShoppingBag,
  Star, CheckCircle2, Clock, Zap, Search, Filter,
  ChevronLeft, Shield, Database,
} from 'lucide-react'
import gsap from 'gsap'
import { ThemeContext } from '@shared/context/ThemeContext'
import { getPalette, BRAND, FONTS } from '@shared/config/brand'
import api from '@api/axios'

/* ── SA accent palette — indigo, theme-aware opacity ────────────────────────
   We use hardcoded indigo because the SA panel must look distinct from any
   cafe's brand color. All other colors come from the centralized CSS vars.  */
const mkSA = (D) => ({
  accent:    '#6366f1',
  accentDk:  '#4f46e5',
  accentGlow:'rgba(99,102,241,0.28)',
  accentDim: D ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
  accentBd:  D ? 'rgba(99,102,241,0.3)'  : 'rgba(99,102,241,0.2)',
  green:     D ? '#34d399' : '#059669',
  greenDim:  D ? 'rgba(52,211,153,0.1)'  : 'rgba(5,150,105,0.08)',
  greenBd:   D ? 'rgba(52,211,153,0.2)'  : 'rgba(5,150,105,0.2)',
  amber:     D ? '#fbbf24' : '#d97706',
  amberDim:  D ? 'rgba(251,191,36,0.1)'  : 'rgba(217,119,6,0.08)',
  amberBd:   D ? 'rgba(251,191,36,0.2)'  : 'rgba(217,119,6,0.2)',
  red:       D ? '#f87171' : '#dc2626',
  redDim:    D ? 'rgba(248,113,113,0.1)' : 'rgba(220,38,38,0.07)',
  redBd:     D ? 'rgba(248,113,113,0.2)' : 'rgba(220,38,38,0.2)',
  violet:    '#a78bfa',
  // ── Neutral text — overrides cafe brand muted color with proper white/gray ──
  // In dark mode: white variants. In light mode: slate/gray variants.
  // Used everywhere in SA dashboard instead of var(--text-muted) which
  // carries the cafe's orange tint and produces the brown label issue.
  textPri:   D ? 'rgba(248,250,252,0.95)' : 'rgba(15,23,42,0.9)',   // headings, values
  textSub:   D ? 'rgba(203,213,225,0.75)' : 'rgba(51,65,85,0.7)',   // body, descriptions
  textMut:   D ? 'rgba(148,163,184,0.55)' : 'rgba(100,116,139,0.6)', // labels, captions
  textDim:   D ? 'rgba(100,116,139,0.4)'  : 'rgba(148,163,184,0.5)', // disabled
  cardBg:    D ? 'rgba(15,23,42,0.7)'     : 'rgba(255,255,255,0.85)',
  cardBd:    D ? 'rgba(99,102,241,0.12)'  : 'rgba(99,102,241,0.1)',
  headerBg:  D ? 'rgba(10,15,30,0.92)'    : 'rgba(248,250,252,0.95)',
  headerBd:  D ? 'rgba(99,102,241,0.1)'   : 'rgba(99,102,241,0.08)',
  divider:   D ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
  pillBg:    D ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
  pillBd:    D ? 'rgba(255,255,255,0.1)'  : 'rgba(0,0,0,0.08)',
  inputBg:   D ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
  inputBd:   D ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
  modalBg:   D ? 'rgba(10,15,30,0.97)'    : 'rgba(255,255,255,0.98)',
  overlayBg: D ? 'rgba(0,0,0,0.65)'       : 'rgba(15,23,42,0.5)',
  bg:        D ? '#080c18'                 : '#f8fafc',
})

const PIE_C = ['#6366f1','#a78bfa','#34d399','#fbbf24','#f87171']

/* ── Status badge — fully theme-aware ────────────────────────────────────── */
const Bdg = ({ s, SA }) => {
  const m = {
    active:    { bg: SA.greenDim,  bd: SA.greenBd,  c: SA.green  },
    trial:     { bg: SA.accentDim, bd: SA.accentBd, c: SA.accent },
    expired:   { bg: SA.redDim,    bd: SA.redBd,    c: SA.red    },
    suspended: { bg: SA.redDim,    bd: SA.redBd,    c: SA.red    },
    readonly:  { bg: SA.amberDim,  bd: SA.amberBd,  c: SA.amber  },
    cancelled: { bg: SA.redDim,    bd: SA.redBd,    c: SA.red    },
    grace:     { bg: SA.amberDim,  bd: SA.amberBd,  c: SA.amber  },
  }
  const t = m[s] || m.expired
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
      background: t.bg, border: `1px solid ${t.bd}`, color: t.c,
      fontFamily: FONTS.body,
    }}>
      {s}
    </span>
  )
}

/* ── Skeleton — uses ${SA.divider} ─────────────────────────────────────── */
const Sk = ({ h = 16, w = '60%', className = '', SA }) => (
  <div className={`rounded-xl animate-pulse ${className}`}
    style={{ height: h, width: w, background: SA?.divider ?? 'rgba(255,255,255,0.07)' }} />
)

/* ── KPI card — glass card matching MenuPage card style ─────────────────── */
const Kpi = ({ label, value, sub, icon: Icon, accentColor, trend, loading, SA }) => {
  const r = useRef(null)
  const ac = accentColor || SA.accent

  useLayoutEffect(() => {
    if (!r.current) return
    gsap.fromTo(r.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out', delay: Math.random() * 0.22 }
    )
  }, [])

  return (
    <div ref={r}
      className="rounded-2xl p-5 flex flex-col gap-3 cursor-default transition-all duration-200"
      style={{
        background: SA.cardBg,
        border: `1px solid ${SA.cardBd}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        opacity: 0,
        fontFamily: FONTS.body,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = SA.accentBd
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = `0 12px 40px ${SA.accentGlow}, 0 8px 32px rgba(0,0,0,0.18)`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = SA.cardBd
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.18)'
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{ color: SA.textMut }}>
          {label}
        </p>
        {Icon && (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: SA.accentDim }}>
            <Icon size={14} strokeWidth={2} style={{ color: ac }} />
          </div>
        )}
      </div>
      {loading ? (
        <><Sk SA={SA} h={28} w="55%" /><Sk SA={SA} h={10} w="40%" /></>
      ) : (
        <>
          <p className="text-[26px] font-black leading-none tracking-tight"
            style={{ color: SA.textPri, fontFamily: FONTS.heading }}>
            {value ?? '—'}
          </p>
          {(sub || trend !== undefined) && (
            <div className="flex items-center gap-2">
              {trend !== undefined && (
                <span className="flex items-center gap-0.5 text-[11px] font-bold"
                  style={{ color: trend >= 0 ? SA.green : SA.red }}>
                  {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(trend)}%
                </span>
              )}
              {sub && <p className="text-[11px]" style={{ color: SA.textMut }}>{sub}</p>}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ── Section header ─────────────────────────────────────────────────────── */
const SH = ({ title, sub, action, SA }) => (
  <div className="flex items-start justify-between mb-6 gap-4">
    <div>
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-[3px] h-[18px] rounded-full"
          style={{ background: 'linear-gradient(180deg,#6366f1,#a78bfa)' }} />
        <h2 className="text-[18px] font-extrabold tracking-tight"
          style={{ color: SA?.textPri ?? '#f8fafc', fontFamily: FONTS.heading }}>
          {title}
        </h2>
      </div>
      {sub && <p className="text-[12px] pl-[11px]" style={{ color: SA?.textMut ?? 'rgba(148,163,184,0.55)', fontFamily: FONTS.body }}>{sub}</p>}
    </div>
    {action}
  </div>
)

/* ── Chart tooltip — matches card style ─────────────────────────────────── */
const Tip = ({ active, payload, label, prefix = 'Rs ', SA }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3.5 py-2.5 text-[12px] font-semibold"
      style={{
        background: SA?.modalBg ?? 'rgba(10,15,30,0.97)',
        border: `1px solid ${SA?.cardBd ?? 'rgba(99,102,241,0.12)'}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        color: SA?.textPri ?? '#f8fafc',
        fontFamily: FONTS.body,
      }}>
      <p className="text-[10px] mb-1" style={{ color: SA?.textMut ?? 'rgba(148,163,184,0.55)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{prefix}{p.value?.toLocaleString()}</p>
      ))}
    </div>
  )
}

/* ── Usage progress bar ─────────────────────────────────────────────────── */
const UBar = ({ pct, SA }) => {
  const c = pct > 80 ? SA.red : pct > 60 ? SA.amber : SA.green
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: SA.divider }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, pct ?? 0)}%`, background: c }} />
      </div>
      <span className="text-[10px] font-bold w-8 text-right" style={{ color: c, fontFamily: FONTS.body }}>
        {pct ?? 0}%
      </span>
    </div>
  )
}

/* ── Nav button — matches pill style from MenuPage ──────────────────────── */
const NavBtn = ({ id, label, Icon, active, onClick, collapsed, SA }) => (
  <button onClick={() => onClick(id)}
    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 text-left w-full"
    style={{
      background: active ? SA.accentDim : 'transparent',
      color: active ? SA.accent : SA.textMut,
      borderLeft: `2px solid ${active ? SA.accent : 'transparent'}`,
      fontFamily: FONTS.body,
      WebkitTapHighlightColor: 'transparent',
    }}
    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = SA.pillBg; e.currentTarget.style.color = SA.textPri } }}
    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = SA.textMut } }}
  >
    <Icon size={16} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
    {!collapsed && <span>{label}</span>}
    {active && !collapsed && (
      <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: SA.accent }} />
    )}
  </button>
)

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function SuperAdminDashboard() {
  const navigate = useNavigate()
  const { isDark: D } = useContext(ThemeContext)
  const P  = getPalette(D)
  const SA = mkSA(D)

  const [tab, setTab]                   = useState('overview')
  const [dash, setDash]                 = useState(null)
  const [tenants, setTenants]           = useState([])
  const [tenantTotal, setTenantTotal]   = useState(0)
  const [revenue, setRevenue]           = useState(null)
  const [plans, setPlans]               = useState(null)
  const [config, setConfig]             = useState(null)
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [tenantPage, setTenantPage]     = useState(1)
  const [selTenant, setSelTenant]       = useState(null)
  const [tenantDet, setTenantDet]       = useState(null)
  const [collapsed, setCollapsed]       = useState(false)
  const [mobileNav, setMobileNav]       = useState(false)

  const wrapRef   = useRef(null)
  const sideRef   = useRef(null)
  const mainRef   = useRef(null)
  const headerRef = useRef(null)

  /* ── Entrance — same pattern as MenuPage ──────────────────────────────── */
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.fromTo(headerRef.current, { y: -28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 0)
      tl.fromTo(sideRef.current,   { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6 }, 0.1)
      tl.fromTo(mainRef.current,   { y: 24,  opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 0.2)
    }, wrapRef)
    return () => ctx.revert()
  }, [])

  /* ── Tab crossfade ─────────────────────────────────────────────────────── */
  const animMain = useCallback(() => {
    if (!mainRef.current) return
    gsap.fromTo(mainRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' })
  }, [])

  const go = useCallback((t) => {
    if (!mainRef.current) { setTab(t); return }
    gsap.to(mainRef.current, {
      opacity: 0, y: -8, duration: 0.14, ease: 'power2.in',
      onComplete: () => {
        setTab(t); setSelTenant(null); setTenantDet(null)
        setTimeout(animMain, 30)
      },
    })
  }, [animMain])

  /* ── Data ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    api.get('/superadmin/dashboard')
      .then(r => setDash(r.data ?? r))
      .catch(e => {
        if (e.response?.status === 401 || e.response?.status === 403)
          navigate('/superadmin/login', { replace: true })
      })
      .finally(() => setLoading(false))
  }, [navigate])

  const loadTenants = useCallback(async () => {
    try {
      const p = { page: tenantPage, limit: 20 }
      if (search) p.search = search
      if (filterStatus) p.status = filterStatus
      const r = await api.get('/superadmin/tenants', { params: p })
      const d = r.data ?? r
      setTenants(d.tenants ?? [])
      setTenantTotal(d.total ?? 0)
    } catch {}
  }, [tenantPage, search, filterStatus])

  useEffect(() => { if (tab === 'tenants') loadTenants() }, [tab, loadTenants])

  useEffect(() => {
    if (tab !== 'revenue') return
    api.get('/superadmin/revenue').then(r => setRevenue(r.data ?? r)).catch(() => {})
  }, [tab])

  useEffect(() => {
    if (tab !== 'plans' && tab !== 'config') return
    Promise.all([api.get('/superadmin/plans'), api.get('/superadmin/config')])
      .then(([p, c]) => { setPlans(p.data ?? p); setConfig(c.data ?? c) })
      .catch(() => {})
  }, [tab])

  const openDetail = async (id) => {
    setSelTenant(id)
    try {
      const r = await api.get(`/superadmin/tenants/${id}`)
      setTenantDet(r.data ?? r)
    } catch { setTenantDet(null) }
  }

  const logout = async () => {
    try { await api.post('/superadmin/logout') } catch {}
    localStorage.removeItem('kc_sa_logged')
    navigate('/superadmin/login', { replace: true })
  }

  const toggleOtp = async (en) => {
    await api.patch('/superadmin/config/otp', { enabled: en })
    setConfig(c => ({ ...c, otpEnabled: en }))
  }

  const o = dash?.overview ?? {}
  const s = dash?.subscriptions ?? {}

  const NAV = [
    { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
    { id: 'tenants',  label: 'Tenants',  Icon: Building2 },
    { id: 'revenue',  label: 'Revenue',  Icon: TrendingUp },
    { id: 'plans',    label: 'Plans',    Icon: CreditCard },
    { id: 'config',   label: 'Config',   Icon: Settings },
  ]

  /* ── Shared input style — matches MenuPage input tokens ─────────────── */
  const INP_ST = {
    background: SA.inputBg,
    border: `1.5px solid ${SA.inputBd}`,
    color: SA.textPri,
    fontFamily: FONTS.body,
  }

  const BtnSmall = ({ children, onClick, style = {}, ...p }) => (
    <button onClick={onClick} {...p}
      className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150"
      style={{
        background: SA.pillBg,
        border: `1px solid ${SA.cardBd}`,
        color: SA.textMut,
        fontFamily: FONTS.body,
        ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = SA.accentBd; e.currentTarget.style.color = SA.accent }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = SA.cardBd; e.currentTarget.style.color = SA.textMut }}
    >
      {children}
    </button>
  )

  return (
    <div ref={wrapRef} className="min-h-dvh flex flex-col"
      style={{ background: SA.bg, fontFamily: FONTS.body, color: SA.textPri }}>

      {/* ── Header — same glass as MenuPage island ──────────────────────── */}
      <header ref={headerRef}
        className="flex items-center justify-between shrink-0 sticky top-0 z-50 px-4 sm:px-6 py-3.5"
        style={{
          background: SA.headerBg,
          borderBottom: `1px solid ${SA.headerBd}`,
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          opacity: 0,
        }}>

        {/* Left — logo + title */}
        <div className="flex items-center gap-3">
          <button className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center"
            onClick={() => setMobileNav(o => !o)}
            style={{ background: SA.pillBg, border: `1px solid ${SA.cardBd}`, color: SA.textMut }}>
            <LayoutDashboard size={15} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black text-white shrink-0"
              style={{ background: `linear-gradient(135deg,${SA.accent},${SA.accentDk})`, boxShadow: `0 4px 14px ${SA.accentGlow}` }}>
              NX
            </div>
            <div className="hidden sm:block">
              <p className="text-[13px] font-bold leading-tight"
                style={{ color: SA.textPri, fontFamily: FONTS.heading }}>
                Nexara Console
              </p>
              <p className="text-[9px] font-bold tracking-[0.18em] uppercase"
                style={{ color: SA.accent }}>
                Super Admin
              </p>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2.5">
          {/* Live dot */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: SA.greenDim, border: `1px solid ${SA.greenBd}` }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: SA.green, boxShadow: `0 0 6px ${SA.green}` }} />
            <span className="text-[10px] font-bold tracking-wide" style={{ color: SA.green, fontFamily: FONTS.body }}>LIVE</span>
          </div>
          {/* Sidebar collapse */}
          <button onClick={() => setCollapsed(c => !c)}
            className="hidden lg:flex w-9 h-9 rounded-xl items-center justify-center transition-colors"
            style={{ background: SA.pillBg, border: `1px solid ${SA.cardBd}`, color: SA.textMut }}>
            <ChevronLeft size={14} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
          </button>
          {/* Logout */}
          <BtnSmall onClick={logout}
            style={{ color: SA.textMut }}
            onMouseEnter={e => { e.currentTarget.style.color = SA.red; e.currentTarget.style.borderColor = SA.redBd }}
            onMouseLeave={e => { e.currentTarget.style.color = SA.textMut; e.currentTarget.style.borderColor = SA.cardBd }}>
            <LogOut size={13} />
            <span className="hidden sm:inline">Sign out</span>
          </BtnSmall>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Desktop sidebar ────────────────────────────────────────────── */}
        <aside ref={sideRef}
          className="hidden lg:flex flex-col shrink-0 overflow-y-auto transition-[width] duration-300"
          style={{
            width: collapsed ? 64 : 220,
            borderRight: `1px solid ${SA.divider}`,
            background: SA.headerBg,
            opacity: 0,
          }}>
          <nav className="flex flex-col gap-1 p-3 flex-1">
            {!collapsed && (
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase px-2 py-2"
                style={{ color: SA.textMut, fontFamily: FONTS.body }}>
                Navigation
              </p>
            )}
            {NAV.map(item => (
              <NavBtn key={item.id} {...item}
                active={tab === item.id}
                onClick={go}
                collapsed={collapsed}
                SA={SA} />
            ))}
          </nav>
          {/* System status */}
          {!collapsed && (
            <div className="m-3 p-3.5 rounded-xl"
              style={{ background: SA.accentDim, border: `1px solid ${SA.accentBd}` }}>
              <div className="flex items-center gap-2 mb-2.5">
                <Shield size={11} style={{ color: SA.accent }} />
                <span className="text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: SA.accent, fontFamily: FONTS.body }}>System</span>
              </div>
              {[{ l: 'API', ok: true }, { l: 'DB', ok: true }, { l: 'Cache', ok: true }].map(({ l, ok }) => (
                <div key={l} className="flex items-center justify-between py-0.5">
                  <span className="text-[10px]" style={{ color: SA.textMut, fontFamily: FONTS.body }}>{l}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: ok ? SA.green : SA.red }} />
                    <span className="text-[9px] font-bold" style={{ color: ok ? SA.green : SA.red, fontFamily: FONTS.body }}>
                      {ok ? 'OK' : 'ERR'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* ── Mobile nav overlay ─────────────────────────────────────────── */}
        {mobileNav && (
          <div className="lg:hidden fixed inset-0 z-[60]"
            style={{ background: SA.overlayBg, backdropFilter: 'blur(8px)' }}
            onClick={() => setMobileNav(false)}>
            <div className="w-64 h-full flex flex-col p-4 gap-1"
              style={{ background: SA.headerBg, borderRight: `1px solid ${SA.divider}` }}
              onClick={e => e.stopPropagation()}>
              {NAV.map(item => (
                <NavBtn key={item.id} {...item}
                  active={tab === item.id}
                  onClick={(id) => { go(id); setMobileNav(false) }}
                  collapsed={false}
                  SA={SA} />
              ))}
            </div>
          </div>
        )}

        {/* ── Main content ───────────────────────────────────────────────── */}
        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
          style={{ opacity: 0 }}>

          {/* ════ OVERVIEW ════ */}
          {tab === 'overview' && (
            <div>
              <SH SA={SA} title="Platform Overview"
                sub={new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                action={
                  <button onClick={() => { setLoading(true); window.location.reload() }}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold"
                    style={{ background: SA.pillBg, border: `1px solid ${SA.cardBd}`, color: SA.textMut, fontFamily: FONTS.body }}>
                    <RefreshCw size={12} /> Refresh
                  </button>
                }
              />

              {/* KPI grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                <Kpi label="MRR" value={`Rs ${(o.mrr ?? 0).toLocaleString()}`} sub="Monthly recurring" icon={TrendingUp} accentColor={SA.green} trend={12} loading={loading} SA={SA} />
                <Kpi label="Revenue (month)" value={`Rs ${(o.revenueThisMonth ?? 0).toLocaleString()}`} sub="This cycle" icon={CreditCard} loading={loading} SA={SA} />
                <Kpi label="Owners" value={o.totalOwners} sub={`${o.activeOwners ?? 0} active`} icon={Users} loading={loading} SA={SA} />
                <Kpi label="Cafes" value={o.totalCafes} sub={`${o.activeCafes ?? 0} active`} icon={Building2} loading={loading} SA={SA} />
                <Kpi label="Customers" value={o.totalCustomers?.toLocaleString()} sub="Registered accounts" icon={Star} loading={loading} SA={SA} />
                <Kpi label="Orders today" value={o.ordersToday} sub={`${o.ordersThisMonth ?? 0} this month`} icon={ShoppingBag} accentColor={SA.amber} loading={loading} SA={SA} />
                <Kpi label="Signups (7d)" value={o.newSignupsWeek} sub={`${o.newSignupsToday ?? 0} today`} icon={Zap} accentColor={SA.green} trend={8} loading={loading} SA={SA} />
                <Kpi label="Total orders" value={o.totalOrders?.toLocaleString()} sub="All time" icon={CheckCircle2} loading={loading} SA={SA} />
              </div>

              {/* Subscription health + plan donut */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Health bars */}
                <div className="rounded-2xl p-5"
                  style={{ background: SA.cardBg, border: `1px solid ${SA.cardBd}`, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-5"
                    style={{ color: SA.textMut, fontFamily: FONTS.body }}>
                    Subscription health
                  </p>
                  <div className="flex flex-col gap-4">
                    {[
                      { label: 'Active',  value: s.active  ?? 0, color: SA.green },
                      { label: 'Trial',   value: s.trial   ?? 0, color: SA.accent },
                      { label: 'Expired', value: s.expired ?? 0, color: SA.red },
                    ].map(item => {
                      const total = (s.active ?? 0) + (s.trial ?? 0) + (s.expired ?? 0)
                      const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
                      return (
                        <div key={item.label} className="flex items-center gap-3">
                          <p className="text-[11px] w-16 shrink-0 font-medium" style={{ color: SA.textMut, fontFamily: FONTS.body }}>{item.label}</p>
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: SA.divider }}>
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: item.color }} />
                          </div>
                          <span className="text-[20px] font-black w-10 text-right shrink-0 leading-none"
                            style={{ color: item.color, fontFamily: FONTS.heading }}>{item.value}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Plan donut */}
                <div className="rounded-2xl p-5"
                  style={{ background: SA.cardBg, border: `1px solid ${SA.cardBd}`, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
                    style={{ color: SA.textMut, fontFamily: FONTS.body }}>
                    Plan distribution
                  </p>
                  {loading ? (
                    <div className="h-44 flex items-center justify-center"><Sk SA={SA} h={140} w="140px" className="rounded-full" /></div>
                  ) : dash?.planDistribution?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={dash.planDistribution.map(p => ({ name: p.plan, value: p.count }))}
                          cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                          {dash.planDistribution.map((_, i) => <Cell key={i} fill={PIE_C[i % PIE_C.length]} />)}
                        </Pie>
                        <Legend formatter={v => <span style={{ color: SA.textMut, fontSize: 11, fontFamily: FONTS.body }}>{v}</span>} />
                        <Tooltip content={<Tip SA={SA} prefix="" />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-44 flex items-center justify-center">
                      <p className="text-[12px]" style={{ color: SA.textMut, fontFamily: FONTS.body }}>No data yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════ TENANTS ════ */}
          {tab === 'tenants' && !selTenant && (
            <div>
              <SH SA={SA} title="Tenants" sub={`${tenantTotal} venues registered`} />

              {/* Filters */}
              <div className="flex gap-3 mb-5 flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: SA.textMut }} />
                  <input placeholder="Search cafe or owner…" value={search}
                    onChange={e => { setSearch(e.target.value); setTenantPage(1) }}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] outline-none"
                    style={{ ...INP_ST, transition: 'border-color 0.2s, box-shadow 0.2s' }}
                    onFocus={e => { e.target.style.borderColor = SA.accentBd; e.target.style.boxShadow = `0 0 0 3px ${SA.accentDim}` }}
                    onBlur={e => { e.target.style.borderColor = SA.inputBd; e.target.style.boxShadow = 'none' }} />
                </div>
                <div className="relative">
                  <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: SA.textMut }} />
                  <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setTenantPage(1) }}
                    className="pl-8 pr-4 py-2.5 rounded-xl text-[13px] outline-none cursor-pointer appearance-none"
                    style={{ ...INP_ST, minWidth: 150 }}>
                    <option value="">All statuses</option>
                    {['trial','active','grace','readonly','suspended','cancelled'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-2xl overflow-hidden"
                style={{ border: `1px solid ${SA.cardBd}`, background: SA.cardBg }}>
                <div className="hidden sm:grid px-4 py-3 text-[9px] font-bold uppercase tracking-[0.15em]"
                  style={{
                    color: SA.textMut,
                    borderBottom: `1px solid ${SA.divider}`,
                    gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.2fr',
                    fontFamily: FONTS.body,
                  }}>
                  {['Venue', 'Owner', 'Plan', 'Status', 'Usage'].map(h => <span key={h}>{h}</span>)}
                </div>

                {tenants.length === 0 && (
                  <div className="py-16 text-center">
                    <Building2 size={32} className="mx-auto mb-3 opacity-20" style={{ color: SA.textMut }} />
                    <p className="text-[13px]" style={{ color: SA.textMut, fontFamily: FONTS.body }}>No tenants found</p>
                  </div>
                )}

                {tenants.map((t, i) => (
                  <div key={t._id}
                    className="sm:grid flex flex-col gap-2 sm:gap-4 px-4 py-3.5 cursor-pointer transition-colors duration-100"
                    style={{
                      gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.2fr',
                      borderTop: i > 0 ? `1px solid ${SA.divider}` : 'none',
                    }}
                    onClick={() => openDetail(t.cafe?._id)}
                    onMouseEnter={e => e.currentTarget.style.background = SA.accentDim}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                    <div className="flex items-center gap-3 min-w-0">
                      {t.cafe?.logo
                        ? <img src={t.cafe.logo} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
                        : <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-[14px] font-bold"
                            style={{ background: SA.accentDim, color: SA.accent, fontFamily: FONTS.heading }}>
                            {(t.cafe?.name?.[0] ?? 'C').toUpperCase()}
                          </div>
                      }
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: SA.textPri, fontFamily: FONTS.body }}>{t.cafe?.name ?? 'Unknown'}</p>
                        <p className="text-[10px] truncate" style={{ color: SA.textMut, fontFamily: FONTS.body }}>{t.cafe?.slug}</p>
                      </div>
                    </div>
                    <p className="text-[12px] truncate self-center" style={{ color: SA.textMut, fontFamily: FONTS.body }}>{t.owner?.email ?? '—'}</p>
                    <p className="text-[12px] font-bold self-center" style={{ color: SA.accent, fontFamily: FONTS.body }}>{t.plan ?? '—'}</p>
                    <div className="self-center"><Bdg s={t.status} SA={SA} /></div>
                    <div className="self-center">
                      {t.usage?.cap
                        ? <UBar pct={t.usage.percent} SA={SA} />
                        : <p className="text-[11px]" style={{ color: SA.textMut, fontFamily: FONTS.body }}>{t.usage?.orderCount ?? 0} orders</p>
                      }
                    </div>
                  </div>
                ))}
              </div>

              {tenantTotal > 20 && (
                <div className="flex justify-center items-center gap-3 mt-5">
                  {[
                    { label: '← Prev', disabled: tenantPage <= 1, onClick: () => setTenantPage(p => p - 1) },
                    { label: 'Next →', disabled: tenantPage * 20 >= tenantTotal, onClick: () => setTenantPage(p => p + 1) },
                  ].map(({ label, disabled, onClick }) => (
                    <button key={label} disabled={disabled} onClick={onClick}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold disabled:opacity-30 transition-colors"
                      style={{ background: SA.pillBg, border: `1px solid ${SA.cardBd}`, color: SA.textMut, fontFamily: FONTS.body }}>
                      {label}
                    </button>
                  ))}
                  <span className="text-[12px]" style={{ color: SA.textMut, fontFamily: FONTS.body }}>
                    {tenantPage} / {Math.ceil(tenantTotal / 20)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ════ TENANT DETAIL ════ */}
          {tab === 'tenants' && selTenant && (
            <div>
              <button onClick={() => { setSelTenant(null); setTenantDet(null) }}
                className="flex items-center gap-2 mb-6 px-4 py-2.5 rounded-xl text-[12px] font-semibold"
                style={{ background: SA.pillBg, border: `1px solid ${SA.cardBd}`, color: SA.textMut, fontFamily: FONTS.body }}>
                <ChevronLeft size={14} /> Back to tenants
              </button>
              {tenantDet ? (
                <div className="flex flex-col gap-6">
                  <SH SA={SA} title={tenantDet.cafe?.name ?? 'Tenant Detail'}
                    sub={`${tenantDet.tenant?.plan ?? '—'} plan · ${tenantDet.tenant?.status}`} />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Kpi label="Owner" value={tenantDet.tenant?.ownerId?.name ?? '—'} sub={tenantDet.tenant?.ownerId?.email} icon={Users} loading={false} SA={SA} />
                    <Kpi label="Plan" value={tenantDet.tenant?.plan} icon={CreditCard} loading={false} SA={SA} />
                    <Kpi label="Staff" value={tenantDet.staffCount} icon={Users} loading={false} SA={SA} />
                    <Kpi label="Total orders" value={tenantDet.totalOrders} icon={ShoppingBag} loading={false} SA={SA} />
                  </div>
                  {tenantDet.usageHistory?.length > 0 && (
                    <div className="rounded-2xl p-5" style={{ background: SA.cardBg, border: `1px solid ${SA.cardBd}` }}>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-4" style={{ color: SA.textMut, fontFamily: FONTS.body }}>Usage history</p>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={tenantDet.usageHistory.map(u => ({ month: u.month?.slice(5), orders: u.orderCount }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="${SA.divider}" />
                          <XAxis dataKey="month" tick={{ fontSize: 10, fill: SA.textMut, fontFamily: FONTS.body }} />
                          <YAxis tick={{ fontSize: 10, fill: SA.textMut, fontFamily: FONTS.body }} />
                          <Tooltip content={<Tip SA={SA} prefix="" />} />
                          <Bar dataKey="orders" fill={SA.accent} radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {tenantDet.subscriptionHistory?.length > 0 && (
                    <div className="rounded-2xl overflow-hidden" style={{ background: SA.cardBg, border: `1px solid ${SA.cardBd}` }}>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] px-5 pt-5 pb-3" style={{ color: SA.textMut, fontFamily: FONTS.body }}>Payment history</p>
                      {tenantDet.subscriptionHistory.map((sub, i) => (
                        <div key={sub._id} className="flex items-center gap-4 px-5 py-3.5"
                          style={{ borderTop: i > 0 ? `1px solid ${SA.divider}` : 'none' }}>
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: SA.accentDim }}>
                            <CreditCard size={14} style={{ color: SA.accent }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold" style={{ color: SA.textPri, fontFamily: FONTS.body }}>{sub.planId}</p>
                            <p className="text-[10px]" style={{ color: SA.textMut, fontFamily: FONTS.body }}>{new Date(sub.createdAt).toLocaleDateString('en-IN')}</p>
                          </div>
                          <p className="text-[15px] font-black" style={{ color: SA.textPri, fontFamily: FONTS.heading }}>Rs {sub.amountNPR?.toLocaleString()}</p>
                          <Bdg s={sub.status} SA={SA} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="rounded-2xl p-5 h-28" style={{ background: SA.cardBg, border: `1px solid ${SA.cardBd}` }}>
                      <Sk SA={SA} h={10} w="50%" className="mb-3" /><Sk SA={SA} h={24} w="65%" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════ REVENUE ════ */}
          {tab === 'revenue' && (
            <div>
              <SH SA={SA} title="Revenue Analytics" sub="Platform-wide financial performance" />
              {revenue ? (
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Kpi label="Churn rate (30d)"
                      value={`${revenue.churnRate ?? 0}%`}
                      sub={revenue.churnRate > 10 ? 'High — needs attention' : 'Healthy'}
                      icon={TrendingUp}
                      accentColor={revenue.churnRate > 10 ? SA.red : SA.green}
                      loading={false} SA={SA} />
                  </div>

                  {/* Area chart */}
                  <div className="rounded-2xl p-5" style={{ background: SA.cardBg, border: `1px solid ${SA.cardBd}`, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-5" style={{ color: SA.textMut, fontFamily: FONTS.body }}>Monthly revenue</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={revenue.chartData ?? []}>
                        <defs>
                          <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={SA.accent} stopOpacity={D ? 0.3 : 0.2} />
                            <stop offset="100%" stopColor={SA.accent} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="${SA.divider}" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: SA.textMut, fontFamily: FONTS.body }} />
                        <YAxis tick={{ fontSize: 10, fill: SA.textMut, fontFamily: FONTS.body }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<Tip SA={SA} />} />
                        <Area type="monotone" dataKey="revenue" stroke={SA.accent} strokeWidth={2.5} fill="url(#rg)"
                          dot={{ fill: SA.accent, strokeWidth: 0, r: 4 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Horizontal bar */}
                  <div className="rounded-2xl p-5" style={{ background: SA.cardBg, border: `1px solid ${SA.cardBd}`, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-5" style={{ color: SA.textMut, fontFamily: FONTS.body }}>Revenue by plan</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={revenue.planRevenue ?? []} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="${SA.divider}" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: SA.textMut, fontFamily: FONTS.body }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="plan" tick={{ fontSize: 11, fill: SA.textMut, fontFamily: FONTS.body }} width={80} />
                        <Tooltip content={<Tip SA={SA} />} />
                        <Bar dataKey="totalRevenue" radius={[0, 6, 6, 0]}>
                          {(revenue.planRevenue ?? []).map((_, i) => <Cell key={i} fill={PIE_C[i % PIE_C.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="rounded-2xl p-5 h-56" style={{ background: SA.cardBg, border: `1px solid ${SA.cardBd}` }}>
                      <Sk SA={SA} h={10} w="30%" className="mb-4" /><Sk SA={SA} h={160} w="100%" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════ PLANS ════ */}
          {tab === 'plans' && (
            <div>
              <SH SA={SA} title="Subscription Plans" sub="All platform pricing tiers" />
              {plans?.plans ? (
                <div className="flex flex-col gap-4">
                  {plans.plans.map((p, i) => (
                    <div key={p.id}
                      className="rounded-2xl p-5 flex flex-wrap items-center gap-5 transition-all duration-200"
                      style={{ background: SA.cardBg, border: `1px solid ${SA.cardBd}`, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = SA.accentBd}
                      onMouseLeave={e => e.currentTarget.style.borderColor = SA.cardBd}>
                      <div className="flex items-center gap-3 min-w-[150px]">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `${PIE_C[i % PIE_C.length]}18`, border: `1px solid ${PIE_C[i % PIE_C.length]}30` }}>
                          <CreditCard size={15} style={{ color: PIE_C[i % PIE_C.length] }} />
                        </div>
                        <div>
                          <p className="text-[15px] font-extrabold" style={{ color: SA.textPri, fontFamily: FONTS.heading }}>{p.name}</p>
                          <p className="text-[9px] uppercase tracking-wide" style={{ color: SA.textMut, fontFamily: FONTS.body }}>{p.id} · {p.type}</p>
                        </div>
                      </div>
                      <div className="flex gap-5 flex-wrap flex-1">
                        {[
                          { l: 'Price/mo', v: `Rs ${p.priceNPR?.toLocaleString()}`, color: PIE_C[i % PIE_C.length] },
                          { l: 'Order cap', v: p.orderCap ?? '∞' },
                          { l: 'Staff incl.', v: p.includedStaff },
                          { l: 'Branches', v: p.includedBranches },
                          { l: 'Per staff', v: `Rs ${p.perStaffNPR}` },
                          { l: 'Per branch', v: `Rs ${p.perBranchNPR}` },
                        ].map(f => (
                          <div key={f.l}>
                            <p className="text-[9px] uppercase tracking-[0.12em] mb-1" style={{ color: SA.textMut, fontFamily: FONTS.body }}>{f.l}</p>
                            <p className="text-[15px] font-bold" style={{ color: f.color ?? SA.textPri, fontFamily: FONTS.body }}>{f.v}</p>
                          </div>
                        ))}
                      </div>
                      <Bdg s={p.isActive ? 'active' : 'suspended'} SA={SA} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 rounded-2xl" style={{ background: SA.cardBg, border: `1px solid ${SA.cardBd}` }} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════ CONFIG ════ */}
          {tab === 'config' && (
            <div>
              <SH SA={SA} title="Platform Config" sub="Global settings and controls" />
              <div className="flex flex-col gap-4 max-w-lg">

                {/* OTP */}
                <div className="rounded-2xl p-5" style={{ background: SA.cardBg, border: `1px solid ${SA.cardBd}`, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: SA.accentDim }}>
                        <Shield size={14} style={{ color: SA.accent }} />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold" style={{ color: SA.textPri, fontFamily: FONTS.body }}>OTP passcode reset</p>
                        <p className="text-[11px]" style={{ color: SA.textMut, fontFamily: FONTS.body }}>Allow customers to reset PIN via email</p>
                      </div>
                    </div>
                    <button onClick={() => toggleOtp(!config?.otpEnabled)}
                      className="px-4 py-2 rounded-xl text-[12px] font-bold transition-all shrink-0"
                      style={{
                        background: config?.otpEnabled ? SA.greenDim : SA.redDim,
                        border: `1px solid ${config?.otpEnabled ? SA.greenBd : SA.redBd}`,
                        color: config?.otpEnabled ? SA.green : SA.red,
                        fontFamily: FONTS.body,
                      }}>
                      {config?.otpEnabled ? '✓ Enabled' : '✕ Disabled'}
                    </button>
                  </div>
                </div>

                {/* Trial */}
                <div className="rounded-2xl p-5" style={{ background: SA.cardBg, border: `1px solid ${SA.cardBd}`, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: SA.accentDim }}>
                      <Clock size={14} style={{ color: SA.accent }} />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold" style={{ color: SA.textPri, fontFamily: FONTS.body }}>Trial period</p>
                      <p className="text-[11px]" style={{ color: SA.textMut, fontFamily: FONTS.body }}>Days given to new owners on signup</p>
                    </div>
                  </div>
                  <p style={{ fontFamily: FONTS.heading }}>
                    <span className="text-[40px] font-black" style={{ color: SA.accent }}>
                      {plans?.trialDays ?? config?.trialDays ?? 14}
                    </span>
                    <span className="text-[14px] font-semibold ml-2" style={{ color: SA.textMut, fontFamily: FONTS.body }}>days</span>
                  </p>
                </div>

                {/* eSewa */}
                <div className="rounded-2xl p-5" style={{ background: SA.cardBg, border: `1px solid ${SA.cardBd}`, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: SA.greenDim }}>
                      <CreditCard size={14} style={{ color: SA.green }} />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold" style={{ color: SA.textPri, fontFamily: FONTS.body }}>eSewa payments</p>
                      <p className="text-[11px]" style={{ color: SA.textMut, fontFamily: FONTS.body }}>Payment gateway status</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap mb-2">
                    <Bdg s={plans?.esewaEnabled ? 'active' : 'suspended'} SA={SA} />
                    {plans?.esewaTestMode && <Bdg s="trial" SA={SA} />}
                  </div>
                  <p className="text-[11px]" style={{ color: SA.textMut, fontFamily: FONTS.body }}>
                    {plans?.esewaEnabled ? 'Enabled' : 'Disabled'} · {plans?.esewaTestMode ? 'Test mode' : 'Live mode'}
                  </p>
                </div>

                {/* Cache flush */}
                <button
                  onClick={async () => { await api.post('/superadmin/cache/flush'); alert('All tenant caches flushed') }}
                  className="rounded-2xl p-5 flex items-center gap-4 text-left w-full transition-all"
                  style={{ background: SA.redDim, border: `1px solid ${SA.redBd}`, color: SA.red }}
                  onMouseEnter={e => e.currentTarget.style.background = D ? 'rgba(248,113,113,0.15)' : 'rgba(220,38,38,0.12)'}
                  onMouseLeave={e => e.currentTarget.style.background = SA.redDim}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: D ? 'rgba(248,113,113,0.15)' : 'rgba(220,38,38,0.1)' }}>
                    <Database size={14} style={{ color: SA.red }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold" style={{ fontFamily: FONTS.body }}>Flush all tenant caches</p>
                    <p className="text-[11px] opacity-70" style={{ fontFamily: FONTS.body }}>Forces all cafes to reload config from database</p>
                  </div>
                  <RefreshCw size={13} className="opacity-60" />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}