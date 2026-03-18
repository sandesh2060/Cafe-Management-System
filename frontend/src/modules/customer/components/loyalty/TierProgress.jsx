// src/modules/customer/components/loyalty/TierProgress.jsx
//
// ✅ COLORS import removed — var(--accent) replaces COLORS.saffron.DEFAULT
// ✅ text-brew → var(--text-primary), text-brew-soft → var(--text-muted)
// ✅ bg-cream-deep → var(--pill-bg), card div → var(--card-bg/border/shadow)
// ✅ All logic unchanged

const NEXT_TIER       = { none: 'bronze', bronze: 'silver', silver: 'gold' }
const THRESHOLD       = { none: 0, bronze: 500, silver: 1000 }
const NEXT_THRESHOLD  = { none: 500, bronze: 1000, silver: Infinity }
const TIER_EMOJI      = { bronze: '🥉', silver: '🥈', gold: '🥇' }

const TierProgress = ({ tier, points }) => {
  const nextTier = NEXT_TIER[tier]
  if (!nextTier) return null

  const from       = THRESHOLD[tier] || 0
  const to         = NEXT_THRESHOLD[tier] || 1000
  const progress   = Math.min(((points - from) / (to - from)) * 100, 100)
  const pointsLeft = Math.max(to - points, 0)

  return (
    <div style={{
      padding: '16px', borderRadius: 'var(--radius-xl)',
      background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      boxShadow: 'var(--card-shadow)', display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* ✅ var(--text-primary) — was text-brew */}
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
          Progress to {TIER_EMOJI[nextTier]} {nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}
        </h3>
        {/* ✅ var(--text-muted) — was text-brew-soft */}
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pointsLeft} pts to go</span>
      </div>

      {/* Progress bar */}
      <div style={{
        position: 'relative', height: 12, borderRadius: 'var(--radius-full)', overflow: 'hidden',
        // ✅ var(--pill-bg) — was bg-cream-deep
        background: 'var(--pill-bg)',
      }}>
        <div style={{
          position: 'absolute', inset: '0 auto 0 0',
          width: `${progress}%`, borderRadius: 'var(--radius-full)',
          transition: 'width 0.7s ease',
          // ✅ var(--accent-gradient) — was COLORS.saffron.DEFAULT
          background: 'var(--accent-gradient)',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{points} pts</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{to} pts</span>
      </div>
    </div>
  )
}

export default TierProgress