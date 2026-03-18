// src/modules/customer/components/menu/menuCard.shared.jsx
//
// ─── SINGLE SOURCE OF TRUTH for all card primitives ──────────────────────────
// Imported by both MenuCard.jsx and RecommendedCard.jsx.
// Nothing is duplicated. If you change a button style, both cards update.
//
// Exports:
//   useCartTokens(isDark)    — centralized design tokens
//   useCartQty(menuItemId)   — total qty across all portions
//   GlassPricePill           — standalone frosted price pill (legacy)
//   CartControls             — MAIN: merged pill (price+button → ×|price|+ → −|qty·total|+)
//   CartAddButton            — alias for CartControls (backward compat)
//   PortionSheet             — half/full bottom sheet (portal)

import { useState, useContext, useRef, useCallback, useEffect } from 'react'
import { createPortal }          from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import gsap                      from 'gsap'
import { X, Plus, Check, Minus } from 'lucide-react'
import { ThemeContext }           from '@shared/context/ThemeContext'
import { BRAND, FONTS, getPalette } from '@shared/config/brand'
import { addItem, removeItem, updateQuantity, selectItemTotalQty } from '@store/slices/cartSlice'
import { unlockScroll }          from '@shared/utils/lenisLock'

// ─────────────────────────────────────────────────────────────────────────────
// useCartTokens — ALL design tokens in one place
// Both cards call this. Zero scattered hex values in JSX.
// ─────────────────────────────────────────────────────────────────────────────
export function useCartTokens(isDark) {
  return {
    // Card surface
    cardBg:       isDark ? 'rgba(18,11,4,0.92)'              : 'rgba(255,252,244,0.96)',
    cardBgActive: isDark ? 'var(--pill-bg-active)'            : 'var(--pill-bg-active)',
    cardBorder:   isDark ? 'rgba(255,159,28,0.12)'            : 'rgba(180,100,20,0.13)',
    cardShadow:   isDark
      ? '0 4px 20px rgba(0,0,0,0.55), 0 1px 0 rgba(255,159,28,0.06) inset'
      : '0 4px 16px rgba(92,51,23,0.10), 0 1px 0 rgba(255,255,255,0.9) inset',
    cardShadowActive: 'var(--card-shadow)',

    // Image
    imageBg:      isDark ? 'rgba(255,159,28,0.08)'            : 'rgba(255,159,28,0.06)',

    // Text
    textPri:      isDark ? '#FFF8EE'                          : '#1A0E04',
    textSec:      isDark ? 'rgba(255,220,160,0.6)'            : 'rgba(90,45,8,0.65)',
    textMut:      isDark ? 'rgba(255,190,100,0.38)'           : 'rgba(120,65,10,0.40)',
    priceTxt:     'var(--accent)',

    // Badge
    badgeFavBg:   'linear-gradient(135deg,#FF9F1C,#E05C2A)',
    badgeNewBg:   'linear-gradient(135deg,#2D9B5A,#38C26F)',

    // Shimmer
    shimmerFrom:  isDark ? 'rgba(255,159,28,0.05)'            : 'rgba(255,159,28,0.04)',
    shimmerTo:    isDark ? 'rgba(255,255,255,0.08)'           : 'rgba(255,255,255,0.55)',

    // ── Glass tokens — visible, contrasted, QOC-style ─────────────────────
    // Dark mode: semi-transparent warm surface with clear accent border
    // Light mode: bright white-tinted frosted with warm accent border
    //
    // Price pill background
    glassBg:       isDark
      ? 'rgba(255,159,28,0.13)'    // dark: warm tinted — visibly distinct from card
      : 'rgba(255,252,244,0.92)',  // light: near-white frosted
    glassBgActive: isDark
      ? 'rgba(255,159,28,0.22)'
      : 'rgba(255,242,220,0.95)',
    // Pill border — visible accent line
    glassBorder:   isDark
      ? 'rgba(255,159,28,0.35)'    // clearly visible warm border in dark
      : 'rgba(180,100,20,0.22)',
    glassBlur:     'blur(20px) saturate(200%)',
    glassShadow:   isDark
      ? 'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.40)'
      : 'inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(180,100,20,0.06), 0 2px 6px rgba(92,51,23,0.10)',
    glassGloss:    isDark
      ? 'linear-gradient(90deg,transparent,rgba(255,255,255,0.14) 35%,rgba(255,255,255,0.22) 50%,rgba(255,255,255,0.14) 65%,transparent)'
      : 'linear-gradient(90deg,transparent,rgba(255,255,255,0.90) 35%,rgba(255,255,255,1.00) 50%,rgba(255,255,255,0.90) 65%,transparent)',

    // Add button — accent-filled so it's always visible
    // Uses solid accent gradient so the + is unmistakably tappable
    btnGlassBg:       isDark
      ? 'rgba(255,159,28,0.18)'    // more visible warm fill in dark
      : 'rgba(255,159,28,0.10)',
    btnGlassBgActive: isDark
      ? 'rgba(255,159,28,0.30)'
      : 'rgba(255,159,28,0.18)',
    btnGlassBorder:   isDark
      ? 'rgba(255,159,28,0.55)'    // bright accent border — clearly a button
      : 'rgba(180,100,20,0.30)',
    btnGlassShadow:   isDark
      ? 'inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 10px rgba(255,159,28,0.25), 0 0 0 0.5px rgba(255,159,28,0.40)'
      : 'inset 0 1px 0 rgba(255,255,255,0.85), 0 2px 8px rgba(180,100,20,0.18)',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useCartQty — total qty for a menuItemId across all portions
// ─────────────────────────────────────────────────────────────────────────────
export function useCartQty(menuItemId) {
  return useSelector(selectItemTotalQty(menuItemId))
}

// ─────────────────────────────────────────────────────────────────────────────
// useCardStyle — CENTRALIZED card design tokens
// Used by MenuCard and RecommendedCard identically.
// Change here → both cards update.
// ─────────────────────────────────────────────────────────────────────────────
export function useCardStyle(isDark) {
  return {
    // Glass card surface
    cardBg:     isDark ? 'rgba(22,14,6,0.82)'        : 'rgba(255,252,248,0.85)',
    cardBgIn:   isDark ? 'rgba(255,159,28,0.10)'     : 'rgba(255,240,210,0.88)',
    cardBorder: isDark ? 'rgba(255,255,255,0.08)'    : 'rgba(255,255,255,0.72)',
    cardBdIn:   isDark ? 'rgba(255,159,28,0.35)'     : 'rgba(255,159,28,0.40)',
    cardShadow: isDark
      ? '0 8px 32px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.06)'
      : '0 8px 32px rgba(92,51,23,0.13), inset 0 1px 0 rgba(255,255,255,0.95)',
    cardBlur:   'blur(24px) saturate(180%)',
    // Image
    imageBg:    isDark ? 'rgba(30,18,6,0.60)'        : 'rgba(255,248,238,0.80)',
    // Top gloss line
    gloss:      isDark
      ? 'linear-gradient(90deg,transparent,rgba(255,255,255,0.09) 50%,transparent)'
      : 'linear-gradient(90deg,transparent,rgba(255,255,255,0.92) 50%,transparent)',
    // Price — large, prominent
    priceColor: isDark ? '#FFB84D'                   : '#B85C00',
    priceSep:   isDark ? 'rgba(255,159,28,0.40)'     : 'rgba(180,80,0,0.30)',
    // Text
    nameColor:  isDark ? '#FFF8EE'                   : '#1A0E04',
    metaColor:  isDark ? 'rgba(255,220,160,0.50)'    : 'rgba(90,45,8,0.48)',
    // Veg
    vegColor:   '#22c55e',
    nonVeg:     '#ef4444',
    // Overlay badges (sizes, veg)
    badgeBg:    isDark ? 'rgba(8,4,0,0.72)'          : 'rgba(255,252,246,0.88)',
    badgeBd:    isDark ? 'rgba(255,159,28,0.22)'     : 'rgba(180,100,20,0.16)',
    badgeTxt:   isDark ? '#FFB84D'                   : '#B85C00',

    // ── "Add to cart" button — gray glass, mode-aware ─────────────────
    // Dark: charcoal-gray frosted glass with white text
    // Light: white-gray frosted glass with dark text
    btnBg:      isDark
      ? 'rgba(255,255,255,0.09)'    // dark: subtle white tint
      : 'rgba(0,0,0,0.06)',         // light: subtle dark tint
    btnBorder:  isDark
      ? 'rgba(255,255,255,0.16)'    // dark: white hairline
      : 'rgba(0,0,0,0.12)',         // light: dark hairline
    btnColor:   isDark ? 'rgba(255,255,255,0.90)' : 'rgba(20,10,2,0.82)',
    btnBlur:    'blur(16px) saturate(160%)',
    btnShadow:  isDark
      ? 'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.20)'
      : 'inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -1px 0 rgba(0,0,0,0.05)',
    btnGloss:   isDark
      ? 'linear-gradient(90deg,transparent,rgba(255,255,255,0.10) 50%,transparent)'
      : 'linear-gradient(90deg,transparent,rgba(255,255,255,0.80) 50%,transparent)',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PriceDisplay — renders price correctly for both flat and portion items
// Fixes the "price not showing" bug — guards against undefined/null price
// ─────────────────────────────────────────────────────────────────────────────
export function PriceDisplay({ item, priceColor, priceSep, size = 'md' }) {
  const big  = size === 'md' ? 22 : 20
  const small = size === 'md' ? 17 : 15

  const hasPortions = Array.isArray(item?.portions) && item.portions.length > 0

  // Flat price
  if (!hasPortions) {
    const p = item?.price ?? item?.basePrice ?? null
    if (p == null) return null
    return (
      <span style={{
        fontSize: big, fontWeight: 900, color: priceColor,
        fontFamily: FONTS.mono, letterSpacing: '-0.03em', lineHeight: 1,
        display: 'block',
      }}>
        {BRAND.currency} {p}
      </span>
    )
  }

  // Portions — show lo / hi
  const prices = item.portions
    .map(p => Number(p.price))
    .filter(p => !isNaN(p))
    .sort((a, b) => a - b)

  if (prices.length === 0) return null

  const lo = prices[0]
  const hi = prices[prices.length - 1]

  if (lo === hi) {
    return (
      <span style={{ fontSize: big, fontWeight: 900, color: priceColor, fontFamily: FONTS.mono, letterSpacing: '-0.03em', lineHeight: 1, display: 'block' }}>
        {BRAND.currency} {lo}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
      <span style={{ fontSize: big, fontWeight: 900, color: priceColor, fontFamily: FONTS.mono, letterSpacing: '-0.03em', lineHeight: 1 }}>
        {BRAND.currency} {lo}
      </span>
      <span style={{ fontSize: 14, color: priceSep, fontWeight: 400, lineHeight: 1 }}>/</span>
      <span style={{ fontSize: small, fontWeight: 800, color: priceColor, fontFamily: FONTS.mono, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {BRAND.currency} {hi}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CartButton — full-width gray glass "Add to cart" button
// Shared by MenuCard and RecommendedCard
// ─────────────────────────────────────────────────────────────────────────────
export function CartButton({ onAdd, height = 44, radius = 14, fontSize = 14 }) {
  const { isDark } = useContext(ThemeContext)
  const S = useCardStyle(isDark)

  return (
    <button
      onClick={e => { e.stopPropagation(); onAdd(e) }}
      style={{
        width: '100%', height, borderRadius: radius,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        // Gray glass
        background:           S.btnBg,
        border:               `1px solid ${S.btnBorder}`,
        color:                S.btnColor,
        backdropFilter:       S.btnBlur,
        WebkitBackdropFilter: S.btnBlur,
        boxShadow:            S.btnShadow,
        fontSize, fontWeight: 700, letterSpacing: '-0.01em',
        fontFamily: FONTS.brand,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Gloss line */}
      <div aria-hidden style={{
        position: 'absolute', top: 0, left: '8%', right: '8%', height: 1,
        background: S.btnGloss, pointerEvents: 'none',
      }}/>
      {/* Cart icon inline SVG — no import needed */}
      <svg width={fontSize + 2} height={fontSize + 2} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      </svg>
      Add to cart
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GlassPricePill — frosted price display (used by MenuCard)
// ─────────────────────────────────────────────────────────────────────────────
export function GlassPricePill({ item, isDark, inCart }) {
  const T           = useCartTokens(isDark)
  const hasPortions = Array.isArray(item.portions) && item.portions.length > 0

  const textStyle = {
    fontSize: '13px', fontWeight: 900, letterSpacing: '-0.025em',
    lineHeight: 1, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums',
    position: 'relative', zIndex: 2, whiteSpace: 'nowrap', fontFamily: FONTS.mono,
  }
  const sepStyle = {
    color: 'var(--accent-border)', fontWeight: 300, fontSize: '11px', margin: '0 3px',
  }

  const renderPrice = () => {
    if (!hasPortions) return <span style={textStyle}>{BRAND.currency} {item.price}</span>
    if (item.portions.length === 2) {
      return (
        <span style={textStyle}>
          {BRAND.currency} {item.portions[0].price}
          <span style={sepStyle}>/</span>
          {item.portions[1].price}
        </span>
      )
    }
    const prices = item.portions.map(p => p.price)
    return (
      <span style={textStyle}>
        {BRAND.currency} {Math.min(...prices)}
        <span style={sepStyle}>/</span>
        {Math.max(...prices)}
      </span>
    )
  }

  return (
    <div style={{
      position: 'relative', flex: 1, minWidth: 0, height: 36,
      borderRadius: 10, display: 'flex', alignItems: 'center',
      justifyContent: 'center', overflow: 'hidden',
      // QOC glass: very subtle accent tint + backdrop blur
      background:          inCart ? T.glassBgActive : T.glassBg,
      border:              `1px solid ${T.glassBorder}`,
      backdropFilter:      T.glassBlur,
      WebkitBackdropFilter: T.glassBlur,
      boxShadow:           T.glassShadow,
      transition: 'background 0.30s ease, border-color 0.30s ease',
      transform: 'translate3d(0,0,0)',
    }}>
      {/* Inset gloss line — same as QOC btn-ghost */}
      <div aria-hidden style={{
        position: 'absolute', top: 0, left: '8%', right: '8%', height: 1,
        background: T.glassGloss, pointerEvents: 'none', zIndex: 1,
      }}/>
      {renderPrice()}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CartControls — the merged cart pill system
//
// DEFAULT (cartQty === 0):
//   [glass price pill]  [glass + button]  — side by side
//
// 1 ITEM (cartQty === 1):
//   morphs into one wide pill → [ × | Rs.160 | + ]
//   tap × = remove entirely
//
// 2+ ITEMS (cartQty >= 2):
//   [ − | 3 items · Rs.480 | + ]
//   tap − = decrement, long-press − = remove entirely
//
// MORPH: blur transition — both elements blur out then blur in as one pill
// ─────────────────────────────────────────────────────────────────────────────
export function CartControls({
  item,           // full item object { _id, price, portions, name, emoji, category }
  cartQty,        // from useCartQty(_id)
  onAdd,          // () → void  — caller handles portions sheet or direct add
  size = 'md',    // 'md' = MenuCard, 'sm' = RecommendedCard
}) {
  const { isDark }  = useContext(ThemeContext)
  const T           = useCartTokens(isDark)
  const dispatch    = useDispatch()
  const pillRef     = useRef(null)
  const longPressRef = useRef(null)

  const inCart      = cartQty > 0
  const baseH       = size === 'sm' ? 34 : 36
  const iconSize    = size === 'sm' ? 13 : 15
  const fontSize    = size === 'sm' ? 11 : 12
  const radius      = baseH / 2   // fully rounded = pill shape

  const hasPortions = Array.isArray(item.portions) && item.portions.length > 0

  // Derived price display
  const unitPrice = hasPortions
    ? Math.min(...item.portions.map(p => p.price))
    : (item.price ?? 0)
  const totalPrice = unitPrice * cartQty

  // ── Decrease qty ─────────────────────────────────────────────────────────
  const handleDecrease = useCallback((e) => {
    e.stopPropagation()
    if (cartQty <= 0) return
    dispatch(updateQuantity({
      menuItemId: item._id,
      portionId:  null,
      quantity:   cartQty - 1,
    }))
    // GSAP bounce on pill
    if (pillRef.current) {
      gsap.timeline()
        .to(pillRef.current, { scaleX: 0.96, duration: 0.07, ease: 'power2.in' })
        .to(pillRef.current, { scaleX: 1,    duration: 0.24, ease: 'back.out(3)' })
    }
  }, [cartQty, item._id, dispatch])

  // ── Remove entirely (tap × when qty=1, or long press −) ──────────────────
  const handleRemove = useCallback((e) => {
    e?.stopPropagation()
    dispatch(removeItem({ menuItemId: item._id, portionId: null }))
    // Blur-out morph
    if (pillRef.current) {
      gsap.to(pillRef.current, {
        filter: 'blur(6px)', opacity: 0, scale: 0.92,
        duration: 0.22, ease: 'power2.in',
        onComplete: () => {
          gsap.set(pillRef.current, { filter: 'blur(0px)', opacity: 1, scale: 1 })
        },
      })
    }
  }, [item._id, dispatch])

  // ── Long-press to remove (on − button) ───────────────────────────────────
  const startLongPress = useCallback((e) => {
    e.stopPropagation()
    longPressRef.current = setTimeout(() => handleRemove(e), 500)
  }, [handleRemove])

  const cancelLongPress = useCallback(() => {
    clearTimeout(longPressRef.current)
  }, [])

  // ── Morph animation when transitioning in/out of cart ────────────────────
  const prevInCart = useRef(inCart)
  useEffect(() => {
    if (prevInCart.current === inCart) return
    prevInCart.current = inCart
    if (!pillRef.current) return
    // Blur-morph: scale down + blur → scale up + clear
    gsap.fromTo(pillRef.current,
      { filter: 'blur(8px)', scale: 0.88, opacity: 0.6 },
      { filter: 'blur(0px)', scale: 1,    opacity: 1,
        duration: 0.38, ease: 'back.out(2)' }
    )
  }, [inCart])

  // ── Glass style shared by both states ────────────────────────────────────
  const glassStyle = {
    background:           T.glassBgActive,
    border:               `1px solid ${T.btnGlassBorder}`,
    backdropFilter:       T.glassBlur,
    WebkitBackdropFilter: T.glassBlur,
    boxShadow:            T.btnGlassShadow,
  }

  const divider = (
    <div style={{
      width: 1, height: 14, flexShrink: 0,
      background: isDark ? 'rgba(255,159,28,0.40)' : 'rgba(180,100,20,0.22)',
    }}/>
  )

  // Brighter accent in dark mode so text is clearly readable
  const accentTxt = {
    color: isDark ? '#FFB84D' : 'var(--accent)',
    fontFamily: 'var(--font-mono)',
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DEFAULT STATE: price pill + add button (separate)
  // ─────────────────────────────────────────────────────────────────────────
  if (!inCart) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
        {/* Price pill */}
        <div style={{
          position: 'relative', flex: 1, height: baseH,
          borderRadius: radius, display: 'flex', alignItems: 'center',
          justifyContent: 'center', overflow: 'hidden',
          background: T.glassBg,
          border: `1px solid ${T.glassBorder}`,
          backdropFilter: T.glassBlur, WebkitBackdropFilter: T.glassBlur,
          boxShadow: T.glassShadow,
        }}>
          <div aria-hidden style={{
            position: 'absolute', top: 0, left: '8%', right: '8%', height: 1,
            background: T.glassGloss, pointerEvents: 'none',
          }}/>
          <span style={{
            fontSize: fontSize + 1, fontWeight: 900, letterSpacing: '-0.025em',
            lineHeight: 1, ...accentTxt, whiteSpace: 'nowrap',
          }}>
            {hasPortions
              ? `from ${BRAND.currency} ${unitPrice}`
              : `${BRAND.currency} ${item.price}`}
          </span>
        </div>

        {/* Add button — solid accent so + is always clearly visible */}
        <div
          onClick={e => { e.stopPropagation(); onAdd(e) }}
          role="button" tabIndex={0}
          aria-label="Add to cart"
          style={{
            position: 'relative', flexShrink: 0,
            width: baseH, height: baseH, borderRadius: radius,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', overflow: 'hidden',
            // Solid accent gradient — always visible regardless of card background
            background: 'var(--accent-gradient)',
            border: 'none',
            boxShadow: `0 3px 12px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.22)`,
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
          }}
        >
          {/* Top gloss */}
          <div aria-hidden style={{
            position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
            background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.50) 50%,transparent)',
            pointerEvents: 'none',
          }}/>
          <Plus size={iconSize} color="#fff" strokeWidth={3}/>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CART STATE: merged pill
  // qty=1 → [ × | Rs.price | + ]
  // qty>1 → [ − | N items · Rs.total | + ]
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={pillRef}
      style={{
        display: 'flex', alignItems: 'center',
        flex: 1, height: baseH,
        borderRadius: radius, overflow: 'hidden',
        ...glassStyle,
        position: 'relative',
        willChange: 'transform, filter',
        // Morph transition on width
        transition: 'box-shadow 0.20s ease',
      }}
    >
      {/* Gloss line */}
      <div aria-hidden style={{
        position: 'absolute', top: 0, left: '5%', right: '5%', height: 1,
        background: T.glassGloss, pointerEvents: 'none', zIndex: 3,
      }}/>

      {/* LEFT: × (qty=1) or − (qty>1) */}
      <div
        onClick={cartQty === 1 ? handleRemove : handleDecrease}
        onPointerDown={cartQty > 1 ? startLongPress : undefined}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        role="button"
        aria-label={cartQty === 1 ? 'Remove' : 'Decrease'}
        style={{
          flexShrink: 0, width: baseH + 4, height: baseH,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 2,
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        }}
      >
        {cartQty === 1
          ? <X      size={iconSize - 1} color="var(--accent)" strokeWidth={2.8}/>
          : <Minus  size={iconSize - 1} color="var(--accent)" strokeWidth={2.8}/>
        }
      </div>

      {divider}

      {/* CENTER: price / qty info */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 4, minWidth: 0,
        padding: '0 2px',
      }}>
        {cartQty === 1 ? (
          // 1 item → show unit price
          <span style={{
            fontSize: fontSize + 1, fontWeight: 900,
            letterSpacing: '-0.025em', lineHeight: 1,
            ...accentTxt, whiteSpace: 'nowrap',
          }}>
            {BRAND.currency} {unitPrice}
          </span>
        ) : (
          // 2+ items → count · total
          <>
            <span style={{
              fontSize: fontSize, fontWeight: 800,
              letterSpacing: '-0.01em', lineHeight: 1,
              ...accentTxt, whiteSpace: 'nowrap',
            }}>
              {cartQty}
            </span>
            <span style={{
              fontSize: fontSize - 1, color: isDark
                ? 'rgba(255,159,28,0.50)'
                : 'rgba(180,100,20,0.45)',
              fontWeight: 500,
            }}>·</span>
            <span style={{
              fontSize: fontSize, fontWeight: 800,
              letterSpacing: '-0.015em', lineHeight: 1,
              ...accentTxt, whiteSpace: 'nowrap',
            }}>
              {BRAND.currency} {totalPrice}
            </span>
          </>
        )}
      </div>

      {divider}

      {/* RIGHT: + */}
      <div
        onClick={e => { e.stopPropagation(); onAdd(e) }}
        role="button"
        aria-label="Add more"
        style={{
          flexShrink: 0, width: baseH + 4, height: baseH,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 2,
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        }}
      >
        <Plus size={iconSize - 1} color="var(--accent)" strokeWidth={2.8}/>
      </div>
    </div>
  )
}

// Keep CartAddButton as alias for backward compat (not used by new cards)
export { CartControls as CartAddButton }

// ─────────────────────────────────────────────────────────────────────────────
// PortionSheet — bottom sheet for half/full selection
// Identical logic used by both MenuCard and RecommendedCard
// ─────────────────────────────────────────────────────────────────────────────
export function PortionSheet({ item, onClose }) {
  const { isDark: D } = useContext(ThemeContext)
  const dispatch      = useDispatch()
  const P             = getPalette(D)
  const isDesktop     = window.matchMedia('(min-width: 1024px)').matches

  const defaultPortion = item.portions?.find(p => p.isDefault) ?? item.portions?.[0] ?? null
  const [selectedId, setSelectedId] = useState(defaultPortion?.id ?? null)

  const closingRef = useRef(false)
  const overlayRef = useRef(null)
  const sheetRef   = useRef(null)
  const optsRef    = useRef([])
  const btnRef     = useRef(null)

  useEffect(() => () => unlockScroll(), [])

  useEffect(() => {
    if (!overlayRef.current || !sheetRef.current) return
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
    tl.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.24 }, 0)
    if (isDesktop) {
      tl.fromTo(sheetRef.current, { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.32 }, 0.04)
    } else {
      tl.fromTo(sheetRef.current, { y: '100%' }, { y: '0%', duration: 0.40 }, 0.04)
    }
    const opts = optsRef.current.filter(Boolean)
    if (opts.length)
      tl.fromTo(opts, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.26, stagger: 0.06, ease: 'power3.out' }, 0.2)
    if (btnRef.current)
      tl.fromTo(btnRef.current, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.24 }, 0.3)
  }, [isDesktop])

  const animateClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    if (isDesktop) {
      gsap.timeline({ onComplete: onClose })
        .to(sheetRef.current, { scale: 0.92, opacity: 0, duration: 0.22, ease: 'power3.in' }, 0)
        .to(overlayRef.current, { opacity: 0, duration: 0.20, ease: 'power2.in' }, 0)
    } else {
      gsap.timeline({ onComplete: onClose })
        .to(sheetRef.current, { y: '100%', duration: 0.26, ease: 'power3.in' }, 0)
        .to(overlayRef.current, { opacity: 0, duration: 0.20, ease: 'power2.in' }, 0)
    }
  }, [onClose, isDesktop])

  const selectedPortion = item.portions?.find(p => p.id === selectedId) ?? null

  const handleAdd = useCallback(() => {
    if (!selectedPortion) return
    dispatch(addItem({
      menuItemId:   item._id,
      name:         item.name,
      price:        selectedPortion.price,
      quantity:     1,
      emoji:        item.emoji,
      category:     item.category,
      portionId:    selectedPortion.id,
      portionLabel: selectedPortion.label,
    }))
    if (btnRef.current) {
      gsap.timeline()
        .to(btnRef.current, { scale: 0.93, duration: 0.09, ease: 'power2.in' })
        .to(btnRef.current, { scale: 1, duration: 0.28, ease: 'back.out(3)', onComplete: animateClose })
    } else {
      animateClose()
    }
  }, [selectedPortion, item, dispatch, animateClose])

  const sheetStyle = isDesktop ? {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '100%', maxWidth: 440, borderRadius: 24,
    background: 'var(--modal-bg)',
    backdropFilter: 'blur(48px) saturate(200%)',
    WebkitBackdropFilter: 'blur(48px) saturate(200%)',
    border: '1px solid var(--modal-border)',
    boxShadow: 'var(--card-shadow)',
    paddingBottom: 24, zIndex: 99991,
  } : {
    background: 'var(--modal-bg)',
    backdropFilter: 'blur(48px) saturate(200%)',
    WebkitBackdropFilter: 'blur(48px) saturate(200%)',
    borderTop: '1px solid var(--modal-border)',
    boxShadow: 'var(--card-shadow)',
    paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 24px)',
    transform: 'translate3d(0,0,0)',
    willChange: 'transform',
  }

  return createPortal(
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        onClick={animateClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 99990,
          background: 'var(--overlay-bg)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          willChange: 'opacity', touchAction: 'none',
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          zIndex: 99991,
          ...(isDesktop ? {} : { borderRadius: '24px 24px 0 0' }),
          ...sheetStyle,
        }}
      >
        {/* Accent glow line — mobile only */}
        {!isDesktop && (
          <div aria-hidden style={{
            position: 'absolute', top: 0, left: '12%', right: '12%',
            height: 2, borderRadius: 99, pointerEvents: 'none',
            background: 'var(--top-glow)', opacity: D ? 0.65 : 0.45,
          }}/>
        )}

        {/* Handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 99, margin: '14px auto 0',
          background: 'var(--divider)',
        }}/>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', borderBottom: '1px solid var(--divider)',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
          }}>
            {item.emoji ?? '🍽️'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '-0.03em',
              color: 'var(--text-primary)', fontFamily: FONTS.heading,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {item.name}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)', fontFamily: FONTS.body }}>
              Choose your size
            </p>
          </div>
          <button
            onClick={animateClose}
            aria-label="Close"
            style={{
              width: 34, height: 34, borderRadius: 10, border: 'none',
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--pill-bg)', color: 'var(--text-muted)', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <X size={15} strokeWidth={2.5}/>
          </button>
        </div>

        {/* Portion options */}
        <div style={{ padding: '14px 16px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(item.portions ?? []).map((portion, i) => {
            const sel = selectedId === portion.id
            return (
              <button
                key={portion.id}
                ref={el => { optsRef.current[i] = el }}
                onClick={() => setSelectedId(portion.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: 16, cursor: 'pointer',
                  width: '100%', fontFamily: FONTS.body,
                  border: sel ? '1.5px solid var(--accent-border)' : '1.5px solid var(--card-border)',
                  boxShadow: sel ? '0 0 0 3px var(--accent-dim), 0 4px 14px var(--accent-glow)' : 'none',
                  background: sel ? 'var(--accent-dim)' : 'var(--card-bg)',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `2px solid ${sel ? P.accent : P.divider}`,
                    background: sel ? 'var(--accent-gradient)' : 'transparent',
                  }}>
                    {sel && <Check size={11} color="#fff" strokeWidth={3.5}/>}
                  </div>
                  <span style={{
                    fontSize: 15, fontWeight: 700,
                    color: sel ? 'var(--accent)' : 'var(--text-primary)',
                  }}>
                    {portion.label}
                  </span>
                </div>
                <span style={{
                  fontSize: 16, fontWeight: 800, letterSpacing: '-0.04em',
                  color: sel ? 'var(--accent)' : 'var(--text-muted)',
                  fontFamily: FONTS.mono,
                }}>
                  {BRAND.currency} {portion.price}
                </span>
              </button>
            )
          })}
        </div>

        {/* Add button */}
        <div style={{ padding: '0 16px' }}>
          <button
            ref={btnRef}
            onClick={handleAdd}
            disabled={!selectedPortion}
            style={{
              width: '100%', height: 56, borderRadius: 17, border: 'none',
              fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: selectedPortion ? 'var(--accent-gradient)' : 'var(--btn-disabled)',
              boxShadow: selectedPortion
                ? '0 8px 28px var(--accent-glow), 0 1px 0 rgba(255,255,255,0.22) inset'
                : 'none',
              color: selectedPortion ? 'var(--text-inverse)' : 'var(--btn-disabled-text)',
              cursor: selectedPortion ? 'pointer' : 'not-allowed',
              fontFamily: FONTS.brand,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Plus size={17} strokeWidth={3}/>
            <span>
              {selectedPortion
                ? `Add to Cart · ${BRAND.currency} ${selectedPortion.price}`
                : 'Select a size'}
            </span>
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}