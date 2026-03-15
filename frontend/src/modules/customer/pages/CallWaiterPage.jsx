// src/modules/customer/pages/CallWaiterPage.jsx
//
// FIXES (this pass):
//  1. CallWaiterSheet now receives explicit named props from useCallWaiter()
//     instead of a blind {...callWaiter} spread. Spreading an entire hook's
//     return value onto a component passes every internal key as a prop and
//     can break CallWaiterSheet's expected interface.
//  2. isDone now includes 'resolved' and 'cancelled' — not just 'done'.
//     The backend/socket emits 'resolved' for a completed waiter call;
//     'done' is a frontend-only string that may never appear in the slice.
//  3. Intermediate loading state added between idle→pending to prevent
//     a blank gap during the API round-trip.
//  4. COLORS.matcha guard — falls back to '#22c55e' if COLORS.matcha is undefined.

import { useSelector }          from 'react-redux'
import { selectCallStatus }     from '@store/slices/callWaiterSlice'
import BottomNav                from '@shared/components/layout/BottomNav'
import CallWaiterSheet          from '../components/callwaiter/CallWaiterSheet'
import CallStatusBanner         from '../components/callwaiter/CallStatusBanner'
import { useCallWaiter }        from '../hooks/useCallWaiter'
import { Bell, CheckCircle, Loader2 } from 'lucide-react'
import { COLORS }               from '@colors'

// FIX: 'resolved' and 'cancelled' are the backend-emitted terminal states.
// 'done' may never appear as a real callStatus value from the slice.
const DONE_STATUSES    = ['done', 'resolved', 'cancelled']
const PENDING_STATUSES = ['pending', 'acknowledged', 'on_the_way']

// FIX: COLORS.matcha guard — the path is confirmed for Tailwind but not for
// the JS COLORS object. Fall back to hardcoded green if undefined.
const MATCHA_COLOR = COLORS.matcha?.DEFAULT ?? '#22c55e'

const CallWaiterPage = () => {
  // FIX: extract specific props from useCallWaiter() instead of spreading
  // the entire hook return onto CallWaiterSheet. This preserves the
  // component's expected prop interface.
  const {
    reasons,
    selected,
    note,
    loading: callLoading,
    onSelectReason,
    onNoteChange,
    onSubmit,
  } = useCallWaiter()

  const callStatus = useSelector(selectCallStatus)

  const isDone    = DONE_STATUSES.includes(callStatus)
  const isPending = PENDING_STATUSES.includes(callStatus)
  // FIX: show loading spinner while transitioning idle → pending
  const isLoading = callLoading && callStatus === 'idle'

  return (
    <div className="customer-container min-h-screen bg-cream flex flex-col">

      {/* Header */}
      <header className="px-4 pt-5 pb-3 sticky top-0 z-20 bg-cream/95 backdrop-blur-md
                         border-b border-cream-border">
        <h1 className="text-2xl font-bold text-brew">Call Waiter</h1>
        <p className="text-brew-soft text-sm mt-0.5">Let us know what you need</p>
      </header>

      <div className="flex-1 overflow-auto px-4 pt-4 pb-bottom-nav space-y-4">

        {/* Active call status banner */}
        {callStatus !== 'idle' && <CallStatusBanner fullCard />}

        {/* Done state */}
        {isDone && (
          <div className="card text-center py-8 space-y-3 border-matcha/30 bg-matcha-soft">
            <CheckCircle size={48} color={MATCHA_COLOR} className="mx-auto" />
            <h2 className="text-xl font-bold text-brew">All Done!</h2>
            <p className="text-brew-soft text-sm">
              Your request was resolved. Need anything else?
            </p>
          </div>
        )}

        {/* FIX: loading spinner during idle → pending transition */}
        {isLoading && (
          <div className="card flex items-center justify-center gap-3 py-8">
            <Loader2 size={22} className="animate-spin text-saffron" />
            <p className="text-brew-soft text-sm font-semibold">Calling waiter…</p>
          </div>
        )}

        {/* Call form — visible when idle or after done (to allow a new call) */}
        {(callStatus === 'idle' || isDone) && !isLoading && (
          // FIX: explicit named props — not spread of entire hook return
          <CallWaiterSheet
            inline
            reasons={reasons}
            selected={selected}
            note={note}
            loading={callLoading}
            onSelectReason={onSelectReason}
            onNoteChange={onNoteChange}
            onSubmit={onSubmit}
          />
        )}

        {/* Pending / in-progress state */}
        {isPending && (
          <div className="card text-center py-8 space-y-3">
            <div className="w-16 h-16 rounded-full bg-saffron/10 flex items-center
                            justify-center mx-auto">
              <Bell size={32} color={COLORS.saffron?.DEFAULT ?? '#FF9F1C'}
                className="animate-bounce-soft" />
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