// src/modules/customer/components/loyalty/TierComparison.jsx
//
// ✅ COLORS import removed — tier colors kept as fixed semantic hex (tier identity)
// ✅ bg-cream-dark → var(--pill-bg), text-brew → var(--text-primary)
// ✅ text-brew-soft → var(--text-muted), bg-saffron → var(--accent)
// ✅ divide-cream-border → var(--divider), card → var(--card-bg/border)
// ✅ Check import removed (was unused)

const TIERS      = ['bronze', 'silver', 'gold']
const TIER_LABEL = { bronze: '🥉 Bronze', silver: '🥈 Silver', gold: '🥇 Gold' }

// Tier identity colors — these are fixed semantic values, not theme tokens
const TIER_COLOR = { bronze: '#CD7F32', silver: '#9CA3AF', gold: '#F59E0B' }

const FEATURES = [
  { label: 'Min. Points',   bronze: '0',   silver: '500', gold: '1,000' },
  { label: 'Discount',      bronze: '5%',  silver: '10%', gold: '15%'   },
  { label: 'Priority',      bronze: '—',   silver: '✓',   gold: '✓✓'   },
  { label: 'Birthday perk', bronze: '—',   silver: '—',   gold: '✓'    },
]

const TierComparison = ({ currentTier }) => (
  <div style={{
    borderRadius: 'var(--radius-xl)', overflow: 'hidden',
    background: 'var(--card-bg)', border: '1px solid var(--card-border)',
    boxShadow: 'var(--card-shadow)',
  }}>
    <div style={{ padding: '16px 16px 8px' }}>
      {/* ✅ var(--text-primary) — was text-brew */}
      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
        Tier Benefits
      </h3>
    </div>

    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--pill-bg)' }}>
            <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', width: 112 }}>
              Benefit
            </th>
            {TIERS.map(t => (
              <th key={t} style={{ padding: '8px 12px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: TIER_COLOR[t] }}>
                {TIER_LABEL[t]}
                {t === currentTier && (
                  <span style={{
                    marginLeft: 4, fontSize: 9, padding: '1px 5px',
                    borderRadius: 4, verticalAlign: 'middle',
                    // ✅ var(--accent/text-inverse) — was bg-saffron text-white
                    background: 'var(--accent)', color: 'var(--text-inverse)',
                  }}>You</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURES.map((f, fi) => (
            <tr key={f.label} style={{
              borderTop: '1px solid var(--divider)',
            }}>
              {/* ✅ var(--text-muted) — was text-brew-soft */}
              <td style={{ padding: '10px 16px', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>
                {f.label}
              </td>
              {TIERS.map(t => (
                <td key={t} style={{
                  padding: '10px 12px', textAlign: 'center', fontSize: 11, fontWeight: 600,
                  // ✅ var(--text-disabled) for '—', tier color for values
                  color: f[t] === '—' ? 'var(--text-disabled)' : TIER_COLOR[t],
                }}>
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