// src/app/routes/ProtectedRoute.jsx
import { Navigate }    from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsLoggedIn, selectRole, selectToken } from '@store/slices/authSlice'
import { useSocket }   from '@shared/hooks/useSocket'

const getRoleHome = (role) => ({
  customer: '/menu',
  waiter:   '/waiter',
  kitchen:  '/kitchen',
  cashier:  '/cashier',
  manager:  '/manager',
  admin:    '/admin',
}[role] || '/detect')

const ProtectedRoute = ({ children, allowedRoles }) => {
  const isLoggedIn = useSelector(selectIsLoggedIn)
  const role       = useSelector(selectRole)
  const token      = useSelector(selectToken)

  // ── Hard gate: no token = no socket, no render ────────────────
  // Redirect immediately before useSocket() is ever called.
  // This is the critical safety net — even if App bootstrap is still
  // in flight, we never let useSocket fire without a confirmed token.
  if (!isLoggedIn || !token) return <Navigate to="/detect" replace />

  // ── Wrong role → redirect to their home ───────────────────────
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={getRoleHome(role)} replace />
  }

  // ── Token confirmed in Redux → safe to connect socket ─────────
  return <AuthenticatedRoute>{children}</AuthenticatedRoute>
}

// Separate component so useSocket only mounts AFTER the guards above pass
const AuthenticatedRoute = ({ children }) => {
  useSocket()
  return children
}

export default ProtectedRoute