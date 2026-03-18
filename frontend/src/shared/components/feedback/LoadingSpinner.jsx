// src/shared/components/feedback/LoadingSpinner.jsx
//
// ✅ COLORS import removed — var(--accent) replaces COLORS.saffron.DEFAULT
// ✅ border-cream-deep → var(--card-border) via inline style
// ✅ bg-cream fullscreen → var(--bg)
// ✅ text-brew-soft → var(--text-muted)
 
const LoadingSpinner = ({ fullScreen = false, size = 40, label = 'Loading...' }) => {
  const spinner = (
    <div
      className="flex flex-col items-center gap-3"
      role="status"
      aria-label={label}
    >
      <div
        className="rounded-full animate-spin"
        style={{
          width:             size,
          height:            size,
          // ✅ var(--card-border) — was border-cream-deep Tailwind class
          border:            '4px solid var(--card-border)',
          // ✅ var(--accent) — was COLORS.saffron.DEFAULT hardcoded hex
          borderTopColor:    'var(--accent)',
          animationDuration: '0.7s',
        }}
      />
      <span
        style={{
          // ✅ var(--text-muted) — was text-brew-soft Tailwind class
          color:      'var(--text-muted)',
          fontSize:   14,
          fontWeight: 500,
          fontFamily: 'var(--font-body, system-ui)',
        }}
      >
        {label}
      </span>
    </div>
  )
 
  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{ background: 'var(--bg)' }}
      >
        {spinner}
      </div>
    )
  }
 
  return (
    <div className="flex items-center justify-center p-8">
      {spinner}
    </div>
  )
}
 
export default LoadingSpinner