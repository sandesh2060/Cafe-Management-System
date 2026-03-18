// src/modules/waiter/components/orders/WaiterCallList.jsx
//
// ✅ Tailwind gray dark conditionals → var(--card-bg), var(--card-border), var(--text-*)
// ✅ STATUS_META colors are semantic call status colors — intentionally kept fixed
// ✅ GSAP card entrance and pulse animation unchanged

import { useContext, useEffect, useRef } from 'react'
import { useWaiterCalls } from '../../hooks/useWaiterCalls'
import { ThemeContext }    from '@shared/context/ThemeContext'
import gsap                from 'gsap'
import { Bell, Check, Bike, CheckCircle } from 'lucide-react'

// Semantic call status colors — fixed, not brand-themed
const STATUS_META = {
  pending:      { label: 'New',          color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   pulse: true  },
  acknowledged: { label: 'Acknowledged', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  pulse: false },
  on_the_way:   { label: 'On My Way',    color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   pulse: false },
}

const CallCard = ({ call, onAck, onWay, onDone }) => {
  const cardRef = useRef(null)
  const meta    = STATUS_META[call.status] || STATUS_META.pending

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
        onComplete: () => { if (cardRef.current) cardRef.current.style.boxShadow = '' },
      })
    }
  }, [])

  return (
    <div ref={cardRef} style={{
      borderRadius: 16, padding: 16,
      // ✅ var(--card-bg/border/shadow)
      background: 'var(--card-bg)',
      border: '1px solid var(--card-border)',
      boxShadow: 'var(--card-shadow)',
      display: 'flex', flexDirection: 'column', gap: 12,
      transition: 'background var(--transition-theme)',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 13,
              background: meta.bg, color: meta.color,
            }}>
              {call.tableNumber || '?'}
            </div>
            {meta.pulse && (
              <span style={{
                position: 'absolute', inset: 0, borderRadius: 12,
                background: meta.color, opacity: 0.3,
                animation: 'pulse-ring 1.5s ease-out infinite',
              }} />
            )}
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-body)' }}>
              Table #{call.tableNumber || '?'}
            </p>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, color: meta.color, background: meta.bg }}>
              {meta.label}
            </span>
          </div>
        </div>
        <Bell size={15} style={{ color: meta.color }} />
      </div>

      {/* Reasons */}
      {call.reasons?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {call.reasons.slice(0, 4).map((r, i) => (
            <span key={i} style={{
              fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 99,
              // ✅ var(--pill-bg/text-secondary)
              background: 'var(--pill-bg)', color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)',
            }}>
              {r}
            </span>
          ))}
        </div>
      )}

      {/* Note */}
      {call.note && (
        <p style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--text-muted)', margin: 0, fontFamily: 'var(--font-body)' }}>
          "{call.note}"
        </p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        {call.status === 'pending' && (
          <button
            onClick={() => onAck(call._id)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 16px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #F59E0B, #F97316)',
              color: '#fff', fontSize: 12, fontWeight: 700,
              fontFamily: 'var(--font-body)', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(245,158,11,0.3)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Check size={13} /> Acknowledge
          </button>
        )}
        {call.status === 'acknowledged' && (
          <button
            onClick={() => onWay(call._id)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 16px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #3B82F6, #4F46E5)',
              color: '#fff', fontSize: 12, fontWeight: 700,
              fontFamily: 'var(--font-body)', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Bike size={13} /> On My Way
          </button>
        )}
        {call.status === 'on_the_way' && (
          <button
            onClick={() => onDone(call._id)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 16px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#fff', fontSize: 12, fontWeight: 700,
              fontFamily: 'var(--font-body)', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <CheckCircle size={13} /> Done
          </button>
        )}
      </div>
    </div>
  )
}

const WaiterCallList = () => {
  const { calls, loading, acknowledge, onMyWay, done } = useWaiterCalls()
  const { isDark } = useContext(ThemeContext)
  const active = calls.filter(c => c.status !== 'done')

  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      background: 'var(--card-bg)',
      border: '1px solid var(--card-border)',
      boxShadow: 'var(--card-shadow)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px', flexShrink: 0,
        borderBottom: '1px solid var(--divider)',
      }}>
        {/* Semantic danger for call bell */}
        <Bell size={17} style={{ color: 'var(--danger)' }} />
        <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-body)' }}>
          Waiter Calls
        </h2>
        {active.length > 0 && (
          <span style={{
            width: 20, height: 20, borderRadius: '50%',
            background: 'var(--danger)', color: '#fff',
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            animation: 'pulse-soft 1.5s ease-in-out infinite',
          }}>
            {active.length}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 16 }}>
            <div className="skeleton" style={{ height: 80, borderRadius: 12 }} />
          </div>
        ) : active.length === 0 ? (
          <div style={{ padding: '40px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24 }}>👌</span>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, fontFamily: 'var(--font-body)' }}>
              No pending calls
            </p>
          </div>
        ) : (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {active.map(call => (
              <CallCard
                key={call._id} call={call}
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