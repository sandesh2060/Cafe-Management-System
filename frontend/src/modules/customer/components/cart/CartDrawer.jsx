// src/modules/customer/components/cart/CartDrawer.jsx
//
// ─── iPhone 17 Glass Design System ───────────────────────────────────────────
// 3-layer glass stack:
//   Layer 1 — Overlay        blur(20px) dimmed backdrop
//   Layer 2 — Sheet surface  blur(48px) saturate(220%) frosted panel
//   Layer 3 — Totals card    blur(12px) inner glass card
//
// ALL colors, fonts, spacing, radii live in useCartDrawerTokens(isDark).
// Zero inline hex values in JSX — every value comes from T.
//
// colors.js additions at bottom of this file (Step 1 comment).
// ─────────────────────────────────────────────────────────────────────────────

import { useContext, useRef, useEffect, useCallback, useState } from 'react'
import { createPortal }             from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate }              from 'react-router-dom'
import { motion, AnimatePresence }  from 'motion/react'
import gsap                         from 'gsap'
import {
  X, ShoppingCart, Trash2, Plus, Minus,
  ChevronRight, Loader2, AlertCircle, PlusCircle, Lock,
} from 'lucide-react'
import { ThemeContext }  from '@shared/context/ThemeContext'
import { BRAND, FONTS }  from '@shared/config/brand'
import { useDeviceTier } from '@shared/hooks/useDeviceTier'
import {
  selectCartItems, selectCartSubtotal, selectCartTotal,
  selectCartDiscount, removeItem, updateQuantity, clearCart,
} from '@store/slices/cartSlice'
import { selectTableId, selectSessionId } from '@store/slices/tableSessionSlice'
import {
  placeOrder, selectOrderPlacing, selectOrderError,
  selectHasActiveOrder, selectActiveOrder, selectCanAddItems,
  clearError, clearMerged, clearReordered,
} from '@store/slices/orderSlice'
import { selectUser }    from '@store/slices/authSlice'
import { selectLoyalty } from '@store/slices/loyaltySlice'
import toast             from 'react-hot-toast'

// ─────────────────────────────────────────────────────────────────────────────
// useCartDrawerTokens — everything in one place
// ─────────────────────────────────────────────────────────────────────────────
function useCartDrawerTokens(isDark) {
  const D = isDark
  return {
    // ── Typography ─────────────────────────────────────────────────────────
    // F.size.*  — use these, never raw numbers
    // F.weight.* — use these, never raw numbers
    F: {
      family: {
        heading: FONTS.heading,   // Sora
        body:    FONTS.body,      // DM Sans
        mono:    FONTS.mono,      // DM Mono
        brand:   FONTS.brand,     // Baloo 2
      },
      size: {
        '2xs': 10,
        xs:    11,
        sm:    12,
        md:    13,
        lg:    15,
        xl:    17,
        '2xl': 16,
      },
      weight: {
        medium:    500,
        semibold:  600,
        bold:      700,
        extrabold: 800,
        black:     900,
      },
      tracking: {
        wide:    '0.06em',
        normal:  '0em',
        tight:   '-0.02em',
        tighter: '-0.03em',
      },
    },

    // ── Spacing (8px grid) ─────────────────────────────────────────────────
    S: {
      px: 20,    // sheet horizontal padding
      2:   4,
      3:   8,
      4:  12,
      5:  16,
      6:  20,
      8:  24,
    },

    // ── Radii ─────────────────────────────────────────────────────────────
    R: {
      sheet:  28,
      icon:   14,
      qty:    11,
      btn:    17,
      tag:     8,
      note:   13,
      close:  11,
      banner: 13,
      inner:  14,
    },

    // ── Layer 1: Overlay ──────────────────────────────────────────────────
    overlayBg:   D ? 'rgba(6,3,1,0.72)'    : 'rgba(20,10,3,0.52)',
    overlayBlur: 'blur(20px)',

    // ── Layer 2: Sheet glass ──────────────────────────────────────────────
    sheetBg:     D
      ? 'rgba(14,8,3,0.84)'
      : 'rgba(255,252,248,0.80)',
    sheetBlur:   'blur(48px) saturate(220%)',
    sheetBorder: D
      ? 'rgba(255,159,28,0.10)'
      : 'rgba(255,255,255,0.68)',
    sheetShadow: D
      ? '0 -40px 80px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.06)'
      : '0 -24px 48px rgba(92,51,23,0.14), inset 0 1px 0 rgba(255,255,255,0.90)',
    // iPhone 17 top shimmer
    topGlow:        'var(--top-glow)',
    topGlowOpacity: D ? 0.72 : 0.52,
    handleBg:       D ? 'rgba(255,159,28,0.20)' : 'rgba(180,100,20,0.18)',

    // ── Layer 3: Inner glass (totals card) ────────────────────────────────
    innerBg:     D ? 'rgba(255,255,255,0.04)'  : 'rgba(255,255,255,0.62)',
    innerBorder: D ? 'rgba(255,255,255,0.07)'  : 'rgba(255,255,255,0.82)',
    innerBlur:   'blur(12px) saturate(160%)',
    innerShadow: D
      ? 'inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.12)'
      : 'inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(180,100,20,0.04)',

    // ── Gloss line (reused on inner cards + CTA) ──────────────────────────
    glossLine: D
      ? 'linear-gradient(90deg,transparent,rgba(255,255,255,0.16) 35%,rgba(255,255,255,0.26) 50%,rgba(255,255,255,0.16) 65%,transparent)'
      : 'linear-gradient(90deg,transparent,rgba(255,255,255,0.90) 35%,rgba(255,255,255,1.00) 50%,rgba(255,255,255,0.90) 65%,transparent)',

    // ── Dividers ──────────────────────────────────────────────────────────
    divider:    D ? 'rgba(255,159,28,0.09)'  : 'rgba(180,100,20,0.09)',
    rowDivider: D ? 'rgba(255,255,255,0.06)' : 'rgba(180,100,20,0.08)',

    // ── Header ────────────────────────────────────────────────────────────
    iconBg:     'var(--accent-gradient)',
    iconShadow: D
      ? '0 4px 18px rgba(255,159,28,0.45), 0 0 0 1px rgba(255,159,28,0.22)'
      : '0 4px 16px rgba(180,100,20,0.32), 0 0 0 1px rgba(200,104,10,0.18)',
    iconGloss:  'linear-gradient(135deg,rgba(255,255,255,0.32) 0%,transparent 58%)',
    titleColor: D ? '#FFF8EE'                   : '#1A0E04',
    subColor:   D ? 'rgba(255,190,100,0.46)'    : 'rgba(120,65,10,0.48)',
    closeBg:    D ? 'rgba(255,255,255,0.06)'    : 'rgba(0,0,0,0.05)',
    closeBd:    D ? 'rgba(255,255,255,0.10)'    : 'rgba(0,0,0,0.09)',
    closeColor: D ? 'rgba(255,220,160,0.55)'    : 'rgba(90,45,8,0.52)',
    clearBg:    D ? 'rgba(239,68,68,0.10)'      : 'rgba(239,68,68,0.07)',
    clearBd:    D ? 'rgba(239,68,68,0.28)'      : 'rgba(239,68,68,0.22)',
    clearColor: D ? '#FCA5A5'                   : '#DC2626',

    // ── Item row ──────────────────────────────────────────────────────────
    emojiBg:    D ? 'rgba(255,159,28,0.10)'     : 'rgba(255,159,28,0.08)',
    emojiBd:    D ? 'rgba(255,159,28,0.16)'     : 'rgba(180,100,20,0.14)',
    itemName:   D ? '#FFF8EE'                   : '#1A0E04',
    itemPortion:D ? 'rgba(255,190,100,0.52)'    : 'rgba(120,65,10,0.52)',
    itemPrice:  D ? '#FFB84D'                   : '#B85C00',
    trashBg:    D ? 'rgba(239,68,68,0.10)'      : 'rgba(239,68,68,0.07)',
    trashBd:    D ? 'rgba(239,68,68,0.22)'      : 'rgba(239,68,68,0.16)',
    trashColor: D ? '#FCA5A5'                   : '#DC2626',
    qtyBg:      D ? 'rgba(255,255,255,0.05)'    : 'rgba(0,0,0,0.04)',
    qtyBd:      D ? 'rgba(255,255,255,0.10)'    : 'rgba(0,0,0,0.10)',
    qtyControl: D ? 'rgba(255,220,160,0.55)'    : 'rgba(90,45,8,0.55)',
    qtyCount:   D ? '#FFF8EE'                   : '#1A0E04',

    // ── Note ──────────────────────────────────────────────────────────────
    noteBg:      D ? 'rgba(255,255,255,0.04)'   : 'rgba(0,0,0,0.04)',
    noteBd:      D ? 'rgba(255,255,255,0.09)'   : 'rgba(0,0,0,0.09)',
    noteFocusBd: D ? 'rgba(255,159,28,0.55)'    : 'rgba(200,104,10,0.55)',
    noteFocusSh: D ? '0 0 0 3px rgba(255,159,28,0.12)' : '0 0 0 3px rgba(180,100,20,0.10)',
    noteColor:   D ? '#FFF8EE'                  : '#1A0E04',

    // ── Totals ────────────────────────────────────────────────────────────
    subLabel:    D ? 'rgba(255,190,100,0.46)'   : 'rgba(120,65,10,0.50)',
    subValue:    D ? 'rgba(255,220,160,0.65)'   : 'rgba(90,45,8,0.68)',
    discount:    D ? '#34D399'                  : '#059669',
    totLabel:    D ? '#FFF8EE'                  : '#1A0E04',
    totValue:    D ? '#FFB84D'                  : '#B85C00',

    // ── Banners ───────────────────────────────────────────────────────────
    lockedBg:    D ? 'rgba(239,68,68,0.09)'     : 'rgba(239,68,68,0.06)',
    lockedBd:    D ? 'rgba(239,68,68,0.28)'     : 'rgba(239,68,68,0.18)',
    lockedTitle: D ? '#FCA5A5'                  : '#DC2626',
    lockedBody:  D ? 'rgba(255,190,100,0.46)'   : 'rgba(120,65,10,0.50)',
    addonBg:     D ? 'rgba(255,159,28,0.08)'    : 'rgba(255,242,205,0.80)',
    addonBd:     D ? 'rgba(255,159,28,0.22)'    : 'rgba(228,182,78,0.40)',
    addonIcon:   D ? '#FFB84D'                  : '#B85C00',
    addonTitle:  D ? '#FFB84D'                  : '#7A4A0A',
    addonBody:   D ? 'rgba(255,190,100,0.46)'   : 'rgba(120,65,10,0.50)',
    delivBg:     D ? 'rgba(245,158,11,0.09)'    : 'rgba(245,158,11,0.07)',
    delivBd:     D ? 'rgba(245,158,11,0.30)'    : 'rgba(245,158,11,0.22)',
    delivTitle:  '#F59E0B',
    errBg:       D ? 'rgba(239,68,68,0.09)'     : 'rgba(239,68,68,0.06)',
    errBd:       D ? 'rgba(239,68,68,0.28)'     : 'rgba(239,68,68,0.18)',
    errColor:    D ? '#FCA5A5'                  : '#DC2626',

    // ── CTA ───────────────────────────────────────────────────────────────
    ctaBg:       'var(--accent-gradient)',
    ctaShadow:   D
      ? '0 8px 32px rgba(255,159,28,0.42), inset 0 1px 0 rgba(255,255,255,0.24)'
      : '0 8px 28px rgba(180,100,20,0.34), inset 0 1px 0 rgba(255,255,255,0.28)',
    ctaGloss:    'linear-gradient(90deg,transparent,rgba(255,255,255,0.28) 50%,transparent)',
    ctaColor:    '#FFFFFF',
    ctaDisBg:    D ? 'rgba(255,255,255,0.06)'   : 'rgba(180,100,20,0.08)',
    ctaDisColor: D ? 'rgba(255,190,100,0.25)'   : 'rgba(120,65,10,0.30)',
    ctaLockOp:   0.48,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GlossLine — top-edge shimmer, used on all glass surfaces
// ─────────────────────────────────────────────────────────────────────────────
const GlossLine = ({ glossLine }) => (
  <div aria-hidden style={{
    position: 'absolute', top: 0, left: '6%', right: '6%', height: 1,
    background: glossLine, pointerEvents: 'none', zIndex: 3,
  }}/>
)

// ─────────────────────────────────────────────────────────────────────────────
// CartRow
// ─────────────────────────────────────────────────────────────────────────────
const CartRow = ({ item, T, onRemove, onQty, gsapEnabled }) => {
  const plusRef = useRef(null)
  const minRef  = useRef(null)
  const { F, S, R } = T

  const bump = (ref) => {
    if (!gsapEnabled || !ref.current) return
    gsap.timeline()
      .to(ref.current, { scale: 0.72, duration: 0.08, ease: 'power3.in'  })
      .to(ref.current, { scale: 1.18, duration: 0.20, ease: 'back.out(3)' })
      .to(ref.current, { scale: 1,    duration: 0.18, ease: 'power2.out'  })
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      style={{
        display: 'flex', alignItems: 'center', gap: S[4],
        paddingTop: S[5], paddingBottom: S[5],
        borderBottom: `1px solid ${T.rowDivider}`,
      }}
    >
      {/* Emoji tile */}
      <div style={{
        width: 48, height: 48, borderRadius: R.icon, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, lineHeight: 1,
        background: T.emojiBg, border: `1px solid ${T.emojiBd}`,
      }}>
        {item.emoji}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p style={{
          margin: 0,
          fontSize: F.size.md, fontWeight: F.weight.bold,
          letterSpacing: F.tracking.tight, lineHeight: 1.25,
          color: T.itemName, fontFamily: F.family.body,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.name}
        </p>
        {item.portionLabel && (
          <p style={{
            margin: 0,
            fontSize: F.size['2xs'], fontWeight: F.weight.semibold,
            letterSpacing: F.tracking.wide, lineHeight: 1,
            color: T.itemPortion, fontFamily: F.family.body,
            textTransform: 'uppercase',
          }}>
            {item.portionLabel}
          </p>
        )}
        <p style={{
          margin: 0,
          fontSize: F.size.md, fontWeight: F.weight.extrabold,
          letterSpacing: F.tracking.tight, lineHeight: 1,
          color: T.itemPrice, fontFamily: F.family.mono,
        }}>
          {BRAND.currency} {item.price * item.quantity}
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: S[3] }}>
        <button
          onClick={() => onRemove(item)}
          aria-label={`Remove ${item.name}`}
          style={{
            width: 28, height: 28, borderRadius: R.tag,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${T.trashBd}`, cursor: 'pointer',
            background: T.trashBg, color: T.trashColor,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Trash2 size={11} strokeWidth={2}/>
        </button>

        {/* Qty stepper */}
        <div style={{
          display: 'flex', alignItems: 'center',
          borderRadius: R.qty, overflow: 'hidden',
          border: `1.5px solid ${T.qtyBd}`, background: T.qtyBg,
        }}>
          <button ref={minRef}
            onClick={() => { bump(minRef); onQty(item, item.quantity - 1) }}
            aria-label="Decrease"
            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', color: T.qtyControl, WebkitTapHighlightColor: 'transparent' }}
          >
            <Minus size={11} strokeWidth={2.5}/>
          </button>
          <span style={{ minWidth: 24, textAlign: 'center', fontSize: F.size.sm, fontWeight: F.weight.black, lineHeight: 1, color: T.qtyCount, fontFamily: F.family.mono }}>
            {item.quantity}
          </span>
          <button ref={plusRef}
            onClick={() => { bump(plusRef); onQty(item, item.quantity + 1) }}
            aria-label="Increase"
            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', color: T.qtyControl, WebkitTapHighlightColor: 'transparent' }}
          >
            <Plus size={11} strokeWidth={2.5}/>
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// InfoBanner — locked / addon / delivered / error
// ─────────────────────────────────────────────────────────────────────────────
const InfoBanner = ({ bg, bd, iconEl, iconColor, title, titleColor, body, bodyColor, T }) => (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: 'auto' }}
    exit={{ opacity: 0, height: 0 }}
    style={{ overflow: 'hidden', marginBottom: T.S[3] }}
  >
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: T.S[3],
      padding: '10px 12px', borderRadius: T.R.banner,
      background: bg, border: `1px solid ${bd}`,
    }}>
      <div style={{ marginTop: 1, flexShrink: 0, color: iconColor, display: 'flex' }}>{iconEl}</div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: T.F.size.sm, fontWeight: T.F.weight.bold, color: titleColor, fontFamily: T.F.family.body, lineHeight: 1.4 }}>
          {title}
        </p>
        {body && (
          <p style={{ margin: '3px 0 0', fontSize: T.F.size.xs, fontWeight: T.F.weight.medium, color: bodyColor, fontFamily: T.F.family.body, lineHeight: 1.55 }}>
            {body}
          </p>
        )}
      </div>
    </div>
  </motion.div>
)

// ─────────────────────────────────────────────────────────────────────────────
// CartDrawer
// ─────────────────────────────────────────────────────────────────────────────
const CartDrawer = ({ open, onClose }) => {
  const dispatch        = useDispatch()
  const navigate        = useNavigate()
  const { isDark: D }   = useContext(ThemeContext)
  const { gsapEnabled } = useDeviceTier()
  const T               = useCartDrawerTokens(D)
  const { F, S, R }     = T

  const items          = useSelector(selectCartItems)
  const subtotal       = useSelector(selectCartSubtotal)
  const total          = useSelector(selectCartTotal)
  const discount       = useSelector(selectCartDiscount)
  const tableId        = useSelector(selectTableId)
  const sessionId      = useSelector(selectSessionId)
  const user           = useSelector(selectUser)
  const loyalty        = useSelector(selectLoyalty)
  const placing        = useSelector(selectOrderPlacing)
  const orderError     = useSelector(selectOrderError)
  const hasActiveOrder = useSelector(selectHasActiveOrder)
  const activeOrder    = useSelector(selectActiveOrder)
  const canAddItems    = useSelector(selectCanAddItems)
  const [note, setNote] = useState('')

  const isLocked    = hasActiveOrder && !canAddItems
  const isAddon     = hasActiveOrder && canAddItems
  const isDelivered = activeOrder?.status === 'delivered'

  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const h = (e) => setIsDesktop(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  useEffect(() => { window.__sheetOpen = open; return () => { window.__sheetOpen = false } }, [open])
  useEffect(() => {
    if (!open) { dispatch(clearError()); dispatch(clearMerged()); dispatch(clearReordered()); setNote('') }
  }, [open, dispatch])

  const handleRemove = useCallback(
    (item) => dispatch(removeItem({ menuItemId: item.menuItemId, portionId: item.portionId })), [dispatch])
  const handleQty = useCallback((item, qty) => {
    if (qty <= 0) dispatch(removeItem({ menuItemId: item.menuItemId, portionId: item.portionId }))
    else dispatch(updateQuantity({ menuItemId: item.menuItemId, portionId: item.portionId, quantity: qty }))
  }, [dispatch])
  const handleClear = useCallback(() => dispatch(clearCart()), [dispatch])

  const handlePlaceOrder = useCallback(async () => {
    if (!items.length || placing || isLocked) return
    const result = await dispatch(placeOrder({
      items,
      tableId:     tableId   ?? user?.tableId   ?? null,
      sessionId:   sessionId ?? user?.sessionId ?? null,
      cafeId:      user?.cafeId ?? BRAND.cafeId ?? 'demo',
      loyaltyTier: loyalty?.tier ?? 'none',
      specialNote: note.trim() || null,
    }))
    if (placeOrder.fulfilled.match(result)) {
      dispatch(clearCart()); dispatch(clearMerged()); dispatch(clearReordered())
      onClose()
      const merged    = result.payload?.merged    ?? result.payload?.data?.merged    ?? false
      const reordered = result.payload?.reordered ?? result.payload?.data?.reordered ?? false
      if (reordered)   toast.success('Back in kitchen! New items are being prepared 👨‍🍳', { duration: 3500 })
      else if (merged) toast.success('Added to your current order 🍽️', { duration: 2500 })
      else             toast.success('Order placed! 🎉')
      navigate('/order/status')
    }
  }, [items, placing, isLocked, tableId, sessionId, user, loyalty, note, dispatch, onClose, navigate])

  // CTA computed style — once, not inline
  const ctaDisabled = placing || !items.length || isLocked
  const ctaStyle = {
    width: '100%', height: 56, borderRadius: R.btn, border: 'none',
    fontSize: F.size.lg, fontWeight: F.weight.extrabold, letterSpacing: F.tracking.tight,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S[3],
    fontFamily: F.family.brand,
    cursor:     ctaDisabled ? 'not-allowed' : 'pointer',
    background: ctaDisabled ? T.ctaDisBg    : T.ctaBg,
    boxShadow:  ctaDisabled ? 'none'        : T.ctaShadow,
    color:      ctaDisabled ? T.ctaDisColor : T.ctaColor,
    opacity:    isLocked ? T.ctaLockOp : 1,
    position: 'relative', overflow: 'hidden',
    WebkitTapHighlightColor: 'transparent',
    transition: 'background 0.25s, box-shadow 0.25s, opacity 0.25s',
  }

  // Motion
  const panelVariants = isDesktop
    ? { initial: { x: '100%', opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: '100%', opacity: 0 } }
    : { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
  const panelTransition = isDesktop
    ? { type: 'spring', stiffness: 380, damping: 38, mass: 0.85 }
    : { type: 'spring', stiffness: 340, damping: 36, mass: 0.90 }

  const sharedPanelStyle = {
    background:           T.sheetBg,
    backdropFilter:       T.sheetBlur,
    WebkitBackdropFilter: T.sheetBlur,
    contain:              'layout style paint',
    paddingBottom:        'env(safe-area-inset-bottom,0px)',
    display:              'flex',
    flexDirection:        'column',
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Layer 1 — Overlay */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 9080, touchAction: 'none',
              background: T.overlayBg,
              backdropFilter: T.overlayBlur, WebkitBackdropFilter: T.overlayBlur,
            }}
          />

          {/* Layer 2 — Sheet */}
          <motion.div
            {...panelVariants}
            transition={panelTransition}
            style={isDesktop ? {
              ...sharedPanelStyle,
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: 420, maxWidth: '100vw', zIndex: 9081,
              borderLeft: `1px solid ${T.sheetBorder}`,
              borderRadius: 0,
              boxShadow: T.sheetShadow,
            } : {
              ...sharedPanelStyle,
              position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 9081,
              borderRadius: `${R.sheet}px ${R.sheet}px 0 0`,
              maxHeight: '92dvh',
              border: `1px solid ${T.sheetBorder}`,
              borderBottom: 'none',
              boxShadow: T.sheetShadow,
            }}
          >
            {/* Mobile: top accent glow + handle */}
            {!isDesktop && (
              <>
                <div aria-hidden style={{
                  position: 'absolute', top: 0, left: '10%', right: '10%',
                  height: 2, borderRadius: 99, pointerEvents: 'none',
                  background: T.topGlow, opacity: T.topGlowOpacity,
                }}/>
                <div style={{ width: 40, height: 4, borderRadius: 99, flexShrink: 0, margin: '14px auto 0', background: T.handleBg }}/>
              </>
            )}
            {isDesktop && <div style={{ height: 16, flexShrink: 0 }}/>}

            {/* ── Header ───────────────────────────────────────────────── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: `${S[3]}px ${S.px}px ${S[4]}px`,
              flexShrink: 0, borderBottom: `1px solid ${T.divider}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: S[4] }}>
                {/* Accent icon with gloss */}
                <div style={{
                  width: 42, height: 42, borderRadius: R.icon, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: T.iconBg, boxShadow: T.iconShadow,
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div aria-hidden style={{ position: 'absolute', inset: 0, background: T.iconGloss, pointerEvents: 'none', borderRadius: 'inherit' }}/>
                  <ShoppingCart size={18} color="#fff" strokeWidth={2.2}/>
                </div>

                <div>
                  <h2 style={{ margin: 0, fontSize: F.size['2xl'], fontWeight: F.weight.extrabold, letterSpacing: F.tracking.tighter, lineHeight: 1.2, color: T.titleColor, fontFamily: F.family.heading }}>
                    {isLocked ? 'Cart (Locked)' : isAddon ? 'Add to Order' : 'Your Cart'}
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: F.size['2xs'], fontWeight: F.weight.semibold, letterSpacing: F.tracking.wide, color: T.subColor, fontFamily: F.family.body, textTransform: 'uppercase', lineHeight: 1 }}>
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: S[3] }}>
                {items.length > 0 && !isLocked && (
                  <button onClick={handleClear} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: F.size.sm, fontWeight: F.weight.bold, padding: '7px 11px', borderRadius: R.tag, cursor: 'pointer', fontFamily: F.family.body, color: T.clearColor, background: T.clearBg, border: `1px solid ${T.clearBd}`, WebkitTapHighlightColor: 'transparent' }}>
                    <Trash2 size={11}/> Clear
                  </button>
                )}
                <button onClick={onClose} aria-label="Close cart" style={{ width: 36, height: 36, borderRadius: R.close, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${T.closeBd}`, background: T.closeBg, color: T.closeColor, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                  <X size={15} strokeWidth={2.2}/>
                </button>
              </div>
            </div>

            {/* ── Scrollable items ─────────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: `0 ${S.px}px`, scrollbarWidth: 'none' }}>
              {items.length === 0 ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: `${S[8] * 2}px 0`, gap: S[4] }}
                >
                  <motion.span
                    animate={gsapEnabled ? { y: [0, -7, 0] } : {}}
                    transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ fontSize: 52, lineHeight: 1 }}
                  >🛒</motion.span>
                  <p style={{ margin: 0, fontSize: F.size.md, fontWeight: F.weight.semibold, color: T.subColor, fontFamily: F.family.body }}>
                    Your cart is empty
                  </p>
                </motion.div>
              ) : (
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <CartRow
                      key={`${item.menuItemId}::${item.portionId ?? 'none'}`}
                      item={item} T={T}
                      onRemove={handleRemove} onQty={handleQty}
                      gsapEnabled={gsapEnabled}
                    />
                  ))}
                </AnimatePresence>
              )}

              {/* Note */}
              {items.length > 0 && !isLocked && (
                <div style={{ marginTop: S[5], marginBottom: S[3] }}>
                  <textarea
                    rows={2} value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={isAddon ? 'Note for new items? (optional)' : 'Special note… (optional)'}
                    maxLength={200}
                    style={{
                      width: '100%', resize: 'none', outline: 'none', boxSizing: 'border-box',
                      fontFamily: F.family.body, fontSize: F.size.sm, lineHeight: 1.6,
                      borderRadius: R.note, padding: '10px 14px', WebkitAppearance: 'none',
                      background: T.noteBg, border: `1.5px solid ${T.noteBd}`, color: T.noteColor,
                      transition: 'border-color 0.18s, box-shadow 0.18s',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = T.noteFocusBd; e.target.style.boxShadow = T.noteFocusSh }}
                    onBlur={(e)  => { e.target.style.borderColor = T.noteBd; e.target.style.boxShadow = 'none' }}
                  />
                </div>
              )}
            </div>

            {/* ── Footer ──────────────────────────────────────────────── */}
            {items.length > 0 && (
              <div style={{ flexShrink: 0, padding: `${S[5]}px ${S.px}px ${S[8]}px`, borderTop: `1px solid ${T.divider}` }}>

                {/* Layer 3 — Totals glass card */}
                <div style={{
                  borderRadius: R.inner, marginBottom: S[5],
                  background: T.innerBg, border: `1px solid ${T.innerBorder}`,
                  backdropFilter: T.innerBlur, WebkitBackdropFilter: T.innerBlur,
                  boxShadow: T.innerShadow,
                  padding: `${S[4]}px ${S[5]}px`,
                  position: 'relative', overflow: 'hidden',
                }}>
                  <GlossLine glossLine={T.glossLine}/>

                  {/* Subtotal row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: S[2] }}>
                    <span style={{ fontSize: F.size.sm, fontWeight: F.weight.medium, color: T.subLabel, fontFamily: F.family.body }}>
                      Subtotal
                    </span>
                    <span style={{ fontSize: F.size.sm, fontWeight: F.weight.bold, color: T.subValue, fontFamily: F.family.mono, letterSpacing: F.tracking.tight }}>
                      {BRAND.currency} {subtotal}
                    </span>
                  </div>

                  {/* Discount row */}
                  <AnimatePresence>
                    {discount > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: S[2] }}
                      >
                        <span style={{ fontSize: F.size.sm, fontWeight: F.weight.medium, color: T.discount, fontFamily: F.family.body }}>
                          {loyalty?.tier && loyalty.tier !== 'none'
                            ? `${loyalty.tier.charAt(0).toUpperCase() + loyalty.tier.slice(1)} discount (${loyalty.discountPct}%)`
                            : 'Discount'}
                        </span>
                        <span style={{ fontSize: F.size.sm, fontWeight: F.weight.bold, color: T.discount, fontFamily: F.family.mono, letterSpacing: F.tracking.tight }}>
                          −{BRAND.currency} {discount}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Divider */}
                  <div style={{ height: 1, background: T.divider, margin: `${S[3]}px 0` }}/>

                  {/* Total row — the one that was broken */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: F.size.lg, fontWeight: F.weight.extrabold, letterSpacing: F.tracking.tight, color: T.totLabel, fontFamily: F.family.body }}>
                      Total
                    </span>
                    <span style={{ fontSize: F.size.xl, fontWeight: F.weight.black, letterSpacing: F.tracking.tighter, color: T.totValue, fontFamily: F.family.mono }}>
                      {BRAND.currency} {total}
                    </span>
                  </div>
                </div>

                {/* Banners */}
                <AnimatePresence>
                  {isLocked && (
                    <InfoBanner T={T}
                      bg={T.lockedBg} bd={T.lockedBd}
                      iconEl={<Lock size={13} strokeWidth={2}/>} iconColor={T.lockedTitle}
                      title="Bill requested — order locked" titleColor={T.lockedTitle}
                      body="Payment is being processed. New items cannot be added until this bill is cleared."
                      bodyColor={T.lockedBody}
                    />
                  )}
                  {isAddon && !orderError && (
                    <InfoBanner T={T}
                      bg={isDelivered ? T.delivBg  : T.addonBg}
                      bd={isDelivered ? T.delivBd  : T.addonBd}
                      iconEl={<PlusCircle size={13} strokeWidth={2}/>}
                      iconColor={isDelivered ? T.delivTitle : T.addonIcon}
                      title={isDelivered ? 'Adding more? New items go to kitchen' : 'Adding to your current order'}
                      titleColor={isDelivered ? T.delivTitle : T.addonTitle}
                      body={isDelivered
                        ? 'Your order status resets to preparing and items are added to your bill.'
                        : `You have ${activeOrder?.items?.length ?? '?'} item${(activeOrder?.items?.length ?? 1) !== 1 ? 's' : ''} in your order (${activeOrder?.status}). These will be added on.`}
                      bodyColor={T.addonBody}
                    />
                  )}
                  {orderError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden', marginBottom: S[3] }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: S[3], padding: '10px 12px', borderRadius: R.banner, background: T.errBg, border: `1px solid ${T.errBd}` }}>
                        <AlertCircle size={13} strokeWidth={2} style={{ color: T.errColor, marginTop: 1, flexShrink: 0 }}/>
                        <p style={{ margin: 0, fontSize: F.size.sm, fontWeight: F.weight.semibold, flex: 1, color: T.errColor, fontFamily: F.family.body }}>{orderError}</p>
                        <button onClick={() => dispatch(clearError())} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, color: T.errColor, flexShrink: 0 }}>
                          <X size={12} strokeWidth={2.5}/>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* CTA */}
                <button onClick={handlePlaceOrder} disabled={ctaDisabled} style={ctaStyle}>
                  {!ctaDisabled && (
                    <div aria-hidden style={{ position: 'absolute', top: 0, left: '8%', right: '8%', height: 1, background: T.ctaGloss, pointerEvents: 'none' }}/>
                  )}
                  {placing ? (
                    <><Loader2 size={17} strokeWidth={2.5} style={{ animation: 'cd-spin 0.7s linear infinite' }}/>{isAddon ? 'Adding to Order…' : 'Placing Order…'}</>
                  ) : isLocked ? (
                    <><Lock size={15} strokeWidth={2.5}/> Bill Locked — Payment in Progress</>
                  ) : isAddon ? (
                    <><PlusCircle size={16} strokeWidth={2.5}/> Add to Order · {BRAND.currency} {total}</>
                  ) : (
                    <>Place Order · {BRAND.currency} {total}<ChevronRight size={16} strokeWidth={2.5}/></>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export default CartDrawer

if (typeof document !== 'undefined' && !document.getElementById('cd-styles')) {
  const s = document.createElement('style')
  s.id = 'cd-styles'
  s.textContent = '@keyframes cd-spin{to{transform:rotate(360deg)}}'
  document.head.appendChild(s)
}

/*
─── ADD TO colors.js inside the COLORS object ────────────────────────────────

  glass: {
    dark: {
      sheetBg:     'rgba(14,8,3,0.84)',
      sheetBlur:   'blur(48px) saturate(220%)',
      innerBg:     'rgba(255,255,255,0.04)',
      innerBorder: 'rgba(255,255,255,0.07)',
      overlayBg:   'rgba(6,3,1,0.72)',
    },
    light: {
      sheetBg:     'rgba(255,252,248,0.80)',
      sheetBlur:   'blur(48px) saturate(220%)',
      innerBg:     'rgba(255,255,255,0.62)',
      innerBorder: 'rgba(255,255,255,0.82)',
      overlayBg:   'rgba(20,10,3,0.52)',
    },
  },

─────────────────────────────────────────────────────────────────────────────*/