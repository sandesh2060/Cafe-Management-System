// src/modules/customer/components/menu/MenuCard.jsx
import { useRef, useEffect, useCallback } from 'react'
import { useDispatch }                    from 'react-redux'
import { addItem }                        from '@store/slices/cartSlice'
import gsap                               from 'gsap'
import { Plus, Flame, Clock, Leaf }       from 'lucide-react'
import toast                              from 'react-hot-toast'

const SPICE_COLOR = [null, '#F59E0B', '#EF4444', '#DC2626']
const SPICE_LABEL = [null, 'Mild', 'Medium', 'Hot']

const MenuCard = ({ item }) => {
  const dispatch  = useDispatch()
  const cardRef   = useRef(null)
  const imgRef    = useRef(null)
  const btnRef    = useRef(null)
  const shineRef  = useRef(null)
  const rippleRef = useRef(null)

  // ── GSAP mouse-tilt (no external dep) ───────────────────────────────────
  useEffect(() => {
    const el = cardRef.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const onMove = (e) => {
      const r = el.getBoundingClientRect()
      const x = ((e.clientX - r.left) / r.width  - 0.5) * 12
      const y = ((e.clientY - r.top)  / r.height - 0.5) * 12
      gsap.to(el, {
        rotateY: x, rotateX: -y,
        duration: 0.4, ease: 'power2.out',
        transformPerspective: 900,
      })
      gsap.to(shineRef.current, {
        opacity: 0.55, x: x * 3.5, y: y * 2,
        duration: 0.4,
      })
    }
    const onLeave = () => {
      gsap.to(el, { rotateY: 0, rotateX: 0, duration: 0.7, ease: 'elastic.out(1,0.45)' })
      gsap.to(shineRef.current, { opacity: 0, duration: 0.5 })
    }
    const onEnter = () => {
      gsap.to(el, { scale: 1.025, duration: 0.3, ease: 'power2.out' })
    }
    const onEnterLeave = () => {
      gsap.to(el, { scale: 1, duration: 0.4, ease: 'elastic.out(1,0.5)' })
    }

    el.addEventListener('mousemove',  onMove)
    el.addEventListener('mouseleave', onLeave)
    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onEnterLeave)
    return () => {
      el.removeEventListener('mousemove',  onMove)
      el.removeEventListener('mouseleave', onLeave)
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onEnterLeave)
    }
  }, [])

  // ── Add with burst animation ─────────────────────────────────────────────
  const handleAdd = useCallback((e) => {
    e.stopPropagation()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!reduced) {
      // Btn spring
      gsap.timeline()
        .to(btnRef.current, { scale: 0.72, duration: 0.09, ease: 'power3.in' })
        .to(btnRef.current, { scale: 1.28, duration: 0.2,  ease: 'back.out(3.5)' })
        .to(btnRef.current, { scale: 1,    duration: 0.3,  ease: 'elastic.out(1,0.4)' })

      // Image hop
      gsap.to(imgRef.current, {
        y: -7, duration: 0.16, ease: 'power3.out',
        yoyo: true, repeat: 1,
      })

      // Ripple expand
      if (rippleRef.current) {
        gsap.fromTo(rippleRef.current,
          { scale: 0, opacity: 0.45 },
          { scale: 3.5, opacity: 0, duration: 0.6, ease: 'power2.out' }
        )
      }
    }

    dispatch(addItem({
      menuItemId: item._id, name: item.name,
      price: item.price, emoji: item.emoji,
      category: item.category, quantity: 1,
    }))
    toast.success(`${item.emoji} Added!`, {
      duration: 1300,
      style: { fontSize: '13px', padding: '8px 14px', borderRadius: '12px' },
    })
  }, [dispatch, item])

  const isBest = item.tags?.includes('bestseller')
  const isNew  = item.tags?.includes('new')

  return (
    <div ref={cardRef}
      className="mc relative flex flex-col overflow-hidden rounded-[18px] will-change-transform"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        boxShadow: '0 2px 14px rgba(92,51,23,0.07), 0 1px 0 rgba(255,255,255,0.5) inset',
        transformStyle: 'preserve-3d',
      }}>

      {/* ── Image zone ───────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ height: '122px' }}>
        {/* Bg for emoji cards */}
        <div className="absolute inset-0" style={{ background: 'var(--bg-surface-3)' }}/>

        {item.image ? (
          <img ref={imgRef} src={item.image} alt={item.name}
            className="absolute inset-0 w-full h-full object-cover will-change-transform"
            loading="lazy"/>
        ) : (
          <div ref={imgRef}
            className="absolute inset-0 flex items-center justify-center text-5xl will-change-transform">
            {item.emoji}
          </div>
        )}

        {/* Tilt shine */}
        <div ref={shineRef}
          className="absolute inset-0 pointer-events-none opacity-0"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.22) 0%, transparent 62%)',
          }}/>

        {/* Bottom fade into card */}
        <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
          style={{ background: 'linear-gradient(to top, var(--bg-surface), transparent)' }}/>

        {/* Badges — top left */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isBest && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg
                             text-[9px] font-black uppercase tracking-wide text-white"
              style={{ background: 'linear-gradient(135deg,#FF9F1C,#E05C2A)',
                       boxShadow: '0 2px 6px rgba(255,159,28,0.4)' }}>
              <Flame size={7} strokeWidth={3}/> Best
            </span>
          )}
          {isNew && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg
                             text-[9px] font-black uppercase tracking-wide text-white"
              style={{ background: 'linear-gradient(135deg,#2D9B5A,#38C26F)',
                       boxShadow: '0 2px 6px rgba(45,155,90,0.4)' }}>
              New
            </span>
          )}
        </div>

        {/* Veg dot — top right */}
        <div className="absolute top-2 right-2 w-4 h-4 rounded flex items-center justify-center"
          style={{
            border: `1.5px solid ${item.isVeg ? '#2D9B5A' : '#DC2626'}`,
            background: 'rgba(255,255,255,0.92)',
          }}>
          <div className="w-2 h-2 rounded-full"
            style={{ background: item.isVeg ? '#2D9B5A' : '#DC2626' }}/>
        </div>
      </div>

      {/* ── Info zone ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5 p-2.5 flex-1">
        <h3 className="text-xs font-bold leading-tight line-clamp-2"
          style={{ color: 'var(--text-primary)' }}>
          {item.name}
        </h3>

        {/* Meta pills row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-0.5 text-[9px] font-medium"
            style={{ color: 'var(--text-muted)' }}>
            <Clock size={8} strokeWidth={2}/> {item.preparationTimeMinutes}m
          </span>
          {item.spiceLevel > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold"
              style={{ color: SPICE_COLOR[item.spiceLevel] }}>
              <Flame size={8} strokeWidth={2.5}/> {SPICE_LABEL[item.spiceLevel]}
            </span>
          )}
          {item.isVeg && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold"
              style={{ color: '#2D9B5A' }}>
              <Leaf size={8} strokeWidth={2.5}/> Veg
            </span>
          )}
        </div>

        {/* Price + Add */}
        <div className="flex items-center justify-between mt-auto pt-0.5">
          <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
            ₹{item.price}
          </span>

          <div className="relative">
            {/* Ripple */}
            <div ref={rippleRef}
              className="absolute inset-0 rounded-xl pointer-events-none opacity-0"
              style={{ background: 'rgba(255,159,28,0.35)', transformOrigin: 'center' }}/>
            <button ref={btnRef} onClick={handleAdd}
              className="relative w-8 h-8 rounded-xl flex items-center justify-center
                         text-white will-change-transform"
              style={{
                background: 'linear-gradient(135deg,#FF9F1C,#E05C2A)',
                boxShadow: '0 3px 12px rgba(255,159,28,0.45)',
                minWidth: 'unset', minHeight: 'unset',
              }}
              aria-label={`Add ${item.name} to cart`}>
              <Plus size={15} strokeWidth={3}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MenuCard