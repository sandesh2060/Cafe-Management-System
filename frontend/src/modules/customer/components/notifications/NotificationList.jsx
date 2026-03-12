// src/modules/customer/components/notifications/NotificationList.jsx
import { useDispatch, useSelector }    from 'react-redux'
import { motion, AnimatePresence }     from 'motion/react'
import { formatDistanceToNow }         from 'date-fns'
import {
  selectNotifications,
  markRead,
  markOneReadRemote,
}                                      from '@store/slices/notificationSlice'

// ── Per-type visual identity ──────────────────────────────────────────────────
const TYPE_META = {
  order:   { emoji: '🍽️', color: '#2563EB', lightBg: '#EFF6FF',  darkBg: 'rgba(37,99,235,0.13)',   dot: '#2563EB' },
  waiter:  { emoji: '🛎️', color: '#D97706', lightBg: '#FFFBEB',  darkBg: 'rgba(217,119,6,0.13)',   dot: '#F59E0B' },
  loyalty: { emoji: '⭐', color: '#F59E0B', lightBg: '#FFFBEB',  darkBg: 'rgba(245,158,11,0.13)',  dot: '#F59E0B' },
  system:  { emoji: '📢', color: '#6B7280', lightBg: '#F9FAFB',  darkBg: 'rgba(107,114,128,0.1)',  dot: '#9CA3AF' },
  message: { emoji: '💬', color: '#7C3AED', lightBg: '#EDE9FE',  darkBg: 'rgba(124,58,237,0.13)', dot: '#8B5CF6' },
  payment: { emoji: '💳', color: '#059669', lightBg: '#D4F0E0',  darkBg: 'rgba(5,150,105,0.13)',  dot: '#10B981' },
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
const Skeleton = ({ isDark }) => (
  <div className="px-4 py-3 flex gap-3 items-start">
    <div className="w-10 h-10 rounded-2xl flex-shrink-0 animate-pulse"
      style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#FFF0D6' }} />
    <div className="flex-1 space-y-2 pt-1">
      <div className="h-3 rounded-full w-3/4 animate-pulse"
        style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#FFF0D6' }} />
      <div className="h-2.5 rounded-full w-1/2 animate-pulse"
        style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#FFE4B5' }} />
    </div>
  </div>
)

// ── Empty state ───────────────────────────────────────────────────────────────
const Empty = ({ isDark }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0  }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    className="flex-1 flex flex-col items-center justify-center py-16 gap-3 px-6 text-center"
  >
    {/* Animated empty bell SVG */}
    <motion.div
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      className="w-16 h-16 rounded-3xl flex items-center justify-center"
      style={{ background: isDark ? 'rgba(255,159,28,0.08)' : 'rgba(255,159,28,0.06)' }}
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path
          d="M6 10C6 6.686 8.686 4 12 4C15.314 4 18 6.686 18 10L18 15L20 17L4 17L6 15Z"
          stroke={isDark ? 'rgba(255,184,77,0.35)' : 'rgba(92,51,23,0.25)'}
          strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"
        />
        <path d="M10 17C10 18.105 10.895 19 12 19C13.105 19 14 18.105 14 17"
          stroke={isDark ? 'rgba(255,184,77,0.35)' : 'rgba(92,51,23,0.25)'}
          strokeWidth="1.6" strokeLinecap="round" fill="none"
        />
        <line x1="12" y1="2" x2="12" y2="4"
          stroke={isDark ? 'rgba(255,184,77,0.35)' : 'rgba(92,51,23,0.25)'}
          strokeWidth="1.6" strokeLinecap="round"
        />
        {/* Zzz dots — sleeping */}
        <motion.g
          animate={{ opacity: [0, 1, 1, 0], y: [-2, -2, -5, -5] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: 0.5 }}
        >
          <circle cx="18" cy="8"  r="1"   fill={isDark ? 'rgba(255,184,77,0.4)' : 'rgba(92,51,23,0.2)'}/>
          <circle cx="20" cy="6"  r="1.2" fill={isDark ? 'rgba(255,184,77,0.4)' : 'rgba(92,51,23,0.2)'}/>
          <circle cx="22" cy="4"  r="0.8" fill={isDark ? 'rgba(255,184,77,0.4)' : 'rgba(92,51,23,0.2)'}/>
        </motion.g>
      </svg>
    </motion.div>

    <div className="space-y-1">
      <p className="text-sm font-semibold"
        style={{ color: isDark ? '#C49A6C' : '#8B5E3C' }}>
        All quiet here
      </p>
      <p className="text-xs leading-relaxed"
        style={{ color: isDark ? 'rgba(196,154,108,0.5)' : 'rgba(139,94,60,0.45)' }}>
        We'll ping you about orders,{'\n'}rewards & waiter responses
      </p>
    </div>
  </motion.div>
)

// ── Single notification row ───────────────────────────────────────────────────
const NotifRow = ({ n, index, isDark, textMain, textMuted, border }) => {
  const dispatch = useDispatch()
  const meta     = TYPE_META[n.type] || TYPE_META.system

  const rowBg = !n.read
    ? (isDark ? meta.darkBg : meta.lightBg)
    : 'transparent'

  const handleRead = () => {
    if (n.read) return
    dispatch(markRead(n.id))
    dispatch(markOneReadRemote(n.id))
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1,  x: 0   }}
      exit={{    opacity: 0,  x: 10, height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0 }}
      transition={{ duration: 0.22, delay: index * 0.04 }}
      onClick={handleRead}
      className="flex items-start gap-3 mx-3 my-1 px-3 py-3 rounded-2xl
                 transition-all duration-200 active:opacity-70"
      style={{
        background: rowBg,
        border:     `1px solid ${!n.read
          ? (isDark ? 'rgba(255,159,28,0.1)' : 'rgba(255,159,28,0.14)')
          : 'transparent'}`,
        cursor: !n.read ? 'pointer' : 'default',
      }}
    >
      {/* Icon bubble */}
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg"
        style={{
          background: isDark ? meta.darkBg : meta.lightBg,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
        }}
      >
        {meta.emoji}
      </div>

      {/* Text block */}
      <div className="flex-1 min-w-0 pt-0.5">
        {n.title && (
          <p className="text-[13px] leading-snug mb-0.5 truncate"
            style={{
              color:      textMain,
              fontWeight: n.read ? 500 : 700,
            }}>
            {n.title}
          </p>
        )}
        <p className="text-[12px] leading-relaxed"
          style={{
            color:      n.read ? textMuted : (isDark ? '#FFF8EE' : '#5C3317'),
            fontWeight: n.read ? 400 : 500,
          }}>
          {n.message}
        </p>
        <p className="text-[10px] mt-1"
          style={{ color: isDark ? 'rgba(196,154,108,0.5)' : 'rgba(139,94,60,0.45)' }}>
          {formatDistanceToNow(new Date(n.createdAt || n.timestamp), { addSuffix: true })}
        </p>
      </div>

      {/* Unread dot */}
      <AnimatePresence>
        {!n.read && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{   scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 24 }}
            className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
            style={{
              background: `radial-gradient(circle, ${meta.dot}, ${meta.color})`,
              boxShadow:  `0 0 6px ${meta.dot}80`,
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
const NotificationList = ({ isDark, surface2, border, textMain, textMuted, loading }) => {
  const notifications = useSelector(selectNotifications)

  if (loading) {
    return (
      <div className="flex-1 overflow-hidden py-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} isDark={isDark} />)}
      </div>
    )
  }

  if (!notifications.length) {
    return <Empty isDark={isDark} />
  }

  return (
    <div className="flex-1 overflow-y-auto py-2"
      style={{ scrollbarWidth: 'none' }}>
      <AnimatePresence initial={false}>
        {notifications.map((n, i) => (
          <NotifRow
            key={n.id}
            n={n}
            index={i}
            isDark={isDark}
            textMain={textMain}
            textMuted={textMuted}
            border={border}
          />
        ))}
      </AnimatePresence>

      {/* Bottom padding for safe area */}
      <div className="h-4" />
    </div>
  )
}

export default NotificationList