// src/modules/customer/pages/CartPage.jsx
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate }              from 'react-router-dom'
import {
  selectCartItems, selectCartSubtotal, selectCartDiscount,
  selectCartTotal, removeItem, updateQuantity, clearCart,
} from '@store/slices/cartSlice'
import { selectTier, selectDiscountPct } from '@store/slices/loyaltySlice'
import { selectHasActiveOrder }     from '@store/slices/orderSlice'
import { placeOrder }               from '@store/slices/orderSlice'
import { selectTableId, selectSessionId } from '@store/slices/cartSlice'
import BottomNav                    from '@shared/components/layout/BottomNav'
import CartItem                     from '../components/cart/CartItem'
import LoyaltyDiscount              from '../components/cart/LoyaltyDiscount'
import EmptyCart                    from '../components/cart/EmptyCart'
import { COLORS }                   from '@colors'
import { ShoppingBag, ChevronRight } from 'lucide-react'
import { useState }                 from 'react'
import toast                        from 'react-hot-toast'

const CartPage = () => {
  const dispatch      = useDispatch()
  const navigate      = useNavigate()
  const items         = useSelector(selectCartItems)
  const subtotal      = useSelector(selectCartSubtotal)
  const discount      = useSelector(selectCartDiscount)
  const total         = useSelector(selectCartTotal)
  const tier          = useSelector(selectTier)
  const discountPct   = useSelector(selectDiscountPct)
  const tableId       = useSelector(selectTableId)
  const sessionId     = useSelector(selectSessionId)
  const hasActiveOrder = useSelector(selectHasActiveOrder)
  const [placing, setPlacing] = useState(false)
  const [note, setNote]       = useState('')

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
    const result = await dispatch(placeOrder({
      items:     items.map((i) => ({
        menuItemId: i.menuItemId,
        name:       i.name,
        price:      i.price,
        quantity:   i.quantity,
        emoji:      i.emoji,
        category:   i.category,
      })),
      tableId, sessionId,
      specialNote: note.trim() || null,
    }))
    setPlacing(false)
    if (!result.error) {
      dispatch(clearCart())
      toast.success('Order placed! 🎉')
      navigate('/track')
    } else {
      toast.error('Failed to place order. Please try again.')
    }
  }

  if (items.length === 0) return (
    <div className="customer-container min-h-screen bg-cream flex flex-col">
      <header className="px-4 pt-5 pb-3">
        <h1 className="text-2xl font-bold text-brew">Your Cart</h1>
      </header>
      <EmptyCart />
      <BottomNav />
    </div>
  )

  return (
    <div className="customer-container min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="px-4 pt-5 pb-3 sticky top-0 z-20 bg-cream/95 backdrop-blur-md
                          border-b border-cream-border">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-brew">Your Cart</h1>
          <span className="badge bg-saffron/10 text-saffron font-semibold">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-4 pt-3 pb-bottom-nav space-y-3">
        {/* Items */}
        {items.map((item) => (
          <CartItem
            key={item.menuItemId}
            item={item}
            onRemove={() => dispatch(removeItem(item.menuItemId))}
            onQuantity={(q) => dispatch(updateQuantity({ menuItemId: item.menuItemId, quantity: q }))}
          />
        ))}

        {/* Special note */}
        <div className="card">
          <label className="text-sm font-semibold text-brew block mb-2">
            Special Instructions
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Allergies, preferences, extra spicy…"
            rows={2}
            maxLength={200}
            className="input-base resize-none text-sm"
          />
        </div>

        {/* Loyalty discount */}
        {tier !== 'none' && discountPct > 0 && (
          <LoyaltyDiscount tier={tier} discountPct={discountPct} discountAmt={discount} />
        )}

        {/* Bill summary */}
        <div className="card space-y-2">
          <div className="flex justify-between text-sm text-brew-soft">
            <span>Subtotal</span>
            <span>₹{subtotal}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-matcha font-medium">
              <span>Loyalty Discount ({discountPct}%)</span>
              <span>−₹{discount}</span>
            </div>
          )}
          <div className="border-t border-cream-border pt-2 flex justify-between
                          font-bold text-brew text-lg">
            <span>Total</span>
            <span>₹{total}</span>
          </div>
        </div>
      </div>

      {/* Sticky place order button */}
      <div className="sticky bottom-[64px] px-4 pb-3 pt-2 bg-cream/95 backdrop-blur-md
                      border-t border-cream-border">
        <button
          onClick={handlePlaceOrder}
          disabled={placing}
          className="btn-brand w-full text-base py-4 min-h-[56px]"
        >
          {placing ? (
            <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <>
              <ShoppingBag size={20} />
              Place Order · ₹{total}
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