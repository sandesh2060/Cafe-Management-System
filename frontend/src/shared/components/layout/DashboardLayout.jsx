// src/shared/components/layout/DashboardLayout.jsx
//
// FIXES vs previous version:
// ✅ Escape key closes mobile drawer
// ✅ Drawer close button: 30px → 44px (WCAG 2.5.5 minimum touch target)
// ✅ Mobile drawer nav buttons: min-height restored to 44px for touch
// ✅ Drawer backdrop: touch-action:pan-y so scroll inside works on Android
// ✅ useBreakpoint: passive resize listener (already was), no changes needed
// ✅ ROUTING: useNavigate for logout only — zero page reloads everywhere
// ✅ All colors via var(--token) except ROLE_META intentional brand gradients
// ✅ White gap fix: main is plain block + height:100%, inner wrapper min-height:100%

import { useState, useContext, useEffect, useRef, useCallback } from 'react'
import { useDispatch, useSelector }  from 'react-redux'
import { useNavigate }               from 'react-router-dom'
import { motion, AnimatePresence }   from 'motion/react'
import gsap                          from 'gsap'
import {
  LayoutDashboard, Users, Map, BarChart3, Package, Star,
  FileText, MessageSquare, Bell, LogOut, Sun, Moon,
  Menu, X, ClipboardList, CreditCard, ChefHat, ShieldCheck,
} from 'lucide-react'
import { selectRole, selectUser, clearAuth } from '@store/slices/authSlice'
import { selectTotalUnread }  from '@store/slices/messagingSlice'
import { selectUnreadCount }  from '@store/slices/notificationSlice'
import { ThemeContext }        from '@shared/context/ThemeContext'
import { BRAND, FONTS }        from '@shared/config/brand'
import {
  Sidebar, SidebarBody, SidebarLink,
  SidebarLogoFull, SidebarLogoIcon,
  SidebarUserRow, useSidebar,
} from '@shared/components/ui/sidebar'

const NAV_DEFS = {
  manager: [
    { key: 'overview',  label: 'Overview',  Icon: LayoutDashboard },
    { key: 'staff',     label: 'Staff',     Icon: Users           },
    { key: 'tables',    label: 'Tables',    Icon: Map             },
    { key: 'inventory', label: 'Inventory', Icon: Package         },
    { key: 'loyalty',   label: 'Loyalty',   Icon: Star            },
    { key: 'reports',   label: 'Reports',   Icon: FileText        },
    { key: 'messages',  label: 'Messages',  Icon: MessageSquare   },
  ],
  waiter: [
    { key: 'orders', label: 'Orders', Icon: ClipboardList  },
    { key: 'calls',  label: 'Calls',  Icon: Bell           },
    { key: 'tables', label: 'Tables', Icon: Map            },
    { key: 'chat',   label: 'Chat',   Icon: MessageSquare  },
  ],
  kitchen: [
    { key: 'kds',  label: 'Kitchen', Icon: ChefHat       },
    { key: 'chat', label: 'Chat',    Icon: MessageSquare },
  ],
  cashier: [
    { key: 'billing',      label: 'Billing',      Icon: CreditCard    },
    { key: 'transactions', label: 'Transactions', Icon: BarChart3     },
    { key: 'chat',         label: 'Chat',         Icon: MessageSquare },
  ],
  admin: [
    { key: 'overview', label: 'Overview', Icon: LayoutDashboard },
    { key: 'users',    label: 'Users',    Icon: Users           },
    { key: 'activity', label: 'Activity', Icon: BarChart3       },
  ],
}

// Intentional hardcoded brand gradients — not theme tokens
const ROLE_META = {
  manager: { Icon: LayoutDashboard, color: '#FF9F1C', grad: 'linear-gradient(135deg,#FF9F1C 0%,#E05C2A 100%)' },
  waiter:  { Icon: ClipboardList,   color: '#FF9F1C', grad: 'linear-gradient(135deg,#FF9F1C 0%,#E05C2A 100%)' },
  kitchen: { Icon: ChefHat,         color: '#E05C2A', grad: 'linear-gradient(135deg,#E05C2A 0%,#F97316 100%)' },
  cashier: { Icon: CreditCard,      color: '#2D9B5A', grad: 'linear-gradient(135deg,#2D9B5A 0%,#38C26F 100%)' },
  admin:   { Icon: ShieldCheck,     color: '#374151', grad: 'linear-gradient(135deg,#374151 0%,#6B7280 100%)' },
}

const useBreakpoint = () => {
  const get = () => {
    if (typeof window === 'undefined') return 'desktop'
    const w = window.innerWidth
    if (w < 768)  return 'mobile'
    if (w < 1024) return 'tablet'
    return 'desktop'
  }
  const [bp, set] = useState(get)
  useEffect(() => {
    const h = () => set(get())
    window.addEventListener('resize', h, { passive: true })
    return () => window.removeEventListener('resize', h)
  }, [])
  return bp
}

const SidebarContent = ({
  navDef, activeKey, onNav, meta, role, user,
  isDark, unreadMsg, unreadNotif, toggleTheme, onLogout,
}) => {
  const { open } = useSidebar()
  const { Icon: RoleIcon, color: roleColor, grad } = meta

  // FIX: Desktop sidebar util buttons keep min-height:unset (sidebar context)
  // Mobile drawer buttons use min-height:44px (touch target, set at call site)
  const UtilBtn = ({ icon, label, onClick, badge }) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px', borderRadius: 11,
        border: 'none', background: 'transparent',
        color: 'var(--text-muted)', cursor: 'pointer', width: '100%',
        transition: 'background var(--transition-fast), color var(--transition-fast)',
        WebkitTapHighlightColor: 'transparent',
        position: 'relative',
        justifyContent: open ? 'flex-start' : 'center',
        fontFamily: FONTS.body,
        minHeight: 'unset', // desktop sidebar — compact is fine
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--accent-dim)'
        e.currentTarget.style.color = 'var(--accent)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'var(--text-muted)'
      }}
    >
      <span style={{ display: 'flex', flexShrink: 0, position: 'relative' }}>
        {icon}
        {badge > 0 && !open && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--danger)',
          }} />
        )}
      </span>
      <AnimatePresence>
        {open && (
          <motion.span key="lbl"
            initial={{ opacity: 0, x: -8, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 'auto' }}
            exit={{ opacity: 0, x: -8, width: 0 }}
            transition={{ duration: 0.18 }}
            style={{
              fontSize: 13, fontWeight: 500, fontFamily: FONTS.body,
              color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden',
            }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
      {badge > 0 && open && (
        <motion.span
          initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
          style={{
            marginLeft: 'auto', fontSize: 9, fontWeight: 800,
            padding: '2px 6px', borderRadius: 99,
            background: 'var(--danger-bg)', color: 'var(--danger)',
            fontFamily: FONTS.mono, flexShrink: 0,
          }}
        >
          {badge > 99 ? '99+' : badge}
        </motion.span>
      )}
    </button>
  )

  return (
    <SidebarBody>
      <div style={{
        padding: open ? '18px 14px 16px' : '18px 0 16px',
        borderBottom: '1px solid var(--divider)', flexShrink: 0,
        display: 'flex', alignItems: 'center',
        justifyContent: open ? 'flex-start' : 'center',
        minHeight: 70, transition: 'padding 0.28s ease',
      }}>
        {open
          ? <SidebarLogoFull title={BRAND.name} subtitle={`${role} panel`} grad={grad} Icon={RoleIcon} isDark={isDark} />
          : <SidebarLogoIcon grad={grad} Icon={RoleIcon} />
        }
      </div>

      <div style={{
        flex: 1, padding: '10px 8px',
        display: 'flex', flexDirection: 'column', gap: 2,
        overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none',
      }}>
        {navDef.map(item => (
          <SidebarLink
            key={item.key}
            link={{
              label: item.label, href: '#',
              icon: <item.Icon size={17} strokeWidth={activeKey === item.key ? 2.2 : 1.8} />,
              onClick: () => onNav(item.key),
              badge: (item.key === 'chat' || item.key === 'messages') ? (unreadMsg || 0) : 0,
            }}
            isActive={activeKey === item.key} roleColor={roleColor} isDark={isDark}
          />
        ))}
      </div>

      <div style={{
        height: 1,
        background: 'linear-gradient(90deg,transparent,var(--divider),transparent)',
        margin: '0 12px',
      }} />

      <div style={{ padding: '8px 8px 12px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <UtilBtn
          icon={isDark ? <Sun size={16} color="var(--accent)" /> : <Moon size={16} color="var(--info)" />}
          label={isDark ? 'Light mode' : 'Dark mode'}
          onClick={toggleTheme} badge={0}
        />
        <UtilBtn icon={<Bell size={16} />} label="Notifications" onClick={undefined} badge={unreadNotif} />
        <div style={{
          height: 1,
          background: 'linear-gradient(90deg,transparent,var(--divider),transparent)',
          margin: '4px 4px',
        }} />
        <SidebarUserRow
          name={user?.name} role={role} grad={grad} roleColor={roleColor}
          onLogout={onLogout} isDark={isDark} open={open}
        />
      </div>
    </SidebarBody>
  )
}

const DashboardLayout = ({ children, title, role: roleProp, navItems, activeNav, onNavChange }) => {
  const dispatch    = useDispatch()
  const navigate    = useNavigate()
  const { isDark, toggleTheme } = useContext(ThemeContext)
  const role        = useSelector(selectRole) || roleProp || 'manager'
  const user        = useSelector(selectUser)
  const unreadMsg   = useSelector(selectTotalUnread)  || 0
  const unreadNotif = useSelector(selectUnreadCount)   || 0
  const bp          = useBreakpoint()
  const isMobile    = bp === 'mobile'

  const [sideOpen,   setSideOpen]   = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [section,    setSection]    = useState(activeNav || '')

  const contentRef   = useRef(null)
  const entranceDone = useRef(false)

  const navDef = navItems
    ? navItems.map(n => ({ key: n.key, label: n.label, Icon: n.Icon || n.icon }))
    : (NAV_DEFS[role] || [])
  const meta = ROLE_META[role] || ROLE_META.manager
  const { color: roleColor, grad, Icon: RoleIcon } = meta

  useEffect(() => { if (activeNav !== undefined) setSection(activeNav) }, [activeNav])
  useEffect(() => { if (!section && navDef.length > 0) setSection(navDef[0].key) }, [])

  // FIX: Escape key closes drawer
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setDrawerOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  // FIX: Lock body scroll when drawer is open on mobile
  useEffect(() => {
    if (!isMobile) return
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen, isMobile])

  useEffect(() => {
    if (entranceDone.current) return
    entranceDone.current = true
    if (contentRef.current)
      gsap.fromTo(contentRef.current,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.48, ease: 'power2.out', delay: 0.10 }
      )
  }, [])

  const handleNavChange = useCallback((key) => {
    if (key === section) { setDrawerOpen(false); return }
    const el = contentRef.current
    if (el) {
      gsap.to(el, {
        opacity: 0, y: 10, duration: 0.13, ease: 'power2.in',
        onComplete: () => {
          setSection(key)
          if (onNavChange) onNavChange(key)
          gsap.fromTo(el,
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.32, ease: 'expo.out' }
          )
        },
      })
    } else {
      setSection(key)
      if (onNavChange) onNavChange(key)
    }
    setDrawerOpen(false)
  }, [section, onNavChange])

  // ROUTING: useNavigate — zero page reload
  const handleLogout = () => {
    dispatch(clearAuth())
    localStorage.removeItem('kc_token')
    navigate('/detect', { replace: true })
  }

  return (
    <>
      <style>{`
        .kc-scroll { scrollbar-width: none; }
        .kc-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── Root shell: full viewport, no overflow ── */}
      <div style={{
        display: 'flex', height: '100dvh', overflow: 'hidden',
        background: 'var(--bg)', fontFamily: FONTS.body,
        transition: 'background var(--transition-theme)',
      }}>

        {/* ── Desktop / Tablet sidebar ── */}
        {!isMobile && (
          <Sidebar open={sideOpen} setOpen={setSideOpen} animate>
            <SidebarContent
              navDef={navDef} activeKey={activeNav ?? section} onNav={handleNavChange}
              meta={meta} role={role} user={user} isDark={isDark}
              unreadMsg={unreadMsg} unreadNotif={unreadNotif}
              toggleTheme={toggleTheme} onLogout={handleLogout}
            />
          </Sidebar>
        )}

        {/* ── Mobile drawer ── */}
        {isMobile && (
          <AnimatePresence>
            {drawerOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  key="bd"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    position: 'fixed', inset: 0, zIndex: 80,
                    background: 'var(--overlay-bg)',
                    backdropFilter: 'blur(5px)',
                    // FIX: touch-action:pan-y so scroll inside drawer works on Android
                    touchAction: 'pan-y',
                  }}
                />

                {/* Drawer panel */}
                <motion.aside
                  key="dr"
                  initial={{ x: -268 }} animate={{ x: 0 }} exit={{ x: -268 }}
                  transition={{ duration: 0.30, ease: [0.4, 0, 0.15, 1] }}
                  style={{
                    position: 'fixed', top: 0, left: 0, bottom: 0,
                    zIndex: 90, width: 260,
                    display: 'flex', flexDirection: 'column',
                    background: 'var(--modal-bg)',
                    backdropFilter: 'blur(48px)',
                    borderRight: '1px solid var(--modal-border)',
                    boxShadow: '4px 0 48px rgba(0,0,0,0.45)',
                  }}
                >
                  {/* Noise texture */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")`,
                    pointerEvents: 'none', zIndex: 0,
                    opacity: isDark ? 1 : 0.4,
                  }} />

                  {/* FIX: Close button — 44×44 touch target (was 30×30) */}
                  <button
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Close menu"
                    style={{
                      position: 'absolute', top: 12, right: 10, zIndex: 2,
                      width: 44, height: 44, borderRadius: 12,
                      border: '1px solid var(--modal-border)',
                      background: 'var(--pill-bg)',
                      color: 'var(--text-muted)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      // Override global min-height for this explicit-sized button
                      minHeight: 'unset', minWidth: 'unset',
                    }}
                  >
                    <X size={15} />
                  </button>

                  {/* Drawer header */}
                  <div style={{
                    padding: '18px 16px 15px',
                    borderBottom: '1px solid var(--divider)', flexShrink: 0,
                    minHeight: 70, display: 'flex', alignItems: 'center',
                    position: 'relative', zIndex: 1,
                    paddingTop: 'max(18px, calc(14px + env(safe-area-inset-top)))',
                  }}>
                    <SidebarLogoFull
                      title={BRAND.name} subtitle={`${role} panel`}
                      grad={grad} Icon={RoleIcon} isDark={isDark}
                    />
                  </div>

                  {/* Drawer nav */}
                  <nav
                    className="kc-scroll"
                    style={{
                      flex: 1, padding: '10px',
                      display: 'flex', flexDirection: 'column', gap: 2,
                      overflowY: 'auto', position: 'relative', zIndex: 1,
                    }}
                  >
                    {navDef.map(item => (
                      <SidebarLink
                        key={item.key}
                        link={{
                          label: item.label, href: '#',
                          icon: <item.Icon size={17} strokeWidth={(activeNav ?? section) === item.key ? 2.2 : 1.8} />,
                          onClick: () => handleNavChange(item.key),
                          badge: (item.key === 'chat' || item.key === 'messages') ? (unreadMsg || 0) : 0,
                        }}
                        isActive={(activeNav ?? section) === item.key}
                        roleColor={roleColor} isDark={isDark}
                      />
                    ))}
                  </nav>

                  {/* Drawer footer */}
                  <div style={{
                    borderTop: '1px solid var(--divider)',
                    padding: '8px 10px',
                    flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4,
                    position: 'relative', zIndex: 1,
                    paddingBottom: 'max(12px, calc(8px + env(safe-area-inset-bottom)))',
                  }}>
                    {/* FIX: Mobile drawer util buttons need 44px min-height */}
                    <button
                      onClick={toggleTheme}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '0 12px', borderRadius: 11, minHeight: 44,
                        border: 'none', background: 'transparent',
                        color: 'var(--text-muted)', cursor: 'pointer',
                        width: '100%', fontFamily: FONTS.body,
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'var(--accent-dim)'
                        e.currentTarget.style.color = 'var(--accent)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--text-muted)'
                      }}
                    >
                      {isDark
                        ? <Sun size={16} color="var(--accent)" />
                        : <Moon size={16} color="var(--info)" />
                      }
                      <span style={{
                        fontSize: 13, fontWeight: 500, fontFamily: FONTS.body,
                        color: 'var(--text-primary)',
                      }}>
                        {isDark ? 'Light mode' : 'Dark mode'}
                      </span>
                    </button>

                    <div style={{
                      height: 1,
                      background: 'linear-gradient(90deg,transparent,var(--divider),transparent)',
                      margin: '0 4px',
                    }} />

                    {/* User row */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 12,
                      background: 'var(--pill-bg)', border: '1px solid var(--card-border)',
                      minHeight: 56,
                    }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: grad,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 800, color: 'var(--text-inverse)',
                        boxShadow: `0 0 0 2px ${roleColor}35, 0 2px 8px ${roleColor}30`,
                        position: 'relative',
                      }}>
                        {user?.name?.[0]?.toUpperCase() || '?'}
                        <div style={{
                          position: 'absolute', inset: 0, borderRadius: '50%',
                          background: 'linear-gradient(135deg,rgba(255,255,255,0.25) 0%,transparent 55%)',
                          pointerEvents: 'none',
                        }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 12, fontWeight: 700, color: 'var(--text-primary)',
                          margin: 0, lineHeight: 1.3,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          fontFamily: FONTS.body,
                        }}>
                          {user?.name || 'Staff'}
                        </p>
                        <p style={{
                          fontSize: 9.5, color: roleColor,
                          textTransform: 'capitalize', margin: 0,
                          fontWeight: 600, fontFamily: FONTS.body,
                        }}>
                          {role}
                        </p>
                      </div>
                      <button
                        onClick={handleLogout}
                        aria-label="Log out"
                        style={{
                          width: 36, height: 36, borderRadius: 10,
                          border: '1px solid transparent', background: 'transparent',
                          color: 'var(--text-muted)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          minHeight: 'unset', minWidth: 'unset',
                          flexShrink: 0,
                          WebkitTapHighlightColor: 'transparent',
                          touchAction: 'manipulation',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'var(--danger-bg)'
                          e.currentTarget.style.color = 'var(--danger)'
                          e.currentTarget.style.borderColor = 'var(--danger-border)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = 'var(--text-muted)'
                          e.currentTarget.style.borderColor = 'transparent'
                        }}
                      >
                        <LogOut size={14} />
                      </button>
                    </div>
                  </div>
                </motion.aside>
              </>
            )}
          </AnimatePresence>
        )}

        {/* ── Main column ── */}
        <div style={{
          flex: 1, minWidth: 0,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>

          {/* Mobile top bar */}
          {isMobile && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              paddingLeft: 16, paddingRight: 16,
              paddingTop: 'max(0px, env(safe-area-inset-top))',
              height: 'calc(54px + max(0px, env(safe-area-inset-top)))',
              flexShrink: 0,
              background: 'var(--header-bg)',
              backdropFilter: 'blur(40px) saturate(200%)',
              WebkitBackdropFilter: 'blur(40px) saturate(200%)',
              borderBottom: '1px solid var(--header-border)',
              boxShadow: 'var(--card-shadow)',
              transition: 'background var(--transition-theme)',
            }}>
              {/* Hamburger — 44×44 touch target */}
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
                aria-expanded={drawerOpen}
                style={{
                  width: 44, height: 44, borderRadius: 11,
                  border: '1px solid var(--header-border)',
                  background: 'var(--pill-bg)', color: 'var(--text-primary)',
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, minHeight: 'unset', minWidth: 'unset',
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--accent-dim)'
                  e.currentTarget.style.color = 'var(--accent)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--pill-bg)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }}
              >
                <Menu size={17} />
              </button>

              {/* Role icon badge */}
              <div style={{
                width: 30, height: 30, borderRadius: 10, flexShrink: 0,
                background: grad,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 3px 10px ${roleColor}40, 0 0 0 1px ${roleColor}30`,
                position: 'relative',
              }}>
                <RoleIcon size={14} color="#fff" strokeWidth={2} />
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: 10,
                  background: 'linear-gradient(135deg,rgba(255,255,255,0.2) 0%,transparent 60%)',
                  pointerEvents: 'none',
                }} />
              </div>

              {/* Title */}
              <p style={{
                fontFamily: FONTS.heading, fontSize: 15, fontWeight: 800,
                color: 'var(--text-primary)', margin: 0,
                letterSpacing: '-0.02em', flex: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {title || 'Dashboard'}
              </p>

              {/* Theme toggle — 44×44 */}
              <button
                onClick={toggleTheme}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                style={{
                  width: 44, height: 44, borderRadius: 11,
                  border: '1px solid var(--header-border)',
                  background: 'var(--pill-bg)', color: 'var(--text-muted)',
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, minHeight: 'unset', minWidth: 'unset',
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-dim)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--pill-bg)'}
              >
                {isDark ? <Sun size={15} color="var(--accent)" /> : <Moon size={15} color="var(--info)" />}
              </button>
            </div>
          )}

          {/*
            WHITE GAP FIX (unchanged — correct):
            • <main> = plain block, overflowY:auto, height:100%
            • Inner wrapper = min-height:100% fills full scroll port
            • Background on both — no gap ever exposed
          */}
          <main
            className="kc-scroll"
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              display: 'block',
              height: '100%',
              background: 'var(--bg)',
              paddingBottom: isMobile ? 'max(16px, env(safe-area-inset-bottom))' : 0,
              transition: 'background var(--transition-theme)',
            }}
          >
            <div
              ref={contentRef}
              style={{
                minHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg)',
                transition: 'background var(--transition-theme)',
              }}
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  )
}

export default DashboardLayout