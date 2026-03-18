// src/shared/components/ui/sidebar.jsx
//
// ✅ Local DT object with hardcoded hex removed — all colors via var(--token)
// ✅ Hardcoded font strings → FONTS.heading, FONTS.body, FONTS.mono
// ✅ Panel background, border, shadow → var(--modal-bg), var(--modal-border) etc
// ✅ Active/hover/muted states → var(--accent), var(--text-muted) etc
// ✅ Grain texture + glow effect logic preserved

import { createContext, useContext, useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import gsap from 'gsap'
import { FONTS } from '@shared/config/brand'

// ─── Context ──────────────────────────────────────────────────────────────────
const SidebarContext = createContext({ open: false, setOpen: () => {}, animate: true })
export const useSidebar = () => useContext(SidebarContext)

// ─── Sidebar root ─────────────────────────────────────────────────────────────
export const Sidebar = ({ children, open, setOpen, animate = true }) => (
  <SidebarContext.Provider value={{ open, setOpen, animate }}>
    {children}
  </SidebarContext.Provider>
)

// ─── SidebarBody — animated panel ─────────────────────────────────────────────
export const SidebarBody = ({ children, className, style }) => {
  const { open, setOpen, animate } = useSidebar()
  const isDark = style?.__isDark ?? true
  const { __isDark: _removed, ...cleanStyle } = style ?? {}

  const glowRef = useRef(null)
  useEffect(() => {
    if (!glowRef.current) return
    gsap.to(glowRef.current, { opacity: open ? 1 : 0, duration: 0.35, ease: 'power2.out' })
  }, [open])

  return (
    <>
      <motion.aside
        className={`kc-sidebar-desktop ${className || ''}`}
        style={{
          display:         'flex',
          flexDirection:   'column',
          flexShrink:      0,
          height:          '100%',
          overflow:        'hidden',
          position:        'relative',
          // ✅ var(--modal-bg) — was hardcoded DT.surface gradient
          background:      'var(--modal-bg)',
          borderRight:     '1px solid var(--modal-border)',
          // ✅ var(--card-shadow) — was hardcoded rgba
          boxShadow:       'var(--card-shadow)',
          backdropFilter:  'blur(48px) saturate(200%)',
          WebkitBackdropFilter: 'blur(48px) saturate(200%)',
          ...cleanStyle,
        }}
        animate={{ width: animate ? (open ? 242 : 66) : 242 }}
        transition={{ duration: 0.32, ease: [0.4, 0, 0.15, 1] }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {/* Ambient edge glow */}
        <div
          ref={glowRef}
          style={{
            position:   'absolute',
            right:      0, top: '20%', bottom: '20%',
            width:      1,
            // ✅ var(--accent) — was hardcoded DT.saffron
            background: 'linear-gradient(180deg, transparent, var(--accent-border), transparent)',
            opacity:    0,
            pointerEvents: 'none',
            zIndex:     0,
          }}
        />
        {/* Grain texture */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")`,
          pointerEvents: 'none', zIndex: 0,
          opacity: isDark ? 1 : 0.4,
        }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {children}
        </div>
      </motion.aside>
    </>
  )
}

// ─── SidebarLink ──────────────────────────────────────────────────────────────
export const SidebarLink = ({
  link,
  isActive,
  roleColor,
  isDark = true,
}) => {
  const { open, animate } = useSidebar()
  const ref = useRef(null)

  // Role color kept as a prop (semantic per-role fixed color)
  // All other colors use var(--token)
  const activeBg   = roleColor ? `${roleColor}14` : 'var(--accent-dim)'
  const activeGlow = roleColor ? `0 0 0 1px ${roleColor}22, 0 2px 12px ${roleColor}18` : 'none'

  return (
    <a
      ref={ref}
      href={link.href || '#'}
      onClick={e => { if (link.onClick) { e.preventDefault(); link.onClick() } }}
      title={!open ? link.label : undefined}
      style={{
        position:   'relative',
        display:    'flex',
        alignItems: 'center',
        gap:        10,
        padding:    '9px 12px',
        borderRadius: 11,
        textDecoration: 'none',
        cursor:     'pointer',
        // ✅ active: role-color tint; inactive: transparent
        background: isActive ? activeBg : 'transparent',
        boxShadow:  isActive ? activeGlow : 'none',
        color:      isActive ? (roleColor || 'var(--accent)') : 'var(--text-muted)',
        transition: 'background 0.18s, box-shadow 0.18s, color 0.18s',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        flexShrink: 0,
        overflow:   'hidden',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'var(--pill-bg-hover)'
          e.currentTarget.style.color      = 'var(--text-primary)'
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color      = 'var(--text-muted)'
        }
      }}
    >
      {/* Left active indicator pill */}
      <AnimatePresence>
        {isActive && (
          <motion.span
            key="indicator"
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ scaleY: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position:      'absolute',
              left:          0, top: '15%', bottom: '15%',
              width:         3,
              borderRadius:  99,
              // ✅ var(--accent-gradient) — was hardcoded DT.grad
              background:    'var(--accent-gradient)',
              boxShadow:     `0 0 8px var(--accent-glow)`,
              transformOrigin: 'center',
            }}
          />
        )}
      </AnimatePresence>

      {/* Active background shimmer */}
      {isActive && (
        <div style={{
          position:     'absolute', inset: 0,
          background:   `radial-gradient(ellipse at 0% 50%, var(--accent-dim) 0%, transparent 60%)`,
          pointerEvents:'none',
          borderRadius: 11,
        }} />
      )}

      {/* Icon */}
      <motion.span
        animate={{ color: isActive ? (roleColor || 'var(--accent)') : 'var(--text-muted)' }}
        transition={{ duration: 0.18 }}
        style={{ display: 'flex', flexShrink: 0 }}
      >
        {link.icon}
      </motion.span>

      {/* Label */}
      <AnimatePresence>
        {(open || !animate) && (
          <motion.span
            key="label"
            initial={{ opacity: 0, x: -10, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 'auto' }}
            exit={{ opacity: 0, x: -10, width: 0 }}
            transition={{ duration: 0.20, ease: [0.4, 0, 0.2, 1] }}
            style={{
              fontSize:      13,
              fontWeight:    isActive ? 700 : 500,
              // ✅ FONTS.body — was hardcoded "'DM Sans', sans-serif"
              fontFamily:    FONTS.body,
              letterSpacing: isActive ? '-0.01em' : '0',
              whiteSpace:    'nowrap',
              overflow:      'hidden',
              color:         isActive ? (roleColor || 'var(--accent)') : 'var(--text-primary)',
            }}
          >
            {link.label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Badge — expanded */}
      <AnimatePresence>
        {link.badge > 0 && (open || !animate) && (
          <motion.span
            key="badge"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.16, ease: 'backOut' }}
            style={{
              marginLeft:   'auto',
              fontSize:     9, fontWeight: 800,
              padding:      '2px 7px', borderRadius: 99,
              // ✅ var(--danger-bg) / var(--danger) — was hardcoded rgba(239,68,68,...)
              background:   'var(--danger-bg)',
              color:        'var(--danger)',
              fontFamily:   FONTS.mono,
              border:       '1px solid var(--danger-border)',
              flexShrink:   0,
            }}
          >
            {link.badge > 99 ? '99+' : link.badge}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Dot badge — collapsed */}
      {link.badge > 0 && !open && (
        <span style={{
          position:  'absolute', top: 7, right: 7,
          width:     7, height: 7, borderRadius: '50%',
          background: 'var(--danger)',
          boxShadow:  '0 0 0 2px var(--danger-bg)',
        }} />
      )}
    </a>
  )
}

// ─── Logo Full (expanded) ─────────────────────────────────────────────────────
export const SidebarLogoFull = ({ title, subtitle, grad, Icon: RoleIcon, isDark = true }) => (
  <a href="#" style={{
    display: 'flex', alignItems: 'center', gap: 11,
    padding: '2px 4px', textDecoration: 'none', userSelect: 'none',
  }}>
    <div style={{
      position:    'relative',
      width:       36, height: 36, borderRadius: 12, flexShrink: 0,
      background:  grad,
      display:     'flex', alignItems: 'center', justifyContent: 'center',
      // ✅ var(--accent-glow) — was hardcoded rgba(255,140,20,0.35)
      boxShadow:   '0 4px 16px var(--accent-glow), 0 0 0 1px var(--accent-border)',
    }}>
      <RoleIcon size={16} color="#fff" strokeWidth={2.2} />
      <div style={{
        position:      'absolute', inset: 0, borderRadius: 12,
        background:    'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />
    </div>

    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.20, ease: [0.4, 0, 0.2, 1] }}
      style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
    >
      <p style={{
        // ✅ FONTS.heading — was hardcoded "'Playfair Display', Georgia, serif"
        fontFamily:    FONTS.heading,
        fontSize:      15, fontWeight: 800,
        // ✅ var(--text-primary) — was hardcoded DT.dText/lText
        color:         'var(--text-primary)',
        margin:        0, lineHeight: 1.2, letterSpacing: '-0.02em',
      }}>
        {title}
      </p>
      <p style={{
        fontSize:      9, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.12em',
        margin:        '2px 0 0', lineHeight: 1.3,
        // ✅ var(--text-muted) — was hardcoded DT.dMuted/lMuted
        color:         'var(--text-muted)',
        fontFamily:    FONTS.body,
      }}>
        {subtitle}
      </p>
    </motion.div>
  </a>
)

// ─── Logo Icon (collapsed) ────────────────────────────────────────────────────
export const SidebarLogoIcon = ({ grad, Icon: RoleIcon }) => (
  <a href="#" style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '2px 0', textDecoration: 'none', userSelect: 'none',
  }}>
    <div style={{
      position:    'relative',
      width:       36, height: 36, borderRadius: 12,
      background:  grad,
      display:     'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow:   '0 4px 16px var(--accent-glow), 0 0 0 1px var(--accent-border)',
    }}>
      <RoleIcon size={16} color="#fff" strokeWidth={2.2} />
      <div style={{
        position:      'absolute', inset: 0, borderRadius: 12,
        background:    'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />
    </div>
  </a>
)

// ─── SidebarUserRow ───────────────────────────────────────────────────────────
export const SidebarUserRow = ({ name, role, grad, roleColor, onLogout, isDark = true, open }) => (
  <div style={{
    display:        'flex',
    alignItems:     'center',
    gap:            open ? 10 : 0,
    justifyContent: open ? 'flex-start' : 'center',
    padding:        open ? '9px 11px' : '9px 0',
    borderRadius:   12,
    // ✅ var(--pill-bg) — was hardcoded DT.surfaceBg
    background:     'var(--pill-bg)',
    border:         '1px solid var(--card-border)',
    overflow:       'hidden',
    transition:     'padding 0.28s ease, gap 0.28s ease',
    backdropFilter: 'blur(8px)',
  }}>
    {/* Avatar */}
    <div style={{
      position:    'relative',
      width:       32, height: 32, borderRadius: '50%', flexShrink: 0,
      background:  grad,
      display:     'flex', alignItems: 'center', justifyContent: 'center',
      fontSize:    13, fontWeight: 800,
      color:       'var(--text-inverse)',
      boxShadow:   `0 0 0 2px ${roleColor}35, 0 2px 8px ${roleColor}30`,
    }}>
      {name?.[0]?.toUpperCase() || '?'}
      <div style={{
        position:      'absolute', inset: 0, borderRadius: '50%',
        background:    'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 55%)',
        pointerEvents: 'none',
      }} />
    </div>

    {/* Name + role */}
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: -8, width: 0 }}
          animate={{ opacity: 1, x: 0, width: 'auto' }}
          exit={{ opacity: 0, x: -8, width: 0 }}
          transition={{ duration: 0.20 }}
          style={{ flex: 1, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap' }}
        >
          <p style={{
            fontSize:   12, fontWeight: 700,
            // ✅ var(--text-primary)
            color:      'var(--text-primary)',
            margin:     0, lineHeight: 1.3,
            overflow:   'hidden', textOverflow: 'ellipsis',
            fontFamily: FONTS.body,
          }}>
            {name || 'Staff'}
          </p>
          <p style={{
            fontSize:       9.5, color: roleColor,
            textTransform:  'capitalize', margin: 0,
            fontWeight:     600, fontFamily: FONTS.body,
          }}>
            {role}
          </p>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Logout */}
    <AnimatePresence>
      {open && onLogout && (
        <motion.button
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.18, ease: 'backOut' }}
          onClick={onLogout}
          title="Logout"
          style={{
            width:      28, height: 28, borderRadius: 9, flexShrink: 0,
            border:     '1px solid transparent',
            background: 'transparent',
            // ✅ var(--text-muted)
            color:      'var(--text-muted)',
            cursor:     'pointer',
            display:    'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s, color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background  = 'var(--danger-bg)'
            e.currentTarget.style.color       = 'var(--danger)'
            e.currentTarget.style.borderColor = 'var(--danger-border)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background  = 'transparent'
            e.currentTarget.style.color       = 'var(--text-muted)'
            e.currentTarget.style.borderColor = 'transparent'
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  </div>
)