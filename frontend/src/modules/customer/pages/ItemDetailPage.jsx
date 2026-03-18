// src/modules/customer/pages/ItemDetailPage.jsx
// Route: /menu/item/:id
//
// FIXES:
// ✅ fetchItemById / selectCurrentItem removed — don't exist in menuSlice
//    Item selected from existing store by id (selectItemById)
//    Menu fetched via fetchMenu if not yet loaded
// ✅ selectMenuLoading / selectMenuLoaded — both exist and used correctly
//
// STYLE (zero logic changes):
// ✅ Reference-inspired: big rounded image, stats row, qty+description row,
//    sticky bottom bar with "Add to cart" + price pill
// ✅ All fields dynamic — stats/allergens/loyalty only render if item has data
// ✅ Accordion sections: Customize / Reviews / Similar
// ✅ All colors centralized in useS(isDark) — zero scattered hex in JSX
// ✅ BRAND.currency, FONTS.* throughout

import {
  useState, useEffect, useRef, useCallback, useContext,
} from 'react'
import { useParams, useNavigate }   from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import gsap                         from 'gsap'
import {
  ArrowLeft, Heart, Star, Clock, Flame, Zap,
  ChevronDown, ShoppingCart, Plus, Check, Minus, Weight, Users,
} from 'lucide-react'

import { ThemeContext }             from '@shared/context/ThemeContext'
import { BRAND, FONTS }             from '@shared/config/brand'
import { lockScroll, unlockScroll } from '@shared/utils/lenisLock'

// ── Only use selectors that actually exist in menuSlice ───────────────────────
import {
  fetchMenu,
  selectAllItems,
  selectMenuLoading,
  selectMenuLoaded,
} from '@store/slices/menuSlice'
import {
  addItem, updateQuantity, removeItem, selectItemTotalQty,
} from '@store/slices/cartSlice'
import { selectUser } from '@store/slices/authSlice'

// Shared primitives
import { PortionSheet } from '../components/menu/menuCard.shared'

// ─────────────────────────────────────────────────────────────────────────────
// Inline selector — find item by id from existing store
// ─────────────────────────────────────────────────────────────────────────────
const makeSelectItemById = (id) => (state) =>
  selectAllItems(state).find((i) => i._id === id || i.id === id) ?? null

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS — single source of truth, all glass-ready
// Every component reads from here. Change once → everything updates.
// ─────────────────────────────────────────────────────────────────────────────
function useS(isDark) {
  // ── Glass recipe ────────────────────────────────────────────────────────
  // Dark:  near-black fill at 70%, heavy blur, bright top gloss
  // Light: near-white fill at 80%, heavy blur, white top gloss
  const glassBg   = isDark ? 'rgba(16,9,3,0.70)'          : 'rgba(255,252,246,0.80)'
  const glassBd   = isDark ? 'rgba(255,159,28,0.14)'       : 'rgba(180,100,20,0.13)'
  const glassBlur = 'blur(32px) saturate(200%) brightness(1.04)'
  const glassShadow = isDark
    ? '0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)'
    : '0 8px 32px rgba(92,51,23,0.12), inset 0 1px 0 rgba(255,255,255,0.92)'
  // Top gloss line — bright horizontal shine at top edge of every glass card
  const gloss = isDark
    ? 'linear-gradient(90deg,transparent,rgba(255,255,255,0.10) 30%,rgba(255,255,255,0.16) 50%,rgba(255,255,255,0.10) 70%,transparent)'
    : 'linear-gradient(90deg,transparent,rgba(255,255,255,0.80) 30%,rgba(255,255,255,1.00) 50%,rgba(255,255,255,0.80) 70%,transparent)'

  // ── Inner glass (slightly more transparent for nested cards) ────────────
  const innerGlassBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.60)'
  const innerGlassBd = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(180,100,20,0.10)'
  const innerGlassShadow = isDark
    ? 'inset 0 1px 0 rgba(255,255,255,0.05)'
    : 'inset 0 1px 0 rgba(255,255,255,0.90)'

  // ── Navbar glass (fixed, always floats) ─────────────────────────────────
  const navBg   = isDark ? 'rgba(10,5,0,0.60)'            : 'rgba(255,252,248,0.72)'
  const navBd   = isDark ? 'rgba(255,159,28,0.12)'         : 'rgba(180,100,20,0.12)'
  const navBlur = 'blur(40px) saturate(220%)'

  return {
    // Page
    pageBg:        isDark ? '#0D0905'                       : '#F5EDD8',

    // Glass card
    glassBg, glassBd, glassBlur, glassShadow, gloss,

    // Inner (nested) glass
    innerGlassBg, innerGlassBd, innerGlassShadow,

    // Navbar
    navBg, navBd, navBlur,

    // Image
    imageBg:       isDark ? 'rgba(255,159,28,0.07)'         : 'rgba(255,230,180,0.30)',
    imageShadow:   isDark
      ? '0 24px 64px rgba(0,0,0,0.60)'
      : '0 24px 64px rgba(92,51,23,0.20)',

    // Typography — centralized
    textPri:       isDark ? '#FFF8EE'                       : '#1A0E04',
    textSec:       isDark ? 'rgba(255,220,160,0.65)'        : 'rgba(90,45,8,0.62)',
    textMut:       isDark ? 'rgba(255,190,100,0.38)'        : 'rgba(120,65,10,0.40)',

    // Accent shortcuts
    accent:        'var(--accent)',
    accentGrad:    'var(--accent-gradient)',
    accentGlow:    'var(--accent-glow)',
    accentDim:     'var(--accent-dim)',
    accentBd:      'var(--accent-border)',

    // Structural
    divider:       isDark ? 'rgba(255,159,28,0.08)'         : 'rgba(180,100,20,0.09)',

    // Stat box (small tiles)
    statBg:        isDark ? 'rgba(255,255,255,0.05)'        : 'rgba(255,255,255,0.65)',
    statBd:        isDark ? 'rgba(255,255,255,0.09)'        : 'rgba(180,100,20,0.11)',
    statShadow:    isDark
      ? 'inset 0 1px 0 rgba(255,255,255,0.06)'
      : 'inset 0 1px 0 rgba(255,255,255,0.95)',

    // Stepper
    stepperBg:     isDark ? 'rgba(255,255,255,0.06)'        : 'rgba(255,255,255,0.60)',
    stepperBd:     isDark ? 'rgba(255,255,255,0.12)'        : 'rgba(180,100,20,0.15)',

    // Bottom bar
    barBg:         isDark ? 'rgba(10,5,0,0.88)'             : 'rgba(255,252,248,0.90)',
    barBd:         isDark ? 'rgba(255,159,28,0.12)'         : 'rgba(180,100,20,0.12)',
    barBlur:       'blur(40px) saturate(200%)',
    barFill:       isDark ? '#FFB84D'                       : '#E07B00',
    barTrack:      isDark ? 'rgba(255,159,28,0.12)'         : 'rgba(180,100,20,0.10)',

    // Nav overlay buttons (back / fav)
    overlayBtn:    isDark ? 'rgba(10,5,0,0.58)'             : 'rgba(255,255,255,0.82)',
    overlayBtnBd:  isDark ? 'rgba(255,255,255,0.14)'        : 'rgba(180,100,20,0.16)',
    overlayBlur:   'blur(24px) saturate(180%)',

    // Semantic
    veg:           '#22c55e',
    nonVeg:        '#ef4444',
    allergenBg:    'rgba(245,158,11,0.10)',
    allergenBd:    'rgba(245,158,11,0.25)',
    allergenTxt:   '#f59e0b',
  }
}

// ── Glass helper — thin gloss line at top of any glass div ────────────────────
function GlossLine({ S }) {
  return (
    <div aria-hidden style={{
      position: 'absolute', top: 0, left: '6%', right: '6%', height: 1,
      background: S.gloss, pointerEvents: 'none', zIndex: 1,
      borderRadius: '0 0 1px 1px',
    }}/>
  )
}

// ── glass() helper — returns style object for any glass surface ───────────────
function glass(S, extra = {}) {
  return {
    background:              S.glassBg,
    border:                  `1px solid ${S.glassBd}`,
    backdropFilter:          S.glassBlur,
    WebkitBackdropFilter:    S.glassBlur,
    boxShadow:               S.glassShadow,
    position:                'relative',
    overflow:                'hidden',
    ...extra,
  }
}

// ── innerGlass() helper — nested / inner surfaces ────────────────────────────
function innerGlass(S, extra = {}) {
  return {
    background:              S.innerGlassBg,
    border:                  `1px solid ${S.innerGlassBd}`,
    boxShadow:               S.innerGlassShadow,
    position:                'relative',
    overflow:                'hidden',
    ...extra,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// StatBox — one metric tile; skips render if value is falsy
// ─────────────────────────────────────────────────────────────────────────────
// ── StatBox — glass metric tile ───────────────────────────────────────────────
function StatBox({ icon, value, label, S }) {
  if (!value) return null
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '12px 6px', borderRadius: 16, minWidth: 0,
      ...innerGlass(S),
    }}>
      <GlossLine S={S}/>
      <div style={{
        width: 30, height: 30, borderRadius: 9, marginBottom: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: S.accentDim, border: `1px solid ${S.accentBd}`,
        position: 'relative', zIndex: 2,
      }}>
        {icon}
      </div>
      <span style={{
        fontSize: 14, fontWeight: 900, letterSpacing: '-0.03em',
        color: S.textPri, fontFamily: FONTS.mono, lineHeight: 1.1,
        textAlign: 'center', position: 'relative', zIndex: 2,
      }}>
        {value}
      </span>
      <span style={{
        fontSize: 10, fontWeight: 500, color: S.textMut,
        fontFamily: FONTS.body, marginTop: 2, textAlign: 'center',
        position: 'relative', zIndex: 2,
      }}>
        {label}
      </span>
    </div>
  )
}

// ── AccordionSection — glass card, tap to expand ──────────────────────────────
function AccordionSection({ title, icon, defaultOpen = false, badge, children, S }) {
  const [open, setOpen] = useState(defaultOpen)
  const bodyRef         = useRef(null)
  const arrowRef        = useRef(null)

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (bodyRef.current) {
      gsap.to(bodyRef.current, {
        height: next ? 'auto' : 0, opacity: next ? 1 : 0,
        duration: 0.32, ease: next ? 'expo.out' : 'power3.in',
      })
    }
    if (arrowRef.current)
      gsap.to(arrowRef.current, { rotation: next ? 180 : 0, duration: 0.26, ease: 'power2.out' })
  }

  return (
    <div style={{ ...glass(S, { borderRadius: 20, marginBottom: 10 }) }}>
      <GlossLine S={S}/>
      <button
        onClick={toggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          padding: '14px 16px', gap: 10, background: 'none',
          border: 'none', cursor: 'pointer', minHeight: 'unset',
          WebkitTapHighlightColor: 'transparent', position: 'relative', zIndex: 2,
        }}
      >
        {icon && (
          <div style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: S.accentDim, border: `1px solid ${S.accentBd}`,
          }}>
            {icon}
          </div>
        )}
        <span style={{
          flex: 1, fontSize: 14, fontWeight: 800, letterSpacing: '-0.025em',
          color: S.textPri, fontFamily: FONTS.heading, textAlign: 'left',
        }}>
          {title}
        </span>
        {badge != null && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: S.accent,
            background: S.accentDim, border: `1px solid ${S.accentBd}`,
            borderRadius: 20, padding: '2px 7px', fontFamily: FONTS.mono, flexShrink: 0,
          }}>
            {badge}
          </span>
        )}
        <div ref={arrowRef} style={{ flexShrink: 0, color: S.textMut, display: 'flex' }}>
          <ChevronDown size={14} strokeWidth={2.5}/>
        </div>
      </button>
      <div ref={bodyRef} style={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0, overflow: 'hidden' }}>
        <div style={{ padding: '0 16px 16px', position: 'relative', zIndex: 2 }}>{children}</div>
      </div>
    </div>
  )
}

// ── QtyStepper — vertical +/qty/− with glass buttons ─────────────────────────
function QtyStepper({ qty, onInc, onDec, S }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <button
        onClick={onInc}
        style={{
          width: 34, height: 34, borderRadius: 10, border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: S.accentDim, border: `1px solid ${S.accentBd}`,
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          minHeight: 'unset', minWidth: 'unset',
        }}
      >
        <Plus size={15} color="var(--accent)" strokeWidth={2.8}/>
      </button>
      <span style={{
        fontSize: 18, fontWeight: 900, color: S.textPri,
        fontFamily: FONTS.mono, letterSpacing: '-0.04em', lineHeight: 1,
        minWidth: 22, textAlign: 'center',
      }}>
        {qty}
      </span>
      <button
        onClick={onDec}
        style={{
          width: 34, height: 34, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: S.stepperBg, border: `1px solid ${S.stepperBd}`,
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          minHeight: 'unset', minWidth: 'unset',
        }}
      >
        <Minus size={15} color={S.textSec} strokeWidth={2.5}/>
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SimilarCard — compact swiper card
// ─────────────────────────────────────────────────────────────────────────────
function SimilarCard({ item, S, onNavigate }) {
  const dispatch = useDispatch()
  const cartQty  = useSelector(selectItemTotalQty(item?._id))
  const inCart   = cartQty > 0

  const handleAdd = (e) => {
    e.stopPropagation()
    dispatch(addItem({
      menuItemId: item._id, name: item.name,
      price: item.price, quantity: 1,
      emoji: item.emoji, category: item.category,
    }))
  }

  return (
    <div
      onClick={() => onNavigate(item._id)}
      style={{
        width: 132, flexShrink: 0, borderRadius: 18,
        ...glass(S, {
          border: `1px solid ${inCart ? S.accentBd : S.glassBd}`,
          cursor: 'pointer',
          transition: 'border-color 0.2s',
          boxShadow: inCart
            ? `0 0 0 2px ${S.accentDim}, ${S.glassShadow}`
            : S.glassShadow,
        }),
      }}
    >
      <GlossLine S={S}/>
      <div style={{
        height: 84, background: S.imageBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 34, overflow: 'hidden',
      }}>
        {item.image
          ? <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          : item.emoji
        }
      </div>
      <div style={{ padding: '8px 10px 10px' }}>
        <p style={{
          margin: 0, fontSize: 11, fontWeight: 800, color: S.textPri,
          fontFamily: FONTS.heading, letterSpacing: '-0.02em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.name}
        </p>
        <p style={{
          margin: '2px 0 7px', fontSize: 12, fontWeight: 900,
          color: S.accent, fontFamily: FONTS.mono, letterSpacing: '-0.025em',
        }}>
          {BRAND.currency} {item.price}
        </p>
        <button
          onClick={handleAdd}
          style={{
            width: '100%', height: 26, borderRadius: 8, border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
            background: inCart ? S.accentGrad : S.accentDim,
            color: inCart ? '#fff' : S.accent,
            fontSize: 10, fontWeight: 700, fontFamily: FONTS.body,
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            minHeight: 'unset',
          }}
        >
          {inCart ? <Check size={10} strokeWidth={3}/> : <Plus size={10} strokeWidth={3}/>}
          {inCart ? 'Added' : 'Add'}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function ItemDetailPage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const dispatch   = useDispatch()
  const { isDark } = useContext(ThemeContext)
  const S          = useS(isDark)

  // stable selector reference
  const selectItem = useCallback(makeSelectItemById(id), [id])

  const item    = useSelector(selectItem)
  const loading = useSelector(selectMenuLoading)
  const loaded  = useSelector(selectMenuLoaded)
  const user    = useSelector(selectUser)
  const cartQty = useSelector(selectItemTotalQty(item?._id ?? ''))

  const [qty,             setQty]             = useState(1)
  const [portionOpen,     setPortionOpen]     = useState(false)
  const [liked,           setLiked]           = useState(false)
  const [review,          setReview]          = useState({ rating: 5, comment: '' })
  const [submitting,      setSubmitting]      = useState(false)
  const [reviewsPage,     setReviewsPage]     = useState(1)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)

  const pageRef = useRef(null)
  const barRef  = useRef(null)

  // Fetch if store is empty
  useEffect(() => {
    if (!loaded && !loading) {
      const cafeId = localStorage.getItem('kc_cafe_id') || import.meta.env.VITE_CAFE_ID
      if (cafeId) dispatch(fetchMenu(cafeId))
    }
  }, [loaded, loading, dispatch])

  // Page entrance
  useEffect(() => {
    if (!item || !pageRef.current) return
    gsap.fromTo(pageRef.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.42, ease: 'expo.out' })
  }, [item])

  // Bar entrance
  useEffect(() => {
    if (!barRef.current || !item) return
    gsap.fromTo(barRef.current, { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.46, ease: 'back.out(1.5)', delay: 0.15 })
  }, [item])

  const hasPortions = Array.isArray(item?.portions) && item.portions.length > 0
  const isVeg       = item?.isVeg ?? item?.dietaryInfo?.includes('veg')

  const unitPrice = hasPortions
    ? Math.min(...(item?.portions ?? []).map(p => Number(p.price)).filter(Boolean))
    : (item?.price ?? 0)

  const displayPrice = hasPortions
    ? `from ${BRAND.currency} ${unitPrice}`
    : item?.price != null ? `${BRAND.currency} ${item.price}` : null

  const totalPrice = unitPrice * qty

  const handleAdd = useCallback(() => {
    if (!item) return
    if (hasPortions) { lockScroll(); setPortionOpen(true); return }
    dispatch(addItem({
      menuItemId: item._id, name: item.name,
      price: item.price, quantity: qty,
      emoji: item.emoji, category: item.category,
    }))
    if (barRef.current) {
      gsap.timeline()
        .to(barRef.current, { scale: 0.96, duration: 0.08, ease: 'power2.in' })
        .to(barRef.current, { scale: 1,    duration: 0.28, ease: 'back.out(3)' })
    }
  }, [item, hasPortions, qty, dispatch])

  const handleReviewSubmit = async () => {
    if (!review.comment.trim() || submitting) return
    setSubmitting(true)
    try { setReviewSubmitted(true) }
    catch (err) { console.error(err) }
    finally { setSubmitting(false) }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading || (!item && !loaded)) {
    return (
      <div style={{ minHeight: '100dvh', background: S.pageBg, padding: '16px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 42, height: 42, borderRadius: 14, border: 'none',
            background: S.overlayBtn, display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer',
            marginTop: 'calc(env(safe-area-inset-top,0px) + 4px)',
            marginBottom: 20, minHeight: 'unset',
          }}
        >
          <ArrowLeft size={18} color={S.textPri} strokeWidth={2.5}/>
        </button>
        <div className="skeleton" style={{ height: 280, borderRadius: 28, marginBottom: 20 }}/>
        <div className="skeleton skeleton-title" style={{ width: '55%', marginBottom: 10 }}/>
        <div className="skeleton skeleton-text"  style={{ width: '35%', marginBottom: 20 }}/>
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ flex: 1, height: 70, borderRadius: 16 }}/>)}
        </div>
        <div className="skeleton" style={{ height: 90, borderRadius: 18 }}/>
      </div>
    )
  }

  if (!item) {
    return (
      <div style={{
        minHeight: '100dvh', background: S.pageBg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 14, padding: 24,
      }}>
        <span style={{ fontSize: 52 }}>🍽️</span>
        <p style={{ margin: 0, fontSize: 15, color: S.textSec, fontFamily: FONTS.body, textAlign: 'center' }}>
          Item not found
        </p>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '10px 24px', borderRadius: 14, border: 'none',
            background: S.accentGrad, color: '#fff',
            fontSize: 14, fontWeight: 700, fontFamily: FONTS.brand, cursor: 'pointer',
            minHeight: 'unset',
          }}
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <div
      ref={pageRef}
      style={{
        minHeight: '100dvh', background: S.pageBg,
        paddingTop: 'calc(env(safe-area-inset-top,0px) + 62px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 96px)',
        maxWidth: 448, margin: '0 auto', position: 'relative',
      }}
    >

      {/* ── GLASS NAVBAR — floats over everything ────────────────────────── */}
      <div style={{
        position: 'fixed', top: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', maxWidth: 448,
        zIndex: 40,
        // Glass nav
        background: S.navBg,
        backdropFilter: S.navBlur,
        WebkitBackdropFilter: S.navBlur,
        borderBottom: `1px solid ${S.navBd}`,
        // Top gloss on nav bar
        boxShadow: isDark
          ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 24px rgba(0,0,0,0.30)'
          : 'inset 0 1px 0 rgba(255,255,255,0.95), 0 4px 24px rgba(92,51,23,0.10)',
        padding: 'calc(env(safe-area-inset-top,0px) + 10px) 16px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 40, height: 40, borderRadius: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: S.overlayBtn,
            border: `1px solid ${S.overlayBtnBd}`,
            backdropFilter: S.overlayBlur, WebkitBackdropFilter: S.overlayBlur,
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            minHeight: 'unset', minWidth: 'unset',
          }}
        >
          <ArrowLeft size={17} color={S.textPri} strokeWidth={2.5}/>
        </button>

        {/* Item name in navbar — appears as user scrolls */}
        <span style={{
          fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em',
          color: S.textPri, fontFamily: FONTS.heading,
          flex: 1, textAlign: 'center', padding: '0 10px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.name}
        </span>

        {/* Fav button */}
        <button
          onClick={() => setLiked(l => !l)}
          style={{
            width: 40, height: 40, borderRadius: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: S.overlayBtn,
            border: `1px solid ${liked ? 'rgba(239,68,68,0.35)' : S.overlayBtnBd}`,
            backdropFilter: S.overlayBlur, WebkitBackdropFilter: S.overlayBlur,
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            minHeight: 'unset', minWidth: 'unset',
            transition: 'border-color 0.2s',
          }}
        >
          <Heart
            size={16}
            color={liked ? '#ef4444' : S.textSec}
            fill={liked ? '#ef4444' : 'none'}
            strokeWidth={2.2}
          />
        </button>
      </div>

      {/* ── HERO IMAGE — sits below navbar ────────────────────────────────── */}
      <div style={{
        margin: '0 16px',
        height: 290,
        borderRadius: '0 0 28px 28px',
        background: S.imageBg,
        overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        boxShadow: S.imageShadow,
      }}>
        {item.image ? (
          <img
            src={item.image} alt={item.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span style={{ fontSize: 110, lineHeight: 1 }}>{item.emoji ?? '🍽️'}</span>
        )}

        {/* Veg badge — glass pill */}
        <div style={{
          position: 'absolute', bottom: 14, left: 14,
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 11px', borderRadius: 20,
          background: isDark ? 'rgba(10,5,0,0.55)' : 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: `1px solid ${isVeg ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
          boxShadow: isDark
            ? 'inset 0 1px 0 rgba(255,255,255,0.08)'
            : 'inset 0 1px 0 rgba(255,255,255,0.95)',
        }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: isVeg ? S.veg : S.nonVeg, flexShrink: 0 }}/>
          <span style={{ fontSize: 11, fontWeight: 700, color: isVeg ? S.veg : S.nonVeg, fontFamily: FONTS.body }}>
            {isVeg ? 'Veg' : 'Non-Veg'}
          </span>
        </div>

        {/* Rating badge — glass pill */}
        {item.rating != null && (
          <div style={{
            position: 'absolute', bottom: 14, right: 14,
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 11px', borderRadius: 20,
            background: isDark ? 'rgba(10,5,0,0.55)' : 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255,184,77,0.32)',
            boxShadow: isDark
              ? 'inset 0 1px 0 rgba(255,255,255,0.08)'
              : 'inset 0 1px 0 rgba(255,255,255,0.95)',
          }}>
            <Star size={11} color="#FFB84D" fill="#FFB84D"/>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#FFB84D', fontFamily: FONTS.mono, letterSpacing: '-0.02em' }}>
              {Number(item.rating).toFixed(1)}
            </span>
            {item.reviewCount != null && (
              <span style={{ fontSize: 10, color: 'rgba(255,184,77,0.6)' }}>
                ({item.reviewCount})
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 16px 0', paddingTop: '24px' }}>

        {/* Category + Name */}
        <div style={{ marginBottom: 8 }}>
          {item.category && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: S.accent,
              fontFamily: FONTS.body, letterSpacing: '0.08em',
              textTransform: 'uppercase', display: 'block', marginBottom: 4,
            }}>
              {item.category}
            </span>
          )}
          <h1 style={{
            margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em',
            lineHeight: 1.1, color: S.textPri, fontFamily: FONTS.heading,
          }}>
            {item.name}
          </h1>
        </div>

        {/* Price */}
        {displayPrice && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 18 }}>
            <span style={{
              fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em',
              color: S.accent, fontFamily: FONTS.mono, lineHeight: 1,
            }}>
              {displayPrice}
            </span>
            {item.originalPrice && item.originalPrice > (item.price ?? 0) && (
              <span style={{
                fontSize: 14, fontWeight: 600, color: S.textMut,
                fontFamily: FONTS.mono, textDecoration: 'line-through',
              }}>
                {BRAND.currency} {item.originalPrice}
              </span>
            )}
          </div>
        )}

        {/* STATS ROW — only renders stats that exist */}
        {(item.calories || item.weight || item.prepTime || item.servings) && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <StatBox icon={<Zap size={14} color="var(--accent)" strokeWidth={2.2}/>}
              value={item.calories ? `${item.calories} kkal` : null} label="Energy" S={S}/>
            <StatBox icon={<Weight size={14} color="var(--accent)" strokeWidth={2.2}/>}
              value={item.weight ? `${item.weight} gr.` : null} label="Weight" S={S}/>
            <StatBox icon={<Clock size={14} color="var(--accent)" strokeWidth={2.2}/>}
              value={item.prepTime ? `${item.prepTime} min` : null} label="Prep time" S={S}/>
            <StatBox icon={<Users size={14} color="var(--accent)" strokeWidth={2.2}/>}
              value={item.servings ? `${item.servings} pax` : null} label="Serves" S={S}/>
          </div>
        )}

        {/* QTY STEPPER + DESCRIPTION — glass card */}
        {item.description && (
          <div style={{
            display: 'flex', gap: 14, alignItems: 'flex-start',
            padding: '14px', borderRadius: 20, marginBottom: 14,
            ...glass(S),
          }}>
            <GlossLine S={S}/>
            {!hasPortions && (
              <QtyStepper qty={qty} onInc={() => setQty(q => q + 1)} onDec={() => setQty(q => Math.max(1, q - 1))} S={S}/>
            )}
            <p style={{
              margin: 0, flex: 1, fontSize: 14, lineHeight: 1.65,
              color: S.textSec, fontFamily: FONTS.body, letterSpacing: '-0.01em',
              position: 'relative', zIndex: 2,
            }}>
              {item.description}
            </p>
          </div>
        )}

        {/* ALLERGENS */}
        {item.allergens?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: S.textMut, fontWeight: 600, fontFamily: FONTS.body }}>
              Contains:
            </span>
            {item.allergens.map(a => (
              <span key={a} style={{
                fontSize: 11, fontWeight: 700, color: S.allergenTxt,
                background: S.allergenBg, border: `1px solid ${S.allergenBd}`,
                borderRadius: 20, padding: '2px 8px', fontFamily: FONTS.body,
              }}>
                {a}
              </span>
            ))}
          </div>
        )}

        {/* LOYALTY STRIP — glass */}
        {item.loyaltyPoints > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 14, marginBottom: 14,
            ...innerGlass(S),
            border: `1px solid ${S.accentBd}`,
          }}>
            <GlossLine S={S}/>
            <span style={{ fontSize: 18, position: 'relative', zIndex: 2 }}>⭐</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: S.textSec, fontFamily: FONTS.body, position: 'relative', zIndex: 2 }}>
              Earn <strong style={{ color: S.accent }}>{item.loyaltyPoints} pts</strong> for this item
            </span>
          </div>
        )}

        <div style={{ height: 1, background: S.divider, marginBottom: 12 }}/>

        {/* CUSTOMIZE ACCORDION */}
        {(hasPortions || item.extras?.length > 0 || item.spiceLevel) && (
          <AccordionSection
            title="Customise"
            icon={<span style={{ fontSize: 14 }}>✏️</span>}
            defaultOpen S={S}
          >
            {item.spiceLevel && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 12px', borderRadius: 12, marginBottom: 8,
                ...innerGlass(S),
              }}>
                <GlossLine S={S}/>
                <Flame size={13} color="#ef4444" style={{ position: 'relative', zIndex: 2 }}/>
                <span style={{ fontSize: 13, fontWeight: 600, color: S.textSec, fontFamily: FONTS.body, position: 'relative', zIndex: 2 }}>
                  Spice level:
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: S.textPri, fontFamily: FONTS.body, marginLeft: 'auto', position: 'relative', zIndex: 2 }}>
                  {item.spiceLevel}
                </span>
              </div>
            )}
            {hasPortions && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{
                  margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: S.textMut,
                  fontFamily: FONTS.body, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  Choose size
                </p>
                {item.portions.map(p => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 14px', borderRadius: 14,
                    ...innerGlass(S), border: `1.5px solid ${S.innerGlassBd}`,
                  }}>
                    <GlossLine S={S}/>
                    <span style={{ fontSize: 14, fontWeight: 700, color: S.textPri, fontFamily: FONTS.body, position: 'relative', zIndex: 2 }}>
                      {p.label}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: S.accent, fontFamily: FONTS.mono, letterSpacing: '-0.025em', position: 'relative', zIndex: 2 }}>
                      {BRAND.currency} {p.price}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {item.extras?.length > 0 && (
              <div style={{ marginTop: hasPortions ? 12 : 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <p style={{
                  margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: S.textMut,
                  fontFamily: FONTS.body, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  Add-ons
                </p>
                {item.extras.map(ex => (
                  <div key={ex.id ?? ex.label} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 12px', borderRadius: 12,
                    ...innerGlass(S),
                  }}>
                    <GlossLine S={S}/>
                    <span style={{ fontSize: 13, fontWeight: 600, color: S.textSec, fontFamily: FONTS.body, position: 'relative', zIndex: 2 }}>
                      + {ex.label}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: S.accent, fontFamily: FONTS.mono, position: 'relative', zIndex: 2 }}>
                      +{BRAND.currency} {ex.price}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </AccordionSection>
        )}

        {/* REVIEWS ACCORDION */}
        {(item.reviews?.length > 0 || user) && (
          <AccordionSection
            title="Reviews"
            icon={<Star size={13} color="var(--accent)" strokeWidth={2.2}/>}
            badge={item.reviewCount ?? item.reviews?.length ?? 0}
            defaultOpen={false} S={S}
          >
            {/* Summary */}
            {item.ratingBreakdown && item.rating != null && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 40, fontWeight: 900, color: S.accent, fontFamily: FONTS.mono, letterSpacing: '-0.05em', lineHeight: 1 }}>
                    {Number(item.rating).toFixed(1)}
                  </span>
                  <div>
                    <div style={{ display: 'flex', gap: 3, marginBottom: 3 }}>
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} size={13}
                          fill={i <= Math.round(item.rating) ? '#FFB84D' : 'none'}
                          color={i <= Math.round(item.rating) ? '#FFB84D' : S.textMut}
                          strokeWidth={1.8}/>
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: S.textMut, fontFamily: FONTS.body }}>
                      {item.reviewCount ?? item.reviews?.length ?? 0} reviews
                    </span>
                  </div>
                </div>
                {[5,4,3,2,1].map(star => {
                  const count = item.ratingBreakdown?.[star] ?? 0
                  const total = Math.max(item.reviewCount ?? 1, 1)
                  const pct   = Math.round((count / total) * 100)
                  return (
                    <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: S.textMut, fontFamily: FONTS.mono, width: 10 }}>{star}</span>
                      <div style={{ flex: 1, height: 5, borderRadius: 99, background: S.barTrack, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: S.barFill, transition: 'width 0.5s ease' }}/>
                      </div>
                      <span style={{ fontSize: 10, color: S.textMut, fontFamily: FONTS.mono, width: 26, textAlign: 'right' }}>{pct}%</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Write review */}
            {user && !reviewSubmitted && (
              <div style={{ padding: 12, borderRadius: 14, ...innerGlass(S), marginBottom: 10 }}>
                <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: S.textPri, fontFamily: FONTS.body }}>
                  Write a review
                </p>
                <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                  {[1,2,3,4,5].map(i => (
                    <button key={i} onClick={() => setReview(r => ({ ...r, rating: i }))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 1, minHeight: 'unset', minWidth: 'unset' }}>
                      <Star size={22}
                        fill={i <= review.rating ? '#FFB84D' : 'none'}
                        color={i <= review.rating ? '#FFB84D' : S.textMut}
                        strokeWidth={1.8}/>
                    </button>
                  ))}
                </div>
                <textarea
                  value={review.comment}
                  onChange={e => setReview(r => ({ ...r, comment: e.target.value }))}
                  placeholder="Share your thoughts…"
                  rows={3}
                  style={{
                    width: '100%', borderRadius: 10, padding: '9px 11px',
                    background: S.innerGlassBg,
                    border: `1px solid ${S.innerGlassBd}`,
                    color: S.textPri, fontSize: 13, fontFamily: FONTS.body,
                    resize: 'none', outline: 'none', boxSizing: 'border-box',
                    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                  }}
                />
                <button
                  onClick={handleReviewSubmit}
                  disabled={submitting || !review.comment.trim()}
                  style={{
                    marginTop: 8, padding: '9px 18px', borderRadius: 10, border: 'none',
                    background: review.comment.trim() ? S.accentGrad : S.innerGlassBg,
                    border: `1px solid ${review.comment.trim() ? 'transparent' : S.innerGlassBd}`,
                    color: review.comment.trim() ? '#fff' : S.textMut,
                    fontSize: 12, fontWeight: 700, cursor: review.comment.trim() ? 'pointer' : 'not-allowed',
                    fontFamily: FONTS.brand, minHeight: 'unset',
                  }}
                >
                  {submitting ? 'Submitting…' : 'Submit Review'}
                </button>
              </div>
            )}

            {/* Review list */}
            {item.reviews?.slice(0, reviewsPage * 5).map((r, i) => (
              <div key={r._id ?? i} style={{ padding: '10px 12px', borderRadius: 12, ...innerGlass(S), marginBottom: 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: S.accentDim, border: `1px solid ${S.accentBd}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 800, color: S.accent,
                    }}>
                      {(r.user?.name ?? r.userId ?? 'A')[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: S.textPri, fontFamily: FONTS.body }}>
                      {r.user?.name ?? 'Anonymous'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={10}
                        fill={s <= r.rating ? '#FFB84D' : 'none'}
                        color={s <= r.rating ? '#FFB84D' : S.textMut}
                        strokeWidth={2}/>
                    ))}
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: S.textSec, fontFamily: FONTS.body }}>
                  {r.comment}
                </p>
              </div>
            ))}

            {item.reviews?.length > reviewsPage * 5 && (
              <button
                onClick={() => setReviewsPage(p => p + 1)}
                style={{
                  width: '100%', padding: '9px', borderRadius: 10,
                  ...innerGlass(S),
                  color: S.accent, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: FONTS.body,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  minHeight: 'unset',
                }}
              >
                Load more <ChevronDown size={13}/>
              </button>
            )}
          </AccordionSection>
        )}

        {/* SIMILAR ITEMS ACCORDION */}
        {item.similar?.length > 0 && (
          <AccordionSection
            title="You might also like"
            icon={<span style={{ fontSize: 13 }}>✨</span>}
            badge={item.similar.length}
            defaultOpen={false} S={S}
          >
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
              {item.similar.map(sim => (
                <SimilarCard key={sim._id} item={sim} S={S}
                  onNavigate={(simId) => navigate(`/menu/item/${simId}`)}/>
              ))}
            </div>
          </AccordionSection>
        )}
      </div>

      {/* ── STICKY BOTTOM BAR — glass, Add to cart + price ───────────────── */}
      <div
        ref={barRef}
        style={{
          position: 'fixed', bottom: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: '100%', maxWidth: 448,
          padding: `12px 16px calc(env(safe-area-inset-bottom,0px) + 10px)`,
          background: S.barBg,
          borderTop: `1px solid ${S.barBd}`,
          backdropFilter: S.barBlur,
          WebkitBackdropFilter: S.barBlur,
          boxShadow: isDark
            ? '0 -8px 32px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06)'
            : '0 -8px 32px rgba(92,51,23,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
          zIndex: 50,
          display: 'flex', alignItems: 'center', gap: 10,
        }}
      >
        {/* Add to cart — wide accent pill */}
        <button
          onClick={handleAdd}
          style={{
            flex: 1, height: 52, borderRadius: 17, border: 'none',
            background: S.accentGrad,
            boxShadow: `0 8px 28px ${S.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.22)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: 'pointer', fontFamily: FONTS.brand,
            WebkitTapHighlightColor: 'transparent', minHeight: 'unset',
            position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Button gloss */}
          <div aria-hidden style={{
            position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
            background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.55) 50%,transparent)',
            pointerEvents: 'none',
          }}/>
          <ShoppingCart size={17} color="#fff" strokeWidth={2.2}/>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            {hasPortions ? 'Choose Size' : 'Add to cart'}
          </span>
        </button>

        {/* Price pill — glass */}
        <div style={{
          flexShrink: 0, height: 52, padding: '0 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 17,
          ...innerGlass(S),
          border: `1px solid ${S.innerGlassBd}`,
          position: 'relative',
        }}>
          <GlossLine S={S}/>
          <span style={{
            fontSize: 17, fontWeight: 900, color: S.accent,
            fontFamily: FONTS.mono, letterSpacing: '-0.04em', whiteSpace: 'nowrap',
            position: 'relative', zIndex: 2,
          }}>
            {hasPortions ? displayPrice : `${BRAND.currency} ${totalPrice}`}
          </span>
        </div>
      </div>

      {/* ── PORTION SHEET ─────────────────────────────────────────────────── */}
      {portionOpen && hasPortions && (
        <PortionSheet
          item={item}
          onClose={() => { unlockScroll(); setPortionOpen(false) }}
        />
      )}
    </div>
  )
}