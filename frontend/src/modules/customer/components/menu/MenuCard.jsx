// src/modules/customer/components/menu/MenuCard.jsx
import { useRef, useEffect }  from 'react'
import { useDispatch }        from 'react-redux'
import { addItem }            from '@store/slices/cartSlice'
import VanillaTilt            from 'vanilla-tilt'
import { COLORS }             from '@colors'
import { Plus }               from 'lucide-react'
import toast                  from 'react-hot-toast'

const SPICE_DOT = ['', '🌶', '🌶🌶', '🌶🌶🌶']

const MenuCard = ({ item }) => {
  const dispatch = useDispatch()
  const tiltRef  = useRef(null)

  useEffect(() => {
    if (!tiltRef.current) return
    VanillaTilt.init(tiltRef.current, {
      max:        8,
      speed:      400,
      glare:      false,
      gyroscope:  true,   // Touch/mobile tilt
      perspective: 1000,
    })
    return () => tiltRef.current?.vanillaTilt?.destroy()
  }, [])

  const handleAdd = () => {
    dispatch(addItem({
      menuItemId: item._id,
      name:       item.name,
      price:      item.price,
      emoji:      item.emoji,
      category:   item.category,
      quantity:   1,
    }))
    toast.success(`${item.emoji} Added to cart`, { duration: 1500 })
  }

  return (
    <div
      ref={tiltRef}
      className="bg-white rounded-2xl overflow-hidden shadow-card border border-cream-border
                 flex flex-col transition-shadow duration-200 hover:shadow-card-hover"
    >
      {/* Image / emoji */}
      <div className="relative bg-cream-dark h-28 flex items-center justify-center">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-4xl select-none">{item.emoji}</span>
        )}

        {/* Tags */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {item.tags?.includes('bestseller') && (
            <span className="badge bg-saffron text-white text-[9px] px-1.5 py-0.5">
              🔥 Best
            </span>
          )}
          {item.tags?.includes('new') && (
            <span className="badge bg-matcha text-white text-[9px] px-1.5 py-0.5">
              New
            </span>
          )}
          {item.isVeg && (
            <span className="w-4 h-4 rounded border-2 border-matcha flex items-center
                             justify-center bg-white">
              <span className="w-2 h-2 rounded-full bg-matcha block" />
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5 flex flex-col gap-1 flex-1">
        <h3 className="text-xs font-bold text-brew leading-tight line-clamp-2">
          {item.name}
        </h3>
        {item.spiceLevel > 0 && (
          <span className="text-[10px] text-brew-soft">{SPICE_DOT[item.spiceLevel]}</span>
        )}

        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="text-sm font-bold text-brew">₹{item.price}</span>
          <button
            onClick={handleAdd}
            className="w-7 h-7 rounded-full flex items-center justify-center
                       text-white active:scale-90 transition-transform"
            style={{ backgroundColor: COLORS.saffron.DEFAULT }}
            aria-label={`Add ${item.name} to cart`}
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default MenuCard