// src/modules/manager/components/loyalty/LoyaltyPanel.jsx
import { useState, useEffect } from 'react'
import api   from '@api/axios'
import { COLORS } from '@colors'
import { Star }   from 'lucide-react'

const TIER_EMOJI = { none: '☕', bronze: '🥉', silver: '🥈', gold: '🥇' }

const LoyaltyPanel = () => {
  const [leaderboard, setLeaderboard] = useState([])
  const [config,      setConfig]      = useState(null)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([api.get('/loyalty/leaderboard'), api.get('/loyalty/config')])
      .then(([l, c]) => { setLeaderboard(l.leaderboard || []); setConfig(c.config) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-brew">Loyalty Program</h2>

      {/* Config summary */}
      {config && (
        <div className="grid grid-cols-3 gap-3">
          {['bronze','silver','gold'].map((t) => (
            <div key={t} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-2xl mb-1">{TIER_EMOJI[t]}</p>
              <p className="font-bold text-brew capitalize text-sm">{t}</p>
              <p className="text-xs text-brew-soft">{config[t].minPoints}+ pts</p>
              <p className="text-xs font-bold text-matcha">{config[t].discount}% off</p>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <Star size={18} color={COLORS.saffron.DEFAULT} />
          <h3 className="font-bold text-brew text-sm">Top Members</h3>
        </div>
        {loading ? <div className="p-4 space-y-2">{[1,2,3].map((i) => <div key={i} className="h-12 bg-cream-deep rounded-xl animate-pulse" />)}</div>
        : leaderboard.length === 0 ? <div className="py-8 text-center text-brew-soft text-sm">No members yet</div>
        : <div className="divide-y divide-gray-50">
            {leaderboard.map((m, i) => (
              <div key={m._id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-6 text-center text-sm font-bold text-brew-soft">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-brew">{m.userId?.name || 'User'}</p>
                  <p className="text-xs text-brew-soft capitalize">{m.tier} tier</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-brew text-sm">{m.points.toLocaleString()}</p>
                  <p className="text-xs text-brew-soft">pts</p>
                </div>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  )
}

export default LoyaltyPanel