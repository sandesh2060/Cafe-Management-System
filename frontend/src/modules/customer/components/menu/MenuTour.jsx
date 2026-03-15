// src/modules/customer/components/menu/MenuTour.jsx
//
// FIX: Accept `islandRef` as a prop from MenuPage.
// The island lives in a createPortal — document.querySelector('[data-tour="island"]')
// returns null at measure time because the portal hasn't flushed yet.
// Passing the ref directly bypasses the DOM query entirely.

import { useEffect, useRef, useState, useContext, useCallback } from "react";
import gsap from "gsap";
import { ThemeContext } from "@shared/context/ThemeContext";
import { X, ChevronRight, Sparkles } from "lucide-react";

const STEPS = [
  {
    id: "welcome",
    emoji: "🎉",
    title: "Welcome to कौसी चिया!",
    body: "You're all set. Let's take a 20-second tour of the menu.",
    target: null,
    cardAnchor: "center",
  },
  {
    id: "navbar",
    emoji: "🧭",
    title: "Your Command Centre",
    body: "Your avatar, table number, notifications and search all live up here. Tap 🔍 to find any dish instantly.",
    target: "island",
    cardAnchor: "below",
  },
  {
    id: "categories",
    emoji: "🏷️",
    title: "Browse by Category",
    body: "Swipe through categories to filter the menu. This bar sticks to the top as you scroll.",
    target: "pills",
    cardAnchor: "below",
  },
  {
    id: "menu",
    emoji: "🍽️",
    title: "Tap Any Dish to Order",
    body: "Every card shows price, rating and spice level. Tap to customise and add to your cart.",
    target: "grid",
    cardAnchor: "above",
  },
  {
    id: "cart",
    emoji: "🛒",
    title: "Cart is Always One Tap Away",
    body: "Once you add items, the cart bar appears at the bottom. Tap it anytime to review and checkout.",
    target: "fab",
    cardAnchor: "above",
  },
  {
    id: "done",
    emoji: "✨",
    title: "You're All Set!",
    body: "Loyalty points start counting from your very first order. Enjoy your meal! 🙏",
    target: null,
    cardAnchor: "center",
  },
];

const PAD = 8;

function measureTarget(target, islandRef) {
  if (!target) return null;

  if (target === "island") {
    // Use passed ref first — avoids portal timing issues with querySelector
    const el = islandRef?.current ?? document.querySelector('[data-tour="island"]');
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        return {
          top:    r.top    - PAD,
          left:   r.left   - PAD,
          width:  r.width  + PAD * 2,
          height: r.height + PAD * 2,
          radius: 32,
        };
      }
    }
    // Fallback: top strip
    return {
      top: 6, left: 12,
      width: window.innerWidth - 24,
      height: 72, radius: 32,
    };
  }

  if (target === "pills") {
    const el = document.querySelector(".cp-scroll");
    if (el) {
      const sticky = el.closest(".sticky") || el.parentElement;
      const r = (sticky || el).getBoundingClientRect();
      return { top: r.top, left: 0, width: window.innerWidth, height: r.height, radius: 0 };
    }
    return null;
  }

  if (target === "grid") {
    const el = document.querySelector('section[aria-label="Menu items"]');
    if (el) {
      const r = el.getBoundingClientRect();
      const visTop = Math.max(r.top, 0);
      if (visTop > window.innerHeight - 80) return null;
      const visH = Math.min(r.height, window.innerHeight * 0.42);
      return {
        top:    visTop - PAD,
        left:   PAD,
        width:  window.innerWidth - PAD * 2,
        height: Math.min(visH, window.innerHeight - visTop - 20),
        radius: 18,
      };
    }
    return null;
  }

  if (target === "fab") {
    const el = document.querySelector('[data-tour="fab"]');
    if (el) {
      const r = el.getBoundingClientRect();
      return {
        top:    r.top    - PAD,
        left:   r.left   - PAD,
        width:  r.width  + PAD * 2,
        height: r.height + PAD * 2,
        radius: 24,
      };
    }
    // Fallback: synthesize bottom bar area
    const barH = 86;
    const barW = Math.min(window.innerWidth - 32, 480);
    const barLeft = (window.innerWidth - barW) / 2;
    const barTop = window.innerHeight - barH - 14;
    return {
      top:    barTop - PAD,
      left:   barLeft - PAD,
      width:  barW + PAD * 2,
      height: barH + PAD * 2,
      radius: 24,
    };
  }

  return null;
}

function SpotlightOverlay({ spot, opacity = 0.78 }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!spot) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 998,
        background: `rgba(0,0,0,${opacity})`,
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
        pointerEvents: "none",
      }} />
    );
  }

  const { top, left, width, height, radius = 0 } = spot;
  const r = Math.min(radius, Math.min(width, height) / 2);
  const hole = [
    `M ${left + r} ${top}`,
    `L ${left + width - r} ${top}`,
    `Q ${left + width} ${top} ${left + width} ${top + r}`,
    `L ${left + width} ${top + height - r}`,
    `Q ${left + width} ${top + height} ${left + width - r} ${top + height}`,
    `L ${left + r} ${top + height}`,
    `Q ${left} ${top + height} ${left} ${top + height - r}`,
    `L ${left} ${top + r}`,
    `Q ${left} ${top} ${left + r} ${top} Z`,
  ].join(" ");

  return (
    <svg style={{
      position: "fixed", inset: 0, zIndex: 998,
      width: vw, height: vh,
      pointerEvents: "none", overflow: "visible",
    }}>
      <defs>
        <mask id="tour-mask">
          <rect width={vw} height={vh} fill="white" />
          <path d={hole} fill="black" />
        </mask>
        <filter id="tour-glow">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width={vw} height={vh} fill={`rgba(0,0,0,${opacity})`} mask="url(#tour-mask)" />
      <path d={hole} fill="none" stroke="rgba(255,159,28,0.75)" strokeWidth="2"
        strokeDasharray="7 4" style={{ animation: "tour-dash 1.6s linear infinite" }} />
      <path d={hole} fill="none" stroke="rgba(255,210,70,0.28)" strokeWidth="12" filter="url(#tour-glow)" />
      <style>{`@keyframes tour-dash { to { stroke-dashoffset: -22; } }`}</style>
    </svg>
  );
}

function getCardStyle(anchor, spot) {
  const CARD_W   = Math.min(window.innerWidth - 40, 380);
  const CARD_LEFT = (window.innerWidth - CARD_W) / 2;
  const GAP = 14;
  const base = { position: "fixed", zIndex: 1000, width: CARD_W, left: CARD_LEFT, willChange: "transform, opacity" };

  if (anchor === "center") {
    return { ...base, top: Math.round((window.innerHeight - 280) / 2) };
  }
  if (anchor === "below" && spot) {
    return { ...base, top: Math.min(spot.top + spot.height + GAP, window.innerHeight - 320) };
  }
  if (anchor === "above" && spot) {
    return { ...base, bottom: Math.min(window.innerHeight - (spot.top - GAP), window.innerHeight - 80) };
  }
  return { ...base, top: Math.round(window.innerHeight * 0.28) };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const MenuTour = ({ onComplete, islandRef }) => {
  const { isDark } = useContext(ThemeContext);
  const D = isDark;

  const [step,      setStep]      = useState(0);
  const [spot,      setSpot]      = useState(null);
  const [cardStyle, setCardStyle] = useState({});

  const wrapRef = useRef(null);
  const cardRef = useRef(null);
  const stepRef = useRef(0);

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  const measureAndSet = useCallback((stepIdx) => {
    const s = STEPS[stepIdx];
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const measured = measureTarget(s.target, islandRef);
        setSpot(measured);
        setCardStyle(getCardStyle(s.cardAnchor, measured));
      });
    });
  }, [islandRef]);

  useEffect(() => { measureAndSet(step); }, [step, measureAndSet]);

  useEffect(() => {
    const onResize = () => measureAndSet(stepRef.current);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, [measureAndSet]);

  useEffect(() => {
    if (wrapRef.current)
      gsap.fromTo(wrapRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" });
    animateCardIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animateCardIn = useCallback(() => {
    if (!cardRef.current) return;
    gsap.fromTo(cardRef.current,
      { y: 28, opacity: 0, scale: 0.94 },
      { y: 0, opacity: 1, scale: 1, duration: 0.46, ease: "back.out(1.7)", clearProps: "scale" }
    );
  }, []);

  const animateCardOut = useCallback((cb) => {
    if (!cardRef.current) { cb?.(); return; }
    gsap.to(cardRef.current, { y: -16, opacity: 0, scale: 0.96, duration: 0.20, ease: "power2.in", onComplete: cb });
  }, []);

  const goToStep = useCallback((nextStep) => {
    stepRef.current = nextStep;
    animateCardOut(() => {
      setStep(nextStep);
      requestAnimationFrame(() => requestAnimationFrame(animateCardIn));
    });
  }, [animateCardIn, animateCardOut]);

  const finish = useCallback(() => {
    if (wrapRef.current) {
      gsap.to(wrapRef.current, { opacity: 0, duration: 0.3, ease: "power2.in", onComplete: () => onComplete?.() });
    } else {
      onComplete?.();
    }
  }, [onComplete]);

  const next = useCallback(() => {
    if (isLast) { finish(); return; }
    goToStep(step + 1);
  }, [isLast, step, goToStep, finish]);

  const noSpot = !current.target;

  const cardBg     = D ? "rgba(8,4,1,0.97)"       : "rgba(253,249,241,0.98)";
  const cardBorder = D ? "rgba(255,159,28,0.22)"   : "rgba(255,255,255,0.9)";
  const cardShadow = D
    ? "0 0 0 1px rgba(255,159,28,0.08), 0 28px 72px rgba(0,0,0,0.88), 0 8px 24px rgba(0,0,0,0.55)"
    : "0 0 0 1px rgba(200,175,120,0.22), 0 24px 56px rgba(90,50,20,0.26), 0 6px 16px rgba(90,50,20,0.10)";
  const textPri  = D ? "#FFF8EE"                : "#120D06";
  const textSec  = D ? "rgba(240,210,150,0.68)" : "rgba(92,51,23,0.62)";
  const textHint = D ? "rgba(255,159,28,0.32)"  : "rgba(140,80,10,0.32)";
  const dotIdle  = D ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";

  return (
    <div ref={wrapRef} style={{ position: "fixed", inset: 0, zIndex: 997, opacity: 0 }}>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 997, cursor: "pointer" }}
        onClick={next} role="presentation" aria-hidden="true"
      />

      <SpotlightOverlay spot={noSpot ? null : spot} opacity={noSpot ? 0.72 : 0.76} />

      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          ...cardStyle,
          background: cardBg,
          backdropFilter: "blur(48px) saturate(180%)",
          WebkitBackdropFilter: "blur(48px) saturate(180%)",
          borderRadius: 24,
          border: `1px solid ${cardBorder}`,
          boxShadow: cardShadow,
          padding: "22px 20px 18px",
          overflow: "hidden",
        }}
      >
        {/* Gold top edge */}
        <div style={{
          position: "absolute", top: 0, left: "8%", right: "8%",
          height: 1.5, borderRadius: 99,
          background: "linear-gradient(90deg,transparent,#FF9F1C 30%,#FFD580 50%,#E05C2A 70%,transparent)",
          opacity: D ? 0.7 : 0.5,
        }} />

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 5, marginBottom: 18 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              flex: i === step ? 3 : 1, height: 4, borderRadius: 99,
              background: i <= step ? "linear-gradient(90deg,#FF9F1C,#E05C2A)" : dotIdle,
              opacity: i <= step ? 1 : 0.35,
              transition: "flex 0.42s cubic-bezier(.22,.68,0,1.2), background 0.28s",
            }} />
          ))}
        </div>

        {/* Emoji */}
        <div style={{
          width: 48, height: 48, borderRadius: 14, marginBottom: 12,
          background: D ? "rgba(255,159,28,0.10)" : "rgba(255,159,28,0.08)",
          border: D ? "1px solid rgba(255,159,28,0.20)" : "1px solid rgba(255,159,28,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, boxShadow: "0 4px 14px rgba(255,159,28,0.14)",
        }}>
          {current.emoji}
        </div>

        <h3 style={{
          fontFamily: '"DM Sans", system-ui, sans-serif', fontWeight: 800,
          fontSize: "clamp(17px, 4.5vw, 21px)", letterSpacing: "-0.03em",
          lineHeight: 1.2, color: textPri, margin: "0 0 9px",
        }}>
          {current.title}
        </h3>

        <p style={{
          fontFamily: '"DM Sans", system-ui, sans-serif',
          fontSize: 13.5, lineHeight: 1.6, color: textSec, margin: "0 0 18px",
        }}>
          {current.body}
        </p>

        {!noSpot && (
          <p style={{
            fontFamily: '"DM Sans", system-ui, sans-serif',
            fontSize: 10.5, fontWeight: 600, color: textHint,
            margin: "0 0 14px", letterSpacing: "0.04em", textTransform: "uppercase",
          }}>
            Tap anywhere to continue
          </p>
        )}

        <div style={{ display: "flex", gap: 9 }}>
          <button
            onClick={(e) => { e.stopPropagation(); finish(); }}
            style={{
              padding: "10px 14px", borderRadius: 12, border: "none",
              background: D ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
              color: D ? "rgba(255,200,90,0.4)" : "rgba(120,80,20,0.4)",
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontWeight: 600, fontSize: 13, cursor: "pointer",
              WebkitTapHighlightColor: "transparent", flexShrink: 0,
            }}
          >
            Skip
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "13px 18px", borderRadius: 14, border: "none",
              background: isLast ? "linear-gradient(135deg,#22c55e,#16a34a)" : "linear-gradient(135deg,#FF9F1C,#E05C2A)",
              color: "#fff",
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontWeight: 700, fontSize: 14, cursor: "pointer",
              boxShadow: isLast ? "0 6px 22px rgba(34,197,94,0.38)" : "0 6px 22px rgba(255,159,28,0.38)",
              WebkitTapHighlightColor: "transparent",
              position: "relative", overflow: "hidden",
            }}
          >
            <span style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(105deg,transparent 38%,rgba(255,255,255,0.20) 50%,transparent 62%)",
              backgroundSize: "200% 100%",
              animation: "tour-shimmer 2.4s ease-in-out infinite",
              pointerEvents: "none",
            }} />
            {isLast
              ? <><Sparkles size={14} strokeWidth={2.5} /> Let's Eat!</>
              : <>Next <ChevronRight size={14} strokeWidth={2.5} /></>
            }
          </button>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); finish(); }}
          style={{
            position: "absolute", top: 14, right: 14,
            width: 28, height: 28, borderRadius: 8, border: "none",
            background: D ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
            color: D ? "rgba(255,200,90,0.4)" : "rgba(120,80,20,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", WebkitTapHighlightColor: "transparent",
          }}
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      </div>

      <style>{`
        @keyframes tour-dash    { to { stroke-dashoffset: -22; } }
        @keyframes tour-shimmer {
          0%   { background-position: -200% 0; }
          60%  { background-position: 200% 0;  }
          100% { background-position: 200% 0;  }
        }
      `}</style>
    </div>
  );
};

export default MenuTour;