// src/modules/customer/components/menu/NavAvatar.jsx
//
// FIXED:
// • avatar can now be a Cloudinary URL (https://...) → shows real photo
// • avatar can be an SVG preset ID ('bookworm', 'artist', etc.) → shows SVG
// • null/undefined → initials fallback
// • Loyalty tier ring color: bronze/silver/gold/none each get their own ring gradient
// • Online dot unchanged
// • Fully reactive to Redux user changes (no local state)

import { useContext } from 'react'
import { ThemeContext } from '@shared/context/ThemeContext'

// ── Tier ring gradients ───────────────────────────────────────────────────────
const TIER_RING = {
  gold:   'linear-gradient(135deg,#F59E0B,#FCD34D,#F59E0B)',
  silver: 'linear-gradient(135deg,#9CA3AF,#E5E7EB,#9CA3AF)',
  bronze: 'linear-gradient(135deg,#CD7F32,#E8A96A,#CD7F32)',
  none:   'linear-gradient(135deg,#FF9F1C,#E05C2A)',   // default amber
}

// ── SVG avatar definitions ────────────────────────────────────────────────────
const AVATARS = {
  the_regular: {
    bg: 'linear-gradient(135deg, #FF9F1C, #E05C2A)',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" style={{ width: '100%', height: '100%' }}>
        <ellipse cx="32" cy="54" rx="14" ry="8" fill="#E05C2A"/>
        <rect x="20" y="44" width="24" height="14" rx="6" fill="#E05C2A"/>
        <rect x="26" y="50" width="12" height="6" rx="3" fill="#C44A1A"/>
        <rect x="28" y="38" width="8" height="8" rx="3" fill="#FDDCB5"/>
        <circle cx="32" cy="30" r="14" fill="#FDDCB5"/>
        <ellipse cx="32" cy="17" rx="13" ry="3.5" fill="#5C3317"/>
        <path d="M19 17 Q20 10 32 10 Q44 10 45 17" fill="#5C3317"/>
        <rect x="26" y="15" width="12" height="4" rx="2" fill="#3D2010"/>
        <path d="M25 29 Q27 27 29 29M35 29 Q37 27 39 29M28 35 Q32 38 36 35" stroke="#5C3317" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  bookworm: {
    bg: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" style={{ width: '100%', height: '100%' }}>
        <rect x="20" y="44" width="24" height="14" rx="6" fill="#7C3AED"/>
        <rect x="28" y="38" width="8" height="8" rx="3" fill="#FDDCB5"/>
        <circle cx="32" cy="29" r="14" fill="#FDDCB5"/>
        <path d="M20 26 Q20 14 32 14 Q44 14 44 26" fill="#5C3317"/>
        <rect x="21" y="27" width="9" height="7" rx="3.5" fill="none" stroke="#5C3317" strokeWidth="2"/>
        <rect x="34" y="27" width="9" height="7" rx="3.5" fill="none" stroke="#5C3317" strokeWidth="2"/>
        <line x1="30" y1="30.5" x2="34" y2="30.5" stroke="#5C3317" strokeWidth="1.5"/>
        <circle cx="25.5" cy="30.5" r="1.5" fill="#5C3317"/>
        <circle cx="38.5" cy="30.5" r="1.5" fill="#5C3317"/>
        <path d="M28 37 Q32 39 36 37" stroke="#5C3317" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  workaholic: {
    bg: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" style={{ width: '100%', height: '100%' }}>
        <rect x="14" y="38" width="36" height="14" rx="2" fill="#1F2937"/>
        <rect x="16" y="40" width="32" height="10" rx="1" fill="#1D4ED8"/>
        <rect x="28" y="22" width="8" height="8" rx="3" fill="#FDDCB5"/>
        <circle cx="32" cy="16" r="12" fill="#FDDCB5"/>
        <path d="M20 14 Q22 6 32 6 Q42 6 44 14" fill="#374151"/>
        <circle cx="27" cy="16" r="2" fill="#374151"/>
        <circle cx="37" cy="16" r="2" fill="#374151"/>
        <path d="M28 21 Q32 24 36 21" stroke="#5C3317" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  foodie: {
    bg: 'linear-gradient(135deg, #E05C2A, #C44A1A)',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" style={{ width: '100%', height: '100%' }}>
        <rect x="20" y="42" width="24" height="16" rx="6" fill="#FDE8DF"/>
        <rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/>
        <circle cx="32" cy="27" r="15" fill="#FDDCB5"/>
        <path d="M17 24 Q18 14 32 13 Q46 14 47 24" fill="#92400E"/>
        <path d="M24 33 Q32 40 40 33" stroke="#5C3317" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  hipster: {
    bg: 'linear-gradient(135deg, #2D9B5A, #1E7A42)',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" style={{ width: '100%', height: '100%' }}>
        <rect x="18" y="42" width="28" height="16" rx="6" fill="#2D9B5A"/>
        <rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/>
        <circle cx="32" cy="28" r="14" fill="#FDDCB5"/>
        <path d="M18 24 Q20 13 32 12 Q44 13 46 24" fill="#E05C2A"/>
        <rect x="17" y="22" width="30" height="5" rx="2.5" fill="#C44A1A"/>
        <circle cx="27" cy="27" r="2.5" fill="#5C3317"/>
        <circle cx="37" cy="27" r="2.5" fill="#5C3317"/>
        <path d="M26 35 Q32 39 38 35" stroke="#5C3317" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  socialite: {
    bg: 'linear-gradient(135deg, #EC4899, #BE185D)',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" style={{ width: '100%', height: '100%' }}>
        <rect x="18" y="42" width="28" height="16" rx="6" fill="#FBCFE8"/>
        <rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/>
        <circle cx="32" cy="26" r="14" fill="#FDDCB5"/>
        <path d="M18 22 Q18 10 32 10 Q46 10 46 22" fill="#92400E"/>
        <circle cx="27" cy="25" r="2.5" fill="#5C3317"/>
        <circle cx="37" cy="25" r="2.5" fill="#5C3317"/>
        <path d="M28 31 Q32 35 36 31" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  student: {
    bg: 'linear-gradient(135deg, #0EA5E9, #0369A1)',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" style={{ width: '100%', height: '100%' }}>
        <rect x="17" y="42" width="30" height="16" rx="6" fill="#BAE6FD"/>
        <rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/>
        <circle cx="32" cy="27" r="14" fill="#FDDCB5"/>
        <polygon points="32,10 44,17 32,20 20,17" fill="#374151"/>
        <circle cx="27" cy="27" r="2.5" fill="#374151"/>
        <circle cx="37" cy="27" r="2.5" fill="#374151"/>
        <path d="M28 33 Q32 35 36 33" stroke="#5C3317" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  elder: {
    bg: 'linear-gradient(135deg, #92400E, #78350F)',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" style={{ width: '100%', height: '100%' }}>
        <rect x="18" y="42" width="28" height="16" rx="6" fill="#D97706"/>
        <rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/>
        <circle cx="32" cy="27" r="14" fill="#FDDCB5"/>
        <path d="M18 23 Q20 13 32 13 Q44 13 46 23" fill="#E5E7EB"/>
        <rect x="23" y="29" width="7" height="5" rx="2.5" fill="none" stroke="#92400E" strokeWidth="1.8"/>
        <rect x="34" y="29" width="7" height="5" rx="2.5" fill="none" stroke="#92400E" strokeWidth="1.8"/>
        <line x1="30" y1="31.5" x2="34" y2="31.5" stroke="#92400E" strokeWidth="1.5"/>
        <path d="M26 35 Q32 39 38 35" stroke="#5C3317" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  sporty: {
    bg: 'linear-gradient(135deg, #16A34A, #15803D)',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" style={{ width: '100%', height: '100%' }}>
        <rect x="18" y="42" width="28" height="16" rx="6" fill="#16A34A"/>
        <rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/>
        <circle cx="32" cy="27" r="14" fill="#FDDCB5"/>
        <rect x="18" y="24" width="28" height="5" rx="2.5" fill="#FBBF24"/>
        <path d="M18 24 Q20 14 32 13 Q44 14 46 24" fill="#15803D"/>
        <circle cx="27" cy="28" r="3" fill="white"/>
        <circle cx="37" cy="28" r="3" fill="white"/>
        <circle cx="27" cy="28" r="2" fill="#15803D"/>
        <circle cx="37" cy="28" r="2" fill="#15803D"/>
        <path d="M25 34 Q32 40 39 34" stroke="#5C3317" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  artist: {
    bg: 'linear-gradient(135deg, #F59E0B, #92400E)',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" style={{ width: '100%', height: '100%' }}>
        <rect x="18" y="42" width="28" height="16" rx="6" fill="#FEF3C7"/>
        <rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/>
        <circle cx="32" cy="27" r="14" fill="#FDDCB5"/>
        <ellipse cx="32" cy="16" rx="14" ry="6" fill="#92400E"/>
        <circle cx="27" cy="26" r="2.5" fill="#92400E"/>
        <circle cx="37" cy="26" r="2.5" fill="#92400E"/>
        <path d="M28 33 Q32 37 36 33" stroke="#5C3317" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const isUrl   = s => typeof s === 'string' && (s.startsWith('http://') || s.startsWith('https://'))
const isSvgId = s => typeof s === 'string' && !!AVATARS[s]

const initials = name =>
  (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

// ════════════════════════════════════════════════════════════════════════════
// NavAvatar
// ════════════════════════════════════════════════════════════════════════════
const NavAvatar = ({
  name     = '',
  avatar   = null,   // Cloudinary URL | SVG preset ID | null
  tier     = 'none', // 'bronze' | 'silver' | 'gold' | 'none'
  isOnline = true,
  onClick,
}) => {
  const { isDark } = useContext(ThemeContext)
  const bgColor    = isDark ? '#0a0704' : '#fffbf4'

  // ── Determine what to render inside the circle ──────────────────────────
  const svgAv      = isSvgId(avatar) ? AVATARS[avatar] : null
  const photoUrl   = isUrl(avatar) ? avatar : null

  // Ring gradient based on loyalty tier
  const ringGrad = TIER_RING[tier] || TIER_RING.none

  // Inner bg for the avatar circle (shown behind photo/SVG)
  const innerBg = svgAv ? svgAv.bg : 'linear-gradient(135deg,#FF9F1C,#E05C2A)'

  return (
    <>
      <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>

        {/* Tier ring — outer gradient border */}
        <button
          onClick={onClick}
          aria-label={`Profile${name ? ` — ${name}` : ''}`}
          style={{
            position:    'absolute', inset: 0,
            width:       32, height: 32,
            borderRadius:'50%',
            border:      'none',
            padding:     2,           // ring thickness
            cursor:      'pointer',
            background:  ringGrad,    // ring is the gradient background
            boxShadow:   tier === 'gold'
              ? '0 0 10px rgba(245,158,11,0.55)'
              : tier === 'silver'
                ? '0 0 8px rgba(156,163,175,0.4)'
                : tier === 'bronze'
                  ? '0 0 8px rgba(205,127,50,0.4)'
                  : '0 2px 8px rgba(255,130,0,0.35)',
            display:     'flex', alignItems: 'center', justifyContent: 'center',
            overflow:    'hidden',
            WebkitTapHighlightColor: 'transparent',
            transition:  'transform 0.18s cubic-bezier(.34,1.56,.64,1)',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseDown={e  => e.currentTarget.style.transform = 'scale(0.92)'}
          onMouseUp={e    => e.currentTarget.style.transform = 'scale(1.08)'}
        >
          {/* Inner circle — clips avatar content */}
          <div style={{
            width:'100%', height:'100%', borderRadius:'50%',
            overflow:'hidden', position:'relative',
            background: innerBg,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>

            {/* Priority: real photo → SVG preset → initials */}
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={name}
                style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}
              />
            ) : svgAv ? (
              svgAv.svg
            ) : (
              <span style={{
                fontFamily:'"DM Sans",sans-serif',
                fontWeight:800, fontSize:11,
                color:'#fff', letterSpacing:'-0.02em',
                lineHeight:1, userSelect:'none',
              }}>
                {initials(name)}
              </span>
            )}

            {/* Gloss overlay */}
            <span style={{
              position:'absolute',inset:0,borderRadius:'50%',
              background:'linear-gradient(135deg,rgba(255,255,255,0.18) 0%,transparent 50%)',
              pointerEvents:'none',
            }}/>
          </div>
        </button>

        {/* Online dot */}
        {isOnline && (
          <span style={{
            position:'absolute', bottom:-1, right:-1,
            width:9, height:9, borderRadius:'50%',
            background:'#22c55e',
            boxShadow:`0 0 0 2px ${bgColor}`,
            zIndex:10, display:'block',
          }}>
            <span style={{
              position:'absolute', inset:-2, borderRadius:'50%',
              background:'rgba(34,197,94,0.4)',
              animation:'nva-ping 2.6s cubic-bezier(0,0,0.2,1) infinite',
            }}/>
          </span>
        )}
      </div>

      <style>{`
        @keyframes nva-ping {
          0%   { transform: scale(0.8); opacity: 0.8; }
          70%  { transform: scale(2.6); opacity: 0;   }
          100% { transform: scale(2.6); opacity: 0;   }
        }
      `}</style>
    </>
  )
}

export default NavAvatar