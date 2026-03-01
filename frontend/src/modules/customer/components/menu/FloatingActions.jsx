// src/modules/customer/components/menu/FloatingActions.jsx
import { useRef, useEffect, useContext }  from 'react'
import { useNavigate }                    from 'react-router-dom'
import { useSelector }                    from 'react-redux'
import gsap                               from 'gsap'
import { ShoppingCart, MapPin, Bell }     from 'lucide-react'
import { ThemeContext }                   from '@shared/context/ThemeContext'
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
  const { isDark: D } = useContext(ThemeContext)
  const cartCount  = useSelector(selectCartCount)
  const subtotal   = useSelector(selectCartSubtotal)
  const callStatus = useSelector(selectCallStatus)
  const session    = useSelector(selectSession)

  const barRef    = useRef(null)
  const cartRef   = useRef(null)
  const prevCount = useRef(0)

  const hasCart      = cartCount > 0
  const isCallActive = ['pending', 'acknowledged', 'on_the_way'].includes(callStatus)
  const hasOrder     = Boolean(session?.hasActiveOrder)
  const showBar      = hasCart || isCallActive || hasOrder

  /* ── Slide up/down on visibility change ─────────────────────────────── */
  useEffect(() => {
    if (!barRef.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    if (showBar) {
      gsap.fromTo(barRef.current,
        { y: 80, opacity: 0, scale: 0.88 },
        {
          y: 0, opacity: 1, scale: 1,
          duration: 0.5, ease: 'back.out(1.7)',
          force3D: true,
        }
      )
    } else {
      gsap.to(barRef.current, {
        y: 72, opacity: 0, scale: 0.86,
        duration: 0.28, ease: 'power2.in',
        force3D: true,
      })
    }
  }, [showBar])

  /* ── Cart bump on count increase ────────────────────────────────────── */
  useEffect(() => {
    if (!cartRef.current || cartCount <= prevCount.current) {
      prevCount.current = cartCount
      return
    }
    prevCount.current = cartCount
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    gsap.timeline()
      .to(cartRef.current, { scale: 1.16, duration: 0.13, ease: 'power2.out', force3D: true })
      .to(cartRef.current, { scale: 1,    duration: 0.38, ease: 'elastic.out(1.1, 0.4)', force3D: true })
  }, [cartCount])

  if (!showBar) return null

  /* ── Shared secondary pill styles ── */
  const secondaryStyle = {
    display:              'flex',
    alignItems:           'center',
    gap:                  8,
    padding:              '0 16px',
    height:               48,
    borderRadius:         15,
    border:               `1px solid ${D ? 'rgba(255,159,28,0.18)' : 'rgba(237,217,184,0.8)'}`,
    background:           D
      ? 'rgba(18,12,4,0.9)'
      : 'rgba(253,249,242,0.92)',
    backdropFilter:       'blur(20px) saturate(160%)',
    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
    boxShadow:            D
      ? '0 6px 24px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.05) inset'
      : '0 4px 20px rgba(92,51,23,0.14), 0 1px 0 rgba(255,255,255,0.8) inset',
    cursor:               'pointer',
    WebkitTapHighlightColor: 'transparent',
    transition:           'transform 0.18s var(--ease-spring)',
  }

  return (
    <>
      <div
        ref={barRef}
        style={{
          position:   'fixed',
          bottom:     `calc(20px + env(safe-area-inset-bottom, 0px))`,
          left:       '50%',
          transform:  'translateX(-50%)',
          zIndex:     50,
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap:        8,
          width:      'calc(100% - 32px)',
          maxWidth:   416,
          filter:     `drop-shadow(0 10px 32px rgba(0,0,0,${D ? '0.5' : '0.16'}))`,
        }}
        role="region"
        aria-label="Cart and order actions"
      >

        {/* ── Cart pill ── */}
        {hasCart && (
          <button
            ref={cartRef}
            onClick={() => navigate('/cart')}
            aria-label={`View cart — ${cartCount} item${cartCount !== 1 ? 's' : ''}, ₹${subtotal}`}
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              gap:            10,
              padding:        '0 18px',
              height:         52,
              borderRadius:   16,
              border:         'none',
              cursor:         'pointer',
              flex:           1,
              background:     'linear-gradient(135deg, #FF9F1C 0%, #E05C2A 100%)',
              boxShadow:      '0 6px 28px rgba(255,130,0,0.5), 0 1px 0 rgba(255,255,255,0.2) inset',
              WebkitTapHighlightColor: 'transparent',
              transition:     'transform 0.18s var(--ease-spring), box-shadow 0.18s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 10px 36px rgba(255,130,0,0.55), 0 1px 0 rgba(255,255,255,0.25) inset' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 6px 28px rgba(255,130,0,0.5), 0 1px 0 rgba(255,255,255,0.2) inset' }}
          >
            {/* Left: icon + label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <ShoppingCart size={18} color="#fff" strokeWidth={2.5} aria-hidden="true" />
                {/* Count bubble */}
                <span
                  aria-hidden="true"
                  style={{
                    position:   'absolute',
                    top: -7, right: -8,
                    minWidth:   16, height: 16,
                    padding:    '0 3px',
                    borderRadius: 99,
                    background: '#fff',
                    color:      '#E05C2A',
                    fontSize:   9,
                    fontWeight: 900,
                    fontFamily: '"DM Mono", monospace',
                    display:    'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              </div>
              <span style={{
                fontFamily: '"DM Sans", sans-serif',
                fontSize:   14,
                fontWeight: 800,
                color:      '#fff',
                letterSpacing: '-0.01em',
              }}>
                View Cart
              </span>
            </div>

            {/* Right: subtotal */}
            <span style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize:   15,
              fontWeight: 800,
              color:      'rgba(255,255,255,0.92)',
              letterSpacing: '-0.02em',
            }}>
              ₹{subtotal.toLocaleString('en-IN')}
            </span>
          </button>
        )}

        {/* ── Track order pill ── */}
        {hasOrder && (
          <button
            onClick={() => navigate('/track')}
            style={secondaryStyle}
            aria-label="Track your order"
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = ''}
          >
            <MapPin
              size={17}
              strokeWidth={2.5}
              aria-hidden="true"
              style={{ color: 'var(--color-saffron)', flexShrink: 0 }}
            />
            <span style={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: 13, fontWeight: 700,
              color: 'var(--text-primary)',
              transition: 'color var(--transition-theme)',
            }}>
              Track
            </span>
          </button>
        )}

        {/* ── Waiter status pill ── */}
        {isCallActive && (
          <button
            onClick={() => navigate('/call-waiter')}
            style={secondaryStyle}
            aria-label={`Waiter status: ${CALL_LABEL[callStatus] || 'Waiter'}`}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = ''}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Bell
                size={17}
                strokeWidth={2.5}
                aria-hidden="true"
                style={{ color: 'var(--color-saffron)' }}
              />
              {/* Pulse dot */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute', top: -1, right: -1,
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--color-saffron)',
                  animation: 'waiter-glow 1.6s ease-out infinite',
                }}
              />
            </div>
            <span style={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: 13, fontWeight: 700,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              transition: 'color var(--transition-theme)',
            }}>
              {CALL_LABEL[callStatus] || 'Waiter'}
            </span>
          </button>
        )}
      </div>
    </>
  )
}

export default FloatingActions