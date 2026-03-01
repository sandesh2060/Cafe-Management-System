// src/modules/waiter/components/orders/WaiterCallList.jsx
import { useContext, useEffect, useRef } from 'react'
import { useWaiterCalls } from '../../hooks/useWaiterCalls'
import { ThemeContext }    from '@shared/context/ThemeContext'
import gsap                from 'gsap'
import { Bell, Check, Bike, CheckCircle } from 'lucide-react'

const STATUS_META = {
  pending:      { label: 'New',          color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   pulse: true  },
  acknowledged: { label: 'Acknowledged', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  pulse: false },
  on_the_way:   { label: 'On My Way',    color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   pulse: false },
}

const CallCard = ({ call, onAck, onWay, onDone, dk }) => {
  const cardRef = useRef(null)
  const meta = STATUS_META[call.status] || STATUS_META.pending

  useEffect(() => {
    if (!cardRef.current) return
    gsap.fromTo(cardRef.current,
      { opacity: 0, scale: 0.97 },
      { opacity: 1, scale: 1, duration: 0.28, ease: 'back.out(1.4)' }
    )
    if (call.status === 'pending') {
      gsap.to(cardRef.current, {
        boxShadow: `0 0 0 3px ${meta.color}33`,
        repeat: 3, yoyo: true, duration: 0.5, delay: 0.3,
        onComplete: () => { if (cardRef.current) cardRef.current.style.boxShadow = '' }
      })
    }
  }, [])

  return (
    <div ref={cardRef} className={`rounded-2xl border p-4 space-y-3 transition-all
      ${dk ? 'bg-gray-800/60 border-gray-700/50' : 'bg-white border-gray-100 shadow-sm'}`}>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm`}
                 style={{ background: meta.bg, color: meta.color }}>
              {call.tableNumber || '?'}
            </div>
            {meta.pulse && (
              <span className="absolute inset-0 rounded-xl animate-ping opacity-40"
                    style={{ background: meta.color }} />
            )}
          </div>
          <div>
            <p className={`text-sm font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>
              Table #{call.tableNumber || '?'}
            </p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ color: meta.color, background: meta.bg }}>
              {meta.label}
            </span>
          </div>
        </div>
        <Bell size={15} style={{ color: meta.color }} />
      </div>

      {call.reasons?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {call.reasons.slice(0, 4).map((r, i) => (
            <span key={i} className={`text-[10px] font-medium px-2 py-0.5 rounded-full
              ${dk ? 'bg-white/8 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
              {r}
            </span>
          ))}
        </div>
      )}

      {call.note && (
        <p className={`text-xs italic ${dk ? 'text-gray-500' : 'text-gray-400'}`}>
          "{call.note}"
        </p>
      )}

      <div className="flex gap-2">
        {call.status === 'pending' && (
          <button onClick={() => onAck(call._id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                       bg-gradient-to-r from-amber-500 to-orange-500
                       text-white text-xs font-bold active:scale-95 transition-transform shadow-sm">
            <Check size={13} /> Acknowledge
          </button>
        )}
        {call.status === 'acknowledged' && (
          <button onClick={() => onWay(call._id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                       bg-gradient-to-r from-blue-500 to-indigo-500
                       text-white text-xs font-bold active:scale-95 transition-transform shadow-sm">
            <Bike size={13} /> On My Way
          </button>
        )}
        {call.status === 'on_the_way' && (
          <button onClick={() => onDone(call._id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                       bg-gradient-to-r from-emerald-500 to-green-500
                       text-white text-xs font-bold active:scale-95 transition-transform shadow-sm">
            <CheckCircle size={13} /> Done
          </button>
        )}
      </div>
    </div>
  )
}

const WaiterCallList = () => {
  const { calls, loading, acknowledge, onMyWay, done } = useWaiterCalls()
  const { isDark: dk } = useContext(ThemeContext)
  const active = calls.filter(c => c.status !== 'done')

  return (
    <div className={`rounded-2xl border overflow-hidden flex flex-col
      ${dk ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>

      <div className={`flex items-center gap-2 px-4 py-3 border-b flex-shrink-0
        ${dk ? 'border-gray-800' : 'border-gray-100'}`}>
        <Bell size={17} className="text-red-400" />
        <h2 className={`font-bold text-base ${dk ? 'text-white' : 'text-gray-900'}`}>
          Waiter Calls
        </h2>
        {active.length > 0 && (
          <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold
                           flex items-center justify-center animate-pulse">
            {active.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-4">
            <div className={`h-20 rounded-xl animate-pulse ${dk ? 'bg-gray-800' : 'bg-gray-100'}`} />
          </div>
        ) : active.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2">
            <span className="text-2xl">👌</span>
            <p className={`text-sm ${dk ? 'text-gray-500' : 'text-gray-400'}`}>No pending calls</p>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {active.map(call => (
              <CallCard
                key={call._id} call={call} dk={dk}
                onAck={acknowledge} onWay={onMyWay} onDone={done}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default WaiterCallList