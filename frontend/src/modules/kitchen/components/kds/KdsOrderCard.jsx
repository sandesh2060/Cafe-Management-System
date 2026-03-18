// src/modules/kitchen/components/kds/KdsOrderCard.jsx
//
// ✅ THEME hardcoded hex → var(--accent/success/warning) tokens
// ✅ dk ternary Tailwind text-gray-* → var(--text-muted/disabled/primary)
// ✅ bg-gradient-to-r Tailwind gradients → inline style with var(--token)
// ✅ card background → var(--card-bg) — no more hardcoded rgba
// ✅ text-white → var(--text-inverse)
// ✅ GSAP animations unchanged

import { useState, useEffect, useRef, useContext } from 'react'
import { ThemeContext } from '@shared/context/ThemeContext'
import gsap             from 'gsap'
import { Play, CheckCircle, Clock } from 'lucide-react'

const THEME = {
  yellow: {
    border:  'var(--accent)',
    accent:  'var(--accent-light)',
    badgeBg: 'var(--accent-dim)',
    btnGrad: 'linear-gradient(135deg, var(--warning, #F59E0B), var(--accent))',
  },
  orange: {
    border:  'var(--accent-dark)',
    accent:  'var(--accent)',
    badgeBg: 'var(--accent-dim)',
    btnGrad: 'linear-gradient(135deg, var(--success), #16A34A)',
  },
}

const ElapsedTimer = ({ startTime, warnMinutes = 15 }) => {
  const [mins, setMins] = useState(0)
  useEffect(() => {
    const update = () => setMins(Math.floor((Date.now() - new Date(startTime)) / 60000))
    update()
    const id = setInterval(update, 30_000)
    return () => clearInterval(id)
  }, [startTime])

  return (
    <span
      className="flex items-center gap-1 text-xs font-bold transition-colors"
      style={{ color: mins >= warnMinutes ? 'var(--danger)' : 'var(--text-muted)' }}
    >
      <Clock size={11} />
      {mins}m
    </span>
  )
}

const KdsOrderCard = ({ order, onStart, onReady, color = 'yellow', isNew = false }) => {
  const { isDark } = useContext(ThemeContext)
  const cardRef    = useRef(null)
  const c          = THEME[color]

  useEffect(() => {
    if (!cardRef.current) return
    if (isNew) {
      gsap.fromTo(cardRef.current,
        { scale: 0.85, opacity: 0, y: -20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.6)' }
      )
      gsap.fromTo(cardRef.current,
        { boxShadow: '0 0 0 0 var(--accent-glow)' },
        { boxShadow: '0 0 0 12px transparent', duration: 0.8, delay: 0.2 }
      )
    } else {
      gsap.fromTo(cardRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
      )
    }
  }, [])

  return (
    <div
      ref={cardRef}
      className="rounded-2xl border-2 flex flex-col gap-3 p-4 transition-colors"
      style={{
        borderColor: c.border,
        background:  'var(--card-bg)',
        boxShadow:   '0 4px 20px var(--accent-glow)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="px-2.5 py-1 rounded-lg font-black text-sm"
            style={{ background: c.badgeBg, color: c.border }}
          >
            T-{order.tableNumber || '?'}
          </div>
          <span className="text-xs font-mono" style={{ color: 'var(--text-disabled)' }}>
            #{order._id?.slice(-4).toUpperCase()}
          </span>
        </div>
        <ElapsedTimer startTime={order.placedAt || order.createdAt} warnMinutes={color === 'orange' ? 20 : 15} />
      </div>

      {/* Items */}
      <div className="space-y-2 flex-1">
        {order.items?.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-xl leading-none flex-shrink-0">{item.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {item.name}
                <span className="ml-1.5 font-black text-xs" style={{ color: c.accent }}>
                  ×{item.quantity}
                </span>
              </p>
              {item.notes && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>📝 {item.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {order.specialNote && (
        <div
          className="text-xs px-2.5 py-1.5 rounded-lg border-l-2"
          style={{ borderColor: c.border, background: c.badgeBg, color: c.accent }}
        >
          📌 {order.specialNote}
        </div>
      )}

      {onStart && (
        <button
          onClick={onStart}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold active:scale-95 transition-transform shadow-md"
          style={{ background: c.btnGrad, color: 'var(--text-inverse)' }}
        >
          <Play size={14} fill="currentColor" /> Start Preparing
        </button>
      )}
      {onReady && (
        <button
          onClick={onReady}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold active:scale-95 transition-transform shadow-md"
          style={{ background: 'linear-gradient(135deg, var(--success), #16A34A)', color: 'var(--text-inverse)' }}
        >
          <CheckCircle size={14} /> Ready for Pickup
        </button>
      )}
    </div>
  )
}

export default KdsOrderCard