// src/modules/customer/pages/ProfilePage.jsx
import { useSelector }            from 'react-redux'
import { selectUser, selectIsGuest } from '@store/slices/authSlice'
import { selectLoyalty }          from '@store/slices/loyaltySlice'
import BottomNav                  from '@shared/components/layout/BottomNav'
import LogoutButton               from '../components/profile/LogoutButton'
import OrderHistory               from '../components/profile/OrderHistory'
import { COLORS }                 from '@colors'
import { Star, User }             from 'lucide-react'

const TIER_EMOJI = { bronze: '🥉', silver: '🥈', gold: '🥇', none: '☕' }

const ProfilePage = () => {
  const user    = useSelector(selectUser)
  const isGuest = useSelector(selectIsGuest)
  const loyalty = useSelector(selectLoyalty)

  return (
    <div className="customer-container min-h-screen bg-cream flex flex-col">
      <header className="px-4 pt-5 pb-3 sticky top-0 z-20 bg-cream/95 backdrop-blur-md
                          border-b border-cream-border">
        <h1 className="text-2xl font-bold text-brew">Profile</h1>
      </header>

      <div className="flex-1 overflow-auto px-4 pt-4 pb-bottom-nav space-y-4">
        {/* User card */}
        <div className="card flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center
                       text-white text-2xl font-bold flex-shrink-0"
            style={{ background: COLORS.gradients.brand }}
          >
            {isGuest ? <User size={28} /> : (user?.name?.[0]?.toUpperCase() || '?')}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-brew truncate">
              {isGuest ? 'Guest User' : user?.name}
            </h2>
            {!isGuest && user?.email && (
              <p className="text-sm text-brew-soft truncate">{user.email}</p>
            )}
            {isGuest && (
              <p className="text-sm text-brew-soft">Sign in to save your history</p>
            )}
          </div>
        </div>

        {/* Loyalty summary */}
        {!isGuest && (
          <div
            className="card flex items-center justify-between"
            style={{
              background:   COLORS.loyalty[loyalty.tier]?.bg || COLORS.cream.DEFAULT,
              borderColor:  COLORS.loyalty[loyalty.tier]?.DEFAULT || COLORS.cream.border,
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{TIER_EMOJI[loyalty.tier]}</span>
              <div>
                <p className="font-bold text-brew capitalize">{loyalty.tier} Member</p>
                <p className="text-sm text-brew-soft">{loyalty.points} points</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-saffron font-bold">
              <Star size={14} fill={COLORS.saffron.DEFAULT} />
              {loyalty.discountPct}% off
            </div>
          </div>
        )}

        {/* Order history */}
        {!isGuest && <OrderHistory />}

        {/* Logout */}
        <LogoutButton />
      </div>

      <BottomNav />
    </div>
  )
}

export default ProfilePage