// src/modules/customer/components/menu/RecommendedCard.jsx
import { useRef, useEffect, useCallback } from 'react'
import { useDispatch }                    from 'react-redux'
import { addItem }                        from '@store/slices/cartSlice'
import gsap                               from 'gsap'
import { Plus, Star, Sparkles }           from 'lucide-react'
import toast                              from 'react-hot-toast'

const RecommendedCard = ({ rec, index = 0 }) => {
  const { item, weatherTag, isFavourite, isDiscovery } = rec ?? {}
  const dispatch  = useDispatch()
  const cardRef   = useRef(null)
  const btnRef    = useRef(null)

  // Staggered entrance
  useEffect(() => {
    if (!cardRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    gsap.fromTo(cardRef.current,
      { y: 20, opacity: 0, scale: 0.9 },
      { y: 0,  opacity: 1, scale: 1,
        duration: 0.42, delay: index * 0.08,
        ease: 'back.out(1.6)', clearProps: 'transform' }
    )
  }, [index])

  const handleAdd = useCallback((e) => {
    e.stopPropagation()
    if (!item) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!reduced && btnRef.current) {
      gsap.timeline()
        .to(btnRef.current, { scale: 0.75, duration: 0.1 })
        .to(btnRef.current, { scale: 1.3,  duration: 0.2, ease: 'back.out(3)' })
        .to(btnRef.current, { scale: 1,    duration: 0.25, ease: 'elastic.out(1,0.5)' })
    }

    dispatch(addItem({
      menuItemId: item._id,
      name:       item.name,
      price:      item.price,
      emoji:      item.emoji,
      category:   item.category,
      quantity:   1,
    }))
    toast.success(`${item.emoji} Added!`, { duration: 1400, style: { fontSize: '13px' } })
  }, [dispatch, item])

  if (!item) return null

  return (
    <div
      ref={cardRef}
      className="w-[140px] flex flex-col rounded-2xl overflow-hidden opacity-0"
      style={{
        background: 'var(--bg-surface)',
        border:     '1px solid var(--border-color)',
        boxShadow:  '0 2px 12px rgba(92,51,23,0.06)',
      }}
    >
      {/* Image */}
      <div
        className="relative h-[96px] flex items-center justify-center overflow-hidden"
        style={{ background: 'var(--bg-surface-2)' }}
      >
        {item.image ? (
          <img
            src={item.image} alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-4xl">{item.emoji}</span>
        )}

        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none"
          style={{ background: 'linear-gradient(to top, var(--bg-surface), transparent)' }}
        />

        {/* Badge */}
        {isFavourite && (
          <div
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full
                       flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#FF9F1C,#E05C2A)' }}
          >
            <Star size={10} color="#fff" fill="#fff" />
          </div>
        )}
        {isDiscovery && !isFavourite && (
          <div
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full
                       flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#2D9B5A,#38C26F)' }}
          >
            <Sparkles size={9} color="#fff" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 flex flex-col gap-1 flex-1">
        {/* Weather tag */}
        {weatherTag && (
          <span
            className="self-start text-[8px] font-bold px-1.5 py-0.5 rounded-md leading-none"
            style={{
              background: 'var(--bg-surface-2)',
              color:      'var(--color-saffron)',
              border:     '1px solid var(--border-color)',
            }}
          >
            {weatherTag}
          </span>
        )}

        {/* Name */}
        <p
          className="text-[11px] font-bold leading-tight line-clamp-2"
          style={{ color: 'var(--text-primary)' }}
        >
          {item.name}
        </p>

        {/* Price + Add */}
        <div className="flex items-center justify-between mt-auto pt-0.5">
          <span
            className="text-xs font-black"
            style={{ color: 'var(--text-primary)' }}
          >
            ₹{item.price}
          </span>
          <button
            ref={btnRef}
            onClick={handleAdd}
            className="w-7 h-7 rounded-xl flex items-center justify-center text-white"
            style={{
              background: 'linear-gradient(135deg,#FF9F1C,#E05C2A)',
              boxShadow:  '0 2px 8px rgba(255,159,28,0.38)',
              minWidth: 'unset', minHeight: 'unset',
            }}
            aria-label={`Add ${item.name}`}
          >
            <Plus size={13} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default RecommendedCard