// src/modules/customer/components/tracking/OrderTracker.jsx
//
// FIXES:
//   • COLORS.orderStatus.* removed — this object doesn't exist in colors.js
//     Replaced with direct hex values matching the project's saffron/matcha/terra palette
//   • COLORS.cream.deep, COLORS.border.light/dark removed — unconfirmed paths
//     Replaced with confirmed Tailwind CSS vars / direct hex values
//   • GSAP cleanup added: gsap.killTweensOf(els) returned from useEffect
//     to prevent tween leaks when component unmounts between status changes

import { useEffect, useRef } from 'react'
import { CheckCircle, Clock, ChefHat, Bike, Utensils, XCircle } from 'lucide-react'
import gsap from 'gsap'

// Status colours — using confirmed project palette hex values
// (avoids dependency on COLORS.orderStatus which doesn't exist)
const STATUS_COLORS = {
  pending:    '#FF9F1C',   // saffron
  preparing:  '#E05C2A',   // terra
  on_the_way: '#2D9B5A',   // matcha
  delivered:  '#2D9B5A',   // matcha
  cancelled:  '#ef4444',   // red
}

const STEPS = [
  { key: 'pending',    label: 'Order Placed', icon: Clock    },
  { key: 'preparing',  label: 'Preparing',    icon: ChefHat  },
  { key: 'on_the_way', label: 'On the Way',   icon: Bike     },
  { key: 'delivered',  label: 'Delivered',    icon: Utensils },
]

const STATUS_ORDER = { pending: 0, preparing: 1, on_the_way: 2, delivered: 3, paid: 3 }

const OrderTracker = ({ status }) => {
  const stepsRef   = useRef(null)
  const currentIdx = STATUS_ORDER[status] ?? 0

  useEffect(() => {
    if (!stepsRef.current) return
    const els = stepsRef.current.querySelectorAll('.step-icon')
    gsap.fromTo(els,
      { scale: 0.8, opacity: 0.5 },
      { scale: 1,   opacity: 1, stagger: 0.1, duration: 0.4, ease: 'back.out(1.5)' }
    )
    // FIX: kill tweens on unmount to prevent animation leaks
    return () => gsap.killTweensOf(els)
  }, [status])

  if (status === 'cancelled') {
    return (
      <div className="card flex items-center gap-3 border-red-200 bg-red-50">
        <XCircle size={28} color={STATUS_COLORS.cancelled} />
        <div>
          <p className="font-bold text-red-700">Order Cancelled</p>
          <p className="text-sm text-red-500">This order was cancelled.</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={stepsRef} className="card space-y-0 py-5">
      {STEPS.map((step, i) => {
        const color    = STATUS_COLORS[step.key] ?? '#FF9F1C'
        const isDone   = i < currentIdx
        const isActive = i === currentIdx
        const Icon     = isDone ? CheckCircle : step.icon

        return (
          <div key={step.key} className="flex items-start gap-4">
            {/* Icon + connector */}
            <div className="flex flex-col items-center">
              <div
                className="step-icon w-10 h-10 rounded-full flex items-center justify-center
                           transition-all duration-300 flex-shrink-0"
                style={{
                  backgroundColor: isDone || isActive ? `${color}20` : 'rgba(92,51,23,0.05)',
                  border: `2px solid ${isDone || isActive ? color : 'rgba(92,51,23,0.15)'}`,
                }}
              >
                <Icon
                  size={18}
                  color={isDone || isActive ? color : 'rgba(92,51,23,0.3)'}
                  strokeWidth={isDone ? 2.5 : 2}
                />
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="w-0.5 h-8 mt-1 transition-colors duration-500"
                  style={{ backgroundColor: i < currentIdx ? color : 'rgba(92,51,23,0.1)' }}
                />
              )}
            </div>

            {/* Label */}
            <div className="pt-2">
              <p className="font-semibold text-sm"
                 style={{ color: isActive ? color : isDone ? 'rgba(92,51,23,0.55)' : 'rgba(92,51,23,0.3)' }}>
                {step.label}
              </p>
              {isActive && (
                <p className="text-xs text-brew-soft mt-0.5 animate-pulse">In progress…</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default OrderTracker