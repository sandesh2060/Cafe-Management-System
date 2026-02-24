// src/modules/customer/components/menu/CategoryPills.jsx
import { useRef, useEffect, useLayoutEffect } from 'react'
import gsap                                    from 'gsap'

const LABELS = {
  all:          '✦ All',
  hot_drinks:   '☕ Hot',
  cold_drinks:  '🧋 Cold',
  snacks:       '🥐 Snacks',
  meals:        '🍛 Meals',
  soups:        '🍲 Soups',
  dessert:      '🍰 Dessert',
  light_food:   '🥪 Light',
  fresh_juice:  '🍹 Juice',
  smoothies:    '🥤 Smoothie',
  comfort_food: '🫕 Comfort',
  tea:          '🍵 Tea',
  coffee:       '☕ Coffee',
}

const CategoryPills = ({ categories = [], active = 'all', onChange }) => {
  const scrollRef    = useRef(null)
  const indicatorRef = useRef(null)
  const activeRef    = useRef(null)

  // Animate sliding indicator under active pill
  useLayoutEffect(() => {
    if (!indicatorRef.current || !activeRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const pill = activeRef.current
    const wrap = scrollRef.current
    const ind  = indicatorRef.current

    const pillRect = pill.getBoundingClientRect()
    const wrapRect = wrap.getBoundingClientRect()
    const left     = pillRect.left - wrapRect.left + wrap.scrollLeft

    if (reduced) {
      gsap.set(ind, { x: left, width: pillRect.width, opacity: 1 })
    } else {
      gsap.to(ind, {
        x: left, width: pillRect.width,
        duration: 0.38, ease: 'power3.out',
        opacity: 1,
      })
    }

    // Scroll active pill into view
    pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [active, categories])

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="relative flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-1"
      >
        {/* Sliding indicator */}
        <div
          ref={indicatorRef}
          className="absolute bottom-1 h-[2px] rounded-full opacity-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg,#FF9F1C,#E05C2A)',
            boxShadow:  '0 0 6px rgba(255,159,28,0.5)',
          }}
        />

        {categories.map((cat) => {
          const isActive = cat === active
          const label    = LABELS[cat] || cat.replace(/_/g, ' ')

          return (
            <button
              key={cat}
              ref={isActive ? activeRef : null}
              onClick={() => onChange(cat)}
              className="relative flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold
                         transition-colors duration-200 active:scale-95 whitespace-nowrap
                         min-h-[36px] capitalize"
              style={isActive ? {
                background: 'linear-gradient(135deg,#FF9F1C,#E05C2A)',
                color:      '#fff',
                boxShadow:  '0 3px 12px rgba(255,159,28,0.35)',
              } : {
                background: 'var(--bg-surface-2)',
                color:      'var(--text-muted)',
                border:     '1px solid var(--border-color)',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default CategoryPills