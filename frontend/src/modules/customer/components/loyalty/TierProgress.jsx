// src/modules/customer/components/loyalty/TierProgress.jsx
import { COLORS } from '@colors'

const NEXT_TIER = { none: 'bronze', bronze: 'silver', silver: 'gold' }
const THRESHOLD = { none: 0, bronze: 500, silver: 1000 }
const NEXT_THRESHOLD = { none: 500, bronze: 1000, silver: Infinity }
const TIER_EMOJI = { bronze: '🥉', silver: '🥈', gold: '🥇' }

const TierProgress = ({ tier, points }) => {
  const nextTier    = NEXT_TIER[tier]
  if (!nextTier) return null

  const from        = THRESHOLD[tier] || 0
  const to          = NEXT_THRESHOLD[tier] || 1000
  const progress    = Math.min(((points - from) / (to - from)) * 100, 100)
  const pointsLeft  = Math.max(to - points, 0)

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-brew text-sm">Progress to {TIER_EMOJI[nextTier]} {nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}</h3>
        <span className="text-xs text-brew-soft">{pointsLeft} pts to go</span>
      </div>

      <div className="relative h-3 bg-cream-deep rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{
            width:           `${progress}%`,
            backgroundColor: COLORS.saffron.DEFAULT,
          }}
        />
      </div>

      <div className="flex justify-between text-xs text-brew-soft">
        <span>{points} pts</span>
        <span>{to} pts</span>
      </div>
    </div>
  )
}

export default TierProgress