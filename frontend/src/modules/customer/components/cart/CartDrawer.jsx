// src/modules/customer/components/cart/CartDrawer.jsx
// Wired to backend — Place Order button dispatches placeOrder thunk.
// On success → clears cart, navigates to /order/status

import { useContext, useRef, useEffect, useCallback, useState } from 'react'
import { createPortal }       from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate }        from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import gsap                   from 'gsap'
import {
  X, ShoppingCart, Trash2, Plus, Minus,
  ChevronRight, Loader2, AlertCircle,
} from 'lucide-react'
import { ThemeContext }        from '@shared/context/ThemeContext'
import {
  selectCartItems,
  selectCartSubtotal,
  selectCartTotal,
  selectCartDiscount,
  removeItem,
  updateQuantity,
  clearCart,
} from '@store/slices/cartSlice'
import {
  selectTableId,
  selectSessionId,
} from '@store/slices/cartSlice'
import {
  placeOrder,
  selectOrderPlacing,
  selectOrderError,
  clearError,
} from '@store/slices/orderSlice'
import { selectUser }          from '@store/slices/authSlice'
import { selectLoyalty }       from '@store/slices/loyaltySlice'

const CAFE_ID = import.meta.env.VITE_CAFE_ID || 'demo'

// ── Cart item row ─────────────────────────────────────────────────────────────
const CartRow = ({ item, isDark: D, onRemove, onQty }) => {
  const rowRef  = useRef(null)
  const plusRef = useRef(null)
  const minRef  = useRef(null)

  const bump = (ref) => {
    if (!ref.current) return
    gsap.timeline()
      .to(ref.current, { scale: 0.7, duration: 0.08, ease: 'power3.in' })
      .to(ref.current, { scale: 1.2, duration: 0.2,  ease: 'back.out(3)' })
      .to(ref.current, { scale: 1,   duration: 0.18, ease: 'power2.out' })
  }

  return (
    <motion.div
      ref={rowRef}
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1,  x: 0   }}
      exit={{    opacity: 0,  x: 12, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3 py-3"
      style={{ borderBottom: `1px solid ${D ? 'rgba(255,255,255,0.06)' : 'rgba(92,51,23,0.08)'}` }}
    >
      {/* Emoji */}
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: D ? 'rgba(255,159,28,0.1)' : 'rgba(255,240,210,0.8)' }}>
        {item.emoji}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="m-0 text-[13px] font-bold leading-snug truncate"
          style={{ color: D ? '#FFF8EE' : '#120D06' }}>
          {item.name}
        </p>
        {item.portionLabel && (
          <p className="m-0 text-[10px] mt-0.5" style={{ color: D ? 'rgba(255,184,77,0.5)' : 'rgba(92,51,23,0.45)' }}>
            {item.portionLabel}
          </p>
        )}
        <p className="m-0 text-[12px] font-extrabold mt-1 font-mono"
          style={{ color: D ? '#FFB84D' : '#C8680A' }}>
          ₹{item.price * item.quantity}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-end gap-2">
        <button
          onClick={() => onRemove(item)}
          className="w-6 h-6 rounded-lg flex items-center justify-center border-none cursor-pointer"
          style={{ background: D ? 'rgba(255,255,255,0.06)' : 'rgba(92,51,23,0.06)', color: D ? 'rgba(255,100,100,0.6)' : '#ef4444', WebkitTapHighlightColor: 'transparent' }}>
          <Trash2 size={11} strokeWidth={2} />
        </button>
        <div className="flex items-center gap-0 rounded-xl overflow-hidden"
          style={{ border: `1.5px solid ${D ? 'rgba(255,255,255,0.1)' : 'rgba(92,51,23,0.12)'}` }}>
          <button ref={minRef}
            onClick={() => { bump(minRef); onQty(item, item.quantity - 1) }}
            className="w-7 h-7 flex items-center justify-center border-none bg-transparent cursor-pointer"
            style={{ color: D ? '#FFF8EE' : '#5C3317', WebkitTapHighlightColor: 'transparent' }}>
            <Minus size={11} strokeWidth={2.5} />
          </button>
          <span className="w-6 text-center text-[12px] font-black font-mono"
            style={{ color: D ? '#FFF8EE' : '#120D06' }}>
            {item.quantity}
          </span>
          <button ref={plusRef}
            onClick={() => { bump(plusRef); onQty(item, item.quantity + 1) }}
            className="w-7 h-7 flex items-center justify-center border-none bg-transparent cursor-pointer"
            style={{ color: D ? '#FFF8EE' : '#5C3317', WebkitTapHighlightColor: 'transparent' }}>
            <Plus size={11} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
const CartDrawer = ({ open, onClose, lenis }) => {
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const { isDark: D } = useContext(ThemeContext)

  const items      = useSelector(selectCartItems)
  const subtotal   = useSelector(selectCartSubtotal)
  const total      = useSelector(selectCartTotal)
  const discount   = useSelector(selectCartDiscount)
  const tableId    = useSelector(selectTableId)
  const sessionId  = useSelector(selectSessionId)
  const user       = useSelector(selectUser)
  const loyalty    = useSelector(selectLoyalty)
  const placing    = useSelector(selectOrderPlacing)
  const orderError = useSelector(selectOrderError)
  const [note, setNote] = useState('')

  // Theme tokens
  const bg      = D ? '#0F0A06' : '#FFFBF4'
  const surface = D ? '#1A1208' : '#FFFFFF'
  const border  = D ? 'rgba(255,159,28,0.12)' : '#F0D9B5'
  const text    = D ? '#FFF8EE' : '#5C3317'
  const muted   = D ? '#C49A6C' : '#8B5E3C'

  // Clear error when drawer closes
  useEffect(() => {
    if (!open) dispatch(clearError())
  }, [open, dispatch])

  const handleRemove = useCallback((item) => {
    dispatch(removeItem({ menuItemId: item.menuItemId, portionId: item.portionId }))
  }, [dispatch])

  const handleQty = useCallback((item, qty) => {
    if (qty <= 0) {
      dispatch(removeItem({ menuItemId: item.menuItemId, portionId: item.portionId }))
    } else {
      dispatch(updateQuantity({ menuItemId: item.menuItemId, portionId: item.portionId, quantity: qty }))
    }
  }, [dispatch])

  const handlePlaceOrder = useCallback(async () => {
    if (!items.length) return

    const orderData = {
      items: items.map(i => ({
        menuItemId:   i.menuItemId,
        name:         i.name,
        price:        i.price,
        quantity:     i.quantity,
        emoji:        i.emoji,
        category:     i.category,
        portionId:    i.portionId   ?? null,
        portionLabel: i.portionLabel ?? null,
      })),
      tableId:     tableId    ?? user?.tableId    ?? null,
      sessionId:   sessionId  ?? user?.sessionId  ?? null,
      cafeId:      user?.cafeId ?? CAFE_ID,
      discountPct: loyalty?.discountPct ?? 0,
      loyaltyTier: loyalty?.tier        ?? 'none',
      specialNote: note.trim() || null,
    }

    const result = await dispatch(placeOrder(orderData))
    if (placeOrder.fulfilled.match(result)) {
      dispatch(clearCart())
      onClose()
      navigate('/order/status')
    }
  }, [items, tableId, sessionId, user, loyalty, note, dispatch, onClose, navigate])

  const handleClear = useCallback(() => dispatch(clearCart()), [dispatch])

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{   opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[80]"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{   y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 36, mass: 0.9 }}
            className="fixed left-0 right-0 bottom-0 z-[81] flex flex-col"
            style={{
              background:   bg,
              borderRadius: '28px 28px 0 0',
              maxHeight:    '92vh',
              boxShadow:    D
                ? '0 -16px 60px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,159,28,0.1)'
                : '0 -16px 48px rgba(92,51,23,0.18), 0 0 0 1px rgba(240,217,181,0.5)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {/* Gold top line */}
            <div className="absolute top-0 left-[12%] right-[12%] h-0.5 rounded-full pointer-events-none"
              style={{ background: 'linear-gradient(90deg,transparent,#FF9F1C 30%,#FFD580 50%,#E05C2A 70%,transparent)', opacity: D ? 0.6 : 0.45 }} />

            {/* Drag handle */}
            <div className="w-9 h-1 rounded-full mx-auto mt-4 mb-1 flex-shrink-0"
              style={{ background: D ? 'rgba(255,255,255,0.15)' : 'rgba(92,51,23,0.14)' }} />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-2 pb-3 flex-shrink-0"
              style={{ borderBottom: `1px solid ${border}` }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#FF9F1C,#E05C2A)', boxShadow: '0 4px 14px rgba(255,130,0,0.38)' }}>
                  <ShoppingCart size={16} color="#fff" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="m-0 text-[16px] font-extrabold" style={{ color: text }}>Your Cart</h2>
                  <p className="m-0 text-[10px]" style={{ color: muted }}>{items.length} item{items.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button onClick={handleClear}
                    className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border-none cursor-pointer"
                    style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', WebkitTapHighlightColor: 'transparent' }}>
                    <Trash2 size={11} /> Clear
                  </button>
                )}
                <button onClick={onClose}
                  className="w-8 h-8 rounded-xl flex items-center justify-center border-none cursor-pointer"
                  style={{ background: D ? 'rgba(255,255,255,0.07)' : '#FFF0D6', border: `1px solid ${border}`, color: muted, WebkitTapHighlightColor: 'transparent' }}>
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5" style={{ scrollbarWidth: 'none' }}>
              {items.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1,  y: 0  }}
                  className="flex flex-col items-center justify-center py-16 gap-3"
                >
                  <motion.span
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ fontSize: 48 }}>🛒</motion.span>
                  <p className="m-0 text-[14px] font-semibold" style={{ color: muted }}>Your cart is empty</p>
                  <p className="m-0 text-[12px]" style={{ color: D ? 'rgba(196,154,108,0.5)' : 'rgba(139,94,60,0.45)' }}>
                    Add something delicious
                  </p>
                </motion.div>
              ) : (
                <AnimatePresence initial={false}>
                  {items.map(item => (
                    <CartRow
                      key={`${item.menuItemId}::${item.portionId ?? 'none'}`}
                      item={item}
                      isDark={D}
                      onRemove={handleRemove}
                      onQty={handleQty}
                    />
                  ))}
                </AnimatePresence>
              )}

              {/* Special note */}
              {items.length > 0 && (
                <div className="mt-4 mb-2">
                  <textarea
                    rows={2}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Add a special note (optional)…"
                    maxLength={200}
                    style={{
                      width: '100%', resize: 'none', outline: 'none', boxSizing: 'border-box',
                      fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: 12,
                      lineHeight: 1.6, borderRadius: 13, padding: '9px 13px',
                      WebkitAppearance: 'none',
                      background: D ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.8)',
                      border: `1.5px solid ${D ? 'rgba(255,159,28,0.15)' : 'rgba(200,175,135,0.5)'}`,
                      color: text,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="flex-shrink-0 px-5 pt-3 pb-5"
                style={{ borderTop: `1px solid ${border}` }}>
                {/* Price breakdown */}
                <div className="mb-3 space-y-1">
                  <div className="flex justify-between text-[12px]" style={{ color: muted }}>
                    <span>Subtotal</span>
                    <span className="font-mono font-bold">₹{subtotal}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-[12px]">
                      <span style={{ color: '#22c55e' }}>Loyalty Discount</span>
                      <span className="font-mono font-bold" style={{ color: '#22c55e' }}>−₹{discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[15px] font-extrabold pt-1"
                    style={{ borderTop: `1px solid ${border}`, paddingTop: 8, color: text }}>
                    <span>Total</span>
                    <span className="font-mono" style={{ color: D ? '#FFB84D' : '#C8680A' }}>₹{total}</span>
                  </div>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {orderError && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1,  y: 0  }}
                      exit={{   opacity: 0,  y: -6  }}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
                    >
                      <AlertCircle size={13} color="#ef4444" strokeWidth={2} />
                      <p className="m-0 text-[12px] font-semibold" style={{ color: '#ef4444' }}>{orderError}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Place order button */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={placing || !items.length}
                  className="w-full h-14 rounded-[18px] border-none cursor-pointer text-white text-[15px] font-extrabold tracking-tight flex items-center justify-center gap-2"
                  style={{
                    background:  placing ? (D ? 'rgba(255,159,28,0.4)' : 'rgba(255,159,28,0.5)') : 'linear-gradient(135deg,#FF9F1C,#E05C2A)',
                    boxShadow:   placing ? 'none' : '0 6px 24px rgba(255,130,0,0.42)',
                    fontFamily:  '"DM Sans", system-ui, sans-serif',
                    cursor:      placing ? 'not-allowed' : 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                    transition:  'all 0.25s ease',
                  }}
                >
                  {placing ? (
                    <><Loader2 size={17} strokeWidth={2.5} style={{ animation: 'spin 0.7s linear infinite' }} />Placing Order…</>
                  ) : (
                    <>Place Order · ₹{total} <ChevronRight size={16} strokeWidth={2.5} /></>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default CartDrawer