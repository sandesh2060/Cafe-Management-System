// // src/app/routes/AppRoutes.jsx
// import { Routes, Route, Navigate } from 'react-router-dom'
// import { useSelector }              from 'react-redux'
// import { selectIsLoggedIn, selectRole } from '@store/slices/authSlice'
// import { lazy, Suspense }           from 'react'
// import LoadingSpinner               from '@shared/components/feedback/LoadingSpinner'
// import ProtectedRoute               from './ProtectedRoute'

// // ── Lazy imports ──────────────────────────────────────────────────────────────
// // Customer
// const TableDetectionPage = lazy(() => import('@modules/customer/pages/TableDetectionPage'))
// const LoginPage          = lazy(() => import('@modules/customer/pages/LoginPage'))
// const MenuPage           = lazy(() => import('@modules/customer/pages/MenuPage'))
// const CartPage           = lazy(() => import('@modules/customer/pages/CartPage'))
// const TrackingPage       = lazy(() => import('@modules/customer/pages/TrackingPage'))
// const CallWaiterPage     = lazy(() => import('@modules/customer/pages/CallWaiterPage'))
// const LoyaltyPage        = lazy(() => import('@modules/customer/pages/LoyaltyPage'))
// const ProfilePage        = lazy(() => import('@modules/customer/pages/ProfilePage'))
// const PaymentPage        = lazy(() => import('@modules/customer/pages/PaymentPage'))
// const PaymentSuccessPage = lazy(() => import('@modules/customer/pages/PaymentSuccessPage'))

// // Waiter
// const WaiterDashboard    = lazy(() => import('@modules/waiter/pages/WaiterDashboard'))

// // Kitchen
// const KitchenDisplayPage = lazy(() => import('@modules/kitchen/pages/KitchenDisplayPage'))

// // Cashier
// const BillingPage        = lazy(() => import('@modules/cashier/pages/BillingPage'))

// // Manager
// const ManagerDashboard   = lazy(() => import('@modules/manager/pages/ManagerDashboard'))

// // Admin
// const AdminDashboard     = lazy(() => import('@modules/admin/pages/AdminDashboard'))

// // ── Helpers ───────────────────────────────────────────────────────────────────
// const getRoleHome = (role) => ({
//   customer: '/menu',
//   waiter:   '/waiter',
//   kitchen:  '/kitchen',
//   cashier:  '/cashier',
//   manager:  '/manager',
//   admin:    '/admin',
// }[role] || '/detect')

// // ── GuestRoute ────────────────────────────────────────────────────────────────
// const GuestRoute = ({ children }) => {
//   const isLoggedIn = useSelector(selectIsLoggedIn)
//   const role       = useSelector(selectRole)
//   if (isLoggedIn) return <Navigate to={getRoleHome(role)} replace />
//   return children
// }

// // ── Full-screen spinner ───────────────────────────────────────────────────────
// const FullSpin = () => (
//   <div className="min-h-screen flex items-center justify-center bg-cream">
//     <LoadingSpinner size="lg" />
//   </div>
// )

// // ── Routes ────────────────────────────────────────────────────────────────────
// const AppRoutes = () => {
//   const role = useSelector(selectRole)

//   return (
//     <Suspense fallback={<FullSpin />}>
//       <Routes>
//         {/* Root redirect */}
//         <Route path="/" element={<Navigate to={role ? getRoleHome(role) : '/detect'} replace />} />

//         {/* Pre-auth — no socket, no protection */}
//         <Route path="/detect" element={<TableDetectionPage />} />
//         <Route path="/login"  element={<GuestRoute><LoginPage /></GuestRoute>} />

//         {/* ── Customer ── */}
//         <Route path="/menu" element={
//           <ProtectedRoute allowedRoles={['customer']}><MenuPage /></ProtectedRoute>
//         } />
//         <Route path="/cart" element={
//           <ProtectedRoute allowedRoles={['customer']}><CartPage /></ProtectedRoute>
//         } />
//         <Route path="/track" element={
//           <ProtectedRoute allowedRoles={['customer']}><TrackingPage /></ProtectedRoute>
//         } />
//         <Route path="/call-waiter" element={
//           <ProtectedRoute allowedRoles={['customer']}><CallWaiterPage /></ProtectedRoute>
//         } />
//         <Route path="/loyalty" element={
//           <ProtectedRoute allowedRoles={['customer']}><LoyaltyPage /></ProtectedRoute>
//         } />
//         <Route path="/profile" element={
//           <ProtectedRoute allowedRoles={['customer']}><ProfilePage /></ProtectedRoute>
//         } />
//         <Route path="/payment" element={
//           <ProtectedRoute allowedRoles={['customer']}><PaymentPage /></ProtectedRoute>
//         } />
//         <Route path="/payment-success" element={
//           <ProtectedRoute allowedRoles={['customer']}><PaymentSuccessPage /></ProtectedRoute>
//         } />

//         {/* ── Waiter ── */}
//         <Route path="/waiter/*" element={
//           <ProtectedRoute allowedRoles={['waiter']}><WaiterDashboard /></ProtectedRoute>
//         } />

//         {/* ── Kitchen ── */}
//         <Route path="/kitchen/*" element={
//           <ProtectedRoute allowedRoles={['kitchen']}><KitchenDisplayPage /></ProtectedRoute>
//         } />

//         {/* ── Cashier ── */}
//         <Route path="/cashier/*" element={
//           <ProtectedRoute allowedRoles={['cashier']}><BillingPage /></ProtectedRoute>
//         } />

//         {/* ── Manager ── */}
//         <Route path="/manager/*" element={
//           <ProtectedRoute allowedRoles={['manager']}><ManagerDashboard /></ProtectedRoute>
//         } />

//         {/* ── Admin ── */}
//         <Route path="/admin/*" element={
//           <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
//         } />

//         {/* Catch-all */}
//         <Route path="*" element={<Navigate to="/" replace />} />
//       </Routes>
//     </Suspense>
//   )
// }

// export default AppRoutes

// src/app/routes/AppRoutes.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectIsLoggedIn, selectRole } from "@store/slices/authSlice";
import { lazy, Suspense } from "react";
import LoadingSpinner from "@shared/components/feedback/LoadingSpinner";
// import ProtectedRoute               from './ProtectedRoute'  // TEMP DISABLED

// ── Lazy imports ──────────────────────────────────────────────────────────────
// Customer
// const TableDetectionPage = lazy(() => import('@modules/customer/pages/TableDetectionPage'))  // TEMP DISABLED
// const LoginPage          = lazy(() => import('@modules/customer/pages/LoginPage'))            // TEMP DISABLED
const MenuPage = lazy(() => import("@modules/customer/pages/MenuPage"));
const CartPage = lazy(() => import("@modules/customer/pages/CartPage"));
const TrackingPage = lazy(() => import("@modules/customer/pages/TrackingPage"));
const CallWaiterPage = lazy(
  () => import("@modules/customer/pages/CallWaiterPage"),
);
const LoyaltyPage = lazy(() => import("@modules/customer/pages/LoyaltyPage"));
const ProfilePage = lazy(() => import("@modules/customer/pages/ProfilePage"));
const PaymentPage = lazy(() => import("@modules/customer/pages/PaymentPage"));
const PaymentSuccessPage = lazy(
  () => import("@modules/customer/pages/PaymentSuccessPage"),
);

// Waiter
const WaiterDashboard = lazy(
  () => import("@modules/waiter/pages/WaiterDashboard"),
);

// Kitchen
const KitchenDisplayPage = lazy(
  () => import("@modules/kitchen/pages/KitchenDisplayPage"),
);

// Cashier
const BillingPage = lazy(() => import("@modules/cashier/pages/BillingPage"));

// Manager
const ManagerDashboard = lazy(
  () => import("@modules/manager/pages/ManagerDashboard"),
);

// Admin
const AdminDashboard = lazy(
  () => import("@modules/admin/pages/AdminDashboard"),
);

// ── Helpers ───────────────────────────────────────────────────────────────────
// const getRoleHome = (role) => ({   // TEMP DISABLED
//   customer: '/menu',
//   waiter:   '/waiter',
//   kitchen:  '/kitchen',
//   cashier:  '/cashier',
//   manager:  '/manager',
//   admin:    '/admin',
// }[role] || '/detect')

// ── GuestRoute ────────────────────────────────────────────────────────────────
// TEMP DISABLED — no auth check needed
// const GuestRoute = ({ children }) => {
//   const isLoggedIn = useSelector(selectIsLoggedIn)
//   const role       = useSelector(selectRole)
//   if (isLoggedIn) return <Navigate to={getRoleHome(role)} replace />
//   return children
// }

// ── Full-screen spinner ───────────────────────────────────────────────────────
const FullSpin = () => (
  <div className="min-h-screen flex items-center justify-center bg-cream">
    <LoadingSpinner size="lg" />
  </div>
);

// ── Routes ────────────────────────────────────────────────────────────────────
const AppRoutes = () => {
  // const role = useSelector(selectRole)  // TEMP DISABLED

  return (
    <Suspense fallback={<FullSpin />}>
      <Routes>
        {/* TEMP: skip detect/login — go straight to menu */}
        <Route path="/" element={<Navigate to="/menu" replace />} />
        <Route path="/detect" element={<Navigate to="/menu" replace />} />
        <Route path="/login" element={<Navigate to="/menu" replace />} />

        {/* ── Customer — ProtectedRoute TEMP DISABLED ── */}
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/track" element={<TrackingPage />} />
        <Route path="/call-waiter" element={<CallWaiterPage />} />
        <Route path="/loyalty" element={<LoyaltyPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/payment-success" element={<PaymentSuccessPage />} />

        {/* ── Waiter ── */}
        <Route path="/waiter/*" element={<WaiterDashboard />} />

        {/* ── Kitchen ── */}
        <Route path="/kitchen/*" element={<KitchenDisplayPage />} />

        {/* ── Cashier ── */}
        <Route path="/cashier/*" element={<BillingPage />} />

        {/* ── Manager ── */}
        <Route path="/manager/*" element={<ManagerDashboard />} />

        {/* ── Admin ── */}
        <Route path="/admin/*" element={<AdminDashboard />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
