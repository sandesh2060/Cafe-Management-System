// src/modules/customer/components/callwaiter/CallStatusBanner.jsx
//
// FIXES:
// • 'resolved' status added to STATUS_CONFIG — callWaiterSlice was fixed to use
//   'resolved' (not 'done') as the terminal status. The banner was never showing
//   for resolved calls because 'resolved' key didn't exist here.
// • 'done' key kept as alias for any legacy socket events that still send 'done'.
// • Dismiss button shown on both 'resolved' and 'done' so users can clear it.
// • COLORS.matcha.DEFAULT confirmed correct token ✅

import { useSelector, useDispatch } from 'react-redux'
import { selectCallStatus, clearCall } from '@store/slices/callWaiterSlice'
import { COLORS }                      from '@colors'
import { Bell, CheckCircle, Bike, X }  from 'lucide-react'

const STATUS_CONFIG = {
  pending: {
    icon:   Bell,
    label:  'Waiter notified…',
    sub:    'Your waiter will be with you shortly',
    color:  COLORS.saffron.DEFAULT,
    bg:     COLORS.saffron.DEFAULT + '12',
    border: COLORS.saffron.DEFAULT + '40',
    pulse:  true,
    canDismiss: false,
  },
  acknowledged: {
    icon:   CheckCircle,
    label:  'Waiter acknowledged ✓',
    sub:    'On their way to your table',
    color:  COLORS.matcha.DEFAULT,
    bg:     COLORS.matcha.DEFAULT + '12',
    border: COLORS.matcha.DEFAULT + '40',
    pulse:  false,
    canDismiss: false,
  },
  on_the_way: {
    icon:   Bike,
    label:  'Waiter is coming! 🙏',
    sub:    'Almost there',
    color:  COLORS.matcha.DEFAULT,
    bg:     COLORS.matcha.DEFAULT + '15',
    border: COLORS.matcha.DEFAULT + '50',
    pulse:  false,
    canDismiss: false,
  },
  // FIX: 'resolved' is the correct terminal status from callWaiterSlice
  resolved: {
    icon:   CheckCircle,
    label:  'Request resolved ✓',
    sub:    'Need anything else?',
    color:  COLORS.matcha.DEFAULT,
    bg:     COLORS.matcha.DEFAULT + '10',
    border: COLORS.matcha.DEFAULT + '30',
    pulse:  false,
    canDismiss: true,
  },
  // 'done' kept as legacy alias — some older socket events may still send this
  done: {
    icon:   CheckCircle,
    label:  'Request resolved ✓',
    sub:    'Need anything else?',
    color:  COLORS.matcha.DEFAULT,
    bg:     COLORS.matcha.DEFAULT + '10',
    border: COLORS.matcha.DEFAULT + '30',
    pulse:  false,
    canDismiss: true,
  },
  cancelled: {
    icon:   X,
    label:  'Request cancelled',
    sub:    'You can call again anytime',
    color:  '#ef4444',
    bg:     '#ef444412',
    border: '#ef444440',
    pulse:  false,
    canDismiss: true,
  },
}

const CallStatusBanner = ({ fullCard = false }) => {
  const dispatch   = useDispatch()
  const callStatus = useSelector(selectCallStatus)
  const cfg        = STATUS_CONFIG[callStatus]

  if (!cfg || callStatus === 'idle') return null

  const Icon = cfg.icon

  const content = (
    <div
      className={`flex items-center gap-3 px-4 py-3 border ${fullCard ? 'rounded-2xl' : ''}`}
      style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
    >
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0
                    ${cfg.pulse ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: cfg.color + '20' }}
      >
        <Icon size={18} color={cfg.color} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
        <p className="text-xs text-brew-soft">{cfg.sub}</p>
      </div>

      {cfg.canDismiss && (
        <button
          onClick={() => dispatch(clearCall())}
          className="w-7 h-7 rounded-full bg-white/60 flex items-center justify-center"
          aria-label="Dismiss"
        >
          <X size={14} color={COLORS.brew.soft} />
        </button>
      )}
    </div>
  )

  return fullCard ? content : <div>{content}</div>
}

export default CallStatusBanner