// src/modules/customer/components/notifications/NotificationList.jsx
// FIXED: markOneReadRemote is now a thunk exported from notificationSlice
// (previously missing — caused SyntaxError on import)

import { useDispatch, useSelector }    from 'react-redux'
import { motion, AnimatePresence }     from 'motion/react'
import { formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns'
import {
  selectNotifications,
  markRead,
  markOneReadRemote,
}                                      from '@store/slices/notificationSlice'

// ── Per-type visual identity ──────────────────────────────────────────────────
const TYPE_META = {
  order:   { emoji: '🍽️', color: '#FF9F1C', dot: '#FF9F1C' },
  waiter:  { emoji: '🛎️', color: '#D97706', dot: '#F59E0B' },
  loyalty: { emoji: '⭐', color: '#A78BFA', dot: '#A78BFA' },
  system:  { emoji: '📢', color: '#6B7280', dot: '#9CA3AF' },
  message: { emoji: '💬', color: '#7C3AED', dot: '#8B5CF6' },
  payment: { emoji: '💳', color: '#10B981', dot: '#10B981' },
  kitchen: { emoji: '👨‍🍳', color: '#FB923C', dot: '#FB923C' },
  festival:{ emoji: '🎊', color: '#F472B6', dot: '#F472B6' },
}

const getSectionLabel = (dateStr) => {
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr)
    if (isToday(d))     return 'Today'
    if (isYesterday(d)) return 'Yesterday'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch { return 'Earlier' }
}

const groupByDate = (items) => {
  const groups = [], seen = new Map()
  items.forEach(n => {
    const label = getSectionLabel(n.createdAt)
    if (!seen.has(label)) { seen.set(label, []); groups.push({ label, items: seen.get(label) }) }
    seen.get(label).push(n)
  })
  return groups
}

const Skeleton = () => (
  <div style={{ display: 'flex', gap: 12, padding: '12px 16px', alignItems: 'flex-start' }}>
    <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 16, flexShrink: 0 }} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
      <div className="skeleton" style={{ height: 12, borderRadius: 8, width: '65%' }} />
      <div className="skeleton" style={{ height: 10, borderRadius: 6, width: '45%' }} />
    </div>
  </div>
)

const Empty = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', gap: 12, textAlign: 'center' }}
  >
    <motion.div
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      style={{ width: 64, height: 64, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-dim)' }}
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path d="M6 10C6 6.686 8.686 4 12 4C15.314 4 18 6.686 18 10L18 15L20 17L4 17L6 15Z" stroke="var(--text-muted)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <path d="M10 17C10 18.105 10.895 19 12 19C13.105 19 14 18.105 14 17" stroke="var(--text-muted)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </svg>
    </motion.div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>All quiet here</p>
      <p style={{ margin: 0, fontSize: 11, lineHeight: 1.6, color: 'var(--text-muted)' }}>We'll ping you about orders, rewards & waiter responses</p>
    </div>
  </motion.div>
)

const SectionHeader = ({ label }) => (
  <div style={{ padding: '16px 20px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
    {label}
  </div>
)

const NotifRow = ({ n, index }) => {
  const dispatch = useDispatch()
  const meta     = TYPE_META[n.type] ?? TYPE_META.system

  const handleRead = () => {
    if (n.read) return
    const id = n._id ?? n.id
    dispatch(markRead(id))
    dispatch(markOneReadRemote(id))  // thunk — PATCH /notifications/:id/read
  }

  const timeAgo = (() => {
    try { return formatDistanceToNow(new Date(n.createdAt || n.timestamp), { addSuffix: true }) }
    catch { return '' }
  })()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10, height: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.22, delay: index * 0.04 }}
      onClick={handleRead}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        margin: '2px 12px', padding: '12px', borderRadius: 16,
        cursor: !n.read ? 'pointer' : 'default',
        transition: 'background 0.2s, border-color 0.2s',
        background: !n.read ? `${meta.color}14` : 'transparent',
        border: `1px solid ${!n.read ? `${meta.color}28` : 'transparent'}`,
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: `${meta.color}14`, border: '1px solid var(--divider)' }}>
        {meta.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        {n.title && (
          <p style={{ margin: '0 0 2px', fontSize: 13, lineHeight: 1.3, fontWeight: n.read ? 500 : 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
            {n.title}
          </p>
        )}
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, fontWeight: n.read ? 400 : 500, color: n.read ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
          {n.message}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--text-disabled)' }}>{timeAgo}</p>
      </div>
      <AnimatePresence>
        {!n.read && (
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 24 }}
            style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 6, background: `radial-gradient(circle,${meta.dot},${meta.color})`, boxShadow: `0 0 6px ${meta.dot}80` }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const NotificationList = ({ isDark, loading }) => {
  const notifications = useSelector(selectNotifications)

  if (loading) {
    return (
      <div style={{ flex: 1, overflow: 'hidden', padding: '8px 0' }}>
        {[1, 2, 3].map(i => <Skeleton key={i} />)}
      </div>
    )
  }

  if (!notifications.length) return <Empty />

  const groups = groupByDate(notifications)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', scrollbarWidth: 'none' }}>
      <AnimatePresence initial={false}>
        {groups.map(({ label, items }) => (
          <div key={label}>
            <SectionHeader label={label} />
            {items.map((n, i) => <NotifRow key={n._id ?? n.id} n={n} index={i} />)}
          </div>
        ))}
      </AnimatePresence>
      <div style={{ height: 16 }} />
    </div>
  )
}

export default NotificationList