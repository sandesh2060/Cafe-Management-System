// src/modules/customer/components/menu/MenuTour.jsx
import { useEffect, useRef, useState, useContext, useCallback } from "react";
import gsap from "gsap";
import { ThemeContext } from "@shared/context/ThemeContext";
import { X, ChevronRight, Sparkles } from "lucide-react";

/* ─────────────────────────────────────────────
   STEPS — each step describes what to highlight
   and where to place the explanation card.
───────────────────────────────────────────── */
const STEPS = [
  {
    id: "welcome",
    emoji: "🎉",
    title: "Welcome to कौसी चिया!",
    body: "You're all set. Let's take a quick 15-second tour of the menu.",
    target: null,          // no spotlight — full dark overlay
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
    body: "Once you add items, the cart bar appears here. Tap it anytime to review and checkout.",
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

/* ─────────────────────────────────────────────
   Measure where each target element sits
   so we can draw the spotlight around it.
───────────────────────────────────────────── */
function measureTarget(target) {
  if (!target) return null;

  // island = the fixed floating pill navbar
  if (target === "island") {
    const el = document.querySelector('[data-tour="island"]');
    if (el) {
      const r = el.getBoundingClientRect();
      return { top: r.top - 6, left: r.left - 8, width: r.width + 16, height: r.height + 12, radius: 28 };
    }
    // fallback: top strip
    const safeTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sat") || "0");
    return { top: safeTop, left: 16, width: window.innerWidth - 32, height: 68, radius: 28 };
  }

  if (target === "pills") {
    const el = document.querySelector('[data-tour="pills"]');
    if (el) {
      const r = el.getBoundingClientRect();
      return { top: r.top - 4, left: 0, width: window.innerWidth, height: r.height + 8, radius: 0 };
    }
    const islandH = 90;
    return { top: islandH, left: 0, width: window.innerWidth, height: 72, radius: 0 };
  }

  if (target === "grid") {
    const el = document.querySelector('[data-tour="grid"]');
    if (el) {
      const r = el.getBoundingClientRect();
      const visTop = Math.max(r.top, 140);
      const visH = Math.min(260, window.innerHeight * 0.38);
      return { top: visTop, left: 12, width: window.innerWidth - 24, height: visH, radius: 18 };
    }
    return { top: window.innerHeight * 0.38, left: 12, width: window.innerWidth - 24, height: 240, radius: 18 };
  }

  if (target === "fab") {
    const el = document.querySelector('[data-tour="fab"]');
    if (el) {
      const r = el.getBoundingClientRect();
      return { top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16, radius: 20 };
    }
    // FloatingActions is at bottom:20px+safeArea, full width up to 416px
    const fabH = 52;
    const fabBottom = 20 + (window.innerWidth <= 480 ? 0 : 0); // simplified
    const fabTop = window.innerHeight - fabBottom - fabH - 20;
    const fabW = Math.min(window.innerWidth - 32, 416);
    const fabLeft = (window.innerWidth - fabW) / 2;
    return { top: fabTop, left: fabLeft, width: fabW, height: fabH + 16, radius: 18 };
  }

  return null;
}

/* ─────────────────────────────────────────────
   SVG mask overlay — punches a hole around
   the spotlight rect while darkening the rest.
───────────────────────────────────────────── */
const SpotlightOverlay = ({ spot, opacity = 0.82 }) => {
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
  const r = radius;
  // SVG path: full rect with rounded-rect hole cut out
  const outer = `M 0 0 H ${vw} V ${vh} H 0 Z`;
  const hole  = `M ${left + r} ${top}
    L ${left + width - r} ${top}
    Q ${left + width} ${top} ${left + width} ${top + r}
    L ${left + width} ${top + height - r}
    Q ${left + width} ${top + height} ${left + width - r} ${top + height}
    L ${left + r} ${top + height}
    Q ${left} ${top + height} ${left} ${top + height - r}
    L ${left} ${top + r}
    Q ${left} ${top} ${left + r} ${top} Z`;

  return (
    <svg
      style={{
        position: "fixed", inset: 0, zIndex: 998,
        width: vw, height: vh,
        pointerEvents: "none",
        backdropFilter: "blur(1px)",
      }}
    >
      <defs>
        <mask id="tour-hole">
          <rect width={vw} height={vh} fill="white" />
          <path d={hole} fill="black" />
        </mask>
      </defs>
      <rect
        width={vw} height={vh}
        fill={`rgba(0,0,0,${opacity})`}
        mask="url(#tour-hole)"
      />
      {/* Gold border around the spotlight */}
      <path
        d={hole}
        fill="none"
        stroke="rgba(255,159,28,0.7)"
        strokeWidth="2"
        strokeDasharray="6 4"
        style={{ animation: "tour-dash 1.5s linear infinite" }}
      />
      {/* Soft glow ring */}
      <path
        d={hole}
        fill="none"
        stroke="rgba(255,213,80,0.35)"
        strokeWidth="8"
        filter="url(#blur)"
      />
      <defs>
        <filter id="blur">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
    </svg>
  );
};

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
const MenuTour = ({ onComplete }) => {
  const { isDark } = useContext(ThemeContext);
  const D = isDark;

  const [step,    setStep]    = useState(0);
  const [spot,    setSpot]    = useState(null);
  const [visible, setVisible] = useState(false);

  const wrapRef = useRef(null);
  const cardRef = useRef(null);

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  /* ── Measure spotlight on step change ── */
  useEffect(() => {
    const s = measureTarget(current.target);
    setSpot(s);
  }, [step, current.target]);

  /* ── Entrance ── */
  useEffect(() => {
    setVisible(true);
    if (wrapRef.current) {
      gsap.fromTo(wrapRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" });
    }
    animateCardIn();
  }, []);

  const animateCardIn = useCallback(() => {
    if (!cardRef.current) return;
    gsap.fromTo(cardRef.current,
      { y: 32, opacity: 0, scale: 0.93 },
      { y: 0,  opacity: 1, scale: 1, duration: 0.48, ease: "back.out(1.7)", clearProps: "transform,opacity" }
    );
  }, []);

  const animateCardOut = useCallback((cb) => {
    if (!cardRef.current) { cb?.(); return; }
    gsap.to(cardRef.current, {
      y: -18, opacity: 0, scale: 0.95,
      duration: 0.22, ease: "power2.in",
      onComplete: cb,
    });
  }, []);

  const next = () => {
    if (isLast) { finish(); return; }
    animateCardOut(() => {
      setStep(s => s + 1);
      // small rAF so DOM settles before animating in
      requestAnimationFrame(() => requestAnimationFrame(animateCardIn));
    });
  };

  const finish = () => {
    if (wrapRef.current) {
      gsap.to(wrapRef.current, {
        opacity: 0, duration: 0.35, ease: "power2.in",
        onComplete: () => onComplete?.(),
      });
    } else {
      onComplete?.();
    }
  };

  /* ── Card positioning — purely positional, no conflicting transforms ── */
  const cardStyle = (() => {
    const base = {
      position: "fixed",
      zIndex: 1000,
      width: "calc(100vw - 40px)",
      maxWidth: 380,
    };

    if (current.cardAnchor === "center") {
      // use top+marginTop instead of transform so GSAP doesn't fight it
      return {
        ...base,
        top: "50%",
        left: "50%",
        marginTop: -160,   // approx half card height
        marginLeft: -180,  // half of 360px
        width: "min(calc(100vw - 40px), 360px)",
      };
    }

    if (current.cardAnchor === "below" && spot) {
      const cardTop = spot.top + spot.height + 14;
      return { ...base, top: Math.min(cardTop, window.innerHeight - 280), left: 20, right: 20, width: "auto" };
    }

    if (current.cardAnchor === "above" && spot) {
      const cardBottom = window.innerHeight - spot.top + 14;
      return { ...base, bottom: Math.min(cardBottom, window.innerHeight - 280), left: 20, right: 20, width: "auto" };
    }

    // fallback center-ish
    return { ...base, top: "30%", left: 20, right: 20, width: "auto" };
  })();

  /* ── Fallback card pos for no-spotlight steps ── */
  const noSpot = !current.target;

  return (
    <div ref={wrapRef} style={{ position: "fixed", inset: 0, zIndex: 997 }}>
      {/* Keyboard trap */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 997 }}
        onClick={next}
        role="presentation"
      />

      {/* Dark overlay with SVG hole */}
      <SpotlightOverlay spot={noSpot ? null : spot} opacity={noSpot ? 0.75 : 0.80} />

      {/* Tour card */}
      <div
        ref={cardRef}
        onClick={e => e.stopPropagation()}
        style={{
          ...cardStyle,
          background: D ? "rgba(8,4,1,0.96)" : "rgba(252,248,238,0.97)",
          backdropFilter: "blur(48px) saturate(180%)",
          WebkitBackdropFilter: "blur(48px) saturate(180%)",
          borderRadius: 24,
          border: D ? "1px solid rgba(255,159,28,0.2)" : "1px solid rgba(255,255,255,0.88)",
          boxShadow: D
            ? "0 0 0 1px rgba(255,159,28,0.08), 0 32px 80px rgba(0,0,0,0.85), 0 8px 24px rgba(0,0,0,0.5)"
            : "0 0 0 1px rgba(220,190,120,0.25), 0 24px 60px rgba(92,51,23,0.28), 0 8px 16px rgba(92,51,23,0.12)",
          padding: "22px 20px 18px",
          overflow: "hidden",
          willChange: "transform, opacity",
        }}
      >
        {/* Gold top edge */}
        <div style={{
          position: "absolute", top: 0, left: "10%", right: "10%",
          height: 1.5, borderRadius: 99,
          background: "linear-gradient(90deg,transparent,#FF9F1C 28%,#FFD580 50%,#E05C2A 72%,transparent)",
          opacity: D ? 0.7 : 0.55,
        }} />

        {/* Step dots */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 18 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              flex: i === step ? 3 : 1,
              height: 4, borderRadius: 99,
              background: i <= step
                ? "linear-gradient(90deg,#FF9F1C,#E05C2A)"
                : D ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
              transition: "flex 0.4s cubic-bezier(.22,.68,0,1.2), background 0.3s",
              opacity: i <= step ? 1 : 0.35,
            }} />
          ))}
        </div>

        {/* Emoji icon */}
        <div style={{
          width: 48, height: 48, borderRadius: 14, marginBottom: 12,
          background: D ? "rgba(255,159,28,0.1)" : "rgba(255,159,28,0.08)",
          border: D ? "1px solid rgba(255,159,28,0.2)" : "1px solid rgba(255,159,28,0.16)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24,
          boxShadow: "0 4px 16px rgba(255,159,28,0.15)",
        }}>
          {current.emoji}
        </div>

        <h3 style={{
          fontFamily: '"DM Sans", system-ui, sans-serif',
          fontWeight: 800,
          fontSize: "clamp(17px, 4.5vw, 21px)",
          letterSpacing: "-0.03em",
          lineHeight: 1.2,
          color: D ? "#FFF8EE" : "#120D06",
          margin: "0 0 9px",
        }}>
          {current.title}
        </h3>

        <p style={{
          fontFamily: '"DM Sans", system-ui, sans-serif',
          fontSize: 13.5,
          lineHeight: 1.6,
          color: D ? "rgba(240,210,150,0.7)" : "rgba(92,51,23,0.66)",
          margin: "0 0 20px",
        }}>
          {current.body}
        </p>

        {/* Tap anywhere hint */}
        {!noSpot && (
          <p style={{
            fontFamily: '"DM Sans", system-ui, sans-serif',
            fontSize: 11, fontWeight: 600,
            color: D ? "rgba(255,159,28,0.35)" : "rgba(140,80,10,0.35)",
            margin: "0 0 14px",
            letterSpacing: "0.04em",
          }}>
            TAP ANYWHERE TO CONTINUE
          </p>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={finish}
            style={{
              padding: "10px 14px", borderRadius: 12, border: "none",
              background: D ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
              color: D ? "rgba(255,200,90,0.45)" : "rgba(120,80,20,0.45)",
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontWeight: 600, fontSize: 13,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              flexShrink: 0,
            }}
          >
            Skip
          </button>

          <button
            onClick={next}
            style={{
              flex: 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "13px 18px", borderRadius: 14, border: "none",
              background: isLast
                ? "linear-gradient(135deg,#22c55e,#16a34a)"
                : "linear-gradient(135deg,#FF9F1C,#E05C2A)",
              color: "#fff",
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontWeight: 700, fontSize: 14,
              cursor: "pointer",
              boxShadow: isLast
                ? "0 6px 24px rgba(34,197,94,0.4)"
                : "0 6px 24px rgba(255,159,28,0.4)",
              WebkitTapHighlightColor: "transparent",
              position: "relative", overflow: "hidden",
              transition: "box-shadow 0.2s",
            }}
          >
            {/* shimmer sweep */}
            <span style={{
              position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
              background: "linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.22) 50%,transparent 60%)",
              backgroundSize: "200% 100%",
              animation: "tour-btn-shimmer 2.2s ease-in-out infinite",
              pointerEvents: "none",
            }} />
            {isLast
              ? <><Sparkles size={14} strokeWidth={2.5} /> Let's Eat!</>
              : <>Next <ChevronRight size={14} strokeWidth={2.5} /></>
            }
          </button>
        </div>

        {/* X close */}
        <button
          onClick={finish}
          style={{
            position: "absolute", top: 14, right: 14,
            width: 28, height: 28, borderRadius: 8, border: "none",
            background: D ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
            color: D ? "rgba(255,200,90,0.4)" : "rgba(120,80,20,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      </div>

      {/* Scoped styles */}
      <style>{`
        @keyframes tour-dash {
          to { stroke-dashoffset: -20; }
        }
        @keyframes tour-btn-shimmer {
          0%   { background-position: -200% 0; }
          60%  { background-position: 200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

export default MenuTour; 