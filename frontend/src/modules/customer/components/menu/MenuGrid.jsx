// src/modules/customer/components/menu/MenuGrid.jsx
import { useRef, useEffect }  from 'react'
import MenuCard               from './MenuCard'
import SkeletonMenuCard       from './SkeletonMenuCard'
import gsap                   from 'gsap'

const MenuGrid = ({ items = [], loading = false }) => {
  const gridRef = useRef(null)

  useEffect(() => {
    if (!loading && items.length > 0 && gridRef.current) {
      gsap.fromTo(
        gridRef.current.children,
        { y: 20, opacity: 0 },
        { y: 0,  opacity: 1, stagger: 0.05, duration: 0.35, ease: 'power2.out' }
      )
    }
  }, [loading, items.length])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonMenuCard key={i} />)}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <p className="text-4xl">🍽️</p>
        <p className="text-brew font-semibold">No items found</p>
        <p className="text-brew-soft text-sm">Try a different category or search</p>
      </div>
    )
  }

  return (
    <div ref={gridRef} className="grid grid-cols-2 gap-3">
      {items.map((item) => <MenuCard key={item._id} item={item} />)}
    </div>
  )
}

export default MenuGrid