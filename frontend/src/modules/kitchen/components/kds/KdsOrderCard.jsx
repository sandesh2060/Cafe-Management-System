// src/modules/kitchen/components/kds/KdsOrderCard.jsx
import { useState, useEffect } from 'react'
import { Play, CheckCircle, Clock } from 'lucide-react'

const COLORS_MAP = {
  yellow: { border: '#F59E0B', bg: '#1A1200', btn: '#F59E0B', text: '#FCD34D' },
  orange: { border: '#F97316', bg: '#1A0A00', btn: '#16A34A', text: '#FB923C' },
}

const ElapsedTimer = ({ startTime, warnMinutes = 15 }) => {
  const [mins, setMins] = useState(0)
  useEffect(() => {
    const update = () => setMins(Math.floor((Date.now() - new Date(startTime)) / 60000))
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [startTime])

  const isLate = mins >= warnMinutes
  return (
    <span className={`text-xs font-bold flex items-center gap-1 ${isLate ? 'text-red-400 animate-pulse' : 'text-gray-400'}`}>
      <Clock size={11} />
      {mins}m
    </span>
  )
}

const KdsOrderCard = ({ order, onStart, onReady, color = 'yellow' }) => {
  const c = COLORS_MAP[color]

  return (
    <div
      className="rounded-2xl border-2 p-4 flex flex-col gap-3"
      style={{ borderColor: c.border, backgroundColor: c.bg }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="font-bold text-white text-lg">T-{order.tableNumber || '?'}</span>
          <span className="ml-2 text-xs font-mono text-gray-500">
            #{order._id?.slice(-4).toUpperCase()}
          </span>
        </div>
        <ElapsedTimer startTime={order.placedAt || order.createdAt} warnMinutes={color === 'orange' ? 20 : 15} />
      </div>

      {/* Items */}
      <div className="space-y-1.5 flex-1">
        {order.items?.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-lg leading-none">{item.emoji}</span>
            <div className="flex-1">
              <p className="text-white text-sm font-medium leading-tight">
                {item.name}
                <span className="ml-1.5 font-bold" style={{ color: c.text }}>×{item.quantity}</span>
              </p>
              {item.notes && <p className="text-gray-500 text-xs mt-0.5">📝 {item.notes}</p>}
            </div>
          </div>
        ))}
      </div>

      {order.specialNote && (
        <p className="text-xs text-yellow-500/80 border-t border-gray-800 pt-2">
          📌 {order.specialNote}
        </p>
      )}

      {/* Action button */}
      {onStart && (
        <button
          onClick={onStart}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                     font-bold text-sm text-gray-900 active:scale-95 transition-transform"
          style={{ backgroundColor: c.btn }}
        >
          <Play size={15} fill="currentColor" />
          Start Preparing
        </button>
      )}
      {onReady && (
        <button
          onClick={onReady}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                     font-bold text-sm text-white bg-green-600 active:scale-95 transition-transform"
        >
          <CheckCircle size={15} />
          Ready for Pickup
        </button>
      )}
    </div>
  )
}

export default KdsOrderCard