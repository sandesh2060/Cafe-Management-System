// src/shared/components/layout/TopHeader.jsx
// ═══════════════════════════════════════════════════════════════
//  KAUSĪ CHIYĀ — Top Header
//  Financial-dashboard aesthetic: espresso + saffron-orange
//  Glassmorphism bar · smooth theme-aware transitions
// ═══════════════════════════════════════════════════════════════

import { Bell, ChevronLeft, Menu } from 'lucide-react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useContext, useRef } from 'react'
import { motion } from 'motion/react'
import gsap from 'gsap'
import { ThemeContext } from '@shared/context/ThemeContext'
import { ThemeToggle } from '@shared/components/ui/ThemeToggle'

const SAFFRON = '#FF9F1C'
const TERRA   = '#E05C2A'

/**
 * Props:
 *   title?       : string
 *   showBack?    : boolean
 *   showMenu?    : boolean
 *   onMenuClick? : () => void
 *   right?       : ReactNode
 */
const TopHeader = ({
  title,
  showBack    = false,
  showMenu    = false,
  onMenuClick,
  right,
}) => {
  const navigate   = useNavigate()
  const { isDark } = useContext(ThemeContext)
  const user       = useSelector(s => s.auth?.user)
  const role       = user?.role || 'customer'
  const unread     = useSelector(s => s.notifications?.unreadCount || 0)
  const isAdmin    = role === 'admin'

  // Theme-resolved values — financial dashboard palette
  const panelBg = isDark
    ? 'rgba(10, 6, 2, 0.90)'
    : 'rgba(255, 253, 248, 0.92)'
  const borderClr = isDark
    ? 'rgba(255, 140, 20, 0.10)'
    : 'rgba(180, 110, 30, 0.10)'
  const shadow = isDark
    ? '0 1px 0 rgba(255,140,20,0.06), 0 4px 24px rgba(0,0,0,0.40)'
    : '0 1px 0 rgba(180,110,30,0.08), 0 4px 20px rgba(100,50,10,0.06)'
  const textPri = isDark ? '#FFF3E0' : '#1A0D04'
  const mutedClr = isDark ? 'rgba(255,200,130,0.45)' : 'rgba(80,40,10,0.40)'
  const iconBg   = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.75)'
  const iconBorder = isDark ? 'rgba(255,140,20,0.12)' : 'rgba(180,110,30,0.12)'

  // Tap animation for icon buttons
  const tap = (ref) => {
    if (!ref?.current) return
    gsap.timeline()
      .to(ref.current, { scale: 0.88, duration: 0.08, ease: 'power2.in' })
      .to(ref.current, { scale: 1,    duration: 0.32, ease: 'back.out(2)' })
  }

  const menuRef  = useRef(null)
  const backRef  = useRef(null)
  const bellRef  = useRef(null)

  const IconButton = ({ btnRef, onClick, label, children }) => (
    <button
      ref={btnRef}
      onClick={() => { tap(btnRef); onClick?.() }}
      aria-label={label}
      style={{
        width: 38, height: 38,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 11,
        border: `1px solid ${iconBorder}`,
        background: iconBg,
        color: mutedClr,
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.18s, color 0.18s, border-color 0.18s',
        backdropFilter: 'blur(8px)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = isDark ? 'rgba(255,140,20,0.10)' : 'rgba(255,140,20,0.08)'
        e.currentTarget.style.color = SAFFRON
        e.currentTarget.style.borderColor = isDark ? 'rgba(255,140,20,0.22)' : 'rgba(255,140,20,0.20)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = iconBg
        e.currentTarget.style.color = mutedClr
        e.currentTarget.style.borderColor = iconBorder
      }}
    >
      {children}
    </button>
  )

  return (
    <header
      style={{
        position: 'sticky',
        top: 0, zIndex: 40,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        gap: 10,
        height: 'var(--top-header-height, 56px)',
        background: panelBg,
        backdropFilter: 'blur(40px) saturate(200%)',
        WebkitBackdropFilter: 'blur(40px) saturate(200%)',
        borderBottom: `1px solid ${borderClr}`,
        boxShadow: shadow,
        transition: 'background 0.3s, border-color 0.3s',
      }}
    >
      {/* ── LEFT ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {showMenu && (
          <IconButton btnRef={menuRef} onClick={onMenuClick} label="Open menu">
            <Menu size={17} />
          </IconButton>
        )}

        {showBack && (
          <IconButton btnRef={backRef} onClick={() => navigate(-1)} label="Go back">
            <ChevronLeft size={19} />
          </IconButton>
        )}

        {title && (
          <motion.h1
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 800,
              fontSize: 18,
              lineHeight: 1.2,
              letterSpacing: '-0.03em',
              color: textPri,
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </motion.h1>
        )}
      </div>

      {/* ── RIGHT ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {right}
        <ThemeToggle size="md" />

        {!isAdmin && (
          <div style={{ position: 'relative' }}>
            <IconButton
              btnRef={bellRef}
              label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
            >
              <Bell size={17} />
            </IconButton>

            {unread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                  position: 'absolute',
                  top: 5, right: 5,
                  minWidth: 16, height: 16,
                  padding: '0 4px',
                  borderRadius: 99,
                  background: `linear-gradient(135deg, ${SAFFRON}, ${TERRA})`,
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  fontFamily: "'DM Mono', monospace",
                  boxShadow: `0 2px 6px ${SAFFRON}40`,
                  pointerEvents: 'none',
                }}
              >
                {unread > 99 ? '99+' : unread}
              </motion.span>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

export default TopHeader