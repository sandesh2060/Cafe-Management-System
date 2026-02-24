// src/modules/customer/components/callwaiter/CallWaiterSheet.jsx
import { COLORS }           from '@colors'
import ReasonButton         from './ReasonButton'
import CustomNoteInput      from './CustomNoteInput'
import { Send, Loader }     from 'lucide-react'

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

  return (
    <div className={inline ? 'space-y-1' : 'px-4 pt-2 pb-6 space-y-1'}>
      {/* From your order */}
      {reasons.fromOrder?.length > 0 && (
        <>
          <SectionLabel label="From your order" />
          <div className="flex flex-wrap gap-2">
            {reasons.fromOrder.map((r) => (
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
      <SectionLabel label="Basic needs" />
      <div className="flex flex-wrap gap-2">
        {reasons.basics?.map((r) => (
          <ReasonButton
            key={r.id}
            reason={r}
            selected={selectedReasons.includes(r.id)}
            onToggle={() => toggleReason(r.id)}
          />
        ))}
      </div>

      {/* Service */}
      <SectionLabel label="Service" />
      <div className="flex flex-wrap gap-2">
        {reasons.service?.map((r) => (
          <ReasonButton
            key={r.id}
            reason={r}
            selected={selectedReasons.includes(r.id)}
            onToggle={() => toggleReason(r.id)}
          />
        ))}
      </div>

      {/* Custom note */}
      <div className="mt-3">
        <CustomNoteInput value={note} onChange={setNote} />
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {/* Submit */}
      <button
        onClick={submitCall}
        disabled={loading || !hasSelection}
        className="btn-brand w-full mt-4 min-h-[52px] text-base disabled:opacity-50"
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