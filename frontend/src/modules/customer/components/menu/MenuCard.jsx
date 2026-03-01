// src/modules/customer/components/menu/MenuCard.jsx
import { useRef, useEffect, useCallback, useContext } from 'react'
import { useDispatch, useSelector }                   from 'react-redux'
import { addItem }                                    from '@store/slices/cartSlice'
import { ThemeContext }                               from '@shared/context/ThemeContext'
import gsap                                           from 'gsap'
import { Plus, Flame, Clock, Leaf }                   from 'lucide-react'
import toast                                          from 'react-hot-toast'

const SPICE_COLOR = [null, '#F59E0B', '#EF4444', '#DC2626']
const SPICE_LABEL = [null, 'Mild', 'Medium', 'Hot']

const selectItemQty = (itemId) => (state) => {
  const cartItems = state.cart?.items ?? []
  return cartItems
    .filter(i => i.menuItemId === itemId)
    .reduce((sum, i) => sum + (i.quantity ?? 1), 0)
}

const MenuCard = ({ item }) => {
  const dispatch  = useDispatch()
  const qty       = useSelector(selectItemQty(item._id))
  const { isDark: D } = useContext(ThemeContext)

  const cardRef   = useRef(null)
  const imgRef    = useRef(null)
  const btnRef    = useRef(null)
  const shineRef  = useRef(null)
  const rippleRef = useRef(null)
  const badgeRef  = useRef(null)
  const prevQty   = useRef(qty)

  /* ── Badge pop on qty increase ────────────────────────────────────── */
  useEffect(() => {
    if (!badgeRef.current || qty === 0) return
    if (qty > prevQty.current) {
      gsap.fromTo(badgeRef.current,
        { scale: 1.7, opacity: 0.5 },
        { scale: 1, opacity: 1, duration: 0.4, ease: 'elastic.out(1.2, 0.5)' }
      )
    }
    prevQty.current = qty
  }, [qty])

  /* ── 3D tilt on hover (desktop) ───────────────────────────────────── */
  useEffect(() => {
    const el = cardRef.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const onMove = (e) => {
      const r = el.getBoundingClientRect()
      const x = ((e.clientX - r.left)  / r.width  - 0.5) * 11
      const y = ((e.clientY - r.top)   / r.height - 0.5) * 11
      gsap.to(el, {
        rotateY: x, rotateX: -y,
        duration: 0.38, ease: 'power2.out',
        transformPerspective: 900, force3D: true,
      })
      if (shineRef.current) {
        gsap.to(shineRef.current, {
          opacity: 0.5, x: x * 3, y: y * 1.8,
          duration: 0.38,
        })
      }
    }

    const onLeave = () => {
      gsap.to(el, {
        rotateY: 0, rotateX: 0, scale: 1,
        duration: 0.65, ease: 'elastic.out(1, 0.45)',
        force3D: true,
      })
      if (shineRef.current) {
        gsap.to(shineRef.current, { opacity: 0, duration: 0.4 })
      }
    }

    const onEnter = () => {
      gsap.to(el, { scale: 1.022, duration: 0.28, ease: 'power2.out', force3D: true })
    }

    el.addEventListener('mousemove',  onMove)
    el.addEventListener('mouseleave', onLeave)
    el.addEventListener('mouseenter', onEnter)
    return () => {
      el.removeEventListener('mousemove',  onMove)
      el.removeEventListener('mouseleave', onLeave)
      el.removeEventListener('mouseenter', onEnter)
    }
  }, [])

  /* ── Add to cart ──────────────────────────────────────────────────── */
  const handleAdd = useCallback((e) => {
    e.stopPropagation()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!reduced) {
      gsap.timeline()
        .to(btnRef.current, { scale: 0.7,  duration: 0.08, ease: 'power3.in' })
        .to(btnRef.current, { scale: 1.3,  duration: 0.19, ease: 'back.out(3.5)' })
        .to(btnRef.current, { scale: 1,    duration: 0.28, ease: 'elastic.out(1, 0.4)' })

      if (imgRef.current) {
        gsap.to(imgRef.current, {
          y: -8, duration: 0.15,
          ease: 'power3.out', yoyo: true, repeat: 1,
        })
      }

      if (rippleRef.current) {
        gsap.fromTo(rippleRef.current,
          { scale: 0, opacity: 0.4 },
          { scale: 3.8, opacity: 0, duration: 0.55, ease: 'power2.out' }
        )
      }
    }

    dispatch(addItem({
      menuItemId: item._id,
      name:       item.name,
      price:      item.price,
      emoji:      item.emoji,
      category:   item.category,
      quantity:   1,
    }))

    toast.success(`${item.emoji || '✅'} Added!`, {
      duration: 1400,
      style: {
        fontSize:     '13px',
        padding:      '9px 14px',
        borderRadius: '12px',
        fontFamily:   '"Plus Jakarta Sans", system-ui, sans-serif',
        fontWeight:   600,
      },
    })
  }, [dispatch, item])

  const isBest = item.tags?.includes('bestseller')
  const isNew  = item.tags?.includes('new')

  return (
    <article
      ref={cardRef}
      className="mc"
      aria-label={item.name}
      style={{
        position:       'relative',
        display:        'flex',
        flexDirection:  'column',
        overflow:       'hidden',
        borderRadius:   18,
        background:     'var(--bg-surface)',
        border:         '1px solid var(--border-color)',
        boxShadow:      D
          ? '0 2px 16px rgba(0,0,0,0.38), 0 1px 0 rgba(255,255,255,0.04) inset'
          : '0 2px 12px rgba(92,51,23,0.07), 0 1px 0 rgba(255,255,255,0.7) inset',
        transformStyle: 'preserve-3d',
        willChange:     'transform',
        transition:     'box-shadow var(--transition-base), border-color var(--transition-theme)',
      }}
    >

      {/* ── Image zone ──────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', height: 120 }}>

        <div style={{
          position: 'absolute', inset: 0,
          background: 'var(--bg-surface-3)',
          transition: 'background var(--transition-theme)',
        }} />

        {item.image ? (
          <img
            ref={imgRef}
            src={item.image}
            alt={item.name}
            loading="lazy"
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              willChange: 'transform',
            }}
          />
        ) : (
          <div
            ref={imgRef}
            aria-hidden="true"
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 46, lineHeight: 1,
              willChange: 'transform',
            }}
          >
            {item.emoji}
          </div>
        )}

        <div
          ref={shineRef}
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            pointerEvents: 'none', opacity: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.2) 0%, transparent 60%)',
          }}
        />

        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
          pointerEvents: 'none',
          background: 'linear-gradient(to top, var(--bg-surface), transparent)',
          transition: 'background var(--transition-theme)',
        }} />

        {/* ── Badges — top left ── */}
        <div style={{
          position: 'absolute', top: 8, left: 8,
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {isBest && (
            <span
              aria-label="Bestseller"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 2,
                padding: '2px 6px', borderRadius: 7,
                fontSize: 9, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                color: '#fff',
                background: 'linear-gradient(135deg, #FF9F1C, #E05C2A)',
                boxShadow: '0 2px 8px rgba(255,130,0,0.4)',
                fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
              }}
            >
              <Flame size={7} strokeWidth={3} aria-hidden="true" /> Best
            </span>
          )}
          {isNew && (
            <span
              aria-label="New item"
              style={{
                padding: '2px 6px', borderRadius: 7,
                fontSize: 9, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                color: '#fff',
                background: 'linear-gradient(135deg, #2D9B5A, #38C26F)',
                boxShadow: '0 2px 8px rgba(45,155,90,0.4)',
                fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
              }}
            >
              New
            </span>
          )}
        </div>

        {/* ── Veg/non-veg indicator — top right ── */}
        <div
          aria-label={item.isVeg ? 'Vegetarian' : 'Non-vegetarian'}
          style={{
            position: 'absolute', top: 8, right: 8,
            width: 16, height: 16, borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1.5px solid ${item.isVeg ? '#2D9B5A' : '#DC2626'}`,
            background: 'rgba(255,255,255,0.94)',
          }}
        >
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: item.isVeg ? '#2D9B5A' : '#DC2626',
          }} />
        </div>
      </div>

      {/* ── Info zone ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 5,
        padding: '10px 10px 11px', flex: 1,
      }}>

        {/* Item name — Plus Jakarta Sans */}
        <h3 style={{
          margin: 0,
          fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
          fontSize: 'clamp(13px, 3.2vw, 15px)',
          fontWeight: 700,
          lineHeight: 1.25,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          transition: 'color var(--transition-theme)',
        }}>
          {item.name}
        </h3>

        {/* Meta row — Plus Jakarta Sans */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: 6, flexWrap: 'wrap',
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 2,
            fontSize: 9, fontWeight: 500,
            color: 'var(--text-muted)',
            fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
            transition: 'color var(--transition-theme)',
          }}>
            <Clock size={8} strokeWidth={2} aria-hidden="true" />
            {item.preparationTimeMinutes}m
          </span>

          {item.spiceLevel > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              fontSize: 9, fontWeight: 600,
              color: SPICE_COLOR[item.spiceLevel],
              fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
            }}>
              <Flame size={8} strokeWidth={2.5} aria-hidden="true" />
              {SPICE_LABEL[item.spiceLevel]}
            </span>
          )}

          {item.isVeg && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              fontSize: 9, fontWeight: 600,
              color: '#2D9B5A',
              fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
            }}>
              <Leaf size={8} strokeWidth={2.5} aria-hidden="true" />
              Veg
            </span>
          )}
        </div>

        {/* Price + Add button */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 'auto', paddingTop: 2,
        }}>

          {/* Price — Plus Jakarta Sans */}
          <span style={{
            fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
            fontSize: 'clamp(15px, 3.6vw, 17px)',
            fontWeight: 800,
            letterSpacing: '0em',
            color: 'var(--text-primary)',
            transition: 'color var(--transition-theme)',
          }}>
            Rs {item.price}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>

            {/* Qty badge */}
            {qty > 0 && (
              <div
                ref={badgeRef}
                aria-label={`${qty} in cart`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  padding: '3px 7px', borderRadius: 99,
                  background: D
                    ? 'rgba(255,159,28,0.12)'
                    : 'rgba(255,159,28,0.08)',
                  border: '1px solid rgba(255,159,28,0.28)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path
                    d="M1 1h1.5l1 4.5h4L9 3H3.5"
                    stroke="#FF9F1C" strokeWidth="1.4"
                    strokeLinecap="round" strokeLinejoin="round"
                  />
                  <circle cx="5.5" cy="8.5" r="0.8" fill="#FF9F1C" />
                  <circle cx="7.5" cy="8.5" r="0.8" fill="#FF9F1C" />
                </svg>
                <span style={{
                  fontSize: 10, fontWeight: 700, lineHeight: 1,
                  color: 'var(--color-saffron)',
                  fontFamily: '"DM Mono", monospace',
                  minWidth: 7, textAlign: 'center',
                }}>
                  {qty}
                </span>
              </div>
            )}

            {/* Add button */}
            <div style={{ position: 'relative' }}>
              <div
                ref={rippleRef}
                aria-hidden="true"
                style={{
                  position: 'absolute', inset: 0,
                  borderRadius: 11,
                  pointerEvents: 'none', opacity: 0,
                  background: 'rgba(255,159,28,0.32)',
                  transformOrigin: 'center',
                }}
              />
              <button
                ref={btnRef}
                onClick={handleAdd}
                className="btn-compact"
                aria-label={`Add ${item.name} to cart`}
                style={{
                  width: 32, height: 32,
                  borderRadius: 11, border: 'none',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #FF9F1C 0%, #E05C2A 100%)',
                  boxShadow: qty > 0
                    ? '0 3px 14px rgba(255,130,0,0.55)'
                    : '0 3px 12px rgba(255,130,0,0.38)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff',
                  willChange: 'transform',
                  transition: 'box-shadow 0.2s ease',
                }}
              >
                <Plus size={15} strokeWidth={3} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

export default MenuCard