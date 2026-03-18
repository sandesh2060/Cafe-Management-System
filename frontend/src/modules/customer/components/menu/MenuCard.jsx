// src/modules/customer/components/menu/MenuCard.jsx
import { useState, useContext, useRef, useCallback } from 'react'
import { useDispatch }        from 'react-redux'
import { useNavigate }        from 'react-router-dom'
import gsap                   from 'gsap'
import { Star }               from 'lucide-react'
import { ThemeContext }        from '@shared/context/ThemeContext'
import { BRAND, FONTS }        from '@shared/config/brand'
import { addItem }             from '@store/slices/cartSlice'
import { lockScroll, unlockScroll } from '@shared/utils/lenisLock'
import {
  useCartQty, useCardStyle, PriceDisplay, CartButton, CartControls, PortionSheet,
} from './menuCard.shared'

export default function MenuCard({ item }) {
  const { isDark: D } = useContext(ThemeContext)
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const cartQty    = useCartQty(item._id)
  const inCart     = cartQty > 0
  const S          = useCardStyle(D)

  const [sheetOpen, setSheetOpen] = useState(false)
  const cardRef = useRef(null)
  const imgRef  = useRef(null)

  const hasPortions = Array.isArray(item.portions) && item.portions.length > 0

  const handleAdd = useCallback((e) => {
    e?.stopPropagation()
    if (hasPortions) { lockScroll(); setSheetOpen(true); return }
    dispatch(addItem({ menuItemId: item._id, name: item.name, price: item.price, quantity: 1, emoji: item.emoji, category: item.category, portionId: null, portionLabel: null }))
    if (cardRef.current) {
      gsap.timeline()
        .to(cardRef.current, { scale: 0.97, duration: 0.08, ease: 'power2.in',   force3D: true })
        .to(cardRef.current, { scale: 1.01, duration: 0.18, ease: 'back.out(3)', force3D: true })
        .to(cardRef.current, { scale: 1,    duration: 0.14, ease: 'power2.out',  force3D: true })
    }
  }, [hasPortions, item, dispatch])

  const handleClick  = useCallback(() => navigate(`/menu/item/${item._id}`), [navigate, item._id])
  const onEnter      = useCallback(() => { if (imgRef.current) gsap.to(imgRef.current, { scale: 1.07, duration: 0.45, ease: 'power2.out', force3D: true }) }, [])
  const onLeave      = useCallback(() => { if (imgRef.current) gsap.to(imgRef.current, { scale: 1,    duration: 0.50, ease: 'power2.out', force3D: true }) }, [])
  const onTouchStart = useCallback(() => { gsap.to(cardRef.current, { scale: 0.966, duration: 0.10, ease: 'power2.out',    force3D: true, overwrite: true }) }, [])
  const onTouchEnd   = useCallback(() => { gsap.to(cardRef.current, { scale: 1,     duration: 0.40, ease: 'back.out(2.2)', force3D: true, overwrite: true }) }, [])

  return (
    <>
      <div
        ref={cardRef}
        onClick={handleClick}
        onMouseEnter={onEnter} onMouseLeave={onLeave}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}
        style={{
          position: 'relative', borderRadius: 22, overflow: 'hidden', cursor: 'pointer',
          background:           inCart ? S.cardBgIn : S.cardBg,
          border:               `1px solid ${inCart ? S.cardBdIn : S.cardBorder}`,
          boxShadow:            S.cardShadow,
          backdropFilter:       S.cardBlur, WebkitBackdropFilter: S.cardBlur,
          WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
          transform: 'translate3d(0,0,0)', willChange: 'transform', isolation: 'isolate',
          transition: 'background 0.30s ease, border-color 0.30s ease',
        }}
      >
        {/* Gloss line */}
        <div aria-hidden style={{ position:'absolute', top:0, left:'8%', right:'8%', height:1, background:S.gloss, pointerEvents:'none', zIndex:2 }}/>

        {/* Image */}
        <div style={{ position:'relative', aspectRatio:'4/3', overflow:'hidden', background:S.imageBg }}>
          {item.image
            ? <img ref={imgRef} src={item.image} alt={item.name} loading="lazy" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', transform:'translate3d(0,0,0)', willChange:'transform' }}/>
            : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:52 }}>{item.emoji ?? '🍽️'}</div>
          }
          {/* Veg dot */}
          {item.isVeg !== undefined && (
            <div style={{ position:'absolute', top:10, left:10, width:22, height:22, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', background: D ? 'rgba(10,6,2,0.80)' : 'rgba(255,252,248,0.90)', border:`2px solid ${item.isVeg ? S.vegColor : S.nonVeg}`, backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)' }}>
              <div style={{ width:9, height:9, borderRadius:'50%', background: item.isVeg ? S.vegColor : S.nonVeg }}/>
            </div>
          )}
          {/* Sizes badge */}
          {hasPortions && (
            <div style={{ position:'absolute', top:10, right:10, padding:'3px 8px', borderRadius:8, background:S.badgeBg, backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:`1px solid ${S.badgeBd}`, fontSize:9, fontWeight:700, color:S.badgeTxt, letterSpacing:'0.04em', fontFamily:FONTS.body }}>
              {item.portions.length} sizes
            </div>
          )}
          {/* Fade */}
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:32, background:`linear-gradient(to top, ${inCart ? S.cardBgIn : S.cardBg}, transparent)`, pointerEvents:'none' }}/>
        </div>

        {/* Info */}
        <div style={{ padding:'12px 14px 14px' }}>
          {/* Price */}
          <PriceDisplay item={item} priceColor={S.priceColor} priceSep={S.priceSep} size="md"/>

          {/* Name */}
          <p style={{ margin:'5px 0 0', fontSize:13, fontWeight:700, letterSpacing:'-0.015em', lineHeight:1.3, color:S.nameColor, fontFamily:FONTS.body, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
            {item.name}
          </p>
          {/* Description */}
          {item.description && (
            <p style={{ margin:'3px 0 0', fontSize:11, lineHeight:1.45, color:S.metaColor, fontFamily:FONTS.body, display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
              {item.description}
            </p>
          )}
          {/* Rating */}
          {(item.rating != null || item.reviewCount > 0) && (
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:5 }}>
              {item.rating != null && (
                <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                  <Star size={11} fill="#F59E0B" color="#F59E0B"/>
                  <span style={{ fontSize:11, fontWeight:700, color:'#F59E0B', fontFamily:FONTS.mono }}>{item.rating}</span>
                </div>
              )}
              {item.reviewCount > 0 && (
                <span style={{ fontSize:10, color:S.metaColor, fontFamily:FONTS.body }}>{Number(item.reviewCount).toLocaleString()} reviews</span>
              )}
            </div>
          )}

          {/* Cart */}
          <div style={{ marginTop:12 }}>
            {inCart
              ? <CartControls item={item} cartQty={cartQty} onAdd={handleAdd} size="md"/>
              : <CartButton onAdd={handleAdd} height={44} radius={14} fontSize={14}/>
            }
          </div>
        </div>
      </div>

      {sheetOpen && <PortionSheet item={item} onClose={() => { setSheetOpen(false); unlockScroll() }}/>}
    </>
  )
}