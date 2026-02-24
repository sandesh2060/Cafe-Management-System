// src/modules/customer/components/menu/RecommendedSection.jsx
import { Swiper, SwiperSlide } from 'swiper/react'
import { FreeMode }             from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/free-mode'
import RecommendedCard          from './RecommendedCard'
import SkeletonMenuCard         from './SkeletonMenuCard'

const RecommendedSection = ({ items = [], weather, loading }) => {
  if (!loading && items.length === 0) return null

  return (
    <section className="mt-4">
      <div className="px-4 flex items-center justify-between mb-2">
        <h2 className="text-base font-bold text-brew">
          ✨ Recommended for You
        </h2>
        {weather && (
          <span className="text-xs text-brew-soft">
            {weather.temp}°C · {weather.city}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-36">
              <SkeletonMenuCard />
            </div>
          ))}
        </div>
      ) : (
        <Swiper
          modules={[FreeMode]}
          freeMode
          slidesPerView="auto"
          spaceBetween={12}
          className="px-4"
        >
          {items.map((item) => (
            <SwiperSlide key={item._id} style={{ width: 'auto' }}>
              <RecommendedCard item={item} weather={weather} />
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </section>
  )
}

export default RecommendedSection