// src/modules/customer/components/menu/FloatingActions.jsx
import { useRef, useEffect } from 'react'
import { useNavigate }       from 'react-router-dom'
import { useSelector }       from 'react-redux'
import gsap                  from 'gsap'
import { ShoppingCart, MapPin, Bell } from 'lucide-react'
import { selectCartCount, selectCartSubtotal } from '@store/slices/cartSlice'
import { selectCallStatus }                    from '@store/slices/callWaiterSlice'
import { selectSession }                       from '@store/slices/tableSessionSlice'

const CALL_LABEL = {
  pending:      'Calling…',
  acknowledged: 'Coming!',
  on_the_way:   'On the way',
}

const FloatingActions = () => {
  const navigate   = useNavigate()
  const cartCount  = useSelector(selectCartCount)
  const subtotal   = useSelector(selectCartSubtotal)
  const callStatus = useSelector(selectCallStatus)
  const session    = useSelector(selectSession)

  const barRef     = useRef(null)
  const cartRef    = useRef(null)
  const prevCount  = useRef(0)

  const hasCart      = cartCount > 0
  const isCallActive = ['pending', 'acknowledged', 'on_the_way'].includes(callStatus)
  const hasOrder     = Boolean(session?.hasActiveOrder)
  const showBar      = hasCart || isCallActive || hasOrder

  // Slide up/down when bar visibility changes
  useEffect(() => {
    if (!barRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    if (showBar) {
      gsap.fromTo(barRef.current,
        { y: 72, opacity: 0, scale: 0.9 },
        { y: 0,  opacity: 1, scale: 1, duration: 0.48, ease: 'back.out(1.8)' }
      )
    } else {
      gsap.to(barRef.current,
        { y: 64, opacity: 0, scale: 0.88, duration: 0.28, ease: 'power2.in' }
      )
    }
  }, [showBar])

  // Cart button bump on count increase
  useEffect(() => {
    if (!cartRef.current || cartCount <= prevCount.current) {
      prevCount.current = cartCount
      return
    }
    prevCount.current = cartCount
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.timeline()
      .to(cartRef.current, { scale: 1.18, duration: 0.14, ease: 'power2.out' })
      .to(cartRef.current, { scale: 1,    duration: 0.35, ease: 'elastic.out(1,0.4)' })
  }, [cartCount])

  if (!showBar) return null

  return (
    <>
      <div
        ref={barRef}
        className="fixed bottom-6 inset-x-4 z-50 flex items-center justify-center gap-2.5"
        style={{ filter: 'drop-shadow(0 8px 28px rgba(0,0,0,0.4))' }}
      >
        {/* ── Cart pill ── */}
        {hasCart && (
          <button
            ref={cartRef}
            onClick={() => navigate('/cart')}
            className="flex items-center gap-2.5 px-5 py-3 rounded-2xl
                       active:scale-95 will-change-transform flex-1 max-w-[260px]
                       justify-between"
            style={{
              background: 'linear-gradient(135deg,#FF9F1C 0%,#E05C2A 100%)',
              boxShadow:  '0 4px 22px rgba(255,159,28,0.55), inset 0 1px 0 rgba(255,255,255,0.22)',
            }}
            aria-label={`View cart — ${cartCount} items`}
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <ShoppingCart size={18} color="#fff" strokeWidth={2.5} />
                <span
                  className="absolute -top-2 -right-2 min-w-[16px] h-4 px-1 rounded-full
                             text-[9px] font-black flex items-center justify-center"
                  style={{ background: '#fff', color: '#E05C2A' }}
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              </div>
              <span className="text-[13px] font-black text-white">View Cart</span>
            </div>
            <span className="text-[13px] font-black text-white/90">
              ₹{subtotal.toLocaleString('en-IN')}
            </span>
          </button>
        )}

        {/* ── Track pill ── */}
        {hasOrder && (
          <button
            onClick={() => navigate('/track')}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl active:scale-95"
            style={{
              background:           'rgba(20,12,4,0.88)',
              backdropFilter:       'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border:               '1px solid rgba(255,159,28,0.22)',
              boxShadow:            '0 4px 18px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
            aria-label="Track order"
          >
            <MapPin size={17} color="#FF9F1C" strokeWidth={2.5} />
            <span className="text-[13px] font-bold text-white">Track</span>
          </button>
        )}

        {/* ── Waiter pill ── */}
        {isCallActive && (
          <button
            onClick={() => navigate('/call-waiter')}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl active:scale-95"
            style={{
              background:           'rgba(20,12,4,0.88)',
              backdropFilter:       'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border:               '1px solid rgba(255,159,28,0.22)',
              boxShadow:            '0 4px 18px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
            aria-label="Waiter status"
          >
            <div className="relative">
              <Bell size={17} color="#FF9F1C" strokeWidth={2.5} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                style={{ background: '#FF9F1C', animation: 'waiter-pulse 1.5s ease-out infinite' }}
              />
            </div>
            <span className="text-[13px] font-bold text-white">
              {CALL_LABEL[callStatus] || 'Waiter'}
            </span>
          </button>
        )}
      </div>

      <style>{`
        @keyframes waiter-pulse {
          0%   { box-shadow: 0 0 0 0   rgba(255,159,28,0.8); }
          70%  { box-shadow: 0 0 0 7px rgba(255,159,28,0);   }
          100% { box-shadow: 0 0 0 0   rgba(255,159,28,0);   }
        }
      `}</style>
    </>
  )
}

export default FloatingActions