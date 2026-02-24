// src/modules/customer/components/menu/CategoryPills.jsx
import { useRef } from 'react'
import { COLORS } from '@colors'

const CATEGORY_LABELS = {
  all:         'All',
  hot_drinks:  '☕ Hot',
  cold_drinks: '🧋 Cold',
  snacks:      '🥐 Snacks',
  meals:       '🍛 Meals',
  soups:       '🍲 Soups',
  dessert:     '🍰 Dessert',
  light_food:  '🥪 Light',
  fresh_juice: '🍹 Juice',
  smoothies:   '🥤 Smoothie',
  tea:         '🍵 Tea',
  coffee:      '☕ Coffee',
}

const CategoryPills = ({ categories = [], active = 'all', onChange }) => {
  const scrollRef = useRef(null)

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-1"
    >
      {categories.map((cat) => {
        const isActive = cat === active
        const label    = CATEGORY_LABELS[cat] || cat.replace(/_/g, ' ')
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold
                       transition-all duration-150 active:scale-95 min-h-[36px]
                       capitalize whitespace-nowrap"
            style={isActive
              ? { backgroundColor: COLORS.saffron.DEFAULT, color: '#fff' }
              : { backgroundColor: COLORS.cream.dark, color: COLORS.brew.light }
            }
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export default CategoryPills