// frontend/src/app/routes/roleRoutes.js
//
// Single source of truth for role → home route mapping.
// Previously duplicated in AppRoutes.jsx, ProtectedRoute.jsx, GuestRoute.jsx.
// All three now import from here.

export const ROLE_HOME = {
  customer: '/menu',
  waiter:   '/waiter',
  kitchen:  '/kitchen',
  cashier:  '/cashier',
  manager:  '/manager',
  admin:    '/admin',
}

/** Returns the home route for a given role. Defaults to /detect. */
export const getRoleHome = (role) => ROLE_HOME[role] ?? '/detect'