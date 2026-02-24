// src/modules/customer/components/loyalty/TierComparison.jsx
import { COLORS } from '@colors'
import { Check }  from 'lucide-react'

const TIERS = ['bronze', 'silver', 'gold']
const TIER_LABEL  = { bronze: '🥉 Bronze', silver: '🥈 Silver', gold: '🥇 Gold' }
const TIER_COLOR  = { bronze: COLORS.loyalty.bronze.DEFAULT, silver: COLORS.loyalty.silver.DEFAULT, gold: COLORS.loyalty.gold.DEFAULT }
const FEATURES = [
  { label: 'Min. Points',  bronze: '0',    silver: '500', gold: '1,000' },
  { label: 'Discount',     bronze: '5%',   silver: '10%', gold: '15%'  },
  { label: 'Priority',     bronze: '—',    silver: '✓',   gold: '✓✓'  },
  { label: 'Birthday perk',bronze: '—',    silver: '—',   gold: '✓'   },
]

const TierComparison = ({ currentTier }) => (
  <div className="card overflow-hidden p-0">
    <div className="px-4 pt-4 pb-2">
      <h3 className="font-bold text-brew text-sm">Tier Benefits</h3>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-cream-dark">
            <th className="px-4 py-2 text-left text-xs text-brew-soft font-semibold w-28">Benefit</th>
            {TIERS.map((t) => (
              <th key={t} className="px-3 py-2 text-center text-xs font-bold"
                style={{ color: TIER_COLOR[t] }}>
                {TIER_LABEL[t]}
                {t === currentTier && <span className="ml-1 text-[9px] bg-saffron text-white rounded px-1">You</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-cream-border">
          {FEATURES.map((f) => (
            <tr key={f.label}>
              <td className="px-4 py-2.5 text-brew-soft text-xs font-medium">{f.label}</td>
              {TIERS.map((t) => (
                <td key={t} className="px-3 py-2.5 text-center text-xs font-semibold"
                  style={{ color: f[t] === '—' ? COLORS.border.dark : TIER_COLOR[t] }}>
                  {f[t]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

export default TierComparison