// src/modules/customer/components/tracking/OrderTracker.jsx
//
// ─── PERF CHANGES (visuals identical) ────────────────────────────────────────
// 1. gsapEnabled from useDeviceTier() gates step icon animation
//    On low tier: icons appear at full opacity instantly, no stagger bounce
// 2. contain:'layout style' on root container
// 3. All CSS vars, status colors, step logic — UNCHANGED
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'
import { CheckCircle, Clock, ChefHat, Bike, Utensils, XCircle } from 'lucide-react'
import gsap from 'gsap'
import { useDeviceTier } from '@shared/hooks/useDeviceTier'

const STATUS_COLOR_VAR = {
  pending:    'var(--accent)',
  preparing:  'var(--accent)',
  on_the_way: 'var(--success)',
  delivered:  'var(--success)',
  cancelled:  'var(--danger)',
}

const STATUS_COLOR_HEX = {
  pending:    '#FF9F1C',
  preparing:  '#FF9F1C',
  on_the_way: '#34D399',
  delivered:  '#34D399',
  cancelled:  '#F87171',
}

const STEPS = [
  { key: 'pending',    label: 'Order Placed', Icon: Clock    },
  { key: 'preparing',  label: 'Preparing',    Icon: ChefHat  },
  { key: 'on_the_way', label: 'On the Way',   Icon: Bike     },
  { key: 'delivered',  label: 'Delivered',    Icon: Utensils },
]

const STATUS_ORDER = { pending: 0, preparing: 1, on_the_way: 2, delivered: 3, paid: 3 }

const OrderTracker = ({ status }) => {
  const stepsRef   = useRef(null)
  const currentIdx = STATUS_ORDER[status] ?? 0
  // FIX: read tier
  const { gsapEnabled } = useDeviceTier()

  useEffect(() => {
    if (!stepsRef.current) return
    // FIX: skip stagger on low tier — icons still visible at full opacity
    if (!gsapEnabled) return
    const els = stepsRef.current.querySelectorAll('.step-icon')
    gsap.fromTo(els,
      { scale: 0.8, opacity: 0.5 },
      { scale: 1, opacity: 1, stagger: 0.1, duration: 0.4, ease: 'back.out(1.5)' }
    )
    return () => gsap.killTweensOf(els)
  }, [status, gsapEnabled])

  if (status === 'cancelled') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', borderRadius: 'var(--radius-xl)',
        background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
      }}>
        <XCircle size={28} color="var(--danger)" />
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--danger)' }}>Order Cancelled</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>This order was cancelled.</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={stepsRef}
      style={{
        padding: '20px 16px', borderRadius: 'var(--radius-xl)',
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        boxShadow: 'var(--card-shadow)',
        display: 'flex', flexDirection: 'column', gap: 0,
        // FIX: contain isolates tracker from scroll
        contain: 'layout style',
      }}
    >
      {STEPS.map((step, i) => {
        const colorHex = STATUS_COLOR_HEX[step.key]
        const isDone   = i < currentIdx
        const isActive = i === currentIdx
        const Icon     = isDone ? CheckCircle : step.Icon

        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div
                className="step-icon"
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'all 0.3s ease',
                  background: isDone || isActive ? 'var(--accent-dim)' : 'var(--pill-bg)',
                  border: `2px solid ${isDone || isActive ? 'var(--accent-border)' : 'var(--divider)'}`,
                }}
              >
                <Icon
                  size={18}
                  color={isDone || isActive ? colorHex : undefined}
                  style={{ color: isDone || isActive ? undefined : 'var(--text-disabled)' }}
                  strokeWidth={isDone ? 2.5 : 2}
                />
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  width: 2, height: 32, margin: '4px 0', borderRadius: 2,
                  transition: 'background-color 0.5s ease',
                  background: i < currentIdx ? colorHex : 'var(--divider)',
                }} />
              )}
            </div>

            <div style={{ paddingTop: 8 }}>
              <p style={{
                margin: 0, fontSize: 13, fontWeight: 600,
                color: isActive ? colorHex : isDone ? 'var(--text-secondary)' : 'var(--text-disabled)',
              }}>
                {step.label}
              </p>
              {isActive && (
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)', animation: 'pulse-soft 3s ease-in-out infinite' }}>
                  In progress…
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default OrderTracker