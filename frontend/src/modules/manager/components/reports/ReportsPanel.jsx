// src/modules/manager/components/reports/ReportsPanel.jsx
import { useState, useEffect, useRef, useContext } from 'react'
import { ThemeContext } from '@shared/context/ThemeContext'
import api from '@api/axios'
import gsap from 'gsap'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts'
import { COLORS } from '@colors'
import {
  ShoppingBag, IndianRupee, Clock, Bell,
  TrendingUp, Calendar, User
} from 'lucide-react'

const ChartTooltip = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-3 py-2 shadow-lg border text-xs"
      style={{
        backgroundColor: isDark ? COLORS.dark.surface : '#fff',
        borderColor:     isDark ? COLORS.dark.border  : COLORS.cream.border,
        color:           isDark ? COLORS.dark.text     : COLORS.brew.DEFAULT,
      }}
    >
      <p className="font-bold mb-1" style={{ color: isDark ? COLORS.dark.muted : COLORS.brew.soft }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

// Animated counter
const AnimatedNumber = ({ value, prefix = '', suffix = '' }) => {
  const elRef  = useRef(null)
  const objRef = useRef({ val: 0 })

  useEffect(() => {
    if (!elRef.current || value == null) return
    const target = parseFloat(String(value).replace(/[^\d.]/g, '')) || 0
    gsap.to(objRef.current, {
      val: target,
      duration: 1,
      ease: 'power2.out',
      onUpdate: () => {
        if (elRef.current) {
          elRef.current.textContent = `${prefix}${Math.round(objRef.current.val).toLocaleString()}${suffix}`
        }
      },
    })
  }, [value, prefix, suffix])

  return <span ref={elRef}>{prefix}0{suffix}</span>
}

const DailyStat = ({ icon: Icon, label, value, prefix, suffix, color, delay, isDark }) => {
  const cardRef = useRef(null)

  useEffect(() => {
    if (!cardRef.current) return
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 0.4, delay, ease: 'back.out(1.5)' }
    )
  }, [delay])

  return (
    <div
      ref={cardRef}
      className="rounded-2xl border p-3 text-center"
      style={{
        backgroundColor: isDark ? COLORS.dark.surface : '#fff',
        borderColor:     isDark ? COLORS.dark.border  : COLORS.cream.border,
        boxShadow:       COLORS.shadows.card,
      }}
    >
      <div
        className="w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center"
        style={{ backgroundColor: color + '18' }}
      >
        <Icon size={15} color={color} />
      </div>
      <p className="text-xl font-bold" style={{ color: isDark ? COLORS.dark.text : COLORS.brew.DEFAULT }}>
        <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
      </p>
      <p className="text-[11px] mt-0.5" style={{ color: isDark ? COLORS.dark.muted : COLORS.brew.soft }}>
        {label}
      </p>
    </div>
  )
}

const SectionCard = ({ title, subtitle, children, isDark }) => (
  <div
    className="rounded-2xl border p-4"
    style={{
      backgroundColor: isDark ? COLORS.dark.surface : '#fff',
      borderColor:     isDark ? COLORS.dark.border  : COLORS.cream.border,
      boxShadow:       COLORS.shadows.card,
    }}
  >
    <div className="mb-4">
      <h3 className="font-bold text-sm" style={{ color: isDark ? COLORS.dark.text : COLORS.brew.DEFAULT }}>{title}</h3>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: isDark ? COLORS.dark.muted : COLORS.brew.soft }}>{subtitle}</p>}
    </div>
    {children}
  </div>
)

const ReportsPanel = () => {
  const { isDark } = useContext(ThemeContext)
  const [daily,   setDaily]   = useState(null)
  const [staff,   setStaff]   = useState(null)
  const [loading, setLoading] = useState(true)
  const headerRef = useRef(null)

  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(headerRef.current, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.3 })
    }
    Promise.all([
      api.get('/reports/daily'),
      api.get('/reports/staff?days=7'),
    ])
      .then(([d, s]) => {
        setDaily(d?.data || d)
        setStaff(s?.data || s)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const tickStyle = { fontSize: 11, fill: isDark ? COLORS.dark.muted : COLORS.brew.soft }
  const gridColor = isDark ? 'rgba(255,159,28,0.07)' : '#f0f0f0'

  if (loading) return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ backgroundColor: isDark ? COLORS.dark.surface : COLORS.cream.deep }} />
      ))}
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div ref={headerRef}>
        <h2 className="text-xl font-bold" style={{ color: isDark ? COLORS.dark.text : COLORS.brew.DEFAULT }}>
          Reports
        </h2>
        <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: isDark ? COLORS.dark.muted : COLORS.brew.soft }}>
          <Calendar size={11} />
          Today — {daily?.date || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>

      {/* Daily stat cards */}
      {daily && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <DailyStat isDark={isDark} delay={0.05} icon={ShoppingBag} label="Orders"       color={COLORS.saffron.DEFAULT}          value={daily.orders}           />
          <DailyStat isDark={isDark} delay={0.10} icon={IndianRupee} label="Revenue"      color={COLORS.matcha.DEFAULT}           value={daily.revenue}          prefix="₹" />
          <DailyStat isDark={isDark} delay={0.15} icon={TrendingUp}  label="Avg Order"    color={COLORS.roles.manager.DEFAULT}    value={daily.avgOrderValue}    prefix="₹" />
          <DailyStat isDark={isDark} delay={0.20} icon={Bell}        label="Waiter Calls" color={COLORS.terra.DEFAULT}            value={daily.waiterCalls}      />
        </div>
      )}

      {/* Avg response time */}
      {daily?.avgResponseMinutes > 0 && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{
            backgroundColor: isDark ? COLORS.dark.surface2 : COLORS.cream.dark,
            border:          `1px solid ${isDark ? COLORS.dark.border : COLORS.cream.border}`,
          }}
        >
          <Clock size={14} color={isDark ? COLORS.dark.muted : COLORS.brew.soft} />
          <p className="text-xs" style={{ color: isDark ? COLORS.dark.muted : COLORS.brew.soft }}>
            Avg waiter response time:
            <span className="font-bold ml-1" style={{ color: isDark ? COLORS.dark.text : COLORS.brew.DEFAULT }}>
              {daily.avgResponseMinutes} min
            </span>
          </p>
        </div>
      )}

      {/* Waiter performance chart */}
      {staff?.waiters?.length > 0 && (
        <SectionCard
          title="Waiter Performance"
          subtitle="Calls handled in the last 7 days"
          isDark={isDark}
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={staff.waiters} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" tick={tickStyle} />
              <YAxis tick={tickStyle} />
              <Tooltip content={<ChartTooltip isDark={isDark} />} />
              <Bar
                dataKey="calls"
                name="Calls"
                fill={COLORS.saffron.DEFAULT}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* Staff revenue contribution */}
      {staff?.waiters?.length > 0 && staff.waiters.some((w) => w.revenue > 0) && (
        <SectionCard
          title="Revenue by Waiter"
          subtitle="Total sales served per staff"
          isDark={isDark}
        >
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={staff.waiters} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" tick={tickStyle} />
              <YAxis tick={tickStyle} tickFormatter={(v) => `₹${v}`} />
              <Tooltip content={<ChartTooltip isDark={isDark} />} />
              <Bar
                dataKey="revenue"
                name="Revenue"
                fill={COLORS.matcha.DEFAULT}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* Staff breakdown table */}
      {staff?.waiters?.length > 0 && (
        <SectionCard title="Staff Summary" isDark={isDark}>
          <div className="space-y-2">
            {staff.waiters.map((w) => (
              <div
                key={w.name}
                className="flex items-center gap-3 p-2.5 rounded-xl"
                style={{ backgroundColor: isDark ? COLORS.dark.surface2 : COLORS.cream.DEFAULT }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: COLORS.roles.waiter.DEFAULT }}
                >
                  {w.name?.[0]?.toUpperCase() || 'W'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: isDark ? COLORS.dark.text : COLORS.brew.DEFAULT }}>{w.name}</p>
                  <p className="text-xs" style={{ color: isDark ? COLORS.dark.muted : COLORS.brew.soft }}>
                    {w.calls ?? 0} calls · ₹{(w.revenue ?? 0).toLocaleString()} revenue
                  </p>
                </div>
                <div
                  className="text-xs font-bold px-2 py-1 rounded-lg"
                  style={{
                    backgroundColor: COLORS.matcha.soft,
                    color:           COLORS.matcha.dark,
                  }}
                >
                  {w.avgResponse ?? 0}m avg
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

export default ReportsPanel