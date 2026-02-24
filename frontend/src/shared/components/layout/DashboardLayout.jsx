// src/shared/components/layout/DashboardLayout.jsx
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectRole, selectUser } from '@store/slices/authSlice'
import { selectTotalUnread } from '@store/slices/messagingSlice'
import { selectUnreadCount  } from '@store/slices/notificationSlice'
import { COLORS } from '@colors'
import {
  LayoutDashboard, Users, Table2, BarChart3,
  Package, Settings, ChevronLeft, ChevronRight,
  Bell, MessageSquare, LogOut, Coffee,
} from 'lucide-react'

const MANAGER_NAV = [
  { to: '/manager',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/manager/staff',    icon: Users,           label: 'Staff'     },
  { to: '/manager/tables',   icon: Table2,          label: 'Tables'    },
  { to: '/manager/reports',  icon: BarChart3,       label: 'Reports'   },
  { to: '/manager/inventory',icon: Package,         label: 'Inventory' },
  { to: '/manager/loyalty',  icon: Settings,        label: 'Loyalty'   },
]

const ADMIN_NAV = [
  { to: '/admin',              icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/admin/cafes',        icon: Coffee,          label: 'Cafes'        },
  { to: '/admin/subscriptions',icon: BarChart3,       label: 'Subscriptions'},
]

const DashboardLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const role         = useSelector(selectRole)
  const user         = useSelector(selectUser)
  const unreadMsg    = useSelector(selectTotalUnread)
  const unreadNotif  = useSelector(selectUnreadCount)
  const location     = useLocation()

  const isAdmin = role === 'admin'
  const navItems = isAdmin ? ADMIN_NAV : MANAGER_NAV
  const roleColor = COLORS.roles[role]?.DEFAULT || COLORS.saffron.DEFAULT

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0"
        style={{ width: collapsed ? '48px' : '220px' }}
      >
        {/* Logo area */}
        <div className="flex items-center gap-3 px-3 py-4 border-b border-gray-200 min-h-[56px]">
          <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center flex-shrink-0">
            <Coffee size={16} className="text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold text-brew text-sm leading-tight">
              कौसी चिया
            </span>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 space-y-0.5 overflow-hidden">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to ||
              (to !== '/manager' && to !== '/admin' && location.pathname.startsWith(to))

            return (
              <NavLink
                key={to}
                to={to}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 mx-1.5 rounded-xl
                            transition-all duration-150 group min-h-[44px]
                            ${isActive
                              ? 'text-white shadow-sm'
                              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
                style={isActive ? { backgroundColor: roleColor } : undefined}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium truncate">{label}</span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Bottom: messages + notifications (manager only) + user */}
        <div className="border-t border-gray-200 py-2 space-y-0.5">
          {!isAdmin && (
            <>
              <button
                className="flex items-center gap-3 px-3 py-2.5 mx-1.5 rounded-xl
                           text-gray-500 hover:bg-gray-100 hover:text-gray-900
                           transition-all w-full min-h-[44px] relative"
              >
                <MessageSquare size={18} className="flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">Messages</span>}
                {unreadMsg > 0 && (
                  <span className="absolute top-1.5 left-6 w-2 h-2 rounded-full bg-saffron" />
                )}
              </button>
              <button
                className="flex items-center gap-3 px-3 py-2.5 mx-1.5 rounded-xl
                           text-gray-500 hover:bg-gray-100 hover:text-gray-900
                           transition-all w-full min-h-[44px] relative"
              >
                <Bell size={18} className="flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">Notifications</span>}
                {unreadNotif > 0 && (
                  <span className="absolute top-1.5 left-6 min-w-[16px] h-4 px-1
                                   rounded-full bg-terra text-white text-[10px] font-bold
                                   flex items-center justify-center">
                    {unreadNotif}
                  </span>
                )}
              </button>
            </>
          )}

          {/* User info */}
          {!collapsed && (
            <div className="px-3 py-2 flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center
                           text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: roleColor }}
              >
                {user?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{user?.name}</p>
                <p className="text-[10px] text-gray-400 capitalize">{role}</p>
              </div>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-center h-8 border-t border-gray-100
                     text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto flex flex-col">
        {children}
      </main>
    </div>
  )
}

export default DashboardLayout