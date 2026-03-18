// src/modules/customer/pages/CartPage.jsx
//
// ✅ BRAND.currency — Rs hardcoded replaced everywhere
// ✅ Dark/light mode — useContext(ThemeContext) added, CSS vars applied
//    so the page doesn't stay cream-colored in dark mode
// ✅ var(--token) for all theme-sensitive surfaces (header, cards, button area)
// ✅ All logic unchanged — tableId, sessionId, placeOrder, portionId forwarding

import { useState, useContext }                from 'react'
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
import {
  selectTableId,
  selectSessionId,
}                                              from '@store/slices/tableSessionSlice'
import {
  selectHasActiveOrder,
  placeOrder,
}                                              from '@store/slices/orderSlice'
import { ThemeContext }                        from '@shared/context/ThemeContext'
import { BRAND }                               from '@shared/config/brand'
import BottomNav                               from '@shared/components/layout/BottomNav'
import CartItem                                from '../components/cart/CartItem'
import LoyaltyDiscount                         from '../components/cart/LoyaltyDiscount'
import EmptyCart                               from '../components/cart/EmptyCart'
import { ShoppingBag, ChevronRight }           from 'lucide-react'
import toast                                   from 'react-hot-toast'

const CartPage = () => {
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const { isDark } = useContext(ThemeContext)

  const items          = useSelector(selectCartItems)
  const subtotal       = useSelector(selectCartSubtotal)
  const discount       = useSelector(selectCartDiscount)
  const total          = useSelector(selectCartTotal)
  const tier           = useSelector(selectTier)
  const discountPct    = useSelector(selectDiscountPct)
  const tableId        = useSelector(selectTableId)
  const sessionId      = useSelector(selectSessionId)
  const hasActiveOrder = useSelector(selectHasActiveOrder)

  const [placing, setPlacing] = useState(false)
  const [note,    setNote]    = useState('')

  const handlePlaceOrder = async () => {
    if (hasActiveOrder) {
      toast.error('You already have an active order. Track it first.')
      return
    }
    if (!tableId) {
      toast.error('No table session found. Please scan again.')
      return
    }
    setPlacing(true)
    const result = await dispatch(
      placeOrder({
        items: items.map((i) => ({
          menuItemId:     i.menuItemId,
          name:           i.name,
          price:          i.price,
          quantity:       i.quantity,
          emoji:          i.emoji,
          category:       i.category,
          portionId:      i.portionId      ?? null,
          portionLabel:   i.portionLabel   ?? null,
          customizations: i.customizations ?? null,
        })),
        tableId,
        sessionId,
        specialNote: note.trim() || null,
      }),
    )
    setPlacing(false)
    if (!result.error) {
      dispatch(clearCart())
      toast.success('Order placed! 🎉')
      navigate('/order/status')
    } else {
      toast.error('Failed to place order. Please try again.')
    }
  }

  // ── Empty cart ─────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="customer-container min-h-screen flex flex-col"
        style={{ background: 'var(--bg)' }}>
        <header className="px-4 pt-5 pb-3">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Your Cart
          </h1>
        </header>
        <EmptyCart />
        <BottomNav />
      </div>
    )
  }

  // ── Filled cart ────────────────────────────────────────────────────────────
  return (
    <div className="customer-container min-h-screen flex flex-col"
      style={{ background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <header
        className="px-4 pt-5 pb-3 sticky top-0 z-20 backdrop-blur-md"
        style={{
          background: 'var(--header-bg)',
          borderBottom: '1px solid var(--divider)',
        }}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Your Cart
          </h1>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{
              background: 'var(--accent-dim)',
              border: '1px solid var(--accent-border)',
              color: 'var(--accent)',
            }}
          >
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-auto px-4 pt-3 pb-bottom-nav space-y-3">

        {/* Items list */}
        {items.map((item) => (
          <CartItem
            key={`${item.menuItemId}::${item.portionId ?? ''}`}
            item={item}
            onRemove={() => dispatch(removeItem({ menuItemId: item.menuItemId, portionId: item.portionId ?? null }))}
            onQuantity={(q) =>
              dispatch(updateQuantity({ menuItemId: item.menuItemId, portionId: item.portionId ?? null, quantity: q }))
            }
          />
        ))}

        {/* Special note */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
          }}
        >
          <label
            className="text-sm font-semibold block mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Special Instructions
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Allergies, preferences, extra spicy…"
            rows={2}
            maxLength={200}
            className="w-full resize-none text-sm rounded-xl px-3 py-2.5 outline-none transition-colors"
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-primary)',
            }}
            onFocus={e  => (e.target.style.borderColor = 'var(--input-border-focus)')}
            onBlur={e   => (e.target.style.borderColor = 'var(--input-border)')}
          />
        </div>

        {/* Loyalty discount */}
        {tier !== 'none' && discountPct > 0 && (
          <LoyaltyDiscount
            tier={tier}
            discountPct={discountPct}
            discountAmt={discount}
          />
        )}

        {/* Bill summary */}
        <div
          className="rounded-2xl p-4 space-y-2"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
          }}
        >
          <div className="flex justify-between text-sm"
            style={{ color: 'var(--text-secondary)' }}>
            <span>Subtotal</span>
            {/* ✅ BRAND.currency — not hardcoded Rs */}
            <span>{BRAND.currency} {subtotal}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm font-medium"
              style={{ color: 'var(--success)' }}>
              <span>Loyalty Discount ({discountPct}%)</span>
              <span>−{BRAND.currency} {discount}</span>
            </div>
          )}
          <div
            className="pt-2 flex justify-between font-bold text-lg"
            style={{
              borderTop: '1px solid var(--divider)',
              color: 'var(--text-primary)',
            }}
          >
            <span>Total</span>
            <span>{BRAND.currency} {total}</span>
          </div>
        </div>
      </div>

      {/* ── Sticky place order button ── */}
      <div
        className="sticky px-4 pb-3 pt-2 backdrop-blur-md"
        style={{
          bottom: '64px',
          background: 'var(--header-bg)',
          borderTop: '1px solid var(--divider)',
        }}
      >
        <button
          onClick={handlePlaceOrder}
          disabled={placing}
          className="w-full flex items-center justify-center gap-2 text-base py-4 min-h-[56px] rounded-2xl font-bold transition-opacity"
          style={{
            background: placing ? 'var(--btn-disabled)' : 'var(--accent-gradient)',
            color: placing ? 'var(--btn-disabled-text)' : '#fff',
            boxShadow: placing ? 'none' : '0 6px 24px var(--accent-glow)',
            opacity: placing ? 0.7 : 1,
            cursor: placing ? 'not-allowed' : 'pointer',
            border: 'none',
          }}
        >
          {placing ? (
            <div
              className="w-5 h-5 rounded-full border-2 animate-spin"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
            />
          ) : (
            <>
              <ShoppingBag size={20} />
              {/* ✅ BRAND.currency */}
              Place Order · {BRAND.currency} {total}
              <ChevronRight size={18} className="ml-auto" />
            </>
          )}
        </button>
      </div>

      <BottomNav />
    </div>
  )
}

export default CartPage