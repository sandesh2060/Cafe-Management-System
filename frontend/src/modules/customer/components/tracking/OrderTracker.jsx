// src/modules/customer/components/tracking/OrderTracker.jsx
import { useEffect, useRef } from 'react'
import { COLORS }            from '@colors'
import { CheckCircle, Clock, ChefHat, Bike, Utensils, XCircle } from 'lucide-react'
import gsap from 'gsap'

const STEPS = [
  { key: 'pending',    label: 'Order Placed',   icon: Clock,        color: COLORS.orderStatus.pending    },
  { key: 'preparing',  label: 'Preparing',      icon: ChefHat,      color: COLORS.orderStatus.preparing  },
  { key: 'on_the_way', label: 'On the Way',     icon: Bike,         color: COLORS.orderStatus.on_the_way },
  { key: 'delivered',  label: 'Delivered',      icon: Utensils,     color: COLORS.orderStatus.delivered  },
]

const STATUS_ORDER = { pending: 0, preparing: 1, on_the_way: 2, delivered: 3, paid: 3 }

const OrderTracker = ({ status }) => {
  const stepsRef  = useRef(null)
  const currentIdx = STATUS_ORDER[status] ?? 0

  useEffect(() => {
    if (!stepsRef.current) return
    const els = stepsRef.current.querySelectorAll('.step-icon')
    gsap.fromTo(els,
      { scale: 0.8, opacity: 0.5 },
      { scale: 1,   opacity: 1, stagger: 0.1, duration: 0.4, ease: 'back.out(1.5)' }
    )
  }, [status])

  if (status === 'cancelled') {
    return (
      <div className="card flex items-center gap-3 border-red-200 bg-red-50">
        <XCircle size={28} color={COLORS.orderStatus.cancelled} />
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
        const isDone    = i < currentIdx
        const isActive  = i === currentIdx
        const Icon      = isDone ? CheckCircle : step.icon

        return (
          <div key={step.key} className="flex items-start gap-4">
            {/* Icon + connector */}
            <div className="flex flex-col items-center">
              <div
                className="step-icon w-10 h-10 rounded-full flex items-center justify-center
                           transition-all duration-300 flex-shrink-0"
                style={{
                  backgroundColor: isDone || isActive ? step.color + '20' : COLORS.cream.deep,
                  border:          `2px solid ${isDone || isActive ? step.color : COLORS.border.light}`,
                }}
              >
                <Icon
                  size={18}
                  color={isDone || isActive ? step.color : COLORS.border.dark}
                  strokeWidth={isDone ? 2.5 : 2}
                />
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="w-0.5 h-8 mt-1 transition-colors duration-500"
                  style={{ backgroundColor: i < currentIdx ? step.color : COLORS.border.light }}
                />
              )}
            </div>

            {/* Label */}
            <div className="pt-2">
              <p
                className="font-semibold text-sm"
                style={{ color: isActive ? step.color : isDone ? COLORS.brew.soft : COLORS.border.dark }}
              >
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