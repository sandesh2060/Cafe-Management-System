// src/modules/customer/components/menu/RecommendedSection.jsx
import { useRef, useEffect }   from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { FreeMode }            from 'swiper/modules'
import gsap                    from 'gsap'
import RecommendedCard         from './RecommendedCard'
import 'swiper/css'
import 'swiper/css/free-mode'

const SkeletonRecCard = () => (
  <div
    className="w-36 rounded-2xl overflow-hidden flex-shrink-0 animate-pulse"
    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
  >
    <div className="h-24" style={{ background: 'var(--bg-surface-2)' }} />
    <div className="p-2.5 space-y-2">
      <div className="h-2.5 rounded-full w-3/4" style={{ background: 'var(--bg-surface-2)' }} />
      <div className="h-2.5 rounded-full w-1/2" style={{ background: 'var(--bg-surface-2)' }} />
      <div className="flex justify-between items-center pt-1">
        <div className="h-3.5 w-10 rounded-full" style={{ background: 'var(--bg-surface-2)' }} />
        <div className="w-6 h-6 rounded-xl" style={{ background: 'var(--bg-surface-2)' }} />
      </div>
    </div>
  </div>
)

const WEATHER_ICONS = {
  sunny: '☀️', hot: '🌡️', rainy: '🌧️',
  cold: '❄️', cloudy: '☁️', windy: '💨',
}

const RecommendedSection = ({ items = [], weather, loading }) => {
  const sectionRef = useRef(null)
  const headerRef  = useRef(null)

  useEffect(() => {
    if (loading || !items.length || !sectionRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    gsap.fromTo(headerRef.current,
      { x: -16, opacity: 0 },
      { x: 0,   opacity: 1, duration: 0.45, ease: 'power3.out', delay: 0.1 }
    )
  }, [loading, items.length])

  if (!loading && !items.length) return null

  return (
    <section ref={sectionRef} className="mt-5">
      {/* Header */}
      <div
        ref={headerRef}
        className="px-4 flex items-center justify-between mb-3"
      >
        <div className="flex items-center gap-2">
          <div
            className="w-1 h-4 rounded-full"
            style={{ background: 'linear-gradient(180deg,#FF9F1C,#E05C2A)' }}
          />
          <h2
            className="text-sm font-black"
            style={{ color: 'var(--text-primary)', fontFamily: '"Baloo 2",sans-serif' }}
          >
            Recommended for You
          </h2>
          <span className="text-base leading-none">✨</span>
        </div>

        {weather && (
          <span
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: 'var(--bg-surface-2)',
              color:      'var(--text-muted)',
              border:     '1px solid var(--border-color)',
            }}
          >
            {WEATHER_ICONS[weather.condition] || '🌤️'}
            <span>{weather.temp}°C</span>
          </span>
        )}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide">
          {[1, 2, 3].map(i => <SkeletonRecCard key={i} />)}
        </div>
      ) : (
        <Swiper
          modules={[FreeMode]}
          freeMode={{ enabled: true, momentum: true, momentumRatio: 0.6 }}
          slidesPerView="auto"
          spaceBetween={12}
          slidesOffsetBefore={16}
          slidesOffsetAfter={16}
          className="!overflow-visible"
        >
          {items.map((rec, i) => (
            <SwiperSlide key={rec.item?._id ?? i} style={{ width: 'auto' }}>
              <RecommendedCard rec={rec} index={i} />
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </section>
  )
}

export default RecommendedSection