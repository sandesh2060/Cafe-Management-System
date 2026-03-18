// src/modules/customer/components/callwaiter/CallStatusBanner.jsx
//
// ✅ COLORS import removed — var(--accent/success/danger) replace COLORS.*
// ✅ text-brew-soft → var(--text-muted)
// ✅ 'resolved' terminal status added (was missing, causing banner to never show)
// ✅ 'done' kept as legacy alias

import { useSelector, useDispatch }          from 'react-redux'
import { selectCallStatus, clearCall }        from '@store/slices/callWaiterSlice'
import { Bell, CheckCircle, Bike, X }         from 'lucide-react'

const STATUS_CONFIG = {
  pending: {
    Icon:       Bell,
    label:      'Waiter notified…',
    sub:        'Your waiter will be with you shortly',
    // ✅ var(--accent) — was COLORS.saffron.DEFAULT
    color:      'var(--accent)',
    bg:         'var(--accent-dim)',
    border:     'var(--accent-border)',
    pulse:      true,
    canDismiss: false,
  },
  acknowledged: {
    Icon:       CheckCircle,
    label:      'Waiter acknowledged ✓',
    sub:        'On their way to your table',
    // ✅ var(--success) — was COLORS.matcha.DEFAULT
    color:      'var(--success)',
    bg:         'var(--success-bg)',
    border:     'var(--success-border)',
    pulse:      false,
    canDismiss: false,
  },
  on_the_way: {
    Icon:       Bike,
    label:      'Waiter is coming! 🙏',
    sub:        'Almost there',
    color:      'var(--success)',
    bg:         'var(--success-bg)',
    border:     'var(--success-border)',
    pulse:      false,
    canDismiss: false,
  },
  resolved: {
    Icon:       CheckCircle,
    label:      'Request resolved ✓',
    sub:        'Need anything else?',
    color:      'var(--success)',
    bg:         'var(--success-bg)',
    border:     'var(--success-border)',
    pulse:      false,
    canDismiss: true,
  },
  done: {
    Icon:       CheckCircle,
    label:      'Request resolved ✓',
    sub:        'Need anything else?',
    color:      'var(--success)',
    bg:         'var(--success-bg)',
    border:     'var(--success-border)',
    pulse:      false,
    canDismiss: true,
  },
  cancelled: {
    Icon:       X,
    label:      'Request cancelled',
    sub:        'You can call again anytime',
    // ✅ var(--danger) — was hardcoded #ef4444
    color:      'var(--danger)',
    bg:         'var(--danger-bg)',
    border:     'var(--danger-border)',
    pulse:      false,
    canDismiss: true,
  },
}

const CallStatusBanner = ({ fullCard = false }) => {
  const dispatch   = useDispatch()
  const callStatus = useSelector(selectCallStatus)
  const cfg        = STATUS_CONFIG[callStatus]

  if (!cfg || callStatus === 'idle') return null

  const { Icon } = cfg

  const content = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      backgroundColor: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: fullCard ? 'var(--radius-xl)' : 0,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        background: 'var(--pill-bg)',
        animation: cfg.pulse ? 'pulse-soft 3s ease-in-out infinite' : 'none',
      }}>
        <Icon size={18} color={cfg.color} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: cfg.color }}>
          {cfg.label}
        </p>
        {/* ✅ var(--text-muted) — was text-brew-soft */}
        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
          {cfg.sub}
        </p>
      </div>

      {cfg.canDismiss && (
        <button
          onClick={() => dispatch(clearCall())}
          aria-label="Dismiss"
          style={{
            width: 28, height: 28, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--pill-bg)', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', flexShrink: 0,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  )

  return fullCard ? content : <div>{content}</div>
}

export default CallStatusBanner