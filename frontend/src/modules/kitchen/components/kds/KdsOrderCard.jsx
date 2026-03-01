// src/modules/kitchen/components/kds/KdsOrderCard.jsx
import { useState, useEffect, useRef, useContext } from 'react'
import { ThemeContext } from '@shared/context/ThemeContext'
import gsap             from 'gsap'
import { Play, CheckCircle, Clock } from 'lucide-react'

const THEME = {
  yellow: {
    border:   '#F59E0B',
    accent:   '#FCD34D',
    btnBg:    'from-yellow-500 to-amber-500',
    badgeBg:  'rgba(245,158,11,0.12)',
    glow:     'rgba(245,158,11,0.2)',
  },
  orange: {
    border:   '#F97316',
    accent:   '#FB923C',
    btnBg:    'from-emerald-500 to-green-500',
    badgeBg:  'rgba(249,115,22,0.12)',
    glow:     'rgba(249,115,22,0.2)',
  },
}

const ElapsedTimer = ({ startTime, warnMinutes = 15, dk }) => {
  const [mins, setMins] = useState(0)
  useEffect(() => {
    const update = () => setMins(Math.floor((Date.now() - new Date(startTime)) / 60000))
    update()
    const id = setInterval(update, 30_000)
    return () => clearInterval(id)
  }, [startTime])

  const late = mins >= warnMinutes
  return (
    <span className={`flex items-center gap-1 text-xs font-bold transition-colors
      ${late ? 'text-red-400 animate-pulse' : dk ? 'text-gray-500' : 'text-gray-400'}`}>
      <Clock size={11} />
      {mins}m
    </span>
  )
}

const KdsOrderCard = ({ order, onStart, onReady, color = 'yellow', isNew = false }) => {
  const { isDark: dk }  = useContext(ThemeContext)
  const cardRef          = useRef(null)
  const c                = THEME[color]

  useEffect(() => {
    if (!cardRef.current) return
    if (isNew) {
      gsap.fromTo(cardRef.current,
        { scale: 0.85, opacity: 0, y: -20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.6)' }
      )
      gsap.fromTo(cardRef.current,
        { boxShadow: `0 0 0 0 ${c.glow}` },
        { boxShadow: `0 0 0 12px transparent`, duration: 0.8, delay: 0.2 }
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
      className={`rounded-2xl border-2 flex flex-col gap-3 p-4 transition-colors`}
      style={{
        borderColor: c.border,
        background: dk
          ? `linear-gradient(135deg, rgba(17,17,27,0.95), rgba(25,22,10,0.9))`
          : `linear-gradient(135deg, rgba(255,255,255,0.98), rgba(255,250,240,0.95))`,
        boxShadow: `0 4px 20px ${c.glow}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-lg font-black text-sm"
               style={{ background: c.badgeBg, color: c.border }}>
            T-{order.tableNumber || '?'}
          </div>
          <span className={`text-xs font-mono ${dk ? 'text-gray-600' : 'text-gray-400'}`}>
            #{order._id?.slice(-4).toUpperCase()}
          </span>
        </div>
        <ElapsedTimer
          startTime={order.placedAt || order.createdAt}
          warnMinutes={color === 'orange' ? 20 : 15}
          dk={dk}
        />
      </div>

      {/* Items */}
      <div className="space-y-2 flex-1">
        {order.items?.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-xl leading-none flex-shrink-0">{item.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold leading-tight ${dk ? 'text-white' : 'text-gray-900'}`}>
                {item.name}
                <span className="ml-1.5 font-black text-xs" style={{ color: c.accent }}>
                  ×{item.quantity}
                </span>
              </p>
              {item.notes && (
                <p className={`text-xs mt-0.5 ${dk ? 'text-gray-600' : 'text-gray-400'}`}>
                  📝 {item.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {order.specialNote && (
        <div className={`text-xs px-2.5 py-1.5 rounded-lg border-l-2`}
             style={{ borderColor: c.border, background: c.badgeBg, color: c.accent }}>
          📌 {order.specialNote}
        </div>
      )}

      {/* Action */}
      {onStart && (
        <button
          onClick={onStart}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl
                     bg-gradient-to-r ${c.btnBg} text-white font-bold text-sm
                     active:scale-95 transition-transform shadow-md`}
        >
          <Play size={14} fill="currentColor" />
          Start Preparing
        </button>
      )}
      {onReady && (
        <button
          onClick={onReady}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl
                     bg-gradient-to-r from-emerald-500 to-green-500
                     text-white font-bold text-sm
                     active:scale-95 transition-transform shadow-md`}
        >
          <CheckCircle size={14} />
          Ready for Pickup
        </button>
      )}
    </div>
  )
}

export default KdsOrderCard