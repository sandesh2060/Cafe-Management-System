// src/app/routes/GuestRoute.jsx
//
// Redirects already-authenticated users away from guest-only pages
// (e.g. /login, /detect) to their role's home route.
//
// Used in AppRoutes.jsx:
//   <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
//
// NOTE: AppRoutes.jsx already inlines this component locally.
// This standalone file exists so other route files or tests can import it
// without pulling in all of AppRoutes.

import { Navigate }    from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsLoggedIn, selectRole } from '@store/slices/authSlice'

const ROLE_HOME = {
  customer: '/menu',
  waiter:   '/waiter',
  kitchen:  '/kitchen',
  cashier:  '/cashier',
  manager:  '/manager',
  admin:    '/admin',
}

const getRoleHome = (role) => ROLE_HOME[role] ?? '/detect'

/**
 * GuestRoute — wraps pages that should only be visible to unauthenticated users.
 * If the user is already logged in, redirects to their role's home page.
 */
const GuestRoute = ({ children }) => {
  const isLoggedIn = useSelector(selectIsLoggedIn)
  const role       = useSelector(selectRole)

  if (isLoggedIn) {
    return <Navigate to={getRoleHome(role)} replace />
  }

  return children
}

export default GuestRoute