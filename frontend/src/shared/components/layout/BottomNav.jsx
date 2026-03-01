// src/shared/components/layout/BottomNav.jsx
// ═══════════════════════════════════════════════════════════════
//  KAUSĪ CHIYĀ — Bottom Navigation
//  Financial-dashboard aesthetic: espresso dark + saffron-orange
//  Glassmorphism panel · orange pill indicator · smooth transitions
// ═══════════════════════════════════════════════════════════════

import { NavLink, useLocation } from 'react-router-dom'
import { UtensilsCrossed, ShoppingCart, MapPin, Bell, User } from 'lucide-react'
import { useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'motion/react'
import { useContext } from 'react'
import { ThemeContext } from '@shared/context/ThemeContext'
import { selectCartCount } from '@store/slices/cartSlice'
import { selectCallStatus } from '@store/slices/callWaiterSlice'

const navItems = [
  { to: '/menu',        icon: UtensilsCrossed, label: 'Menu'    },
  { to: '/cart',        icon: ShoppingCart,    label: 'Cart'    },
  { to: '/track',       icon: MapPin,          label: 'Track'   },
  { to: '/call-waiter', icon: Bell,            label: 'Waiter'  },
  { to: '/profile',     icon: User,            label: 'Profile' },
]

const SAFFRON = '#FF9F1C'
const TERRA   = '#E05C2A'

const BottomNav = () => {
  const location   = useLocation()
  const { isDark } = useContext(ThemeContext)
  const cartCount  = useSelector(selectCartCount)
  const callStatus = useSelector(selectCallStatus)
  const isCallActive = ['pending', 'acknowledged', 'on_the_way'].includes(callStatus)

  // Theme-resolved values
  const panelBg = isDark
    ? 'rgba(10, 6, 2, 0.92)'
    : 'rgba(255, 253, 248, 0.94)'
  const borderClr = isDark
    ? 'rgba(255, 140, 20, 0.12)'
    : 'rgba(180, 110, 30, 0.12)'
  const shadow = isDark
    ? '0 -1px 0 rgba(255,140,20,0.08), 0 -8px 32px rgba(0,0,0,0.55)'
    : '0 -1px 0 rgba(180,110,30,0.10), 0 -8px 24px rgba(100,50,10,0.08)'
  const mutedClr = isDark
    ? 'rgba(255, 200, 130, 0.38)'
    : 'rgba(80, 40, 10, 0.38)'

  return (
    <nav
      aria-label="Main navigation"
      style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'stretch',
        background: panelBg,
        backdropFilter: 'blur(40px) saturate(200%)',
        WebkitBackdropFilter: 'blur(40px) saturate(200%)',
        borderTop: `1px solid ${borderClr}`,
        boxShadow: shadow,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: 'calc(62px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {navItems.map(({ to, icon: Icon, label }) => {
        const isActive  = location.pathname === to
        const isCart    = to === '/cart'
        const isWaiter  = to === '/call-waiter'

        return (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              paddingTop: 10,
              position: 'relative',
              textDecoration: 'none',
              WebkitTapHighlightColor: 'transparent',
              minHeight: 44,
            }}
          >
            {/* Top active pill */}
            <AnimatePresence>
              {isActive && (
                <motion.span
                  key="pill"
                  layoutId="bottom-nav-pill"
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  exit={{ scaleX: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.4, 0, 0.15, 1] }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 32,
                    height: 3,
                    borderRadius: '0 0 4px 4px',
                    background: `linear-gradient(90deg, ${SAFFRON}, ${TERRA})`,
                    boxShadow: `0 2px 8px ${SAFFRON}50`,
                    transformOrigin: 'center',
                  }}
                />
              )}
            </AnimatePresence>

            {/* Active background bloom */}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.32 }}
                  style={{
                    position: 'absolute',
                    top: '10%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${SAFFRON}14 0%, transparent 70%)`,
                    pointerEvents: 'none',
                  }}
                />
              )}
            </AnimatePresence>

            {/* Icon + badges */}
            <span style={{ position: 'relative', display: 'flex' }}>
              <motion.span
                animate={{
                  color: isActive ? SAFFRON : mutedClr,
                  scale: isActive ? 1.08 : 1,
                }}
                transition={{ duration: 0.20 }}
                style={{ display: 'flex' }}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.3 : 1.7}
                  color={isActive ? SAFFRON : mutedClr}
                />
              </motion.span>

              {/* Cart count badge */}
              {isCart && cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  style={{
                    position: 'absolute',
                    top: -5, right: -6,
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
                  }}
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </motion.span>
              )}

              {/* Waiter call pulse dot */}
              {isWaiter && isCallActive && (
                <motion.span
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    position: 'absolute',
                    top: -3, right: -4,
                    width: 10, height: 10,
                    borderRadius: '50%',
                    background: SAFFRON,
                    boxShadow: `0 0 0 3px ${SAFFRON}25`,
                  }}
                />
              )}
            </span>

            {/* Label */}
            <motion.span
              animate={{ color: isActive ? SAFFRON : mutedClr }}
              transition={{ duration: 0.18 }}
              style={{
                fontSize: 10,
                fontWeight: isActive ? 700 : 500,
                lineHeight: 1,
                letterSpacing: isActive ? '-0.01em' : '0.01em',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {label}
            </motion.span>
          </NavLink>
        )
      })}
    </nav>
  )
}

export default BottomNav