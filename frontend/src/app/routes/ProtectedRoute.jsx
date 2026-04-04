// src/app/routes/ProtectedRoute.jsx
//
// ─── FIX: cookie auth ─────────────────────────────────────────────────────────
// With httpOnly cookie auth, `token` in Redux is always null — the token lives
// in the cookie, not in Redux state. The old check `!isLoggedIn || !token`
// caused an infinite redirect loop:
//   login succeeds → user set in Redux → isLoggedIn=true, token=null
//   → ProtectedRoute sees !token → redirects to /detect
//   → bootstrap calls /auth/me → cookie valid → user set again → navigate /menu
//   → ProtectedRoute sees !token → redirects to /detect → loop
//
// FIX: remove the `!token` check entirely. `isLoggedIn` is now the only gate.
// isLoggedIn is set to true in authSlice when user object is present,
// regardless of token. That is the correct single source of truth.
// ─────────────────────────────────────────────────────────────────────────────

import { Navigate }    from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  selectIsLoggedIn,
  selectRole,
  selectBootstrapReady,
} from '@store/slices/authSlice'
import { getRoleHome } from './roleRoutes'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const isLoggedIn     = useSelector(selectIsLoggedIn)
  const role           = useSelector(selectRole)
  const bootstrapReady = useSelector(selectBootstrapReady)

  // Wait for /auth/me to resolve before any redirect decision
  if (!bootstrapReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  // FIX: was `!isLoggedIn || !token` — token is always null with cookie auth
  if (!isLoggedIn) {
    return <Navigate to="/detect" replace />
  }

  // Wrong role → redirect to their actual home
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={getRoleHome(role)} replace />
  }

  return children
}

export default ProtectedRoute