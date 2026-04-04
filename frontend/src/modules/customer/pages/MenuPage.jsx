// src/modules/customer/pages/MenuPage.jsx
//
// ─── CHANGES FROM PREVIOUS VERSION ───────────────────────────────────────────
// ★ Module 22 — Dynamic Pricing:
//   1. HappyHourBanner imported + rendered below navbar island in portal
//   2. usePricingRules hook called with CAFE_ID — fetches active rules once,
//      stays live via socket events (pricing:rule_activated / expired)
//   3. getBadge passed to MenuGrid so each MenuCard gets its discount badge
//
// All remote mode, GSAP, search, scroll, animations — IDENTICAL, UNCHANGED.
// ─────────────────────────────────────────────────────────────────────────────

import {
  useEffect,
  useRef,
  useContext,
  useState,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import {
  fetchMenu,
  selectFilteredItems,
  selectAllItems,
  selectCategories,
  selectActiveCategory,
  selectSearchQuery,
  selectMenuLoading,
  selectMenuLoaded,
  setActiveCategory,
  setSearchQuery,
} from "@store/slices/menuSlice";
import { selectUser } from "@store/slices/authSlice";
import { selectCallStatus } from "@store/slices/callWaiterSlice";
import { selectTableNumber } from "@store/slices/tableSessionSlice";
import {
  selectActiveOrder,
  selectOrderHistory,
} from "@store/slices/orderSlice";
import { selectTier } from "@store/slices/loyaltySlice";
import {
  selectVenueCafeId,
  selectVenueName,
  selectIsRemote,
  selectIsAtVenue,
} from "@store/slices/venueSlice";
// remoteOrderSlice selectors now used inside FloatingActions
import { ThemeContext } from "@shared/context/ThemeContext";
import { BRAND, getPalette } from "@shared/config/brand";
import { useDeviceTier } from "@shared/hooks/useDeviceTier";
import FloatingActions from "../components/menu/FloatingActions";
import RecommendedSection from "../components/menu/RecommendedSection";
import MenuGrid from "../components/menu/MenuGrid";
import SkeletonMenuCard from "../components/menu/SkeletonMenuCard";
import CategoryPills from "../components/menu/CategoryPills";
import WelcomeCard from "../components/menu/WelcomeCard";
import QuoteOrderCard from "../components/menu/QuoteOrderCard";
import NavAvatar from "../components/menu/NavAvatar";
import NotificationBell from "../components/notifications/NotificationBell";
import {
  ExploreToastPortal,
  useExploreToasts,
} from "../components/notifications/ExploreToasts";
import CallStatusBanner from "../components/callwaiter/CallStatusBanner";
import MenuTour from "../components/menu/MenuTour";
// RemoteOrderBanner now lives inside FloatingActions (bottom)
// AddressSheet now lives inside FloatingActions
// ★ NEW: Module 22
import HappyHourBanner from "../components/pricing/HappyHourBanner";
import { usePricingRules } from "../hooks/usePricingRules";
import { useRecommendations } from "../hooks/useRecommendations";
import { usePaymentLogoutTrigger } from "../hooks/usePaymentLogoutTrigger";
import { useActiveOrder } from "../hooks/useActiveOrder";
import { useNotifications } from "../hooks/useNotifications";
import { Search, X, Sparkles, ChevronUp } from "lucide-react";
import { useLenis } from "lenis/react";
import { CustomersSection } from "../components/menu/CustomersSection";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const BRAND_CAFE_ID = BRAND.cafeId ?? "demo";

const selectCartCount = (state) =>
  (state.cart?.items ?? []).reduce((s, i) => s + (i.quantity ?? 1), 0);

const getTimeSlot = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 8) return "earlybird";
  if (h >= 8 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "latenight";
};

const analyseHistory = (history = []) => {
  if (!history.length)
    return { favouriteItem: null, favouriteCategory: null, visitCount: 0 };
  const itemFreq = {};
  const catFreq = {};
  history.forEach((order) => {
    (order.items ?? []).forEach((item) => {
      const name = item.name ?? item.menuItemId;
      const cat = item.category ?? "unknown";
      itemFreq[name] = (itemFreq[name] ?? 0) + item.quantity;
      catFreq[cat] = (catFreq[cat] ?? 0) + item.quantity;
    });
  });
  return {
    favouriteItem:
      Object.entries(itemFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    favouriteCategory:
      Object.entries(catFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    visitCount: history.length,
  };
};

const buildSuggestions = (allItems, query) => {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase().trim();
  const seen = new Set();
  const results = [];
  for (const item of allItems) {
    const name = item.name ?? "";
    const cat = item.category ?? "";
    if (
      (name.toLowerCase().includes(q) || cat.toLowerCase().includes(q)) &&
      !seen.has(name.toLowerCase())
    ) {
      seen.add(name.toLowerCase());
      results.push({ name, category: cat, emoji: item.emoji ?? "🍽️" });
      if (results.length >= 5) break;
    }
  }
  return results;
};

const HighlightMatch = ({ text, query, isDark }) => {
  const P = getPalette(isDark);
  if (!query) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark
        style={{
          background: P.accentDim,
          color: P.accent,
          borderRadius: 3,
          padding: "0 1px",
          fontWeight: 800,
        }}
      >
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
};

const MenuSkeleton = () => (
  <div className="px-4 pt-4" aria-hidden="true">
    <div className="skeleton rounded-[20px] h-28 mb-5" />
    <div className="skeleton rounded-2xl h-5 mb-3 w-1/3" />
    <div className="flex gap-3 overflow-hidden mb-5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton rounded-2xl flex-shrink-0 w-[140px] h-[168px]" />
      ))}
    </div>
    <div className="flex gap-2 overflow-hidden mb-5">
      {[80, 96, 72, 88, 64, 80].map((w, i) => (
        <div key={i} className="skeleton rounded-full flex-shrink-0 h-8" style={{ width: w }} />
      ))}
    </div>
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => <SkeletonMenuCard key={i} />)}
    </div>
  </div>
);

const MenuPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const items = useSelector(selectFilteredItems);
  const allItems = useSelector(selectAllItems);
  const categories = useSelector(selectCategories);
  const activeCategory = useSelector(selectActiveCategory);
  const searchQuery = useSelector(selectSearchQuery);
  const menuLoading = useSelector(selectMenuLoading);
  const menuLoaded = useSelector(selectMenuLoaded);
  const callStatus = useSelector(selectCallStatus);
  const tableNumber = useSelector(selectTableNumber);
  const cartCount = useSelector(selectCartCount);
  const activeOrder = useSelector(selectActiveOrder);
  const orderHistory = useSelector(selectOrderHistory);
  const tier = useSelector(selectTier);
  const { isDark: D } = useContext(ThemeContext);
  const P = getPalette(D);

  const venueCafeId      = useSelector(selectVenueCafeId);
  const venueName        = useSelector(selectVenueName);
  const isRemote         = useSelector(selectIsRemote);
  const isAtVenue        = useSelector(selectIsAtVenue);

  const CAFE_ID = venueCafeId ?? BRAND_CAFE_ID;

  // ★ NEW: Module 22 — live pricing rules for badge lookup
  const { getBadge } = usePricingRules(CAFE_ID);

  const { gsapEnabled } = useDeviceTier();
  const { recommendations, loading: recLoading, weather: recWeather } = useRecommendations(CAFE_ID);

  usePaymentLogoutTrigger();
  useActiveOrder();
  useNotifications({ weather: recWeather, orderHistory });

  const lenis = useLenis();

  const { favouriteItem, favouriteCategory, visitCount } = useMemo(
    () => analyseHistory(orderHistory), [orderHistory],
  );
  const timeSlot = useMemo(() => getTimeSlot(), []);

  const { toasts: exploreToasts, dismissToast: dismissExplore, navigateTo: exploreNavigate } = useExploreToasts({
    weather: recWeather, orderHistory, activeOrder,
    visitCount, favouriteItem, favouriteCategory, tier, timeSlot,
  });

  const contentReady = menuLoaded && !recLoading;

  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions,   setSuggestions]   = useState([]);
  const [activeIdx,     setActiveIdx]     = useState(-1);
  const [showTour,      setShowTour]      = useState(false);
  const [didAnimate,    setDidAnimate]    = useState(false);

  const islandRef      = useRef(null);
  const islandInnerRef = useRef(null);
  const glowRef        = useRef(null);
  const brandRef       = useRef(null);
  const avatarWrapRef  = useRef(null);
  const navRightRef    = useRef(null);
  const searchBtnRef   = useRef(null);
  const searchRowRef   = useRef(null);
  const searchInputRef = useRef(null);
  const searchFieldRef = useRef(null);
  const clearBtnRef    = useRef(null);
  const suggestDropRef = useRef(null);
  const welcomeRef     = useRef(null);
  const recRef         = useRef(null);
  const gridRef        = useRef(null);
  const scrollBtnRef   = useRef(null);
  const shimmerRef     = useRef(null);
  const contentRef     = useRef(null);
  const tourRef        = useRef(false);

  useEffect(() => {
    if (!menuLoaded && !menuLoading) dispatch(fetchMenu(CAFE_ID));
  }, [dispatch, menuLoaded, menuLoading, CAFE_ID]);

  const handleTourComplete = useCallback(() => {
    setShowTour(false);
    localStorage.setItem("mp-tour-done", "1");
  }, []);

  useEffect(() => {
    if (!contentReady || tourRef.current) return;
    if (localStorage.getItem("mp-tour-done")) return;
    tourRef.current = true;
    const t = setTimeout(() => setShowTour(true), 1400);
    return () => clearTimeout(t);
  }, [contentReady]);

  useLayoutEffect(() => {
    if (scrollBtnRef.current) {
      gsap.set(scrollBtnRef.current, { scale: 0, opacity: 0 });
      scrollBtnRef.current.style.pointerEvents = "none";
    }
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const btn = scrollBtnRef.current;
      if (!btn) return;
      if (e.detail.open) {
        btn.style.pointerEvents = "none";
        gsap.to(btn, { scale: 0, opacity: 0, duration: 0.18, ease: "power2.in", overwrite: true });
      }
    };
    window.addEventListener("drawerchange", handler);
    return () => window.removeEventListener("drawerchange", handler);
  }, []);

  useEffect(() => {
    if (!islandRef.current) return;
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.fromTo(islandRef.current, { y: -40, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.72, clearProps: "scale" }, 0);
    if (glowRef.current)
      tl.fromTo(glowRef.current, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.7, ease: "power2.out" }, 0.3);
    const kids = islandInnerRef.current ? Array.from(islandInnerRef.current.children) : [];
    if (kids.length)
      tl.fromTo(kids, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.07, ease: "power2.out" }, 0.4);
    if (shimmerRef.current)
      tl.fromTo(shimmerRef.current, { x: "-120%" }, { x: "120%", duration: 0.9, ease: "power2.out" }, 0.5);
  }, []);

  useEffect(() => {
    if (!shimmerRef.current || !gsapEnabled) return;
    let killed = false;
    const loop = () => {
      if (killed || !shimmerRef.current) return;
      gsap.fromTo(shimmerRef.current, { x: "-120%" }, { x: "120%", duration: 2.8, ease: "none", delay: 4, onComplete: loop });
    };
    const t = setTimeout(loop, 2600);
    return () => { killed = true; clearTimeout(t); gsap.killTweensOf(shimmerRef.current); };
  }, [gsapEnabled]);

  useEffect(() => {
    if (!contentReady || didAnimate) return;
    setDidAnimate(true);
    if (window.__scrollRestoring) {
      const saved = parseFloat(sessionStorage.getItem(`_sy_${window.__restoreKey ?? ""}`)) || 0;
      if (saved > 0) {
        requestAnimationFrame(() => {
          window.scrollTo({ top: saved, behavior: "instant" });
          if (lenis) lenis.scrollTo(saved, { immediate: true });
          setTimeout(() => {
            window.scrollTo({ top: saved, behavior: "instant" });
            if (lenis) lenis.scrollTo(saved, { immediate: true });
            window.__scrollRestoring = false;
          }, 100);
        });
      } else { window.__scrollRestoring = false; }
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      if (lenis) lenis.scrollTo(0, { immediate: true });
    }
    if (!contentRef.current) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.fromTo(contentRef.current, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power2.out", clearProps: "opacity" });
        const cards = [welcomeRef.current, recRef.current].filter(Boolean);
        if (cards.length) gsap.fromTo(cards, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out", stagger: 0.07, delay: 0.06, clearProps: "opacity" });
      });
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, [contentReady, didAnimate, lenis]);

  useEffect(() => {
    const pill = islandRef.current;
    if (!pill) return;
    const s = { visible: true, morphed: false, lastY: window.scrollY, vel: 0, upDist: 0, ticking: false, rafId: null, fabVisible: false };
    const HIDE_VEL = 3.5, SHOW_DIST = 36, MORPH_Y = 55, FAB_Y = 260, TOP = 48, DECAY = 0.68, HIDE_Y = -120;
    const getY = () => { const ly = lenis?.scroll; return typeof ly === "number" && isFinite(ly) && ly >= 0 ? ly : window.scrollY; };
    const showNavbar = () => {
      s.visible = true;
      gsap.killTweensOf(pill);
      if (glowRef.current) gsap.killTweensOf(glowRef.current);
      gsap.fromTo(pill, { y: HIDE_Y, opacity: 0 }, { y: 0, opacity: 1, duration: 0.46, ease: "expo.out", overwrite: true, force3D: true });
      gsap.fromTo(pill, { scale: 0.93 }, { scale: 1, duration: 0.55, ease: "back.out(2.4)", delay: 0.06, overwrite: "auto", force3D: true, clearProps: "scale" });
      if (glowRef.current) gsap.fromTo(glowRef.current, { opacity: 0, scale: 0.8 }, { opacity: 0.5, scale: 1, duration: 0.5, ease: "power3.out", delay: 0.04, overwrite: true });
    };
    const hideNavbar = () => {
      s.visible = false; s.upDist = 0;
      gsap.killTweensOf(pill);
      if (glowRef.current) gsap.killTweensOf(glowRef.current);
      gsap.to(pill, { y: HIDE_Y, opacity: 0, duration: 0.24, ease: "power3.in", overwrite: true, force3D: true });
      if (glowRef.current) gsap.to(glowRef.current, { opacity: 0, duration: 0.15, ease: "power2.in", overwrite: true });
    };
    const update = () => {
      s.ticking = false;
      const y = getY(), raw = y - s.lastY;
      s.lastY = y;
      if (raw === 0) return;
      s.vel = s.vel * DECAY + raw * (1 - DECAY);
      s.upDist = raw < 0 ? s.upDist + Math.abs(raw) : 0;
      const atTop = y < TOP;
      if (s.visible && !atTop && s.vel > HIDE_VEL) hideNavbar();
      else if (!s.visible && (atTop || (s.vel < -0.5 && s.upDist >= SHOW_DIST))) showNavbar();
      const shouldMorph = y > MORPH_Y;
      if (shouldMorph !== s.morphed) {
        s.morphed = shouldMorph;
        gsap.to(pill, { borderRadius: shouldMorph ? 999 : 28, duration: 0.45, ease: "power3.out", overwrite: "auto" });
      }
      if (scrollBtnRef.current) {
        const showFab = y > FAB_Y && !window.__drawerOpen;
        if (showFab && !s.fabVisible) {
          s.fabVisible = true;
          scrollBtnRef.current.style.pointerEvents = "auto";
          gsap.to(scrollBtnRef.current, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2.2)", overwrite: true });
        } else if (!showFab && s.fabVisible) {
          s.fabVisible = false;
          scrollBtnRef.current.style.pointerEvents = "none";
          gsap.to(scrollBtnRef.current, { scale: 0, opacity: 0, duration: 0.2, ease: "power2.in", overwrite: true });
        }
      }
    };
    const onScroll = () => { if (!s.ticking) { s.ticking = true; s.rafId = requestAnimationFrame(update); } };
    if (lenis) lenis.on("scroll", onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (lenis) lenis.off("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
      if (s.rafId) cancelAnimationFrame(s.rafId);
      gsap.set(pill, { clearProps: "y,opacity,scale,borderRadius" });
    };
  }, [lenis]);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    const navIcons = Array.from(navRightRef.current?.children ?? []).filter(el => el !== searchBtnRef.current);
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.to(brandRef.current, { opacity: 0, x: -10, duration: 0.18 }, 0);
    tl.to(avatarWrapRef.current, { opacity: 0, scale: 0.8, duration: 0.15 }, 0);
    tl.to(navIcons, { opacity: 0, scale: 0.7, duration: 0.15, stagger: 0.04 }, 0);
    tl.to(searchBtnRef.current, { rotate: 90, duration: 0.24, ease: "back.out(3)" }, 0);
    tl.set(searchRowRef.current, { display: "block" }, 0.12);
    tl.fromTo(searchRowRef.current, { height: 0, opacity: 0, marginTop: 0 }, { height: "auto", opacity: 1, marginTop: 8, duration: 0.35, ease: "expo.out" }, 0.12);
    tl.fromTo(searchInputRef.current, { scaleX: 0.82, opacity: 0, transformOrigin: "right center" }, { scaleX: 1, opacity: 1, duration: 0.4, ease: "expo.out", clearProps: "transform", onComplete: () => searchFieldRef.current?.focus() }, 0.2);
  }, []);

  const closeSearch = useCallback(() => {
    if (searchQuery) { dispatch(setSearchQuery("")); searchFieldRef.current?.focus(); return; }
    setSuggestions([]); setActiveIdx(-1);
    const navIcons = Array.from(navRightRef.current?.children ?? []).filter(el => el !== searchBtnRef.current);
    const tl = gsap.timeline({
      defaults: { ease: "power3.inOut" },
      onComplete: () => { setSearchOpen(false); gsap.set(searchRowRef.current, { display: "none", height: 0, opacity: 0, marginTop: 0 }); },
    });
    tl.to(searchInputRef.current, { opacity: 0, scaleX: 0.86, duration: 0.18 }, 0);
    tl.to(searchRowRef.current, { height: 0, opacity: 0, marginTop: 0, duration: 0.26 }, 0.06);
    tl.to(searchBtnRef.current, { rotate: 0, duration: 0.24, ease: "back.out(2)", clearProps: "transform" }, 0);
    tl.to(brandRef.current, { opacity: 1, x: 0, duration: 0.3, clearProps: "transform" }, 0.14);
    tl.to(avatarWrapRef.current, { opacity: 1, scale: 1, duration: 0.28, ease: "back.out(2)", clearProps: "transform" }, 0.14);
    tl.to(navIcons, { opacity: 1, scale: 1, duration: 0.28, stagger: 0.05, ease: "back.out(2)", clearProps: "transform" }, 0.16);
  }, [dispatch, searchQuery]);

  useEffect(() => {
    if (!clearBtnRef.current) return;
    gsap.to(clearBtnRef.current, searchQuery
      ? { scale: 1, opacity: 1, rotate: 0, duration: 0.24, ease: "back.out(2.5)", clearProps: "transform" }
      : { scale: 0, opacity: 0, rotate: 45, duration: 0.16, ease: "power2.in" });
  }, [searchQuery]);

  useEffect(() => {
    const els = [welcomeRef.current, recRef.current].filter(Boolean);
    if (!els.length) return;
    if (searchQuery) {
      gsap.to(els, { opacity: 0, y: -12, height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0, duration: 0.32, ease: "power3.in", stagger: 0.05, overwrite: "auto", onComplete: () => els.forEach(el => { el.style.visibility = "hidden"; el.style.pointerEvents = "none"; }) });
    } else {
      els.forEach(el => { el.style.visibility = ""; el.style.pointerEvents = ""; el.style.height = ""; });
      gsap.fromTo(els, { opacity: 0, y: -10 }, { opacity: 1, y: 0, height: "auto", duration: 0.45, ease: "expo.out", stagger: 0.07, overwrite: "auto", clearProps: "height,padding,margin" });
    }
  }, [searchQuery]);

  useEffect(() => {
    if (!searchFocused || !searchOpen) { setSuggestions([]); return; }
    setSuggestions(buildSuggestions(allItems, searchQuery));
    setActiveIdx(-1);
  }, [searchQuery, searchFocused, searchOpen, allItems]);

  useEffect(() => {
    if (!suggestDropRef.current || suggestions.length === 0) return;
    gsap.fromTo(suggestDropRef.current, { opacity: 0, y: -6, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.18, ease: "power2.out" });
  }, [suggestions.length]);

  const handleSuggestionSelect = useCallback((name) => {
    dispatch(setSearchQuery(name)); setSuggestions([]); setActiveIdx(-1); searchFieldRef.current?.blur();
  }, [dispatch]);

  const handleSearchKeyDown = useCallback((e) => {
    if (!suggestions.length) { if (e.key === "Escape") closeSearch(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); }
    else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); handleSuggestionSelect(suggestions[activeIdx].name); }
    else if (e.key === "Escape") { setSuggestions([]); closeSearch(); }
  }, [suggestions, activeIdx, handleSuggestionSelect, closeSearch]);

  const handleIslandHover = useCallback((entering) => {
    if (!islandRef.current || !glowRef.current) return;
    gsap.to(islandRef.current, { y: entering ? -2 : 0, duration: entering ? 0.35 : 0.5, ease: entering ? "power2.out" : "elastic.out(1.2,0.6)", overwrite: "auto" });
    gsap.to(glowRef.current, { opacity: entering ? 0.85 : 0.5, scale: entering ? 1.12 : 1, duration: 0.4, ease: "power2.out", overwrite: "auto" });
  }, []);

  const handleScrollTop = useCallback(() => {
    if (scrollBtnRef.current) gsap.fromTo(scrollBtnRef.current, { scale: 0.82 }, { scale: 1, duration: 0.55, ease: "elastic.out(1.2,0.5)" });
    if (lenis) lenis.scrollTo(0, { duration: 0.75, easing: t => 1 - Math.pow(1 - t, 3) });
    else gsap.to(window, { scrollTo: { y: 0 }, duration: 0.75, ease: "power3.inOut" });
  }, [lenis]);

  const pressIcon = useCallback((el) => {
    if (!el) return;
    gsap.timeline()
      .to(el, { scale: 0.82, duration: 0.1, ease: "power2.in" })
      .to(el, { scale: 1.08, duration: 0.28, ease: "back.out(3)" })
      .to(el, { scale: 1, duration: 0.2, ease: "power2.out" });
  }, []);

  const fabBottom = cartCount > 0
    ? "calc(env(safe-area-inset-bottom, 0px) + 88px)"
    : "calc(env(safe-area-inset-bottom, 0px) + 20px)";

  const showDropdown = searchFocused && searchOpen && suggestions.length > 0;

  // RemoteOrderBanner is now at bottom (inside FloatingActions), so no extra top padding
  const contentPaddingTop = "calc(env(safe-area-inset-top,0px) + 80px)";

  return (
    <div className="min-h-dvh flex flex-col relative" style={{ background: "var(--bg)", touchAction: "pan-y", isolation: "isolate" }}>

      {/* ── Navbar island portal ── */}
      {createPortal(
        <div className="fixed top-0 inset-x-0 z-50 flex flex-col" style={{ paddingTop: "env(safe-area-inset-top,0px)", pointerEvents: "none", willChange: "transform" }}>

          {/* Floating island */}
          <div className="flex justify-center px-4">
            <div ref={glowRef} aria-hidden className="absolute w-80 h-20 rounded-full"
              style={{ top: "calc(env(safe-area-inset-top,0px) + 10px)", left: "50%", transform: "translateX(-50%)", background: `radial-gradient(ellipse,${P.accentGlow} 0%,${P.accentDim} 50%,transparent 75%)`, filter: "blur(18px)", opacity: 0.5 }}
            />
            <div ref={islandRef} data-tour="island"
              onMouseEnter={() => handleIslandHover(true)}
              onMouseLeave={() => handleIslandHover(false)}
              className="w-full rounded-[28px] px-4 py-[10px] relative overflow-visible mt-[14px]"
              style={{ maxWidth: "min(480px,calc(100vw - 16px))", background: D ? "rgba(16,12,8,0.38)" : "rgba(255,255,255,0.28)", border: D ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.55)", boxShadow: D ? "0 8px 32px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset" : "0 4px 24px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.80) inset", backdropFilter: "blur(28px) saturate(180%)", WebkitBackdropFilter: "blur(28px) saturate(180%)", transform: "translate3d(0,0,0)", pointerEvents: "auto" }}
            >
              <div ref={shimmerRef} aria-hidden className="absolute inset-y-0 left-0 w-[38%] pointer-events-none z-[1]"
                style={{ background: D ? `linear-gradient(105deg,transparent 0%,${P.cardShimmer} 35%,rgba(255,255,255,0.08) 50%,${P.cardShimmer} 65%,transparent 100%)` : `linear-gradient(105deg,transparent 0%,${P.cardShimmer} 35%,rgba(255,255,255,0.28) 50%,${P.cardShimmer} 65%,transparent 100%)`, transform: "translateX(-120%)" }}
              />
              <div aria-hidden className="absolute top-0 left-[8%] right-[8%] h-px pointer-events-none z-[2]" style={{ background: "var(--top-glow)", opacity: D ? 0.5 : 0.4 }} />
              <div aria-hidden className="absolute bottom-0 left-[15%] right-[15%] h-px pointer-events-none z-[2]" style={{ background: "var(--top-glow)", opacity: D ? 0.45 : 0.35 }} />

              <div ref={islandInnerRef} className="relative z-[3] flex items-center justify-between gap-2 min-w-0">
                <div ref={avatarWrapRef} className="relative flex-shrink-0">
                  <div className="absolute inset-[-3px] rounded-full pointer-events-none" style={{ background: `conic-gradient(from 0deg,${P.accent},${P.accentDark},#FFD580,${P.accent})`, filter: "blur(5px)", opacity: 0.45, animation: "mp-halo-spin 4s linear infinite" }} />
                  <div className="relative z-[1]">
                    <NavAvatar name={user?.name} avatar={user?.avatar} isOnline onClick={() => navigate("/profile")} />
                  </div>
                </div>

                <div ref={brandRef} className="flex-1 flex justify-center min-w-0 overflow-hidden">
                  {tableNumber && !isRemote ? (
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full flex-shrink-0" style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-border)" }}>
                      <span className="text-sm">🪑</span>
                      <div className="flex flex-col gap-[1px]">
                        <span className="text-[8px] font-bold tracking-[0.14em] uppercase leading-none" style={{ color: "var(--text-muted)" }}>Table</span>
                        <span className="text-[16px] font-black tracking-[-0.04em] leading-none" style={{ background: P.accentGradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{tableNumber}</span>
                      </div>
                    </div>
                  ) : isRemote ? (
                    /* ★ Clean premium remote venue display */
                    <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/[0.18]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase leading-none">Remote</span>
                      </div>
                      {venueName && (
                        <span className="text-[12px] font-semibold truncate max-w-[120px]" style={{ color: D ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)" }}>
                          {venueName}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: "var(--text-muted)" }}>{BRAND.name}</span>
                  )}
                </div>

                <div ref={navRightRef} className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="relative z-[2] flex items-center justify-center w-[38px] h-[38px] rounded-xl flex-shrink-0 cursor-pointer" style={{ background: "var(--pill-bg)", border: "1px solid var(--pill-border)", boxShadow: D ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 6px rgba(0,0,0,0.05)", touchAction: "manipulation" }}>
                    <NotificationBell onClick={() => pressIcon(navRightRef.current?.children[0])} />
                  </div>
                  <button ref={searchBtnRef}
                    onClick={() => { pressIcon(searchBtnRef.current); setTimeout(() => (searchOpen ? closeSearch() : openSearch()), 80); }}
                    aria-label={searchOpen ? "Close search" : "Open search"}
                    aria-expanded={searchOpen}
                    className="relative z-[1] flex items-center justify-center w-[38px] h-[38px] rounded-xl flex-shrink-0 cursor-pointer outline-none [-webkit-tap-highlight-color:transparent] transition-colors duration-150"
                    style={{ background: searchOpen ? "var(--pill-bg-active)" : "var(--pill-bg)", border: `1px solid ${searchOpen ? "var(--pill-border-active)" : "var(--pill-border)"}`, color: searchOpen ? "var(--accent)" : "var(--text-muted)", boxShadow: D ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 6px rgba(0,0,0,0.05)", touchAction: "manipulation" }}
                  >
                    {searchOpen ? <X size={16} strokeWidth={2.2} /> : <Search size={16} strokeWidth={1.9} />}
                  </button>
                </div>
              </div>

              <div ref={searchRowRef} className="hidden overflow-visible relative z-[3]" role="search">
                <div ref={searchInputRef}>
                  <div className="relative">
                    <span className="absolute left-[13px] top-1/2 -translate-y-1/2 pointer-events-none flex" style={{ color: searchFocused ? "var(--accent)" : "var(--text-muted)" }}>
                      <Search size={13} strokeWidth={1.9} />
                    </span>
                    <input ref={searchFieldRef} type="text" inputMode="search" autoComplete="off" spellCheck="false"
                      value={searchQuery}
                      onChange={e => dispatch(setSearchQuery(e.target.value))}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setTimeout(() => setSearchFocused(false), 160)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search dishes, flavours…"
                      aria-label="Search menu items"
                      aria-autocomplete="list"
                      aria-expanded={showDropdown}
                      className="w-full h-[42px] pl-9 pr-[72px] rounded-[14px] outline-none appearance-none box-border font-normal tracking-[0.01em] transition-[border-color,box-shadow,background] duration-200"
                      style={{ background: "var(--input-bg)", border: `1.5px solid ${searchFocused ? "var(--input-border-focus)" : "var(--input-border)"}`, color: "var(--text-primary)", boxShadow: searchFocused ? "var(--input-shadow-focus)" : "none", fontSize: "max(16px,14px)" }}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      {searchQuery && items.length > 0 && (
                        <span className="text-[10px] font-bold px-[7px] py-[2px] rounded-full font-mono" style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>{items.length}</span>
                      )}
                      <button ref={clearBtnRef}
                        onClick={() => { dispatch(setSearchQuery("")); searchFieldRef.current?.focus(); }}
                        aria-label="Clear search"
                        className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer transition-[background,color,border-color] duration-150"
                        style={{ background: "var(--pill-bg)", border: "1px solid var(--pill-border)", color: "var(--text-muted)", opacity: 0, transform: "scale(0) rotate(45deg)", touchAction: "manipulation" }}
                      >
                        <X size={10} strokeWidth={2.5} />
                      </button>
                    </div>
                    {showDropdown && (
                      <div ref={suggestDropRef} role="listbox" className="absolute left-0 right-0 mt-2 rounded-2xl overflow-hidden z-[9999]"
                        style={{ top: "100%", background: "var(--modal-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
                        {suggestions.map((s, i) => (
                          <button key={s.name} role="option" aria-selected={i === activeIdx}
                            onMouseDown={e => { e.preventDefault(); handleSuggestionSelect(s.name); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors duration-100 border-none cursor-pointer"
                            style={{ background: i === activeIdx ? "var(--accent-dim)" : "transparent", borderBottom: i < suggestions.length - 1 ? "1px solid var(--divider)" : "none", touchAction: "manipulation" }}>
                            <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>{s.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="m-0 text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                                <HighlightMatch text={s.name} query={searchQuery} isDark={D} />
                              </p>
                              <p className="m-0 text-[10px] mt-0.5 truncate capitalize" style={{ color: "var(--text-muted)" }}>{s.category.replace(/_/g, " ")}</p>
                            </div>
                            <Search size={11} style={{ color: i === activeIdx ? "var(--accent)" : "var(--text-disabled)", flexShrink: 0 }} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {searchQuery && (
                    <p className="text-[11px] mt-1.5 pl-1 leading-[1.4]" style={{ color: "var(--text-muted)" }}>
                      {items.length > 0
                        ? <><span style={{ fontWeight: 700, color: "var(--accent)" }}>{items.length}</span> result{items.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;</>
                        : <>No results for &ldquo;<strong style={{ color: "var(--danger)" }}>{searchQuery}</strong>&rdquo;</>}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ★ NEW: Happy Hour Banner — slides down when any pricing rule is active */}
          <HappyHourBanner cafeId={CAFE_ID} />

        </div>,
        document.body,
      )}

      {callStatus !== "idle" && createPortal(
        <div className="fixed inset-x-0 z-40 px-4 pt-1.5"
          style={{ top: "calc(env(safe-area-inset-top,0px) + 80px)", pointerEvents: "none", willChange: "transform" }}>
          <div style={{ pointerEvents: "auto" }}><CallStatusBanner /></div>
        </div>,
        document.body,
      )}

      <main className="flex-1" style={{ paddingTop: contentPaddingTop, touchAction: "pan-y", minWidth: 0, width: "100%" }} aria-label="Menu content">
        {!contentReady && <MenuSkeleton />}
        <div ref={contentRef} style={{ opacity: contentReady ? undefined : 0 }} aria-hidden={!contentReady}>
          <div ref={welcomeRef} className="overflow-hidden">
            <WelcomeCard weather={recWeather} loading={recLoading} />
          </div>
          {!searchQuery && <QuoteOrderCard />}
          {!searchQuery && <CustomersSection />}
          {!searchQuery && (
            <div ref={recRef} className="overflow-hidden">
              <RecommendedSection items={recommendations} weather={recWeather} loading={recLoading} />
            </div>
          )}
          {!searchQuery && (
            <div className="sticky z-[15] py-[10px] pb-2"
              style={{ top: "calc(env(safe-area-inset-top,0px) + 68px)", background: "var(--header-bg)", borderBottom: "1px solid var(--header-border)", backdropFilter: "blur(28px) saturate(180%)", WebkitBackdropFilter: "blur(28px) saturate(180%)", boxShadow: D ? "0 4px 16px rgba(0,0,0,0.25)" : "0 4px 12px rgba(0,0,0,0.04)", willChange: "transform" }}>
              <div className="flex items-center gap-1.5 px-4 mb-2">
                <Sparkles size={12} style={{ color: "var(--accent)", flexShrink: 0 }} strokeWidth={2} />
                <span className="text-[9px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--text-muted)" }}>Categories</span>
              </div>
              <div style={{ WebkitOverflowScrolling: "touch", overscrollBehaviorX: "contain", touchAction: "pan-x" }}>
                <CategoryPills categories={categories} active={activeCategory} onChange={cat => dispatch(setActiveCategory(cat))} />
              </div>
            </div>
          )}
          <section ref={gridRef} aria-label="Menu items" className="px-4 pt-3.5"
            style={{ paddingBottom: isRemote ? "calc(env(safe-area-inset-bottom,0px) + 186px)" : "calc(env(safe-area-inset-bottom,0px) + 140px)", maxWidth: "100%", boxSizing: "border-box" }}>
            <div className="flex items-center gap-2 mb-3.5">
              <div className="w-[3px] h-[18px] rounded-full flex-shrink-0" style={{ background: "var(--accent-gradient)" }} />
              <h2 className="m-0 font-extrabold tracking-[-0.04em] leading-none text-[clamp(16px,4vw,19px)]" style={{ color: "var(--text-primary)" }}>
                {searchQuery ? "Search Results" : activeCategory === "all" ? "Full Menu" : activeCategory.replace(/_/g, " ")}
              </h2>
              {items.length > 0 && (
                <span className="text-[10px] font-bold px-[7px] py-[2px] rounded-full font-mono" style={{ background: "var(--pill-bg)", color: "var(--text-muted)" }}>{items.length}</span>
              )}
            </div>
            {/* ★ CHANGED: getBadge passed so MenuGrid → MenuCard gets discount badges */}
            <MenuGrid items={items} getBadge={getBadge} />
          </section>
        </div>
      </main>

      {createPortal(<FloatingActions isRemote={isRemote} />, document.body)}
      {/* AddressSheet now rendered inside FloatingActions */}
      <ExploreToastPortal toasts={exploreToasts} onDismiss={dismissExplore} onNavigate={exploreNavigate} />

      {createPortal(
        <button ref={scrollBtnRef} onClick={handleScrollTop} aria-label="Scroll to top"
          className="fixed w-10 h-10 rounded-[13px] border-0 cursor-pointer flex items-center justify-center [-webkit-tap-highlight-color:transparent]"
          style={{ bottom: fabBottom, right: "max(16px,env(safe-area-inset-right,16px))", zIndex: 9200, background: "var(--card-bg)", color: "var(--accent)", border: "1px solid var(--accent-border)", boxShadow: "var(--card-shadow)", transition: "bottom 0.38s cubic-bezier(0.34,1.56,0.64,1)", willChange: "transform,opacity", touchAction: "manipulation" }}>
          <ChevronUp size={17} strokeWidth={2.5} />
        </button>,
        document.body,
      )}

      <style>{`
        @keyframes mp-halo-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @media(max-width:400px){.menu-page-island{margin-left:8px;margin-right:8px;}}
      `}</style>

      {showTour && <MenuTour onComplete={handleTourComplete} islandRef={islandRef} />}
    </div>
  );
};

export default MenuPage;