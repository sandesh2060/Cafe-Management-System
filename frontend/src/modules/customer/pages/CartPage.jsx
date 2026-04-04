// src/modules/customer/pages/CartPage.jsx
//
// ─── MODULE 22: Cart pricing integration ──────────────────────────────────────
// ★ Calls POST /pricing-rules/compute on mount + whenever items change
// ★ Shows strikethrough original price + discounted price per item
// ★ Savings summary row in totals (green, shows total discount from pricing rules)
// ★ usePricingRules hook fetches active rules for badge display
//
// All existing logic unchanged:
//   isLocked, isAddon, loyalty discount, placeOrder, note, BottomNav
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useContext, useEffect, useCallback, useRef } from 'react'
import { useSelector, useDispatch }            from 'react-redux'
import { useNavigate }                         from 'react-router-dom'
import {
  selectCartItems,
  selectCartSubtotal,
  selectCartDiscount,
  selectCartTotal,
  removeItem,
  updateQuantity,
  clearCart,
}                                              from '@store/slices/cartSlice'
import { selectTier, selectDiscountPct }       from '@store/slices/loyaltySlice'
import { selectTableId, selectSessionId }      from '@store/slices/tableSessionSlice'
import {
  selectHasActiveOrder,
  selectActiveOrder,
  selectCanAddItems,
  placeOrder,
  clearMerged,
  clearReordered,
}                                              from '@store/slices/orderSlice'
import { selectUser }                          from '@store/slices/authSlice'
import { selectLoyalty }                       from '@store/slices/loyaltySlice'
import {
  selectVenueCafeId,
  selectIsRemote,
}                                              from '@store/slices/venueSlice'
import {
  selectOrderType,
  selectDeliveryAddress,
}                                              from '@store/slices/remoteOrderSlice'
import { ThemeContext }                        from '@shared/context/ThemeContext'
import { BRAND, FONTS }                        from '@shared/config/brand'
import api                                     from '@api/axios'
import BottomNav                               from '@shared/components/layout/BottomNav'
import CartItem                                from '../components/cart/CartItem'
import LoyaltyDiscount                         from '../components/cart/LoyaltyDiscount'
import EmptyCart                               from '../components/cart/EmptyCart'
import { ShoppingBag, ChevronRight, PlusCircle, Lock, Tag, Zap } from 'lucide-react'
import toast                                   from 'react-hot-toast'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n ?? 0).toLocaleString(BRAND.locale, { maximumFractionDigits: 0 })

// ── Pricing compute hook ──────────────────────────────────────────────────────
// Calls /pricing-rules/compute and returns per-item discounts + total savings
const usePricingCompute = (items, cafeId) => {
  const [result,  setResult]  = useState(null)   // { items: [...], totalSavings, appliedRules }
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)

  const compute = useCallback(async () => {
    if (!items?.length || !cafeId) { setResult(null); return }
    setLoading(true)
    try {
      const payload = {
        cafeId,
        items: items.map(i => ({
          menuItemId: i.menuItemId,
          category:   i.category,
          quantity:   i.quantity,
          price:      i.price,
        })),
      }
      const res = await api.post('/pricing-rules/compute', payload)
      const data = res.data?.data ?? res.data ?? res
      setResult(data)
    } catch {
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [items, cafeId])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(compute, 350)
    return () => clearTimeout(debounceRef.current)
  }, [compute])

  // Return map of menuItemId → { discountedPrice, originalPrice, saving }
  const itemPricing = {}
  if (result?.items) {
    result.items.forEach(i => {
      itemPricing[i.menuItemId] = {
        originalPrice:   i.originalPrice   ?? i.price,
        discountedPrice: i.discountedPrice ?? i.price,
        saving:          i.saving          ?? 0,
        badge:           i.badge           ?? null,
      }
    })
  }

  return {
    itemPricing,
    totalSavings:  result?.totalSavings  ?? 0,
    appliedRules:  result?.appliedRules  ?? [],
    loading,
  }
}

// ── Pricing savings badge ─────────────────────────────────────────────────────
const SavingsBadge = ({ amount, isDark }) => {
  if (!amount || amount <= 0) return null
  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-3"
      style={{
        background: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)',
        border: '1px solid rgba(16,185,129,0.2)',
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: 'rgba(16,185,129,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Tag size={13} color="#10B981" strokeWidth={2.2} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#10B981', fontFamily: FONTS.body }}>
          You're saving {BRAND.currency} {fmt(amount)} on this order!
        </p>
        <p style={{ margin: '1px 0 0', fontSize: 10.5, color: isDark ? 'rgba(52,211,153,0.6)' : 'rgba(5,150,105,0.65)', fontFamily: FONTS.body }}>
          Pricing discounts applied automatically
        </p>
      </div>
      <Zap size={14} color="#10B981" strokeWidth={2} />
    </div>
  )
}

// ── Applied rules list ────────────────────────────────────────────────────────
const AppliedRules = ({ rules, isDark }) => {
  if (!rules?.length) return null
  return (
    <div className="flex flex-col gap-1 mb-2">
      {rules.map((rule, i) => (
        <div key={i} className="flex items-center gap-2">
          <span style={{ fontSize: 9.5, fontWeight: 700, color: '#10B981', fontFamily: FONTS.body }}>
            ✦ {rule.name ?? rule.type ?? 'Discount'}
          </span>
          {rule.discountValue && (
            <span style={{ fontSize: 9.5, color: isDark ? 'rgba(52,211,153,0.5)' : 'rgba(5,150,105,0.5)', fontFamily: FONTS.body }}>
              {rule.discountType === 'percentage' ? `${rule.discountValue}% off` : `Rs ${rule.discountValue} off`}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// ══ Main ══════════════════════════════════════════════════════════════════════
const CartPage = () => {
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const { isDark } = useContext(ThemeContext)

  const items          = useSelector(selectCartItems)
  const subtotal       = useSelector(selectCartSubtotal)
  const discount       = useSelector(selectCartDiscount)   // loyalty discount
  const total          = useSelector(selectCartTotal)       // after loyalty
  const tier           = useSelector(selectTier)
  const discountPct    = useSelector(selectDiscountPct)
  const tableId        = useSelector(selectTableId)
  const sessionId      = useSelector(selectSessionId)
  const hasActiveOrder = useSelector(selectHasActiveOrder)
  const activeOrder    = useSelector(selectActiveOrder)
  const canAddItems    = useSelector(selectCanAddItems)
  const user           = useSelector(selectUser)
  const loyalty        = useSelector(selectLoyalty)
  const venueCafeId    = useSelector(selectVenueCafeId)
  const isRemote       = useSelector(selectIsRemote)
  const orderType      = useSelector(selectOrderType)
  const deliveryAddress = useSelector(selectDeliveryAddress)

  const cafeId = venueCafeId ?? user?.cafeId ?? BRAND.cafeId ?? 'demo'

  const [placing, setPlacing] = useState(false)
  const [note,    setNote]    = useState('')

  // ★ Module 22: compute pricing discounts
  const {
    itemPricing,
    totalSavings,
    appliedRules,
    loading: pricingLoading,
  } = usePricingCompute(items, cafeId)

  // Three distinct cart states
  const isLocked = hasActiveOrder && !canAddItems
  const isAddon  = hasActiveOrder && canAddItems

  // ★ Effective total = after both loyalty AND pricing discounts
  const effectiveTotal = Math.max(0, total - totalSavings)

  const handlePlaceOrder = async () => {
    if (isLocked) {
      toast.error('Your bill has been requested — payment in progress.')
      return
    }
    if (!tableId && !isRemote) {
      toast.error('No table session found. Please scan again.')
      return
    }

    setPlacing(true)
    const result = await dispatch(
      placeOrder({
        items: items.map(i => ({
          menuItemId:     i.menuItemId,
          name:           i.name,
          price:          itemPricing[i.menuItemId]?.discountedPrice ?? i.price,
          originalPrice:  i.price,
          quantity:       i.quantity,
          emoji:          i.emoji,
          category:       i.category,
          portionId:      i.portionId      ?? null,
          portionLabel:   i.portionLabel   ?? null,
          customizations: i.customizations ?? null,
        })),
        tableId,
        sessionId,
        cafeId,
        loyaltyTier:    loyalty?.tier ?? tier ?? 'none',
        specialNote:    note.trim() || null,
        // ★ Remote order fields
        ...(isRemote && {
          orderType,
          deliveryAddress: orderType === 'delivery' ? deliveryAddress : null,
        }),
        // ★ Pricing savings metadata
        pricingSavings: totalSavings > 0 ? totalSavings : undefined,
        appliedRules:   appliedRules.length ? appliedRules.map(r => r._id) : undefined,
      }),
    )
    setPlacing(false)

    if (!result.error) {
      dispatch(clearCart())
      dispatch(clearMerged())
      dispatch(clearReordered())

      const merged    = result.payload?.merged    ?? result.payload?.data?.merged    ?? false
      const reordered = result.payload?.reordered ?? result.payload?.data?.reordered ?? false

      if (reordered)   toast.success('Back in kitchen! New items are being prepared 👨‍🍳', { duration: 3500 })
      else if (merged) toast.success('Added to your current order 🍽️', { duration: 2500 })
      else             toast.success('Order placed! 🎉')

      navigate('/order/status')
    } else {
      toast.error(result.payload || 'Failed to place order. Please try again.')
    }
  }

  if (items.length === 0) {
    return (
      <div className="customer-container min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
        <header className="px-4 pt-5 pb-3">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Your Cart</h1>
        </header>
        <EmptyCart />
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="customer-container min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      <header className="px-4 pt-5 pb-3 sticky top-0 z-20 backdrop-blur-md"
        style={{ background: 'var(--header-bg)', borderBottom: '1px solid var(--divider)' }}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: FONTS.heading }}>
            {isLocked ? 'Cart' : isAddon ? 'Add Items' : 'Your Cart'}
          </h1>
          <div className="flex items-center gap-2">
            {/* ★ Savings indicator in header */}
            {totalSavings > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981' }}>
                −{BRAND.currency} {fmt(totalSavings)}
              </span>
            )}
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', color: 'var(--accent)' }}>
              {items.length} item{items.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-4 pt-3 pb-bottom-nav space-y-3">

        {/* Locked banner */}
        {isLocked && (
          <div className="rounded-2xl p-3 flex items-start gap-3"
            style={{ background: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <div style={{ width:30, height:30, borderRadius:9, flexShrink:0, background:'rgba(239,68,68,0.14)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Lock size={15} color="#EF4444" strokeWidth={2.2} />
            </div>
            <div>
              <p style={{ margin:0, fontSize:13, fontWeight:700, color:'#EF4444', fontFamily:FONTS.body }}>Bill requested — order locked</p>
              <p style={{ margin:'3px 0 0', fontSize:11.5, lineHeight:1.5, color:'var(--text-muted)', fontFamily:FONTS.body }}>
                Your bill has been sent to the cashier. No new items can be added. Please complete payment first.
              </p>
            </div>
          </div>
        )}

        {/* Add-on banner */}
        {isAddon && (
          <div className="rounded-2xl p-3 flex items-start gap-3"
            style={{ background: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.28)' }}>
            <div style={{ width:30, height:30, borderRadius:9, flexShrink:0, background:'rgba(245,158,11,0.14)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <PlusCircle size={15} color="#F59E0B" strokeWidth={2.2} />
            </div>
            <div>
              <p style={{ margin:0, fontSize:13, fontWeight:700, color:'#F59E0B', fontFamily:FONTS.body }}>
                {activeOrder?.status === 'delivered' ? 'Adding more? Great choice!' : 'Adding to current order'}
              </p>
              <p style={{ margin:'3px 0 0', fontSize:11.5, lineHeight:1.5, color:'var(--text-muted)', fontFamily:FONTS.body }}>
                {activeOrder?.status === 'delivered'
                  ? 'New items will go back to the kitchen and be added to your bill.'
                  : `You have ${activeOrder?.items?.length ?? '?'} item${(activeOrder?.items?.length ?? 1) !== 1 ? 's' : ''} in your ${activeOrder?.status} order. These will be added on.`}
              </p>
            </div>
          </div>
        )}

        {/* ★ Savings banner */}
        <SavingsBadge amount={totalSavings} isDark={isDark} />

        {/* Cart items — with strikethrough pricing */}
        {items.map(item => {
          const pricing = itemPricing[item.menuItemId]
          const hasDiscount = pricing && pricing.discountedPrice < pricing.originalPrice

          return (
            <div key={`${item.menuItemId}::${item.portionId ?? ''}`}>
              <CartItem
                item={{
                  ...item,
                  // ★ Pass discounted price to CartItem for display
                  displayPrice:    hasDiscount ? pricing.discountedPrice : item.price,
                  originalPrice:   hasDiscount ? pricing.originalPrice   : null,
                  pricingBadge:    hasDiscount ? pricing.badge           : null,
                }}
                onRemove={() => dispatch(removeItem({ menuItemId: item.menuItemId, portionId: item.portionId ?? null }))}
                onQuantity={q => dispatch(updateQuantity({ menuItemId: item.menuItemId, portionId: item.portionId ?? null, quantity: q }))}
              />
            </div>
          )
        })}

        {/* Special note */}
        {!isLocked && (
          <div className="rounded-2xl p-4"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <label className="text-sm font-semibold block mb-2"
              style={{ color: 'var(--text-primary)', fontFamily: FONTS.body }}>
              {isAddon ? 'Note for new items (optional)' : 'Special Instructions'}
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={isAddon ? 'Any note for the kitchen?' : 'Allergies, preferences, extra spicy…'}
              rows={2}
              maxLength={200}
              className="w-full resize-none text-sm rounded-xl px-3 py-2.5 outline-none transition-colors"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)', fontFamily: FONTS.body }}
              onFocus={e => (e.target.style.borderColor = 'var(--input-border-focus)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--input-border)')}
            />
          </div>
        )}

        {/* Loyalty discount */}
        {tier !== 'none' && discountPct > 0 && (
          <LoyaltyDiscount tier={tier} discountPct={discountPct} discountAmt={discount} />
        )}

        {/* Totals */}
        <div className="rounded-2xl p-4 space-y-2"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>

          <div className="flex justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>Subtotal</span>
            <span>{BRAND.currency} {fmt(subtotal)}</span>
          </div>

          {/* ★ Pricing discount row */}
          {totalSavings > 0 && (
            <div className="flex justify-between text-sm font-medium" style={{ color: '#10B981' }}>
              <span className="flex items-center gap-1.5">
                <Tag size={11} strokeWidth={2} />
                Pricing Discount
              </span>
              <span>−{BRAND.currency} {fmt(totalSavings)}</span>
            </div>
          )}

          {/* ★ Applied rules */}
          {appliedRules.length > 0 && (
            <AppliedRules rules={appliedRules} isDark={isDark} />
          )}

          {/* Loyalty discount row */}
          {discount > 0 && (
            <div className="flex justify-between text-sm font-medium" style={{ color: 'var(--success)' }}>
              <span>Loyalty Discount ({discountPct}%)</span>
              <span>−{BRAND.currency} {fmt(discount)}</span>
            </div>
          )}

          {/* Total */}
          <div className="pt-2 flex justify-between font-bold text-lg"
            style={{ borderTop: '1px solid var(--divider)', color: 'var(--text-primary)' }}>
            <span>Total</span>
            <div className="flex items-center gap-2">
              {/* ★ Strikethrough original total when discounts active */}
              {(totalSavings > 0 || discount > 0) && (
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                  {BRAND.currency} {fmt(subtotal)}
                </span>
              )}
              <span style={{ color: totalSavings > 0 ? '#10B981' : 'var(--accent)' }}>
                {BRAND.currency} {fmt(effectiveTotal)}
              </span>
            </div>
          </div>

          {/* ★ Total savings callout */}
          {(totalSavings + discount) > 0 && (
            <div className="text-center text-xs font-semibold pt-1" style={{ color: '#10B981' }}>
              You save {BRAND.currency} {fmt(totalSavings + discount)} total 🎉
            </div>
          )}
        </div>
      </div>

      {/* Place order button */}
      <div className="sticky px-4 pb-3 pt-2 backdrop-blur-md"
        style={{ bottom: '64px', background: 'var(--header-bg)', borderTop: '1px solid var(--divider)' }}>
        <button
          onClick={handlePlaceOrder}
          disabled={placing || isLocked}
          className="w-full flex items-center justify-center gap-2 text-base py-4 min-h-[56px] rounded-2xl font-bold transition-opacity"
          style={{
            background: (placing || isLocked) ? 'var(--btn-disabled)' : 'var(--accent-gradient)',
            color:      (placing || isLocked) ? 'var(--btn-disabled-text)' : '#fff',
            boxShadow:  (placing || isLocked) ? 'none' : '0 6px 24px var(--accent-glow)',
            opacity:    (placing || isLocked) ? 0.55 : 1,
            cursor:     (placing || isLocked) ? 'not-allowed' : 'pointer',
            border:     'none',
            fontFamily: FONTS.brand || FONTS.heading,
          }}
        >
          {placing ? (
            <div className="w-5 h-5 rounded-full border-2 animate-spin"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          ) : isLocked ? (
            <><Lock size={18} /> Bill Locked — Payment in Progress</>
          ) : isAddon ? (
            <><PlusCircle size={20} />Add to Order · {BRAND.currency} {fmt(effectiveTotal)}</>
          ) : (
            <><ShoppingBag size={20} />Place Order · {BRAND.currency} {fmt(effectiveTotal)}<ChevronRight size={18} className="ml-auto" /></>
          )}
        </button>
      </div>

      <BottomNav />
    </div>
  )
}

export default CartPage