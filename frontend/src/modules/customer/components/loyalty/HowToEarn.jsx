// src/modules/customer/components/loyalty/HowToEarn.jsx
//
// ✅ COLORS import removed — var(--accent-dim) replaces COLORS.saffron.DEFAULT+'15'
// ✅ text-brew → var(--text-primary), text-brew-soft → var(--text-muted)
// ✅ card → var(--card-bg/border/shadow) inline styles

const STEPS = [
  { emoji: '🛒', title: 'Order food & drinks',  desc: 'Every purchase earns you points'    },
  { emoji: '⭐', title: 'Earn 1 pt per Rs 10',  desc: 'Points accumulate automatically'    },
  { emoji: '🎁', title: 'Unlock tier discounts', desc: '5% → 10% → 15% as you grow'       },
  { emoji: '🏆', title: 'Reach Gold status',     desc: '1,000+ points for max rewards'     },
]

const HowToEarn = () => (
  <div style={{
    padding: '16px', borderRadius: 'var(--radius-xl)',
    background: 'var(--card-bg)', border: '1px solid var(--card-border)',
    boxShadow: 'var(--card-shadow)', display: 'flex', flexDirection: 'column', gap: 12,
  }}>
    {/* ✅ var(--text-primary) — was text-brew */}
    <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
      How to Earn Points
    </h3>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {STEPS.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
            // ✅ var(--accent-dim) — was COLORS.saffron.DEFAULT + '15'
            background: 'var(--accent-dim)',
          }}>
            {s.emoji}
          </div>
          <div>
            {/* ✅ var(--text-primary) — was text-brew */}
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {s.title}
            </p>
            {/* ✅ var(--text-muted) — was text-brew-soft */}
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
              {s.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>
)

export default HowToEarn