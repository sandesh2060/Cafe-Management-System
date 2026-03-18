// src/modules/customer/components/cart/CartDrawer.jsx
//
// ✅ RESPONSIVE:
//   mobile/tablet (<1024px): bottom sheet (current behavior, unchanged)
//   desktop (1024px+):       fixed right side panel (420px wide, full height)
//                            — slides in from right instead of bottom
//                            — no drag handle, no bottom sheet radius
// ✅ All colors from var(--token), FONTS/BRAND from brand.js
// ✅ All Redux, motion, GSAP logic unchanged

import { useContext, useRef, useEffect, useCallback, useState } from "react"
import { createPortal } from "react-dom"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "motion/react"
import gsap from "gsap"
import {
  X, ShoppingCart, Trash2, Plus, Minus,
  ChevronRight, Loader2, AlertCircle, PlusCircle,
} from "lucide-react"
import { ThemeContext }     from "@shared/context/ThemeContext"
import { BRAND, FONTS }     from "@shared/config/brand"
import {
  selectCartItems, selectCartSubtotal, selectCartTotal,
  selectCartDiscount, removeItem, updateQuantity, clearCart,
} from "@store/slices/cartSlice"
import { selectTableId, selectSessionId } from "@store/slices/tableSessionSlice"
import {
  placeOrder, selectOrderPlacing, selectOrderError,
  selectHasActiveOrder, selectActiveOrder, clearError, clearMerged,
} from "@store/slices/orderSlice"
import { selectUser }    from "@store/slices/authSlice"
import { selectLoyalty } from "@store/slices/loyaltySlice"

// ─── CartRow ───────────────────────────────────────────────────────────────────
const CartRow = ({ item, isDark: D, onRemove, onQty }) => {
  const plusRef = useRef(null)
  const minRef  = useRef(null)

  const bump = (ref) => {
    if (!ref.current) return
    gsap.timeline()
      .to(ref.current, { scale: 0.7, duration: 0.08, ease: "power3.in" })
      .to(ref.current, { scale: 1.2, duration: 0.2,  ease: "back.out(3)" })
      .to(ref.current, { scale: 1,   duration: 0.18, ease: "power2.out" })
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3 py-3"
      style={{ borderBottom: "1px solid var(--divider)" }}
    >
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
           style={{ background: "var(--accent-dim)" }}>
        {item.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="m-0 text-[13px] font-bold leading-snug truncate"
           style={{ color: "var(--text-primary)", fontFamily: FONTS.body }}>
          {item.name}
        </p>
        {item.portionLabel && (
          <p className="m-0 text-[10px] mt-0.5 font-semibold"
             style={{ color: "var(--loyalty-sub-text)", fontFamily: FONTS.body }}>
            {item.portionLabel}
          </p>
        )}
        <p className="m-0 text-[12px] font-extrabold mt-1 font-mono"
           style={{ color: "var(--accent)", fontFamily: FONTS.mono }}>
          {BRAND.currency} {item.price * item.quantity}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <button onClick={() => onRemove(item)} aria-label={`Remove ${item.name}`}
          className="w-6 h-6 rounded-lg flex items-center justify-center border-none cursor-pointer"
          style={{ background: "var(--danger-bg)", color: "var(--danger)", WebkitTapHighlightColor: "transparent" }}>
          <Trash2 size={11} strokeWidth={2} />
        </button>
        <div className="flex items-center rounded-xl overflow-hidden" style={{ border: "1.5px solid var(--pill-border)" }}>
          <button ref={minRef} onClick={() => { bump(minRef); onQty(item, item.quantity - 1) }} aria-label="Decrease"
            className="w-7 h-7 flex items-center justify-center border-none bg-transparent cursor-pointer"
            style={{ color: "var(--text-primary)", WebkitTapHighlightColor: "transparent" }}>
            <Minus size={11} strokeWidth={2.5} />
          </button>
          <span className="w-6 text-center text-[12px] font-black"
                style={{ color: "var(--text-primary)", fontFamily: FONTS.mono }}>
            {item.quantity}
          </span>
          <button ref={plusRef} onClick={() => { bump(plusRef); onQty(item, item.quantity + 1) }} aria-label="Increase"
            className="w-7 h-7 flex items-center justify-center border-none bg-transparent cursor-pointer"
            style={{ color: "var(--text-primary)", WebkitTapHighlightColor: "transparent" }}>
            <Plus size={11} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── CartDrawer ────────────────────────────────────────────────────────────────
const CartDrawer = ({ open, onClose }) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isDark: D } = useContext(ThemeContext)

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
  const [note, setNote] = useState("")

  // Detect desktop breakpoint reactively
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia("(min-width: 1024px)").matches)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const handler = (e) => setIsDesktop(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  useEffect(() => {
    window.__sheetOpen = open
    return () => { window.__sheetOpen = false }
  }, [open])

  useEffect(() => {
    if (!open) { dispatch(clearError()); dispatch(clearMerged()); setNote("") }
  }, [open, dispatch])

  const handleRemove = useCallback(
    (item) => dispatch(removeItem({ menuItemId: item.menuItemId, portionId: item.portionId })),
    [dispatch]
  )
  const handleQty = useCallback((item, qty) => {
    if (qty <= 0) dispatch(removeItem({ menuItemId: item.menuItemId, portionId: item.portionId }))
    else dispatch(updateQuantity({ menuItemId: item.menuItemId, portionId: item.portionId, quantity: qty }))
  }, [dispatch])
  const handleClear = useCallback(() => dispatch(clearCart()), [dispatch])
  const handlePlaceOrder = useCallback(async () => {
    if (!items.length || placing) return
    const result = await dispatch(placeOrder({
      items,
      tableId:     tableId   ?? user?.tableId   ?? null,
      sessionId:   sessionId ?? user?.sessionId ?? null,
      cafeId:      user?.cafeId ?? BRAND.cafeId ?? "demo",
      loyaltyTier: loyalty?.tier ?? "none",
      specialNote: note.trim() || null,
    }))
    if (placeOrder.fulfilled.match(result)) { dispatch(clearCart()); onClose(); navigate("/order/status") }
  }, [items, placing, tableId, sessionId, user, loyalty, note, dispatch, onClose, navigate])

  const isAddon = hasActiveOrder && !!activeOrder

  // ── Animation variants change based on desktop/mobile ─────────────────────
  const panelVariants = isDesktop
    ? { initial: { x: "100%", opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: "100%", opacity: 0 } }
    : { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" } }

  const panelTransition = isDesktop
    ? { type: "spring", stiffness: 380, damping: 38, mass: 0.85 }
    : { type: "spring", stiffness: 340, damping: 36, mass: 0.9 }

  // ── Panel positioning ──────────────────────────────────────────────────────
  const panelStyle = isDesktop ? {
    // Desktop: right side panel
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    width: "420px",
    maxWidth: "100vw",
    zIndex: 9081,
    display: "flex",
    flexDirection: "column",
    background: "var(--modal-bg)",
    borderLeft: "1px solid var(--modal-border)",
    borderTop: "none",
    borderRadius: 0,
    boxShadow: "-8px 0 40px rgba(0,0,0,0.3)",
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
  } : {
    // Mobile/tablet: bottom sheet
    background: "var(--modal-bg)",
    borderRadius: "28px 28px 0 0",
    maxHeight: "92dvh",
    boxShadow: "var(--card-shadow)",
    border: "1px solid var(--modal-border)",
    borderBottom: "none",
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }} onClick={onClose}
            className="fixed inset-0 z-[9080] touch-none"
            style={{ background: "var(--overlay-bg)", backdropFilter: "blur(6px)" }}
          />

          {/* Panel */}
          <motion.div
            {...panelVariants}
            transition={panelTransition}
            className={isDesktop
              ? "z-[9081] flex flex-col"
              : "fixed left-0 right-0 bottom-0 z-[9081] flex flex-col"
            }
            style={panelStyle}
          >
            {/* Accent line — mobile only */}
            {!isDesktop && (
              <div aria-hidden className="absolute top-0 left-[12%] right-[12%] h-0.5 rounded-full pointer-events-none"
                   style={{ background: "var(--top-glow)", opacity: D ? 0.6 : 0.45 }} />
            )}

            {/* Drag handle — mobile only */}
            {!isDesktop && (
              <div className="w-9 h-1 rounded-full mx-auto mt-4 mb-1 flex-shrink-0" style={{ background: "var(--divider)" }} />
            )}

            {/* Desktop top padding */}
            {isDesktop && <div className="h-4 flex-shrink-0" />}

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-2 pb-3 flex-shrink-0"
                 style={{ borderBottom: "1px solid var(--card-border)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
                     style={{ background: "var(--accent-gradient)", boxShadow: "0 4px 14px var(--accent-glow)" }}>
                  <ShoppingCart size={16} color="#fff" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="m-0 text-[16px] font-extrabold" style={{ color: "var(--text-primary)", fontFamily: FONTS.heading }}>
                    {isAddon ? "Add to Order" : "Your Cart"}
                  </h2>
                  <p className="m-0 text-[10px]" style={{ color: "var(--text-muted)", fontFamily: FONTS.body }}>
                    {items.length} item{items.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button onClick={handleClear}
                    className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer"
                    style={{ color: "var(--danger)", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", WebkitTapHighlightColor: "transparent" }}>
                    <Trash2 size={11} /> Clear
                  </button>
                )}
                <button onClick={onClose} aria-label="Close cart"
                  className="w-8 h-8 rounded-xl flex items-center justify-center border-none cursor-pointer"
                  style={{ background: "var(--pill-bg)", border: "1px solid var(--card-border)", color: "var(--text-muted)", WebkitTapHighlightColor: "transparent" }}>
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 min-h-0" style={{ scrollbarWidth: "none" }}>
              {items.length === 0 ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-16 gap-3">
                  <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    style={{ fontSize: 48 }}>🛒</motion.span>
                  <p className="m-0 text-[14px] font-semibold" style={{ color: "var(--text-muted)", fontFamily: FONTS.body }}>
                    Your cart is empty
                  </p>
                  <p className="m-0 text-[12px]" style={{ color: "var(--text-disabled)", fontFamily: FONTS.body }}>
                    Add something delicious
                  </p>
                </motion.div>
              ) : (
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <CartRow key={`${item.menuItemId}::${item.portionId ?? "none"}`}
                      item={item} isDark={D} onRemove={handleRemove} onQty={handleQty} />
                  ))}
                </AnimatePresence>
              )}

              {items.length > 0 && (
                <div className="mt-4 mb-2">
                  <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder={isAddon ? "Any note for the new items? (optional)" : "Add a special note (optional)…"}
                    maxLength={200} aria-label="Special note for order"
                    style={{
                      width: "100%", resize: "none", outline: "none", boxSizing: "border-box",
                      fontFamily: FONTS.brand, fontSize: 12, lineHeight: 1.6, borderRadius: 13, padding: "9px 13px",
                      WebkitAppearance: "none",
                      background: "var(--input-bg)", border: "1.5px solid var(--input-border)", color: "var(--text-primary)",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--input-border-focus)"; e.target.style.boxShadow = "var(--input-shadow-focus)" }}
                    onBlur={(e)  => { e.target.style.borderColor = "var(--input-border)"; e.target.style.boxShadow = "none" }}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="flex-shrink-0 px-5 pt-3 pb-5" style={{ borderTop: "1px solid var(--card-border)" }}>
                <div className="mb-3 space-y-1.5">
                  <div className="flex justify-between text-[12px]" style={{ color: "var(--text-muted)", fontFamily: FONTS.body }}>
                    <span>Subtotal</span>
                    <span style={{ fontFamily: FONTS.mono, fontWeight: 700 }}>{BRAND.currency} {subtotal}</span>
                  </div>
                  {discount > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      className="flex justify-between text-[12px]">
                      <span style={{ color: "var(--success)", fontFamily: FONTS.body }}>
                        {loyalty?.tier && loyalty.tier !== "none"
                          ? `${loyalty.tier.charAt(0).toUpperCase() + loyalty.tier.slice(1)} Discount (${loyalty.discountPct}%)`
                          : "Discount"}
                      </span>
                      <span style={{ color: "var(--success)", fontFamily: FONTS.mono, fontWeight: 700 }}>
                        −{BRAND.currency} {discount}
                      </span>
                    </motion.div>
                  )}
                  <div className="flex justify-between text-[15px] font-extrabold pt-1"
                       style={{ borderTop: "1px solid var(--card-border)", paddingTop: 8, color: "var(--text-primary)" }}>
                    <span style={{ fontFamily: FONTS.body }}>Total</span>
                    <span style={{ color: "var(--accent)", fontFamily: FONTS.mono }}>{BRAND.currency} {total}</span>
                  </div>
                </div>

                <AnimatePresence>
                  {isAddon && !orderError && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }} className="mb-3 overflow-hidden">
                      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                           style={{ background: "var(--loyalty-bg)", border: "1px solid var(--loyalty-border)" }}>
                        <PlusCircle size={13} style={{ color: "var(--accent)" }} strokeWidth={2} className="mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="m-0 text-[12px] font-bold" style={{ color: "var(--loyalty-text)", fontFamily: FONTS.body }}>
                            Adding to your current order
                          </p>
                          <p className="m-0 text-[11px] mt-0.5" style={{ color: "var(--text-muted)", fontFamily: FONTS.body }}>
                            You already have {activeOrder?.items?.length ?? "?"} item{(activeOrder?.items?.length ?? 1) !== 1 ? "s" : ""} in your order ({activeOrder?.status}). These will be added on.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {orderError && (
                    <motion.div initial={{ opacity: 0, y: -6, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -6, height: 0 }} className="mb-3 overflow-hidden">
                      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                           style={{ background: "var(--danger-bg)", border: "1px solid var(--danger-border)" }}>
                        <AlertCircle size={13} style={{ color: "var(--danger)" }} strokeWidth={2} className="mt-0.5 flex-shrink-0" />
                        <p className="m-0 text-[12px] font-semibold flex-1" style={{ color: "var(--danger)", fontFamily: FONTS.body }}>{orderError}</p>
                        <button onClick={() => dispatch(clearError())}
                          className="border-none bg-transparent cursor-pointer p-0 flex-shrink-0"
                          style={{ color: "var(--danger)" }}>
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={handlePlaceOrder}
                  disabled={placing || !items.length}
                  className="w-full h-14 rounded-[18px] border-none cursor-pointer text-[15px] font-extrabold tracking-tight flex items-center justify-center gap-2"
                  style={{
                    background: placing ? "var(--btn-disabled)" : "var(--accent-gradient)",
                    boxShadow: placing ? "none" : "0 6px 24px var(--accent-glow)",
                    fontFamily: FONTS.brand,
                    cursor: placing ? "not-allowed" : "pointer",
                    color: placing ? "var(--btn-disabled-text)" : "var(--text-inverse)",
                    WebkitTapHighlightColor: "transparent",
                    transition: "all 0.25s ease",
                  }}
                >
                  {placing ? (
                    <><Loader2 size={17} strokeWidth={2.5} style={{ animation: "cd-spin 0.7s linear infinite" }} />{isAddon ? "Adding to Order…" : "Placing Order…"}</>
                  ) : isAddon ? (
                    <><PlusCircle size={16} strokeWidth={2.5} />Add to Order · {BRAND.currency} {total}</>
                  ) : (
                    <>Place Order · {BRAND.currency} {total}<ChevronRight size={16} strokeWidth={2.5} /></>
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

if (typeof document !== "undefined" && !document.getElementById("cd-styles")) {
  const s = document.createElement("style")
  s.id = "cd-styles"
  s.textContent = "@keyframes cd-spin { to { transform: rotate(360deg); } }"
  document.head.appendChild(s)
}