// src/modules/customer/components/cart/LoyaltyDiscount.jsx
import { COLORS } from '@colors'
import { Tag }    from 'lucide-react'

const TIER_EMOJI = { bronze: '🥉', silver: '🥈', gold: '🥇' }

const LoyaltyDiscount = ({ tier, discountPct, discountAmt }) => (
  <div
    className="card flex items-center gap-3 border"
    style={{
      backgroundColor: COLORS.loyalty[tier]?.bg,
      borderColor:     COLORS.loyalty[tier]?.DEFAULT,
    }}
  >
    <span className="text-2xl">{TIER_EMOJI[tier]}</span>
    <div className="flex-1">
      <p className="font-bold text-sm" style={{ color: COLORS.loyalty[tier]?.text }}>
        {tier.charAt(0).toUpperCase() + tier.slice(1)} Discount Applied!
      </p>
      <p className="text-xs" style={{ color: COLORS.loyalty[tier]?.text + '99' }}>
        {discountPct}% loyalty discount · saving ₹{discountAmt}
      </p>
    </div>
    <Tag size={18} color={COLORS.loyalty[tier]?.DEFAULT} />
  </div>
)

export default LoyaltyDiscount