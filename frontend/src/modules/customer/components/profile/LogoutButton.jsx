// src/modules/customer/components/profile/LogoutButton.jsx
//
// ✅ COLORS import removed — var(--danger-*) replaces COLORS.terra.DEFAULT
// ✅ Tailwind border-red-200/text-red-500/hover:bg-red-50 → var(--danger-*)
// ✅ Blocked message card → var(--warning-bg/warning/card-border) tokens
// ✅ All logic unchanged

import { useState }        from 'react'
import { useNavigate }     from 'react-router-dom'
import { useLogoutGuard }  from '../../hooks/useLogoutGuard'
import { LogOut, Lock }    from 'lucide-react'

const LogoutButton = () => {
  const navigate          = useNavigate()
  const { attemptLogout } = useLogoutGuard()
  const [loading, setLoading]     = useState(false)
  const [blocked, setBlocked]     = useState(null)

  const handlePress = async () => {
    setBlocked(null)
    const result = await attemptLogout()
    if (result.blocked) setBlocked(result.reason)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 24 }}>

      {/* Blocked message */}
      {blocked && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '12px 14px', borderRadius: 'var(--radius-xl)',
          // ✅ var(--warning-bg/border) — was bg-orange-50 border-orange-200
          background: 'var(--warning-bg)',
          border: '1px solid var(--card-border)',
        }}>
          {/* ✅ var(--warning) — was COLORS.terra.DEFAULT */}
          <Lock size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--warning)' }}>
              Can't log out yet
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
              {blocked}
            </p>
            <button
              onClick={() => { setBlocked(null); navigate('/track') }}
              style={{
                marginTop: 4, fontSize: 11, color: 'var(--warning)',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 0, textDecoration: 'underline',
              }}
            >
              Track your order →
            </button>
          </div>
        </div>
      )}

      {/* Logout button */}
      <button
        onClick={handlePress}
        disabled={loading}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: '16px', minHeight: 52,
          borderRadius: 'var(--radius-xl)',
          // ✅ var(--danger-bg/border/danger) — was hardcoded Tailwind red classes
          background: 'var(--danger-bg)',
          border: '2px solid var(--danger-border)',
          color: 'var(--danger)',
          fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.5 : 1,
          transition: 'opacity 0.15s, transform 0.1s',
          WebkitTapHighlightColor: 'transparent',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
        onMouseLeave={e => e.currentTarget.style.opacity = loading ? '0.5' : '1'}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <LogOut size={18} />
        {loading ? 'Logging out…' : 'Logout'}
      </button>
    </div>
  )
}

export default LogoutButton