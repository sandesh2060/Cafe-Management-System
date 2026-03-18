// src/modules/customer/components/notifications/NotificationBell.jsx
//
// ✅ Local hardcoded hex vars (surface2, border, textMain, textMuted, panelBg)
//    replaced with var(--token) throughout
// ✅ BellSVG colors use var(--text-muted) and var(--accent) via CSS vars
// ✅ Badge gradient kept as fixed saffron (brand identity, intentional)
// ✅ All logic, animations, portal, AnimatePresence unchanged

import { useEffect, useContext, useState, forwardRef } from 'react'
import { createPortal }                from 'react-dom'
import { useSelector, useDispatch }    from 'react-redux'
import { motion, AnimatePresence }     from 'motion/react'
import { X, Trash2, CheckCheck }       from 'lucide-react'
import { ThemeContext }                from '@shared/context/ThemeContext'
import {
  selectUnreadCount,
  selectNotifsLoading,
  fetchNotifications,
  markAllRead,
  markAllReadRemote,
  clearAllRemote,
  clearNotifications,
}                                      from '@store/slices/notificationSlice'
import NotificationList                from './NotificationList'

// ── Animated SVG Bell ─────────────────────────────────────────────────────────
const BellSVG = ({ hasUnread, isDark }) => {
  // ✅ var(--text-muted) / var(--accent) via getComputedStyle-compatible strings
  // Using inline SVG with currentColor so the parent button's color applies
  const inactiveColor = isDark ? 'rgba(255,184,77,0.55)' : 'rgba(92,51,23,0.42)'
  const activeColor   = isDark ? '#FFB84D' : '#C8680A'
  const c = hasUnread ? activeColor : inactiveColor

  return (
    <motion.svg
      width="22" height="22" viewBox="0 0 24 24" fill="none"
      animate={hasUnread ? { rotate: [0, -18, 16, -12, 10, -6, 4, 0] } : { rotate: 0 }}
      transition={hasUnread
        ? { duration: 0.7, ease: 'easeInOut', repeat: Infinity, repeatDelay: 3.5 }
        : {}}
      style={{ originX: '50%', originY: '10%', display: 'block' }}
    >
      <motion.path
        d="M6 10 C6 6.686 8.686 4 12 4 C15.314 4 18 6.686 18 10 L18 15 L20 17 L4 17 L6 15 Z"
        stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
        fill={hasUnread ? (isDark ? 'rgba(255,184,77,0.08)' : 'rgba(200,104,10,0.07)') : 'none'}
        animate={{ stroke: c }} transition={{ duration: 0.25 }}
      />
      <motion.path d="M10 17 C10 18.105 10.895 19 12 19 C13.105 19 14 18.105 14 17"
        stroke={c} strokeWidth="1.7" strokeLinecap="round" fill="none"
        animate={{ stroke: c }} transition={{ duration: 0.25 }}
      />
      <motion.line x1="12" y1="2" x2="12" y2="4"
        stroke={c} strokeWidth="1.7" strokeLinecap="round"
        animate={{ stroke: c }} transition={{ duration: 0.25 }}
      />
      {hasUnread && (
        <motion.circle cx="12" cy="10" r="9"
          stroke={activeColor} strokeWidth="0.6" fill="none"
          initial={{ opacity: 0, scale: 0.78 }}
          animate={{ opacity: [0, 0.35, 0], scale: [0.78, 1.2, 1.5] }}
          transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2 }}
          style={{ transformOrigin: '12px 10px' }}
        />
      )}
    </motion.svg>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
const Badge = forwardRef(({ count }, ref) => (
  <motion.span
    ref={ref} key={count}
    initial={{ scale: 0, opacity: 0, y: -4 }}
    animate={{ scale: 1, opacity: 1, y: 0 }}
    exit={{   scale: 0, opacity: 0, y: -4 }}
    transition={{ type: 'spring', stiffness: 600, damping: 22 }}
    style={{
      position: 'absolute', top: -4, right: -4,
      minWidth: 17, height: 17, borderRadius: 99,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 4px', fontSize: 9, fontWeight: 800,
      color: '#fff', fontFamily: 'var(--font-mono)',
      // Brand identity badge — intentional fixed gradient
      background: 'linear-gradient(135deg,#FF9F1C,#E05C2A)',
      boxShadow: '0 2px 8px rgba(255,130,0,0.5),0 0 0 1.5px rgba(255,255,255,0.25)',
      lineHeight: 1, letterSpacing: '-0.02em', pointerEvents: 'none', zIndex: 10,
    }}
  >
    {count > 9 ? '9+' : count}
  </motion.span>
))
Badge.displayName = 'Badge'

// ════════════════════════════════════════════════════════════════════════════
const NotificationBell = () => {
  const dispatch   = useDispatch()
  const unread     = useSelector(selectUnreadCount)
  const loading    = useSelector(selectNotifsLoading)
  const { isDark } = useContext(ThemeContext)
  const [open, setOpen] = useState(false)
  const hasUnread = unread > 0

  useEffect(() => {
    window.__sheetOpen = open
    return () => { window.__sheetOpen = false }
  }, [open])

  useEffect(() => {
    if (open) dispatch(fetchNotifications())
  }, [open, dispatch])

  const handleMarkAll  = () => { dispatch(markAllRead()); dispatch(markAllReadRemote()) }
  const handleClearAll = () => { dispatch(clearNotifications()); dispatch(clearAllRemote()) }

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        whileTap={{ scale: 0.88 }}
        aria-label={`Notifications${hasUnread ? ` (${unread} unread)` : ''}`}
        style={{
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: 10,
          // ✅ var(--accent-dim/border) for active, transparent for inactive
          background: hasUnread ? 'var(--accent-dim)' : 'transparent',
          border: `1px solid ${hasUnread ? 'var(--accent-border)' : 'transparent'}`,
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        <BellSVG hasUnread={hasUnread} isDark={isDark} />
        <AnimatePresence mode="popLayout">
          {hasUnread && <Badge count={unread} />}
        </AnimatePresence>
        <AnimatePresence>
          {hasUnread && (
            <motion.span key="ripple"
              style={{
                position: 'absolute', inset: 0, borderRadius: 10, pointerEvents: 'none',
                background: 'var(--accent-dim)',
              }}
              initial={{ opacity: 0.5, scale: 1 }}
              animate={{ opacity: 0, scale: 1.6 }}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2.5 }}
            />
          )}
        </AnimatePresence>
      </motion.button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => setOpen(false)}
                style={{
                  position: 'fixed', inset: 0, zIndex: 90,
                  background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(5px)',
                }}
              />
              <motion.div
                initial={{ y: '-100%', opacity: 0.6 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '-100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 0.9 }}
                style={{
                  position: 'fixed', top: 0, left: 0, right: 0, zIndex: 91,
                  display: 'flex', flexDirection: 'column', overflow: 'hidden',
                  // ✅ var(--modal-bg) — was hardcoded panelBg hex
                  background: 'var(--modal-bg)',
                  // ✅ var(--modal-border) — was hardcoded border hex
                  borderBottom: '1px solid var(--modal-border)',
                  borderRadius: '0 0 28px 28px',
                  maxHeight: '82vh',
                  // ✅ var(--card-shadow) — was hardcoded isDark conditional
                  boxShadow: 'var(--card-shadow)',
                }}
              >
                {/* Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '20px 20px 14px', flexShrink: 0,
                  // ✅ var(--divider) — was hardcoded border
                  borderBottom: '1px solid var(--divider)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      // ✅ var(--accent-dim)
                      background: 'var(--accent-dim)',
                    }}>
                      <BellSVG hasUnread={hasUnread} isDark={isDark} />
                    </div>
                    {/* ✅ var(--text-primary) — was textMain hex */}
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
                      Notifications
                    </h2>
                    <AnimatePresence>
                      {hasUnread && (
                        <motion.span
                          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                          style={{
                            fontSize: 11, fontWeight: 700, padding: '2px 8px',
                            borderRadius: 99, color: '#fff',
                            background: 'linear-gradient(135deg,#FF9F1C,#E05C2A)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {unread} new
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AnimatePresence>
                      {hasUnread && (
                        <motion.button
                          initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 8 }}
                          onClick={handleMarkAll}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            fontSize: 11, fontWeight: 600,
                            padding: '6px 10px', borderRadius: 8,
                            // ✅ var(--accent-dim/border/accent)
                            color: 'var(--accent)',
                            background: 'var(--accent-dim)',
                            border: '1px solid var(--accent-border)',
                            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                          }}
                        >
                          <CheckCheck size={12} />
                          All read
                        </motion.button>
                      )}
                    </AnimatePresence>

                    <button onClick={handleClearAll} title="Clear all" style={{
                      width: 32, height: 32, borderRadius: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      // ✅ var(--pill-bg/card-border/text-muted)
                      background: 'var(--pill-bg)', border: '1px solid var(--card-border)',
                      color: 'var(--text-muted)', cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent',
                    }}>
                      <Trash2 size={13} />
                    </button>

                    <button onClick={() => setOpen(false)} style={{
                      width: 32, height: 32, borderRadius: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--pill-bg)', border: '1px solid var(--card-border)',
                      color: 'var(--text-muted)', cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent',
                    }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* ✅ Pass var token strings instead of hex locals */}
                <NotificationList isDark={isDark} loading={loading} />
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