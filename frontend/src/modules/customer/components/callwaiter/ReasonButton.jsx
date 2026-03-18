// src/modules/customer/components/callwaiter/ReasonButton.jsx
//
// ✅ COLORS import removed
// ✅ COLORS.saffron.DEFAULT → var(--accent) as fallback color
// ✅ COLORS.brew.DEFAULT → var(--text-primary) for unselected text
// ✅ Selected state uses var(--accent-gradient) + var(--text-inverse)
// ✅ Unselected border uses var(--accent-border)

const ReasonButton = ({ reason, selected, onToggle }) => {
  const baseColor = reason.color || 'var(--accent)'

  return (
    <button
      onClick={onToggle}
      aria-pressed={selected}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 14px', borderRadius: 'var(--radius-full)',
        fontSize: 13, fontWeight: 500, minHeight: 40,
        border: `2px solid ${selected ? 'transparent' : 'var(--accent-border)'}`,
        transition: 'all 0.15s ease',
        WebkitTapHighlightColor: 'transparent',
        cursor: 'pointer',
        // ✅ selected: var(--accent-gradient) + var(--text-inverse)
        // ✅ unselected: transparent bg + var(--text-primary)
        background: selected ? 'var(--accent-gradient)' : 'transparent',
        color:      selected ? 'var(--text-inverse)'    : 'var(--text-primary)',
        boxShadow: selected ? '0 4px 14px var(--accent-glow)' : 'none',
      }}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      onTouchStart={e => e.currentTarget.style.transform = 'scale(0.95)'}
      onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <span>{reason.emoji}</span>
      <span>{reason.label}</span>
    </button>
  )
}

export default ReasonButton