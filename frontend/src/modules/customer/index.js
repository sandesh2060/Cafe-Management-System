// src/modules/customer/index.js  —  barrel export

// Pages
export { default as TableDetectionPage } from "./pages/TableDetectionPage";
export { default as LoginPage } from "./pages/LoginPage";
export { default as MenuPage } from "./pages/MenuPage";
export { default as CartPage } from "./pages/CartPage";
export { default as TrackingPage } from "./pages/TrackingPage";
export { default as CallWaiterPage } from "./pages/CallWaiterPage";
export { default as LoyaltyPage } from "./pages/LoyaltyPage";
export { default as ProfilePage } from "./pages/ProfilePage";
export { default as PaymentPage } from "./pages/PaymentPage";
export { default as PaymentSuccessPage } from "./pages/PaymentSuccessPage";

// Menu components
export { default as MenuGrid } from "./components/menu/MenuGrid";
export { default as MenuCard } from "./components/menu/MenuCard";
export { default as CategoryPills } from "./components/menu/CategoryPills";
export { default as SearchBar } from "./components/menu/SearchBar";
export { default as BannerSwiper } from "./components/menu/BannerSwiper";
export { default as RecommendedSection } from "./components/menu/RecommendedSection";
export { default as RecommendedCard } from "./components/menu/RecommendedCard";
export { default as WeatherBadge } from "./components/menu/WeatherBadge";
export { default as SkeletonMenuCard } from "./components/menu/SkeletonMenuCard";

// Cart components
export { default as CartItem } from "./components/cart/CartItem";
export { default as EmptyCart } from "./components/cart/EmptyCart";
export { default as LoyaltyDiscount } from "./components/cart/LoyaltyDiscount";

// Tracking components
export { default as OrderTracker } from "./components/tracking/OrderTracker";
export { default as OrderSummaryCard } from "./components/tracking/OrderSummaryCard";
export { default as EstimatedTime } from "./components/tracking/EstimatedTime";

// Call waiter components
export { default as CallWaiterSheet } from "./components/callwaiter/CallWaiterSheet";
export { default as ReasonButton } from "./components/callwaiter/ReasonButton";
export { default as CustomNoteInput } from "./components/callwaiter/CustomNoteInput";
export { default as CallStatusBanner } from "./components/callwaiter/CallStatusBanner";

// Loyalty components
export { default as TierCard } from "./components/loyalty/TierCard";
export { default as TierProgress } from "./components/loyalty/TierProgress";
export { default as TierComparison } from "./components/loyalty/TierComparison";
export { default as HowToEarn } from "./components/loyalty/HowToEarn";

// Profile components
export { default as LogoutButton } from "./components/profile/LogoutButton";
export { default as OrderHistory } from "./components/profile/OrderHistory";

// Notification components
export { default as NotificationBell } from "./components/notifications/NotificationBell";
export { default as NotificationList } from "./components/notifications/NotificationList";

// Hooks
export { useMenu } from "./hooks/useMenu";
export { useCart } from "./hooks/useCart";
export { useActiveOrder } from "./hooks/useActiveOrder";
export { useCallWaiter } from "./hooks/useCallWaiter";
export { useLoyalty } from "./hooks/useLoyalty";
export { useRecommendations } from "./hooks/useRecommendations";
export { useNotifications } from "./hooks/useNotifications";
export { useOrderHistory } from "./hooks/useOrderHistory";
export { useLogoutGuard } from "./hooks/useLogoutGuard";
export { useGpsWatcher } from "./hooks/useGpsWatcher";
export { usePaymentLogoutTrigger } from "./hooks/usePaymentLogoutTrigger";

// Services & utils
export { default as logoutService } from "./services/logoutService";
export { buildCallReasons } from "./utils/buildCallReasons";
