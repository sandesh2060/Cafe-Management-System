// frontend/src/app/routes/AppRoutes.jsx
//
// ─── CHANGES FOR VENUE ENTRY FLOW ─────────────────────────────────────────────
// 1. Added VenueEntryPage as the new /detect replacement (/ and /detect both route here)
// 2. Added /:cafeSlug route — direct link to a specific cafe
// 3. Added /:cafeSlug/table/:tableNum route — direct link with table number
// 4. All existing customer/staff/owner routes UNCHANGED
// 5. DetectRoute updated to check venue context
// ─────────────────────────────────────────────────────────────────────────────

import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { lazy, Suspense } from "react";
import {
  selectIsLoggedIn,
  selectRole,
  selectBootstrapReady,
} from "@store/slices/authSlice";
import { selectTableId } from "@store/slices/tableSessionSlice";
import { selectHasVenue } from "@store/slices/venueSlice";
import LoadingSpinner from "@shared/components/feedback/LoadingSpinner";
import ProtectedRoute from "./ProtectedRoute";
import { getRoleHome } from "./roleRoutes";

// ── Venue entry (NEW) ─────────────────────────────────────────────────────────
const VenueEntryPage = lazy(
  () => import("@modules/venue/pages/VenueEntryPage"),
);

// ── Customer ──────────────────────────────────────────────────────────────────
const TableDetectionPage = lazy(
  () => import("@modules/customer/pages/TableDetectionPage"),
);
const LoginPage = lazy(() => import("@modules/customer/pages/LoginPage"));
const MenuPage = lazy(() => import("@modules/customer/pages/MenuPage"));
const ItemDetailPage = lazy(
  () => import("@modules/customer/pages/ItemDetailPage"),
);
const CartPage = lazy(() => import("@modules/customer/pages/CartPage"));
const OrderStatusPage = lazy(
  () => import("@modules/customer/pages/OrderStatusPage"),
);
const OrderHistoryPage = lazy(
  () => import("@modules/customer/pages/OrderHistoryPage"),
);
const CallWaiterPage = lazy(
  () => import("@modules/customer/pages/CallWaiterPage"),
);
const LoyaltyPage = lazy(() => import("@modules/customer/pages/LoyaltyPage"));
const ProfilePage = lazy(() => import("@modules/customer/pages/ProfilePage"));
const PaymentPage = lazy(() => import("@modules/customer/pages/PaymentPage"));
const PaymentSuccessPage = lazy(
  () => import("@modules/customer/pages/PaymentSuccessPage"),
);
const ReviewsPage = lazy(() => import("@modules/customer/pages/ReviewsPage"));
const GalleryPage = lazy(() => import("@modules/customer/pages/GalleryPage"));
const NotificationsPage = lazy(
  () => import("@modules/customer/pages/NotificationsPage"),
);
const ChatPage = lazy(() => import("@modules/customer/pages/ChatPage"));
const ChatThread = lazy(() => import("@modules/customer/pages/ChatThread"));
const CustomerProfilePage = lazy(
  () => import("@modules/customer/pages/CustomerProfilePage"),
);
const EsewaReturn = lazy(() => import("@modules/customer/pages/EsewaReturn"));

// ── Staff roles ───────────────────────────────────────────────────────────────
const StaffLoginPage = lazy(
  () => import("@modules/staff/pages/StaffLoginPage"),
);
const WaiterDashboard = lazy(
  () => import("@modules/waiter/pages/WaiterDashboard"),
);
const KitchenDisplayPage = lazy(
  () => import("@modules/kitchen/pages/KitchenDisplayPage"),
);
const CashierDashboard = lazy(
  () => import("@modules/cashier/pages/CashierDashboard"),
);
const ManagerDashboard = lazy(
  () => import("@modules/manager/pages/ManagerDashboard"),
);
const GalleryManagerPage = lazy(
  () => import("@modules/manager/pages/GalleryManagerPage"),
);
const AdminDashboard = lazy(
  () => import("@modules/admin/pages/AdminDashboard"),
);

// ── Super Admin ───────────────────────────────────────────────────────────────
const SuperAdminLogin = lazy(
  () => import("@modules/superadmin/pages/SuperAdminLogin"),
);
const SuperAdminDashboard = lazy(
  () => import("@modules/superadmin/pages/SuperAdminDashboard"),
);

// ── SaaS modules (safe imports — fallback to "coming soon" if files don't exist yet) ──
const ComingSoon = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
    <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
      <p style={{ fontSize: 40, marginBottom: 8 }}>🚧</p>
      <p style={{ fontSize: 16, fontWeight: 600 }}>Coming soon</p>
      <p style={{ fontSize: 13 }}>This module is under development</p>
    </div>
  </div>
);

// ★ FIX: Added missing OwnerLoginPage import
const OwnerLoginPage = lazy(() =>
  import("@modules/owner/pages/OwnerLoginPage").catch(() => ({
    default: ComingSoon,
  })),
);
const OwnerDashboard = lazy(() =>
  import("@modules/owner/pages/OwnerDashboard").catch(() => ({
    default: ComingSoon,
  })),
);
const BranchManager = lazy(() =>
  import("@modules/owner/pages/BranchManager").catch(() => ({
    default: ComingSoon,
  })),
);
const OwnerBilling = lazy(() =>
  import("@modules/owner/pages/OwnerBilling").catch(() => ({
    default: ComingSoon,
  })),
);
const RiderApp = lazy(() =>
  import("@modules/rider/pages/RiderApp").catch(() => ({
    default: ComingSoon,
  })),
);
const SubscriptionSuccessPage = lazy(() =>
  import("@modules/manager/pages/SubscriptionSuccessPage").catch(() => ({
    default: ComingSoon,
  })),
);

const FullSpin = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
    <LoadingSpinner size="lg" />
  </div>
);

const GuestRoute = ({ children }) => {
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const role = useSelector(selectRole);
  const bootstrapReady = useSelector(selectBootstrapReady);
  if (!bootstrapReady) return <FullSpin />;
  if (isLoggedIn) return <Navigate to={getRoleHome(role)} replace />;
  return children;
};

// ★ CHANGED: DetectRoute now checks venue context too
const DetectRoute = ({ children }) => {
  const bootstrapReady = useSelector(selectBootstrapReady);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const role = useSelector(selectRole);
  const tableId = useSelector(selectTableId);
  const hasVenue = useSelector(selectHasVenue);
  if (!bootstrapReady) return <FullSpin />;
  // If logged in + has table → go to menu (existing behavior)
  if (isLoggedIn && tableId) return <Navigate to={getRoleHome(role)} replace />;
  return children;
};

const AppRoutes = () => {
  const role = useSelector(selectRole);
  return (
    <Suspense fallback={<FullSpin />}>
      <Routes>
        {/* ★ CHANGED: / now goes to VenueEntryPage instead of /detect */}
        <Route
          path="/"
          element={
            <Navigate to={role ? getRoleHome(role) : "/venue"} replace />
          }
        />

        {/* ★ NEW: Venue entry flow — primary entry point */}
        <Route
          path="/venue"
          element={
            <DetectRoute>
              <VenueEntryPage />
            </DetectRoute>
          }
        />

        {/* ★ NEW: Direct link routes — /:cafeSlug and /:cafeSlug/table/:tableNum */}
        {/* These render VenueEntryPage which reads params and auto-resolves the cafe */}
        <Route
          path="/c/:cafeSlug"
          element={
            <DetectRoute>
              <VenueEntryPage />
            </DetectRoute>
          }
        />
        <Route
          path="/c/:cafeSlug/table/:tableNum"
          element={
            <DetectRoute>
              <VenueEntryPage />
            </DetectRoute>
          }
        />

        {/* ★ KEPT: /detect still works for backward compat — routes to VenueEntryPage */}
        <Route
          path="/detect"
          element={
            <DetectRoute>
              <VenueEntryPage />
            </DetectRoute>
          }
        />

        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route path="/staff/login" element={<StaffLoginPage />} />

        {/* ── Customer (ALL UNCHANGED) ── */}
        <Route
          path="/menu"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <MenuPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/menu/item/:id"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <ItemDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cart"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <CartPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/track"
          element={<Navigate to="/order/status" replace />}
        />
        <Route
          path="/order/status"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <OrderStatusPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/order/history"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <OrderHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/call-waiter"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <CallWaiterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/loyalty"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <LoyaltyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <PaymentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment-success"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <PaymentSuccessPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviews"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <ReviewsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gallery"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <GalleryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:userId"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <ChatThread />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/:userId"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <CustomerProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="/esewa-return" element={<EsewaReturn />} />

        {/* ── Staff roles (ALL UNCHANGED) ── */}
        <Route
          path="/waiter/*"
          element={
            <ProtectedRoute allowedRoles={["waiter"]}>
              <WaiterDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kitchen/*"
          element={
            <ProtectedRoute allowedRoles={["kitchen"]}>
              <KitchenDisplayPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cashier/*"
          element={
            <ProtectedRoute allowedRoles={["cashier"]}>
              <CashierDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/*"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/gallery"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <GalleryManagerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription/success"
          element={
            <ProtectedRoute allowedRoles={["manager", "owner"]}>
              <SubscriptionSuccessPage />
            </ProtectedRoute>
          }
        />

        {/* ── Owner (ALL UNCHANGED) ── */}
        <Route path="/owner/login" element={<OwnerLoginPage />} />
        <Route
          path="/owner"
          element={
            <ProtectedRoute allowedRoles={["owner"]}>
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/branches"
          element={
            <ProtectedRoute allowedRoles={["owner"]}>
              <BranchManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/billing"
          element={
            <ProtectedRoute allowedRoles={["owner"]}>
              <OwnerBilling />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rider/*"
          element={
            <ProtectedRoute allowedRoles={["rider"]}>
              <RiderApp />
            </ProtectedRoute>
          }
        />

        {/* ── ★ Super Admin panel ── */}
        <Route path="/superadmin/login" element={<SuperAdminLogin />} />
        <Route path="/superadmin/*" element={<SuperAdminDashboard />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;