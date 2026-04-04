// src/modules/customer/components/menu/RecommendedCard.jsx
//
// ─── PERF CHANGES (visuals identical) ────────────────────────────────────────
// 1. gsapEnabled from useDeviceTier() gates:
//    - Entrance fromTo animation (skipped on low — card appears instantly)
//    - Add-to-cart bounce (skipped on low — item still adds correctly)
//    - Touch scale feedback (skipped on low — tap still fires)
// 2. contain:'layout style paint' on card root — isolates from scroll layer
// 3. All visual styles, tag badges, portions, ratings — UNCHANGED
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useContext, useRef, useCallback, useEffect } from 'react'
import { useDispatch }   from 'react-redux'
import { useNavigate }   from 'react-router-dom'
import gsap              from 'gsap'
import { Star, Sparkles } from 'lucide-react'
import { ThemeContext }  from '@shared/context/ThemeContext'
import { BRAND, FONTS }  from '@shared/config/brand'
import { addItem }       from '@store/slices/cartSlice'
import { lockScroll, unlockScroll } from '@shared/utils/lenisLock'
import { useDeviceTier } from '@shared/hooks/useDeviceTier'
import {
  useCartQty, useCardStyle, PriceDisplay, CartButton, CartControls, PortionSheet,
} from './menuCard.shared'

const TAG_META = {
  sunny:  { bg:'rgba(251,191,36,0.15)',  color:'#D97706', border:'rgba(251,191,36,0.28)',  icon:'☀️'  },
  hot:    { bg:'rgba(239,68,68,0.12)',   color:'#DC2626', border:'rgba(239,68,68,0.22)',   icon:'🌡️' },
  rainy:  { bg:'rgba(59,130,246,0.12)',  color:'#2563EB', border:'rgba(59,130,246,0.22)',  icon:'🌧️' },
  cold:   { bg:'rgba(147,197,253,0.15)', color:'#1D4ED8', border:'rgba(147,197,253,0.28)', icon:'❄️'  },
  cloudy: { bg:'rgba(156,163,175,0.15)', color:'#4B5563', border:'rgba(156,163,175,0.28)', icon:'☁️'  },
  windy:  { bg:'rgba(167,243,208,0.15)', color:'#059669', border:'rgba(167,243,208,0.28)', icon:'💨'  },
  snowy:  { bg:'rgba(186,230,253,0.15)', color:'#0284C7', border:'rgba(186,230,253,0.28)', icon:'🌨️' },
}

const deriveCondition = (tag) => {
  if (!tag) return null
  const t = tag.toLowerCase()
  if (t.includes('rain'))  return 'rainy'
  if (t.includes('hot') || t.includes('cool')) return 'hot'
  if (t.includes('cold') || t.includes('warm')) return 'cold'
  if (t.includes('sun')  || t.includes('fresh')) return 'sunny'
  if (t.includes('wind') || t.includes('cozy')) return 'windy'
  if (t.includes('snow')) return 'snowy'
  if (t.includes('cloud')) return 'cloudy'
  return null
}

const RecommendedCard = ({ rec, index = 0 }) => {
  const { _id, name, price, image, emoji, category, weatherTag, isDiscovery, portions, rating, reviewCount, description } = rec ?? {}
  const { isDark: D } = useContext(ThemeContext)
  const dispatch      = useDispatch()
  const navigate      = useNavigate()
  const cartQty       = useCartQty(_id)
  const inCart        = cartQty > 0
  const S             = useCardStyle(D)
  // FIX: read tier for animation gating
  const { gsapEnabled } = useDeviceTier()

  const hasPortions = Array.isArray(portions) && portions.length > 0
  const cardRef    = useRef(null)
  const imgRef     = useRef(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const cond    = deriveCondition(weatherTag)
  const tagMeta = cond ? TAG_META[cond] : null

  // FIX: entrance animation gated — card still appears on low tier, no animation
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    if (!gsapEnabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(el,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.44, delay: 0.05 + index * 0.07, ease: 'power3.out', clearProps: 'opacity,y,transform' }
    )
  }, [index, gsapEnabled])

  // FIX: bounce gated — item still adds to cart on low tier
  const handleAdd = useCallback((e) => {
    e?.stopPropagation()
    if (!_id) return
    if (hasPortions) { lockScroll(); setSheetOpen(true); return }
    dispatch(addItem({ menuItemId: _id, name, price, emoji, category, quantity: 1 }))
    if (gsapEnabled && cardRef.current) {
      gsap.timeline()
        .to(cardRef.current, { scale: 0.97, duration: 0.08, ease: 'power2.in',   force3D: true })
        .to(cardRef.current, { scale: 1.01, duration: 0.18, ease: 'back.out(3)', force3D: true })
        .to(cardRef.current, { scale: 1,    duration: 0.14, ease: 'power2.out',  force3D: true })
    }
  }, [_id, name, price, emoji, category, hasPortions, dispatch, gsapEnabled])

  const handleClick = useCallback(() => { if (_id) navigate(`/menu/item/${_id}`) }, [navigate, _id])

  // FIX: touch scale gated — tap still fires, just no visual scale on low tier
  const onTouchStart = useCallback(() => {
    if (!gsapEnabled || !cardRef.current) return
    gsap.to(cardRef.current, { scale: 0.966, duration: 0.10, ease: 'power2.out', force3D: true, overwrite: true })
  }, [gsapEnabled])

  const onTouchEnd = useCallback(() => {
    if (!gsapEnabled || !cardRef.current) return
    gsap.to(cardRef.current, { scale: 1, duration: 0.40, ease: 'back.out(2.2)', force3D: true, overwrite: true })
  }, [gsapEnabled])

  if (!_id) return null

  return (
    <>
      <div
        ref={cardRef}
        onClick={handleClick}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{
          width: '100%', position: 'relative', borderRadius: 20, overflow: 'hidden', cursor: 'pointer',
          display: 'flex', flexDirection: 'column',
          background:           inCart ? S.cardBgIn : S.cardBg,
          border:               `1px solid ${inCart ? S.cardBdIn : S.cardBorder}`,
          boxShadow:            S.cardShadow,
          backdropFilter:       S.cardBlur,
          WebkitBackdropFilter: S.cardBlur,
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
          transform: 'translate3d(0,0,0)',
          willChange: 'transform',
          isolation: 'isolate',
          transition: 'background 0.30s ease, border-color 0.30s ease',
          // FIX: contain isolates card repaints from scroll layer
          contain: 'layout style paint',
        }}
      >
        <div aria-hidden style={{ position: 'absolute', top: 0, left: '8%', right: '8%', height: 1, background: S.gloss, pointerEvents: 'none', zIndex: 2 }}/>

        {/* Image */}
        <div style={{ position: 'relative', height: 130, overflow: 'hidden', flexShrink: 0, background: S.imageBg }}>
          {image ? (
            <>
              {!imgLoaded && (
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg,${S.imageBg} 0%,rgba(255,255,255,0.3) 50%,${S.imageBg} 100%)`, backgroundSize: '200% 100%', animation: 'rc-shimmer 1.5s ease-in-out infinite' }}/>
              )}
              <img
                ref={imgRef} src={image} alt={name}
                onLoad={() => setImgLoaded(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s ease', transform: 'translate3d(0,0,0)' }}
                loading="lazy" draggable={false}
              />
            </>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>{emoji}</div>
          )}
          {hasPortions && (
            <div style={{ position: 'absolute', top: 9, left: 9, padding: '3px 7px', borderRadius: 7, background: S.badgeBg, backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: `1px solid ${S.badgeBd}`, fontSize: 9, fontWeight: 700, color: S.badgeTxt, letterSpacing: '0.04em', fontFamily: FONTS.body }}>
              {portions.length} sizes
            </div>
          )}
          {isDiscovery && (
            <div style={{ position: 'absolute', top: 9, right: 9, width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#2D9B5A,#38C26F)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(45,155,90,0.40)' }}>
              <Sparkles size={10} color="#fff"/>
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, background: `linear-gradient(to top,${inCart ? S.cardBgIn : S.cardBg},transparent)`, pointerEvents: 'none' }}/>
        </div>

        {/* Info */}
        <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          {tagMeta && (
            <span style={{ alignSelf: 'flex-start', marginBottom: 5, fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: tagMeta.bg, color: tagMeta.color, border: `1px solid ${tagMeta.border}`, lineHeight: 1.4, letterSpacing: '0.04em', textTransform: 'capitalize' }}>
              {tagMeta.icon} {cond}
            </span>
          )}

          <PriceDisplay item={rec} priceColor={S.priceColor} priceSep={S.priceSep} size="sm"/>

          <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.3, color: S.nameColor, fontFamily: FONTS.heading, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {name}
          </p>
          {description && (
            <p style={{ margin: '2px 0 0', fontSize: 10.5, lineHeight: 1.45, color: S.metaColor, fontFamily: FONTS.body, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {description}
            </p>
          )}
          {(rating != null || reviewCount > 0) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              {rating != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Star size={10} fill="#F59E0B" color="#F59E0B"/>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', fontFamily: FONTS.mono }}>{rating}</span>
                </div>
              )}
              {reviewCount > 0 && <span style={{ fontSize: 9.5, color: S.metaColor, fontFamily: FONTS.body }}>{Number(reviewCount).toLocaleString()}</span>}
            </div>
          )}

          <div style={{ marginTop: 'auto', paddingTop: 10 }}>
            {inCart
              ? <CartControls item={rec} cartQty={cartQty} onAdd={handleAdd} size="sm"/>
              : <CartButton onAdd={handleAdd} height={38} radius={12} fontSize={12}/>
            }
          </div>
        </div>
      </div>

      {sheetOpen && <PortionSheet item={rec} onClose={() => { setSheetOpen(false); unlockScroll() }}/>}
      <style>{`@keyframes rc-shimmer{0%{background-position:200% center}100%{background-position:-200% center}}`}</style>
    </>
  )
}

export default RecommendedCard