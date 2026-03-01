// src/modules/customer/pages/MenuPage.jsx
import { useEffect, useRef, useContext, useState, useCallback } from "react";
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

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const CAFE_ID = import.meta.env.VITE_CAFE_ID || "demo";

const injectFonts = () => {
  if (document.getElementById("mp-fonts")) return;
  const pc1 = document.createElement("link");
  pc1.rel = "preconnect";
  pc1.href = "https://fonts.googleapis.com";
  const pc2 = document.createElement("link");
  pc2.rel = "preconnect";
  pc2.href = "https://fonts.gstatic.com";
  pc2.crossOrigin = "anonymous";
  document.head.appendChild(pc1);
  document.head.appendChild(pc2);
  const l = document.createElement("link");
  l.id = "mp-fonts";
  l.rel = "stylesheet";
  l.href =
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap";
  document.head.appendChild(l);
};

const MenuPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const items = useSelector(selectFilteredItems);
  const categories = useSelector(selectCategories);
  const activeCategory = useSelector(selectActiveCategory);
  const searchQuery = useSelector(selectSearchQuery);
  const callStatus = useSelector(selectCallStatus);
  const tableNumber = useSelector(selectTableNumber);
  const { isDark } = useContext(ThemeContext);

  const {
    recommendations,
    weather,
    loading: recLoading,
  } = useRecommendations(CAFE_ID);
  usePaymentLogoutTrigger();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  /* ── Refs ── */
  const pageRef = useRef(null);
  const islandRef = useRef(null); // the floating pill
  const islandInnerRef = useRef(null); // inner content row
  const glowRef = useRef(null); // glow halo behind island
  const brandRef = useRef(null);
  const brandDotRef = useRef(null);
  const avatarWrapRef = useRef(null);
  const navRightRef = useRef(null);
  const searchBtnRef = useRef(null);
  const searchRowRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchFieldRef = useRef(null);
  const clearBtnRef = useRef(null);
  const welcomeRef = useRef(null);
  const recRef = useRef(null);
  const pillsRef = useRef(null);
  const gridRef = useRef(null);
  const scrollBtnRef = useRef(null);
  const prevScrollY = useRef(0);
  const shimmerRef = useRef(null);
  const particlesRef = useRef([]);
  const location = useLocation();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    // Only show tour for first-time users (flagged via navigation state)
    if (location.state?.firstTimeUser) {
      // Small delay so menu renders first
      const t = setTimeout(() => setShowTour(true), 800);
      return () => clearTimeout(t);
    }
  }, [location.state]);

  const handleTourComplete = () => {
    setShowTour(false);
    // Clear the state so refresh doesn't re-trigger
    window.history.replaceState({}, "", window.location.pathname);
  };

  useEffect(() => {
    injectFonts();
    dispatch(fetchMenu(CAFE_ID));
  }, [dispatch]);

  /* ── Island entrance ── */
  useEffect(() => {
    if (!islandRef.current) return;
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    // island drops in from top with spring
    tl.fromTo(
      islandRef.current,
      { y: -80, opacity: 0, scale: 0.88 },
      { y: 0, opacity: 1, scale: 1, duration: 0.9, ease: "back.out(1.8)" },
    );
    // glow blooms in
    if (glowRef.current)
      tl.fromTo(
        glowRef.current,
        { opacity: 0, scale: 0.7 },
        { opacity: 1, scale: 1, duration: 0.7, ease: "power2.out" },
        0.3,
      );
    // inner items stagger in
    const kids = islandInnerRef.current
      ? Array.from(islandInnerRef.current.children)
      : [];
    tl.fromTo(
      kids,
      { opacity: 0, y: -6 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.07, ease: "power2.out" },
      0.4,
    );
    // shimmer sweep on load
    if (shimmerRef.current)
      tl.fromTo(
        shimmerRef.current,
        { x: "-120%" },
        { x: "120%", duration: 0.9, ease: "power2.out" },
        0.5,
      );
  }, []);

  /* ── Shimmer loop ── */
  useEffect(() => {
    if (!shimmerRef.current) return;
    const loop = () => {
      gsap.fromTo(
        shimmerRef.current,
        { x: "-120%" },
        { x: "120%", duration: 2.8, ease: "none", delay: 4, onComplete: loop },
      );
    };
    const t = setTimeout(loop, 3000);
    return () => clearTimeout(t);
  }, []);

  /* ── Grid entrance ── */
  const animateGrid = useCallback(() => {
    if (!gridRef.current) return;
    const cards = gridRef.current.querySelectorAll(".mc");
    if (!cards.length) return;
    gsap.fromTo(
      cards,
      { y: 28, opacity: 0, scale: 0.94 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.42,
        stagger: 0.055,
        ease: "power2.out",
        force3D: true,
        clearProps: "all",
      },
    );
  }, []);

  /* ── Scroll behavior — hide on scroll DOWN, reveal on scroll UP ── */
  useEffect(() => {
    let islandVisible = true;
    let lastScrollY = window.scrollY;
    let ticking = false;
    let accumulated = 0;
    const HIDE_THRESHOLD = 8;
    const SHOW_THRESHOLD = 6;
    const TOP_GRACE = 80;

    // The fixed outer wrapper div (parent of glow + island)
    const wrapper = islandRef.current?.parentElement;

    const update = () => {
      const s = window.scrollY;
      const dy = s - lastScrollY;
      lastScrollY = s;
      ticking = false;
      accumulated += dy;

      const atTop = s < TOP_GRACE;
      const scrolled = s > 60;

      // ── HIDE on scroll DOWN ──
      if (!atTop && accumulated > HIDE_THRESHOLD && islandVisible) {
        islandVisible = false;
        accumulated = 0;
        gsap.to(wrapper, {
          y: -110,
          opacity: 0,
          scale: 0.92,
          duration: 0.36,
          ease: "power3.in",
          overwrite: "auto",
        });
        if (glowRef.current)
          gsap.to(glowRef.current, {
            opacity: 0,
            duration: 0.22,
            overwrite: "auto",
          });
      }

      // ── SHOW on scroll UP (or snap back to top) ──
      else if ((accumulated < -SHOW_THRESHOLD || atTop) && !islandVisible) {
        islandVisible = true;
        accumulated = 0;
        gsap.to(wrapper, {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.52,
          ease: "expo.out",
          overwrite: "auto",
        });
        if (glowRef.current)
          gsap.to(glowRef.current, {
            opacity: 0.55,
            duration: 0.4,
            overwrite: "auto",
          });
        // micro spring bounce on re-entry
        gsap.fromTo(
          islandRef.current,
          { scale: 0.95 },
          { scale: 1, duration: 0.5, ease: "back.out(2.4)", overwrite: "auto" },
        );
      }

      // clamp so accumulator doesn't drift
      if (Math.abs(accumulated) > 60) accumulated = Math.sign(accumulated) * 60;

      // ── morph pill shape when scrolled ──
      if (scrolled !== isScrolled) {
        setIsScrolled(scrolled);
        gsap.to(islandRef.current, {
          borderRadius: scrolled ? 999 : 28,
          duration: 0.4,
          ease: "power3.out",
          overwrite: "auto",
        });
      }

      // ── scroll-to-top FAB ──
      if (scrollBtnRef.current) {
        if (s > 300 && prevScrollY.current <= 300) {
          scrollBtnRef.current.style.pointerEvents = "auto";
          gsap.to(scrollBtnRef.current, {
            scale: 1,
            opacity: 1,
            duration: 0.4,
            ease: "back.out(2.4)",
            overwrite: true,
          });
        } else if (s <= 300 && prevScrollY.current > 300) {
          scrollBtnRef.current.style.pointerEvents = "none";
          gsap.to(scrollBtnRef.current, {
            scale: 0,
            opacity: 0,
            duration: 0.22,
            ease: "power2.in",
            overwrite: true,
          });
        }
      }
      prevScrollY.current = s;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isScrolled]);

  /* ── Section scroll triggers ── */
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        [welcomeRef, recRef, pillsRef].forEach((r, i) => {
          if (!r.current) return;
          gsap.fromTo(
            r.current,
            { y: 36, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.55,
              ease: "power2.out",
              force3D: true,
              clearProps: "transform",
              delay: i * 0.05,
              scrollTrigger: { trigger: r.current, start: "top 95%" },
            },
          );
        });
        if (gridRef.current) {
          ScrollTrigger.create({
            trigger: gridRef.current,
            start: "top 94%",
            onEnter: animateGrid,
          });
        }
      }, pageRef);
      return () => {
        ctx.revert();
        ScrollTrigger.getAll().forEach((t) => t.kill());
      };
    });
    return () => mm.revert();
  }, [animateGrid]);

  useEffect(() => {
    if (!items.length) return;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      animateGrid();
  }, [activeCategory, searchQuery, items.length, animateGrid]);

  /* ── Hide welcome + rec when searching, reveal when cleared ── */
  useEffect(() => {
    const els = [welcomeRef.current, recRef.current].filter(Boolean);
    if (!els.length) return;

    if (searchQuery) {
      // collapse out: fade + slide up + shrink height to 0
      gsap.to(els, {
        opacity: 0,
        y: -12,
        height: 0,
        paddingTop: 0,
        paddingBottom: 0,
        marginBottom: 0,
        duration: 0.32,
        ease: "power3.in",
        stagger: 0.05,
        overwrite: "auto",
        onComplete: () => {
          els.forEach((el) => {
            el.style.visibility = "hidden";
            el.style.pointerEvents = "none";
          });
        },
      });
    } else {
      // restore: expand back down with spring
      els.forEach((el) => {
        el.style.visibility = "";
        el.style.pointerEvents = "";
        el.style.height = ""; // let it re-measure natural height
      });
      gsap.fromTo(
        els,
        { opacity: 0, y: -10 },
        {
          opacity: 1,
          y: 0,
          height: "auto",
          duration: 0.45,
          ease: "expo.out",
          stagger: 0.07,
          overwrite: "auto",
          clearProps: "height,padding,margin",
        },
      );
    }
  }, [searchQuery]);

  /* ── Island hover: lift + glow brighten ── */
  const handleIslandHover = useCallback((entering) => {
    if (!islandRef.current || !glowRef.current) return;
    gsap.to(islandRef.current, {
      y: entering ? -2 : 0,
      duration: entering ? 0.35 : 0.5,
      ease: entering ? "power2.out" : "elastic.out(1.2, 0.6)",
      overwrite: "auto",
    });
    gsap.to(glowRef.current, {
      opacity: entering ? 0.85 : 0.5,
      scale: entering ? 1.12 : 1,
      duration: 0.4,
      ease: "power2.out",
      overwrite: "auto",
    });
  }, []);

  /* ── Search open/close ── */
  const openSearch = useCallback(() => {
    setSearchOpen(true);
    const navIcons = Array.from(navRightRef.current?.children ?? []).filter(
      (el) => el !== searchBtnRef.current,
    );

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.to(brandRef.current, { opacity: 0, x: -10, duration: 0.18 }, 0);
    tl.to(avatarWrapRef.current, { opacity: 0, scale: 0.8, duration: 0.15 }, 0);
    tl.to(
      navIcons,
      { opacity: 0, scale: 0.7, duration: 0.15, stagger: 0.04 },
      0,
    );
    tl.to(
      searchBtnRef.current,
      { rotate: 90, duration: 0.24, ease: "back.out(3)" },
      0,
    );
    tl.set(searchRowRef.current, { display: "block" }, 0.12);
    tl.fromTo(
      searchRowRef.current,
      { height: 0, opacity: 0, marginTop: 0 },
      {
        height: "auto",
        opacity: 1,
        marginTop: 8,
        duration: 0.35,
        ease: "expo.out",
      },
      0.12,
    );
    tl.fromTo(
      searchInputRef.current,
      { scaleX: 0.82, opacity: 0, transformOrigin: "right center" },
      {
        scaleX: 1,
        opacity: 1,
        duration: 0.4,
        ease: "expo.out",
        clearProps: "transform",
        onComplete: () => searchFieldRef.current?.focus(),
      },
      0.2,
    );
  }, []);

  const closeSearch = useCallback(() => {
    if (searchQuery) {
      dispatch(setSearchQuery(""));
      searchFieldRef.current?.focus();
      return;
    }
    const navIcons = Array.from(navRightRef.current?.children ?? []).filter(
      (el) => el !== searchBtnRef.current,
    );

    const tl = gsap.timeline({
      defaults: { ease: "power3.inOut" },
      onComplete: () => {
        setSearchOpen(false);
        gsap.set(searchRowRef.current, {
          display: "none",
          height: 0,
          opacity: 0,
          marginTop: 0,
        });
      },
    });
    tl.to(
      searchInputRef.current,
      { opacity: 0, scaleX: 0.86, duration: 0.18 },
      0,
    );
    tl.to(
      searchRowRef.current,
      { height: 0, opacity: 0, marginTop: 0, duration: 0.26 },
      0.06,
    );
    tl.to(
      searchBtnRef.current,
      {
        rotate: 0,
        duration: 0.24,
        ease: "back.out(2)",
        clearProps: "transform",
      },
      0,
    );
    tl.to(
      brandRef.current,
      { opacity: 1, x: 0, duration: 0.3, clearProps: "transform" },
      0.14,
    );
    tl.to(
      avatarWrapRef.current,
      {
        opacity: 1,
        scale: 1,
        duration: 0.28,
        ease: "back.out(2)",
        clearProps: "transform",
      },
      0.14,
    );
    tl.to(
      navIcons,
      {
        opacity: 1,
        scale: 1,
        duration: 0.28,
        stagger: 0.05,
        ease: "back.out(2)",
        clearProps: "transform",
      },
      0.16,
    );
  }, [dispatch, searchQuery]);

  useEffect(() => {
    if (!clearBtnRef.current) return;
    gsap.to(
      clearBtnRef.current,
      searchQuery
        ? {
            scale: 1,
            opacity: 1,
            rotate: 0,
            duration: 0.24,
            ease: "back.out(2.5)",
            clearProps: "transform",
          }
        : {
            scale: 0,
            opacity: 0,
            rotate: 45,
            duration: 0.16,
            ease: "power2.in",
          },
    );
  }, [searchQuery]);

  const handleScrollTop = useCallback(() => {
    gsap.fromTo(
      scrollBtnRef.current,
      { scale: 0.82 },
      { scale: 1, duration: 0.55, ease: "elastic.out(1.2, 0.5)" },
    );
    gsap.to(window, {
      scrollTo: { y: 0 },
      duration: 0.75,
      ease: "power3.inOut",
    });
  }, []);

  /* ── Icon press animation ── */
  const pressIcon = useCallback((el) => {
    gsap
      .timeline()
      .to(el, { scale: 0.82, duration: 0.1, ease: "power2.in" })
      .to(el, { scale: 1.08, duration: 0.28, ease: "back.out(3)" })
      .to(el, { scale: 1, duration: 0.2, ease: "power2.out" });
  }, []);

  const D = isDark;

  /* ── Token colors ── */
  const iconMuted = D ? "rgba(255,184,77,0.5)" : "rgba(120,70,15,0.5)";
  const iconActive = D ? "#FFB84D" : "#C8680A";
  const pillBg = D ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.55)";
  const pillBorder = D ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.75)";
  const pillShadow = D
    ? "0 1px 0 rgba(255,255,255,0.07) inset, 0 2px 8px rgba(0,0,0,0.3)"
    : "0 1px 0 rgba(255,255,255,0.95) inset, 0 2px 6px rgba(130,80,20,0.08)";
  const bottomBorder = D ? "rgba(255,140,20,0.18)" : "rgba(200,160,80,0.38)";
  const pillsStickyBg = D ? "rgba(8,4,1,0.55)" : "rgba(255,250,240,0.52)";

  return (
    <div
      ref={pageRef}
      className="customer-container min-h-dvh flex flex-col"
      style={{
        backgroundColor: "var(--bg-app)",
        fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
        position: "relative",
      }}
    >
      {/* ════════════════════════════════════════════════════
          FLOATING ISLAND NAVBAR
          — fixed position, pill-shaped, hovering 16px from top
          — dramatic glow halo behind it
      ════════════════════════════════════════════════════ */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          justifyContent: "center",
          paddingTop: "max(14px, calc(env(safe-area-inset-top) + 10px))",
          paddingLeft: 16,
          paddingRight: 16,
          pointerEvents: "none",
          // GPU layer for silky hide/show transforms
          willChange: "transform, opacity",
          transform: "translateY(0px)",
        }}
      >
        {/* GLOW HALO — blurred blob behind the island */}
        <div
          ref={glowRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "max(10px, calc(env(safe-area-inset-top) + 6px))",
            left: "50%",
            transform: "translateX(-50%)",
            width: 320,
            height: 80,
            borderRadius: 999,
            background: D
              ? "radial-gradient(ellipse, rgba(255,140,20,0.38) 0%, rgba(224,80,30,0.18) 50%, transparent 75%)"
              : "radial-gradient(ellipse, rgba(255,159,28,0.32) 0%, rgba(224,92,42,0.14) 50%, transparent 75%)",
            filter: "blur(18px)",
            opacity: 0.5,
            pointerEvents: "none",
            willChange: "transform, opacity",
          }}
        />

        {/* THE ISLAND PILL */}
        <div
          ref={islandRef}
          onMouseEnter={() => handleIslandHover(true)}
          onMouseLeave={() => handleIslandHover(false)}
          style={{
            pointerEvents: "auto",
            width: "100%",
            maxWidth: 480,
            borderRadius: 28,
            padding: "10px 16px",
            /* Liquid glass */
            background: D
              ? "rgba(10, 5, 1, 0.72)"
              : "rgba(255, 251, 243, 0.72)",
            backdropFilter: "blur(48px) saturate(200%) brightness(1.04)",
            WebkitBackdropFilter: "blur(48px) saturate(200%) brightness(1.04)",
            border: D
              ? "1px solid rgba(255,159,28,0.18)"
              : "1px solid rgba(255,255,255,0.82)",
            boxShadow: D
              ? [
                  "0 1px 0 rgba(255,255,255,0.09) inset",
                  "0 -1px 0 rgba(255,255,255,0.04) inset",
                  "0 20px 60px rgba(0,0,0,0.65)",
                  "0 4px 16px rgba(0,0,0,0.4)",
                  "0 0 0 0.5px rgba(255,159,28,0.12)",
                ].join(", ")
              : [
                  "0 1px 0 rgba(255,255,255,0.95) inset",
                  "0 20px 48px rgba(130,80,20,0.14)",
                  "0 4px 12px rgba(130,80,20,0.08)",
                  "0 0 0 0.5px rgba(210,175,110,0.35)",
                ].join(", "),
            overflow: "hidden",
            position: "relative",
            willChange: "transform, border-radius",
            transition: "background 0.3s, border-color 0.3s, box-shadow 0.3s",
          }}
        >
          {/* ── SHIMMER SWEEP across the island ── */}
          <div
            ref={shimmerRef}
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: "38%",
              background: D
                ? "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.03) 35%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 65%, transparent 100%)"
                : "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.1) 35%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0.1) 65%, transparent 100%)",
              pointerEvents: "none",
              zIndex: 1,
              transform: "translateX(-120%)",
            }}
          />

          {/* ── WET TOP EDGE ── */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              left: "8%",
              right: "8%",
              height: 1,
              background: D
                ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.14) 30%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.14) 70%, transparent)"
                : "linear-gradient(90deg, transparent, rgba(255,255,255,0.75) 30%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0.75) 70%, transparent)",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />

          {/* ── GOLD BOTTOM GLOW LINE ── */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: 0,
              left: "15%",
              right: "15%",
              height: 1,
              background:
                "linear-gradient(90deg, transparent, #FF9F1C 30%, #FFD580 50%, #E05C2A 70%, transparent)",
              opacity: D ? 0.55 : 0.45,
              pointerEvents: "none",
              zIndex: 2,
            }}
          />

          {/* ── MAIN CONTENT ROW: Avatar · Table · Bell · Search ── */}
          <div
            ref={islandInnerRef}
            style={{
              position: "relative",
              zIndex: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            {/* ① AVATAR */}
            <div
              ref={avatarWrapRef}
              style={{ position: "relative", flexShrink: 0 }}
            >
              {/* spinning conic halo */}
              <div
                style={{
                  position: "absolute",
                  inset: -3,
                  borderRadius: "50%",
                  background:
                    "conic-gradient(from 0deg, #FF9F1C, #E05C2A, #FFD580, #FF9F1C)",
                  opacity: D ? 0.55 : 0.4,
                  filter: "blur(5px)",
                  animation: "mp-halo-spin 4s linear infinite",
                }}
              />
              <div style={{ position: "relative", zIndex: 1 }}>
                <NavAvatar
                  name={user?.name}
                  avatar={user?.avatar}
                  isOnline={true}
                  onClick={() => navigate("/profile")}
                />
              </div>
            </div>

            {/* ② TABLE NUMBER PILL — grows to fill space */}
            <div
              ref={brandRef}
              style={{ flex: 1, display: "flex", justifyContent: "center" }}
            >
              {tableNumber ? (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 99,
                    background: D
                      ? "rgba(255,159,28,0.1)"
                      : "rgba(255,159,28,0.09)",
                    border: `1px solid ${D ? "rgba(255,159,28,0.28)" : "rgba(255,159,28,0.32)"}`,
                    boxShadow: D
                      ? "0 1px 0 rgba(255,255,255,0.06) inset, 0 0 14px rgba(255,159,28,0.12)"
                      : "0 1px 0 rgba(255,255,255,0.9) inset, 0 0 10px rgba(255,159,28,0.1)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <span style={{ fontSize: 14 }}>🪑</span>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: D
                          ? "rgba(255,184,77,0.5)"
                          : "rgba(140,75,10,0.5)",
                        lineHeight: 1,
                      }}
                    >
                      Table
                    </span>
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 900,
                        letterSpacing: "-0.04em",
                        lineHeight: 1,
                        background: D
                          ? "linear-gradient(135deg, #FFE0A0 0%, #FF9F1C 100%)"
                          : "linear-gradient(135deg, #C8680A 0%, #E05C2A 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      {tableNumber}
                    </span>
                  </div>
                </div>
              ) : (
                /* fallback: brand name when no table */
                <span
                  style={{
                    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
                    fontWeight: 800,
                    fontSize: 15,
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                    background: D
                      ? "linear-gradient(118deg, #FFE0A0 0%, #FF9F1C 48%, #E05C2A 100%)"
                      : "linear-gradient(118deg, #C8680A 0%, #E05C2A 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    whiteSpace: "nowrap",
                  }}
                >
                  कौसी चिया
                </span>
              )}
            </div>

            {/* ③ NOTIFICATION + ④ SEARCH */}
            <div
              ref={navRightRef}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
              }}
            >
              {/* Bell */}
              <span
                className="mp-icon-pill"
                onClick={(e) => pressIcon(e.currentTarget)}
              >
                <NotificationBell />
              </span>

              {/* Hairline divider */}
              <span
                style={{
                  width: 1,
                  height: 16,
                  borderRadius: 99,
                  flexShrink: 0,
                  background: D
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(190,150,80,0.3)",
                }}
              />

              {/* Search toggle */}
              <button
                ref={searchBtnRef}
                onClick={() => {
                  pressIcon(searchBtnRef.current);
                  setTimeout(
                    () => (searchOpen ? closeSearch() : openSearch()),
                    80,
                  );
                }}
                className="mp-icon-pill mp-search-btn"
                aria-label={searchOpen ? "Close search" : "Open search"}
                aria-expanded={searchOpen}
                style={{
                  background: searchOpen
                    ? D
                      ? "rgba(255,159,28,0.2)"
                      : "rgba(255,159,28,0.15)"
                    : pillBg,
                  border: `1px solid ${searchOpen ? "rgba(255,159,28,0.5)" : pillBorder}`,
                  boxShadow: searchOpen
                    ? `0 0 18px rgba(255,159,28,0.28), ${pillShadow}`
                    : pillShadow,
                  color: searchOpen ? "var(--color-saffron)" : iconMuted,
                }}
              >
                {searchOpen ? (
                  <X size={16} strokeWidth={2.2} />
                ) : (
                  <Search size={16} strokeWidth={1.9} />
                )}
              </button>
            </div>
          </div>

          {/* ── SEARCH EXPAND ROW (inside island, below main row) ── */}
          <div
            ref={searchRowRef}
            style={{
              display: "none",
              height: 0,
              opacity: 0,
              overflow: "hidden",
              position: "relative",
              zIndex: 3,
            }}
            role="search"
          >
            <div ref={searchInputRef}>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 13,
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                    display: "flex",
                    color: searchFocused ? "var(--color-saffron)" : iconMuted,
                    transition: "color 0.2s",
                  }}
                >
                  <Search size={13} strokeWidth={1.9} />
                </span>

                <input
                  ref={searchFieldRef}
                  type="text"
                  inputMode="search"
                  autoComplete="off"
                  spellCheck="false"
                  value={searchQuery}
                  onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  onKeyDown={(e) => e.key === "Escape" && closeSearch()}
                  placeholder="Search dishes, flavours…"
                  aria-label="Search menu items"
                  className="mp-search-input"
                />

                <div
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  {searchQuery && items.length > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 7px",
                        borderRadius: 99,
                        background: D
                          ? "rgba(255,159,28,0.15)"
                          : "rgba(255,159,28,0.12)",
                        border: `1px solid ${D ? "rgba(255,159,28,0.22)" : "rgba(255,159,28,0.2)"}`,
                        color: "var(--color-saffron)",
                        fontFamily: '"DM Mono", monospace',
                      }}
                    >
                      {items.length}
                    </span>
                  )}
                  <button
                    ref={clearBtnRef}
                    onClick={() => {
                      dispatch(setSearchQuery(""));
                      searchFieldRef.current?.focus();
                    }}
                    className="mp-clear-btn"
                    aria-label="Clear search"
                    style={{
                      opacity: 0,
                      transform: "scale(0) rotate(45deg)",
                      width: 24,
                      height: 24,
                    }}
                  >
                    <X size={10} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {searchQuery && (
                <p
                  style={{
                    fontSize: 11,
                    margin: "6px 0 0",
                    paddingLeft: 4,
                    color: iconMuted,
                    lineHeight: 1.4,
                  }}
                >
                  {items.length > 0 ? (
                    <>
                      <span
                        style={{
                          color: "var(--color-saffron)",
                          fontWeight: 700,
                        }}
                      >
                        {items.length}
                      </span>{" "}
                      result{items.length !== 1 ? "s" : ""} for &ldquo;
                      {searchQuery}&rdquo;
                    </>
                  ) : (
                    <>
                      No results for &ldquo;
                      <strong style={{ color: "var(--color-terra)" }}>
                        {searchQuery}
                      </strong>
                      &rdquo;
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
        {/* /island */}
      </div>
      {/* /island wrapper */}

      {/* ── Call status banner ── */}
      {callStatus !== "idle" && (
        <div
          style={{
            zIndex: 30,
            padding: "6px 16px 0",
            marginTop: "max(80px, calc(env(safe-area-inset-top) + 76px))",
          }}
        >
          <CallStatusBanner />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          MAIN CONTENT — padded top so island doesn't cover it
      ════════════════════════════════════════════════════════ */}
      <main
        style={{
          flex: 1,
          paddingTop: "max(88px, calc(env(safe-area-inset-top) + 80px))",
        }}
        aria-label="Menu content"
      >
        {/* Welcome + Rec: always mounted, animated in/out via GSAP */}
        <div ref={welcomeRef} style={{ overflow: "hidden" }}>
          <WelcomeCard weather={weather} />
        </div>

        <div ref={recRef} style={{ overflow: "hidden" }}>
          <RecommendedSection
            items={recommendations}
            weather={weather}
            loading={recLoading}
          />
        </div>

        {!searchQuery && (
          <div
            ref={pillsRef}
            style={{
              position: "sticky",
              top: 0,
              zIndex: 20,
              padding: "10px 0 8px",
              background: pillsStickyBg,
              backdropFilter: "blur(28px) saturate(180%)",
              WebkitBackdropFilter: "blur(28px) saturate(180%)",
              borderBottom: `1px solid ${bottomBorder}`,
              boxShadow: D
                ? "0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.3)"
                : "0 1px 0 rgba(255,255,255,0.8) inset, 0 4px 12px rgba(130,80,20,0.08)",
              transition:
                "background var(--transition-theme), border-color var(--transition-theme)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "0 16px",
                marginBottom: 8,
              }}
            >
              <Sparkles
                size={12}
                style={{ color: "var(--color-saffron)", flexShrink: 0 }}
                strokeWidth={2}
              />
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: iconMuted,
                  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
                }}
              >
                Categories
              </span>
            </div>
            <CategoryPills
              categories={categories}
              active={activeCategory}
              onChange={(cat) => dispatch(setActiveCategory(cat))}
            />
          </div>
        )}

        <section
          ref={gridRef}
          aria-label="Menu items"
          style={{ padding: "14px 16px 32px" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                width: 3,
                height: 18,
                borderRadius: 99,
                background: "linear-gradient(180deg, #FF9F1C 0%, #E05C2A 100%)",
                flexShrink: 0,
              }}
            />
            <h2
              style={{
                fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
                fontSize: "clamp(16px, 4vw, 19px)",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                color: "var(--text-primary)",
                lineHeight: 1,
                margin: 0,
              }}
            >
              {searchQuery
                ? "Search Results"
                : activeCategory === "all"
                  ? "Full Menu"
                  : activeCategory.replace(/_/g, " ")}
            </h2>
            {items.length > 0 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 99,
                  background: D ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                  color: iconMuted,
                  fontFamily: '"DM Mono", monospace',
                }}
              >
                {items.length}
              </span>
            )}
          </div>
          <MenuGrid items={items} />
        </section>
      </main>

      <FloatingActions />

      {/* Scroll to top */}
      <button
        ref={scrollBtnRef}
        onClick={handleScrollTop}
        aria-label="Scroll to top"
        style={{
          position: "fixed",
          bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
          right: 16,
          width: 40,
          height: 40,
          borderRadius: 13,
          border: "none",
          cursor: "pointer",
          background: D ? "rgba(10,5,1,0.65)" : "rgba(255,252,247,0.65)",
          backdropFilter: "blur(20px) saturate(180%)",
          color: "var(--color-saffron)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: D
            ? "0 1px 0 rgba(255,255,255,0.07) inset, 0 4px 24px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,159,28,0.14)"
            : "0 1px 0 rgba(255,255,255,0.9) inset, 0 4px 18px rgba(140,90,30,0.14), 0 0 0 1px rgba(220,190,140,0.5)",
          zIndex: 38,
          opacity: 0,
          transform: "scale(0)",
          pointerEvents: "none",
          transition:
            "background var(--transition-theme), box-shadow var(--transition-theme)",
        }}
      >
        <ChevronUp size={17} strokeWidth={2.5} />
      </button>

      {/* ════════════ SCOPED STYLES ════════════ */}
      <style>{`

        /* ── Spinning avatar halo ── */
        @keyframes mp-halo-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* ── Icon pill button base ── */
        .mp-icon-pill {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: ${pillBg};
          border: 1px solid ${pillBorder};
          box-shadow: ${pillShadow};
          backdrop-filter: blur(12px);
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, box-shadow 0.2s, color 0.18s;
          -webkit-tap-highlight-color: transparent;
          outline: none;
          color: ${iconMuted};
          padding: 0;
          flex-shrink: 0;
        }
        .mp-icon-pill:focus-visible {
          outline: 2px solid rgba(255,159,28,0.5);
          outline-offset: 2px;
        }

        /* ── Search button variant ── */
        .mp-search-btn {
          /* base overridden inline — just ensure no default styles */
          background: none;
        }

        /* ── NotificationBell normalization ── */
        .mp-icon-pill > button,
        .mp-icon-pill button {
          all: unset !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100% !important;
          height: 100% !important;
          color: ${iconMuted} !important;
          position: relative !important;
          transition: color 0.18s ease, transform 0.2s cubic-bezier(0.34,1.56,0.64,1) !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        .mp-icon-pill button:hover {
          color: ${iconActive} !important;
          transform: scale(1.12) !important;
        }
        .mp-icon-pill button:active { transform: scale(0.88) !important; }
        .mp-icon-pill button svg {
          color: inherit !important;
          width: 17px !important;
          height: 17px !important;
          stroke-width: 1.9 !important;
        }

        /* ── Search input ── */
        .mp-search-input {
          width: 100%;
          height: 42px;
          padding: 0 72px 0 36px;
          border-radius: 14px;
          background: ${D ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.55)"};
          backdrop-filter: blur(16px);
          color: var(--text-primary);
          border: 1.5px solid ${D ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.75)"};
          box-shadow: ${
            D
              ? "0 1px 0 rgba(255,255,255,0.06) inset, 0 3px 14px rgba(0,0,0,0.25)"
              : "0 1px 0 rgba(255,255,255,0.95) inset, 0 2px 8px rgba(140,90,30,0.07)"
          };
          outline: none;
          font-family: "Plus Jakarta Sans", system-ui, sans-serif;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 0.01em;
          transition: border-color 0.22s, box-shadow 0.22s, background 0.22s;
          -webkit-appearance: none;
        }
        .mp-search-input::placeholder {
          color: ${D ? "rgba(255,184,77,0.22)" : "rgba(140,95,45,0.35)"};
        }
        .mp-search-input:focus {
          border-color: rgba(255,159,28,0.52);
          background: ${D ? "rgba(255,159,28,0.06)" : "rgba(255,252,245,0.78)"};
          box-shadow:
            0 0 0 3.5px rgba(255,159,28,0.12),
            ${D ? "0 1px 0 rgba(255,255,255,0.06) inset" : "0 1px 0 rgba(255,255,255,0.95) inset"};
        }

        /* ── Clear button ── */
        .mp-clear-btn {
          border-radius: 8px;
          border: 1.5px solid ${D ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.65)"};
          background: ${D ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.5)"};
          backdrop-filter: blur(8px);
          color: ${iconMuted};
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .mp-clear-btn:hover {
          background: ${D ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.78)"};
          border-color: rgba(255,159,28,0.4);
          color: var(--text-primary);
        }

        * { -webkit-tap-highlight-color: transparent; }

      `}</style>
      {showTour && <MenuTour onComplete={handleTourComplete} />}
    </div>
  );
};

export default MenuPage;
