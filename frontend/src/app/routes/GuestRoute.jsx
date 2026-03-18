// src/app/routes/GuestRoute.jsx
//
// ✅ FIX: Was missing bootstrapReady check — on refresh, isLoggedIn is false
//    for a brief moment even with a valid token (Redux not hydrated yet).
//    Without the check, logged-in users landing on /login briefly see the
//    login page before being redirected. Now waits for bootstrap first.
// ✅ FIX: getRoleHome imported from roleRoutes.js — no duplication.

import { Navigate }    from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  selectIsLoggedIn,
  selectRole,
  selectBootstrapReady,
} from '@store/slices/authSlice'
import { getRoleHome } from './roleRoutes'

const GuestRoute = ({ children }) => {
  const isLoggedIn     = useSelector(selectIsLoggedIn)
  const role           = useSelector(selectRole)
  const bootstrapReady = useSelector(selectBootstrapReady)

  // Wait for bootstrap before redirecting — prevents flash on refresh
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

  if (isLoggedIn) {
    return <Navigate to={getRoleHome(role)} replace />
  }

  return children
}

export default GuestRoute