// src/modules/customer/components/notifications/NotificationBell.jsx
//
// v3 — Full Tailwind CSS from globals.css + CSS vars from brand.js PALETTE
// ✅ .glass, .glass-light, .skeleton, .btn-ghost, .btn-compact,
//    .animate-scale-spring, .animate-fade-in, .scrollbar-hide — from globals.css
// ✅ var(--accent), var(--text-primary/muted/secondary/disabled),
//    var(--divider), var(--modal-bg), var(--pill-bg), var(--accent-dim/border),
//    var(--header-border), var(--card-bg), var(--success) — from brand.js PALETTE
// ✅ FONTS.heading / .body / .mono — from brand.js
// ✅ Type mapping — follow/order/message all resolved correctly
// ✅ Header two-row layout — never overflows
// ✅ Unread card — glowing left accent bar + tinted bg

import { useEffect, useContext, useState, useCallback, useRef, forwardRef } from 'react'
import { createPortal }             from 'react-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate }              from 'react-router-dom'
import { motion, AnimatePresence }  from 'motion/react'
import { X, Trash2, CheckCheck }    from 'lucide-react'
import { formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns'
import { ThemeContext }             from '@shared/context/ThemeContext'
import { FONTS }                    from '@shared/config/brand'
import {
  selectUnreadCount, selectNotifsLoading, selectNotifications,
  fetchNotifications, markAllRead, markAllReadRemote,
  clearAllRemote, clearNotifications, markRead, markOneReadRemote,
} from '@store/slices/notificationSlice'

// ── Audio ─────────────────────────────────────────────────────────────────────
let _audioCtx = null
const playPopSound = () => {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const ctx = _audioCtx
    if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); return }
    if (ctx.state !== 'running') return
    const osc = ctx.createOscillator(), gain = ctx.createGain(), now = ctx.currentTime
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(540, now)
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.14)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.16, now + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24)
    osc.start(now); osc.stop(now + 0.24)
  } catch { /* silent */ }
}

// ── Scroll lock ───────────────────────────────────────────────────────────────
const lockScroll = () => {
  const y = window.scrollY
  Object.assign(document.body.style, { position:'fixed', top:`-${y}px`, left:'0', right:'0', overflowY:'scroll' })
  document.body.dataset.scrollY = String(y)
}
const unlockScroll = () => {
  const y = parseInt(document.body.dataset.scrollY ?? '0', 10)
  Object.assign(document.body.style, { position:'', top:'', left:'', right:'', overflowY:'' })
  window.scrollTo(0, y)
}

// ── Type meta ─────────────────────────────────────────────────────────────────
const TYPE_META = {
  order:'🍽️:#FF9F1C:Order', order_ready:'🔥:#EF4444:Ready',
  order_confirmed:'✅:#10B981:Confirmed', order_preparing:'👨‍🍳:#FB923C:Preparing',
  order_delivered:'🚀:#3B82F6:Delivered', kitchen:'👨‍🍳:#FB923C:Kitchen',
  waiter:'🛎️:#D97706:Waiter', waiter_call:'🛎️:#D97706:Waiter',
  loyalty:'⭐:#A78BFA:Points', points_earned:'⭐:#A78BFA:Points',
  tier_upgrade:'🏆:#FBBF24:Tier Up', points_milestone:'🎯:#A78BFA:Milestone',
  badge:'🎖️:#A78BFA:Badge', achievement:'🏅:#A78BFA:Achievement',
  follow:'👤:#3B82F6:Follow', follow_request:'👤:#3B82F6:Follow Req',
  follow_accepted:'🤝:#10B981:Accepted', follow_back:'👥:#6366F1:Friends',
  mutual:'👥:#6366F1:Friends', message:'💬:#7C3AED:Message',
  social_message:'💬:#7C3AED:Message', payment:'💳:#10B981:Payment',
  payment_confirmed:'✅:#10B981:Paid', weather:'🌤️:#38BDF8:Weather',
  weather_alert:'⚠️:#EF4444:Alert', festival:'🎊:#F472B6:Festival',
  birthday:'🎂:#EC4899:Birthday', system:'📢:#6B7280:System',
  welcome:'👋:#FF9F1C:Welcome', profile_nudge:'✏️:#6B7280:Profile',
  idle:'💡:#6B7280:Tip', suggest:'🍜:#FF9F1C:Suggestion',
  cart_abandon:'🛒:#F59E0B:Cart', reorder:'🔄:#10B981:Reorder',
}

const parseMeta = (key) => {
  const v = TYPE_META[key]; if (!v) return null
  const [emoji, color, ...labelParts] = v.split(':')
  return { emoji, color, label: labelParts.join(':') }
}

const getMeta = (n) => {
  const type = n?.type ?? '', action = n?.data?.action ?? ''
  return (
    parseMeta(type) || parseMeta(action) ||
    (type.includes('follow') && action.includes('accepted') ? parseMeta('follow_accepted') : null) ||
    (type.includes('follow')  ? parseMeta('follow')   : null) ||
    (type.includes('order')   ? parseMeta('order')    : null) ||
    (type.includes('message') ? parseMeta('message')  : null) ||
    (type.includes('loyalty') || type.includes('point') ? parseMeta('loyalty') : null) ||
    { emoji:'🔔', color:'#6B7280', label:'Notification' }
  )
}

// ── Navigation ────────────────────────────────────────────────────────────────
const getNavRoute = (n) => {
  const data = n?.data ?? {}, type = n?.type ?? '', action = data?.action ?? ''
  if (type.includes('order') || type === 'kitchen') return '/order/status'
  if (type === 'follow' || action.includes('follow')) return (data?.senderId ?? data?.userId) ? `/customer/${data.senderId ?? data.userId}` : null
  if (type === 'message' || action === 'social_message') return data?.senderId ? `/chat/${data.senderId}` : '/chat'
  if (['loyalty','tier_upgrade','points_milestone','badge','achievement'].includes(type)) return '/loyalty'
  if (type === 'payment') return '/payment'
  if (data?.itemId) return `/menu/item/${data.itemId}`
  if (data?.category) return `/menu?category=${data.category}`
  if (type === 'profile_nudge') return '/profile'
  return null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const timeAgo = (d) => { try { return formatDistanceToNow(new Date(d), { addSuffix:true }) } catch { return '' } }
const getSectionLabel = (ds) => {
  try {
    const d = typeof ds === 'string' ? parseISO(ds) : new Date(ds)
    if (isToday(d)) return 'Today'
    if (isYesterday(d)) return 'Yesterday'
    return d.toLocaleDateString('en-US', { month:'short', day:'numeric' })
  } catch { return 'Earlier' }
}
const groupByDate = (items) => {
  const groups = [], seen = new Map()
  items.forEach(n => {
    const label = getSectionLabel(n.createdAt ?? n.timestamp)
    if (!seen.has(label)) { seen.set(label, []); groups.push({ label, items: seen.get(label) }) }
    seen.get(label).push(n)
  })
  return groups
}
const hexToRgb = (hex) => {
  const h = hex.replace('#','')
  return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`
}

// ── BellSVG ───────────────────────────────────────────────────────────────────
const BellSVG = ({ hasUnread, isDark, size=22 }) => {
  const c = hasUnread
    ? (isDark ? '#FFB84D' : '#C8680A')
    : (isDark ? 'rgba(255,184,77,0.50)' : 'rgba(92,51,23,0.40)')
  return (
    <motion.svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      animate={hasUnread ? { rotate:[0,-15,13,-9,7,-3,0] } : { rotate:0 }}
      transition={hasUnread ? { duration:0.65, ease:'easeInOut', repeat:Infinity, repeatDelay:4.5 } : {}}
      style={{ originX:'50%', originY:'12%', display:'block' }}
    >
      <path d="M6 10C6 6.686 8.686 4 12 4s6 2.686 6 6v5l2 2H4l2-2v-5Z"
        stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
        fill={hasUnread ? (isDark ? 'rgba(255,184,77,0.09)' : 'rgba(200,104,10,0.07)') : 'none'}/>
      <path d="M10 17c0 1.105.895 2 2 2s2-.895 2-2" stroke={c} strokeWidth="1.7" strokeLinecap="round" fill="none"/>
      <line x1="12" y1="2" x2="12" y2="4" stroke={c} strokeWidth="1.7" strokeLinecap="round"/>
    </motion.svg>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
const Badge = forwardRef(({ count }, ref) => (
  <motion.span ref={ref} key={count}
    initial={{ scale:0, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0, opacity:0 }}
    transition={{ type:'spring', stiffness:600, damping:22 }}
    className="absolute pointer-events-none z-10 flex items-center justify-center font-mono"
    style={{
      top:-5, right:-5, minWidth:18, height:18, borderRadius:99,
      padding:'0 4px', fontSize:9, fontWeight:800, lineHeight:1, letterSpacing:'-0.02em',
      color:'#fff', fontFamily:FONTS.mono,
      background:'linear-gradient(135deg,#FF9F1C,#E05C2A)',
      boxShadow:'0 2px 8px rgba(255,130,0,0.5), 0 0 0 1.5px rgba(255,255,255,0.25)',
    }}
  >
    {count > 9 ? '9+' : count}
  </motion.span>
))
Badge.displayName = 'Badge'

// ── NotifRow ──────────────────────────────────────────────────────────────────
const NotifRow = ({ n, index, onNavigate, onRead, isDark }) => {
  const meta   = getMeta(n)
  const route  = getNavRoute(n)
  const canNav = !!route
  const ago    = timeAgo(n.createdAt ?? n.timestamp)
  const rgb    = hexToRgb(meta.color)

  return (
    <motion.div
      layout
      initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, height:0, marginBottom:0 }}
      transition={{ duration:0.2, delay:index * 0.04 }}
      onClick={() => { if (!n.read) onRead(n._id ?? n.id); if (canNav) onNavigate(route) }}
      whileTap={canNav ? { scale:0.97 } : {}}
      className="relative overflow-hidden mx-2.5 my-1 flex items-start gap-3"
      style={{
        padding:'12px 12px 12px 14px', borderRadius:18,
        cursor:canNav ? 'pointer' : 'default',
        WebkitTapHighlightColor:'transparent',
        background: !n.read
          ? isDark ? `rgba(${rgb},0.09)` : `rgba(${rgb},0.06)`
          : isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.018)',
        border:`1px solid ${!n.read
          ? isDark ? `rgba(${rgb},0.22)` : `rgba(${rgb},0.18)`
          : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
        transition:'background 0.18s, border-color 0.18s',
      }}
    >
      {/* Unread left glow bar */}
      {!n.read && (
        <div className="absolute left-0 rounded-r" style={{
          top:'15%', bottom:'15%', width:3,
          background:`linear-gradient(180deg,${meta.color},${meta.color}88)`,
          boxShadow:`0 0 10px ${meta.color}66`,
        }}/>
      )}

      {/* Icon */}
      <div className="flex items-center justify-center flex-shrink-0 text-xl" style={{
        width:42, height:42, borderRadius:14,
        background: isDark ? `rgba(${rgb},0.15)` : `rgba(${rgb},0.10)`,
        border:`1px solid rgba(${rgb},0.28)`,
        boxShadow:`0 2px 10px rgba(${rgb},0.18)`,
      }}>
        {meta.emoji}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 pt-px">
        {n.title && (
          <p className="m-0 mb-1 truncate" style={{
            fontSize:13.5, lineHeight:1.3,
            fontWeight: n.read ? 500 : 700,
            color:'var(--text-primary)', fontFamily:FONTS.body,
          }}>
            {n.title}
          </p>
        )}
        <p className="m-0" style={{
          fontSize:12.5, lineHeight:1.5,
          fontWeight: n.read ? 400 : 500,
          color: n.read ? 'var(--text-muted)' : 'var(--text-secondary)',
          fontFamily:FONTS.body,
          display:'-webkit-box', WebkitLineClamp:2,
          WebkitBoxOrient:'vertical', overflow:'hidden',
        }}>
          {n.message}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span style={{ fontSize:10, color:'var(--text-disabled)', fontFamily:FONTS.mono }}>
            {ago}
          </span>
          {canNav && (
            <span style={{
              fontSize:9, fontWeight:700, color:meta.color,
              background: isDark ? `rgba(${rgb},0.14)` : `rgba(${rgb},0.09)`,
              padding:'2px 8px', borderRadius:99,
              border:`1px solid rgba(${rgb},0.22)`,
              fontFamily:FONTS.body,
            }}>
              {meta.label} →
            </span>
          )}
        </div>
      </div>

      {/* Unread dot */}
      <AnimatePresence>
        {!n.read && (
          <motion.div
            initial={{ scale:0 }} animate={{ scale:1 }} exit={{ scale:0 }}
            transition={{ type:'spring', stiffness:500, damping:24 }}
            className="flex-shrink-0 rounded-full mt-1.5"
            style={{ width:8, height:8, background:meta.color, boxShadow:`0 0 8px ${meta.color}` }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Empty ─────────────────────────────────────────────────────────────────────
const Empty = ({ isDark }) => (
  <motion.div
    initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}
    className="flex flex-col items-center justify-center flex-1 text-center px-6 py-14 gap-4"
  >
    <motion.div
      animate={{ y:[0,-6,0] }} transition={{ duration:3.5, repeat:Infinity, ease:'easeInOut' }}
      className="flex items-center justify-center"
      style={{
        width:64, height:64, borderRadius:22,
        background: isDark ? 'rgba(255,159,28,0.10)' : 'rgba(200,104,10,0.08)',
        border: isDark ? '1px solid rgba(255,159,28,0.15)' : '1px solid rgba(200,104,10,0.12)',
      }}
    >
      <BellSVG hasUnread={false} isDark={isDark} size={30}/>
    </motion.div>
    <div>
      <p className="m-0 mb-1.5" style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', fontFamily:FONTS.heading, letterSpacing:'-0.02em' }}>
        All quiet here
      </p>
      <p className="m-0" style={{ fontSize:13, lineHeight:1.65, color:'var(--text-muted)', fontFamily:FONTS.body }}>
        We'll ping you about orders,<br/>rewards & more
      </p>
    </div>
  </motion.div>
)

// ── Skeleton — uses .skeleton class from globals.css ─────────────────────────
const Skeleton = () => (
  <div className="flex gap-3 px-4 py-2.5 items-start">
    <div className="skeleton flex-shrink-0" style={{ width:42, height:42, borderRadius:14 }}/>
    <div className="flex flex-col gap-2 flex-1 pt-1">
      <div className="skeleton" style={{ height:12, borderRadius:8, width:'60%' }}/>
      <div className="skeleton" style={{ height:10, borderRadius:6, width:'82%' }}/>
      <div className="skeleton" style={{ height:10, borderRadius:6, width:'38%' }}/>
    </div>
  </div>
)

// ════════════════════════════════════════════════════════════════════════════
const NotificationBell = () => {
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const unread     = useSelector(selectUnreadCount)
  const loading    = useSelector(selectNotifsLoading)
  const notifs     = useSelector(selectNotifications)
  const { isDark } = useContext(ThemeContext)
  const [open, setOpen] = useState(false)
  const prevUnread = useRef(unread)
  const hasUnread  = unread > 0

  useEffect(() => {
    if (unread > prevUnread.current) playPopSound()
    prevUnread.current = unread
  }, [unread])

  useEffect(() => {
    if (open) { lockScroll(); dispatch(fetchNotifications()) }
    else unlockScroll()
    return () => { if (open) unlockScroll() }
  }, [open, dispatch])

  const handleMarkAll  = () => { dispatch(markAllRead()); dispatch(markAllReadRemote()) }
  const handleClearAll = () => { dispatch(clearNotifications()); dispatch(clearAllRemote()) }
  const handleRead     = useCallback((id) => { dispatch(markRead(id)); dispatch(markOneReadRemote(id)) }, [dispatch])
  const handleNavigate = useCallback((route) => { setOpen(false); setTimeout(() => navigate(route), 260) }, [navigate])
  const groups = groupByDate(notifs)

  // Only the values that genuinely can't be Tailwind (dynamic, theme-conditional)
  const panelBg     = isDark ? 'rgba(22,22,26,0.88)'    : 'rgba(245,245,248,0.88)'
  const panelBlur   = isDark ? 'blur(40px) saturate(200%) brightness(0.9)' : 'blur(40px) saturate(200%) brightness(1.06)'
  const panelBorder = isDark ? 'rgba(255,255,255,0.09)'  : 'rgba(0,0,0,0.08)'
  const panelShadow = isDark
    ? '0 28px 72px rgba(0,0,0,0.70), 0 0 0 0.5px rgba(255,255,255,0.07)'
    : '0 28px 72px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(0,0,0,0.06)'
  const gloss       = isDark
    ? 'linear-gradient(90deg,transparent,rgba(255,255,255,0.06) 50%,transparent)'
    : 'linear-gradient(90deg,transparent,rgba(255,255,255,0.85) 50%,transparent)'
  const hdrBg       = isDark ? 'rgba(22,22,26,0.60)'    : 'rgba(245,245,248,0.60)'
  const hdrBorder   = isDark ? 'rgba(255,255,255,0.07)'  : 'rgba(0,0,0,0.06)'
  const sectionClr  = isDark ? 'rgba(255,255,255,0.32)'  : 'rgba(28,25,23,0.35)'

  return (
    <>
      {/* Bell button */}
      <motion.button
        onClick={() => setOpen(true)}
        whileTap={{ scale:0.86 }}
        aria-label={`Notifications${hasUnread ? ` (${unread} unread)` : ''}`}
        className="relative flex items-center justify-center btn-compact"
        style={{
          width:38, height:38, borderRadius:12,
          background: hasUnread ? 'var(--accent-dim)' : 'transparent',
          border:`1px solid ${hasUnread ? 'var(--accent-border)' : 'transparent'}`,
          cursor:'pointer', WebkitTapHighlightColor:'transparent',
          transition:'background 0.15s, border-color 0.15s',
        }}
      >
        <BellSVG hasUnread={hasUnread} isDark={isDark}/>
        <AnimatePresence mode="popLayout">
          {hasUnread && <Badge count={unread}/>}
        </AnimatePresence>
        <AnimatePresence>
          {hasUnread && (
            <motion.span key="ripple" className="absolute inset-0 rounded-xl pointer-events-none"
              style={{ background:'var(--accent-dim)' }}
              initial={{ opacity:0.5, scale:1 }} animate={{ opacity:0, scale:1.8 }}
              transition={{ duration:1.5, repeat:Infinity, repeatDelay:2.5 }}
            />
          )}
        </AnimatePresence>
      </motion.button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                transition={{ duration:0.2 }}
                onClick={() => setOpen(false)}
                className="fixed inset-0 touch-none select-none"
                style={{
                  zIndex:190,
                  backdropFilter:'blur(12px) brightness(0.5)',
                  WebkitBackdropFilter:'blur(12px) brightness(0.5)',
                  background:'rgba(0,0,0,0.28)',
                }}
              />

              {/* Panel */}
              <motion.div
                initial={{ y:-20, opacity:0, scale:0.90 }}
                animate={{ y:0,   opacity:1, scale:1    }}
                exit={{   y:-12,  opacity:0, scale:0.94 }}
                transition={{ type:'spring', stiffness:440, damping:28, mass:0.7 }}
                onClick={e => e.stopPropagation()}
                className="fixed flex flex-col overflow-hidden"
                style={{
                  top:'max(12px, calc(env(safe-area-inset-top, 0px) + 10px))',
                  left:12, right:12, zIndex:191,
                  maxHeight:'min(620px, calc(100dvh - 32px))',
                  borderRadius:26,
                  transformOrigin:'top center',
                  background:panelBg,
                  backdropFilter:panelBlur,
                  WebkitBackdropFilter:panelBlur,
                  border:`1px solid ${panelBorder}`,
                  boxShadow:panelShadow,
                }}
              >
                {/* Gloss top line */}
                <div aria-hidden className="absolute top-0 h-px pointer-events-none z-10"
                  style={{ left:'6%', right:'6%', background:gloss }}/>

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex-shrink-0" style={{ borderBottom:`1px solid ${hdrBorder}`, background:hdrBg }}>

                  {/* Row 1 — title + close */}
                  <div className="flex items-center justify-between px-4 pt-4 pb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Bell icon */}
                      <div className="flex items-center justify-center flex-shrink-0"
                        style={{
                          width:34, height:34, borderRadius:11,
                          background: isDark ? 'rgba(255,159,28,0.12)' : 'rgba(200,104,10,0.08)',
                          border: isDark ? '1px solid rgba(255,159,28,0.18)' : '1px solid rgba(200,104,10,0.12)',
                        }}
                      >
                        <BellSVG hasUnread={hasUnread} isDark={isDark} size={17}/>
                      </div>

                      {/* Title */}
                      <h2 className="m-0 truncate" style={{ fontSize:18, fontWeight:800, color:'var(--text-primary)', fontFamily:FONTS.heading, letterSpacing:'-0.03em' }}>
                        Notifications
                      </h2>

                      {/* Unread pill */}
                      <AnimatePresence>
                        {hasUnread && (
                          <motion.span
                            initial={{ scale:0, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0, opacity:0 }}
                            transition={{ type:'spring', stiffness:500, damping:24 }}
                            className="flex-shrink-0"
                            style={{
                              fontSize:11, fontWeight:800, padding:'3px 9px', borderRadius:99,
                              color:'#fff', background:'linear-gradient(135deg,#FF9F1C,#E05C2A)',
                              fontFamily:FONTS.mono, letterSpacing:'-0.01em',
                            }}
                          >
                            {unread}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Close — .btn-ghost .btn-compact from globals.css */}
                    <button
                      onClick={() => setOpen(false)}
                      className="btn-ghost btn-compact flex items-center justify-center flex-shrink-0 ml-2"
                      style={{
                        width:32, height:32, borderRadius:10,
                        color:'var(--text-muted)',
                        border:`1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)'}`,
                      }}
                    >
                      <X size={14}/>
                    </button>
                  </div>

                  {/* Row 2 — action buttons */}
                  {(hasUnread || notifs.length > 0) && (
                    <div className="flex items-center gap-2 px-4 pb-3">
                      <AnimatePresence>
                        {hasUnread && (
                          <motion.button
                            initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-6 }}
                            onClick={handleMarkAll}
                            className="flex items-center gap-1.5 btn-compact"
                            style={{
                              padding:'7px 12px', borderRadius:10,
                              fontSize:12, fontWeight:600,
                              color:'var(--accent)',
                              background: isDark ? 'rgba(255,159,28,0.10)' : 'rgba(200,104,10,0.07)',
                              border: isDark ? '1px solid rgba(255,159,28,0.18)' : '1px solid rgba(200,104,10,0.14)',
                              fontFamily:FONTS.body,
                            }}
                          >
                            <CheckCheck size={13}/> Mark all read
                          </motion.button>
                        )}
                      </AnimatePresence>
                      <button
                        onClick={handleClearAll}
                        className="flex items-center gap-1.5 btn-compact"
                        style={{
                          padding:'7px 12px', borderRadius:10,
                          fontSize:12, fontWeight:600,
                          color:'var(--text-muted)',
                          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          border:`1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                          fontFamily:FONTS.body,
                        }}
                      >
                        <Trash2 size={13}/> Clear all
                      </button>
                    </div>
                  )}
                </div>

                {/* ── List — .scrollbar-hide from globals.css ─────────────── */}
                <div className="scrollbar-hide flex-1 overflow-y-auto min-h-0" style={{ WebkitOverflowScrolling:'touch' }}>
                  {loading ? (
                    <div className="py-2">{[1,2,3].map(i => <Skeleton key={i}/>)}</div>
                  ) : !notifs.length ? (
                    <Empty isDark={isDark}/>
                  ) : (
                    <div className="py-2 pb-4">
                      <AnimatePresence initial={false}>
                        {groups.map(({ label, items }) => (
                          <div key={label}>
                            <p className="m-0 px-5 pt-2.5 pb-1 uppercase" style={{ fontSize:10, fontWeight:800, letterSpacing:'0.09em', color:sectionClr, fontFamily:FONTS.body }}>
                              {label}
                            </p>
                            {items.map((n, i) => (
                              <NotifRow key={n._id ?? n.id} n={n} index={i} isDark={isDark} onNavigate={handleNavigate} onRead={handleRead}/>
                            ))}
                          </div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* Bottom fade line */}
                <div aria-hidden className="absolute bottom-0 h-px pointer-events-none"
                  style={{
                    left:'6%', right:'6%',
                    background: isDark
                      ? 'linear-gradient(90deg,transparent,rgba(255,255,255,0.04) 50%,transparent)'
                      : 'linear-gradient(90deg,transparent,rgba(255,255,255,0.50) 50%,transparent)',
                  }}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

export default NotificationBell