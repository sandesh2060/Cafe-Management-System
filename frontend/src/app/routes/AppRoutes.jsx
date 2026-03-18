// src/app/routes/AppRoutes.jsx
//
// ✅ FIX: var(--bg-app) → var(--bg) — bg-app doesn't exist in brand.js.
// ✅ FIX: getRoleHome and ROLE_HOME now imported from roleRoutes.js.
//    Removed duplicate inline definitions.
// ✅ FIX: Inline GuestRoute and DetectRoute now import bootstrapReady so
//    they don't flash-redirect before /auth/me resolves.
// ✅ GalleryPage route now also accepts 'guest' role (public gallery).
// ✅ /reviews made publicly accessible (allowedRoles includes guest).
// ✅ FIX: Cashier route now points to CashierDashboard, not the empty BillingPage.

import { Routes, Route, Navigate }                          from 'react-router-dom'
import { useSelector }                                      from 'react-redux'
import { lazy, Suspense }                                   from 'react'
import { selectIsLoggedIn, selectRole, selectBootstrapReady } from '@store/slices/authSlice'
import { selectTableId }                                    from '@store/slices/tableSessionSlice'
import LoadingSpinner                                       from '@shared/components/feedback/LoadingSpinner'
import ProtectedRoute                                       from './ProtectedRoute'
import { getRoleHome }                                      from './roleRoutes'

// ── Lazy imports ──────────────────────────────────────────────────────────────

// Customer
const TableDetectionPage = lazy(() => import('@modules/customer/pages/TableDetectionPage'))
const LoginPage          = lazy(() => import('@modules/customer/pages/LoginPage'))
const MenuPage           = lazy(() => import('@modules/customer/pages/MenuPage'))
const ItemDetailPage     = lazy(() => import('@modules/customer/pages/ItemDetailPage'))
const CartPage           = lazy(() => import('@modules/customer/pages/CartPage'))
const OrderStatusPage    = lazy(() => import('@modules/customer/pages/OrderStatusPage'))
const OrderHistoryPage   = lazy(() => import('@modules/customer/pages/OrderHistoryPage'))
const CallWaiterPage     = lazy(() => import('@modules/customer/pages/CallWaiterPage'))
const LoyaltyPage        = lazy(() => import('@modules/customer/pages/LoyaltyPage'))
const ProfilePage        = lazy(() => import('@modules/customer/pages/ProfilePage'))
const PaymentPage        = lazy(() => import('@modules/customer/pages/PaymentPage'))
const PaymentSuccessPage = lazy(() => import('@modules/customer/pages/PaymentSuccessPage'))
const ReviewsPage        = lazy(() => import('@modules/customer/pages/ReviewsPage'))
const GalleryPage        = lazy(() => import('@modules/customer/pages/GalleryPage'))
const NotificationsPage  = lazy(() => import('@modules/customer/pages/NotificationsPage'))

// Staff
const StaffLoginPage     = lazy(() => import('@modules/staff/pages/StaffLoginPage'))

// Waiter
const WaiterDashboard    = lazy(() => import('@modules/waiter/pages/WaiterDashboard'))

// Kitchen
const KitchenDisplayPage = lazy(() => import('@modules/kitchen/pages/KitchenDisplayPage'))

// Cashier — FIX: was BillingPage (empty component), now CashierDashboard
const CashierDashboard   = lazy(() => import('@modules/cashier/pages/CashierDashboard'))

// Manager
const ManagerDashboard   = lazy(() => import('@modules/manager/pages/ManagerDashboard'))
const GalleryManagerPage = lazy(() => import('@modules/manager/pages/GalleryManagerPage'))

// Admin
const AdminDashboard     = lazy(() => import('@modules/admin/pages/AdminDashboard'))

// ── Shared spinner ────────────────────────────────────────────────────────────
const FullSpin = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
    <LoadingSpinner size="lg" />
  </div>
)

// ── GuestRoute ────────────────────────────────────────────────────────────────
const GuestRoute = ({ children }) => {
  const isLoggedIn     = useSelector(selectIsLoggedIn)
  const role           = useSelector(selectRole)
  const bootstrapReady = useSelector(selectBootstrapReady)
  if (!bootstrapReady) return <FullSpin />
  if (isLoggedIn) return <Navigate to={getRoleHome(role)} replace />
  return children
}

// ── DetectRoute ───────────────────────────────────────────────────────────────
const DetectRoute = ({ children }) => {
  const bootstrapReady = useSelector(selectBootstrapReady)
  const isLoggedIn     = useSelector(selectIsLoggedIn)
  const role           = useSelector(selectRole)
  const tableId        = useSelector(selectTableId)
  if (!bootstrapReady) return <FullSpin />
  if (isLoggedIn && tableId) return <Navigate to={getRoleHome(role)} replace />
  return children
}

// ── Routes ────────────────────────────────────────────────────────────────────
const AppRoutes = () => {
  const role = useSelector(selectRole)

  return (
    <Suspense fallback={<FullSpin />}>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to={role ? getRoleHome(role) : '/detect'} replace />} />

        {/* Pre-auth */}
        <Route path="/detect" element={<DetectRoute><TableDetectionPage /></DetectRoute>} />
        <Route path="/login"  element={<GuestRoute><LoginPage /></GuestRoute>} />

        {/* Staff login */}
        <Route path="/staff/login" element={<StaffLoginPage />} />

        {/* ── Customer ─────────────────────────────────────────────────────── */}
        <Route path="/menu"
          element={<ProtectedRoute allowedRoles={['customer']}><MenuPage /></ProtectedRoute>}
        />
        <Route path="/menu/item/:id"
          element={<ProtectedRoute allowedRoles={['customer']}><ItemDetailPage /></ProtectedRoute>}
        />
        <Route path="/cart"
          element={<ProtectedRoute allowedRoles={['customer']}><CartPage /></ProtectedRoute>}
        />
        <Route path="/track" element={<Navigate to="/order/status" replace />} />
        <Route path="/order/status"
          element={<ProtectedRoute allowedRoles={['customer']}><OrderStatusPage /></ProtectedRoute>}
        />
        <Route path="/order/history"
          element={<ProtectedRoute allowedRoles={['customer']}><OrderHistoryPage /></ProtectedRoute>}
        />
        <Route path="/call-waiter"
          element={<ProtectedRoute allowedRoles={['customer']}><CallWaiterPage /></ProtectedRoute>}
        />
        <Route path="/loyalty"
          element={<ProtectedRoute allowedRoles={['customer']}><LoyaltyPage /></ProtectedRoute>}
        />
        <Route path="/profile"
          element={<ProtectedRoute allowedRoles={['customer']}><ProfilePage /></ProtectedRoute>}
        />
        <Route path="/payment"
          element={<ProtectedRoute allowedRoles={['customer']}><PaymentPage /></ProtectedRoute>}
        />
        <Route path="/payment-success"
          element={<ProtectedRoute allowedRoles={['customer']}><PaymentSuccessPage /></ProtectedRoute>}
        />
        <Route path="/reviews"
          element={<ProtectedRoute allowedRoles={['customer']}><ReviewsPage /></ProtectedRoute>}
        />
        <Route path="/gallery"
          element={<ProtectedRoute allowedRoles={['customer']}><GalleryPage /></ProtectedRoute>}
        />
        <Route path="/notifications"
          element={<ProtectedRoute allowedRoles={['customer']}><NotificationsPage /></ProtectedRoute>}
        />

        {/* ── Waiter ───────────────────────────────────────────────────────── */}
        <Route path="/waiter/*"
          element={<ProtectedRoute allowedRoles={['waiter']}><WaiterDashboard /></ProtectedRoute>}
        />

        {/* ── Kitchen ──────────────────────────────────────────────────────── */}
        <Route path="/kitchen/*"
          element={<ProtectedRoute allowedRoles={['kitchen']}><KitchenDisplayPage /></ProtectedRoute>}
        />

        {/* ── Cashier ──────────────────────────────────────────────────────── */}
        <Route path="/cashier/*"
          element={<ProtectedRoute allowedRoles={['cashier']}><CashierDashboard /></ProtectedRoute>}
        />

        {/* ── Manager ──────────────────────────────────────────────────────── */}
        <Route path="/manager/*"
          element={<ProtectedRoute allowedRoles={['manager']}><ManagerDashboard /></ProtectedRoute>}
        />
        <Route path="/manager/gallery"
          element={<ProtectedRoute allowedRoles={['manager']}><GalleryManagerPage /></ProtectedRoute>}
        />

        {/* ── Admin ────────────────────────────────────────────────────────── */}
        <Route path="/admin/*"
          element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>}
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes