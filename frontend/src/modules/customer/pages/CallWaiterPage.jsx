// src/modules/customer/pages/CallWaiterPage.jsx
import { useSelector }          from 'react-redux'
import { selectCallStatus }     from '@store/slices/callWaiterSlice'
import BottomNav                from '@shared/components/layout/BottomNav'
import CallWaiterSheet          from '../components/callwaiter/CallWaiterSheet'
import CallStatusBanner         from '../components/callwaiter/CallStatusBanner'
import { useCallWaiter }        from '../hooks/useCallWaiter'
import { Bell, CheckCircle }    from 'lucide-react'
import { COLORS }               from '@colors'

const CallWaiterPage = () => {
  const callStatus  = useSelector(selectCallStatus)
  const callWaiter  = useCallWaiter()

  const isDone = callStatus === 'done'

  return (
    <div className="customer-container min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="px-4 pt-5 pb-3 sticky top-0 z-20 bg-cream/95 backdrop-blur-md
                          border-b border-cream-border">
        <h1 className="text-2xl font-bold text-brew">Call Waiter</h1>
        <p className="text-brew-soft text-sm mt-0.5">
          Let us know what you need
        </p>
      </header>

      <div className="flex-1 overflow-auto px-4 pt-4 pb-bottom-nav space-y-4">
        {/* Active call status */}
        {callStatus !== 'idle' && <CallStatusBanner fullCard />}

        {/* Done state */}
        {isDone && (
          <div className="card text-center py-8 space-y-3 border-matcha/30 bg-matcha-soft">
            <CheckCircle size={48} color={COLORS.matcha.DEFAULT} className="mx-auto" />
            <h2 className="text-xl font-bold text-brew">All Done!</h2>
            <p className="text-brew-soft text-sm">
              Your request was resolved. Need anything else?
            </p>
          </div>
        )}

        {/* Call form — show when idle or done */}
        {(callStatus === 'idle' || isDone) && (
          <CallWaiterSheet {...callWaiter} inline />
        )}

        {/* Pending / in-progress state */}
        {['pending', 'acknowledged', 'on_the_way'].includes(callStatus) && (
          <div className="card text-center py-8 space-y-3">
            <div className="w-16 h-16 rounded-full bg-saffron/10 flex items-center
                            justify-center mx-auto">
              <Bell size={32} color={COLORS.saffron.DEFAULT} className="animate-bounce-soft" />
            </div>
            <p className="text-brew-soft text-sm">
              Request sent! Your waiter has been notified.
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

export default CallWaiterPage