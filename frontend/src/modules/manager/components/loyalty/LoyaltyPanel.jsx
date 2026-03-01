// src/modules/manager/components/loyalty/LoyaltyPanel.jsx
import { useState, useEffect, useRef, useContext } from 'react'
import { ThemeContext } from '@shared/context/ThemeContext'
import api        from '@api/axios'
import gsap       from 'gsap'
import { COLORS } from '@colors'
import { Star, Crown, TrendingUp, Award } from 'lucide-react'

const TIER_CONFIG = {
  bronze: { emoji: '🥉', gradient: COLORS.gradients.loyalty.bronze, textColor: COLORS.loyalty.bronze.text, bg: COLORS.loyalty.bronze.bg },
  silver: { emoji: '🥈', gradient: COLORS.gradients.loyalty.silver, textColor: COLORS.loyalty.silver.text, bg: COLORS.loyalty.silver.bg },
  gold:   { emoji: '🥇', gradient: COLORS.gradients.loyalty.gold,   textColor: COLORS.loyalty.gold.text,   bg: COLORS.loyalty.gold.bg   },
}

const RANK_CROWN = { 0: '👑', 1: '🥈', 2: '🥉' }

const TierCard = ({ tier, config, delay, isDark }) => {
  const cardRef = useRef(null)

  useEffect(() => {
    if (!cardRef.current) return
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 20, scale: 0.92 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, delay, ease: 'back.out(1.6)' }
    )
  }, [delay])

  return (
    <div
      ref={cardRef}
      className="rounded-2xl border p-4 text-center transition-all hover:scale-[1.02]"
      style={{
        backgroundColor: isDark ? COLORS.dark.surface : '#fff',
        borderColor:     isDark ? COLORS.dark.border  : COLORS.cream.border,
        boxShadow:       COLORS.shadows.card,
      }}
    >
      <div
        className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-xl"
        style={{ background: TIER_CONFIG[tier]?.gradient || '' }}
      >
        {TIER_CONFIG[tier]?.emoji}
      </div>
      <p
        className="font-bold capitalize text-sm"
        style={{ color: isDark ? COLORS.dark.text : COLORS.brew.DEFAULT }}
      >
        {tier}
      </p>
      <p
        className="text-xs mt-0.5"
        style={{ color: isDark ? COLORS.dark.muted : COLORS.brew.soft }}
      >
        {config?.minPoints?.toLocaleString()}+ pts
      </p>
      <p className="text-xs font-bold mt-1" style={{ color: COLORS.matcha.DEFAULT }}>
        {config?.discount}% off
      </p>
    </div>
  )
}

const LeaderboardRow = ({ member, index, isDark }) => {
  const rowRef = useRef(null)

  useEffect(() => {
    if (!rowRef.current) return
    gsap.fromTo(
      rowRef.current,
      { opacity: 0, x: 20 },
      { opacity: 1, x: 0, duration: 0.35, delay: 0.1 + index * 0.05, ease: 'power2.out' }
    )
  }, [index])

  const tierColor = COLORS.loyalty[member.tier] ?? { DEFAULT: COLORS.brew.soft }
  const isTop3    = index < 3

  return (
    <div
      ref={rowRef}
      className="flex items-center gap-3 px-4 py-3 transition-colors"
      style={{ borderBottom: `1px solid ${isDark ? COLORS.dark.border : COLORS.cream.border}` }}
    >
      {/* Rank */}
      <div
        className="w-7 text-center font-bold text-sm flex-shrink-0"
        style={{ color: isDark ? COLORS.dark.muted : COLORS.brew.soft }}
      >
        {isTop3 ? RANK_CROWN[index] : `#${index + 1}`}
      </div>

      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
        style={{ background: isTop3 ? tierColor.DEFAULT : (isDark ? COLORS.dark.surface2 : COLORS.cream.deep) }}
      >
        <span style={{ color: isTop3 ? '#fff' : (isDark ? COLORS.dark.muted : COLORS.brew.soft) }}>
          {member.userId?.name?.[0]?.toUpperCase() || 'U'}
        </span>
      </div>

      {/* Name + tier */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: isDark ? COLORS.dark.text : COLORS.brew.DEFAULT }}>
          {member.userId?.name || 'User'}
        </p>
        <p
          className="text-xs capitalize"
          style={{ color: tierColor.DEFAULT ?? (isDark ? COLORS.dark.muted : COLORS.brew.soft) }}
        >
          {member.tier} tier
        </p>
      </div>

      {/* Points */}
      <div className="text-right flex-shrink-0">
        <p className="font-bold text-sm" style={{ color: isDark ? COLORS.dark.text : COLORS.brew.DEFAULT }}>
          {member.points?.toLocaleString()}
        </p>
        <p className="text-[10px]" style={{ color: isDark ? COLORS.dark.muted : COLORS.brew.soft }}>pts</p>
      </div>
    </div>
  )
}

const LoyaltyPanel = () => {
  const { isDark }      = useContext(ThemeContext)
  const [leaderboard, setLeaderboard] = useState([])
  const [config,      setConfig]      = useState(null)
  const [loading,     setLoading]     = useState(true)
  const headerRef = useRef(null)

  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(headerRef.current, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.3 })
    }
    Promise.all([api.get('/loyalty/leaderboard'), api.get('/loyalty/config')])
      .then(([l, c]) => {
        setLeaderboard(l.leaderboard || l.data?.leaderboard || [])
        setConfig(c.config || c.data?.config)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div ref={headerRef}>
        <h2 className="text-xl font-bold" style={{ color: isDark ? COLORS.dark.text : COLORS.brew.DEFAULT }}>
          Loyalty Program
        </h2>
        <p className="text-xs mt-0.5" style={{ color: isDark ? COLORS.dark.muted : COLORS.brew.soft }}>
          {leaderboard.length} active members
        </p>
      </div>

      {/* Tier cards */}
      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ backgroundColor: isDark ? COLORS.dark.surface : COLORS.cream.deep }} />
          ))}
        </div>
      ) : config ? (
        <div className="grid grid-cols-3 gap-3">
          {['bronze', 'silver', 'gold'].map((t, i) => (
            <TierCard key={t} tier={t} config={config[t]} delay={i * 0.08} isDark={isDark} />
          ))}
        </div>
      ) : null}

      {/* Stats row */}
      {!loading && leaderboard.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Gold',   count: leaderboard.filter((m) => m.tier === 'gold').length,   icon: Crown,     color: COLORS.loyalty.gold.DEFAULT   },
            { label: 'Silver', count: leaderboard.filter((m) => m.tier === 'silver').length, icon: Award,     color: COLORS.loyalty.silver.DEFAULT },
            { label: 'Bronze', count: leaderboard.filter((m) => m.tier === 'bronze').length, icon: TrendingUp,color: COLORS.loyalty.bronze.DEFAULT },
          ].map(({ label, count, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-2xl border p-3 text-center"
              style={{
                backgroundColor: isDark ? COLORS.dark.surface : '#fff',
                borderColor:     isDark ? COLORS.dark.border  : COLORS.cream.border,
              }}
            >
              <Icon size={16} color={color} className="mx-auto mb-1" />
              <p className="font-bold text-lg" style={{ color: isDark ? COLORS.dark.text : COLORS.brew.DEFAULT }}>{count}</p>
              <p className="text-[10px]" style={{ color: isDark ? COLORS.dark.muted : COLORS.brew.soft }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          backgroundColor: isDark ? COLORS.dark.surface : '#fff',
          borderColor:     isDark ? COLORS.dark.border  : COLORS.cream.border,
          boxShadow:       COLORS.shadows.card,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-4 py-3 border-b"
          style={{ borderColor: isDark ? COLORS.dark.border : COLORS.cream.border }}
        >
          <Star size={16} color={COLORS.saffron.DEFAULT} />
          <h3 className="font-bold text-sm" style={{ color: isDark ? COLORS.dark.text : COLORS.brew.DEFAULT }}>
            Top Members
          </h3>
          <span
            className="ml-auto text-xs px-2 py-0.5 rounded-full font-bold"
            style={{ backgroundColor: COLORS.saffron.soft, color: COLORS.saffron.dark }}
          >
            Top {Math.min(leaderboard.length, 20)}
          </span>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 rounded-xl animate-pulse" style={{ backgroundColor: isDark ? COLORS.dark.surface2 : COLORS.cream.deep }} />
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-2">
            <Star size={28} color={isDark ? COLORS.dark.muted : COLORS.brew.soft} strokeWidth={1.5} />
            <p className="text-sm font-medium" style={{ color: isDark ? COLORS.dark.muted : COLORS.brew.soft }}>
              No members yet
            </p>
          </div>
        ) : (
          <div className="max-h-96 overflow-auto">
            {leaderboard.map((member, i) => (
              <LeaderboardRow key={member._id ?? i} member={member} index={i} isDark={isDark} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default LoyaltyPanel