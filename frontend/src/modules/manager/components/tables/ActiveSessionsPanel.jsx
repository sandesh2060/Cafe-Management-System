// src/modules/manager/components/tables/ActiveSessionsPanel.jsx
import { useState, useEffect, useRef, useContext, useCallback } from 'react'
import { ThemeContext } from '@shared/context/ThemeContext'
import api        from '@api/axios'
import gsap       from 'gsap'
import { COLORS } from '@colors'
import { MapPin, Users, Wifi, RefreshCw, Clock, Activity } from 'lucide-react'

const METHOD_ICON = { gps: '📍', qr: '📷', manual: '✋' }
const ZONE_COLOR  = {
  Indoor:  COLORS.roles.manager.DEFAULT,
  Outdoor: COLORS.matcha.DEFAULT,
  Terrace: COLORS.saffron.DEFAULT,
}

const ElapsedBadge = ({ openedAt, isDark }) => {
  const [mins, setMins] = useState(0)
  useEffect(() => {
    const update = () => setMins(Math.floor((Date.now() - new Date(openedAt)) / 60000))
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [openedAt])

  const isLong = mins > 60
  return (
    <span
      className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{
        backgroundColor: isLong ? COLORS.status.errorBg  : (isDark ? COLORS.dark.surface2 : COLORS.cream.deep),
        color:           isLong ? COLORS.status.error     : (isDark ? COLORS.dark.muted    : COLORS.brew.soft),
      }}
    >
      <Clock size={9} />
      {mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`}
    </span>
  )
}

const SessionCard = ({ session, index, isDark }) => {
  const cardRef = useRef(null)
  const zone    = session.zone || 'Indoor'
  const zoneColor = ZONE_COLOR[zone] ?? COLORS.brew.light

  useEffect(() => {
    if (!cardRef.current) return
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.35, delay: index * 0.06, ease: 'power2.out' }
    )
  }, [index])

  return (
    <div
      ref={cardRef}
      className="flex items-center gap-3 px-4 py-3 transition-colors"
      style={{
        borderBottom: `1px solid ${isDark ? COLORS.dark.border : COLORS.cream.border}`,
      }}
    >
      {/* Table badge */}
      <div
        className="w-10 h-10 rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0 font-bold text-xs leading-tight"
        style={{ background: `linear-gradient(135deg, ${zoneColor}, ${zoneColor}aa)` }}
      >
        <span className="text-[10px] opacity-80">T</span>
        <span className="text-sm leading-none">{session.tableNumber ?? '?'}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold" style={{ color: isDark ? COLORS.dark.text : COLORS.brew.DEFAULT }}>
            {zone}
          </p>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: zoneColor + '20',
              color:           zoneColor,
            }}
          >
            {zone.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-xs flex items-center gap-1" style={{ color: isDark ? COLORS.dark.muted : COLORS.brew.soft }}>
            <Users size={10} />
            {session.users?.length || 1} guest{(session.users?.length || 1) > 1 ? 's' : ''}
          </span>
          <span className="text-xs" style={{ color: isDark ? COLORS.dark.muted : COLORS.brew.soft }}>
            {METHOD_ICON[session.detectionMethod] ?? '?'} {session.detectionMethod?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Right: time + active dot */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <ElapsedBadge openedAt={session.openedAt} isDark={isDark} />
        <div className="flex items-center gap-1">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: COLORS.matcha.DEFAULT }}
          />
          <span className="text-[10px] font-bold" style={{ color: COLORS.matcha.DEFAULT }}>
            Live
          </span>
        </div>
      </div>
    </div>
  )
}

const ActiveSessionsPanel = () => {
  const { isDark } = useContext(ThemeContext)
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const headerRef = useRef(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/table-session/active')
      .then((d) => setSessions(d.sessions || []))
      .catch(() => {})
      .finally(() => { setLoading(false); setLastRefresh(Date.now()) })
  }, [])

  useEffect(() => { load() }, [load])

  // Header animate in
  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(headerRef.current, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.3 })
    }
  }, [])

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [load])

  // Zone summary counts
  const zoneCounts = sessions.reduce((acc, s) => {
    const z = s.zone || 'Indoor'
    acc[z] = (acc[z] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {/* Header */}
      <div ref={headerRef} className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold" style={{ color: isDark ? COLORS.dark.text : COLORS.brew.DEFAULT }}>
            Active Sessions
          </h2>
          <p className="text-xs mt-0.5" style={{ color: isDark ? COLORS.dark.muted : COLORS.brew.soft }}>
            {sessions.length} table{sessions.length !== 1 ? 's' : ''} occupied
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
          style={{
            backgroundColor: isDark ? COLORS.dark.surface : COLORS.cream.deep,
            color:           isDark ? COLORS.dark.muted   : COLORS.brew.soft,
          }}
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* Zone summary chips */}
      {sessions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(zoneCounts).map(([zone, count]) => (
            <div
              key={zone}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{
                backgroundColor: (ZONE_COLOR[zone] ?? COLORS.brew.light) + '18',
                color:           ZONE_COLOR[zone] ?? COLORS.brew.light,
              }}
            >
              <MapPin size={11} />
              {zone}: {count}
            </div>
          ))}
        </div>
      )}

      {/* Activity bar */}
      {sessions.length > 0 && (
        <div
          className="rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{
            backgroundColor: isDark ? COLORS.dark.surface2 : COLORS.matcha.soft,
            border: `1px solid ${isDark ? COLORS.dark.border : COLORS.matcha.soft}`,
          }}
        >
          <Activity size={16} color={COLORS.matcha.DEFAULT} />
          <p className="text-xs font-semibold" style={{ color: COLORS.matcha.dark }}>
            {sessions.length} active session{sessions.length !== 1 ? 's' : ''} right now
          </p>
          <div
            className="ml-auto flex items-center gap-1 text-[10px]"
            style={{ color: isDark ? COLORS.dark.muted : COLORS.brew.soft }}
          >
            <Wifi size={10} />
            Live
          </div>
        </div>
      )}

      {/* Sessions list */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          backgroundColor: isDark ? COLORS.dark.surface : '#fff',
          borderColor:     isDark ? COLORS.dark.border  : COLORS.cream.border,
          boxShadow:       COLORS.shadows.card,
        }}
      >
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 rounded-xl animate-pulse"
                style={{ backgroundColor: isDark ? COLORS.dark.surface2 : COLORS.cream.deep }}
              />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-2">
            <MapPin size={32} color={isDark ? COLORS.dark.muted : COLORS.brew.soft} strokeWidth={1.5} />
            <p className="text-sm font-medium" style={{ color: isDark ? COLORS.dark.muted : COLORS.brew.soft }}>
              No active sessions
            </p>
            <p className="text-xs" style={{ color: isDark ? COLORS.dark.muted + '88' : COLORS.brew.soft + '88' }}>
              Tables will appear here when customers arrive
            </p>
          </div>
        ) : (
          <div>
            {sessions.map((s, i) => (
              <SessionCard key={s._id ?? i} session={s} index={i} isDark={isDark} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ActiveSessionsPanel