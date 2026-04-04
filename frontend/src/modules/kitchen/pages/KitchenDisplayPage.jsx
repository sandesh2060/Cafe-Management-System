// src/modules/kitchen/pages/KitchenDisplayPage.jsx
//
// ─── MODULE 23: KDS Upgrades ──────────────────────────────────────────────────
// ★ Filter bar — All / Pending / Cooking tabs
// ★ Batch "Start All Pending" button
// ★ Sound toggle in header (persisted to localStorage)
// ★ Per-station view — All / Grill / Fryer / Cold
// ★ All existing header, stats bar, inventory alerts, chat sidebar — UNCHANGED
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useContext, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate }   from 'react-router-dom'
import api               from '@api/axios'
import socketService     from '@shared/services/socket.service'
import { playSound }     from '@shared/utils/soundPlayer'
import { selectRole, selectUser, logoutUser } from '@store/slices/authSlice'
import { ThemeContext }  from '@shared/context/ThemeContext'
import { BRAND }         from '@shared/config/brand'
import KdsOrderCard      from '../components/kds/KdsOrderCard'
import KitchenChatSidebar from '../components/chat/KitchenChatSidebar'
import InventoryAlerts   from '../components/inventory/InventoryAlerts'
import gsap              from 'gsap'
import {
  ChefHat, Bell, Sun, Moon, LogOut,
  Clock, CheckCircle2, Flame, Volume2, VolumeX,
  PlayCircle, Layers,
} from 'lucide-react'

const CAFE_ID = import.meta.env.VITE_CAFE_ID

const ROLE_LABEL = {
  kitchen: { label: 'Kitchen', color: 'var(--accent)',  bg: 'var(--accent-dim)'  },
  manager: { label: 'Manager', color: 'var(--info)',    bg: 'var(--info-bg)'     },
  admin:   { label: 'Admin',   color: 'var(--success)', bg: 'var(--success-bg)'  },
}

// ★ Station config — maps station key → item keywords
const STATIONS = {
  all:   { label: 'All',   keywords: null },
  grill: { label: 'Grill', keywords: ['burger', 'steak', 'grill', 'bbq', 'beef', 'chicken', 'pork', 'kebab'] },
  fryer: { label: 'Fryer', keywords: ['fries', 'fried', 'wings', 'nugget', 'crispy', 'tempura', 'chips'] },
  cold:  { label: 'Cold',  keywords: ['salad', 'sushi', 'sashimi', 'smoothie', 'juice', 'shake', 'ice', 'cold'] },
}

// ── Filter tabs ───────────────────────────────────────────────────────────────
const FilterTab = ({ label, count, active, onClick, color }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
    style={{
      background: active ? (color ?? 'var(--accent-dim)') : 'var(--pill-bg)',
      color:      active ? (color ? '#fff' : 'var(--accent)') : 'var(--text-muted)',
      border:     `1px solid ${active ? 'transparent' : 'var(--card-border)'}`,
    }}
  >
    {label}
    {count !== undefined && (
      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
        style={{
          background: active ? 'rgba(255,255,255,0.25)' : 'var(--accent-dim)',
          color:      active ? '#fff' : 'var(--accent)',
          minWidth: 18, textAlign: 'center',
        }}>
        {count}
      </span>
    )}
  </button>
)

const Avatar = ({ name, size = 32 }) => {
  const initials = (name || '?').split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
  return (
    <div className="rounded-xl flex items-center justify-center font-bold flex-shrink-0"
      style={{ width:size, height:size, background:'var(--accent-gradient)', color:'var(--text-inverse)', fontSize: size < 36 ? 12 : 14 }}>
      {initials}
    </div>
  )
}

const StatPill = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
    style={{ background:'var(--pill-bg)', border:'1px solid var(--card-border)' }}>
    <Icon size={14} style={{ color }} />
    <div className="leading-none">
      <p className="text-xs font-black" style={{ color:'var(--text-primary)' }}>{value}</p>
      <p className="text-[10px]" style={{ color:'var(--text-muted)' }}>{label}</p>
    </div>
  </div>
)

// ── Filter orders by station ──────────────────────────────────────────────────
const filterByStation = (orders, station) => {
  if (station === 'all') return orders
  const keywords = STATIONS[station]?.keywords ?? []
  return orders.filter(order =>
    order.items?.some(item =>
      keywords.some(kw => item.name?.toLowerCase().includes(kw))
    )
  )
}

const KitchenDisplayPage = () => {
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const role       = useSelector(selectRole)
  const user       = useSelector(selectUser)
  const { isDark, toggleTheme } = useContext(ThemeContext)

  const [orders,     setOrders]     = useState([])
  const [alerts,     setAlerts]     = useState(false)
  const [newIds,     setNewIds]     = useState(new Set())
  const [completed,  setCompleted]  = useState(0)
  const [loggingOut, setLoggingOut] = useState(false)
  const [bellPulse,  setBellPulse]  = useState(false)

  // ★ NEW state
  const [filter,    setFilter]    = useState('all')    // 'all' | 'pending' | 'cooking'
  const [station,   setStation]   = useState('all')    // 'all' | 'grill' | 'fryer' | 'cold'
  const [soundOn,   setSoundOn]   = useState(() => localStorage.getItem('kds-sound') !== 'off')
  const [startingAll, setStartingAll] = useState(false)

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
        if (soundOn) playSound('newOrderBell', role)
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
  }, [refresh, refreshCompleted, role, soundOn])

  // Stats bar entrance
  useEffect(() => {
    if (!statsRef.current) return
    gsap.fromTo(statsRef.current,
      { opacity:0, y:-8 },
      { opacity:1, y:0, duration:0.4, ease:'power2.out', delay:0.15 }
    )
  }, [])

  // ── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try { await dispatch(logoutUser()).unwrap() } catch {}
    navigate('/staff/login', { replace: true })
  }

  // ── Sound toggle ──────────────────────────────────────────────────────────
  const toggleSound = () => {
    setSoundOn(prev => {
      const next = !prev
      localStorage.setItem('kds-sound', next ? 'on' : 'off')
      return next
    })
  }

  // ── Batch start all pending ───────────────────────────────────────────────
  const handleStartAll = useCallback(async () => {
    if (startingAll) return
    const pendingOrders = orders.filter(o => o.status === 'pending')
    if (!pendingOrders.length) return
    setStartingAll(true)
    // Emit start for each with a short stagger so kitchen doesn't get slammed
    for (const order of pendingOrders) {
      socketService.emit('kitchen:order-start', { orderId: order._id })
      await new Promise(r => setTimeout(r, 120))
    }
    setTimeout(() => { refresh(); setStartingAll(false) }, 500)
  }, [orders, startingAll, refresh])

  // ── Derived ─────────────────────────────────────────────────────────────────
  const pending     = orders.filter(o => o.status === 'pending')
  const preparing   = orders.filter(o => o.status === 'preparing')
  const totalActive = pending.length + preparing.length

  const oldestPending = pending.length > 0
    ? Math.floor((Date.now() - new Date(pending[pending.length - 1]?.createdAt ?? Date.now())) / 60000)
    : null

  // ★ Apply station filter
  const filteredPending   = filterByStation(pending,   station)
  const filteredPreparing = filterByStation(preparing, station)

  // ★ Apply status filter
  const showPending   = filter === 'all' || filter === 'pending'
  const showPreparing = filter === 'all' || filter === 'cooking'

  const roleCfg = ROLE_LABEL[role] ?? ROLE_LABEL.kitchen

  const startOrder = (orderId) => socketService.emit('kitchen:order-start', { orderId })
  const readyOrder = (orderId) => socketService.emit('kitchen:order-ready', { orderId })

  return (
    <div className="min-h-dvh flex flex-col transition-colors duration-300"
      style={{ background:'var(--bg)', color:'var(--text-primary)' }}>

      {/* ══ Header ══════════════════════════════════════════════════════════ */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b flex-shrink-0 sticky top-0 z-30"
        style={{ background:'var(--header-bg)', borderColor:'var(--header-border)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)' }}>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
            style={{ background:'var(--accent-gradient)' }}>
            <ChefHat size={18} style={{ color:'var(--text-inverse)' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base leading-tight" style={{ color:'var(--text-primary)' }}>
                Kitchen Display
              </h1>
              <span className="hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background:roleCfg.bg, color:roleCfg.color }}>
                {roleCfg.label}
              </span>
            </div>
            <p className="text-[10px]" style={{ color:'var(--text-muted)' }}>{BRAND.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Desktop counters */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold"
              style={{ background:'var(--warning-bg, rgba(251,191,36,0.1))', color:'var(--warning)' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background:'var(--warning)' }} />
              {pending.length} pending
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold"
              style={{ background:'var(--accent-dim)', color:'var(--accent)' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background:'var(--accent)' }} />
              {preparing.length} cooking
            </div>
          </div>

          <div className="sm:hidden flex items-center gap-1 text-sm font-bold" style={{ color:'var(--accent)' }}>
            <Flame size={14} /> {totalActive}
          </div>

          {/* ★ Sound toggle */}
          <button
            onClick={toggleSound}
            title={soundOn ? 'Mute sounds' : 'Enable sounds'}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: soundOn ? 'var(--accent-dim)' : 'var(--pill-bg)', color: soundOn ? 'var(--accent)' : 'var(--text-disabled)' }}>
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Notification bell */}
          <button
            onClick={() => { setAlerts(a => !a); setBellPulse(false) }}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors relative"
            style={{ background:'var(--pill-bg)', color: bellPulse ? 'var(--accent)' : 'var(--text-muted)' }}>
            <Bell size={17} />
            {(alerts || bellPulse) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ background: bellPulse ? 'var(--accent)' : 'var(--danger)' }} />
            )}
          </button>

          {/* Theme toggle */}
          <button onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background:'var(--pill-bg)' }}>
            {isDark ? <Sun size={16} style={{ color:'var(--warning)' }} /> : <Moon size={16} style={{ color:'var(--info)' }} />}
          </button>

          {/* Avatar */}
          <div className="hidden md:flex items-center gap-2 pl-1 border-l" style={{ borderColor:'var(--divider)' }}>
            <Avatar name={user?.name} size={32} />
            <div className="leading-none">
              <p className="text-xs font-bold" style={{ color:'var(--text-primary)' }}>
                {user?.name?.split(' ')[0] ?? 'Staff'}
              </p>
              <p className="text-[10px] capitalize" style={{ color:roleCfg.color }}>{role}</p>
            </div>
          </div>

          {/* Logout */}
          <button onClick={handleLogout} disabled={loggingOut}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
            style={{ background:'var(--danger-bg)', color:'var(--danger)', border:'1px solid var(--danger-border)' }}
            title="Logout">
            {loggingOut
              ? <span className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor:'var(--danger-border)', borderTopColor:'var(--danger)' }} />
              : <LogOut size={14} />}
            <span className="hidden sm:inline">{loggingOut ? 'Logging out…' : 'Logout'}</span>
          </button>
        </div>
      </header>

      {/* ══ Stats bar ════════════════════════════════════════════════════════ */}
      <div ref={statsRef}
        className="flex items-center gap-3 px-4 py-2.5 border-b overflow-x-auto scrollbar-hide flex-shrink-0"
        style={{ borderColor:'var(--divider)', background:'var(--header-bg)' }}>
        <StatPill icon={Flame}        label="Active"      value={totalActive}  color="var(--accent)" />
        <StatPill icon={Clock}        label="Oldest wait" value={oldestPending !== null ? `${oldestPending}m` : '—'} color={oldestPending !== null && oldestPending >= 15 ? 'var(--danger)' : 'var(--warning)'} />
        <StatPill icon={CheckCircle2} label="Done today"  value={completed}    color="var(--success)" />
        <div className="sm:hidden ml-auto flex-shrink-0">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{ background:roleCfg.bg, color:roleCfg.color }}>
            {roleCfg.label}
          </span>
        </div>
      </div>

      {/* ★ Filter + station bar ══════════════════════════════════════════════ */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b flex-shrink-0 overflow-x-auto scrollbar-hide"
        style={{ borderColor:'var(--divider)', background:'var(--header-bg)' }}>

        {/* Status filter */}
        <div className="flex items-center gap-2 shrink-0">
          <FilterTab label="All"     count={totalActive}     active={filter === 'all'}     onClick={() => setFilter('all')} />
          <FilterTab label="Pending" count={pending.length}  active={filter === 'pending'} onClick={() => setFilter('pending')}
            color="rgba(245,158,11,0.8)" />
          <FilterTab label="Cooking" count={preparing.length} active={filter === 'cooking'} onClick={() => setFilter('cooking')}
            color="rgba(255,159,28,0.85)" />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* ★ Station filter */}
          <div className="flex items-center gap-1.5">
            <Layers size={13} style={{ color:'var(--text-muted)', flexShrink:0 }} />
            {Object.entries(STATIONS).map(([key, cfg]) => (
              <button key={key} onClick={() => setStation(key)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
                style={{
                  background: station === key ? 'var(--accent-dim)' : 'transparent',
                  color:      station === key ? 'var(--accent)' : 'var(--text-muted)',
                  border:     `1px solid ${station === key ? 'var(--accent-border)' : 'transparent'}`,
                }}>
                {cfg.label}
              </button>
            ))}
          </div>

          {/* ★ Batch start all */}
          {pending.length > 0 && filter !== 'cooking' && (
            <button
              onClick={handleStartAll}
              disabled={startingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 shrink-0"
              style={{ background:'var(--accent-gradient)', color:'var(--text-inverse)' }}>
              {startingAll
                ? <span className="w-3 h-3 rounded-full border-2 animate-spin" style={{ borderColor:'rgba(255,255,255,0.4)', borderTopColor:'#fff' }} />
                : <PlayCircle size={13} />}
              Start All ({pending.length})
            </button>
          )}
        </div>
      </div>

      {/* ══ Inventory alerts ════════════════════════════════════════════════ */}
      {alerts && (
        <div className="px-4 pt-3">
          <InventoryAlerts onClose={() => setAlerts(false)} />
        </div>
      )}

      {/* ══ Main: KDS grid + chat ════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-3 md:p-4">

          {filteredPending.length === 0 && filteredPreparing.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{ background:'var(--pill-bg)' }}>
                <ChefHat size={36} style={{ color:'var(--text-disabled)' }} />
              </div>
              <p className="text-lg font-medium" style={{ color:'var(--text-muted)' }}>
                {station !== 'all'
                  ? `No ${STATIONS[station].label} orders right now`
                  : filter !== 'all'
                    ? `No ${filter} orders`
                    : 'All caught up! Waiting for orders…'}
              </p>
              {completed > 0 && (
                <p className="text-sm" style={{ color:'var(--success)' }}>
                  ✓ {completed} order{completed !== 1 ? 's' : ''} completed today
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending section */}
              {showPending && filteredPending.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ background:'var(--warning)' }} />
                      <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color:'var(--warning)' }}>
                        Pending — {filteredPending.length}
                        {station !== 'all' && ` (${STATIONS[station].label})`}
                      </h2>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredPending.map(order => (
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

              {/* Cooking section */}
              {showPreparing && filteredPreparing.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background:'var(--accent)' }} />
                    <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color:'var(--accent)' }}>
                      Cooking — {filteredPreparing.length}
                      {station !== 'all' && ` (${STATIONS[station].label})`}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredPreparing.map(order => (
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