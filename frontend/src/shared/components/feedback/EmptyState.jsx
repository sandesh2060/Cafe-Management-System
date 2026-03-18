 
// ─────────────────────────────────────────────────────────────────────────────
 
 
// src/shared/components/feedback/EmptyState.jsx
//
// ✅ text-brew, text-brew-soft Tailwind aliases replaced with var(--token) inline
// ✅ btn-brand kept (globals.css component class — correct)
// ✅ Proper dark/light mode via CSS vars without relying on Tailwind aliases
 
export const EmptyState = ({
  emoji    = '🍽️',
  title    = 'Nothing here',
  subtitle,
  action,
  onAction,
}) => (
  <div
    className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6"
  >
    <span className="text-5xl">{emoji}</span>
    <div>
      <h3
        style={{
          // ✅ var(--text-primary) — was text-brew
          color:      'var(--text-primary)',
          fontFamily: 'var(--font-heading, system-ui)',
          fontSize:   18,
          fontWeight: 700,
          margin:     0,
        }}
      >
        {title}
      </h3>
      {subtitle && (
        <p
          style={{
            // ✅ var(--text-muted) — was text-brew-soft
            color:      'var(--text-muted)',
            fontFamily: 'var(--font-body, system-ui)',
            fontSize:   14,
            marginTop:  4,
            margin:     '4px 0 0',
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
    {action && onAction && (
      <button onClick={onAction} className="btn-brand px-6 mt-2 text-sm">
        {action}
      </button>
    )}
  </div>
)
 
export default EmptyState
 
 