// src/modules/customer/pages/NotificationsPage.jsx
// Route: /notifications
//
// FIXES:
//  • Uses n.data (not n.meta) for emoji — matches notificationSlice shape
//  • Swipe-to-delete works — dispatches deleteNotification
//  • Important notifications show a lock icon and block swipe-delete
//  • All notification types displayed correctly
//  • No irregular rendering on refresh

import {
  useEffect, useRef, useContext, useCallback,
} from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate }              from 'react-router-dom'
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import gsap                         from 'gsap'
import { ArrowLeft, Trash2, CheckCheck, Bell, Lock } from 'lucide-react'
import { ThemeContext }             from '@shared/context/ThemeContext'
import {
  selectNotifications,
  selectUnreadCount,
  selectNotifsLoading,
  fetchNotifications,
  markAllRead,
  markAllReadRemote,
  markRead,
  markOneReadRemote,
  clearAllRemote,
  clearNotifications,
  deleteNotification,
} from '@store/slices/notificationSlice'

// ─── Type config ──────────────────────────────────────────────────────────────
const TYPE_CFG = {
  order:    { emoji: '🍽️', color: '#FF9F1C',  bg: 'rgba(255,159,28,0.12)'  },
  kitchen:  { emoji: '👨‍🍳', color: '#FB923C',  bg: 'rgba(251,146,60,0.12)'  },
  payment:  { emoji: '💳',  color: '#10B981',  bg: 'rgba(16,185,129,0.12)'  },
  loyalty:  { emoji: '⭐',  color: '#A78BFA',  bg: 'rgba(167,139,250,0.12)' },
  waiter:   { emoji: '🛎️', color: '#D97706',  bg: 'rgba(217,119,6,0.12)'   },
  weather:  { emoji: '🌤️', color: '#38BDF8',  bg: 'rgba(56,189,248,0.12)'  },
  festival: { emoji: '🎊',  color: '#F472B6',  bg: 'rgba(244,114,182,0.12)' },
  birthday: { emoji: '🎂',  color: '#EC4899',  bg: 'rgba(236,72,153,0.12)'  },
  tip:      { emoji: '😏',  color: '#F59E0B',  bg: 'rgba(245,158,11,0.12)'  },
  idle:     { emoji: '🤔',  color: '#94A3B8',  bg: 'rgba(148,163,184,0.1)'  },
  message:  { emoji: '💬',  color: '#7C3AED',  bg: 'rgba(124,58,237,0.12)'  },
  system:   { emoji: '📢',  color: '#64748B',  bg: 'rgba(100,116,139,0.1)'  },
}
const getCfg = (type) => TYPE_CFG[type] ?? TYPE_CFG.system

// ─── Group by day ─────────────────────────────────────────────────────────────
const groupByDay = (notifications) => {
  const today = [], yesterday = [], earlier = []
  notifications.forEach(n => {
    const d = new Date(n.createdAt ?? n.timestamp ?? Date.now())
    if (isToday(d))          today.push(n)
    else if (isYesterday(d)) yesterday.push(n)
    else                     earlier.push(n)
  })
  const groups = []
  if (today.length)     groups.push({ label: 'Today',     items: today })
  if (yesterday.length) groups.push({ label: 'Yesterday', items: yesterday })
  if (earlier.length)   groups.push({ label: 'Earlier',   items: earlier })
  return groups
}

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = ({ D }) => {
  const bellRef = useRef(null)
  useEffect(() => {
    if (!bellRef.current) return
    gsap.to(bellRef.current, { y: -8, duration: 2, ease: 'sine.inOut', yoyo: true, repeat: -1 })
  }, [])
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '80px 32px', gap: 16, textAlign: 'center',
    }}>
      <div ref={bellRef} style={{
        width: 72, height: 72, borderRadius: 22,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: D ? 'rgba(255,159,28,0.08)' : 'rgba(255,159,28,0.06)',
        border: `1px solid ${D ? 'rgba(255,159,28,0.14)' : 'rgba(255,159,28,0.12)'}`,
      }}>
        <Bell size={32}
          style={{ color: D ? 'rgba(255,184,77,0.4)' : 'rgba(200,104,10,0.3)' }}
          strokeWidth={1.5} />
      </div>
      <div>
        <p style={{
          margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '-0.03em',
          color: 'var(--text-primary)', fontFamily: "'Baloo 2', system-ui, sans-serif",
        }}>All quiet here</p>
        <p style={{
          margin: '6px 0 0', fontSize: 13, lineHeight: 1.6,
          color: 'var(--text-muted)', fontFamily: "'Baloo 2', system-ui, sans-serif",
        }}>
          We'll ping you about orders, rewards,{'\n'}festivals and much more
        </p>
      </div>
    </div>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────
const SectionLabel = ({ label, D }) => (
  <div style={{ padding: '12px 20px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
    <span style={{
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: 'var(--text-muted)',
      fontFamily: "'Baloo 2', system-ui, sans-serif",
    }}>{label}</span>
    <div style={{
      flex: 1, height: 1,
      background: D ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    }} />
  </div>
)

// ─── Notification row ─────────────────────────────────────────────────────────
const NotifRow = ({ n, D, onRead, onDelete }) => {
  const cfg    = getCfg(n.type)
  const rowRef = useRef(null)
  const ts     = new Date(n.createdAt ?? n.timestamp ?? Date.now())
  const time   = isNaN(ts) ? '' : formatDistanceToNow(ts, { addSuffix: true })
  // FIX: use n.data for emoji (matches slice shape), fallback to cfg.emoji
  const icon   = n.data?.emoji ?? n.meta?.emoji ?? cfg.emoji

  // Entrance
  useEffect(() => {
    if (!rowRef.current) return
    gsap.fromTo(rowRef.current,
      { opacity: 0, x: -14 },
      { opacity: 1, x: 0, duration: 0.28, ease: 'power2.out' }
    )
  }, [])

  // Swipe-to-delete (touch)
  const startX     = useRef(null)
  const dragging   = useRef(false)

  const onTouchStart = (e) => {
    if (n.important) return  // block swipe on important
    startX.current  = e.touches[0].clientX
    dragging.current = false
  }
  const onTouchMove = (e) => {
    if (startX.current === null || n.important) return
    const dx = e.touches[0].clientX - startX.current
    if (Math.abs(dx) > 8) dragging.current = true
    if (dx < 0) gsap.set(rowRef.current, { x: Math.max(dx, -90) })
  }
  const onTouchEnd = () => {
    if (!rowRef.current || n.important) return
    const tx = gsap.getProperty(rowRef.current, 'x')
    if (tx < -60) {
      gsap.to(rowRef.current, {
        x: -400, opacity: 0, duration: 0.22, ease: 'power3.in',
        onComplete: () => onDelete(n.id),
      })
    } else {
      gsap.to(rowRef.current, { x: 0, duration: 0.3, ease: 'back.out(2)' })
    }
    startX.current = null
  }

  const handleClick = () => {
    if (dragging.current) return
    if (!n.read) onRead(n.id)
  }

  return (
    <div
      ref={rowRef}
      onClick={handleClick}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        margin: '2px 12px', padding: '13px 14px', borderRadius: 16,
        display: 'flex', alignItems: 'flex-start', gap: 12,
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        background: !n.read
          ? (D ? `${cfg.color}14` : `${cfg.color}0c`)
          : 'transparent',
        border: `1px solid ${!n.read
          ? (D ? `${cfg.color}28` : `${cfg.color}20`)
          : 'transparent'}`,
        transition: 'background 0.2s, border-color 0.2s',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 42, height: 42, borderRadius: 13, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, background: cfg.bg,
        border: `1px solid ${D ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
      }}>
        {icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {n.title && (
          <p style={{
            margin: 0, fontSize: 13, fontWeight: n.read ? 500 : 700,
            letterSpacing: '-0.02em', lineHeight: 1.3, marginBottom: 3,
            color: 'var(--text-primary)',
            fontFamily: "'Baloo 2', system-ui, sans-serif",
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{n.title}</p>
        )}
        <p style={{
          margin: 0, fontSize: 12, lineHeight: 1.55,
          fontWeight: n.read ? 400 : 500,
          color: n.read ? 'var(--text-muted)' : (D ? 'rgba(255,232,180,0.82)' : 'rgba(60,30,5,0.82)'),
          fontFamily: "'Baloo 2', system-ui, sans-serif",
        }}>{n.message}</p>
        <span style={{
          display: 'block', marginTop: 4, fontSize: 10, fontWeight: 500,
          color: D ? 'rgba(196,154,108,0.5)' : 'rgba(139,94,60,0.45)',
          fontFamily: "'Baloo 2', system-ui, sans-serif",
        }}>{time}</span>
      </div>

      {/* Right side: important lock OR unread dot */}
      <div style={{ flexShrink: 0, marginTop: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        {n.important && (
          <Lock size={12}
            style={{ color: D ? 'rgba(255,184,77,0.5)' : 'rgba(200,104,10,0.4)' }}
            strokeWidth={2} />
        )}
        {!n.read && (
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: `radial-gradient(circle, ${cfg.color}, ${cfg.color}88)`,
            boxShadow: `0 0 6px ${cfg.color}80`,
          }} />
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const NotificationsPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isDark: D } = useContext(ThemeContext)

  const notifications = useSelector(selectNotifications)
  const unread        = useSelector(selectUnreadCount)
  const loading       = useSelector(selectNotifsLoading)

  const headerRef  = useRef(null)
  const contentRef = useRef(null)

  useEffect(() => {
    // Fetch on mount — but don't clear existing local notifications
    dispatch(fetchNotifications())
    if (headerRef.current)
      gsap.fromTo(headerRef.current,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.38, ease: 'power2.out' }
      )
    if (contentRef.current)
      gsap.fromTo(contentRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.32, ease: 'power2.out', delay: 0.1 }
      )
  }, [dispatch])

  const handleMarkAll = useCallback(() => {
    dispatch(markAllRead())
    dispatch(markAllReadRemote())
  }, [dispatch])

  const handleClearAll = useCallback(() => {
    dispatch(clearNotifications())  // respects important flag
    dispatch(clearAllRemote())
  }, [dispatch])

  const handleRead = useCallback((id) => {
    dispatch(markRead(id))
    dispatch(markOneReadRemote(id))
  }, [dispatch])

  const handleDelete = useCallback((id) => {
    dispatch(deleteNotification(id))  // blocked if important
  }, [dispatch])

  const groups = groupByDay(notifications)
  const border = D ? 'rgba(255,159,28,0.12)' : 'rgba(220,190,140,0.35)'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-app)',
      fontFamily: "'Baloo 2', system-ui, sans-serif",
    }}>

      {/* ── Header ── */}
      <div ref={headerRef} style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: D ? 'rgba(8,4,1,0.88)' : 'rgba(255,252,244,0.92)',
        backdropFilter: 'blur(32px) saturate(200%)',
        WebkitBackdropFilter: 'blur(32px) saturate(200%)',
        borderBottom: `1px solid ${border}`,
        padding: `max(14px, calc(env(safe-area-inset-top, 0px) + 10px)) 16px 14px`,
      }}>
        <div style={{
          maxWidth: 480, margin: '0 auto',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <button onClick={() => navigate(-1)} style={{
            width: 38, height: 38, borderRadius: 12, border: 'none', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: D ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.65)',
            color: 'var(--text-secondary)', cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}>
            <ArrowLeft size={17} strokeWidth={2} />
          </button>

          <div style={{ flex: 1 }}>
            <h1 style={{
              margin: 0, fontSize: 18, fontWeight: 900, letterSpacing: '-0.04em',
              color: 'var(--text-primary)',
            }}>Notifications</h1>
            {unread > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#FF9F1C' }}>
                {unread} unread
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {unread > 0 && (
              <button onClick={handleMarkAll} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 12px', borderRadius: 10,
                border: '1px solid rgba(255,159,28,0.28)',
                background: D ? 'rgba(255,159,28,0.1)' : 'rgba(255,159,28,0.08)',
                color: '#FF9F1C', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Baloo 2', system-ui, sans-serif",
                WebkitTapHighlightColor: 'transparent',
              }}>
                <CheckCheck size={12} strokeWidth={2.5} />
                All read
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={handleClearAll} style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: D ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                border: `1px solid ${border}`,
                color: 'var(--text-muted)', cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}>
                <Trash2 size={14} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        {/* Important notification hint */}
        {notifications.some(n => n.important) && (
          <div style={{
            maxWidth: 480, margin: '8px auto 0',
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8,
            background: D ? 'rgba(255,159,28,0.08)' : 'rgba(255,159,28,0.06)',
            border: `1px solid rgba(255,159,28,0.18)`,
          }}>
            <Lock size={10} style={{ color: '#FF9F1C', flexShrink: 0 }} />
            <span style={{
              fontSize: 10.5, fontWeight: 600, color: '#FF9F1C',
              fontFamily: "'Baloo 2', system-ui, sans-serif",
            }}>
              Locked notifications cannot be deleted
            </span>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div ref={contentRef} style={{
        maxWidth: 480, margin: '0 auto',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)',
      }}>
        {loading && notifications.length === 0 ? (
          <div style={{ padding: '12px 0' }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{
                display: 'flex', gap: 12, padding: '12px 20px', alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 13, flexShrink: 0,
                  background: D ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  animation: 'np-pulse 1.6s ease-in-out infinite',
                  animationDelay: `${i * 0.1}s`,
                }} />
                <div style={{ flex: 1, paddingTop: 4 }}>
                  <div style={{
                    height: 13, borderRadius: 8, width: '65%', marginBottom: 8,
                    background: D ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    animation: 'np-pulse 1.6s ease-in-out infinite',
                  }} />
                  <div style={{
                    height: 10, borderRadius: 6, width: '45%',
                    background: D ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                    animation: 'np-pulse 1.6s ease-in-out infinite',
                  }} />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState D={D} />
        ) : (
          <div style={{ paddingTop: 8 }}>
            {groups.map(group => (
              <div key={group.label}>
                <SectionLabel label={group.label} D={D} />
                {group.items.map(n => (
                  <NotifRow
                    key={n.id}
                    n={n}
                    D={D}
                    onRead={handleRead}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes np-pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
      `}</style>
    </div>
  )
}

export default NotificationsPage