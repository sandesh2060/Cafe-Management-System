// src/shared/components/layout/DashboardLayout.jsx
// ═══════════════════════════════════════════════════════════════
//  KAUSĪ CHIYĀ — DashboardLayout
//  Financial-dashboard aesthetic: deep espresso + saffron-orange
//  Aceternity sidebar: hover-expand · glass panel · grain texture
//
//  ✅ DESKTOP/TABLET — hover-to-expand animated sidebar, no header
//  ✅ MOBILE — slim 52px top bar + slide-in drawer + bottom tab bar
// ═══════════════════════════════════════════════════════════════

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
import {
  Sidebar, SidebarBody, SidebarLink,
  SidebarLogoFull, SidebarLogoIcon,
  SidebarUserRow, useSidebar,
} from '@shared/components/ui/sidebar'

// ─── Nav definitions ──────────────────────────────────────────────────────────
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

const ROLE_META = {
  manager: { Icon: LayoutDashboard, color: '#FF9F1C', grad: 'linear-gradient(135deg,#FF9F1C 0%,#E05C2A 100%)' },
  waiter:  { Icon: ClipboardList,   color: '#FF9F1C', grad: 'linear-gradient(135deg,#FF9F1C 0%,#E05C2A 100%)' },
  kitchen: { Icon: ChefHat,         color: '#E05C2A', grad: 'linear-gradient(135deg,#E05C2A 0%,#F97316 100%)' },
  cashier: { Icon: CreditCard,      color: '#2D9B5A', grad: 'linear-gradient(135deg,#2D9B5A 0%,#38C26F 100%)' },
  admin:   { Icon: ShieldCheck,     color: '#374151', grad: 'linear-gradient(135deg,#374151 0%,#6B7280 100%)' },
}

// ─── Breakpoint ───────────────────────────────────────────────────────────────
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

// ─── Design tokens ────────────────────────────────────────────────────────────
const token = {
  // Dark
  dBg:      '#0A0602',
  dSurface: '#120804',
  dSurface2:'#1C0F06',
  dBorder:  'rgba(255,140,20,0.10)',
  dBorderHv:'rgba(255,140,20,0.20)',
  dText:    '#FFF3E0',
  dMuted:   'rgba(255,200,130,0.42)',
  dSrf:     'rgba(255,255,255,0.04)',
  dBar:     'rgba(10,6,2,0.90)',
  dShadow:  '0 -4px 24px rgba(0,0,0,0.45)',
  // Light
  lBg:      '#F5EFE6',
  lSurface: '#FFFDF8',
  lSurface2:'#FFF8EE',
  lBorder:  'rgba(180,110,30,0.11)',
  lBorderHv:'rgba(180,110,30,0.22)',
  lText:    '#1A0D04',
  lMuted:   'rgba(80,40,10,0.42)',
  lSrf:     'rgba(255,255,255,0.72)',
  lBar:     'rgba(255,253,248,0.92)',
  lShadow:  '0 -4px 20px rgba(100,50,10,0.07)',
  // Brand
  saffron:  '#FF9F1C',
  terra:    '#E05C2A',
  grad:     'linear-gradient(135deg,#FF9F1C,#E05C2A)',
}
const s = (isDark, d, l) => isDark ? d : l

// ─── Mobile bottom tab item ───────────────────────────────────────────────────
const BottomTabItem = ({ item, isActive, onClick, roleColor, unread, isDark }) => {
  const { Icon } = item
  const muted  = s(isDark, token.dMuted, token.lMuted)

  return (
    <button
      onClick={() => onClick(item.key)}
      style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 3, padding: '9px 4px 7px',
        border: 'none', background: 'transparent',
        cursor: 'pointer', position: 'relative',
        color: isActive ? roleColor : muted,
        transition: 'color 0.18s',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Top pill indicator */}
      <AnimatePresence>
        {isActive && (
          <motion.span
            key="tabpill"
            layoutId={`tab-pill-${item.key}`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 0 }}
            transition={{ duration: 0.26, ease: [0.4, 0, 0.15, 1] }}
            style={{
              position: 'absolute',
              top: 0,
              left: '50%', transform: 'translateX(-50%)',
              width: 28, height: 3,
              borderRadius: '0 0 4px 4px',
              background: `linear-gradient(90deg, ${token.saffron}, ${token.terra})`,
              boxShadow: `0 2px 8px ${token.saffron}50`,
              transformOrigin: 'center',
            }}
          />
        )}
      </AnimatePresence>

      {/* Active bloom */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.30 }}
            style={{
              position: 'absolute',
              top: '8%', left: '50%', transform: 'translateX(-50%)',
              width: 44, height: 44, borderRadius: '50%',
              background: `radial-gradient(circle, ${token.saffron}12 0%, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* Icon */}
      <div style={{ position: 'relative' }}>
        <motion.div
          animate={{ scale: isActive ? 1.10 : 1 }}
          transition={{ duration: 0.18, ease: 'backOut' }}
          style={{ display: 'flex' }}
        >
          <Icon
            size={20}
            strokeWidth={isActive ? 2.3 : 1.7}
            color={isActive ? roleColor : muted}
          />
        </motion.div>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -4,
            width: 7, height: 7, borderRadius: '50%',
            background: '#EF4444',
            boxShadow: '0 0 0 2px rgba(239,68,68,0.25)',
          }} />
        )}
      </div>

      {/* Label */}
      <span style={{
        fontSize: 9,
        fontWeight: isActive ? 700 : 500,
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: '0.01em',
        lineHeight: 1,
        color: isActive ? roleColor : muted,
        transition: 'color 0.18s',
      }}>
        {item.label}
      </span>
    </button>
  )
}

// ─── Sidebar content (reads open state from context) ──────────────────────────
const SidebarContent = ({
  navDef, activeKey, onNav, meta, role, user,
  isDark, unreadMsg, unreadNotif, toggleTheme, onLogout,
}) => {
  const { open } = useSidebar()
  const { Icon: RoleIcon, color: roleColor, grad } = meta

  const bdr   = s(isDark, token.dBorder, token.lBorder)
  const srf   = s(isDark, token.dSrf, token.lSrf)
  const mut   = s(isDark, token.dMuted, token.lMuted)
  const txt   = s(isDark, token.dText, token.lText)

  // Utility button (theme, notifications)
  const UtilBtn = ({ icon, label, onClick, badge }) => {
    const ref = useRef(null)
    return (
      <button
        ref={ref}
        onClick={onClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 12px', borderRadius: 11,
          border: 'none', background: 'transparent',
          color: mut, cursor: 'pointer', width: '100%',
          transition: 'background 0.15s, color 0.15s',
          WebkitTapHighlightColor: 'transparent',
          position: 'relative',
          justifyContent: open ? 'flex-start' : 'center',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = s(isDark, 'rgba(255,140,20,0.08)', 'rgba(255,140,20,0.06)')
          e.currentTarget.style.color = token.saffron
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = mut
        }}
      >
        <span style={{ display: 'flex', flexShrink: 0, position: 'relative' }}>
          {icon}
          {badge > 0 && !open && (
            <span style={{
              position: 'absolute', top: -3, right: -3,
              width: 7, height: 7, borderRadius: '50%',
              background: '#EF4444',
            }} />
          )}
        </span>
        <AnimatePresence>
          {open && (
            <motion.span
              key="lbl"
              initial={{ opacity: 0, x: -8, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 'auto' }}
              exit={{ opacity: 0, x: -8, width: 0 }}
              transition={{ duration: 0.18 }}
              style={{
                fontSize: 13, fontWeight: 500,
                fontFamily: "'DM Sans', sans-serif",
                color: txt, whiteSpace: 'nowrap', overflow: 'hidden',
              }}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
        {badge > 0 && open && (
          <motion.span
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              marginLeft: 'auto',
              fontSize: 9, fontWeight: 800,
              padding: '2px 6px', borderRadius: 99,
              background: 'rgba(239,68,68,0.13)', color: '#EF4444',
              fontFamily: "'DM Mono', monospace", flexShrink: 0,
            }}
          >
            {badge > 99 ? '99+' : badge}
          </motion.span>
        )}
      </button>
    )
  }

  return (
    <SidebarBody
      style={{
        // __isDark flag is read by SidebarBody internally
        __isDark: isDark,
      }}
    >
      {/* ── Brand ── */}
      <div style={{
        padding: open ? '18px 14px 16px' : '18px 0 16px',
        borderBottom: `1px solid ${bdr}`,
        flexShrink: 0,
        display: 'flex', alignItems: 'center',
        justifyContent: open ? 'flex-start' : 'center',
        minHeight: 70,
        transition: 'padding 0.28s ease',
      }}>
        {open
          ? <SidebarLogoFull title="कौसी चिया" subtitle={`${role} panel`} grad={grad} Icon={RoleIcon} isDark={isDark} />
          : <SidebarLogoIcon grad={grad} Icon={RoleIcon} />
        }
      </div>

      {/* ── Nav links ── */}
      <div style={{
        flex: 1,
        padding: '10px 8px',
        display: 'flex', flexDirection: 'column', gap: 2,
        overflowY: 'auto', overflowX: 'hidden',
        scrollbarWidth: 'none',
      }}>
        {navDef.map(item => (
          <SidebarLink
            key={item.key}
            link={{
              label: item.label,
              href: '#',
              icon: <item.Icon size={17} strokeWidth={activeKey === item.key ? 2.2 : 1.8} />,
              onClick: () => onNav(item.key),
              badge: (item.key === 'chat' || item.key === 'messages') ? (unreadMsg || 0) : 0,
            }}
            isActive={activeKey === item.key}
            roleColor={roleColor}
            isDark={isDark}
          />
        ))}
      </div>

      {/* ── Section divider ── */}
      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${bdr}, transparent)`, margin: '0 12px' }} />

      {/* ── Bottom controls ── */}
      <div style={{ padding: '8px 8px 12px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <UtilBtn
          icon={isDark
            ? <Sun size={16} color={token.saffron} />
            : <Moon size={16} color='#6366F1' />
          }
          label={isDark ? 'Light mode' : 'Dark mode'}
          onClick={toggleTheme}
          badge={0}
        />
        <UtilBtn
          icon={<Bell size={16} />}
          label="Notifications"
          onClick={undefined}
          badge={unreadNotif}
        />

        {/* Gradient divider */}
        <div style={{
          height: 1,
          background: `linear-gradient(90deg, transparent, ${bdr}, transparent)`,
          margin: '4px 4px',
        }} />

        {/* User row */}
        <SidebarUserRow
          name={user?.name}
          role={role}
          grad={grad}
          roleColor={roleColor}
          onLogout={onLogout}
          isDark={isDark}
          open={open}
        />
      </div>
    </SidebarBody>
  )
}

// ─── DashboardLayout ──────────────────────────────────────────────────────────
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

  const handleLogout = () => {
    dispatch(clearAuth())
    localStorage.removeItem('kc_token')
    navigate('/detect', { replace: true })
  }

  // Theme-resolved values
  const pageBg    = s(isDark, token.dBg, token.lBg)
  const bdr       = s(isDark, token.dBorder, token.lBorder)
  const srf       = s(isDark, token.dSrf, token.lSrf)
  const mut       = s(isDark, token.dMuted, token.lMuted)
  const txt       = s(isDark, token.dText, token.lText)
  const barBg     = s(isDark, token.dBar, token.lBar)
  const botShadow = s(isDark, token.dShadow, token.lShadow)

  // Drawer panel style
  const drawerBg  = s(isDark,
    `linear-gradient(180deg, #120804 0%, #0A0602 100%)`,
    `linear-gradient(180deg, #FFFDF8 0%, #F5EFE6 100%)`,
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
        .kc-scroll { scrollbar-width: none; }
        .kc-scroll::-webkit-scrollbar { display: none; }
        /* Desktop sidebar visible; mobile hidden */
        .kc-sidebar-desktop { display: flex !important; }
        @media (max-width: 767px) { .kc-sidebar-desktop { display: none !important; } }
      `}</style>

      <div style={{
        display: 'flex',
        height: '100dvh',
        overflow: 'hidden',
        backgroundColor: pageBg,
        fontFamily: "'DM Sans', 'Noto Sans Devanagari', system-ui, sans-serif",
        transition: 'background-color 0.3s',
      }}>

        {/* ══════════════════════════════════════════════════
            DESKTOP / TABLET — Aceternity hover sidebar
        ══════════════════════════════════════════════════ */}
        {!isMobile && (
          <Sidebar open={sideOpen} setOpen={setSideOpen} animate>
            <SidebarContent
              navDef={navDef}
              activeKey={activeNav ?? section}
              onNav={handleNavChange}
              meta={meta} role={role} user={user} isDark={isDark}
              unreadMsg={unreadMsg} unreadNotif={unreadNotif}
              toggleTheme={toggleTheme} onLogout={handleLogout}
            />
          </Sidebar>
        )}

        {/* ══════════════════════════════════════════════════
            MOBILE — off-canvas drawer
        ══════════════════════════════════════════════════ */}
        {isMobile && (
          <AnimatePresence>
            {drawerOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  key="bd"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    position: 'fixed', inset: 0, zIndex: 80,
                    background: 'rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(5px)',
                  }}
                />

                {/* Drawer panel */}
                <motion.aside
                  key="dr"
                  initial={{ x: -268 }}
                  animate={{ x: 0 }}
                  exit={{ x: -268 }}
                  transition={{ duration: 0.30, ease: [0.4, 0, 0.15, 1] }}
                  style={{
                    position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 90,
                    width: 260,
                    display: 'flex', flexDirection: 'column',
                    background: drawerBg,
                    backdropFilter: 'blur(48px)',
                    borderRight: `1px solid ${bdr}`,
                    boxShadow: '4px 0 48px rgba(0,0,0,0.45)',
                  }}
                >
                  {/* Grain texture */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")`,
                    pointerEvents: 'none', zIndex: 0,
                    opacity: isDark ? 1 : 0.4,
                  }} />

                  {/* Close button */}
                  <button
                    onClick={() => setDrawerOpen(false)}
                    style={{
                      position: 'absolute', top: 14, right: 12, zIndex: 2,
                      width: 30, height: 30, borderRadius: 9,
                      border: `1px solid ${bdr}`,
                      background: srf, color: mut,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <X size={13} />
                  </button>

                  {/* Brand */}
                  <div style={{
                    padding: '18px 16px 15px',
                    borderBottom: `1px solid ${bdr}`,
                    flexShrink: 0, minHeight: 70,
                    display: 'flex', alignItems: 'center',
                    position: 'relative', zIndex: 1,
                  }}>
                    <SidebarLogoFull
                      title="कौसी चिया"
                      subtitle={`${role} panel`}
                      grad={grad}
                      Icon={RoleIcon}
                      isDark={isDark}
                    />
                  </div>

                  {/* Nav */}
                  <nav className="kc-scroll" style={{
                    flex: 1,
                    padding: '10px 10px',
                    display: 'flex', flexDirection: 'column', gap: 2,
                    overflowY: 'auto',
                    position: 'relative', zIndex: 1,
                  }}>
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
                        roleColor={roleColor}
                        isDark={isDark}
                      />
                    ))}
                  </nav>

                  {/* Bottom — theme + user */}
                  <div style={{
                    borderTop: `1px solid ${bdr}`,
                    padding: '8px 10px 12px',
                    flexShrink: 0,
                    display: 'flex', flexDirection: 'column', gap: 2,
                    position: 'relative', zIndex: 1,
                  }}>
                    {/* Theme toggle */}
                    <button
                      onClick={toggleTheme}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 12px', borderRadius: 11,
                        border: 'none', background: 'transparent',
                        color: mut, cursor: 'pointer', width: '100%',
                        transition: 'background 0.15s, color 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = s(isDark, 'rgba(255,140,20,0.08)', 'rgba(255,140,20,0.06)')
                        e.currentTarget.style.color = token.saffron
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = mut
                      }}
                    >
                      {isDark
                        ? <Sun size={16} color={token.saffron} />
                        : <Moon size={16} color="#6366F1" />
                      }
                      <span style={{
                        fontSize: 13, fontWeight: 500,
                        fontFamily: "'DM Sans', sans-serif",
                        color: txt,
                      }}>
                        {isDark ? 'Light mode' : 'Dark mode'}
                      </span>
                    </button>

                    {/* Gradient divider */}
                    <div style={{
                      height: 1,
                      background: `linear-gradient(90deg, transparent, ${bdr}, transparent)`,
                      margin: '4px 4px',
                    }} />

                    {/* User row */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 12,
                      background: srf,
                      border: `1px solid ${bdr}`,
                      backdropFilter: 'blur(8px)',
                    }}>
                      {/* Avatar */}
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: grad,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 800, color: '#fff',
                        boxShadow: `0 0 0 2px ${roleColor}35, 0 2px 8px ${roleColor}30`,
                        position: 'relative',
                      }}>
                        {user?.name?.[0]?.toUpperCase() || '?'}
                        <div style={{
                          position: 'absolute', inset: 0, borderRadius: '50%',
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 55%)',
                          pointerEvents: 'none',
                        }} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 12, fontWeight: 700, color: txt,
                          margin: 0, lineHeight: 1.3,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          fontFamily: "'DM Sans', sans-serif",
                        }}>
                          {user?.name || 'Staff'}
                        </p>
                        <p style={{
                          fontSize: 9.5, color: roleColor,
                          textTransform: 'capitalize', margin: 0,
                          fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                        }}>
                          {role}
                        </p>
                      </div>

                      {/* Logout */}
                      <button
                        onClick={handleLogout}
                        style={{
                          width: 28, height: 28, borderRadius: 9,
                          border: '1px solid transparent',
                          background: 'transparent',
                          color: mut, cursor: 'pointer',
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
                          e.currentTarget.style.color = mut
                          e.currentTarget.style.borderColor = 'transparent'
                        }}
                      >
                        <LogOut size={13} />
                      </button>
                    </div>
                  </div>
                </motion.aside>
              </>
            )}
          </AnimatePresence>
        )}

        {/* ══════════════════════════════════════════════════
            MAIN CONTENT AREA
        ══════════════════════════════════════════════════ */}
        <div style={{
          flex: 1, minWidth: 0,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>

          {/* Mobile-only slim top bar */}
          {isMobile && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '0 16px', height: 54, flexShrink: 0,
              background: barBg,
              backdropFilter: 'blur(40px) saturate(200%)',
              WebkitBackdropFilter: 'blur(40px) saturate(200%)',
              borderBottom: `1px solid ${bdr}`,
              boxShadow: s(isDark,
                '0 1px 0 rgba(255,140,20,0.06), 0 4px 20px rgba(0,0,0,0.35)',
                '0 1px 0 rgba(180,110,30,0.08), 0 4px 16px rgba(100,50,10,0.06)',
              ),
            }}>
              {/* Hamburger */}
              <button
                onClick={() => setDrawerOpen(true)}
                style={{
                  width: 38, height: 38, borderRadius: 11,
                  border: `1px solid ${bdr}`,
                  background: srf,
                  color: txt,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  backdropFilter: 'blur(8px)',
                  transition: 'background 0.18s, color 0.18s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = s(isDark, 'rgba(255,140,20,0.10)', 'rgba(255,140,20,0.08)')
                  e.currentTarget.style.color = token.saffron
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = srf
                  e.currentTarget.style.color = txt
                }}
              >
                <Menu size={16} />
              </button>

              {/* Brand logo pill */}
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
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%)',
                  pointerEvents: 'none',
                }} />
              </div>

              {/* Title */}
              <p style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 15, fontWeight: 800,
                color: txt, margin: 0,
                letterSpacing: '-0.02em',
                flex: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {title || 'Dashboard'}
              </p>

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                style={{
                  width: 38, height: 38, borderRadius: 11,
                  border: `1px solid ${bdr}`,
                  background: srf,
                  color: mut,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  backdropFilter: 'blur(8px)',
                  transition: 'background 0.18s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = s(isDark, 'rgba(255,140,20,0.10)', 'rgba(255,140,20,0.08)')}
                onMouseLeave={e => e.currentTarget.style.background = srf}
              >
                {isDark
                  ? <Sun size={15} color={token.saffron} />
                  : <Moon size={15} color="#6366F1" />
                }
              </button>
            </div>
          )}

          {/* Scrollable page content */}
          <main
            ref={contentRef}
            className="kc-scroll"
            style={{
              flex: 1,
              overflowY: 'auto', overflowX: 'hidden',
              backgroundColor: pageBg,
              paddingBottom: isMobile
                ? 'calc(62px + max(0px, env(safe-area-inset-bottom)))'
                : 0,
              transition: 'background-color 0.3s',
            }}
          >
            {children}
          </main>

          {/* Mobile bottom tab bar */}
          {isMobile && (
            <nav style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0, zIndex: 40,
              display: 'flex',
              borderTop: `1px solid ${bdr}`,
              background: barBg,
              backdropFilter: 'blur(40px) saturate(200%)',
              WebkitBackdropFilter: 'blur(40px) saturate(200%)',
              boxShadow: botShadow,
              paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
            }}>
              {navDef.slice(0, 5).map(item => (
                <BottomTabItem
                  key={item.key}
                  item={item}
                  isActive={(activeNav ?? section) === item.key}
                  onClick={handleNavChange}
                  roleColor={roleColor}
                  unread={(item.key === 'chat' || item.key === 'messages') ? unreadMsg : 0}
                  isDark={isDark}
                />
              ))}
            </nav>
          )}
        </div>
      </div>
    </>
  )
}

export default DashboardLayout