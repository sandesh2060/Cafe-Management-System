// src/modules/waiter/components/orders/WaiterCallList.jsx
import { useWaiterCalls } from '../../hooks/useWaiterCalls'
import { COLORS }         from '@colors'
import { Bell, Check, Bike, CheckCircle } from 'lucide-react'

const STATUS_CONFIG = {
  pending:     { label: 'New',         color: COLORS.terra.DEFAULT,   bg: '#FEF3C7' },
  acknowledged:{ label: 'Acknowledged',color: COLORS.saffron.DEFAULT, bg: '#FFF3DC' },
  on_the_way:  { label: 'On My Way',   color: COLORS.matcha.DEFAULT,  bg: '#ECFDF5' },
}

const WaiterCallList = () => {
  const { calls, loading, acknowledge, onMyWay, done } = useWaiterCalls()
  const active = calls.filter((c) => c.status !== 'done')

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <Bell size={18} color={COLORS.saffron.DEFAULT} />
        <h2 className="font-bold text-brew text-base">Waiter Calls ({active.length})</h2>
      </div>

      {loading ? (
        <div className="p-4 space-y-3">
          {[1].map((i) => <div key={i} className="h-16 bg-cream-deep rounded-xl animate-pulse" />)}
        </div>
      ) : active.length === 0 ? (
        <div className="py-8 text-center text-brew-soft text-sm">No pending calls 👌</div>
      ) : (
        <div className="divide-y divide-gray-50 max-h-72 overflow-auto">
          {active.map((call) => {
            const cfg = STATUS_CONFIG[call.status] || STATUS_CONFIG.pending
            return (
              <div key={call._id} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-brew text-sm">Table #{call.tableNumber || '?'}</span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ color: cfg.color, backgroundColor: cfg.bg }}
                  >
                    {cfg.label}
                  </span>
                </div>

                {call.reasons?.length > 0 && (
                  <p className="text-xs text-brew-soft">
                    {call.reasons.slice(0, 4).join(' · ')}{call.reasons.length > 4 ? ' …' : ''}
                  </p>
                )}
                {call.note && <p className="text-xs text-brew italic">"{call.note}"</p>}

                <div className="flex gap-2">
                  {call.status === 'pending' && (
                    <button onClick={() => acknowledge(call._id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
                                 bg-saffron text-white text-xs font-bold active:scale-95 transition-transform">
                      <Check size={14} /> Acknowledge
                    </button>
                  )}
                  {call.status === 'acknowledged' && (
                    <button onClick={() => onMyWay(call._id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
                                 bg-brew text-white text-xs font-bold active:scale-95 transition-transform">
                      <Bike size={14} /> On My Way
                    </button>
                  )}
                  {call.status === 'on_the_way' && (
                    <button onClick={() => done(call._id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
                                 bg-matcha text-white text-xs font-bold active:scale-95 transition-transform">
                      <CheckCircle size={14} /> Done
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default WaiterCallList