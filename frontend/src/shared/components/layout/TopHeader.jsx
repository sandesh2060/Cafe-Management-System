// src/shared/components/layout/TopHeader.jsx
import { Bell, ChevronLeft, Menu } from 'lucide-react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from '@shared/components/ui/ThemeToggle'

/**
 * Shared top header for ALL roles.
 * Admin: no notification bell (silent panel per spec)
 *
 * Props:
 *   title?       : string
 *   showBack?    : boolean
 *   showMenu?    : boolean  — for Manager/Admin hamburger on mobile
 *   onMenuClick? : () => void
 *   right?       : ReactNode — optional extra slot
 */
const TopHeader = ({
  title,
  showBack = false,
  showMenu = false,
  onMenuClick,
  right,
}) => {
  const navigate  = useNavigate()
  const user      = useSelector(s => s.auth?.user)
  const role      = user?.role || 'customer'
  const unread    = useSelector(s => s.notifications?.unreadCount || 0)
  const isAdmin   = role === 'admin'

  return (
    <header
      className={[
        'sticky top-0 z-40 w-full flex items-center justify-between px-4 gap-3',
        'border-b transition-colors duration-300',
        // light
        'bg-white border-cream-border',
        // dark
        'dark:bg-[#1A1208] dark:border-[rgba(255,159,28,0.12)]',
      ].join(' ')}
      style={{ height: 'var(--top-header-height)' }}
    >
      {/* ── LEFT ── */}
      <div className="flex items-center gap-2 min-w-0">
        {showMenu && (
          <button
            onClick={onMenuClick}
            aria-label="Open menu"
            className="w-10 h-10 flex items-center justify-center rounded-xl
                       text-brew dark:text-cream hover:bg-cream-dark dark:hover:bg-brew/30
                       transition-colors"
          >
            <Menu size={20} />
          </button>
        )}

        {showBack && (
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="w-10 h-10 flex items-center justify-center rounded-xl
                       text-brew dark:text-cream hover:bg-cream-dark dark:hover:bg-brew/30
                       transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {title && (
          <h1 className="font-display font-bold text-lg leading-tight truncate
                         text-brew dark:text-cream">
            {title}
          </h1>
        )}
      </div>

      {/* ── RIGHT ── */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Custom right slot */}
        {right}

        {/* Dark mode toggle — ALL roles including admin */}
        <ThemeToggle size="md" />

        {/* Notification bell — everyone EXCEPT admin */}
        {!isAdmin && (
          <button
            aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
            className="relative w-10 h-10 flex items-center justify-center rounded-xl
                       text-brew dark:text-cream
                       hover:bg-cream-dark dark:hover:bg-brew/30
                       transition-colors"
          >
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1
                               bg-terra text-white text-[10px] font-bold
                               rounded-full flex items-center justify-center leading-none">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  )
}

export default TopHeader