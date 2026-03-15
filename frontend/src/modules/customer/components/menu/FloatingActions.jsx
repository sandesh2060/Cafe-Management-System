// frontend/src/modules/customer/components/menu/FloatingActions.jsx
//
// THE IN-PAGE NAVIGATION HUB — replaces BottomNav entirely.
//
// TWO FLOATING LAYERS:
//
//   ORDER PILL (above cart bar, z-9095):
//     • Active order  (pending/preparing/on_the_way)
//                     → pulsing live dot + status label
//                     → taps to /order/status
//     • Past order    (delivered/paid/cancelled)
//                     → solid dot + status label
//                     → taps to /order/history
//     • No active order but has history
//                     → History icon + "Past Orders"
//                     → taps to /order/history
//     • No orders at all → pill hidden
//
//   CART BAR (bottom, z-9100):
//     • Unchanged behaviour — slides up/down, scroll-aware
//     • Both pill and cart bar hide/show together on scroll
//
// ROUTING:
//   All navigation uses getOrderRoute() from orderNavigate.js
//   so the correct page always opens based on order status.

import {
  useRef,
  useEffect,
  useLayoutEffect,
  useContext,
  useState,
  useCallback,
} from 'react'
import { useNavigate }      from 'react-router-dom'
import { useSelector }      from 'react-redux'
import { useLenis }         from 'lenis/react'
import gsap                 from 'gsap'
import { ShoppingCart, ChevronRight, Sparkles, History } from 'lucide-react'
import { ThemeContext }     from '@shared/context/ThemeContext'
import {
  selectCartCount,
  selectCartTotal,
}                           from '@store/slices/cartSlice'
import {
  selectActiveOrder,
  selectOrderHistory,
  selectHasActiveOrder,
}                           from '@store/slices/orderSlice'
import { lockScroll, unlockScroll } from '@shared/utils/lenisLock'
import { getOrderRoute }    from '@shared/utils/orderNavigate'
import CartDrawer           from '../cart/CartDrawer'

// ── Status display config ─────────────────────────────────────────────────────
const STATUS_META = {
  pending:    { label: 'Order Placed',    emoji: '🕐', color: '#F59E0B', glow: 'rgba(245,158,11,0.5)',  pulse: true  },
  preparing:  { label: 'Kitchen Cooking', emoji: '👨‍🍳', color: '#3B82F6', glow: 'rgba(59,130,246,0.5)', pulse: true  },
  on_the_way: { label: 'Waiter Coming',   emoji: '🏃', color: '#F97316', glow: 'rgba(249,115,22,0.5)', pulse: true  },
  delivered:  { label: 'Food Delivered',  emoji: '✅', color: '#10B981', glow: 'rgba(16,185,129,0.5)', pulse: false },
  paid:       { label: 'Order Complete',  emoji: '💚', color: '#10B981', glow: 'rgba(16,185,129,0.5)', pulse: false },
  cancelled:  { label: 'Order Cancelled', emoji: '❌', color: '#EF4444', glow: 'rgba(239,68,68,0.4)',  pulse: false },
}

const ACTIVE_STATUSES = ['pending', 'preparing', 'on_the_way']

export default function FloatingActions() {
  const navigate      = useNavigate()
  const { isDark: D } = useContext(ThemeContext)
  const lenis         = useLenis()

  const cartCount    = useSelector(selectCartCount)
  const cartTotal    = useSelector(selectCartTotal)
  const activeOrder  = useSelector(selectActiveOrder)
  const orderHistory = useSelector(selectOrderHistory)

  const [drawerOpen, setDrawerOpen] = useState(false)

  // DOM refs
  const cartBarRef   = useRef(null)
  const orderPillRef = useRef(null)
  const badgeRef     = useRef(null)
  const priceRef     = useRef(null)
  const shineRef     = useRef(null)
  const pillShineRef = useRef(null)
  const pillRingRef  = useRef(null)
  const pillLabelRef = useRef(null)

  // Internal state refs — avoid re-renders
  const cartVisible  = useRef(false)
  const barHidden    = useRef(false)
  const pillVisible  = useRef(false)
  const prevCount    = useRef(0)
  const prevTotal    = useRef(0)
  const prevStatus   = useRef(null)
  const ringAnimRef  = useRef(null)

  // Derived values
  const orderStatus = activeOrder?.status ?? null
  const meta        = orderStatus ? (STATUS_META[orderStatus] ?? null) : null
  const isActive    = orderStatus ? ACTIVE_STATUSES.includes(orderStatus) : false
  const hasPast     = orderHistory.length > 0
  const showPill    = !!orderStatus || hasPast

  // ── Zero-flash init ───────────────────────────────────────────────────────
  useLayoutEffect(() => {
    if (cartBarRef.current)   gsap.set(cartBarRef.current,   { y: 120, opacity: 0 })
    if (orderPillRef.current) gsap.set(orderPillRef.current, { y: 20, opacity: 0, scale: 0.88 })
  }, [])

  // ── DRAWER ────────────────────────────────────────────────────────────────
  const openCart  = useCallback(() => { lockScroll();  setDrawerOpen(true)  }, [])
  const closeCart = useCallback(() => { setDrawerOpen(false); unlockScroll() }, [])
  useEffect(() => () => { if (drawerOpen) unlockScroll() }, [drawerOpen])

  // ── Hide cart while drawer is open, restore on close ─────────────────────
  useEffect(() => {
    const bar = cartBarRef.current
    if (!bar) return
    if (drawerOpen) {
      gsap.to(bar, { y: 120, opacity: 0, duration: 0.22, ease: 'power3.in', force3D: true, overwrite: true })
    } else if (cartVisible.current && !barHidden.current) {
      gsap.fromTo(bar,
        { y: 120, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.42, ease: 'back.out(1.7)', force3D: true, overwrite: true }
      )
    }
  }, [drawerOpen])

  // ── CART BAR — react to count changes ────────────────────────────────────
  useEffect(() => {
    const bar = cartBarRef.current
    if (!bar) return
    const wasEmpty = prevCount.current === 0
    prevCount.current = cartCount

    if (cartCount === 0) {
      cartVisible.current = false
      barHidden.current   = false
      gsap.to(bar, {
        y: 120, opacity: 0, scale: 0.95, duration: 0.32,
        ease: 'power3.in', force3D: true, overwrite: true,
        onComplete: () => bar && gsap.set(bar, { clearProps: 'scale' }),
      })
      return
    }

    if (drawerOpen) { cartVisible.current = true; return }

    if (wasEmpty || barHidden.current) {
      cartVisible.current = true
      barHidden.current   = false
      gsap.fromTo(bar,
        { y: 120, opacity: 0, scale: 0.95 },
        {
          y: 0, opacity: 1, scale: 1, duration: 0.58,
          ease: 'back.out(1.7)', force3D: true, clearProps: 'scale',
          onStart: () => {
            if (wasEmpty && shineRef.current)
              gsap.fromTo(shineRef.current,
                { x: '-110%' },
                { x: '110%', duration: 0.9, ease: 'power2.out', delay: 0.28 }
              )
          },
        }
      )
      return
    }

    if (cartVisible.current && !barHidden.current) {
      gsap.timeline({ overwrite: true })
        .to(bar, { y: -6, duration: 0.13, ease: 'power2.out', force3D: true })
        .to(bar, { y:  0, duration: 0.42, ease: 'elastic.out(1.1,0.5)', force3D: true })
    }
  }, [cartCount, drawerOpen])

  // ── ORDER PILL — show/hide + status transitions ───────────────────────────
  useEffect(() => {
    const pill = orderPillRef.current
    if (!pill) return

    if (showPill && !pillVisible.current) {
      pillVisible.current = true
      gsap.killTweensOf(pill)
      gsap.fromTo(pill,
        { y: 20, opacity: 0, scale: 0.88 },
        { y: 0, opacity: 1, scale: 1, duration: 0.55, ease: 'back.out(2)', force3D: true, overwrite: true }
      )
      if (pillShineRef.current)
        gsap.fromTo(pillShineRef.current,
          { x: '-110%' },
          { x: '110%', duration: 0.85, ease: 'power2.out', delay: 0.35 }
        )
    } else if (!showPill && pillVisible.current) {
      pillVisible.current = false
      gsap.to(pill, { y: 16, opacity: 0, scale: 0.9, duration: 0.25, ease: 'power3.in', force3D: true, overwrite: true })
    }

    // Label swap animation on status change
    if (orderStatus !== prevStatus.current && pillVisible.current && pillLabelRef.current) {
      prevStatus.current = orderStatus
      gsap.fromTo(pillLabelRef.current,
        { opacity: 0, x: 8 },
        { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }
      )
    }
  }, [showPill, orderStatus])

  // ── LIVE DOT pulse ────────────────────────────────────────────────────────
  useEffect(() => {
    const ring = pillRingRef.current
    if (!ring) return
    ringAnimRef.current?.kill()

    if (isActive && meta) {
      ringAnimRef.current = gsap.to(ring, {
        scale: 2.4, opacity: 0, duration: 1.1,
        repeat: -1, ease: 'power2.out',
        transformOrigin: 'center',
      })
    } else {
      gsap.set(ring, { scale: 1, opacity: 0 })
    }
  }, [isActive, meta])

  // ── BADGE pop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!badgeRef.current || cartCount === 0) return
    gsap.fromTo(badgeRef.current,
      { scale: 0.4, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.38, ease: 'back.out(3)', overwrite: true }
    )
  }, [cartCount])

  // ── PRICE flip ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!priceRef.current || cartTotal === 0 || prevTotal.current === cartTotal) return
    prevTotal.current = cartTotal
    gsap.fromTo(priceRef.current,
      { y: 8, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.28, ease: 'expo.out', overwrite: true }
    )
  }, [cartTotal])

  // ── SHIMMER loop on cart ──────────────────────────────────────────────────
  useEffect(() => {
    const shine = shineRef.current
    if (!shine) return
    let killed = false
    const loop = () => {
      if (killed || !shineRef.current || !cartVisible.current) return
      gsap.fromTo(shine,
        { x: '-110%' },
        { x: '110%', duration: 2.6, ease: 'none', delay: 5, onComplete: loop }
      )
    }
    const t = setTimeout(loop, 3000)
    return () => { killed = true; clearTimeout(t); gsap.killTweensOf(shine) }
  }, [])

  // ── SCROLL hide / show — pill + cart move together ────────────────────────
  useEffect(() => {
    const bar  = cartBarRef.current
    const pill = orderPillRef.current
    if (!bar) return

    const s = { lastY: window.scrollY, vel: 0, upDist: 0, ticking: false, rafId: null }
    const HIDE_VEL = 3.5, SHOW_DIST = 40, TOP = 80, DECAY = 0.68

    const getY = () => {
      const ly = lenis?.scroll
      return typeof ly === 'number' && isFinite(ly) && ly >= 0 ? ly : window.scrollY
    }

    const update = () => {
      s.ticking = false
      if (!cartVisible.current || drawerOpen) return

      const y   = getY()
      const raw = y - s.lastY
      s.lastY = y
      if (raw === 0) return

      s.vel    = s.vel * DECAY + raw * (1 - DECAY)
      s.upDist = raw < 0 ? s.upDist + Math.abs(raw) : 0
      const atTop = y < TOP

      if (!barHidden.current && !atTop && s.vel > HIDE_VEL) {
        barHidden.current = true
        gsap.to(bar,  { y: 120, opacity: 0, duration: 0.26, ease: 'power3.in', force3D: true, overwrite: true })
        if (pill && pillVisible.current)
          gsap.to(pill, { y: 20, opacity: 0, duration: 0.22, ease: 'power3.in', force3D: true, overwrite: true })
      } else if (barHidden.current && (atTop || (s.vel < -0.5 && s.upDist >= SHOW_DIST))) {
        barHidden.current = false
        s.upDist = 0
        gsap.fromTo(bar,
          { y: 120, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.42, ease: 'expo.out', force3D: true, overwrite: true }
        )
        if (pill && pillVisible.current)
          gsap.fromTo(pill,
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.38, ease: 'back.out(1.8)', force3D: true, overwrite: true }
          )
      }
    }

    const onScroll = () => { if (!s.ticking) { s.ticking = true; s.rafId = requestAnimationFrame(update) } }
    if (lenis) lenis.on('scroll', onScroll)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      if (lenis) lenis.off('scroll', onScroll)
      window.removeEventListener('scroll', onScroll)
      if (s.rafId) cancelAnimationFrame(s.rafId)
    }
  }, [lenis, drawerOpen])

  // ── ORDER PILL TAP ────────────────────────────────────────────────────────
  const handleOrderPillTap = useCallback(() => {
    const pill = orderPillRef.current
    if (pill) {
      gsap.timeline()
        .to(pill, { scale: 0.94, duration: 0.1, ease: 'power2.in' })
        .to(pill, { scale: 1, duration: 0.4, ease: 'back.out(2.5)' })
    }
    setTimeout(() => navigate(getOrderRoute(orderStatus)), 80)
  }, [navigate, orderStatus])

  // ── Bottom offset — pill floats above cart bar ────────────────────────────
  const safeBottom = 'env(safe-area-inset-bottom, 0px)'
  const CART_BAR_H = 82
  const pillBottom = cartCount > 0
    ? `calc(${safeBottom} + ${CART_BAR_H}px + 10px)`
    : `calc(${safeBottom} + 20px)`

  return (
    <>
      {/* ══ ORDER NAVIGATION PILL ══ */}
      {showPill && (
        <div
          ref={orderPillRef}
          className="fixed left-1/2 z-[9095]"
          style={{
            bottom: pillBottom,
            transform: 'translateX(-50%) translateY(20px)',
            opacity: 0,
            transition: 'bottom 0.38s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          <button
            onClick={handleOrderPillTap}
            aria-label={orderStatus ? `Order status: ${meta?.label}` : 'View order history'}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '10px 16px 10px 12px',
              borderRadius: 999,
              border: `1px solid ${meta ? meta.color + '40' : D ? 'rgba(255,255,255,0.12)' : 'rgba(210,185,145,0.5)'}`,
              background: meta
                ? D
                  ? `linear-gradient(135deg, ${meta.color}18, ${meta.color}0e)`
                  : `linear-gradient(135deg, ${meta.color}14, ${meta.color}08)`
                : D ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.88)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: meta
                ? `0 4px 24px ${meta.glow}, 0 1px 0 rgba(255,255,255,0.12) inset, 0 0 0 1px ${meta.color}20`
                : D
                  ? '0 4px 20px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.07) inset'
                  : '0 4px 20px rgba(130,80,20,0.12), 0 1px 0 rgba(255,255,255,0.9) inset',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              position: 'relative', overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
            onTouchStart={(e) => gsap.to(e.currentTarget, { scale: 0.95, duration: 0.1, ease: 'power2.out' })}
            onTouchEnd={(e)   => gsap.to(e.currentTarget, { scale: 1, duration: 0.38, ease: 'back.out(2.5)' })}
            onTouchCancel={(e)=> gsap.to(e.currentTarget, { scale: 1, duration: 0.28, ease: 'power3.out' })}
          >
            {/* Shine sweep */}
            <div
              ref={pillShineRef}
              aria-hidden
              style={{
                position: 'absolute', top: 0, bottom: 0, left: 0, width: '45%',
                background: 'linear-gradient(105deg,transparent 0%,rgba(255,255,255,0.06) 35%,rgba(255,255,255,0.16) 50%,rgba(255,255,255,0.06) 65%,transparent 100%)',
                transform: 'translateX(-110%)', pointerEvents: 'none',
              }}
            />

            {/* Live dot with pulse ring */}
            <div style={{ position: 'relative', width: 10, height: 10, flexShrink: 0 }}>
              {/* Pulse ring — only animates when isActive */}
              <div
                ref={pillRingRef}
                style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: meta ? meta.color : 'transparent',
                  transformOrigin: 'center', opacity: 0,
                }}
              />
              {/* Solid inner dot */}
              <div style={{
                position: 'absolute',
                inset: isActive ? 2 : 0,
                borderRadius: '50%',
                background: meta
                  ? meta.color
                  : D ? 'rgba(255,184,77,0.5)' : 'rgba(200,104,10,0.5)',
                transition: 'inset 0.3s ease',
              }} />
            </div>

            {/* Emoji (when active order) */}
            {meta && (
              <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>
                {meta.emoji}
              </span>
            )}

            {/* History icon (no active order) */}
            {!meta && hasPast && (
              <History
                size={13} strokeWidth={2.2}
                color={D ? 'rgba(255,184,77,0.6)' : 'rgba(140,80,20,0.6)'}
              />
            )}

            {/* Label */}
            <span
              ref={pillLabelRef}
              style={{
                fontSize: 12, fontWeight: 800,
                fontFamily: '"Baloo 2", system-ui, sans-serif',
                letterSpacing: '-0.01em',
                color: meta
                  ? meta.color
                  : D ? '#FFB84D' : '#C8680A',
              }}
            >
              {meta ? meta.label : 'Past Orders'}
            </span>

            {/* Chevron */}
            <ChevronRight
              size={13} strokeWidth={2.5}
              color={meta
                ? meta.color + 'CC'
                : D ? 'rgba(255,184,77,0.5)' : 'rgba(140,80,20,0.45)'}
            />
          </button>
        </div>
      )}

      {/* ══ CART BAR ══ */}
      <div
        ref={cartBarRef}
        data-tour="fab"
        className="fixed bottom-0 left-0 right-0 z-[9100] pointer-events-none"
      >
        <div
          className="px-4 pt-3.5"
          style={{ paddingBottom: `calc(${safeBottom} + 14px)` }}
        >
          <button
            onClick={openCart}
            disabled={cartCount === 0}
            aria-label={`View cart — ${cartCount} items, Rs ${cartTotal}`}
            className="pointer-events-auto w-full h-[58px] rounded-[20px] border-none cursor-pointer flex items-center justify-between px-[18px] gap-3 [-webkit-tap-highlight-color:transparent] touch-manipulation relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg,#FF9F1C 0%,#F07A18 45%,#E05C2A 100%)',
              boxShadow: [
                '0 8px 40px rgba(255,130,0,0.52)',
                '0 2px 0 rgba(255,255,255,0.22) inset',
                '0 -1px 0 rgba(0,0,0,0.12) inset',
                '0 0 0 1px rgba(255,159,28,0.6)',
              ].join(', '),
            }}
            onTouchStart={(e) => gsap.to(e.currentTarget, { scale: 0.97, duration: 0.1,  ease: 'power2.out',    force3D: true })}
            onTouchEnd={(e)   => gsap.to(e.currentTarget, { scale: 1,    duration: 0.4,  ease: 'back.out(2.5)', force3D: true })}
            onTouchCancel={(e)=> gsap.to(e.currentTarget, { scale: 1,    duration: 0.3,  ease: 'power3.out',    force3D: true })}
          >
            {/* Shimmer sweep */}
            <div
              ref={shineRef}
              aria-hidden
              className="absolute top-0 bottom-0 left-0 w-[42%] pointer-events-none"
              style={{
                background: 'linear-gradient(105deg,transparent 0%,rgba(255,255,255,0.07) 35%,rgba(255,255,255,0.20) 50%,rgba(255,255,255,0.07) 65%,transparent 100%)',
                transform: 'translateX(-110%)',
              }}
            />
            {/* Top shine line */}
            <div
              aria-hidden
              className="absolute top-0 left-[10%] right-[10%] h-px pointer-events-none"
              style={{
                background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.38) 30%,rgba(255,255,255,0.55) 50%,rgba(255,255,255,0.38) 70%,transparent)',
              }}
            />

            {/* Left: icon + count */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="relative">
                <div
                  className="w-10 h-10 rounded-[13px] flex items-center justify-center"
                  style={{
                    background: 'rgba(255,255,255,0.18)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                  }}
                >
                  <ShoppingCart size={19} strokeWidth={2.5} color="#fff" />
                </div>
                {cartCount > 0 && (
                  <span
                    ref={badgeRef}
                    className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 rounded-full bg-white text-[#D94F1E] text-[10px] font-black flex items-center justify-center px-1 font-mono leading-none"
                    style={{
                      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                      border: '1.5px solid rgba(255,159,28,0.3)',
                    }}
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-[1px]">
                <span className="text-[11px] font-bold text-white/75 tracking-[0.04em] uppercase leading-none">
                  {cartCount} item{cartCount !== 1 ? 's' : ''}
                </span>
                <span className="text-[9px] font-semibold text-white/50 tracking-[0.02em] leading-none">
                  Tap to review
                </span>
              </div>
            </div>

            {/* Centre: View Cart */}
            <div className="flex-1 flex items-center justify-center gap-1.5">
              <Sparkles size={12} strokeWidth={2} color="rgba(255,255,255,0.7)" />
              <span className="text-[15px] font-extrabold tracking-[-0.02em] text-white whitespace-nowrap">
                View Cart
              </span>
            </div>

            {/* Right: price + chevron */}
            <div className="flex items-center gap-1 flex-shrink-0 overflow-hidden">
              <div className="overflow-hidden" style={{ maxHeight: 28 }}>
                <span
                  ref={priceRef}
                  className="block text-[18px] font-black tracking-[-0.04em] text-white leading-none font-mono"
                  style={{ lineHeight: '28px' }}
                >
                  Rs {cartTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <ChevronRight size={18} strokeWidth={2.5} color="rgba(255,255,255,0.7)" />
            </div>
          </button>
        </div>
      </div>

      <CartDrawer open={drawerOpen} onClose={closeCart} />
    </>
  )
}