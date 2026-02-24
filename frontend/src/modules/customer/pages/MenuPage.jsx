// src/modules/customer/pages/MenuPage.jsx
import { useEffect }          from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchMenu, selectFilteredItems, selectCategories,
         selectActiveCategory, selectSearchQuery,
         setActiveCategory, setSearchQuery } from '@store/slices/menuSlice'
import { selectUser }         from '@store/slices/authSlice'
import BottomNav              from '@shared/components/layout/BottomNav'
import RecommendedSection     from '../components/menu/RecommendedSection'
import MenuGrid               from '../components/menu/MenuGrid'
import CategoryPills          from '../components/menu/CategoryPills'
import SearchBar              from '../components/menu/SearchBar'
import BannerSwiper           from '../components/menu/BannerSwiper'
import NotificationBell       from '../components/notifications/NotificationBell'
import CallStatusBanner       from '../components/callwaiter/CallStatusBanner'
import { useRecommendations } from '../hooks/useRecommendations'
import { usePaymentLogoutTrigger } from '../hooks/usePaymentLogoutTrigger'
import { selectCallStatus }   from '@store/slices/callWaiterSlice'
import { COLORS }             from '@colors'

const CAFE_ID = import.meta.env.VITE_CAFE_ID || 'demo'

const MenuPage = () => {
  const dispatch      = useDispatch()
  const user          = useSelector(selectUser)
  const items         = useSelector(selectFilteredItems)
  const categories    = useSelector(selectCategories)
  const activeCategory = useSelector(selectActiveCategory)
  const searchQuery   = useSelector(selectSearchQuery)
  const callStatus    = useSelector(selectCallStatus)

  const { recommendations, weather, loading: recLoading } = useRecommendations(CAFE_ID)

  // Rule 3 — listen for payment confirmed socket event
  usePaymentLogoutTrigger()

  useEffect(() => {
    dispatch(fetchMenu(CAFE_ID))
  }, [dispatch])

  return (
    <div className="customer-container min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur-md
                          border-b border-cream-border px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-brew font-display">
              {user?.name?.split(' ')[0] ? `Hey, ${user.name.split(' ')[0]}! 👋` : 'Menu ☕'}
            </h1>
            {weather && (
              <p className="text-xs text-brew-soft">
                {weather.temp}°C · {weather.city}
              </p>
            )}
          </div>
          <NotificationBell />
        </div>
        <SearchBar
          value={searchQuery}
          onChange={(v) => dispatch(setSearchQuery(v))}
        />
      </header>

      {/* Call waiter status banner */}
      {callStatus !== 'idle' && <CallStatusBanner />}

      <div className="flex-1 overflow-auto pb-bottom-nav">
        {/* Banner carousel */}
        <div className="px-4 pt-3">
          <BannerSwiper />
        </div>

        {/* Smart recommendations */}
        {!searchQuery && (
          <RecommendedSection
            items={recommendations}
            weather={weather}
            loading={recLoading}
          />
        )}

        {/* Category pills */}
        {!searchQuery && (
          <div className="sticky top-[88px] z-20 bg-cream/95 backdrop-blur-md pt-2 pb-1">
            <CategoryPills
              categories={categories}
              active={activeCategory}
              onChange={(c) => dispatch(setActiveCategory(c))}
            />
          </div>
        )}

        {/* Menu grid */}
        <div className="px-4 pt-2 pb-4">
          {searchQuery && (
            <p className="text-sm text-brew-soft mb-3">
              {items.length} result{items.length !== 1 ? 's' : ''} for "{searchQuery}"
            </p>
          )}
          <MenuGrid items={items} />
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

export default MenuPage