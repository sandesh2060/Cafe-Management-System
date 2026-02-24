// src/shared/components/layout/BottomNav.jsx
import { NavLink, useLocation } from 'react-router-dom'
import { UtensilsCrossed, ShoppingCart, MapPin, Bell, User } from 'lucide-react'
import { useSelector } from 'react-redux'
import { selectCartCount } from '@store/slices/cartSlice'
import { selectCallStatus } from '@store/slices/callWaiterSlice'
import { COLORS } from '@colors'

const navItems = [
  { to: '/menu',        icon: UtensilsCrossed, label: 'Menu'        },
  { to: '/cart',        icon: ShoppingCart,    label: 'Cart'        },
  { to: '/track',       icon: MapPin,          label: 'Track'       },
  { to: '/call-waiter', icon: Bell,            label: 'Waiter'      },
  { to: '/profile',     icon: User,            label: 'Profile'     },
]

const BottomNav = () => {
  const location    = useLocation()
  const cartCount   = useSelector(selectCartCount)
  const callStatus  = useSelector(selectCallStatus)

  const isCallActive = ['pending', 'acknowledged', 'on_the_way'].includes(callStatus)

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-cream-border
                 flex items-stretch"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
      }}
      aria-label="Main navigation"
    >
      {navItems.map(({ to, icon: Icon, label }) => {
        const isActive  = location.pathname === to
        const isCart    = to === '/cart'
        const isWaiter  = to === '/call-waiter'

        return (
          <NavLink
            key={to}
            to={to}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 pt-2
                       transition-colors duration-150 relative min-h-[44px]"
            aria-label={label}
          >
            {/* Active indicator */}
            {isActive && (
              <span className="absolute top-0 inset-x-3 h-0.5 bg-saffron rounded-b-full" />
            )}

            <span className="relative">
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                color={isActive ? COLORS.saffron.DEFAULT : COLORS.brew.soft}
              />

              {/* Cart badge */}
              {isCart && cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1
                                 rounded-full bg-terra text-white text-[10px] font-bold
                                 flex items-center justify-center leading-none">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}

              {/* Waiter call pulse */}
              {isWaiter && isCallActive && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full
                                 bg-saffron animate-pulse-brand" />
              )}
            </span>

            <span
              className="text-[10px] font-medium leading-tight"
              style={{ color: isActive ? COLORS.saffron.DEFAULT : COLORS.brew.soft }}
            >
              {label}
            </span>
          </NavLink>
        )
      })}
    </nav>
  )
}

export default BottomNav