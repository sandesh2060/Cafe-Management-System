// src/modules/customer/components/notifications/NotificationBell.jsx
//
// FIXES vs previous version:
// 1. window.__sheetOpen = true when panel is open — NotificationToast
//    checks this flag and suppresses itself while any sheet is open.
// 2. Badge forwardRef — AnimatePresence mode="popLayout" requires it.
// 3. BellSVG pulse uses scale not r (Framer Motion can't animate SVG attrs).

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

// ── Animated SVG Bell ────────────────────────────────────────────────────────
const BellSVG = ({ hasUnread, isDark }) => {
  const color       = isDark ? 'rgba(255,184,77,0.55)' : 'rgba(92,51,23,0.42)'
  const activeColor = isDark ? '#FFB84D' : '#C8680A'
  const c           = hasUnread ? activeColor : color

  return (
    <motion.svg
      width="22" height="22" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg"
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
      <motion.path
        d="M10 17 C10 18.105 10.895 19 12 19 C13.105 19 14 18.105 14 17"
        stroke={c} strokeWidth="1.7" strokeLinecap="round" fill="none"
        animate={{ stroke: c }} transition={{ duration: 0.25 }}
      />
      <motion.line
        x1="12" y1="2" x2="12" y2="4"
        stroke={c} strokeWidth="1.7" strokeLinecap="round"
        animate={{ stroke: c }} transition={{ duration: 0.25 }}
      />
      {hasUnread && (
        <motion.circle
          cx="12" cy="10" r="9"
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

// ── Badge — needs forwardRef for AnimatePresence popLayout ────────────────────
const Badge = forwardRef(({ count }, ref) => (
  <motion.span
    ref={ref}
    key={count}
    initial={{ scale: 0, opacity: 0, y: -4 }}
    animate={{ scale: 1, opacity: 1, y: 0 }}
    exit={{   scale: 0, opacity: 0, y: -4 }}
    transition={{ type: 'spring', stiffness: 600, damping: 22 }}
    className="absolute -top-1 -right-1 min-w-[17px] h-[17px] rounded-full
               flex items-center justify-center px-1
               text-[9px] font-black text-white font-mono
               pointer-events-none z-10"
    style={{
      background:    'linear-gradient(135deg, #FF9F1C, #E05C2A)',
      boxShadow:     '0 2px 8px rgba(255,130,0,0.5), 0 0 0 1.5px rgba(255,255,255,0.25)',
      lineHeight:    1,
      letterSpacing: '-0.02em',
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
  const hasUnread  = unread > 0

  // ── Tell NotificationToast to suppress while panel is open ───────────────
  useEffect(() => {
    window.__sheetOpen = open
    return () => { window.__sheetOpen = false }
  }, [open])

  useEffect(() => {
    if (open) dispatch(fetchNotifications())
  }, [open, dispatch])

  const handleMarkAll = () => {
    dispatch(markAllRead())
    dispatch(markAllReadRemote())
  }

  const handleClearAll = () => {
    dispatch(clearNotifications())
    dispatch(clearAllRemote())
  }

  const surface2  = isDark ? '#241810' : '#FFF0D6'
  const border    = isDark ? 'rgba(255,159,28,0.12)' : '#F0D9B5'
  const textMain  = isDark ? '#FFF8EE' : '#5C3317'
  const textMuted = isDark ? '#C49A6C' : '#8B5E3C'
  const panelBg   = isDark ? '#1A1208' : '#FFFFFF'

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        whileTap={{ scale: 0.88 }}
        aria-label={`Notifications${hasUnread ? ` (${unread} unread)` : ''}`}
        className="relative flex items-center justify-center
                   w-9 h-9 rounded-[10px] transition-colors duration-150"
        style={{
          background: hasUnread
            ? (isDark ? 'rgba(255,159,28,0.1)' : 'rgba(255,159,28,0.07)')
            : 'transparent',
          border: `1px solid ${hasUnread
            ? (isDark ? 'rgba(255,159,28,0.22)' : 'rgba(255,159,28,0.2)')
            : 'transparent'}`,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <BellSVG hasUnread={hasUnread} isDark={isDark} />

        <AnimatePresence mode="popLayout">
          {hasUnread && <Badge count={unread} />}
        </AnimatePresence>

        <AnimatePresence>
          {hasUnread && (
            <motion.span
              key="ripple"
              className="absolute inset-0 rounded-[10px] pointer-events-none"
              initial={{ opacity: 0.5, scale: 1 }}
              animate={{ opacity: 0,   scale: 1.6 }}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2.5 }}
              style={{ background: 'rgba(255,159,28,0.18)' }}
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
                className="fixed inset-0 z-[90]"
                style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(5px)' }}
              />

              <motion.div
                initial={{ y: '-100%', opacity: 0.6 }}
                animate={{ y: 0,       opacity: 1   }}
                exit={{   y: '-100%',  opacity: 0   }}
                transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 0.9 }}
                className="fixed top-0 left-0 right-0 z-[91] flex flex-col overflow-hidden"
                style={{
                  background:   panelBg,
                  borderBottom: `1px solid ${border}`,
                  borderRadius: '0 0 28px 28px',
                  maxHeight:    '82vh',
                  boxShadow:    isDark
                    ? '0 20px 60px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,159,28,0.08)'
                    : '0 20px 50px rgba(92,51,23,0.16), 0 0 0 1px rgba(240,217,181,0.6)',
                }}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-5 pt-5 pb-3.5 flex-shrink-0"
                  style={{ borderBottom: `1px solid ${border}` }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: isDark ? 'rgba(255,159,28,0.1)' : 'rgba(255,159,28,0.08)' }}>
                      <BellSVG hasUnread={hasUnread} isDark={isDark} />
                    </div>
                    <h2 className="text-[17px] font-extrabold m-0" style={{ color: textMain }}>
                      Notifications
                    </h2>
                    <AnimatePresence>
                      {hasUnread && (
                        <motion.span
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{   scale: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                          className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white font-mono"
                          style={{ background: 'linear-gradient(135deg, #FF9F1C, #E05C2A)' }}
                        >
                          {unread} new
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex items-center gap-2">
                    <AnimatePresence>
                      {hasUnread && (
                        <motion.button
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{   opacity: 0, x: 8 }}
                          onClick={handleMarkAll}
                          className="flex items-center gap-1.5 text-[11px] font-semibold
                                     px-2.5 py-1.5 rounded-lg transition-all active:scale-95"
                          style={{
                            color:      '#FF9F1C',
                            background: isDark ? 'rgba(255,159,28,0.1)' : 'rgba(255,159,28,0.08)',
                            border:     '1px solid rgba(255,159,28,0.22)',
                            WebkitTapHighlightColor: 'transparent',
                          }}
                        >
                          <CheckCheck size={12} />
                          All read
                        </motion.button>
                      )}
                    </AnimatePresence>

                    <button
                      onClick={handleClearAll}
                      title="Clear all"
                      className="w-8 h-8 rounded-[10px] flex items-center justify-center
                                 transition-all active:scale-90"
                      style={{
                        background: surface2, border: `1px solid ${border}`,
                        color: textMuted, WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>

                    <button
                      onClick={() => setOpen(false)}
                      className="w-8 h-8 rounded-[10px] flex items-center justify-center
                                 transition-all active:scale-90"
                      style={{
                        background: surface2, border: `1px solid ${border}`,
                        color: textMuted, WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <NotificationList
                  isDark={isDark}
                  surface2={surface2}
                  border={border}
                  textMain={textMain}
                  textMuted={textMuted}
                  loading={loading}
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