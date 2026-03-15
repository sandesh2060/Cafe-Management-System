// src/app/routes/ProtectedRoute.jsx
//
// FIXES:
// • bootstrap loading state — App.jsx dispatches setBootstrapReady(true) after
//   /auth/me resolves. ProtectedRoute waits for that before redirecting, so the
//   brief window where token is in localStorage but Redux isLoggedIn=false
//   no longer bounces the user back to /detect on every refresh.
// • useSocket() removed — App.jsx/AppInner already calls useSocket() for the
//   whole app. Calling it again here connected the socket twice per route mount.
// • Redirect on no-session goes to /detect (table detection), not /login, so
//   users without a table session start the correct flow.

import { Navigate }    from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  selectIsLoggedIn,
  selectRole,
  selectToken,
  selectBootstrapReady,   // new selector — see authSlice fix below
} from '@store/slices/authSlice'

const ROLE_HOME = {
  customer: '/menu',
  waiter:   '/waiter',
  kitchen:  '/kitchen',
  cashier:  '/cashier',
  manager:  '/manager',
  admin:    '/admin',
}

const getRoleHome = (role) => ROLE_HOME[role] ?? '/detect'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const isLoggedIn      = useSelector(selectIsLoggedIn)
  const role            = useSelector(selectRole)
  const token           = useSelector(selectToken)
  const bootstrapReady  = useSelector(selectBootstrapReady)

  // ── Wait for App bootstrap before making any auth decision ────────────────
  // Without this, there's a race: token is in localStorage but Redux hasn't
  // finished the /auth/me call yet → isLoggedIn=false → redirect to /detect.
  if (!bootstrapReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)]">
        <div className="w-8 h-8 border-2 border-[var(--saffron)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Not authenticated → start from table detection ────────────────────────
  if (!isLoggedIn || !token) {
    return <Navigate to="/detect" replace />
  }

  // ── Wrong role → redirect to their actual home ───────────────────────────
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={getRoleHome(role)} replace />
  }

  return children
}

export default ProtectedRoute