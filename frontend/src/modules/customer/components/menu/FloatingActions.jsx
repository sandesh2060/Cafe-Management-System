// src/modules/customer/components/menu/FloatingActions.jsx
// Tailwind CSS
//
// BEHAVIOR:
//  • Cart bar hidden (off-screen) when cart is empty
//  • Slides UP immediately with back.out bounce when FIRST item added
//  • Re-appears immediately if scroll-hidden when new item added
//  • Slides DOWN when cart emptied
//  • Hides on fast downscroll (vel > 3.5), reappears on 40px upscroll or at top
//  • Call Waiter pill floats above cart bar — only shows when call active
//  • CartDrawer opens on tap
//
// KEY FIXES:
//  • useLayoutEffect sets initial y:120,opacity:0 — zero flash on mount
//  • scroll listener on BOTH lenis AND window (ticking guard = 1 RAF/frame)
//  • NaN guard on lenis.scroll for Android Chrome first frames
//  • barHidden ref tracks scroll state separate from cartVisible
//  • Re-shows immediately when item added while bar was scroll-hidden

import { useRef, useEffect, useLayoutEffect, useContext, useState, useCallback } from 'react'
import { useNavigate }      from 'react-router-dom'
import { useSelector }      from 'react-redux'
import { useLenis }         from 'lenis/react'
import gsap                 from 'gsap'
import { ShoppingCart, Bell, ChevronRight, Sparkles } from 'lucide-react'
import { ThemeContext }     from '@shared/context/ThemeContext'
import { selectCartItems, selectCartCount, selectCartTotal } from '@store/slices/cartSlice'
import { selectCallStatus } from '@store/slices/callWaiterSlice'
import { selectSession }    from '@store/slices/tableSessionSlice'
import { lockScroll, unlockScroll } from '@shared/utils/lenisLock'
import CartDrawer           from '../cart/CartDrawer'

const CALL_LABEL = {
  pending:  'Calling Waiter…',
  active:   'Waiter Coming',
  resolved: 'Resolved ✓',
}

export default function FloatingActions() {
  const navigate      = useNavigate()
  const { isDark: D } = useContext(ThemeContext)
  const lenis         = useLenis()

  const cartCount  = useSelector(selectCartCount)
  const cartTotal  = useSelector(selectCartTotal)
  const callStatus = useSelector(selectCallStatus)
  const session    = useSelector(selectSession)

  const [drawerOpen, setDrawerOpen] = useState(false)

  const cartBarRef  = useRef(null)
  const callPillRef = useRef(null)
  const badgeRef    = useRef(null)
  const priceRef    = useRef(null)
  const shineRef    = useRef(null)

  // Internal state refs — no re-renders needed
  const cartVisible = useRef(false)   // true when bar is on-screen
  const barHidden   = useRef(false)   // true when hidden by scroll (not empty cart)
  const prevCount   = useRef(0)
  const prevTotal   = useRef(0)

  // ── Hide cart bar before first paint — zero flash ─────────────────────────
  useLayoutEffect(() => {
    if (cartBarRef.current) {
      gsap.set(cartBarRef.current, { y: 120, opacity: 0 })
    }
  }, [])

  // ── DRAWER ────────────────────────────────────────────────────────────────
  const openCart  = useCallback(() => { lockScroll();   setDrawerOpen(true)  }, [])
  const closeCart = useCallback(() => { setDrawerOpen(false); unlockScroll() }, [])
  useEffect(() => () => { if (drawerOpen) unlockScroll() }, [drawerOpen])

  // ── CART BAR — react to count changes ─────────────────────────────────────
  useEffect(() => {
    const bar = cartBarRef.current
    if (!bar) return

    const wasEmpty = prevCount.current === 0
    prevCount.current = cartCount

    if (cartCount === 0) {
      // Empty — always hide regardless of scroll state
      cartVisible.current = false
      barHidden.current   = false
      gsap.killTweensOf(bar)
      gsap.to(bar, {
        y: 120, opacity: 0, scale: 0.95,
        duration: 0.32, ease: 'power3.in', force3D: true, overwrite: true,
        onComplete: () => { if (bar) gsap.set(bar, { clearProps: 'scale' }) },
      })
      return
    }

    if (wasEmpty || barHidden.current) {
      // First item added OR re-add while scroll-hidden → show immediately
      cartVisible.current = true
      barHidden.current   = false
      gsap.killTweensOf(bar)
      gsap.fromTo(bar,
        { y: 120, opacity: 0, scale: 0.95 },
        {
          y: 0, opacity: 1, scale: 1,
          duration: 0.58, ease: 'back.out(1.7)', force3D: true, clearProps: 'scale',
          onStart: () => {
            // shimmer sweep only on very first add
            if (wasEmpty && shineRef.current) {
              gsap.fromTo(shineRef.current,
                { x: '-110%' },
                { x: '110%', duration: 0.9, ease: 'power2.out', delay: 0.28 }
              )
            }
          },
        }
      )
      return
    }

    // Bar already visible — micro-bounce on count change
    if (cartVisible.current && !barHidden.current) {
      gsap.timeline({ overwrite: true })
        .to(bar, { y: -6, duration: 0.13, ease: 'power2.out',         force3D: true })
        .to(bar, { y: 0,  duration: 0.42, ease: 'elastic.out(1.1,0.5)', force3D: true })
    }
  }, [cartCount])

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

  // ── SHIMMER loop ─────────────────────────────────────────────────────────
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

  // ── CALL WAITER pill ─────────────────────────────────────────────────────
  useEffect(() => {
    const el = callPillRef.current
    if (!el) return
    if (session && callStatus !== 'idle') {
      gsap.killTweensOf(el)
      gsap.fromTo(el,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.42, ease: 'back.out(2.5)', overwrite: true }
      )
      gsap.to(el, {
        scale: 1.05, duration: 0.75,
        yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.5,
      })
    } else {
      gsap.killTweensOf(el)
      gsap.to(el, { scale: 0, opacity: 0, duration: 0.2, ease: 'power2.in', overwrite: true })
    }
  }, [callStatus, session])

  // ── SCROLL hide / show ────────────────────────────────────────────────────
  useEffect(() => {
    const bar = cartBarRef.current
    if (!bar) return

    const s = {
      lastY: window.scrollY,
      vel: 0, upDist: 0,
      ticking: false, rafId: null,
    }

    const HIDE_VEL  = 3.5   // smoothed px/frame — hide on fast downscroll
    const SHOW_DIST = 40    // px of upscroll to re-show
    const TOP       = 80    // always show near top of page
    const DECAY     = 0.68  // velocity smoothing

    const getY = () => {
      const ly = lenis?.scroll
      // NaN guard — lenis.scroll is undefined/NaN on Android Chrome first frames
      return (typeof ly === 'number' && isFinite(ly) && ly >= 0) ? ly : window.scrollY
    }

    const update = () => {
      s.ticking = false
      if (!cartVisible.current) return   // cart empty — irrelevant

      const y   = getY()
      const raw = y - s.lastY
      s.lastY   = y
      if (raw === 0) return

      s.vel    = s.vel * DECAY + raw * (1 - DECAY)
      s.upDist = raw < 0 ? s.upDist + Math.abs(raw) : 0

      const atTop = y < TOP

      // Hide on fast downscroll
      if (!barHidden.current && !atTop && s.vel > HIDE_VEL) {
        barHidden.current = true
        gsap.killTweensOf(bar)
        gsap.to(bar, {
          y: 120, opacity: 0,
          duration: 0.26, ease: 'power3.in', force3D: true, overwrite: true,
        })
      }
      // Show on upscroll or back at top
      else if (barHidden.current && (atTop || (s.vel < -0.5 && s.upDist >= SHOW_DIST))) {
        barHidden.current = false
        s.upDist = 0
        gsap.killTweensOf(bar)
        gsap.fromTo(bar,
          { y: 120, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.42, ease: 'expo.out', force3D: true, overwrite: true }
        )
      }
    }

    const onScroll = () => {
      // ticking guard — 1 RAF per frame even with dual listeners
      if (!s.ticking) {
        s.ticking = true
        s.rafId = requestAnimationFrame(update)
      }
    }

    // Listen on BOTH — lenis fires on iOS/desktop, window fires on Android Chrome
    if (lenis) lenis.on('scroll', onScroll)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      if (lenis) lenis.off('scroll', onScroll)
      window.removeEventListener('scroll', onScroll)
      if (s.rafId) cancelAnimationFrame(s.rafId)
    }
  }, [lenis])

  return (
    <>
      {/* ── CALL WAITER PILL ── */}
      {session && (
        <div
          ref={callPillRef}
          className="fixed left-1/2 z-[9090]"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 90px)',
            transform: 'translateX(-50%) scale(0)',
            opacity: 0,
            pointerEvents: callStatus !== 'idle' ? 'auto' : 'none',
          }}
        >
          <button
            onClick={() => navigate('/call-waiter')}
            aria-label="Call waiter status"
            className="flex items-center gap-2 px-[18px] py-[9px] rounded-full border-none cursor-pointer [-webkit-tap-highlight-color:transparent] touch-manipulation whitespace-nowrap"
            style={{
              background: callStatus === 'active'
                ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                : D ? 'rgba(239,68,68,0.22)' : 'rgba(239,68,68,0.14)',
              boxShadow: callStatus === 'active'
                ? '0 6px 24px rgba(239,68,68,0.5)'
                : '0 4px 16px rgba(0,0,0,0.18)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${callStatus === 'active' ? 'rgba(255,100,100,0.4)' : 'rgba(239,68,68,0.3)'}`,
              color: callStatus === 'active' ? '#fff' : '#ef4444',
            }}
          >
            <Bell size={14} strokeWidth={2.5} color={callStatus === 'active' ? '#fff' : '#ef4444'} />
            <span className="text-xs font-bold tracking-[0.01em]">
              {CALL_LABEL[callStatus] ?? 'Waiter'}
            </span>
          </button>
        </div>
      )}

      {/* ── CART BAR ──
          ref on outer div — GSAP animates y/opacity.
          No inline transform here (useLayoutEffect sets initial state). */}
      <div
        ref={cartBarRef}
        className="fixed bottom-0 left-0 right-0 z-[9100] pointer-events-none"
      >
        <div
          className="px-4 pt-3.5"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)' }}
        >
          <button
            onClick={openCart}
            disabled={cartCount === 0}
            aria-label={`View cart — ${cartCount} items, ₹${cartTotal}`}
            className="pointer-events-auto w-full h-[58px] rounded-[20px] border-none cursor-pointer flex items-center justify-between px-[18px] gap-3 [-webkit-tap-highlight-color:transparent] touch-manipulation relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg,#FF9F1C 0%,#F07A18 45%,#E05C2A 100%)',
              boxShadow: [
                '0 8px 40px rgba(255,130,0,0.52)',
                '0 2px 0 rgba(255,255,255,0.22) inset',
                '0 -1px 0 rgba(0,0,0,0.12) inset',
                '0 0 0 1px rgba(255,159,28,0.6)',
              ].join(', '),
              // No willChange/transform here — parent fixed div is the GSAP target
              // willChange on a child of a fixed element breaks stacking on real mobile
            }}
            onTouchStart={e  => gsap.to(e.currentTarget, { scale: 0.97, duration: 0.1,  ease: 'power2.out',    force3D: true })}
            onTouchEnd={e    => gsap.to(e.currentTarget, { scale: 1,    duration: 0.4,  ease: 'back.out(2.5)', force3D: true })}
            onTouchCancel={e => gsap.to(e.currentTarget, { scale: 1,    duration: 0.3,  ease: 'power3.out',    force3D: true })}
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
              style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.38) 30%,rgba(255,255,255,0.55) 50%,rgba(255,255,255,0.38) 70%,transparent)' }}
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
                  ₹{cartTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
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