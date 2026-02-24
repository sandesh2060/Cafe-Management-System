// src/modules/customer/components/loyalty/HowToEarn.jsx
import { COLORS } from '@colors'

const STEPS = [
  { emoji: '🛒', title: 'Order food & drinks', desc: 'Every purchase earns you points' },
  { emoji: '⭐', title: 'Earn 1 pt per ₹10',   desc: 'Points accumulate automatically' },
  { emoji: '🎁', title: 'Unlock tier discounts', desc: '5% → 10% → 15% as you grow' },
  { emoji: '🏆', title: 'Reach Gold status',    desc: '1,000+ points for max rewards' },
]

const HowToEarn = () => (
  <div className="card space-y-3">
    <h3 className="font-bold text-brew text-sm">How to Earn Points</h3>
    <div className="space-y-3">
      {STEPS.map((s, i) => (
        <div key={i} className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: COLORS.saffron.DEFAULT + '15' }}
          >
            {s.emoji}
          </div>
          <div>
            <p className="text-sm font-semibold text-brew">{s.title}</p>
            <p className="text-xs text-brew-soft">{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
)

export default HowToEarn