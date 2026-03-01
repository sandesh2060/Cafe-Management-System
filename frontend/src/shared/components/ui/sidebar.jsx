// src/shared/components/ui/sidebar.jsx
// ═══════════════════════════════════════════════════════════════
//  Aceternity-style animated sidebar — KAUSĪ CHIYĀ
//  Financial-dashboard aesthetic: deep espresso + saffron-orange
//  Smooth width-morphing, glassy frosted surface, label slide-in
// ═══════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useSpring, useTransform } from 'motion/react'
import gsap from 'gsap'

// ─── Context ──────────────────────────────────────────────────────────────────
const SidebarContext = createContext({ open: false, setOpen: () => {}, animate: true })
export const useSidebar = () => useContext(SidebarContext)

// ─── Design tokens (financial dashboard palette) ──────────────────────────────
const DT = {
  // Dark surface hierarchy
  bg:       '#0A0602',          // deepest — page bg
  surface:  '#110803',          // sidebar panel
  surface2: '#1A0D05',          // elevated elements
  surface3: '#221508',          // hover states
  border:   'rgba(255,140,20,0.10)',
  borderHover: 'rgba(255,140,20,0.20)',

  // Brand
  saffron:  '#FF9F1C',
  terra:    '#E05C2A',
  grad:     'linear-gradient(135deg, #FF9F1C 0%, #E05C2A 100%)',

  // Light equivalents
  lBg:      '#F5EFE6',
  lSurface: '#FFFDF8',
  lSurface2:'#FFF8EE',
  lBorder:  'rgba(180,120,50,0.12)',
  lBorderHover: 'rgba(180,120,50,0.24)',

  // Text
  dText:    '#FFF3E0',
  dMuted:   'rgba(255,220,160,0.45)',
  dFaint:   'rgba(255,200,120,0.18)',
  lText:    '#1A0D04',
  lMuted:   'rgba(80,40,10,0.45)',
}

const s = (isDark, dark, light) => isDark ? dark : light

// ─── Sidebar root ─────────────────────────────────────────────────────────────
export const Sidebar = ({ children, open, setOpen, animate = true }) => (
  <SidebarContext.Provider value={{ open, setOpen, animate }}>
    {children}
  </SidebarContext.Provider>
)

// ─── SidebarBody — animated panel ─────────────────────────────────────────────
export const SidebarBody = ({ children, className, style }) => {
  const { open, setOpen, animate } = useSidebar()
  // Extract __isDark flag from style prop (set by DashboardLayout) without passing to DOM
  const isDark = style?.__isDark ?? true
  const { __isDark: _removed, ...cleanStyle } = style ?? {}

  // Subtle glow animation on the panel edge
  const glowRef = useRef(null)
  useEffect(() => {
    if (!glowRef.current) return
    gsap.to(glowRef.current, {
      opacity: open ? 1 : 0,
      duration: 0.35,
      ease: 'power2.out',
    })
  }, [open])

  const panelBg = s(isDark,
    `linear-gradient(180deg, ${DT.surface} 0%, ${DT.bg} 100%)`,
    `linear-gradient(180deg, ${DT.lSurface} 0%, ${DT.lBg} 100%)`,
  )
  const borderClr = s(isDark, DT.border, DT.lBorder)
  const shadowClr = s(isDark,
    '4px 0 40px rgba(0,0,0,0.60), inset -1px 0 0 rgba(255,140,20,0.06)',
    '4px 0 24px rgba(120,60,10,0.08), inset -1px 0 0 rgba(200,120,40,0.12)',
  )

  return (
    <>
      {/* Desktop animated sidebar */}
      <motion.aside
        className={`kc-sidebar-desktop ${className || ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          height: '100%',
          overflow: 'hidden',
          position: 'relative',
          background: panelBg,
          borderRight: `1px solid ${borderClr}`,
          boxShadow: shadowClr,
          backdropFilter: 'blur(48px) saturate(200%)',
          WebkitBackdropFilter: 'blur(48px) saturate(200%)',
          ...cleanStyle,
        }}
        animate={{ width: animate ? (open ? 242 : 66) : 242 }}
        transition={{ duration: 0.32, ease: [0.4, 0, 0.15, 1] }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {/* Ambient edge glow when open */}
        <div
          ref={glowRef}
          style={{
            position: 'absolute',
            right: 0,
            top: '20%',
            bottom: '20%',
            width: 1,
            background: `linear-gradient(180deg, transparent, ${DT.saffron}30, transparent)`,
            opacity: 0,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        {/* Fine grain texture overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")`,
          pointerEvents: 'none',
          zIndex: 0,
          opacity: isDark ? 1 : 0.4,
        }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {children}
        </div>
      </motion.aside>

      {/* Mobile drawer handled by DashboardLayout */}
    </>
  )
}

// ─── SidebarLink ──────────────────────────────────────────────────────────────
export const SidebarLink = ({
  link,
  isActive,
  roleColor = DT.saffron,
  isDark = true,
}) => {
  const { open, animate } = useSidebar()
  const ref = useRef(null)

  const activeBg   = `${roleColor}14`
  const activeGlow = `0 0 0 1px ${roleColor}22, 0 2px 12px ${roleColor}18`
  const hoverBg    = s(isDark, DT.surface3, 'rgba(255,220,160,0.12)')
  const mutedClr   = s(isDark, DT.dMuted, DT.lMuted)
  const textClr    = s(isDark, DT.dText, DT.lText)

  return (
    <a
      ref={ref}
      href={link.href || '#'}
      onClick={e => { if (link.onClick) { e.preventDefault(); link.onClick() } }}
      title={!open ? link.label : undefined}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderRadius: 11,
        textDecoration: 'none',
        cursor: 'pointer',
        background: isActive ? activeBg : 'transparent',
        boxShadow: isActive ? activeGlow : 'none',
        color: isActive ? roleColor : mutedClr,
        transition: 'background 0.18s, box-shadow 0.18s, color 0.18s',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        flexShrink: 0,
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.background = hoverBg
          e.currentTarget.style.color = s(isDark, DT.dText, DT.lText)
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = mutedClr
        }
      }}
    >
      {/* Left active indicator — pill style */}
      <AnimatePresence>
        {isActive && (
          <motion.span
            key="indicator"
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ scaleY: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'absolute',
              left: 0, top: '15%', bottom: '15%',
              width: 3,
              borderRadius: 99,
              background: `linear-gradient(180deg, ${roleColor}, ${DT.terra})`,
              boxShadow: `0 0 8px ${roleColor}60`,
              transformOrigin: 'center',
            }}
          />
        )}
      </AnimatePresence>

      {/* Active background shimmer */}
      {isActive && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 0% 50%, ${roleColor}08 0%, transparent 60%)`,
          pointerEvents: 'none',
          borderRadius: 11,
        }} />
      )}

      {/* Icon */}
      <motion.span
        animate={{ color: isActive ? roleColor : mutedClr }}
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
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: isActive ? '-0.01em' : '0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              color: isActive ? roleColor : textClr,
            }}
          >
            {link.label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Badge when expanded */}
      <AnimatePresence>
        {link.badge > 0 && (open || !animate) && (
          <motion.span
            key="badge"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.16, ease: 'backOut' }}
            style={{
              marginLeft: 'auto',
              fontSize: 9,
              fontWeight: 800,
              padding: '2px 7px',
              borderRadius: 99,
              background: 'rgba(239,68,68,0.15)',
              color: '#EF4444',
              fontFamily: "'DM Mono', monospace",
              border: '1px solid rgba(239,68,68,0.20)',
              flexShrink: 0,
            }}
          >
            {link.badge > 99 ? '99+' : link.badge}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Dot badge when collapsed */}
      {link.badge > 0 && !open && (
        <span style={{
          position: 'absolute',
          top: 7, right: 7,
          width: 7, height: 7,
          borderRadius: '50%',
          background: '#EF4444',
          boxShadow: '0 0 0 2px rgba(239,68,68,0.25)',
        }} />
      )}
    </a>
  )
}

// ─── Logo Full (expanded) ─────────────────────────────────────────────────────
export const SidebarLogoFull = ({ title, subtitle, grad, Icon: RoleIcon, isDark = true }) => {
  const textClr = s(isDark, DT.dText, DT.lText)
  const mutedClr = s(isDark, 'rgba(255,220,160,0.55)', 'rgba(120,60,10,0.55)')

  return (
    <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '2px 4px', textDecoration: 'none', userSelect: 'none' }}>
      {/* Icon with glow ring */}
      <div style={{
        position: 'relative',
        width: 36, height: 36,
        borderRadius: 12,
        flexShrink: 0,
        background: grad,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 16px rgba(255,140,20,0.35), 0 0 0 1px rgba(255,140,20,0.20)`,
      }}>
        <RoleIcon size={16} color="#fff" strokeWidth={2.2} />
        {/* Inner glow */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 60%)',
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
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 15, fontWeight: 800,
          color: textClr, margin: 0, lineHeight: 1.2,
          letterSpacing: '-0.02em',
        }}>
          {title}
        </p>
        <p style={{
          fontSize: 9,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          margin: '2px 0 0', lineHeight: 1.3,
          color: mutedClr,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {subtitle}
        </p>
      </motion.div>
    </a>
  )
}

// ─── Logo Icon (collapsed) ────────────────────────────────────────────────────
export const SidebarLogoIcon = ({ grad, Icon: RoleIcon }) => (
  <a href="#" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px 0', textDecoration: 'none', userSelect: 'none' }}>
    <div style={{
      position: 'relative',
      width: 36, height: 36, borderRadius: 12,
      background: grad,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 4px 16px rgba(255,140,20,0.35), 0 0 0 1px rgba(255,140,20,0.20)',
    }}>
      <RoleIcon size={16} color="#fff" strokeWidth={2.2} />
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />
    </div>
  </a>
)

// ─── SidebarUserRow ───────────────────────────────────────────────────────────
export const SidebarUserRow = ({ name, role, grad, roleColor, onLogout, isDark = true, open }) => {
  const textPri  = s(isDark, DT.dText, DT.lText)
  const textMut  = s(isDark, DT.dMuted, DT.lMuted)
  const borderClr = s(isDark, DT.border, DT.lBorder)
  const surfaceBg = s(isDark, 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.70)')

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: open ? 10 : 0,
      justifyContent: open ? 'flex-start' : 'center',
      padding: open ? '9px 11px' : '9px 0',
      borderRadius: 12,
      background: surfaceBg,
      border: `1px solid ${borderClr}`,
      overflow: 'hidden',
      transition: 'padding 0.28s ease, gap 0.28s ease',
      backdropFilter: 'blur(8px)',
    }}>
      {/* Avatar with gradient ring */}
      <div style={{
        position: 'relative',
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: grad,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 800, color: '#fff',
        boxShadow: `0 0 0 2px ${roleColor}35, 0 2px 8px ${roleColor}30`,
      }}>
        {name?.[0]?.toUpperCase() || '?'}
        {/* Shine */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 55%)',
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
              fontSize: 12, fontWeight: 700, color: textPri,
              margin: 0, lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {name || 'Staff'}
            </p>
            <p style={{
              fontSize: 9.5, color: roleColor,
              textTransform: 'capitalize', margin: 0,
              fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
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
              width: 28, height: 28, borderRadius: 9, flexShrink: 0,
              border: '1px solid transparent',
              background: 'transparent',
              color: textMut, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.12)'
              e.currentTarget.style.color = '#EF4444'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.20)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = textMut
              e.currentTarget.style.borderColor = 'transparent'
            }}
          >
            {/* Logout icon */}
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
}