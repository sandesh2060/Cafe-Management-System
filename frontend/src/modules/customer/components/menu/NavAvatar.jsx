// src/modules/customer/components/menu/NavAvatar.jsx
import { useContext } from 'react'
import { ThemeContext } from '@shared/context/ThemeContext'

// ── Avatar definitions (must stay in sync with ProfilePage.jsx) ──────────────
const AVATARS = {
  the_regular: {
    bg: 'linear-gradient(135deg, #FF9F1C, #E05C2A)',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <ellipse cx="32" cy="54" rx="14" ry="8" fill="#E05C2A"/>
        <rect x="20" y="44" width="24" height="14" rx="6" fill="#E05C2A"/>
        <rect x="26" y="50" width="12" height="6" rx="3" fill="#C44A1A"/>
        <rect x="28" y="38" width="8" height="8" rx="3" fill="#FDDCB5"/>
        <circle cx="32" cy="30" r="14" fill="#FDDCB5"/>
        <ellipse cx="32" cy="17" rx="13" ry="3.5" fill="#5C3317"/>
        <path d="M19 17 Q20 10 32 10 Q44 10 45 17" fill="#5C3317"/>
        <rect x="26" y="15" width="12" height="4" rx="2" fill="#3D2010"/>
        <path d="M25 29 Q27 27 29 29" stroke="#5C3317" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M35 29 Q37 27 39 29" stroke="#5C3317" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M28 35 Q32 38 36 35" stroke="#5C3317" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <rect x="44" y="42" width="8" height="10" rx="2" fill="#fff"/>
        <rect x="44" y="42" width="8" height="3" rx="1" fill="#FF9F1C"/>
        <path d="M52 46 Q55 46 55 49 Q55 52 52 52" stroke="#E05C2A" strokeWidth="1.5" fill="none"/>
        <path d="M46 40 Q47 37 46 34" stroke="#C49A6C" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
        <path d="M50 39 Q51 36 50 33" stroke="#C49A6C" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
      </svg>
    ),
  },
  bookworm: {
    bg: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <rect x="20" y="44" width="24" height="14" rx="6" fill="#7C3AED"/>
        <rect x="42" y="46" width="10" height="14" rx="2" fill="#A78BFA"/>
        <rect x="42" y="46" width="2" height="14" rx="1" fill="#6D28D9"/>
        <line x1="44" y1="50" x2="52" y2="50" stroke="#DDD6FE" strokeWidth="0.8"/>
        <line x1="44" y1="53" x2="52" y2="53" stroke="#DDD6FE" strokeWidth="0.8"/>
        <line x1="44" y1="56" x2="52" y2="56" stroke="#DDD6FE" strokeWidth="0.8"/>
        <rect x="28" y="38" width="8" height="8" rx="3" fill="#FDDCB5"/>
        <circle cx="32" cy="29" r="14" fill="#FDDCB5"/>
        <path d="M20 26 Q20 14 32 14 Q44 14 44 26" fill="#5C3317"/>
        <circle cx="32" cy="14" r="5" fill="#5C3317"/>
        <circle cx="32" cy="11" r="3" fill="#3D2010"/>
        <rect x="21" y="27" width="9" height="7" rx="3.5" fill="none" stroke="#5C3317" strokeWidth="2"/>
        <rect x="34" y="27" width="9" height="7" rx="3.5" fill="none" stroke="#5C3317" strokeWidth="2"/>
        <line x1="30" y1="30.5" x2="34" y2="30.5" stroke="#5C3317" strokeWidth="1.5"/>
        <line x1="19" y1="30" x2="21" y2="30.5" stroke="#5C3317" strokeWidth="1.5"/>
        <line x1="45" y1="30" x2="43" y2="30.5" stroke="#5C3317" strokeWidth="1.5"/>
        <circle cx="25.5" cy="30.5" r="1.5" fill="#5C3317"/>
        <circle cx="38.5" cy="30.5" r="1.5" fill="#5C3317"/>
        <path d="M28 37 Q32 39 36 37" stroke="#5C3317" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  workaholic: {
    bg: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <rect x="10" y="50" width="44" height="5" rx="2" fill="#374151"/>
        <rect x="14" y="38" width="36" height="14" rx="2" fill="#1F2937"/>
        <rect x="16" y="40" width="32" height="10" rx="1" fill="#1D4ED8"/>
        <rect x="18" y="41" width="10" height="1.5" rx="0.5" fill="#93C5FD" opacity="0.7"/>
        <rect x="18" y="44" width="16" height="1.5" rx="0.5" fill="#93C5FD" opacity="0.5"/>
        <rect x="18" y="47" width="8" height="1.5" rx="0.5" fill="#93C5FD" opacity="0.4"/>
        <rect x="22" y="28" width="20" height="12" rx="4" fill="#DBEAFE"/>
        <polygon points="32,30 30,36 32,38 34,36" fill="#2563EB"/>
        <polygon points="31,28 33,28 32,31" fill="#1D4ED8"/>
        <rect x="28" y="22" width="8" height="8" rx="3" fill="#FDDCB5"/>
        <circle cx="32" cy="16" r="12" fill="#FDDCB5"/>
        <path d="M20 14 Q22 6 32 6 Q42 6 44 14" fill="#374151"/>
        <path d="M20 14 Q19 10 22 8" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
        <path d="M44 14 Q45 10 42 8" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="27" cy="16" r="2" fill="#374151"/>
        <circle cx="37" cy="16" r="2" fill="#374151"/>
        <circle cx="27.7" cy="15.3" r="0.6" fill="white"/>
        <circle cx="37.7" cy="15.3" r="0.6" fill="white"/>
        <path d="M28 21 Q32 24 36 21" stroke="#5C3317" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  foodie: {
    bg: 'linear-gradient(135deg, #E05C2A, #C44A1A)',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <rect x="20" y="42" width="24" height="16" rx="6" fill="#FDE8DF"/>
        <path d="M24 42 Q32 38 40 42 L38 54 Q32 56 26 54 Z" fill="white"/>
        <ellipse cx="32" cy="44" rx="5" ry="3" fill="#FDE8DF"/>
        <circle cx="32" cy="48" r="2" fill="#FF9F1C"/>
        <rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/>
        <circle cx="32" cy="27" r="15" fill="#FDDCB5"/>
        <path d="M17 24 Q18 14 32 13 Q46 14 47 24" fill="#92400E"/>
        <path d="M23 25 Q23 22 25 22 Q27 22 27 25 Q27 22 29 22 Q31 22 31 25 Q31 27 27 30 Q23 27 23 25Z" fill="#E05C2A"/>
        <path d="M33 25 Q33 22 35 22 Q37 22 37 25 Q37 22 39 22 Q41 22 41 25 Q41 27 37 30 Q33 27 33 25Z" fill="#E05C2A"/>
        <path d="M24 33 Q32 40 40 33" stroke="#5C3317" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <circle cx="22" cy="31" r="3.5" fill="#FCA5A5" opacity="0.6"/>
        <circle cx="42" cy="31" r="3.5" fill="#FCA5A5" opacity="0.6"/>
      </svg>
    ),
  },
  hipster: {
    bg: 'linear-gradient(135deg, #2D9B5A, #1E7A42)',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <rect x="18" y="42" width="28" height="16" rx="6" fill="#2D9B5A"/>
        <line x1="18" y1="46" x2="46" y2="46" stroke="#1E7A42" strokeWidth="1.5" opacity="0.5"/>
        <line x1="18" y1="50" x2="46" y2="50" stroke="#1E7A42" strokeWidth="1.5" opacity="0.5"/>
        <line x1="28" y1="42" x2="28" y2="58" stroke="#1E7A42" strokeWidth="1.5" opacity="0.5"/>
        <line x1="36" y1="42" x2="36" y2="58" stroke="#1E7A42" strokeWidth="1.5" opacity="0.5"/>
        <rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/>
        <circle cx="32" cy="28" r="14" fill="#FDDCB5"/>
        <path d="M19 30 Q20 40 32 42 Q44 40 45 30 Q40 36 32 36 Q24 36 19 30Z" fill="#5C3317"/>
        <path d="M26 30 Q29 33 32 30 Q35 33 38 30" stroke="#3D2010" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M18 24 Q20 13 32 12 Q44 13 46 24" fill="#E05C2A"/>
        <rect x="17" y="22" width="30" height="5" rx="2.5" fill="#C44A1A"/>
        <circle cx="32" cy="12" r="4" fill="#FF9F1C"/>
        <circle cx="27" cy="27" r="2.5" fill="#5C3317"/>
        <circle cx="37" cy="27" r="2.5" fill="#5C3317"/>
        <circle cx="27.8" cy="26.5" r="0.7" fill="white"/>
        <circle cx="37.8" cy="26.5" r="0.7" fill="white"/>
      </svg>
    ),
  },
  socialite: {
    bg: 'linear-gradient(135deg, #EC4899, #BE185D)',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <rect x="18" y="42" width="28" height="16" rx="6" fill="#FBCFE8"/>
        <circle cx="26" cy="48" r="1.2" fill="#EC4899"/>
        <circle cx="32" cy="46" r="1.2" fill="#EC4899"/>
        <circle cx="38" cy="49" r="1.2" fill="#EC4899"/>
        <rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/>
        <circle cx="18" cy="30" r="2" fill="#F59E0B"/>
        <circle cx="18" cy="34" r="1.5" fill="#EC4899"/>
        <line x1="18" y1="30" x2="18" y2="34" stroke="#F59E0B" strokeWidth="1"/>
        <circle cx="46" cy="30" r="2" fill="#F59E0B"/>
        <circle cx="46" cy="34" r="1.5" fill="#EC4899"/>
        <line x1="46" y1="30" x2="46" y2="34" stroke="#F59E0B" strokeWidth="1"/>
        <circle cx="32" cy="26" r="14" fill="#FDDCB5"/>
        <path d="M18 22 Q18 10 32 10 Q46 10 46 22 Q42 18 38 22 Q35 16 32 20 Q29 16 26 22 Q22 18 18 22Z" fill="#92400E"/>
        <path d="M18 22 Q16 28 17 34" stroke="#92400E" strokeWidth="4" strokeLinecap="round"/>
        <path d="M46 22 Q48 28 47 34" stroke="#92400E" strokeWidth="4" strokeLinecap="round"/>
        <rect x="23" y="13" width="8" height="4" rx="2" fill="#1C1917" opacity="0.8"/>
        <rect x="33" y="13" width="8" height="4" rx="2" fill="#1C1917" opacity="0.8"/>
        <line x1="31" y1="15" x2="33" y2="15" stroke="#374151" strokeWidth="1.5"/>
        <circle cx="27" cy="25" r="2.5" fill="#5C3317"/>
        <circle cx="37" cy="25" r="2.5" fill="#5C3317"/>
        <path d="M28 31 Q32 35 36 31" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <circle cx="22" cy="29" r="3" fill="#FCA5A5" opacity="0.5"/>
        <circle cx="42" cy="29" r="3" fill="#FCA5A5" opacity="0.5"/>
      </svg>
    ),
  },
  student: {
    bg: 'linear-gradient(135deg, #0EA5E9, #0369A1)',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <rect x="12" y="38" width="5" height="18" rx="2.5" fill="#0369A1"/>
        <rect x="47" y="38" width="5" height="18" rx="2.5" fill="#0369A1"/>
        <rect x="17" y="42" width="30" height="16" rx="6" fill="#BAE6FD"/>
        <rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/>
        <circle cx="32" cy="27" r="14" fill="#FDDCB5"/>
        <rect x="20" y="17" width="24" height="5" rx="1" fill="#1C1917"/>
        <polygon points="32,10 44,17 32,20 20,17" fill="#374151"/>
        <line x1="44" y1="17" x2="46" y2="24" stroke="#1C1917" strokeWidth="1.5"/>
        <circle cx="46" cy="25" r="2" fill="#F59E0B"/>
        <circle cx="27" cy="27" r="2.5" fill="#374151"/>
        <circle cx="37" cy="27" r="2.5" fill="#374151"/>
        <path d="M24 26 Q27 24.5 30 26" stroke="#374151" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M34 26 Q37 24.5 40 26" stroke="#374151" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M28 33 Q32 35 36 33" stroke="#5C3317" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  elder: {
    bg: 'linear-gradient(135deg, #92400E, #78350F)',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <rect x="18" y="42" width="28" height="16" rx="6" fill="#D97706"/>
        <circle cx="32" cy="46" r="1.2" fill="#92400E"/>
        <circle cx="32" cy="50" r="1.2" fill="#92400E"/>
        <circle cx="32" cy="54" r="1.2" fill="#92400E"/>
        <rect x="42" y="44" width="12" height="14" rx="2" fill="#F9FAFB"/>
        <line x1="44" y1="47" x2="52" y2="47" stroke="#9CA3AF" strokeWidth="1"/>
        <line x1="44" y1="50" x2="52" y2="50" stroke="#9CA3AF" strokeWidth="0.8"/>
        <rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/>
        <circle cx="32" cy="27" r="14" fill="#FDDCB5"/>
        <path d="M18 23 Q20 13 32 13 Q44 13 46 23" fill="#E5E7EB"/>
        <rect x="23" y="29" width="7" height="5" rx="2.5" fill="none" stroke="#92400E" strokeWidth="1.8"/>
        <rect x="34" y="29" width="7" height="5" rx="2.5" fill="none" stroke="#92400E" strokeWidth="1.8"/>
        <line x1="30" y1="31.5" x2="34" y2="31.5" stroke="#92400E" strokeWidth="1.5"/>
        <circle cx="26.5" cy="25" r="2" fill="#5C3317"/>
        <circle cx="37.5" cy="25" r="2" fill="#5C3317"/>
        <path d="M26 35 Q32 39 38 35" stroke="#5C3317" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  sporty: {
    bg: 'linear-gradient(135deg, #16A34A, #15803D)',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <rect x="18" y="42" width="28" height="16" rx="6" fill="#16A34A"/>
        <text x="32" y="54" textAnchor="middle" fontSize="9" fontWeight="bold" fill="white" fontFamily="monospace">7</text>
        <rect x="44" y="48" width="8" height="5" rx="2.5" fill="#FBBF24"/>
        <rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/>
        <circle cx="32" cy="27" r="14" fill="#FDDCB5"/>
        <rect x="18" y="24" width="28" height="5" rx="2.5" fill="#FBBF24"/>
        <path d="M18 24 Q20 14 32 13 Q44 14 46 24" fill="#15803D"/>
        <circle cx="32" cy="13" r="2" fill="#16A34A"/>
        <circle cx="27" cy="28" r="3" fill="white"/>
        <circle cx="37" cy="28" r="3" fill="white"/>
        <circle cx="27" cy="28" r="2" fill="#15803D"/>
        <circle cx="37" cy="28" r="2" fill="#15803D"/>
        <circle cx="27.8" cy="27.2" r="0.8" fill="white"/>
        <circle cx="37.8" cy="27.2" r="0.8" fill="white"/>
        <path d="M25 34 Q32 40 39 34" stroke="#5C3317" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  artist: {
    bg: 'linear-gradient(135deg, #F59E0B, #92400E)',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <rect x="18" y="42" width="28" height="16" rx="6" fill="#FEF3C7"/>
        <ellipse cx="26" cy="48" rx="3" ry="2" fill="#EC4899" opacity="0.6" transform="rotate(-15 26 48)"/>
        <ellipse cx="36" cy="51" rx="3" ry="2" fill="#2563EB" opacity="0.5" transform="rotate(10 36 51)"/>
        <line x1="48" y1="38" x2="56" y2="28" stroke="#92400E" strokeWidth="2.5" strokeLinecap="round"/>
        <ellipse cx="47" cy="39" rx="3" ry="2" fill="#F59E0B" transform="rotate(-45 47 39)"/>
        <circle cx="56" cy="27" r="2.5" fill="#EC4899"/>
        <rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/>
        <circle cx="32" cy="27" r="14" fill="#FDDCB5"/>
        <ellipse cx="32" cy="16" rx="14" ry="6" fill="#92400E"/>
        <ellipse cx="32" cy="15" rx="10" ry="7" fill="#B45309"/>
        <circle cx="38" cy="12" r="2.5" fill="#92400E"/>
        <ellipse cx="23" cy="32" rx="3" ry="2" fill="#2563EB" opacity="0.4" transform="rotate(-10 23 32)"/>
        <circle cx="27" cy="26" r="2.5" fill="#92400E"/>
        <circle cx="37" cy="26" r="2.5" fill="#92400E"/>
        <circle cx="27.8" cy="25.2" r="0.8" fill="white"/>
        <circle cx="37.8" cy="25.2" r="0.8" fill="white"/>
        <path d="M28 33 Q32 37 36 33" stroke="#5C3317" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
        <path d="M41 22 L42 20 L43 22 L45 23 L43 24 L42 26 L41 24 L39 23 Z" fill="#F59E0B" opacity="0.8"/>
      </svg>
    ),
  },
}

// ── Fallback: initials avatar ─────────────────────────────────────────────────
const InitialsAvatar = ({ name }) => {
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <span style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"DM Sans", sans-serif',
      fontWeight: 800,
      fontSize: 13,
      color: '#fff',
      letterSpacing: '-0.02em',
      lineHeight: 1,
      userSelect: 'none',
    }}>
      {initials}
    </span>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  NavAvatar
// ════════════════════════════════════════════════════════════════════════════
const NavAvatar = ({ name = '', avatar = null, isOnline = true, onClick }) => {
  const { isDark } = useContext(ThemeContext)
  const bgColor    = isDark ? '#0a0704' : '#fffbf4'

  // avatar is an ID string like 'bookworm' | null
  const av      = avatar ? AVATARS[avatar] : null
  const gradient = av?.bg || 'linear-gradient(145deg, #FF9F1C, #E05C2A)'

  return (
    <>
      <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
        <button
          onClick={onClick}
          aria-label={`Profile${name ? ` — ${name}` : ''}`}
          style={{
            position:   'absolute', inset: 0,
            width:      32, height: 32,
            borderRadius: '50%',
            border:     'none', padding: 2,
            cursor:     'pointer',
            background: gradient,
            boxShadow:  '0 2px 8px rgba(255,130,0,0.38)',
            display:    'flex', alignItems: 'center', justifyContent: 'center',
            overflow:   'hidden',
            WebkitTapHighlightColor: 'transparent',
            transition: 'transform 0.18s cubic-bezier(.34,1.56,.64,1)',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseDown={e  => e.currentTarget.style.transform = 'scale(0.92)'}
          onMouseUp={e    => e.currentTarget.style.transform = 'scale(1.08)'}
        >
          {/* SVG avatar or initials fallback */}
          {av ? av.svg : <InitialsAvatar name={name} />}

          {/* gloss overlay */}
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 50%)',
            pointerEvents: 'none',
          }} />
        </button>

        {/* Online dot */}
        {isOnline && (
          <span style={{
            position:     'absolute',
            bottom: -1, right: -1,
            width: 9, height: 9,
            borderRadius: '50%',
            background:   '#22c55e',
            boxShadow:    `0 0 0 2px ${bgColor}`,
            zIndex:       10,
            display:      'block',
          }}>
            <span style={{
              position:        'absolute', inset: -2,
              borderRadius:    '50%',
              background:      'rgba(34,197,94,0.4)',
              animation:       'nva-ping 2.6s cubic-bezier(0,0,0.2,1) infinite',
            }} />
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