// src/app/routes/ProtectedRoute.jsx
//
// ✅ FIX: Spinner was using var(--saffron) — that's a Tailwind token, not a
//    CSS custom property. Changed to var(--accent) from brand.js which IS
//    set on :root by ThemeContext.
// ✅ FIX: ROLE_HOME and getRoleHome moved to roleRoutes.js — no duplication.
// ✅ Waits for bootstrapReady before any auth decision (prevents flash-redirect
//    on refresh when token is valid but Redux hasn't hydrated yet).

import { Navigate }    from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  selectIsLoggedIn,
  selectRole,
  selectToken,
  selectBootstrapReady,
} from '@store/slices/authSlice'
import { getRoleHome } from './roleRoutes'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const isLoggedIn     = useSelector(selectIsLoggedIn)
  const role           = useSelector(selectRole)
  const token          = useSelector(selectToken)
  const bootstrapReady = useSelector(selectBootstrapReady)

  // Wait for /auth/me to resolve before making any redirect decision
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

  // Not authenticated → start from table detection
  if (!isLoggedIn || !token) {
    return <Navigate to="/detect" replace />
  }

  // Wrong role → redirect to their actual home
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={getRoleHome(role)} replace />
  }

  return children
}

export default ProtectedRoute