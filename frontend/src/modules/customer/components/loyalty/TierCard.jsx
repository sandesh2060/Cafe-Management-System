// src/modules/customer/components/loyalty/TierCard.jsx
//
// ✅ COLORS import removed
// ✅ BRAND.name replaces hardcoded 'कौसी चिया'
// ✅ BRAND.currency replaces hardcoded 'Rs'
// ✅ Tailwind gradient classes (from-amber-600 etc) removed — inline style gradients
// ✅ All surfaces via var(--token)

import { Star }  from 'lucide-react'
import { BRAND } from '@shared/config/brand'

const TIER_CONFIG = {
  none:   { emoji: '☕', label: 'New Member', discount: '0%',  gradient: 'linear-gradient(135deg,#FF9F1C,#E05C2A)' },
  bronze: { emoji: '🥉', label: 'Bronze',     discount: '5%',  gradient: 'linear-gradient(135deg,#CD7F32,#E8A96A)' },
  silver: { emoji: '🥈', label: 'Silver',     discount: '10%', gradient: 'linear-gradient(135deg,#9CA3AF,#D1D5DB)' },
  gold:   { emoji: '🥇', label: 'Gold',       discount: '15%', gradient: 'linear-gradient(135deg,#F59E0B,#FCD34D)' },
}

const TierCard = ({ tier = 'none', points = 0 }) => {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.none

  return (
    <div style={{
      borderRadius: 'var(--radius-2xl)',
      padding: '24px',
      background: cfg.gradient,
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      position: 'relative', overflow: 'hidden',
      color: '#fff',
    }}>
      {/* Decorative circles */}
      <div style={{ position: 'absolute', right: -24, top: -24, width: 128, height: 128, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
      <div style={{ position: 'absolute', right: -8,  bottom: -32, width: 96,  height: 96,  borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            {/* ✅ BRAND.name — was hardcoded 'कौसी चिया' */}
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>
              {BRAND.name}
            </p>
            <h2 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 800, lineHeight: 1.2 }}>
              {cfg.emoji} {cfg.label}
            </h2>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 'var(--radius-lg)', padding: '6px 12px',
          }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>
              {cfg.discount} off
            </p>
          </div>
        </div>

        <div style={{ marginTop: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.7)' }}>
              Points Balance
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 36, fontWeight: 800, lineHeight: 1 }}>
              {points.toLocaleString()}
            </p>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 'var(--radius-full)', padding: '4px 12px',
          }}>
            <Star size={13} fill="white" color="white" />
            {/* ✅ BRAND.currency — was hardcoded 'Rs 10' */}
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>
              1 pt = {BRAND.currency} 10
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TierCard