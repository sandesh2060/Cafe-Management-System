// src/modules/customer/components/menu/MenuGrid.jsx
import { useRef, useEffect } from 'react'
import gsap                  from 'gsap'
import MenuCard              from './MenuCard'
import SkeletonMenuCard      from './SkeletonMenuCard'

const MenuGrid = ({ items = [], loading = false }) => {
  const gridRef = useRef(null)

  useEffect(() => {
    if (loading || !items.length || !gridRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    const cards = gridRef.current.querySelectorAll('.mc')
    if (!cards.length) return

    gsap.fromTo(cards,
      { y: 32, opacity: 0, scale: 0.93 },
      { y: 0,  opacity: 1, scale: 1,
        duration: 0.42, stagger: 0.065,
        ease: 'power2.out', clearProps: 'transform' }
    )
  }, [loading, items.length])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonMenuCard key={i} delay={i * 80} />
        ))}
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
          style={{ background: 'var(--bg-surface-2)' }}
        >
          🍽️
        </div>
        <div>
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            Nothing here yet
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Try a different category or search
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={gridRef} className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <MenuCard key={item._id} item={item} />
      ))}
    </div>
  )
}

export default MenuGrid