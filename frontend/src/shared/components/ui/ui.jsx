// src/shared/ui/ui.jsx
// ═══════════════════════════════════════════════════════════════════════════
//  KAUSICHIYA CAFÉ — Unified Premium Design System
//  Tokens · Glass · Cards · Buttons · Inputs · Badges · Skeletons · Dividers
//  Dark / Light aware. Import from here in EVERY component.
// ═══════════════════════════════════════════════════════════════════════════

import { useRef, useEffect } from "react";
import gsap from "gsap";

// ─── Brand palette ────────────────────────────────────────────────────────────
export const T = {
  saffron: "#FF9F1C",
  terra: "#E05C2A",
  matcha: "#2D9B5A",
  purple: "#7C6AE8",
  crimson: "#D64045",

  // Dark surface layers
  d0: "#080502", // page bg
  d1: "#0F0804", // card bg
  d2: "#1A1008", // elevated
  d3: "#251608", // input bg

  // Light surface layers
  l0: "#EFE8D3",
  l1: "#FBF7EE",
  l2: "#FFFDF7",
  l3: "#FFFFFF",

  // Text dark
  dText: "#FFF8EE",
  dMuted: "#7A5C3A",
  dFaint: "#3D2810",

  // Text light
  lText: "#1A0E04",
  lMuted: "#9A7550",
  lFaint: "#C8B090",
};

// ─── Resolve token by theme ───────────────────────────────────────────────────
export const tv = (isDark, dark, light) => (isDark ? dark : light);

// ─── Glass surface style object ───────────────────────────────────────────────
export const glass = (isDark, opts = {}) => ({
  background: isDark
    ? `linear-gradient(160deg, rgba(22,13,5,0.97) 0%, rgba(10,6,2,0.92) 100%)`
    : `linear-gradient(160deg, rgba(255,254,250,0.99) 0%, rgba(246,240,224,0.80) 100%)`,
  backdropFilter: "blur(36px) saturate(1.9)",
  WebkitBackdropFilter: "blur(36px) saturate(1.9)",
  border: `1px solid ${isDark ? "rgba(255,159,28,0.09)" : "rgba(255,159,28,0.20)"}`,
  borderRadius: opts.radius ?? 20,
  boxShadow: isDark
    ? "0 2px 32px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.022)"
    : "0 2px 28px rgba(60,30,10,0.07), inset 0 1px 0 rgba(255,255,255,0.95)",
  ...opts,
});

// ─── Accent-bordered glass card ───────────────────────────────────────────────
export const accentCard = (isDark, color, opts = {}) => ({
  ...glass(isDark, opts),
  borderLeft: `3px solid ${color}`,
  position: "relative",
  overflow: "hidden",
});

// ─── Icon container ───────────────────────────────────────────────────────────
export const iconBox = (color, size = 36, radius = 11) => ({
  width: size,
  height: size,
  borderRadius: radius,
  flexShrink: 0,
  background: `linear-gradient(135deg, ${color}1E, ${color}38)`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: `0 4px 14px ${color}28`,
});

// ─── Typography presets ───────────────────────────────────────────────────────
export const type = {
  displayLg: (isDark) => ({
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: "-0.6px",
    margin: 0,
    color: tv(isDark, T.dText, T.lText),
  }),
  displayMd: (isDark) => ({
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: 17,
    fontWeight: 800,
    letterSpacing: "-0.4px",
    margin: 0,
    color: tv(isDark, T.dText, T.lText),
  }),
  label: (isDark) => ({
    fontFamily: "DM Sans, sans-serif",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.55px",
    textTransform: "uppercase",
    margin: 0,
    color: tv(isDark, T.dMuted, T.lMuted),
  }),
  body: (isDark) => ({
    fontFamily: "DM Sans, sans-serif",
    fontSize: 13,
    fontWeight: 500,
    margin: 0,
    color: tv(isDark, T.dText, T.lText),
  }),
  caption: (isDark) => ({
    fontFamily: "DM Sans, sans-serif",
    fontSize: 11,
    fontWeight: 500,
    margin: 0,
    color: tv(isDark, T.dMuted, T.lMuted),
  }),
  num: (isDark, size = 22) => ({
    fontFamily: "DM Sans, sans-serif",
    fontSize: size,
    fontWeight: 900,
    letterSpacing: "-0.8px",
    margin: 0,
    color: tv(isDark, T.dText, T.lText),
  }),
};

// ─── Glass ── reusable wrapper ────────────────────────────────────────────────
export const GlassCard = ({ children, isDark, style = {}, className }) => (
  <div className={className} style={{ ...glass(isDark), ...style }}>
    {children}
  </div>
);

// ─── Section header ───────────────────────────────────────────────────────────
export const SecHead = ({ icon: Icon, title, sub, isDark, right, mb = 16 }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: mb,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={iconBox(T.saffron, 32, 10)}>
        <Icon size={14} color={T.saffron} strokeWidth={2.1} />
      </div>
      <div>
        <h3 style={{ ...type.displayMd(isDark), fontSize: 14 }}>{title}</h3>
        {sub && <p style={{ ...type.caption(isDark), marginTop: 1 }}>{sub}</p>}
      </div>
    </div>
    {right && <div>{right}</div>}
  </div>
);

// ─── Badge ────────────────────────────────────────────────────────────────────
export const Badge = ({ label, color, isDark }) => (
  <span
    style={{
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: "0.4px",
      textTransform: "uppercase",
      padding: "3px 8px",
      borderRadius: 99,
      background: `${color}1A`,
      color,
      fontFamily: "DM Sans, sans-serif",
      border: `1px solid ${color}28`,
    }}
  >
    {label}
  </span>
);

// ─── Input ────────────────────────────────────────────────────────────────────
export const Input = ({ isDark, style = {}, ...props }) => (
  <input
    {...props}
    style={{
      width: "100%",
      boxSizing: "border-box",
      padding: "10px 14px",
      borderRadius: 12,
      fontSize: 13,
      border: `1px solid ${isDark ? "rgba(255,159,28,0.15)" : "rgba(255,159,28,0.22)"}`,
      background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.85)",
      color: tv(isDark, T.dText, T.lText),
      fontFamily: "DM Sans, sans-serif",
      outline: "none",
      transition: "border-color 0.18s, box-shadow 0.18s",
      ...style,
    }}
    onFocus={(e) => {
      e.target.style.borderColor = T.saffron + "60";
      e.target.style.boxShadow = `0 0 0 3px ${T.saffron}14`;
    }}
    onBlur={(e) => {
      e.target.style.borderColor = isDark
        ? "rgba(255,159,28,0.15)"
        : "rgba(255,159,28,0.22)";
      e.target.style.boxShadow = "none";
    }}
  />
);

// ─── Select ───────────────────────────────────────────────────────────────────
export const Select = ({ isDark, children, style = {}, ...props }) => (
  <select
    {...props}
    style={{
      width: "100%",
      boxSizing: "border-box",
      padding: "10px 14px",
      borderRadius: 12,
      fontSize: 13,
      border: `1px solid ${isDark ? "rgba(255,159,28,0.15)" : "rgba(255,159,28,0.22)"}`,
      background: isDark ? "rgba(26,16,8,0.95)" : "rgba(255,255,255,0.9)",
      color: tv(isDark, T.dText, T.lText),
      fontFamily: "DM Sans, sans-serif",
      outline: "none",
      cursor: "pointer",
      ...style,
    }}
  >
    {children}
  </select>
);

// ─── Primary button ───────────────────────────────────────────────────────────
export const BtnPrimary = ({
  children,
  onClick,
  style = {},
  disabled,
  ...rest
}) => {
  const ref = useRef(null);
  const tap = () => {
    if (!ref.current) return;
    gsap
      .timeline()
      .to(ref.current, { scale: 0.94, duration: 0.08, ease: "power2.in" })
      .to(ref.current, { scale: 1, duration: 0.35, ease: "back.out(2)" });
  };
  return (
    <button
      ref={ref}
      onClick={(e) => {
        tap();
        onClick?.(e);
      }}
      disabled={disabled}
      {...rest}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        padding: "10px 20px",
        borderRadius: 12,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        background: disabled
          ? "rgba(255,159,28,0.3)"
          : `linear-gradient(135deg, ${T.saffron}, ${T.terra})`,
        color: "#fff",
        fontSize: 13,
        fontWeight: 700,
        fontFamily: "DM Sans, sans-serif",
        letterSpacing: "0.1px",
        boxShadow: disabled ? "none" : `0 4px 18px ${T.saffron}44`,
        transition: "box-shadow 0.2s, opacity 0.2s",
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
};

// ─── Ghost button ─────────────────────────────────────────────────────────────
export const BtnGhost = ({
  children,
  onClick,
  isDark,
  style = {},
  ...rest
}) => {
  const ref = useRef(null);
  return (
    <button
      ref={ref}
      onClick={onClick}
      {...rest}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        padding: "10px 20px",
        borderRadius: 12,
        border: `1px solid ${isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)"}`,
        cursor: "pointer",
        background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
        color: tv(isDark, T.dText, T.lText),
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "DM Sans, sans-serif",
        transition: "background 0.18s",
        ...style,
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = isDark
          ? "rgba(255,255,255,0.09)"
          : "rgba(0,0,0,0.08)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = isDark
          ? "rgba(255,255,255,0.05)"
          : "rgba(0,0,0,0.04)")
      }
    >
      {children}
    </button>
  );
};

// ─── Icon button ──────────────────────────────────────────────────────────────
export const IconBtn = ({
  children,
  onClick,
  isDark,
  color,
  title,
  style = {},
}) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: 34,
      height: 34,
      borderRadius: 10,
      border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
      background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.7)",
      color: color ?? tv(isDark, T.dMuted, T.lMuted),
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      transition: "background 0.15s, color 0.15s",
      minHeight: "unset",
      minWidth: "unset",
      ...style,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = color
        ? `${color}18`
        : isDark
          ? "rgba(255,255,255,0.10)"
          : "rgba(0,0,0,0.07)";
      if (color) e.currentTarget.style.color = color;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = isDark
        ? "rgba(255,255,255,0.05)"
        : "rgba(255,255,255,0.7)";
      e.currentTarget.style.color = color ?? tv(isDark, T.dMuted, T.lMuted);
    }}
  >
    {children}
  </button>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export const Skeleton = ({ h, isDark, mb = 10, radius = 16 }) => (
  <div
    style={{
      height: h,
      borderRadius: radius,
      marginBottom: mb,
      background: isDark
        ? "linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 100%)"
        : "linear-gradient(90deg, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0.06) 50%, rgba(0,0,0,0.03) 100%)",
      backgroundSize: "200% 100%",
      animation: "kc-shimmer 1.8s ease-in-out infinite",
    }}
  />
);

// ─── Divider with gradient ─────────────────────────────────────────────────────
export const Divider = ({ isDark, my = 16 }) => (
  <div
    style={{
      height: 1,
      margin: `${my}px 0`,
      background: `linear-gradient(90deg, transparent, ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"}, transparent)`,
    }}
  />
);

// ─── Animated counter ─────────────────────────────────────────────────────────
export const AnimCounter = ({ value, prefix = "", suffix = "" }) => {
  const ref = useRef(null);
  const obj = useRef({ n: 0 });
  useEffect(() => {
    if (!ref.current || value == null) return;
    gsap.to(obj.current, {
      n: value,
      duration: 1.6,
      ease: "power3.out",
      onUpdate: () => {
        if (ref.current)
          ref.current.textContent = `${prefix}${Math.round(obj.current.n).toLocaleString("en-IN")}${suffix}`;
      },
    });
  }, [value]);
  return (
    <span ref={ref}>
      {prefix}0{suffix}
    </span>
  );
};

// ─── Animated entrance hook ───────────────────────────────────────────────────
export const useEntrance = (delay = 0, from = {}) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 18, scale: 0.96, ...from },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.55,
        delay,
        ease: "back.out(1.6)",
      },
    );
  }, []);
  return ref;
};

// ─── Hover lift ───────────────────────────────────────────────────────────────
export const hoverLift = (el, glowEl) => ({
  onMouseEnter: () => {
    gsap.to(el, { y: -3, duration: 0.22, ease: "power2.out" });
    if (glowEl) gsap.to(glowEl, { opacity: 1, duration: 0.22 });
  },
  onMouseLeave: () => {
    gsap.to(el, { y: 0, duration: 0.28, ease: "power2.out" });
    if (glowEl) gsap.to(glowEl, { opacity: 0, duration: 0.28 });
  },
});

// ─── Global keyframes (inject once) ──────────────────────────────────────────
export const GlobalStyles = () => (
  <style>{`
    @keyframes kc-shimmer { 0%,100%{opacity:1} 50%{opacity:0.4} }
    @keyframes kc-spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes kc-pulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(0.96)} }
    @keyframes kc-float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
    @keyframes kc-fadein  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes kc-slidein { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
    @keyframes kc-glowpulse {
      0%,100%{box-shadow:0 0 0 0 rgba(255,159,28,0.0)}
      50%    {box-shadow:0 0 0 6px rgba(255,159,28,0.12)}
    }
    .kc-hoverlift { transition: transform 0.22s ease, box-shadow 0.22s ease; }
    .kc-hoverlift:hover { transform: translateY(-2px); }
    .kc-spin { animation: kc-spin 1s linear infinite; }
    input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }
  `}</style>
);

export default { T, glass, accentCard, iconBox, type, tv };
