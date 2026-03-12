// src/modules/customer/pages/ItemDetailPage.jsx
// Route: /menu/item/:id
//
// FEATURES:
//  • Full item detail with hero image / emoji fallback
//  • Portions picker (real DB portions) or fallback size group
//  • Extras + spice level customisation
//  • Qty stepper with GSAP micro-animations
//  • Add to Cart → CartDrawer slides up immediately
//  • Reviews — real backend data via useReviews hook
//      - Summary card (avg + distribution bars from backend aggregate)
//      - Paginated review list with Load More
//      - Post / Edit / Delete own review (star picker + textarea)
//      - Like toggle (optimistic via Redux)
//  • Loyalty points preview (tier-aware, hidden for guests)
//  • Similar items horizontal swiper
//  • All fixed elements portalled to document.body

import {
  useEffect, useRef, useCallback, useContext,
  useState, useMemo, useLayoutEffect,
} from 'react'
import { createPortal }                       from 'react-dom'
import { useParams, useNavigate }             from 'react-router-dom'
import { useDispatch, useSelector }           from 'react-redux'
import gsap                                   from 'gsap'
import { ScrollTrigger }                      from 'gsap/ScrollTrigger'
import {
  ArrowLeft, Plus, Minus, Flame, Clock, Leaf,
  ChevronRight, ShoppingCart, Check, Sparkles,
  Shield, Star, ThumbsUp, Zap, ChefHat,
  Heart, Pencil, Trash2, X, Loader2,
  Send, RotateCcw,
} from 'lucide-react'
import { Swiper, SwiperSlide }                from 'swiper/react'
import { FreeMode }                           from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/free-mode'

import {
  addItem,
  selectCartItems,
  selectCartCount,
} from '@store/slices/cartSlice'
import { selectAllItems }               from '@store/slices/menuSlice'
import { selectUser, selectIsGuest }    from '@store/slices/authSlice'
import { selectTier, selectPoints }     from '@store/slices/loyaltySlice'
import { ThemeContext }                 from '@shared/context/ThemeContext'
import CartDrawer                       from '../components/cart/CartDrawer'
import { useLenis }                     from 'lenis/react'
import useReviews                       from '../hooks/useReviews'

gsap.registerPlugin(ScrollTrigger)

// ─── Constants ────────────────────────────────────────────────────────────────
const SPICE_LABEL = [null, 'Mild', 'Medium', 'Hot']
const SPICE_COLOR = [null, '#F59E0B', '#F97316', '#EF4444']

const STATIC_EXTRA_GROUPS = [
  {
    id: 'extras', label: 'Add Extras', required: false, type: 'multi',
    options: [
      { id: 'extra_sauce',   label: 'Extra Sauce',   priceDelta: 20, emoji: '🔥' },
      { id: 'extra_cheese',  label: 'Extra Cheese',  priceDelta: 40, emoji: '🧀' },
      { id: 'extra_topping', label: 'Extra Topping', priceDelta: 30, emoji: '🥗' },
    ],
  },
  {
    id: 'spice', label: 'Spice Level', required: false, type: 'single',
    options: [
      { id: 'mild',   label: 'Mild',   emoji: '😊', priceDelta: 0 },
      { id: 'medium', label: 'Medium', emoji: '🌶️', priceDelta: 0 },
      { id: 'hot',    label: 'Hot',    emoji: '🔥', priceDelta: 0 },
    ],
  },
]

const FALLBACK_SIZE_GROUP = {
  id: 'size', label: 'Size', required: true, type: 'single',
  options: [
    { id: 'regular', label: 'Regular', priceDelta: 0 },
    { id: 'large',   label: 'Large',   priceDelta: 60 },
    { id: 'xl',      label: 'XL',      priceDelta: 120 },
  ],
}

const LOYALTY_TIER = {
  bronze: { label: 'Bronze', color: '#CD7F32', icon: '🥉', multiplier: 1   },
  silver: { label: 'Silver', color: '#A8A9AD', icon: '🥈', multiplier: 1.5 },
  gold:   { label: 'Gold',   color: '#FFD700', icon: '🥇', multiplier: 2   },
  none:   { label: 'Member', color: '#FF9F1C', icon: '☕', multiplier: 1   },
}

const calcPoints = (total, tier) =>
  Math.floor((total / 10) * (LOYALTY_TIER[tier]?.multiplier ?? 1))

// ─── Small reusable components ────────────────────────────────────────────────

const MetaChip = ({ children, accent = false, D }) => (
  <span
    className="inline-flex items-center gap-1 px-2.5 py-[5px] rounded-full text-[11px] font-semibold"
    style={{
      color:      accent ? '#FF9F1C' : 'var(--text-secondary)',
      background: accent
        ? (D ? 'rgba(255,159,28,0.15)' : 'rgba(255,159,28,0.1)')
        : (D ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.6)'),
      border: `1px solid ${accent
        ? 'rgba(255,159,28,0.35)'
        : (D ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)')}`,
    }}
  >
    {children}
  </span>
)

// ── Star picker for review form ───────────────────────────────────────────────
const StarPicker = ({ value, onChange, size = 28 }) => {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value
  return (
    <div className="flex gap-1.5" onMouseLeave={() => setHovered(0)}>
      {[1,2,3,4,5].map(s => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          className="border-none bg-transparent cursor-pointer p-0"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={s <= active ? '#FBBF24' : 'none'}
              stroke={s <= active ? '#FBBF24' : '#D1D5DB'}
              strokeWidth="1.5"
              style={{ transition: 'fill 0.12s ease, stroke 0.12s ease' }}
            />
          </svg>
        </button>
      ))}
    </div>
  )
}

// ── Static star display row ───────────────────────────────────────────────────
const StarRow = ({ rating, size = 13 }) => (
  <span className="inline-flex gap-px">
    {[1,2,3,4,5].map(s => (
      <svg key={s} width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill={s <= rating ? '#FBBF24' : 'none'}
          stroke={s <= rating ? '#FBBF24' : '#FDE68A'}
          strokeWidth="1.5"
        />
      </svg>
    ))}
  </span>
)

// ── Single review card ────────────────────────────────────────────────────────
const ReviewCard = ({ review, myReview, D, onLike, onEditStart, onDelete }) => {
  const isOwn    = myReview?._id === review._id
  const liked    = review._liked ?? false
  const heartRef = useRef(null)

  const handleLike = () => {
    if (!heartRef.current) return
    gsap.timeline()
      .to(heartRef.current, { scale: 0.6, duration: 0.1, ease: 'power3.in' })
      .to(heartRef.current, { scale: 1.35, duration: 0.25, ease: 'back.out(3)' })
      .to(heartRef.current, { scale: 1, duration: 0.2, ease: 'elastic.out(1.2,0.5)' })
    onLike(review._id)
  }

  // Display name initials fallback
  const initials = (review.customerName ?? 'A').slice(0, 2).toUpperCase()

  return (
    <div
      className="p-4 rounded-2xl"
      style={{
        background: D ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)',
        border:     `1px solid ${D ? 'rgba(255,255,255,0.07)' : 'rgba(210,185,145,0.5)'}`,
        boxShadow:  D
          ? '0 2px 8px rgba(0,0,0,0.25)'
          : '0 1px 0 rgba(255,255,255,0.95) inset, 0 2px 8px rgba(130,80,20,0.07)',
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold flex-shrink-0"
            style={{
              background: review.customerAvatar
                ? 'transparent'
                : (D ? 'rgba(255,159,28,0.18)' : 'rgba(255,243,220,0.9)'),
              border: `1.5px solid ${D ? 'rgba(255,159,28,0.25)' : 'rgba(255,200,130,0.5)'}`,
              color: '#FF9F1C',
            }}
          >
            {review.customerAvatar ?? initials}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="m-0 text-[13px] font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
                {review.customerName ?? 'Anonymous'}
              </p>
              {isOwn && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-[6px] uppercase tracking-widest"
                  style={{ color: '#FF9F1C', background: 'rgba(255,159,28,0.15)', border: '1px solid rgba(255,159,28,0.3)' }}
                >
                  You
                </span>
              )}
            </div>
            <p className="m-0 text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
        <StarRow rating={review.rating} size={11} />
      </div>

      <p className="m-0 text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)', fontWeight: 450 }}>
        {review.text}
      </p>

      <div className="flex items-center justify-between mt-3">
        {/* Like */}
        <button
          onClick={handleLike}
          className="flex items-center gap-1.5 border-none bg-transparent cursor-pointer p-0"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <span ref={heartRef}>
            <ThumbsUp
              size={13}
              strokeWidth={2}
              style={{ color: liked ? '#FF9F1C' : 'var(--text-muted)', fill: liked ? '#FF9F1C' : 'none' }}
            />
          </span>
          <span className="text-[11px] font-semibold" style={{ color: liked ? '#FF9F1C' : 'var(--text-muted)' }}>
            {review.likes ?? 0} helpful
          </span>
        </button>

        {/* Own-review actions */}
        {isOwn && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEditStart(review)}
              className="flex items-center gap-1 text-[11px] font-semibold border-none bg-transparent cursor-pointer p-0"
              style={{ color: 'var(--text-muted)', WebkitTapHighlightColor: 'transparent' }}
            >
              <Pencil size={11} strokeWidth={2} /> Edit
            </button>
            <button
              onClick={() => onDelete()}
              className="flex items-center gap-1 text-[11px] font-semibold border-none bg-transparent cursor-pointer p-0"
              style={{ color: '#ef4444', WebkitTapHighlightColor: 'transparent' }}
            >
              <Trash2 size={11} strokeWidth={2} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Review form (post + edit) ─────────────────────────────────────────────────
const ReviewForm = ({ D, myReview, submitting, onSubmit, onCancel }) => {
  const isEdit               = !!myReview
  const [rating, setRating]  = useState(myReview?.rating  ?? 0)
  const [text,   setText]    = useState(myReview?.text    ?? '')
  const MIN                  = 10
  const canSubmit            = rating > 0 && text.trim().length >= MIN && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    const ok = await onSubmit({ rating, text: text.trim() })
    if (ok && !isEdit) { setRating(0); setText('') }
  }

  return (
    <div
      className="p-4 rounded-2xl"
      style={{
        background: D
          ? 'linear-gradient(135deg, rgba(255,159,28,0.06), rgba(224,92,42,0.04))'
          : 'linear-gradient(135deg, rgba(255,243,220,0.9), rgba(255,230,190,0.6))',
        border: `1px solid ${D ? 'rgba(255,159,28,0.22)' : 'rgba(255,200,130,0.55)'}`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="m-0 text-[13px] font-extrabold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {isEdit ? '✏️ Edit your review' : '⭐ Write a review'}
        </p>
        {isEdit && (
          <button
            onClick={onCancel}
            className="border-none bg-transparent cursor-pointer p-1"
            style={{ color: 'var(--text-muted)', WebkitTapHighlightColor: 'transparent' }}
          >
            <X size={15} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Star picker */}
      <div className="mb-3">
        <StarPicker value={rating} onChange={setRating} />
        {rating > 0 && (
          <p className="m-0 mt-1 text-[10px] font-semibold" style={{ color: '#FF9F1C' }}>
            {['','😞 Poor','😕 Fair','😐 Okay','😊 Good','🤩 Excellent!'][rating]}
          </p>
        )}
      </div>

      {/* Text */}
      <textarea
        rows={3}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Share your experience with this dish… (min 10 characters)"
        maxLength={500}
        style={{
          width: '100%',
          resize: 'none',
          outline: 'none',
          fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
          fontSize: 13,
          lineHeight: 1.6,
          borderRadius: 13,
          padding: '10px 13px',
          WebkitAppearance: 'none',
          boxSizing: 'border-box',
          background: D ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
          border: `1.5px solid ${D ? 'rgba(255,159,28,0.22)' : 'rgba(200,175,135,0.6)'}`,
          color: 'var(--text-primary)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
        onFocus={e => {
          e.target.style.borderColor = 'rgba(255,159,28,0.55)'
          e.target.style.boxShadow   = '0 0 0 3px rgba(255,159,28,0.12)'
        }}
        onBlur={e => {
          e.target.style.borderColor = D ? 'rgba(255,159,28,0.22)' : 'rgba(200,175,135,0.6)'
          e.target.style.boxShadow   = 'none'
        }}
      />
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px]" style={{ color: text.length < MIN ? '#ef4444' : 'var(--text-muted)' }}>
          {text.length}/500 {text.length < MIN && text.length > 0 && `(${MIN - text.length} more to go)`}
        </span>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border-none cursor-pointer text-[12px] font-bold text-white"
          style={{
            background:   canSubmit ? 'linear-gradient(135deg,#FF9F1C,#E05C2A)' : (D ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
            color:        canSubmit ? '#fff' : 'var(--text-muted)',
            boxShadow:    canSubmit ? '0 3px 12px rgba(255,130,0,0.38)' : 'none',
            cursor:       canSubmit ? 'pointer' : 'not-allowed',
            fontFamily:   '"Plus Jakarta Sans", system-ui, sans-serif',
            transition:   'all 0.2s ease',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {submitting
            ? <><Loader2 size={13} strokeWidth={2.5} style={{ animation: 'spin 0.7s linear infinite' }} />Saving…</>
            : <><Send size={13} strokeWidth={2.5} />{isEdit ? 'Update' : 'Post Review'}</>
          }
        </button>
      </div>
    </div>
  )
}

// ── Similar card ──────────────────────────────────────────────────────────────
const SimilarCard = ({ item, navigate, dispatch, D }) => {
  const btnRef  = useRef(null)
  const cardRef = useRef(null)

  const handleAdd = useCallback((e) => {
    e.stopPropagation()
    if (!btnRef.current) return
    gsap.timeline()
      .to(btnRef.current, { scale: 0.72, duration: 0.08, ease: 'power3.in' })
      .to(btnRef.current, { scale: 1.28, duration: 0.2,  ease: 'back.out(3.5)' })
      .to(btnRef.current, { scale: 1,    duration: 0.24, ease: 'elastic.out(1,0.45)' })
    const hp  = Array.isArray(item.portions) && item.portions.length > 0
    const dp  = hp ? (item.portions.find(p => p.isDefault) ?? item.portions[0]) : null
    dispatch(addItem({
      menuItemId:   item._id,
      name:         item.name,
      price:        dp ? dp.price : item.price,
      emoji:        item.emoji,
      category:     item.category,
      quantity:     1,
      portionId:    dp ? dp.id    : null,
      portionLabel: dp ? dp.label : null,
    }))
  }, [dispatch, item])

  return (
    <div
      ref={cardRef}
      onClick={() => navigate(`/menu/item/${item._id}`)}
      role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && navigate(`/menu/item/${item._id}`)}
      onTouchStart={() => gsap.to(cardRef.current, { scale: 0.97, duration: 0.1 })}
      onTouchEnd={()   => gsap.to(cardRef.current, { scale: 1, duration: 0.3, ease: 'back.out(2)' })}
      className="rounded-2xl overflow-hidden cursor-pointer select-none"
      style={{
        background:  D ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
        border:      `1px solid ${D ? 'rgba(255,255,255,0.08)' : 'rgba(210,185,145,0.5)'}`,
        boxShadow:   D
          ? '0 2px 12px rgba(0,0,0,0.35)'
          : '0 2px 12px rgba(130,80,20,0.1), 0 1px 0 rgba(255,255,255,0.9) inset',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div className="h-24 relative overflow-hidden"
        style={{ background: D ? 'rgba(255,159,28,0.06)' : 'rgba(255,243,220,0.8)' }}>
        {item.image
          ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-[42px]">{item.emoji}</div>
        }
      </div>
      <div className="p-2.5 pb-3">
        <p className="m-0 text-xs font-bold leading-snug tracking-tight line-clamp-2"
          style={{ color: 'var(--text-primary)' }}>
          {item.name}
        </p>
        <div className="flex items-center justify-between mt-1.5 gap-1">
          <span className="text-[11px] font-extrabold tracking-tight"
            style={{ color: D ? '#FFB84D' : '#C8680A' }}>
            {Array.isArray(item.portions) && item.portions.length > 0
              ? `from ₹${Math.min(...item.portions.map(p => p.price))}`
              : `₹${item.price}`
            }
          </span>
          <button
            ref={btnRef}
            onClick={handleAdd}
            aria-label={`Add ${item.name}`}
            className="w-7 h-7 rounded-[9px] border-none flex items-center justify-center cursor-pointer flex-shrink-0 text-white"
            style={{
              background: 'linear-gradient(135deg,#FF9F1C,#E05C2A)',
              boxShadow: '0 2px 10px rgba(255,130,0,0.38)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Plus size={13} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const ItemDetailPage = () => {
  const { id }        = useParams()
  const navigate      = useNavigate()
  const dispatch      = useDispatch()
  const { isDark: D } = useContext(ThemeContext)
  const lenis         = useLenis()

  const allItems  = useSelector(selectAllItems)
  const cartItems = useSelector(selectCartItems)
  const cartCount = useSelector(selectCartCount)
  const user      = useSelector(selectUser)
  const isGuest   = useSelector(selectIsGuest)
  const tier      = useSelector(selectTier)

  const item    = allItems.find(i => i._id === id) ?? null
  const cafeId  = item?.cafeId?.toString() ?? item?.cafeId ?? ''
  const similar = allItems
    .filter(i => i._id !== id && i.category === item?.category && i.isAvailable)
    .slice(0, 8)

  // ── Reviews hook ──────────────────────────────────────────────────────────
  const {
    reviews, summary, pagination, loading: reviewsLoading, hasMore,
    myReview, submitting, loadMore, submit, remove, like,
  } = useReviews(id, cafeId)

  // Review form state
  const [showForm,    setShowForm]    = useState(false)
  const [editTarget,  setEditTarget]  = useState(null)   // review being edited

  const handleEditStart = (review) => { setEditTarget(review); setShowForm(true) }
  const handleFormCancel= () => { setEditTarget(null); setShowForm(false) }
  const handleSubmit    = async ({ rating, text }) => {
    const ok = await submit({ rating, text })
    if (ok) { setShowForm(false); setEditTarget(null) }
    return ok
  }

  // ── Drawer state ──────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false)

  // ── Portions ──────────────────────────────────────────────────────────────
  const hasPortions    = Array.isArray(item?.portions) && item.portions.length > 0
  const defaultPortion = hasPortions
    ? (item.portions.find(p => p.isDefault) ?? item.portions[0])
    : null

  const portionGroup = useMemo(() => {
    if (!hasPortions) return FALLBACK_SIZE_GROUP
    const sorted = [...item.portions].sort((a, b) =>
      a.sortOrder !== b.sortOrder ? a.sortOrder - b.sortOrder : a.price - b.price
    )
    return {
      id: 'portion', label: 'Choose Size', required: true, type: 'single',
      options: sorted.map(p => ({
        id: p.id, label: p.label,
        priceDelta: p.price - (item?.price ?? 0),
        _absPrice:  p.price,
      })),
    }
  }, [hasPortions, item])

  const allGroups = useMemo(() => [portionGroup, ...STATIC_EXTRA_GROUPS], [portionGroup])

  // ── Customisation state ───────────────────────────────────────────────────
  const buildDefaults = useCallback(() => {
    const d = { extras: [], spice: 'mild' }
    if (hasPortions) d.portion = defaultPortion?.id ?? portionGroup.options[0]?.id
    else d.size = 'regular'
    return d
  }, [hasPortions, defaultPortion, portionGroup])

  const [qty,        setQty]        = useState(1)
  const [customs,    setCustoms]    = useState(buildDefaults)
  const [addedFlash, setAddedFlash] = useState(false)
  const [wishlist,   setWishlist]   = useState(false)

  useEffect(() => { setCustoms(buildDefaults()) }, [buildDefaults])

  const selectedPortionPrice = useMemo(() => {
    if (!hasPortions) return item?.price ?? 0
    const selId   = customs.portion ?? defaultPortion?.id
    const portion = item.portions.find(p => p.id === selId)
    return portion ? portion.price : item.price
  }, [hasPortions, customs.portion, item, defaultPortion])

  const extrasPrice = useMemo(() => {
    let extra = 0
    STATIC_EXTRA_GROUPS.forEach(g => {
      if (g.type === 'single') {
        const sel = g.options.find(o => o.id === customs[g.id])
        if (sel) extra += sel.priceDelta
      } else {
        ;(customs[g.id] ?? []).forEach(oid => {
          const o = g.options.find(o => o.id === oid)
          if (o) extra += o.priceDelta
        })
      }
    })
    if (!hasPortions) {
      const sz = FALLBACK_SIZE_GROUP.options.find(o => o.id === customs.size)
      if (sz) extra += sz.priceDelta
    }
    return extra
  }, [customs, hasPortions])

  const unitPrice  = selectedPortionPrice + extrasPrice
  const totalPrice = unitPrice * qty
  const points     = calcPoints(totalPrice, tier)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const pageRef    = useRef(null)
  const navRef     = useRef(null)
  const glowRef    = useRef(null)
  const heroRef    = useRef(null)
  const infoRef    = useRef(null)
  const custRef    = useRef(null)
  const reviewsRef = useRef(null)
  const simRef     = useRef(null)
  const barRef     = useRef(null)
  const btnRef     = useRef(null)
  const plusRef    = useRef(null)
  const minusRef   = useRef(null)
  const qtyRef     = useRef(null)
  const shimRef    = useRef(null)
  const heartRef   = useRef(null)

  // ── Initial states ────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    if (navRef.current) gsap.set(navRef.current,  { y: -80, opacity: 0 })
    if (heroRef.current) gsap.set(heroRef.current, { scale: 1.06, opacity: 0 })
    if (barRef.current) gsap.set(barRef.current,  { y: 100, opacity: 0 })
  }, [])

  // ── Entrance ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!item) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
    tl.to(navRef.current,  { y: 0, opacity: 1, duration: 0.72, ease: 'back.out(1.6)' }, 0)
    tl.to(heroRef.current, { scale: 1, opacity: 1, duration: 0.75, ease: 'power3.out' }, 0.05)
    if (glowRef.current)
      tl.fromTo(glowRef.current, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'power2.out' }, 0.2)
    const kids = infoRef.current ? Array.from(infoRef.current.children) : []
    if (kids.length)
      tl.fromTo(kids, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.07, ease: 'power2.out', clearProps: 'all' }, 0.3)
    if (shimRef.current)
      tl.fromTo(shimRef.current, { x: '-120%' }, { x: '120%', duration: 1.1, ease: 'power2.out' }, 0.5)
    tl.to(barRef.current, { y: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.4)' }, 0.25)

    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const ctx = gsap.context(() => {
        ;[custRef, reviewsRef, simRef].forEach(r => {
          if (!r.current) return
          gsap.fromTo(r.current,
            { y: 28, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out',
              scrollTrigger: { trigger: r.current, start: 'top 94%', once: true } }
          )
        })
      }, pageRef)
      return () => { ctx.revert(); ScrollTrigger.getAll().forEach(t => t.kill()) }
    })
    return () => mm.revert()
  }, [item])

  // ── Back ──────────────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    if (!navRef.current) { navigate(-1); return }
    gsap.to(navRef.current, { y: -80, opacity: 0, duration: 0.28, ease: 'power3.in', onComplete: () => navigate(-1) })
  }, [navigate])

  // ── Qty ───────────────────────────────────────────────────────────────────
  const bumpBtn = useCallback((ref) => {
    if (!ref.current) return
    gsap.timeline()
      .to(ref.current, { scale: 0.72, duration: 0.08, ease: 'power3.in' })
      .to(ref.current, { scale: 1.25, duration: 0.2,  ease: 'back.out(3.5)' })
      .to(ref.current, { scale: 1,    duration: 0.22, ease: 'elastic.out(1,0.45)' })
  }, [])

  const animateQty = useCallback((dir) => {
    if (!qtyRef.current) return
    gsap.fromTo(qtyRef.current,
      { y: dir > 0 ? -12 : 12, opacity: 0, scale: 0.8 },
      { y: 0, opacity: 1, scale: 1, duration: 0.32, ease: 'back.out(2.4)' }
    )
  }, [])

  const increaseQty = useCallback(() => { bumpBtn(plusRef);  animateQty(1);  setQty(q => q + 1) }, [bumpBtn, animateQty])
  const decreaseQty = useCallback(() => {
    if (qty <= 1) return
    bumpBtn(minusRef); animateQty(-1); setQty(q => q - 1)
  }, [qty, bumpBtn, animateQty])

  // ── Customisation ─────────────────────────────────────────────────────────
  const handleSingleCustom = (gid, oid) => setCustoms(p => ({ ...p, [gid]: oid }))
  const handleMultiCustom  = (gid, oid) => setCustoms(p => {
    const cur = p[gid] ?? []
    return { ...p, [gid]: cur.includes(oid) ? cur.filter(i => i !== oid) : [...cur, oid] }
  })

  // ── Add to cart ───────────────────────────────────────────────────────────
  const handleAddToCart = useCallback(() => {
    if (!item) return
    if (btnRef.current) {
      gsap.timeline()
        .to(btnRef.current, { scale: 0.92, duration: 0.1,  ease: 'power3.in' })
        .to(btnRef.current, { scale: 1.04, duration: 0.22, ease: 'back.out(3)' })
        .to(btnRef.current, { scale: 1,    duration: 0.28, ease: 'elastic.out(1,0.45)' })
    }
    let portionId = null, portionLabel = null
    if (hasPortions) {
      const selId   = customs.portion ?? defaultPortion?.id
      const portion = item.portions.find(p => p.id === selId)
      if (portion) { portionId = portion.id; portionLabel = portion.label }
    }
    dispatch(addItem({ menuItemId: item._id, name: item.name, price: unitPrice, emoji: item.emoji, category: item.category, quantity: qty, portionId, portionLabel, customizations: customs }))
    setAddedFlash(true)
    setTimeout(() => setAddedFlash(false), 1600)
    setTimeout(() => setDrawerOpen(true), 320)
  }, [item, dispatch, qty, unitPrice, customs, hasPortions, defaultPortion])

  // ── Wishlist ──────────────────────────────────────────────────────────────
  const toggleWishlist = useCallback(() => {
    setWishlist(v => !v)
    if (heartRef.current) {
      gsap.timeline()
        .to(heartRef.current, { scale: 0.6, duration: 0.1, ease: 'power3.in' })
        .to(heartRef.current, { scale: 1.35, duration: 0.25, ease: 'back.out(3)' })
        .to(heartRef.current, { scale: 1, duration: 0.2, ease: 'elastic.out(1.2,0.5)' })
    }
  }, [])

  // ── 404 ───────────────────────────────────────────────────────────────────
  if (!item) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg-app)' }}>
      <span className="text-6xl">🍽️</span>
      <p className="m-0 text-[17px] font-bold" style={{ color: 'var(--text-primary)' }}>Item not found</p>
      <button onClick={() => navigate('/menu')} className="px-6 py-2.5 rounded-[14px] border-none cursor-pointer text-sm font-bold text-white"
        style={{ background: 'linear-gradient(135deg,#FF9F1C,#E05C2A)', boxShadow: '0 4px 16px rgba(255,130,0,0.4)', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
        Back to Menu
      </button>
    </div>
  )

  const isBest = item.tags?.includes('bestseller')
  const isNew  = item.tags?.includes('new')

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={pageRef}
      className="relative min-h-screen"
      style={{ background: 'var(--bg-app)', paddingBottom: 'calc(110px + env(safe-area-inset-bottom,0px))', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}
    >

      {/* ══ NAV ══ */}
      {createPortal(
        <div
          ref={navRef}
          className="fixed top-0 inset-x-0 z-50 flex justify-center px-4 pointer-events-none"
          style={{ paddingTop: 'max(14px, calc(env(safe-area-inset-top,0px) + 10px))' }}
        >
          <div ref={glowRef} aria-hidden className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
            style={{ top: 'max(10px, calc(env(safe-area-inset-top,0px) + 6px))', width: 320, height: 80, background: D ? 'radial-gradient(ellipse, rgba(255,140,20,0.36) 0%, transparent 75%)' : 'radial-gradient(ellipse, rgba(255,159,28,0.28) 0%, transparent 75%)', filter: 'blur(18px)', opacity: 0.5 }} />
          <div
            className="pointer-events-auto relative w-full max-w-[480px] overflow-hidden rounded-[28px] px-4 py-2.5"
            style={{
              background: D ? 'rgba(10,5,1,0.82)' : 'rgba(255,251,243,0.82)',
              backdropFilter: 'blur(48px) saturate(200%) brightness(1.04)',
              WebkitBackdropFilter: 'blur(48px) saturate(200%) brightness(1.04)',
              border: D ? '1px solid rgba(255,159,28,0.18)' : '1px solid rgba(255,255,255,0.82)',
              boxShadow: D
                ? '0 1px 0 rgba(255,255,255,0.09) inset, 0 20px 60px rgba(0,0,0,0.65)'
                : '0 1px 0 rgba(255,255,255,0.95) inset, 0 20px 48px rgba(130,80,20,0.14)',
            }}
          >
            <div ref={shimRef} aria-hidden className="absolute inset-y-0 left-0 w-[38%] pointer-events-none z-[1]"
              style={{ background: D ? 'linear-gradient(105deg,transparent,rgba(255,255,255,0.08) 50%,transparent)' : 'linear-gradient(105deg,transparent,rgba(255,255,255,0.28) 50%,transparent)', transform: 'translateX(-120%)' }} />
            <div aria-hidden className="absolute bottom-0 left-[15%] right-[15%] h-px pointer-events-none"
              style={{ background: 'linear-gradient(90deg,transparent,#FF9F1C 30%,#FFD580 50%,#E05C2A 70%,transparent)', opacity: D ? 0.55 : 0.45 }} />

            <div className="relative z-[3] flex items-center justify-between gap-2.5">
              {/* back */}
              <button onClick={handleBack} aria-label="Go back"
                className="flex items-center justify-center w-[38px] h-[38px] rounded-xl cursor-pointer border-none flex-shrink-0"
                style={{ background: D ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.55)', border: `1px solid ${D ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.75)'}`, color: 'var(--text-muted)', WebkitTapHighlightColor: 'transparent' }}>
                <ArrowLeft size={17} strokeWidth={2} />
              </button>

              {/* title */}
              <div className="flex-1 text-center overflow-hidden">
                <p className="m-0 text-sm font-extrabold tracking-tight leading-snug truncate"
                  style={{ background: D ? 'linear-gradient(118deg,#FFE0A0,#FF9F1C 60%,#E05C2A)' : 'linear-gradient(118deg,#C8680A,#E05C2A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {item.name}
                </p>
                <p className="m-0 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  {item.category?.replace(/_/g, ' ')}
                </p>
              </div>

              {/* right buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button ref={heartRef} onClick={toggleWishlist} aria-label="Wishlist"
                  className="flex items-center justify-center w-[38px] h-[38px] rounded-xl cursor-pointer border-none"
                  style={{ background: wishlist ? (D ? 'rgba(255,100,100,0.2)' : 'rgba(255,100,100,0.1)') : (D ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.55)'), border: `1px solid ${wishlist ? 'rgba(255,100,100,0.4)' : (D ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.75)')}`, color: wishlist ? '#ef4444' : 'var(--text-muted)', WebkitTapHighlightColor: 'transparent' }}>
                  <Heart size={16} strokeWidth={2} fill={wishlist ? '#ef4444' : 'none'} />
                </button>
                <div className="relative flex items-center justify-center w-[38px] h-[38px] rounded-xl cursor-pointer"
                  style={{ background: cartCount > 0 ? (D ? 'rgba(255,159,28,0.18)' : 'rgba(255,159,28,0.12)') : (D ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.55)'), border: `1px solid ${cartCount > 0 ? 'rgba(255,159,28,0.45)' : (D ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.75)')}`, color: cartCount > 0 ? '#FF9F1C' : 'var(--text-muted)' }}
                  onClick={() => cartCount > 0 && setDrawerOpen(true)}>
                  <ShoppingCart size={16} strokeWidth={1.9} />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white text-[9px] font-extrabold flex items-center justify-center border-2"
                      style={{ background: 'linear-gradient(135deg,#FF9F1C,#E05C2A)', borderColor: 'var(--bg-app)' }}>
                      {cartCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ══ HERO ══ */}
      <div ref={heroRef} className="relative w-full overflow-hidden"
        style={{ height: 'clamp(240px,42vw,340px)', marginTop: 'max(72px, calc(env(safe-area-inset-top,0px) + 68px))' }}>
        {item.image
          ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center" style={{ fontSize: 96, background: D ? 'radial-gradient(ellipse at 50% 60%, rgba(255,159,28,0.12), rgba(10,5,1,0.95))' : 'radial-gradient(ellipse at 50% 60%, rgba(255,224,160,0.4), rgba(255,252,245,0.9))' }}>{item.emoji}</div>
        }
        <div className="absolute inset-x-0 bottom-0 h-[55%] pointer-events-none" style={{ background: 'linear-gradient(to top, var(--bg-app), transparent)' }} />
        <div className="absolute top-3.5 left-3.5 flex gap-1.5">
          {isBest && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[10px] text-[10px] font-extrabold uppercase tracking-widest text-white" style={{ background: 'linear-gradient(135deg,#FF9F1C,#E05C2A)', boxShadow: '0 4px 14px rgba(255,130,0,0.45)' }}><Flame size={9} strokeWidth={3} />Bestseller</span>}
          {isNew  && <span className="px-2.5 py-1 rounded-[10px] text-[10px] font-extrabold uppercase tracking-widest text-white" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>New</span>}
        </div>
        <div className="absolute top-3.5 right-3.5 w-7 h-7 rounded-lg flex items-center justify-center border-2"
          style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', borderColor: item.isVeg ? '#22c55e' : '#ef4444' }}>
          <div className={`w-3 h-3 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
        {/* Rating pill on image */}
        {summary && (
          <div className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: D ? 'rgba(10,5,1,0.75)' : 'rgba(255,251,243,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: D ? '1px solid rgba(255,159,28,0.2)' : '1px solid rgba(255,255,255,0.8)' }}>
            <StarRow rating={Math.round(summary.avg)} size={11} />
            <span className="text-[12px] font-black" style={{ color: D ? '#FFB84D' : '#C8680A' }}>{summary.avg}</span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>({summary.total})</span>
          </div>
        )}
      </div>

      {/* ══ INFO ══ */}
      <div ref={infoRef} className="px-[18px] pt-[18px]">
        <div className="flex items-start justify-between gap-3">
          <h1 className="m-0 flex-1 font-black leading-tight" style={{ color: 'var(--text-primary)', fontSize: 'clamp(21px,5.5vw,26px)', letterSpacing: '-0.04em' }}>
            {item.name}
          </h1>
          <div className="text-right shrink-0">
            <p className="m-0 font-black" style={{ fontSize: 'clamp(20px,5vw,24px)', letterSpacing: '-0.03em', background: D ? 'linear-gradient(135deg,#FFE0A0,#E05C2A)' : 'linear-gradient(135deg,#C8680A,#E05C2A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {hasPortions ? `from ₹${Math.min(...item.portions.map(p => p.price))}` : `₹${item.price}`}
            </p>
            {extrasPrice > 0 && <p className="m-0 text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>+₹{extrasPrice} extras</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-2.5">
          <MetaChip D={D}><Clock size={10} strokeWidth={2} style={{ color: '#FF9F1C' }} />{item.preparationTimeMinutes ?? 10}m</MetaChip>
          {item.spiceLevel > 0 && <MetaChip D={D}><Flame size={10} strokeWidth={2.5} style={{ color: SPICE_COLOR[item.spiceLevel] }} />{SPICE_LABEL[item.spiceLevel]}</MetaChip>}
          <MetaChip D={D}><Leaf size={10} strokeWidth={2.5} style={{ color: item.isVeg ? '#22c55e' : '#ef4444' }} />{item.isVeg ? 'Veg' : 'Non-Veg'}</MetaChip>
          {summary && <MetaChip D={D} accent><Star size={10} strokeWidth={2.5} fill="currentColor" />{summary.avg} · {summary.total} reviews</MetaChip>}
          {hasPortions && <MetaChip D={D}><ChefHat size={10} strokeWidth={2} />{item.portions.length} sizes</MetaChip>}
        </div>

        {item.description && <p className="mt-3 mb-0 text-[13.5px] leading-relaxed" style={{ color: 'var(--text-secondary)', fontWeight: 450 }}>{item.description}</p>}

        {item.allergens?.length > 0 && (
          <div className="flex items-start gap-2 mt-3 p-3 rounded-xl" style={{ background: D ? 'rgba(245,158,11,0.08)' : 'rgba(254,243,199,0.8)', border: `1px solid ${D ? 'rgba(245,158,11,0.2)' : 'rgba(251,191,36,0.3)'}` }}>
            <Shield size={13} className="mt-0.5 shrink-0" style={{ color: '#F59E0B' }} />
            <p className="m-0 text-[11px] font-semibold leading-relaxed" style={{ color: D ? '#FBD34D' : '#92400E' }}>Contains: {item.allergens.join(', ')}</p>
          </div>
        )}
      </div>

      {/* ══ LOYALTY PREVIEW ══ */}
      {!isGuest && points > 0 && (
        <div className="px-[18px] pt-5">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: D ? 'linear-gradient(135deg, rgba(255,159,28,0.1), rgba(224,92,42,0.08))' : 'linear-gradient(135deg, rgba(255,243,220,0.9), rgba(255,230,190,0.7))', border: `1px solid ${D ? 'rgba(255,159,28,0.25)' : 'rgba(255,200,130,0.6)'}` }}>
            <div className="w-10 h-10 rounded-[13px] flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: `${LOYALTY_TIER[tier]?.color ?? '#FF9F1C'}25`, border: `1.5px solid ${LOYALTY_TIER[tier]?.color ?? '#FF9F1C'}40` }}>
              {LOYALTY_TIER[tier]?.icon ?? '☕'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="m-0 text-[12px] font-bold" style={{ color: LOYALTY_TIER[tier]?.color ?? '#FF9F1C' }}>{LOYALTY_TIER[tier]?.label ?? 'Member'} Reward</p>
              <p className="m-0 text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Add to cart to earn</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl flex-shrink-0"
              style={{ background: `${LOYALTY_TIER[tier]?.color ?? '#FF9F1C'}20`, border: `1.5px solid ${LOYALTY_TIER[tier]?.color ?? '#FF9F1C'}45` }}>
              <Zap size={13} strokeWidth={2.5} style={{ color: LOYALTY_TIER[tier]?.color ?? '#FF9F1C' }} />
              <span className="text-[14px] font-black font-mono" style={{ color: LOYALTY_TIER[tier]?.color ?? '#FF9F1C' }}>+{points} pts</span>
            </div>
          </div>
        </div>
      )}

      {/* ══ CUSTOMISE ══ */}
      <div ref={custRef} className="px-[18px] pt-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-0.5 h-[18px] rounded-full flex-shrink-0" style={{ background: 'linear-gradient(180deg,#FF9F1C,#E05C2A)' }} />
          <h2 className="m-0 text-[15px] font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Customize</h2>
          <Sparkles size={14} style={{ color: '#FF9F1C' }} />
        </div>

        {allGroups.map(group => (
          <div key={group.id} className="mb-[18px]">
            <div className="flex items-center gap-1.5 mb-2.5">
              <p className="m-0 text-xs font-bold uppercase tracking-[0.04em]" style={{ color: 'var(--text-primary)' }}>{group.label}</p>
              {group.required
                ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-[6px] uppercase tracking-widest" style={{ color: '#FF9F1C', background: 'rgba(255,159,28,0.12)', border: '1px solid rgba(255,159,28,0.25)' }}>Required</span>
                : <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-[6px] uppercase tracking-widest" style={{ color: 'var(--text-muted)', border: `1px solid ${D ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>Optional</span>
              }
            </div>
            <div className="flex flex-wrap gap-2">
              {group.options.map(opt => {
                const selected = group.type === 'single'
                  ? customs[group.id] === opt.id
                  : (customs[group.id] ?? []).includes(opt.id)
                const priceLabel = group.id === 'portion' && opt._absPrice != null
                  ? `₹${opt._absPrice}`
                  : opt.priceDelta > 0 ? `+${opt.priceDelta}` : null
                return (
                  <button key={opt.id}
                    onClick={() => group.type === 'single' ? handleSingleCustom(group.id, opt.id) : handleMultiCustom(group.id, opt.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs cursor-pointer border-none"
                    style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', fontWeight: selected ? 700 : 500, color: selected ? '#FF9F1C' : 'var(--text-secondary)', background: selected ? (D ? 'rgba(255,159,28,0.18)' : 'rgba(255,159,28,0.1)') : (D ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)'), border: `1.5px solid ${selected ? 'rgba(255,159,28,0.55)' : (D ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')}`, boxShadow: selected ? '0 0 14px rgba(255,159,28,0.22)' : 'none', transition: 'all 0.18s ease', WebkitTapHighlightColor: 'transparent' }}>
                    {opt.emoji && <span className="text-[13px]">{opt.emoji}</span>}
                    {opt.label}
                    {priceLabel && <span className="text-[10px] font-bold" style={{ color: selected ? '#FF9F1C' : 'var(--text-muted)' }}>{priceLabel}</span>}
                    {selected && <Check size={10} strokeWidth={3} style={{ color: '#FF9F1C' }} />}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ══ REVIEWS ══ */}
      <div ref={reviewsRef} className="px-[18px] pt-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-0.5 h-[18px] rounded-full flex-shrink-0" style={{ background: 'linear-gradient(180deg,#FF9F1C,#E05C2A)' }} />
          <h2 className="m-0 text-[15px] font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Ratings & Reviews</h2>
          <Star size={14} fill="#FBBF24" stroke="#FBBF24" />
        </div>

        {/* Summary card (from backend aggregate) */}
        {summary && (
          <div className="flex gap-4 p-4 rounded-2xl mb-4"
            style={{ background: D ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)', border: `1px solid ${D ? 'rgba(255,255,255,0.07)' : 'rgba(210,185,145,0.5)'}`, boxShadow: D ? '0 2px 8px rgba(0,0,0,0.25)' : '0 1px 0 rgba(255,255,255,0.95) inset, 0 2px 8px rgba(130,80,20,0.07)' }}>
            {/* Big number */}
            <div className="flex flex-col items-center justify-center flex-shrink-0 w-20">
              <span className="text-[44px] font-black leading-none" style={{ background: 'linear-gradient(135deg,#FBBF24,#F97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '-0.04em' }}>
                {summary.avg || '—'}
              </span>
              <StarRow rating={Math.round(summary.avg)} size={12} />
              <span className="text-[10px] mt-1 font-semibold" style={{ color: 'var(--text-muted)' }}>{summary.total} reviews</span>
            </div>
            {/* Distribution bars */}
            <div className="flex-1 flex flex-col gap-1.5 justify-center">
              {(summary.dist ?? [0,0,0,0,0]).map((count, i) => {
                const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold w-3 text-right flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{5 - i}</span>
                    <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ background: D ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: i === 0 ? 'linear-gradient(90deg,#FBBF24,#F97316)' : i <= 1 ? '#FBBF24' : D ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)', transition: 'width 0.8s ease' }} />
                    </div>
                    <span className="text-[9px] w-6 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Write / Edit review CTA */}
        {!isGuest && !showForm && (
          <button
            onClick={() => { setEditTarget(null); setShowForm(true) }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-none cursor-pointer text-[13px] font-bold mb-4"
            style={{
              background: myReview
                ? (D ? 'rgba(255,159,28,0.08)' : 'rgba(255,159,28,0.06)')
                : 'linear-gradient(135deg,#FF9F1C,#E05C2A)',
              color:      myReview ? '#FF9F1C' : '#fff',
              border:     myReview ? '1px solid rgba(255,159,28,0.3)' : 'none',
              boxShadow:  myReview ? 'none' : '0 4px 16px rgba(255,130,0,0.35)',
              fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {myReview
              ? <><RotateCcw size={14} strokeWidth={2.5} />Update my review</>
              : <><Pencil size={14} strokeWidth={2.5} />Write a Review</>
            }
          </button>
        )}

        {/* Form */}
        {showForm && (
          <div className="mb-4">
            <ReviewForm
              D={D}
              myReview={editTarget ?? myReview}
              submitting={submitting}
              onSubmit={handleSubmit}
              onCancel={handleFormCancel}
            />
          </div>
        )}

        {/* Guest CTA */}
        {isGuest && (
          <div className="flex items-center gap-3 p-3.5 rounded-2xl mb-4"
            style={{ background: D ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.6)', border: `1px solid ${D ? 'rgba(255,255,255,0.07)' : 'rgba(210,185,145,0.4)'}` }}>
            <span className="text-2xl">🔐</span>
            <div className="flex-1 min-w-0">
              <p className="m-0 text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>Sign in to review</p>
              <p className="m-0 text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Share your experience with others</p>
            </div>
            <button onClick={() => navigate('/login')}
              className="px-3 py-1.5 rounded-xl border-none cursor-pointer text-[11px] font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#FF9F1C,#E05C2A)', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', WebkitTapHighlightColor: 'transparent' }}>
              Sign in
            </button>
          </div>
        )}

        {/* Review list */}
        {reviewsLoading && reviews.length === 0 ? (
          <div className="flex items-center justify-center py-10 gap-3">
            <Loader2 size={20} strokeWidth={2} style={{ animation: 'spin 0.7s linear infinite', color: '#FF9F1C' }} />
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Loading reviews…</span>
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <span className="text-4xl">💬</span>
            <p className="m-0 text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>No reviews yet</p>
            <p className="m-0 text-[12px]" style={{ color: 'var(--text-muted)' }}>Be the first to share your experience!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reviews.map(review => (
              <ReviewCard
                key={review._id}
                review={review}
                myReview={myReview}
                D={D}
                onLike={like}
                onEditStart={handleEditStart}
                onDelete={remove}
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <button
            onClick={loadMore}
            disabled={reviewsLoading}
            className="w-full mt-3 py-3 rounded-xl border-none cursor-pointer flex items-center justify-center gap-2 text-[13px] font-bold"
            style={{ background: D ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)', border: `1px solid ${D ? 'rgba(255,255,255,0.08)' : 'rgba(210,185,145,0.4)'}`, color: '#FF9F1C', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', WebkitTapHighlightColor: 'transparent' }}
          >
            {reviewsLoading
              ? <><Loader2 size={14} strokeWidth={2} style={{ animation: 'spin 0.7s linear infinite' }} />Loading…</>
              : <>Load more reviews <ChevronRight size={14} strokeWidth={2.5} /></>
            }
          </button>
        )}
      </div>

      {/* ══ SIMILAR ══ */}
      {similar.length > 0 && (
        <div ref={simRef} className="mt-7">
          <div className="flex items-center justify-between px-[18px] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-[18px] rounded-full flex-shrink-0" style={{ background: 'linear-gradient(180deg,#FF9F1C,#E05C2A)' }} />
              <h2 className="m-0 text-[15px] font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>You Might Also Like</h2>
            </div>
            <button onClick={() => navigate('/menu')} className="flex items-center gap-1 text-[11px] font-bold border-none bg-transparent cursor-pointer p-0" style={{ color: '#FF9F1C', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
              See all <ChevronRight size={12} strokeWidth={2.5} />
            </button>
          </div>
          <Swiper modules={[FreeMode]} freeMode={{ enabled: true, momentum: true, momentumRatio: 0.6 }} slidesPerView="auto" spaceBetween={12} slidesOffsetBefore={18} slidesOffsetAfter={18}>
            {similar.map(sim => (
              <SwiperSlide key={sim._id} style={{ width: 148 }}>
                <SimilarCard item={sim} navigate={navigate} dispatch={dispatch} D={D} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}

      {/* ══ STICKY BAR — portalled ══ */}
      {createPortal(
        <div ref={barRef} className="fixed bottom-0 inset-x-0 z-40 flex items-center gap-3 px-4 mx-auto max-w-[480px]"
          style={{ paddingTop: 'max(12px,10px)', paddingBottom: 'max(16px, calc(env(safe-area-inset-bottom,0px) + 12px))', background: D ? 'rgba(6,3,1,0.88)' : 'rgba(255,251,243,0.92)', backdropFilter: 'blur(32px) saturate(200%)', WebkitBackdropFilter: 'blur(32px) saturate(200%)', borderTop: D ? '1px solid rgba(255,159,28,0.14)' : '1px solid rgba(255,255,255,0.9)', boxShadow: D ? '0 -8px 32px rgba(0,0,0,0.6)' : '0 -8px 28px rgba(130,80,20,0.1)' }}>
          {hasPortions && customs.portion && (
            <div className="absolute inset-x-0 text-center" style={{ top: -22 }}>
              <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
                {item.portions.find(p => p.id === customs.portion)?.label ?? ''} · ₹{selectedPortionPrice}
              </span>
            </div>
          )}
          {/* Qty stepper */}
          <div className="flex items-center overflow-hidden rounded-2xl" style={{ background: D ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)', border: `1.5px solid ${D ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.75)'}`, backdropFilter: 'blur(8px)' }}>
            <button ref={minusRef} onClick={decreaseQty} disabled={qty <= 1} aria-label="Decrease"
              className="w-[42px] h-12 flex items-center justify-center border-none bg-transparent"
              style={{ color: qty > 1 ? 'var(--text-primary)' : 'var(--text-muted)', cursor: qty > 1 ? 'pointer' : 'not-allowed', WebkitTapHighlightColor: 'transparent' }}>
              <Minus size={15} strokeWidth={2.5} />
            </button>
            <div className="w-9 h-12 flex items-center justify-center" style={{ borderLeft: `1px solid ${D ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`, borderRight: `1px solid ${D ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}` }}>
              <span ref={qtyRef} className="block text-[17px] font-black tracking-tighter" style={{ color: 'var(--text-primary)', fontFamily: '"DM Mono", monospace' }}>{qty}</span>
            </div>
            <button ref={plusRef} onClick={increaseQty} aria-label="Increase"
              className="w-[42px] h-12 flex items-center justify-center border-none bg-transparent cursor-pointer"
              style={{ color: 'var(--text-primary)', WebkitTapHighlightColor: 'transparent' }}>
              <Plus size={15} strokeWidth={2.5} />
            </button>
          </div>
          {/* Add to cart */}
          <button ref={btnRef} onClick={handleAddToCart} aria-label={`Add ${qty} ${item.name} to cart`}
            className="flex-1 h-12 rounded-2xl border-none cursor-pointer flex items-center justify-center gap-2 text-white text-sm font-extrabold tracking-tight relative overflow-hidden"
            style={{ background: addedFlash ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#FF9F1C 0%,#F07A18 45%,#E05C2A 100%)', boxShadow: addedFlash ? '0 4px 20px rgba(34,197,94,0.45)' : '0 4px 20px rgba(255,130,0,0.42)', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', transition: 'background 0.3s ease, box-shadow 0.3s ease', WebkitTapHighlightColor: 'transparent' }}>
            {addedFlash
              ? <><Check size={17} strokeWidth={3} />Added! Opening cart…</>
              : <><ShoppingCart size={16} strokeWidth={2} />Add to Cart · ₹{totalPrice}</>
            }
          </button>
        </div>,
        document.body
      )}

      {/* ══ CART DRAWER ══ */}
      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} lenis={lenis} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  )
}

export default ItemDetailPage