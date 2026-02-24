// src/shared/components/ui/ThemeToggle.jsx
import { useTheme } from '@shared/hooks/useTheme'

/**
 * Animated sun/moon toggle button.
 * Use anywhere: TopHeader, ProfilePage, sidebar, etc.
 *
 * Props:
 *   size?: 'sm' | 'md' (default 'md')
 *   className?: string
 */
export const ThemeToggle = ({ size = 'md', className = '' }) => {
  const { isDark, toggleTheme } = useTheme()

  const dim = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={[
        dim,
        'relative rounded-xl flex items-center justify-center',
        'transition-all duration-300 active:scale-90',
        isDark
          ? 'bg-brew-soft/20 hover:bg-brew-soft/30 text-saffron'
          : 'bg-saffron-soft hover:bg-saffron-muted text-brew',
        className,
      ].join(' ')}
    >
      {/* Sun */}
      <span
        className="absolute inset-0 flex items-center justify-center transition-all duration-300"
        style={{
          opacity:   isDark ? 0 : 1,
          transform: isDark ? 'rotate(-90deg) scale(0.5)' : 'rotate(0deg) scale(1)',
        }}
      >
        <SunIcon />
      </span>

      {/* Moon */}
      <span
        className="absolute inset-0 flex items-center justify-center transition-all duration-300"
        style={{
          opacity:   isDark ? 1 : 0,
          transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0.5)',
        }}
      >
        <MoonIcon />
      </span>
    </button>
  )
}

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="2"  x2="12" y2="4" />
    <line x1="12" y1="20" x2="12" y2="22" />
    <line x1="4.22" y1="4.22"   x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="2"  y1="12" x2="4"  y2="12" />
    <line x1="20" y1="12" x2="22" y2="12" />
    <line x1="4.22" y1="19.78"  x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22" />
  </svg>
)

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
  </svg>
)