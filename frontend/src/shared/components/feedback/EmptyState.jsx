// src/shared/components/feedback/EmptyState.jsx
const EmptyState = ({ emoji = '🍽️', title = 'Nothing here', subtitle, action, onAction }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
    <span className="text-5xl">{emoji}</span>
    <div>
      <h3 className="font-bold text-brew text-lg">{title}</h3>
      {subtitle && <p className="text-brew-soft text-sm mt-1">{subtitle}</p>}
    </div>
    {action && onAction && (
      <button onClick={onAction} className="btn-brand px-6 mt-2 text-sm">{action}</button>
    )}
  </div>
)

export default EmptyState