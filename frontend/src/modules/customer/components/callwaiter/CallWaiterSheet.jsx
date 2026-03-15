// src/modules/customer/components/callwaiter/CallWaiterSheet.jsx
//
// FIXES:
// • reasons?.fromOrder, reasons?.basics, reasons?.service — all access guarded
//   with optional chaining on both the `reasons` object and each sub-array.
//   If reasons prop is null/undefined before buildCallReasons runs, no crash.
// • Empty section suppressed: fromOrder and service sections only render if
//   their arrays have items — previously rendered an empty <div className="flex-wrap gap-2">

import { COLORS }       from '@colors'
import ReasonButton     from './ReasonButton'
import CustomNoteInput  from './CustomNoteInput'
import { Send, Loader } from 'lucide-react'

const SectionLabel = ({ label }) => (
  <p className="text-xs font-bold text-brew-soft uppercase tracking-wide mb-2 mt-4 first:mt-0">
    {label}
  </p>
)

const CallWaiterSheet = ({
  reasons,
  selectedReasons,
  note,
  setNote,
  loading,
  error,
  toggleReason,
  submitCall,
  inline = false,
}) => {
  const hasSelection = selectedReasons.length > 0 || note.trim().length > 0

  // FIX: guard both the reasons object and each sub-array
  const fromOrder = reasons?.fromOrder ?? []
  const basics    = reasons?.basics    ?? []
  const service   = reasons?.service   ?? []

  return (
    <div className={inline ? 'space-y-1' : 'px-4 pt-2 pb-6 space-y-1'}>

      {/* From your order — only shown when items present */}
      {fromOrder.length > 0 && (
        <>
          <SectionLabel label="From your order" />
          <div className="flex flex-wrap gap-2">
            {fromOrder.map((r) => (
              <ReasonButton
                key={r.id}
                reason={r}
                selected={selectedReasons.includes(r.id)}
                onToggle={() => toggleReason(r.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Basic needs */}
      {basics.length > 0 && (
        <>
          <SectionLabel label="Basic needs" />
          <div className="flex flex-wrap gap-2">
            {basics.map((r) => (
              <ReasonButton
                key={r.id}
                reason={r}
                selected={selectedReasons.includes(r.id)}
                onToggle={() => toggleReason(r.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Service — only shown when items present */}
      {service.length > 0 && (
        <>
          <SectionLabel label="Service" />
          <div className="flex flex-wrap gap-2">
            {service.map((r) => (
              <ReasonButton
                key={r.id}
                reason={r}
                selected={selectedReasons.includes(r.id)}
                onToggle={() => toggleReason(r.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Custom note */}
      <div className="mt-3">
        <CustomNoteInput value={note} onChange={setNote} />
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}

      {/* Submit */}
      <button
        onClick={submitCall}
        disabled={loading || !hasSelection}
        className="btn-brand w-full mt-4 min-h-[52px] text-base disabled:opacity-50
                   flex items-center justify-center gap-2"
      >
        {loading ? (
          <Loader size={20} className="animate-spin" />
        ) : (
          <>
            <Send size={18} />
            Call Waiter
            {selectedReasons.length > 0 && (
              <span className="ml-1.5 bg-white/20 text-white rounded-full
                               text-xs w-5 h-5 flex items-center justify-center">
                {selectedReasons.length}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  )
}

export default CallWaiterSheet