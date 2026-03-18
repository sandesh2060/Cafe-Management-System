// src/modules/customer/pages/CallWaiterPage.jsx
//
// ✅ useContext(ThemeContext) added — page was completely unaware of dark mode
// ✅ All Tailwind color classes (bg-cream, text-brew, bg-saffron/10) replaced
//    with var(--token) inline styles from brand.js
// ✅ COLORS import removed — icon colors now use var(--accent)
// ✅ Header sticky bg → var(--header-bg), border → var(--header-border)
// ✅ All logic, useCallWaiter() explicit props, DONE/PENDING status sets unchanged

import { useContext }               from 'react'
import { useSelector }              from 'react-redux'
import { selectCallStatus }         from '@store/slices/callWaiterSlice'
import { ThemeContext }             from '@shared/context/ThemeContext'
import BottomNav                    from '@shared/components/layout/BottomNav'
import CallWaiterSheet              from '../components/callwaiter/CallWaiterSheet'
import CallStatusBanner             from '../components/callwaiter/CallStatusBanner'
import { useCallWaiter }            from '../hooks/useCallWaiter'
import { Bell, CheckCircle, Loader2 } from 'lucide-react'

// Terminal states — 'resolved' and 'cancelled' are backend-emitted
const DONE_STATUSES    = ['done', 'resolved', 'cancelled']
const PENDING_STATUSES = ['pending', 'acknowledged', 'on_the_way']

const CallWaiterPage = () => {
  const { isDark } = useContext(ThemeContext)

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
  const isLoading = callLoading && callStatus === 'idle'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>

      {/* ── Header ── */}
      <header style={{
        padding: '20px 16px 12px',
        position: 'sticky', top: 0, zIndex: 20,
        // ✅ var tokens — was bg-cream/95 backdrop-blur hardcoded
        background: 'var(--header-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--header-border)',
      }}>
        <h1 style={{
          margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em',
          // ✅ var(--text-primary) — was text-brew
          color: 'var(--text-primary)',
        }}>
          Call Waiter
        </h1>
        <p style={{
          margin: '3px 0 0', fontSize: 13.5,
          // ✅ var(--text-muted) — was text-brew-soft
          color: 'var(--text-muted)',
        }}>
          Let us know what you need
        </p>
      </header>

      {/* ── Content ── */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '16px 16px 100px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>

        {/* Active call status banner */}
        {callStatus !== 'idle' && <CallStatusBanner fullCard />}

        {/* Done state */}
        {isDone && (
          <div style={{
            // ✅ var tokens — was card + border-matcha/30 bg-matcha-soft
            background: 'var(--success-bg)',
            border: '1px solid var(--success-border)',
            borderRadius: 18,
            padding: '32px 24px',
            textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            {/* ✅ var(--success) — was MATCHA_COLOR / COLORS.matcha */}
            <CheckCircle size={48} style={{ color: 'var(--success)' }} />
            <h2 style={{
              margin: 0, fontSize: 20, fontWeight: 800,
              color: 'var(--text-primary)',
            }}>
              All Done!
            </h2>
            <p style={{
              margin: 0, fontSize: 13.5,
              color: 'var(--text-muted)',
            }}>
              Your request was resolved. Need anything else?
            </p>
          </div>
        )}

        {/* Loading spinner during idle → pending transition */}
        {isLoading && (
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 18, padding: '32px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            {/* ✅ var(--accent) — was text-saffron */}
            <Loader2 size={22} style={{ color: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
            <p style={{
              margin: 0, fontSize: 13.5, fontWeight: 600,
              color: 'var(--text-muted)',
            }}>
              Calling waiter…
            </p>
          </div>
        )}

        {/* Call form — visible when idle or after done */}
        {(callStatus === 'idle' || isDone) && !isLoading && (
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
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 18, padding: '32px 24px',
            textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              // ✅ var(--accent-dim) — was bg-saffron/10
              background: 'var(--accent-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* ✅ var(--accent) — was COLORS.saffron?.DEFAULT */}
              <Bell
                size={32}
                style={{ color: 'var(--accent)', animation: 'bellBounce 1.2s ease-in-out infinite' }}
              />
            </div>
            <p style={{
              margin: 0, fontSize: 13.5,
              color: 'var(--text-muted)',
            }}>
              Request sent! Your waiter has been notified.
            </p>
          </div>
        )}
      </div>

      <BottomNav />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bellBounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}

export default CallWaiterPage