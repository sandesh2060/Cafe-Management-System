// src/modules/customer/components/menu/NavAvatar.jsx
import { useContext } from 'react'
import { ThemeContext } from '@shared/context/ThemeContext'

const getAvatarUrl = (seed) => {
  const s = encodeURIComponent(seed || 'guest')
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${s}&backgroundColor=FF9F1C,E05C2A&backgroundType=gradientLinear&radius=50`
}

const NavAvatar = ({ name = '', avatar = null, isOnline = true, onClick }) => {
  const { isDark } = useContext(ThemeContext)
  const imgSrc  = avatar || getAvatarUrl(name || 'guest')
  const bgColor = isDark ? '#0a0704' : '#fffbf4'

  return (
    <>
      {/* 32px circle + 4px overflow for the dot */}
      <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
        <button
          onClick={onClick}
          aria-label={`Profile${name ? ` — ${name}` : ''}`}
          style={{
            position: 'absolute', inset: 0,
            width: 32, height: 32,
            borderRadius: '50%',
            border: 'none', padding: 0,
            cursor: 'pointer',
            background: 'linear-gradient(145deg,#FF9F1C,#E05C2A)',
            boxShadow: '0 2px 8px rgba(255,130,0,0.38)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            WebkitTapHighlightColor: 'transparent',
            transition: 'transform 0.18s cubic-bezier(.34,1.56,.64,1)',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseDown={e  => e.currentTarget.style.transform = 'scale(0.92)'}
          onMouseUp={e    => e.currentTarget.style.transform = 'scale(1.08)'}
        >
          <img
            src={imgSrc}
            alt={name || 'Profile'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
          {/* gloss */}
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'linear-gradient(135deg,rgba(255,255,255,0.2) 0%,transparent 50%)',
            pointerEvents: 'none',
          }} />
        </button>

        {/* Online dot */}
        {isOnline && (
          <span style={{
            position: 'absolute',
            bottom: -1, right: -1,
            width: 9, height: 9,
            borderRadius: '50%',
            background: '#22c55e',
            boxShadow: `0 0 0 2px ${bgColor}`,
            zIndex: 10,
            display: 'block',
          }}>
            <span style={{
              position: 'absolute', inset: -2,
              borderRadius: '50%',
              background: 'rgba(34,197,94,0.4)',
              animation: 'nva-ping 2.6s cubic-bezier(0,0,0.2,1) infinite',
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