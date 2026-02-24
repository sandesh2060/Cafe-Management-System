// src/modules/customer/components/profile/LogoutButton.jsx
import { useState }         from 'react'
import { useNavigate }      from 'react-router-dom'
import { useLogoutGuard }   from '../../hooks/useLogoutGuard'
import { COLORS }           from '@colors'
import { LogOut, Lock }     from 'lucide-react'

const LogoutButton = () => {
  const navigate          = useNavigate()
  const { attemptLogout } = useLogoutGuard()
  const [loading, setLoading]     = useState(false)
  const [blocked, setBlocked]     = useState(null)   // null | reason string
  const [showConfirm, setShowConfirm] = useState(false)

  const handlePress = async () => {
    setBlocked(null)
    const result = await attemptLogout()
    if (result.blocked) {
      setBlocked(result.reason)
    }
    // If not blocked, attemptLogout already triggers navigation
  }

  return (
    <div className="space-y-2 pb-6">
      {/* Blocked message */}
      {blocked && (
        <div className="card flex items-start gap-3 border-orange-200 bg-orange-50">
          <Lock size={18} color={COLORS.terra.DEFAULT} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-terra">Can't log out yet</p>
            <p className="text-xs text-terra/80 mt-0.5">{blocked}</p>
            <button
              onClick={() => { setBlocked(null); navigate('/track') }}
              className="text-xs underline text-terra mt-1"
            >
              Track your order →
            </button>
          </div>
        </div>
      )}

      <button
        onClick={handlePress}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl
                   border-2 border-red-200 text-red-500 font-semibold text-sm
                   active:scale-95 transition-all hover:bg-red-50 min-h-[52px]
                   disabled:opacity-50"
      >
        <LogOut size={18} />
        {loading ? 'Logging out…' : 'Logout'}
      </button>
    </div>
  )
}

export default LogoutButton