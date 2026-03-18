// src/shared/components/layout/TopHeader.jsx
//
// ✅ Hardcoded SAFFRON/TERRA hex constants removed — var(--accent), var(--accent-dark)
// ✅ Hardcoded panelBg/border/shadow/text rgba strings → var(--header-bg) etc
// ✅ Hardcoded 'Playfair Display' font → FONTS.heading
// ✅ Hardcoded 'DM Mono' font → FONTS.mono
// ✅ All icon hover colors → var(--accent)
// ✅ Notification badge gradient → var(--accent-gradient)

import { Bell, ChevronLeft, Menu } from 'lucide-react'
import { useSelector }             from 'react-redux'
import { useNavigate }             from 'react-router-dom'
import { useContext, useRef }      from 'react'
import { motion }                  from 'motion/react'
import gsap                        from 'gsap'
import { ThemeContext }            from '@shared/context/ThemeContext'
import { ThemeToggle }             from '@shared/components/ui/ThemeToggle'
import { FONTS }                   from '@shared/config/brand'

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

  // Tap animation for icon buttons
  const tap = (ref) => {
    if (!ref?.current) return
    gsap.timeline()
      .to(ref.current, { scale: 0.88, duration: 0.08, ease: 'power2.in' })
      .to(ref.current, { scale: 1,    duration: 0.32, ease: 'back.out(2)' })
  }

  const menuRef = useRef(null)
  const backRef = useRef(null)
  const bellRef = useRef(null)

  const IconButton = ({ btnRef, onClick, label, children }) => (
    <button
      ref={btnRef}
      onClick={() => { tap(btnRef); onClick?.() }}
      aria-label={label}
      style={{
        width: 38, height: 38,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 11,
        // ✅ var tokens — was hardcoded rgba
        border:     '1px solid var(--header-border)',
        background: 'var(--pill-bg)',
        color:      'var(--text-muted)',
        cursor:     'pointer',
        flexShrink: 0,
        transition: 'background 0.18s, color 0.18s, border-color 0.18s',
        backdropFilter: 'blur(8px)',
      }}
      onMouseEnter={e => {
        // ✅ var(--accent-dim) / var(--accent) — was hardcoded rgba(255,140,20,...)
        e.currentTarget.style.background   = 'var(--accent-dim)'
        e.currentTarget.style.color        = 'var(--accent)'
        e.currentTarget.style.borderColor  = 'var(--accent-border)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background   = 'var(--pill-bg)'
        e.currentTarget.style.color        = 'var(--text-muted)'
        e.currentTarget.style.borderColor  = 'var(--header-border)'
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
        // Respect safe-area notch
        paddingTop: 'max(0px, env(safe-area-inset-top))',
        height: 'calc(var(--nav-height, 56px) + max(0px, env(safe-area-inset-top)))',
        // ✅ var tokens — was hardcoded rgba
        background:          'var(--header-bg)',
        backdropFilter:      'blur(40px) saturate(200%)',
        WebkitBackdropFilter:'blur(40px) saturate(200%)',
        borderBottom:        '1px solid var(--header-border)',
        boxShadow:           'var(--card-shadow)',
        transition:          'background var(--transition-theme), border-color var(--transition-theme)',
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
              // ✅ FONTS.heading — was hardcoded "'Playfair Display', Georgia, serif"
              fontFamily:   FONTS.heading,
              fontWeight:   800,
              fontSize:     18,
              lineHeight:   1.2,
              letterSpacing:'-0.03em',
              // ✅ var(--text-primary) — was hardcoded
              color:        'var(--text-primary)',
              margin:       0,
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
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
                  position:   'absolute',
                  top: 5, right: 5,
                  minWidth:   16, height: 16,
                  padding:    '0 4px',
                  borderRadius: 99,
                  // ✅ var(--accent-gradient) — was hardcoded linear-gradient(135deg, SAFFRON, TERRA)
                  background: 'var(--accent-gradient)',
                  color:      'var(--text-inverse)',
                  fontSize:   9,
                  fontWeight: 800,
                  display:    'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  // ✅ FONTS.mono — was hardcoded "'DM Mono', monospace"
                  fontFamily: FONTS.mono,
                  // ✅ var(--accent-glow) — was hardcoded SAFFRON + '40'
                  boxShadow:  '0 2px 6px var(--accent-glow)',
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