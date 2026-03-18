// src/modules/customer/components/callwaiter/CallWaiterSheet.jsx
//
// ✅ COLORS import removed
// ✅ text-brew-soft → var(--text-muted)
// ✅ text-red-500 → var(--danger)
// ✅ SectionLabel uses var(--text-muted) inline style
// ✅ Null guards on reasons sub-arrays preserved
// ✅ btn-brand class kept — defined in globals.css

import ReasonButton    from './ReasonButton'
import CustomNoteInput from './CustomNoteInput'
import { Send, Loader } from 'lucide-react'

const SectionLabel = ({ label }) => (
  <p style={{
    margin: '16px 0 8px',
    fontSize: 10, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    // ✅ var(--text-muted) — was text-brew-soft
    color: 'var(--text-muted)',
  }}>
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

  const fromOrder = reasons?.fromOrder ?? []
  const basics    = reasons?.basics    ?? []
  const service   = reasons?.service   ?? []

  return (
    <div style={{ padding: inline ? 0 : '8px 16px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* From your order */}
      {fromOrder.length > 0 && (
        <>
          <SectionLabel label="From your order" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {fromOrder.map(r => (
              <ReasonButton key={r.id} reason={r}
                selected={selectedReasons.includes(r.id)}
                onToggle={() => toggleReason(r.id)} />
            ))}
          </div>
        </>
      )}

      {/* Basic needs */}
      {basics.length > 0 && (
        <>
          <SectionLabel label="Basic needs" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {basics.map(r => (
              <ReasonButton key={r.id} reason={r}
                selected={selectedReasons.includes(r.id)}
                onToggle={() => toggleReason(r.id)} />
            ))}
          </div>
        </>
      )}

      {/* Service */}
      {service.length > 0 && (
        <>
          <SectionLabel label="Service" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {service.map(r => (
              <ReasonButton key={r.id} reason={r}
                selected={selectedReasons.includes(r.id)}
                onToggle={() => toggleReason(r.id)} />
            ))}
          </div>
        </>
      )}

      {/* Custom note */}
      <div style={{ marginTop: 12 }}>
        <CustomNoteInput value={note} onChange={setNote} />
      </div>

      {/* Error */}
      {error && (
        <p style={{
          margin: '6px 0 0', fontSize: 13,
          // ✅ var(--danger) — was text-red-500
          color: 'var(--danger)',
        }}>
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        onClick={submitCall}
        disabled={loading || !hasSelection}
        className="btn-brand"
        style={{
          width: '100%', marginTop: 16, minHeight: 52,
          fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: (loading || !hasSelection) ? 0.5 : 1,
          cursor: (loading || !hasSelection) ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? (
          <Loader size={20} style={{ animation: 'spin-slow 1s linear infinite' }} />
        ) : (
          <>
            <Send size={18} />
            Call Waiter
            {selectedReasons.length > 0 && (
              <span style={{
                marginLeft: 6, width: 20, height: 20, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                background: 'rgba(255,255,255,0.2)', color: '#fff',
              }}>
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