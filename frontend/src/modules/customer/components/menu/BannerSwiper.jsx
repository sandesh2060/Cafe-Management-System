// src/modules/customer/components/menu/BannerSwiper.jsx
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import { COLORS } from '@colors'

const BANNERS = [
  {
    id: 1,
    title:    'Monsoon Special ☔',
    subtitle: 'Hot Masala Chai at ₹80',
    bg:       'from-brew to-brew-light',
    emoji:    '☕',
  },
  {
    id: 2,
    title:    'Loyalty Rewards 🌟',
    subtitle: 'Earn points on every order',
    bg:       'from-saffron to-terra',
    emoji:    '⭐',
  },
  {
    id: 3,
    title:    'Fresh Momos 🥟',
    subtitle: 'Steamed & Fried — Try both',
    bg:       'from-matcha to-matcha-dark',
    emoji:    '🥟',
  },
]

const BannerSwiper = () => (
  <Swiper
    modules={[Autoplay, Pagination]}
    autoplay={{ delay: 4000, disableOnInteraction: false }}
    pagination={{ clickable: true }}
    loop
    className="rounded-2xl overflow-hidden"
    style={{ '--swiper-pagination-color': '#FF9F1C' }}
  >
    {BANNERS.map((b) => (
      <SwiperSlide key={b.id}>
        <div className={`bg-gradient-to-r ${b.bg} p-5 h-28 flex items-center gap-4`}>
          <span className="text-5xl select-none">{b.emoji}</span>
          <div>
            <h3 className="text-white font-bold text-base leading-tight">{b.title}</h3>
            <p className="text-white/80 text-sm mt-0.5">{b.subtitle}</p>
          </div>
        </div>
      </SwiperSlide>
    ))}
  </Swiper>
)

export default BannerSwiper