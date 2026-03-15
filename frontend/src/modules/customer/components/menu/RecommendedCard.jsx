// src/modules/customer/components/menu/RecommendedCard.jsx

import { useRef, useEffect, useCallback, useState } from 'react'
import { useDispatch }    from 'react-redux'
import { useNavigate }    from 'react-router-dom'
import { addItem }        from '@store/slices/cartSlice'
import gsap               from 'gsap'
import { Plus, Star, Sparkles, Check } from 'lucide-react'
import toast              from 'react-hot-toast'

const deriveCondition = (tag) => {
  if (!tag) return null
  const t = tag.toLowerCase()
  if (t.includes('rain'))                          return 'rainy'
  if (t.includes('hot') || t.includes('cool you')) return 'hot'
  if (t.includes('cold') || t.includes('warm'))    return 'cold'
  if (t.includes('sun')  || t.includes('fresh'))   return 'sunny'
  if (t.includes('wind') || t.includes('cozy'))    return 'windy'
  if (t.includes('snow'))                          return 'snowy'
  if (t.includes('cloud'))                         return 'cloudy'
  return null
}

const TAG_STYLE = {
  sunny:  { bg: 'rgba(251,191,36,0.15)',  color: '#D97706', border: 'rgba(251,191,36,0.28)'  },
  hot:    { bg: 'rgba(239,68,68,0.12)',   color: '#DC2626', border: 'rgba(239,68,68,0.22)'   },
  rainy:  { bg: 'rgba(59,130,246,0.12)',  color: '#2563EB', border: 'rgba(59,130,246,0.22)'  },
  cold:   { bg: 'rgba(147,197,253,0.15)', color: '#1D4ED8', border: 'rgba(147,197,253,0.28)' },
  cloudy: { bg: 'rgba(156,163,175,0.15)', color: '#4B5563', border: 'rgba(156,163,175,0.28)' },
  windy:  { bg: 'rgba(167,243,208,0.15)', color: '#059669', border: 'rgba(167,243,208,0.28)' },
  snowy:  { bg: 'rgba(186,230,253,0.15)', color: '#0284C7', border: 'rgba(186,230,253,0.28)' },
}
const TAG_ICON = {
  sunny:'☀️', hot:'🌡️', rainy:'🌧️', cold:'❄️', cloudy:'☁️', windy:'💨', snowy:'🌨️',
}

const Badge = ({ type }) => {
  const isF = type === 'favourite'
  return (
    <div style={{
      position: 'absolute', top: 7, right: 7,
      width: 22, height: 22, borderRadius: '50%',
      background: isF
        ? 'linear-gradient(135deg,#FF9F1C,#E05C2A)'
        : 'linear-gradient(135deg,#2D9B5A,#38C26F)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: isF
        ? '0 2px 8px rgba(255,159,28,0.45)'
        : '0 2px 8px rgba(45,155,90,0.40)',
    }}>
      {isF
        ? <Star     size={11} color="#fff" fill="#fff" />
        : <Sparkles size={10} color="#fff" />
      }
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
const RecommendedCard = ({ rec, index = 0 }) => {
  const { _id, name, price, image, emoji, category, weatherTag, isFavourite, isDiscovery } = rec ?? {}

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const cardRef  = useRef(null)
  const btnRef   = useRef(null)
  const imgRef   = useRef(null)
  const [added,   setAdded]   = useState(false)
  const [imgLoad, setImgLoad] = useState(false)

  // ── Entrance — opacity + Y only, NO scale (avoids GPU layer conflict) ──────
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(el,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0,
        duration: 0.44,
        delay: 0.05 + index * 0.07,
        ease: 'power3.out',
        clearProps: 'opacity,y,transform',
      }
    )
  }, [index])

  // ── Add to cart ────────────────────────────────────────────────────────────
  const handleAdd = useCallback((e) => {
    e.stopPropagation()
    if (!_id || added) return
    if (btnRef.current) {
      gsap.timeline()
        .to(btnRef.current, { scale: 0.74, duration: 0.08 })
        .to(btnRef.current, { scale: 1.24, duration: 0.16, ease: 'back.out(3)' })
        .to(btnRef.current, { scale: 1,    duration: 0.20, ease: 'elastic.out(1,0.5)' })
    }
    dispatch(addItem({ menuItemId: _id, name, price, emoji, category, quantity: 1 }))
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
    toast.success(`${emoji || '✅'} Added!`, { duration: 1400, style: { fontSize: '13px' } })
  }, [dispatch, _id, name, price, emoji, category, added])

  // ── Navigate ───────────────────────────────────────────────────────────────
  const handleClick = useCallback(() => {
    if (_id) navigate(`/menu/item/${_id}`)
  }, [navigate, _id])

  if (!_id) return null

  const cond      = deriveCondition(weatherTag)
  const tagStyle  = cond ? TAG_STYLE[cond] : null
  const badgeType = isFavourite ? 'favourite' : isDiscovery ? 'discovery' : null

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      style={{
        width: '100%',
        display: 'flex', flexDirection: 'column',
        borderRadius: 18, overflow: 'hidden',
        // ── No willChange here — parent carousel owns the GPU layer ──────
        background: 'var(--bg-surface,rgba(255,248,238,0.95))',
        border: '1px solid var(--border-color,rgba(240,217,181,0.55))',
        // Stable shadow — no transition on shadow (causes repaint jitter)
        boxShadow: '0 2px 12px rgba(92,51,23,0.08), 0 1px 0 rgba(255,255,255,0.7) inset',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        // Promote to own layer cleanly — no transform conflict
        isolation: 'isolate',
      }}
    >
      {/* ── Image ─────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', height: 100,
        overflow: 'hidden',
        background: 'var(--bg-surface-2,#FFE4B5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {image ? (
          <>
            {!imgLoad && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg,var(--bg-surface-2,#FFE4B5) 0%,rgba(255,255,255,0.5) 50%,var(--bg-surface-2,#FFE4B5) 100%)',
                backgroundSize: '200% 100%',
                animation: 'rc-shimmer 1.5s ease-in-out infinite',
              }} />
            )}
            <img
              ref={imgRef}
              src={image} alt={name}
              onLoad={() => setImgLoad(true)}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                display: 'block',
                opacity: imgLoad ? 1 : 0,
                transition: 'opacity 0.3s ease',
                // NO willChange on img — reduces layer count
              }}
              loading="lazy"
              draggable={false}
            />
          </>
        ) : (
          <span style={{ fontSize: 38, lineHeight: 1 }}>{emoji}</span>
        )}

        {/* Bottom fade */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 26,
          background: 'linear-gradient(to top, var(--bg-surface,rgba(255,248,238,0.95)), transparent)',
          pointerEvents: 'none',
        }} />

        {badgeType && <Badge type={badgeType} />}
      </div>

      {/* ── Info ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: '9px 10px 10px', display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>

        {tagStyle && (
          <span style={{
            alignSelf: 'flex-start',
            fontSize: 8, fontWeight: 700,
            padding: '2px 6px', borderRadius: 6,
            background: tagStyle.bg, color: tagStyle.color,
            border: `1px solid ${tagStyle.border}`,
            lineHeight: 1.4, letterSpacing: '0.04em',
            textTransform: 'capitalize',
          }}>
            {TAG_ICON[cond]} {cond}
          </span>
        )}

        <p style={{
          fontSize: 12, fontWeight: 700, lineHeight: 1.35,
          color: 'var(--text-primary,#2C1810)', margin: 0,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {name}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 2 }}>
          {/* ── Rs instead of ₹ ──────────────────────────────────────── */}
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary,#2C1810)', letterSpacing: '-0.01em' }}>
            Rs {price}
          </span>

          <button
            ref={btnRef}
            onClick={handleAdd}
            aria-label={`Add ${name}`}
            style={{
              width: 30, height: 30, borderRadius: 10, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: added
                ? 'linear-gradient(135deg,#10B981,#059669)'
                : 'linear-gradient(135deg,#FF9F1C,#E05C2A)',
              boxShadow: added
                ? '0 2px 8px rgba(16,185,129,0.38)'
                : '0 2px 8px rgba(255,159,28,0.38)',
              border: 'none',
              cursor: added ? 'default' : 'pointer',
              // transition only on background/shadow — NOT transform (causes jitter)
              transition: 'background 0.22s ease, box-shadow 0.22s ease',
              color: '#fff',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {added ? <Check size={13} strokeWidth={3} /> : <Plus size={13} strokeWidth={3} />}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes rc-shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
    </div>
  )
}

export default RecommendedCard