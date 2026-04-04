// frontend/src/app/routes/roleRoutes.js
//
// ─── CHANGES FROM ORIGINAL ────────────────────────────────────────────────────
// 1. Added owner → /owner home route
// 2. Added rider → /rider home route
// ─────────────────────────────────────────────────────────────────────────────

export const ROLE_HOME = {
  customer: '/menu',
  waiter:   '/waiter',
  kitchen:  '/kitchen',
  cashier:  '/cashier',
  manager:  '/manager',
  admin:    '/admin',
  owner:    '/owner',      // ★ new
  rider:    '/rider',      // ★ new
}

export const getRoleHome = (role) => ROLE_HOME[role] ?? '/detect'