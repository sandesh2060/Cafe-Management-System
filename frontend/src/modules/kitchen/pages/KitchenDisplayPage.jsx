// src/modules/kitchen/pages/KitchenDisplayPage.jsx
//
// ✅ All previous centralization preserved
// ✅ NEW: Staff avatar + name in header
// ✅ NEW: Role badge (Kitchen / Manager)
// ✅ NEW: Logout button — dispatches logoutUser thunk, navigates to /staff/login
// ✅ NEW: Notification bell with unread dot
// ✅ NEW: Stats summary bar (total active, avg wait, completed today)
// ✅ All var(--token) — zero hardcoded hex

import { useState, useEffect, useCallback, useContext, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate }   from 'react-router-dom'
import api               from '@api/axios'
import socketService     from '@shared/services/socket.service'
import { playSound }     from '@shared/utils/soundPlayer'
import { selectRole, selectUser, logoutUser } from '@store/slices/authSlice'
import { ThemeContext }  from '@shared/context/ThemeContext'
import { BRAND }        from '@shared/config/brand'
import KdsOrderCard     from '../components/kds/KdsOrderCard'
import KitchenChatSidebar from '../components/chat/KitchenChatSidebar'
import InventoryAlerts  from '../components/inventory/InventoryAlerts'
import gsap             from 'gsap'
import {
  ChefHat, Bell, Sun, Moon, LogOut,
  Clock, CheckCircle2, Flame,
} from 'lucide-react'

const CAFE_ID = import.meta.env.VITE_CAFE_ID

// ── Role badge config ─────────────────────────────────────────────────────────
const ROLE_LABEL = {
  kitchen: { label: 'Kitchen', color: 'var(--accent)',  bg: 'var(--accent-dim)'  },
  manager: { label: 'Manager', color: 'var(--info)',    bg: 'var(--info-bg)'     },
  admin:   { label: 'Admin',   color: 'var(--success)', bg: 'var(--success-bg)'  },
}

// ── Avatar initials ───────────────────────────────────────────────────────────
const Avatar = ({ name, size = 32 }) => {
  const initials = (name || '?')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
  return (
    <div
      className="rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
      style={{
        width:      size,
        height:     size,
        background: 'var(--accent-gradient)',
        color:      'var(--text-inverse)',
        fontSize:   size < 36 ? 12 : 14,
      }}
    >
      {initials}
    </div>
  )
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
const StatPill = ({ icon: Icon, label, value, color }) => (
  <div
    className="flex items-center gap-2 px-3 py-2 rounded-xl"
    style={{ background: 'var(--pill-bg)', border: '1px solid var(--card-border)' }}
  >
    <Icon size={14} style={{ color }} />
    <div className="leading-none">
      <p className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  </div>
)

// ── Main page ─────────────────────────────────────────────────────────────────
const KitchenDisplayPage = () => {
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const role       = useSelector(selectRole)
  const user       = useSelector(selectUser)
  const { isDark, toggleTheme } = useContext(ThemeContext)

  const [orders,    setOrders]    = useState([])
  const [alerts,    setAlerts]    = useState(false)
  const [newIds,    setNewIds]    = useState(new Set())
  const [completed, setCompleted] = useState(0)   // completed today count
  const [loggingOut, setLoggingOut] = useState(false)
  const [bellPulse,  setBellPulse]  = useState(false)

  const statsRef = useRef(null)

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const data = await api.get(`/orders/kds?cafeId=${CAFE_ID}`)
      setOrders(data.orders || data.data?.orders || [])
    } catch {}
  }, [])

  const refreshCompleted = useCallback(async () => {
    try {
      const data = await api.get(`/orders/completed-today?cafeId=${CAFE_ID}`)
      setCompleted(data.count ?? data.data?.count ?? 0)
    } catch {}
  }, [])

  // ── Socket ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    refresh()
    refreshCompleted()

    const unsubs = [
      socketService.on('order:new', (data) => {
        const order = data.order || data
        playSound('newOrderBell', role)
        setOrders(prev => [order, ...prev])
        setNewIds(prev => new Set([...prev, order._id]))
        setBellPulse(true)
        setTimeout(() => setNewIds(prev => {
          const n = new Set(prev); n.delete(order._id); return n
        }), 2000)
        setTimeout(() => setBellPulse(false), 3000)
      }),
      socketService.on('order:status-changed', () => {
        refresh()
        refreshCompleted()
      }),
    ]
    return () => unsubs.forEach(fn => fn())
  }, [refresh, refreshCompleted, role])

  // ── Stats bar entrance animation ────────────────────────────────────────────
  useEffect(() => {
    if (!statsRef.current) return
    gsap.fromTo(statsRef.current,
      { opacity: 0, y: -8 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', delay: 0.15 }
    )
  }, [])

  // ── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await dispatch(logoutUser()).unwrap()
    } catch {
      // logout always succeeds client-side even if server errors
    }
    navigate('/staff/login', { replace: true })
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const pending   = orders.filter(o => o.status === 'pending')
  const preparing = orders.filter(o => o.status === 'preparing')
  const totalActive = pending.length + preparing.length

  // Rough avg wait: oldest pending order
  const oldestPending = pending.length > 0
    ? Math.floor((Date.now() - new Date(pending[pending.length - 1]?.createdAt ?? Date.now())) / 60000)
    : null

  const roleCfg = ROLE_LABEL[role] ?? ROLE_LABEL.kitchen

  const startOrder = (orderId) => socketService.emit('kitchen:order-start', { orderId })
  const readyOrder = (orderId) => socketService.emit('kitchen:order-ready', { orderId })

  return (
    <div
      className="min-h-dvh flex flex-col transition-colors duration-300"
      style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      {/* ══ Header ══════════════════════════════════════════════════════════ */}
      <header
        className="flex items-center justify-between px-4 md:px-6 py-3 border-b flex-shrink-0 sticky top-0 z-30"
        style={{
          background:      'var(--header-bg)',
          borderColor:     'var(--header-border)',
          backdropFilter:  'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* Left: logo + name + role badge */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
            style={{ background: 'var(--accent-gradient)' }}
          >
            <ChefHat size={18} style={{ color: 'var(--text-inverse)' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base leading-tight" style={{ color: 'var(--text-primary)' }}>
                Kitchen Display
              </h1>
              {/* Role badge */}
              <span
                className="hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: roleCfg.bg, color: roleCfg.color }}
              >
                {roleCfg.label}
              </span>
            </div>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{BRAND.name}</p>
          </div>
        </div>

        {/* Right: stats + controls */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Desktop pending/cooking counters */}
          <div className="hidden sm:flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--warning-bg, rgba(251,191,36,0.1))', color: 'var(--warning)' }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--warning)' }} />
              {pending.length} pending
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
              {preparing.length} cooking
            </div>
          </div>

          {/* Mobile total */}
          <div className="sm:hidden flex items-center gap-1 text-sm font-bold" style={{ color: 'var(--accent)' }}>
            <Flame size={14} />
            {totalActive}
          </div>

          {/* Notification bell */}
          <button
            onClick={() => { setAlerts(a => !a); setBellPulse(false) }}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors relative"
            style={{ background: 'var(--pill-bg)', color: bellPulse ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            <Bell size={17} className={bellPulse ? 'animate-bounce-soft' : ''} />
            {(alerts || bellPulse) && (
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ background: bellPulse ? 'var(--accent)' : 'var(--danger)' }}
              />
            )}
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: 'var(--pill-bg)' }}
          >
            {isDark
              ? <Sun  size={16} style={{ color: 'var(--warning)' }} />
              : <Moon size={16} style={{ color: 'var(--info)'    }} />}
          </button>

          {/* Avatar + name (desktop) */}
          <div className="hidden md:flex items-center gap-2 pl-1 border-l" style={{ borderColor: 'var(--divider)' }}>
            <Avatar name={user?.name} size={32} />
            <div className="leading-none">
              <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                {user?.name?.split(' ')[0] ?? 'Staff'}
              </p>
              <p className="text-[10px] capitalize" style={{ color: roleCfg.color }}>{role}</p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
            style={{
              background:  'var(--danger-bg)',
              color:       'var(--danger)',
              border:      '1px solid var(--danger-border)',
            }}
            title="Logout"
          >
            {loggingOut
              ? <span className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--danger-border)', borderTopColor: 'var(--danger)' }} />
              : <LogOut size={14} />}
            <span className="hidden sm:inline">{loggingOut ? 'Logging out…' : 'Logout'}</span>
          </button>
        </div>
      </header>

      {/* ══ Stats summary bar ════════════════════════════════════════════════ */}
      <div
        ref={statsRef}
        className="flex items-center gap-3 px-4 py-2.5 border-b overflow-x-auto scrollbar-hide flex-shrink-0"
        style={{ borderColor: 'var(--divider)', background: 'var(--header-bg)' }}
      >
        <StatPill
          icon={Flame}
          label="Active"
          value={totalActive}
          color="var(--accent)"
        />
        <StatPill
          icon={Clock}
          label="Oldest wait"
          value={oldestPending !== null ? `${oldestPending}m` : '—'}
          color={oldestPending !== null && oldestPending >= 15 ? 'var(--danger)' : 'var(--warning)'}
        />
        <StatPill
          icon={CheckCircle2}
          label="Done today"
          value={completed}
          color="var(--success)"
        />
        {/* Mobile role badge */}
        <div className="sm:hidden ml-auto flex-shrink-0">
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: roleCfg.bg, color: roleCfg.color }}
          >
            {roleCfg.label}
          </span>
        </div>
      </div>

      {/* ══ Inventory alerts ════════════════════════════════════════════════ */}
      {alerts && (
        <div className="px-4 pt-3">
          <InventoryAlerts onClose={() => setAlerts(false)} />
        </div>
      )}

      {/* ══ Main: KDS grid + chat sidebar ═══════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-3 md:p-4">
          {pending.length === 0 && preparing.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{ background: 'var(--pill-bg)' }}
              >
                <ChefHat size={36} style={{ color: 'var(--text-disabled)' }} />
              </div>
              <p className="text-lg font-medium" style={{ color: 'var(--text-muted)' }}>
                All caught up! Waiting for orders…
              </p>
              {completed > 0 && (
                <p className="text-sm" style={{ color: 'var(--success)' }}>
                  ✓ {completed} order{completed !== 1 ? 's' : ''} completed today
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending */}
              {pending.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--warning)' }} />
                    <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--warning)' }}>
                      Pending — {pending.length}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {pending.map(order => (
                      <KdsOrderCard
                        key={order._id}
                        order={order}
                        onStart={() => startOrder(order._id)}
                        color="yellow"
                        isNew={newIds.has(order._id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Cooking */}
              {preparing.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
                    <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
                      Cooking — {preparing.length}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {preparing.map(order => (
                      <KdsOrderCard
                        key={order._id}
                        order={order}
                        onReady={() => readyOrder(order._id)}
                        color="orange"
                        isNew={false}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        <KitchenChatSidebar />
      </div>
    </div>
  )
}

export default KitchenDisplayPage