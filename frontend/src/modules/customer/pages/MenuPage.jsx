// src/modules/customer/pages/MenuPage.jsx — Tailwind CSS
//
// FIXES:
//  1. Navbar hide/show — listens on BOTH lenis AND window.scroll, NaN guard
//  2. Scroll-to-top FAB — fixed position, shows after 260px scroll, moves up when cart visible
//  3. Cart count drives FAB bottom position via cartCount in style
//  4. min-h-dvh fixes browser chrome shifting layout on Android

import { useEffect, useRef, useContext, useState, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import {
  fetchMenu,
  selectFilteredItems,
  selectCategories,
  selectActiveCategory,
  selectSearchQuery,
  setActiveCategory,
  setSearchQuery,
} from "@store/slices/menuSlice";
import MenuTour from "../components/menu/MenuTour";
import { selectUser } from "@store/slices/authSlice";
import { selectCallStatus } from "@store/slices/callWaiterSlice";
import { selectTableNumber } from "@store/slices/tableSessionSlice";
import { ThemeContext } from "@shared/context/ThemeContext";
import FloatingActions from "../components/menu/FloatingActions";
import RecommendedSection from "../components/menu/RecommendedSection";
import MenuGrid from "../components/menu/MenuGrid";
import CategoryPills from "../components/menu/CategoryPills";
import WelcomeCard from "../components/menu/WelcomeCard";
import NavAvatar from "../components/menu/NavAvatar";
import NotificationBell from "../components/notifications/NotificationBell";
import CallStatusBanner from "../components/callwaiter/CallStatusBanner";
import { useRecommendations } from "../hooks/useRecommendations";
import { usePaymentLogoutTrigger } from "../hooks/usePaymentLogoutTrigger";
import { Search, X, Sparkles, ChevronUp } from "lucide-react";
import { useLenis } from "lenis/react";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const CAFE_ID = import.meta.env.VITE_CAFE_ID || "demo";

// Cart selector — adjust to match your store shape
const selectCartCount = state =>
  (state.cart?.items ?? []).reduce((s, i) => s + (i.quantity ?? 1), 0);

const injectFonts = () => {
  if (document.getElementById("mp-fonts")) return;
  const pc1 = document.createElement("link"); pc1.rel = "preconnect"; pc1.href = "https://fonts.googleapis.com";
  const pc2 = document.createElement("link"); pc2.rel = "preconnect"; pc2.href = "https://fonts.gstatic.com"; pc2.crossOrigin = "anonymous";
  document.head.appendChild(pc1); document.head.appendChild(pc2);
  const l = document.createElement("link");
  l.id = "mp-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap";
  document.head.appendChild(l);
};

const MenuPage = () => {
  const dispatch       = useDispatch();
  const navigate       = useNavigate();
  const user           = useSelector(selectUser);
  const items          = useSelector(selectFilteredItems);
  const categories     = useSelector(selectCategories);
  const activeCategory = useSelector(selectActiveCategory);
  const searchQuery    = useSelector(selectSearchQuery);
  const callStatus     = useSelector(selectCallStatus);
  const tableNumber    = useSelector(selectTableNumber);
  const cartCount      = useSelector(selectCartCount);
  const { isDark }     = useContext(ThemeContext);
  const { recommendations, loading: recLoading, weather: recWeather } = useRecommendations(CAFE_ID);
  usePaymentLogoutTrigger();
  const lenis = useLenis();

  const [searchOpen,    setSearchOpen]   = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showTour,      setShowTour]     = useState(false);

  const pageRef        = useRef(null);
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
  const welcomeRef     = useRef(null);
  const recRef         = useRef(null);
  const pillsRef       = useRef(null);
  const gridRef        = useRef(null);
  const scrollBtnRef   = useRef(null);
  const shimmerRef     = useRef(null);
  const location       = useLocation();

  // ── Font inject ─────────────────────────────────────────────────────────
  useEffect(() => { injectFonts(); }, []);

  // ── Fetch menu ──────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchMenu(CAFE_ID));
  }, [dispatch]);

  // ── Tour ────────────────────────────────────────────────────────────────
  const handleTourComplete = useCallback(() => {
    setShowTour(false);
    localStorage.setItem("mp-tour-done", "1");
  }, []);
  useEffect(() => {
    if (!localStorage.getItem("mp-tour-done")) {
      const t = setTimeout(() => setShowTour(true), 1400);
      return () => clearTimeout(t);
    }
  }, []);

  // ── FAB initial state — off before first paint ───────────────────────────
  useLayoutEffect(() => {
    if (scrollBtnRef.current) {
      gsap.set(scrollBtnRef.current, { scale: 0, opacity: 0 });
      scrollBtnRef.current.style.pointerEvents = "none";
    }
  }, []);

  // ── Entrance animation ───────────────────────────────────────────────────
  useEffect(() => {
    if (!islandRef.current) return;
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.fromTo(islandRef.current,
      { y: -40, opacity: 0, scale: 0.9 },
      { y: 0, opacity: 1, scale: 1, duration: 0.72, clearProps: "scale" }, 0
    );
    if (glowRef.current)
      tl.fromTo(glowRef.current, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.7, ease: "power2.out" }, 0.3);
    const kids = islandInnerRef.current ? Array.from(islandInnerRef.current.children) : [];
    if (kids.length)
      tl.fromTo(kids, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.07, ease: "power2.out" }, 0.4);
    if (shimmerRef.current)
      tl.fromTo(shimmerRef.current, { x: "-120%" }, { x: "120%", duration: 0.9, ease: "power2.out" }, 0.5);
  }, []);

  // ── Shimmer loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!shimmerRef.current) return;
    let killed = false;
    const loop = () => {
      if (killed || !shimmerRef.current) return;
      gsap.fromTo(shimmerRef.current, { x: "-120%" }, { x: "120%", duration: 2.8, ease: "none", delay: 4, onComplete: loop });
    };
    const t = setTimeout(loop, 2600);
    return () => { killed = true; clearTimeout(t); gsap.killTweensOf(shimmerRef.current); };
  }, []);

  // ── Grid entrance (no-op — MenuGrid owns this via IntersectionObserver) ──
  const animateGrid = useCallback(() => {}, []);

  // ── Scroll behavior ───────────────────────────────────────────────────────
  useEffect(() => {
    const pill = islandRef.current;
    if (!pill) return;

    const s = {
      visible: true, morphed: false,
      lastY: window.scrollY, vel: 0, upDist: 0,
      ticking: false, rafId: null,
      fabVisible: false,
    };

    const HIDE_VEL  = 3.5;
    const SHOW_DIST = 36;
    const MORPH_Y   = 55;
    const FAB_Y     = 260;   // show scroll-to-top after 260px
    const TOP       = 48;
    const DECAY     = 0.68;
    const HIDE_Y    = -120;

    const getY = () => {
      const ly = lenis?.scroll;
      return (typeof ly === "number" && isFinite(ly) && ly >= 0) ? ly : window.scrollY;
    };

    const showNavbar = () => {
      s.visible = true;
      gsap.killTweensOf(pill);
      if (glowRef.current) gsap.killTweensOf(glowRef.current);
      gsap.fromTo(pill,
        { y: HIDE_Y, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.46, ease: "expo.out", overwrite: true, force3D: true }
      );
      gsap.fromTo(pill,
        { scale: 0.93 },
        { scale: 1, duration: 0.55, ease: "back.out(2.4)", delay: 0.06, overwrite: "auto", force3D: true, clearProps: "scale" }
      );
      if (glowRef.current)
        gsap.fromTo(glowRef.current,
          { opacity: 0, scale: 0.8 },
          { opacity: 0.5, scale: 1, duration: 0.5, ease: "power3.out", delay: 0.04, overwrite: true }
        );
    };

    const hideNavbar = () => {
      s.visible = false; s.upDist = 0;
      gsap.killTweensOf(pill);
      if (glowRef.current) gsap.killTweensOf(glowRef.current);
      gsap.to(pill, { y: HIDE_Y, opacity: 0, duration: 0.24, ease: "power3.in", overwrite: true, force3D: true });
      if (glowRef.current)
        gsap.to(glowRef.current, { opacity: 0, duration: 0.15, ease: "power2.in", overwrite: true });
    };

    const update = () => {
      s.ticking = false;
      const y   = getY();
      const raw = y - s.lastY;
      s.lastY   = y;
      if (raw === 0) return;

      s.vel    = s.vel * DECAY + raw * (1 - DECAY);
      s.upDist = raw < 0 ? s.upDist + Math.abs(raw) : 0;
      const atTop = y < TOP;

      // Navbar hide/show
      if (s.visible && !atTop && s.vel > HIDE_VEL) hideNavbar();
      else if (!s.visible && (atTop || (s.vel < -0.5 && s.upDist >= SHOW_DIST))) showNavbar();

      // Morph border-radius
      const shouldMorph = y > MORPH_Y;
      if (shouldMorph !== s.morphed) {
        s.morphed = shouldMorph;
        gsap.to(pill, { borderRadius: shouldMorph ? 999 : 28, duration: 0.45, ease: "power3.out", overwrite: "auto" });
      }

      // Scroll-to-top FAB
      if (scrollBtnRef.current) {
        const showFab = y > FAB_Y;
        if (showFab && !s.fabVisible) {
          s.fabVisible = true;
          scrollBtnRef.current.style.pointerEvents = "auto";
          gsap.to(scrollBtnRef.current, {
            scale: 1, opacity: 1, duration: 0.4,
            ease: "back.out(2.2)", overwrite: true,
          });
        } else if (!showFab && s.fabVisible) {
          s.fabVisible = false;
          scrollBtnRef.current.style.pointerEvents = "none";
          gsap.to(scrollBtnRef.current, {
            scale: 0, opacity: 0, duration: 0.2,
            ease: "power2.in", overwrite: true,
          });
        }
      }
    };

    const onScroll = () => {
      if (!s.ticking) { s.ticking = true; s.rafId = requestAnimationFrame(update); }
    };

    // Listen on BOTH lenis AND window — ticking guard ensures 1 RAF per frame
    if (lenis) lenis.on("scroll", onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (lenis) lenis.off("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
      if (s.rafId) cancelAnimationFrame(s.rafId);
      gsap.set(pill, { clearProps: "y,opacity,scale,borderRadius" });
    };
  }, [lenis]);

  // ── Section scroll triggers ───────────────────────────────────────────────
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        if (welcomeRef.current)
          gsap.fromTo(welcomeRef.current,
            { opacity: 0, y: 24 },
            { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", delay: 0.35 }
          );
        if (recRef.current)
          gsap.fromTo(recRef.current,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", delay: 0.55 }
          );
        if (gridRef.current) {
          ScrollTrigger.create({
            trigger: gridRef.current,
            start: "top 88%",
            onEnter: animateGrid,
            once: true,
          });
        }
      });
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, [animateGrid]);

  // ── Category / search change → re-animate grid ───────────────────────────
  useEffect(() => { animateGrid(); }, [activeCategory, searchQuery, animateGrid]);

  // ── Search open/close ─────────────────────────────────────────────────────
  const openSearch = useCallback(() => {
    setSearchOpen(true);
    const navIcons = Array.from(navRightRef.current?.children ?? []).filter(el => el !== searchBtnRef.current);
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.to(brandRef.current,    { opacity: 0, x: -10, duration: 0.18 }, 0);
    tl.to(avatarWrapRef.current, { opacity: 0, scale: 0.8, duration: 0.15 }, 0);
    tl.to(navIcons,            { opacity: 0, scale: 0.7, duration: 0.15, stagger: 0.04 }, 0);
    tl.to(searchBtnRef.current, { rotate: 90, duration: 0.24, ease: "back.out(3)" }, 0);
    tl.set(searchRowRef.current, { display: "block" }, 0.12);
    tl.fromTo(searchRowRef.current,
      { height: 0, opacity: 0, marginTop: 0 },
      { height: "auto", opacity: 1, marginTop: 8, duration: 0.35, ease: "expo.out" }, 0.12
    );
    tl.fromTo(searchInputRef.current,
      { scaleX: 0.82, opacity: 0, transformOrigin: "right center" },
      { scaleX: 1, opacity: 1, duration: 0.4, ease: "expo.out", clearProps: "transform",
        onComplete: () => searchFieldRef.current?.focus() }, 0.2
    );
  }, []);

  const closeSearch = useCallback(() => {
    if (searchQuery) { dispatch(setSearchQuery("")); searchFieldRef.current?.focus(); return; }
    const navIcons = Array.from(navRightRef.current?.children ?? []).filter(el => el !== searchBtnRef.current);
    const tl = gsap.timeline({
      defaults: { ease: "power3.inOut" },
      onComplete: () => {
        setSearchOpen(false);
        gsap.set(searchRowRef.current, { display: "none", height: 0, opacity: 0, marginTop: 0 });
      },
    });
    tl.to(searchInputRef.current,  { opacity: 0, scaleX: 0.86, duration: 0.18 }, 0);
    tl.to(searchRowRef.current,    { height: 0, opacity: 0, marginTop: 0, duration: 0.26 }, 0.06);
    tl.to(searchBtnRef.current,    { rotate: 0, duration: 0.24, ease: "back.out(2)", clearProps: "transform" }, 0);
    tl.to(brandRef.current,        { opacity: 1, x: 0, duration: 0.3, clearProps: "transform" }, 0.14);
    tl.to(avatarWrapRef.current,   { opacity: 1, scale: 1, duration: 0.28, ease: "back.out(2)", clearProps: "transform" }, 0.14);
    tl.to(navIcons, { opacity: 1, scale: 1, duration: 0.28, stagger: 0.05, ease: "back.out(2)", clearProps: "transform" }, 0.16);
  }, [dispatch, searchQuery]);

  // ── Clear button animation ─────────────────────────────────────────────────
  useEffect(() => {
    if (!clearBtnRef.current) return;
    gsap.to(clearBtnRef.current,
      searchQuery
        ? { scale: 1, opacity: 1, rotate: 0, duration: 0.24, ease: "back.out(2.5)", clearProps: "transform" }
        : { scale: 0, opacity: 0, rotate: 45, duration: 0.16, ease: "power2.in" }
    );
  }, [searchQuery]);

  // ── Hide welcome/rec when searching ────────────────────────────────────────
  useEffect(() => {
    const els = [welcomeRef.current, recRef.current].filter(Boolean);
    if (!els.length) return;
    if (searchQuery) {
      gsap.to(els, {
        opacity: 0, y: -12, height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0,
        duration: 0.32, ease: "power3.in", stagger: 0.05, overwrite: "auto",
        onComplete: () => els.forEach(el => { el.style.visibility = "hidden"; el.style.pointerEvents = "none"; }),
      });
    } else {
      els.forEach(el => { el.style.visibility = ""; el.style.pointerEvents = ""; el.style.height = ""; });
      gsap.fromTo(els, { opacity: 0, y: -10 },
        { opacity: 1, y: 0, height: "auto", duration: 0.45, ease: "expo.out", stagger: 0.07, overwrite: "auto", clearProps: "height,padding,margin" }
      );
    }
  }, [searchQuery]);

  // ── Island hover ──────────────────────────────────────────────────────────
  const handleIslandHover = useCallback((entering) => {
    if (!islandRef.current || !glowRef.current) return;
    gsap.to(islandRef.current, { y: entering ? -2 : 0, duration: entering ? 0.35 : 0.5, ease: entering ? "power2.out" : "elastic.out(1.2,0.6)", overwrite: "auto" });
    gsap.to(glowRef.current,   { opacity: entering ? 0.85 : 0.5, scale: entering ? 1.12 : 1, duration: 0.4, ease: "power2.out", overwrite: "auto" });
  }, []);

  // ── Scroll to top ──────────────────────────────────────────────────────────
  const handleScrollTop = useCallback(() => {
    if (scrollBtnRef.current)
      gsap.fromTo(scrollBtnRef.current, { scale: 0.82 }, { scale: 1, duration: 0.55, ease: "elastic.out(1.2,0.5)" });
    if (lenis) lenis.scrollTo(0, { duration: 0.75, easing: t => 1 - Math.pow(1 - t, 3) });
    else gsap.to(window, { scrollTo: { y: 0 }, duration: 0.75, ease: "power3.inOut" });
  }, [lenis]);

  const pressIcon = useCallback((el) => {
    if (!el) return;
    gsap.timeline()
      .to(el, { scale: 0.82, duration: 0.1, ease: "power2.in" })
      .to(el, { scale: 1.08, duration: 0.28, ease: "back.out(3)" })
      .to(el, { scale: 1,    duration: 0.2,  ease: "power2.out" });
  }, []);

  const D = isDark;

  // Dynamic theme values (can't be expressed as static Tailwind classes)
  const pillBg        = D ? "rgba(255,255,255,0.07)"  : "rgba(255,255,255,0.55)";
  const pillBorder    = D ? "rgba(255,255,255,0.1)"   : "rgba(255,255,255,0.75)";
  const pillShadow    = D ? "0 1px 0 rgba(255,255,255,0.07) inset, 0 2px 8px rgba(0,0,0,0.3)" : "0 1px 0 rgba(255,255,255,0.95) inset, 0 2px 6px rgba(130,80,20,0.08)";
  const iconMuted     = D ? "rgba(255,184,77,0.5)"    : "rgba(120,70,15,0.5)";
  const iconActive    = D ? "#FFB84D"                 : "#C8680A";
  const pillsStickyBg = D ? "rgba(8,4,1,0.88)"        : "rgba(252,247,238,0.92)";
  const bottomBorder  = D ? "rgba(255,140,20,0.18)"   : "rgba(200,160,80,0.38)";

  // FAB bottom — rises above cart bar when cart has items
  const fabBottom = cartCount > 0
    ? "calc(env(safe-area-inset-bottom, 0px) + 88px)"
    : "calc(env(safe-area-inset-bottom, 0px) + 20px)";

  return (
    <div
      ref={pageRef}
      className="customer-container min-h-dvh flex flex-col relative"
      style={{ backgroundColor: "var(--bg-app)", fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}
    >

      {/* ══ FLOATING ISLAND NAVBAR — portalled to body ══ */}
      {createPortal(
      <div
        className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        {/* Glow halo */}
        <div
          ref={glowRef}
          aria-hidden
          className="absolute w-[320px] h-20 rounded-full pointer-events-none"
          style={{
            top: "calc(env(safe-area-inset-top, 0px) + 10px)",
            left: "50%", transform: "translateX(-50%)",
            background: D
              ? "radial-gradient(ellipse, rgba(255,140,20,0.38) 0%, rgba(224,80,30,0.18) 50%, transparent 75%)"
              : "radial-gradient(ellipse, rgba(255,159,28,0.32) 0%, rgba(224,92,42,0.14) 50%, transparent 75%)",
            filter: "blur(18px)", opacity: 0.5,
          }}
        />

        {/* Island pill */}
        <div
          ref={islandRef}
          onMouseEnter={() => handleIslandHover(true)}
          onMouseLeave={() => handleIslandHover(false)}
          className="pointer-events-auto w-full max-w-[480px] rounded-[28px] px-4 py-[10px] relative overflow-hidden"
          style={{
            marginTop: 14,
            background: D ? "rgba(10,5,1,0.78)" : "rgba(255,251,243,0.78)",
            backdropFilter: "blur(48px) saturate(200%) brightness(1.04)",
            WebkitBackdropFilter: "blur(48px) saturate(200%) brightness(1.04)",
            border: D ? "1px solid rgba(255,159,28,0.18)" : "1px solid rgba(255,255,255,0.82)",
            boxShadow: D
              ? "0 1px 0 rgba(255,255,255,0.09) inset, 0 20px 60px rgba(0,0,0,0.65), 0 4px 16px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(255,159,28,0.12)"
              : "0 1px 0 rgba(255,255,255,0.95) inset, 0 20px 48px rgba(130,80,20,0.14), 0 4px 12px rgba(130,80,20,0.08), 0 0 0 0.5px rgba(210,175,110,0.35)",
            transform: "translate3d(0,0,0)",
          }}
        >
          {/* Shimmer sweep */}
          <div
            ref={shimmerRef}
            aria-hidden
            className="absolute top-0 bottom-0 left-0 w-[38%] pointer-events-none z-[1]"
            style={{
              background: D
                ? "linear-gradient(105deg,transparent 0%,rgba(255,255,255,0.03) 35%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.03) 65%,transparent 100%)"
                : "linear-gradient(105deg,transparent 0%,rgba(255,255,255,0.1) 35%,rgba(255,255,255,0.28) 50%,rgba(255,255,255,0.1) 65%,transparent 100%)",
              transform: "translateX(-120%)",
            }}
          />
          {/* Wet top edge */}
          <div aria-hidden className="absolute top-0 left-[8%] right-[8%] h-px pointer-events-none z-[2]"
            style={{ background: D
              ? "linear-gradient(90deg,transparent,rgba(255,255,255,0.14) 30%,rgba(255,255,255,0.22) 50%,rgba(255,255,255,0.14) 70%,transparent)"
              : "linear-gradient(90deg,transparent,rgba(255,255,255,0.75) 30%,rgba(255,255,255,0.95) 50%,rgba(255,255,255,0.75) 70%,transparent)" }}
          />
          {/* Gold bottom line */}
          <div aria-hidden className="absolute bottom-0 left-[15%] right-[15%] h-px pointer-events-none z-[2]"
            style={{ background: "linear-gradient(90deg,transparent,#FF9F1C 30%,#FFD580 50%,#E05C2A 70%,transparent)", opacity: D ? 0.55 : 0.45 }}
          />

          {/* Nav row */}
          <div ref={islandInnerRef} className="relative z-[3] flex items-center justify-between gap-2 min-w-0">

            {/* Avatar */}
            <div ref={avatarWrapRef} className="relative flex-shrink-0">
              <div className="absolute inset-[-3px] rounded-full opacity-[0.45]"
                style={{ background: "conic-gradient(from 0deg,#FF9F1C,#E05C2A,#FFD580,#FF9F1C)", filter: "blur(5px)", animation: "mp-halo-spin 4s linear infinite" }}
              />
              <div className="relative z-[1]">
                <NavAvatar name={user?.name} avatar={user?.avatar} isOnline onClick={() => navigate("/profile")} />
              </div>
            </div>

            {/* Table pill / brand */}
            <div ref={brandRef} className="flex-1 flex justify-center min-w-0 overflow-hidden">
              {tableNumber ? (
                <div
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full flex-shrink-0"
                  style={{
                    background: D ? "rgba(255,159,28,0.14)" : "rgba(255,159,28,0.12)",
                    border: `1px solid ${D ? "rgba(255,159,28,0.28)" : "rgba(255,159,28,0.32)"}`,
                    boxShadow: D ? "0 1px 0 rgba(255,255,255,0.06) inset" : "0 1px 0 rgba(255,255,255,0.9) inset",
                  }}
                >
                  <span className="text-sm">🪑</span>
                  <div className="flex flex-col gap-[1px]">
                    <span className="text-[8px] font-bold tracking-[0.14em] uppercase leading-none" style={{ color: D ? "rgba(255,184,77,0.5)" : "rgba(140,75,10,0.5)" }}>Table</span>
                    <span
                      className="text-[16px] font-black tracking-[-0.04em] leading-none"
                      style={{ background: D ? "linear-gradient(135deg,#FFE0A0 0%,#FF9F1C 100%)" : "linear-gradient(135deg,#8B4513 0%,#D2691E 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                    >
                      {tableNumber}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: D ? "rgba(255,184,77,0.45)" : "rgba(140,90,20,0.55)" }}>कौसी चिया</span>
                </div>
              )}
            </div>

            {/* Right icons */}
            <div ref={navRightRef} className="flex items-center gap-1.5 flex-shrink-0">
              <div className="mp-icon-pill">
                <NotificationBell onClick={() => pressIcon(navRightRef.current?.children[0])} />
              </div>
              <button
                ref={searchBtnRef}
                onClick={() => { pressIcon(searchBtnRef.current); setTimeout(() => (searchOpen ? closeSearch() : openSearch()), 80); }}
                className="mp-icon-pill mp-search-btn"
                aria-label={searchOpen ? "Close search" : "Open search"}
                aria-expanded={searchOpen}
                style={{
                  background: searchOpen ? D ? "rgba(255,159,28,0.2)" : "rgba(255,159,28,0.15)" : pillBg,
                  border: `1px solid ${searchOpen ? "rgba(255,159,28,0.5)" : pillBorder}`,
                  boxShadow: searchOpen ? `0 0 18px rgba(255,159,28,0.28), ${pillShadow}` : pillShadow,
                  color: searchOpen ? "var(--color-saffron)" : iconMuted,
                }}
              >
                {searchOpen ? <X size={16} strokeWidth={2.2} /> : <Search size={16} strokeWidth={1.9} />}
              </button>
            </div>
          </div>

          {/* Search row */}
          <div ref={searchRowRef} className="hidden overflow-hidden relative z-[3]" role="search">
            <div ref={searchInputRef}>
              <div className="relative">
                <span
                  className="absolute left-[13px] top-1/2 -translate-y-1/2 pointer-events-none flex transition-colors duration-200"
                  style={{ color: searchFocused ? "var(--color-saffron)" : iconMuted }}
                >
                  <Search size={13} strokeWidth={1.9} />
                </span>
                <input
                  ref={searchFieldRef}
                  type="text" inputMode="search" autoComplete="off" spellCheck="false"
                  value={searchQuery}
                  onChange={e => dispatch(setSearchQuery(e.target.value))}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  onKeyDown={e => e.key === "Escape" && closeSearch()}
                  placeholder="Search dishes, flavours…"
                  aria-label="Search menu items"
                  className="mp-search-input"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {searchQuery && items.length > 0 && (
                    <span
                      className="text-[10px] font-bold px-[7px] py-[2px] rounded-full font-mono"
                      style={{ background: D ? "rgba(255,159,28,0.15)" : "rgba(255,159,28,0.12)", border: `1px solid ${D ? "rgba(255,159,28,0.22)" : "rgba(255,159,28,0.2)"}`, color: "var(--color-saffron)" }}
                    >
                      {items.length}
                    </span>
                  )}
                  <button
                    ref={clearBtnRef}
                    onClick={() => { dispatch(setSearchQuery("")); searchFieldRef.current?.focus(); }}
                    className="mp-clear-btn w-6 h-6"
                    aria-label="Clear search"
                    style={{ opacity: 0, transform: "scale(0) rotate(45deg)" }}
                  >
                    <X size={10} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
              {searchQuery && (
                <p className="text-[11px] mt-1.5 pl-1 leading-[1.4]" style={{ color: iconMuted }}>
                  {items.length > 0 ? (
                    <><span style={{ color: "var(--color-saffron)", fontWeight: 700 }}>{items.length}</span>{" "}result{items.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;</>
                  ) : (
                    <>No results for &ldquo;<strong style={{ color: "var(--color-terra)" }}>{searchQuery}</strong>&rdquo;</>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      , document.body)}
      {/* /island */}

      {/* Call status banner — portalled to body */}
      {callStatus !== "idle" && createPortal(
        <div className="fixed left-0 right-0 z-40 px-4 pt-1.5" style={{ top: "calc(env(safe-area-inset-top, 0px) + 80px)" }}>
          <CallStatusBanner />
        </div>,
        document.body
      )}

      {/* ══ MAIN CONTENT ══ */}
      <main
        className="flex-1"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 80px)" }}
        aria-label="Menu content"
      >
        <div ref={welcomeRef} className="overflow-hidden">
          <WelcomeCard weather={recWeather} loading={recLoading} />
        </div>

        <div ref={recRef} className="overflow-hidden">
          <RecommendedSection items={recommendations} weather={recWeather} loading={recLoading} />
        </div>

        {/* Sticky category bar */}
        {!searchQuery && (
          <div
            ref={pillsRef}
            className="sticky top-0 z-20 py-[10px] pb-2 mp-pills-sticky"
            style={{
              background: pillsStickyBg,
              borderBottom: `1px solid ${bottomBorder}`,
              boxShadow: D
                ? "0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.25)"
                : "0 1px 0 rgba(255,255,255,0.8) inset, 0 4px 12px rgba(130,80,20,0.07)",
              transition: "background var(--transition-theme), border-color var(--transition-theme)",
            }}
          >
            <div className="flex items-center gap-1.5 px-4 mb-2">
              <Sparkles size={12} style={{ color: "var(--color-saffron)", flexShrink: 0 }} strokeWidth={2} />
              <span className="text-[9px] font-bold tracking-[0.14em] uppercase" style={{ color: iconMuted }}>Categories</span>
            </div>
            <CategoryPills
              categories={categories}
              active={activeCategory}
              onChange={cat => dispatch(setActiveCategory(cat))}
            />
          </div>
        )}

        {/* Grid section */}
        <section
          ref={gridRef}
          aria-label="Menu items"
          className="px-4 pt-3.5"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 140px)" }}
        >
          <div className="flex items-center gap-2 mb-3.5">
            <div
              className="w-[3px] h-[18px] rounded-full flex-shrink-0"
              style={{ background: "linear-gradient(180deg,#FF9F1C 0%,#E05C2A 100%)" }}
            />
            <h2
              className="m-0 font-extrabold tracking-[-0.04em] leading-none text-[clamp(16px,4vw,19px)]"
              style={{ color: "var(--text-primary)" }}
            >
              {searchQuery ? "Search Results" : activeCategory === "all" ? "Full Menu" : activeCategory.replace(/_/g, " ")}
            </h2>
            {items.length > 0 && (
              <span
                className="text-[10px] font-bold px-[7px] py-[2px] rounded-full font-mono"
                style={{ background: D ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: iconMuted }}
              >
                {items.length}
              </span>
            )}
          </div>
          <MenuGrid items={items} />
        </section>
      </main>

      {/* FloatingActions — portalled to body to escape ALL ancestor transforms/overflow */}
      {createPortal(<FloatingActions />, document.body)}

      {/* ══ SCROLL-TO-TOP FAB — portalled to body ══
          createPortal guarantees position:fixed is relative to the VIEWPORT
          on real mobile, not trapped by a transformed/overflow:hidden ancestor ══ */}
      {createPortal(
        <button
          ref={scrollBtnRef}
          onClick={handleScrollTop}
          aria-label="Scroll to top"
          className="fixed right-4 w-10 h-10 rounded-[13px] border-none cursor-pointer flex items-center justify-center [-webkit-tap-highlight-color:transparent]"
          style={{
            bottom: fabBottom,
            zIndex: 9200,
            background: D ? "rgba(16,8,2,0.90)" : "rgba(252,248,242,0.94)",
            color: "var(--color-saffron)",
            boxShadow: D
              ? "0 1px 0 rgba(255,255,255,0.07) inset, 0 4px 24px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,159,28,0.14)"
              : "0 1px 0 rgba(255,255,255,0.9) inset, 0 4px 18px rgba(140,90,30,0.14), 0 0 0 1px rgba(220,190,140,0.5)",
            transition: "bottom 0.38s cubic-bezier(0.34,1.56,0.64,1), background var(--transition-theme), box-shadow var(--transition-theme)",
          }}
        >
          <ChevronUp size={17} strokeWidth={2.5} />
        </button>,
        document.body
      )}

      {/* ══ SCOPED STYLES ══ */}
      <style>{`
        @keyframes mp-halo-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* CRITICAL — customer-container must NOT have transform, filter, or overflow:hidden
           Any of these create a new stacking context that breaks position:fixed on real mobile.
           Override here in case the global CSS sets them. */
        .customer-container {
          transform: none !important;
          filter: none !important;
          /* overflow-x handled by html/body above, not here */
        }

        .mp-icon-pill {
          display: flex; align-items: center; justify-content: center;
          width: 38px; height: 38px; border-radius: 12px;
          background: ${pillBg}; border: 1px solid ${pillBorder};
          box-shadow: ${pillShadow};
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, color 0.18s;
          -webkit-tap-highlight-color: transparent;
          outline: none; color: ${iconMuted};
          padding: 0; flex-shrink: 0;
        }
        .mp-icon-pill:focus-visible { outline: 2px solid rgba(255,159,28,0.5); outline-offset: 2px; }
        .mp-search-btn { background: none; }
        .mp-icon-pill > button, .mp-icon-pill button {
          all: unset !important; cursor: pointer !important;
          display: flex !important; align-items: center !important;
          justify-content: center !important; width: 100% !important;
          height: 100% !important; color: ${iconMuted} !important;
          position: relative !important;
          transition: color 0.18s ease, transform 0.2s cubic-bezier(0.34,1.56,0.64,1) !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        .mp-icon-pill button:hover  { color: ${iconActive} !important; transform: scale(1.12) !important; }
        .mp-icon-pill button:active { transform: scale(0.88) !important; }
        .mp-icon-pill button svg    { color: inherit !important; width: 17px !important; height: 17px !important; stroke-width: 1.9 !important; }

        .mp-search-input {
          width: 100%; height: 42px;
          padding: 0 72px 0 36px; border-radius: 14px;
          background: ${D ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.55)"};
          color: var(--text-primary);
          border: 1.5px solid ${D ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.75)"};
          box-shadow: ${D ? "0 1px 0 rgba(255,255,255,0.06) inset, 0 3px 14px rgba(0,0,0,0.25)" : "0 1px 0 rgba(255,255,255,0.95) inset, 0 2px 8px rgba(140,90,30,0.07)"};
          outline: none; font-family: "Plus Jakarta Sans", system-ui, sans-serif;
          font-size: 14px; font-weight: 400; letter-spacing: 0.01em;
          transition: border-color 0.22s, box-shadow 0.22s, background 0.22s;
          -webkit-appearance: none; box-sizing: border-box;
        }
        .mp-search-input::placeholder { color: ${D ? "rgba(255,184,77,0.22)" : "rgba(140,95,45,0.35)"}; }
        .mp-search-input:focus {
          border-color: rgba(255,159,28,0.52);
          background: ${D ? "rgba(255,159,28,0.06)" : "rgba(255,252,245,0.78)"};
          box-shadow: 0 0 0 3.5px rgba(255,159,28,0.12), ${D ? "0 1px 0 rgba(255,255,255,0.06) inset" : "0 1px 0 rgba(255,255,255,0.95) inset"};
        }

        .mp-clear-btn {
          border-radius: 8px;
          border: 1.5px solid ${D ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.65)"};
          background: ${D ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.5)"};
          color: ${iconMuted}; display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .mp-clear-btn:hover {
          background: ${D ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.78)"};
          border-color: rgba(255,159,28,0.4); color: var(--text-primary);
        }

        /* Sticky bar blur — disabled on iOS Safari (nested backdrop-filter bug) */
        @supports (backdrop-filter: blur(1px)) {
          .mp-pills-sticky { backdrop-filter: blur(28px) saturate(180%); -webkit-backdrop-filter: blur(28px) saturate(180%); }
        }
        @supports (-webkit-touch-callout: none) {
          .mp-pills-sticky { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
        }

        * { -webkit-tap-highlight-color: transparent; }
        html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; overflow-x: hidden; }
        body { max-width: 100vw; overflow-x: hidden; }
        /* NEVER overflow:hidden or transform on #root — breaks position:fixed on real mobile */
        #root { max-width: 100vw; }
      `}</style>

      {showTour && <MenuTour onComplete={handleTourComplete} />}
    </div>
  );
};

export default MenuPage;