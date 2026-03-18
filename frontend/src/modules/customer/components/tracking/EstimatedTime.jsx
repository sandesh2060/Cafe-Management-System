// src/modules/customer/components/tracking/EstimatedTime.jsx
//
// ✅ COLORS import removed — var(--accent) replaces COLORS.saffron.DEFAULT
// ✅ text-brew → var(--text-primary), text-brew-soft → var(--text-muted)
// ✅ Full dark/light via CSS vars
// ✅ ETA_MAP includes 'cancelled' → null (no stale ETA shown)

import { useEffect, useState } from 'react'
import { Clock }               from 'lucide-react'

const ETA_MAP = {
  pending:    '15–20 min',
  preparing:  '10–15 min',
  on_the_way: '2–5 min',
  delivered:  null,
  paid:       null,
  cancelled:  null,
}

const ElapsedTimer = ({ startTime }) => {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const update = () => setElapsed(Math.floor((Date.now() - new Date(startTime)) / 60000))
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [startTime])
  return (
    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
      Ordered {elapsed === 0 ? 'just now' : `${elapsed} min ago`}
    </span>
  )
}

const badgeLabel = (status) => {
  if (status === 'pending')    return 'Confirmed'
  if (status === 'preparing')  return 'Cooking'
  if (status === 'on_the_way') return 'Coming!'
  return status
}

const EstimatedTime = ({ status, placedAt }) => {
  const eta = ETA_MAP[status]
  if (!eta) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px', borderRadius: 'var(--radius-xl)',
      // ✅ var(--accent-dim/border) — was COLORS.saffron.DEFAULT + '08'/'30'
      background: 'var(--accent-dim)',
      border: '1px solid var(--accent-border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* ✅ var(--accent) — was COLORS.saffron.DEFAULT */}
        <Clock size={18} color="var(--accent)" />
        <div>
          {/* ✅ var(--text-primary) — was text-brew Tailwind */}
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            Est. {eta}
          </p>
          {placedAt && <ElapsedTimer startTime={placedAt} />}
        </div>
      </div>

      <div style={{
        padding: '4px 12px', borderRadius: 'var(--radius-full)',
        fontSize: 11, fontWeight: 700,
        // ✅ var(--accent-gradient) + var(--text-inverse) — was backgroundColor: COLORS.saffron.DEFAULT
        background: 'var(--accent-gradient)',
        color: 'var(--text-inverse)',
      }}>
        {badgeLabel(status)}
      </div>
    </div>
  )
}

export default EstimatedTime