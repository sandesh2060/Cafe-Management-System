// src/app/routes/AppRoutes.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsLoggedIn, selectRole } from '@store/slices/authSlice'
import { lazy, Suspense } from 'react'
import LoadingSpinner from '@shared/components/feedback/LoadingSpinner'

// ── Lazy imports ─────────────────────────────────────────────────────────────
// Customer
const TableDetectionPage  = lazy(() => import('@modules/customer/pages/TableDetectionPage'))
const LoginPage           = lazy(() => import('@modules/customer/pages/LoginPage'))
const MenuPage            = lazy(() => import('@modules/customer/pages/MenuPage'))
const CartPage            = lazy(() => import('@modules/customer/pages/CartPage'))
const TrackingPage        = lazy(() => import('@modules/customer/pages/TrackingPage'))
const CallWaiterPage      = lazy(() => import('@modules/customer/pages/CallWaiterPage'))
const LoyaltyPage         = lazy(() => import('@modules/customer/pages/LoyaltyPage'))
const ProfilePage         = lazy(() => import('@modules/customer/pages/ProfilePage'))
const PaymentPage         = lazy(() => import('@modules/customer/pages/PaymentPage'))
const PaymentSuccessPage  = lazy(() => import('@modules/customer/pages/PaymentSuccessPage'))

// Waiter
const WaiterDashboard     = lazy(() => import('@modules/waiter/pages/WaiterDashboard'))

// Kitchen
const KitchenDisplayPage  = lazy(() => import('@modules/kitchen/pages/KitchenDisplayPage'))

// Cashier — BillingPage is the cashier dashboard
const BillingPage         = lazy(() => import('@modules/cashier/pages/BillingPage'))

// Manager
const ManagerDashboard    = lazy(() => import('@modules/manager/pages/ManagerDashboard'))

// Admin
const AdminDashboard      = lazy(() => import('@modules/admin/pages/AdminDashboard'))

// ── Helpers ───────────────────────────────────────────────────────────────
const getRoleHome = (role) => ({
  customer: '/menu',
  waiter:   '/waiter',
  kitchen:  '/kitchen',
  cashier:  '/cashier',
  manager:  '/manager',
  admin:    '/admin',
}[role] || '/detect')

// ── Route guards ─────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children, allowedRoles }) => {
  const isLoggedIn = useSelector(selectIsLoggedIn)
  const role       = useSelector(selectRole)
  if (!isLoggedIn) return <Navigate to="/detect" replace />
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to={getRoleHome(role)} replace />
  return children
}

const GuestRoute = ({ children }) => {
  const isLoggedIn = useSelector(selectIsLoggedIn)
  const role       = useSelector(selectRole)
  if (isLoggedIn) return <Navigate to={getRoleHome(role)} replace />
  return children
}

// ── Full-screen spinner ────────────────────────────────────────────────────
const FullSpin = () => (
  <div className="min-h-screen flex items-center justify-center bg-cream">
    <LoadingSpinner size="lg" />
  </div>
)

// ── Routes ───────────────────────────────────────────────────────────────────
const AppRoutes = () => {
  const role = useSelector(selectRole)

  return (
    <Suspense fallback={<FullSpin />}>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to={role ? getRoleHome(role) : '/detect'} replace />} />

        {/* Table detection — first step, always accessible */}
        <Route path="/detect" element={<TableDetectionPage />} />

        {/* Login */}
        <Route path="/login" element={
          <GuestRoute><LoginPage /></GuestRoute>
        } />

        {/* ── Customer ── */}
        <Route path="/menu" element={
          <ProtectedRoute allowedRoles={['customer']}><MenuPage /></ProtectedRoute>
        } />
        <Route path="/cart" element={
          <ProtectedRoute allowedRoles={['customer']}><CartPage /></ProtectedRoute>
        } />
        <Route path="/track" element={
          <ProtectedRoute allowedRoles={['customer']}><TrackingPage /></ProtectedRoute>
        } />
        <Route path="/call-waiter" element={
          <ProtectedRoute allowedRoles={['customer']}><CallWaiterPage /></ProtectedRoute>
        } />
        <Route path="/loyalty" element={
          <ProtectedRoute allowedRoles={['customer']}><LoyaltyPage /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute allowedRoles={['customer']}><ProfilePage /></ProtectedRoute>
        } />
        <Route path="/payment" element={
          <ProtectedRoute allowedRoles={['customer']}><PaymentPage /></ProtectedRoute>
        } />
        <Route path="/payment-success" element={
          <ProtectedRoute allowedRoles={['customer']}><PaymentSuccessPage /></ProtectedRoute>
        } />

        {/* ── Waiter ── */}
        <Route path="/waiter/*" element={
          <ProtectedRoute allowedRoles={['waiter']}><WaiterDashboard /></ProtectedRoute>
        } />

        {/* ── Kitchen ── */}
        <Route path="/kitchen/*" element={
          <ProtectedRoute allowedRoles={['kitchen']}><KitchenDisplayPage /></ProtectedRoute>
        } />

        {/* ── Cashier ── */}
        <Route path="/cashier/*" element={
          <ProtectedRoute allowedRoles={['cashier']}><BillingPage /></ProtectedRoute>
        } />

        {/* ── Manager ── */}
        <Route path="/manager/*" element={
          <ProtectedRoute allowedRoles={['manager']}><ManagerDashboard /></ProtectedRoute>
        } />

        {/* ── Admin ── */}
        <Route path="/admin/*" element={
          <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes