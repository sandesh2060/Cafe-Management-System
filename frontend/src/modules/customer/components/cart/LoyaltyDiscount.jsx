// src/modules/customer/components/cart/LoyaltyDiscount.jsx
//
// ✅ COLORS import removed — loyalty colors via var(--loyalty-*) tokens set by ThemeContext
// ✅ BRAND.currency — hardcoded 'Rs' replaced
// ✅ Full dark/light support via CSS vars

import { Tag }  from 'lucide-react'
import { BRAND } from '@shared/config/brand'

const TIER_EMOJI = { bronze: '🥉', silver: '🥈', gold: '🥇' }

const LoyaltyDiscount = ({ tier, discountPct, discountAmt }) => (
  <div
    style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px', borderRadius: 'var(--radius-xl)',
      // ✅ var(--loyalty-*) — was COLORS.loyalty[tier].bg/DEFAULT
      background: 'var(--loyalty-bg)',
      border: '1px solid var(--loyalty-border)',
    }}
  >
    <span style={{ fontSize: 24, flexShrink: 0 }}>{TIER_EMOJI[tier]}</span>

    <div style={{ flex: 1 }}>
      <p style={{
        margin: 0, fontSize: 13, fontWeight: 700,
        // ✅ var(--loyalty-text) — was COLORS.loyalty[tier].text
        color: 'var(--loyalty-text)',
      }}>
        {tier.charAt(0).toUpperCase() + tier.slice(1)} Discount Applied!
      </p>
      <p style={{
        margin: '2px 0 0', fontSize: 11,
        // ✅ var(--loyalty-sub-text) — was COLORS.loyalty[tier].text + '99'
        color: 'var(--loyalty-sub-text)',
      }}>
        {/* ✅ BRAND.currency — was hardcoded 'Rs' */}
        {discountPct}% loyalty discount · saving {BRAND.currency} {discountAmt}
      </p>
    </div>

    {/* ✅ var(--loyalty-text) for icon color */}
    <Tag size={18} color="var(--loyalty-text)" style={{ flexShrink: 0 }} />
  </div>
)

export default LoyaltyDiscount