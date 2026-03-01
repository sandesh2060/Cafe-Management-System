// src/modules/customer/components/menu/WelcomeCard.jsx
import { useRef, useEffect, useContext, useMemo } from "react";
import { useSelector } from "react-redux";
import gsap from "gsap";
import { Clock, Wifi, Armchair, ShoppingBag } from "lucide-react";
import { ThemeContext } from "@shared/context/ThemeContext";
import { selectUser, selectIsGuest } from "@store/slices/authSlice";
import {
  selectTableNumber,
  selectSession,
} from "@store/slices/tableSessionSlice";
import { selectCartItems } from "@store/slices/cartSlice";

// ─── Font injection ────────────────────────────────────────────
const injectFonts = () => {
  if (document.getElementById("wc-fonts")) return;
  ["https://fonts.googleapis.com", "https://fonts.gstatic.com"].forEach(
    (href, i) => {
      const l = document.createElement("link");
      l.rel = "preconnect";
      l.href = href;
      if (i === 1) l.crossOrigin = "anonymous";
      document.head.appendChild(l);
    },
  );
  const link = document.createElement("link");
  link.id = "wc-fonts";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=Bricolage+Grotesque:opsz,wght@12..96,800;12..96,900&display=swap";
  document.head.appendChild(link);
};

// ─── Greeting ─────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 5) return { label: "Late Night", sub: "Something special awaits" };
  if (h < 12)
    return { label: "Good Morning", sub: "Start your day deliciously" };
  if (h < 17)
    return { label: "Good Afternoon", sub: "Time for a flavourful break" };
  if (h < 21) return { label: "Good Evening", sub: "Dinner is served" };
  return { label: "Good Night", sub: "Late night cravings sorted" };
};

// ─── Tier config ───────────────────────────────────────────────
const TIER = {
  none: { emoji: "☕", label: "New Member" },
  bronze: { emoji: "🥉", label: "Bronze" },
  silver: { emoji: "🥈", label: "Silver" },
  gold: { emoji: "🥇", label: "Gold" },
};

// ─── Weather themes (light / dark variants) ───────────────────
const WEATHER_THEME = {
  sunny: {
    light: {
      bg: ["#FF9A3C", "#FFCD3C", "#FFF0A0"],
      text: "#7A3B00",
      sub: "rgba(100,50,0,0.55)",
      pill: "rgba(255,255,255,0.35)",
      shadow: "rgba(255,160,30,0.45)",
    },
    dark: {
      bg: ["#7C2D00", "#B45309", "#D97706"],
      text: "#FFE4A0",
      sub: "rgba(255,220,150,0.55)",
      pill: "rgba(0,0,0,0.28)",
      shadow: "rgba(200,100,0,0.55)",
    },
  },
  hot: {
    light: {
      bg: ["#FF6B6B", "#FF8E53", "#FFCB77"],
      text: "#7A1515",
      sub: "rgba(120,30,20,0.5)",
      pill: "rgba(255,255,255,0.32)",
      shadow: "rgba(255,80,50,0.45)",
    },
    dark: {
      bg: ["#7F1D1D", "#9B2335", "#C0392B"],
      text: "#FFCDD2",
      sub: "rgba(255,180,180,0.5)",
      pill: "rgba(0,0,0,0.28)",
      shadow: "rgba(180,30,30,0.55)",
    },
  },
  rainy: {
    light: {
      bg: ["#A8CABA", "#5D9FBF", "#EBF4F5"],
      text: "#1A3A5C",
      sub: "rgba(20,60,100,0.5)",
      pill: "rgba(255,255,255,0.38)",
      shadow: "rgba(80,130,180,0.4)",
    },
    dark: {
      bg: ["#0D1B2A", "#1B3A5C", "#2C5F8A"],
      text: "#B0D4F1",
      sub: "rgba(150,200,240,0.5)",
      pill: "rgba(0,0,0,0.3)",
      shadow: "rgba(30,80,150,0.55)",
    },
  },
  cold: {
    light: {
      bg: ["#D4F1F9", "#89CFF0", "#BFEFFF"],
      text: "#0C3547",
      sub: "rgba(10,60,100,0.45)",
      pill: "rgba(255,255,255,0.4)",
      shadow: "rgba(80,180,230,0.4)",
    },
    dark: {
      bg: ["#0A1628", "#0D2E5C", "#1A4F8C"],
      text: "#C5E8FF",
      sub: "rgba(150,210,255,0.5)",
      pill: "rgba(0,0,0,0.3)",
      shadow: "rgba(20,80,180,0.55)",
    },
  },
  cloudy: {
    light: {
      bg: ["#D4D8E2", "#B8BFCC", "#E8ECF2"],
      text: "#2D3142",
      sub: "rgba(45,50,70,0.45)",
      pill: "rgba(255,255,255,0.42)",
      shadow: "rgba(100,110,140,0.3)",
    },
    dark: {
      bg: ["#1A1D2E", "#252A3D", "#2E3450"],
      text: "#C8CEDE",
      sub: "rgba(180,190,210,0.5)",
      pill: "rgba(0,0,0,0.3)",
      shadow: "rgba(40,50,80,0.55)",
    },
  },
  windy: {
    light: {
      bg: ["#C8E6FF", "#A0C4FF", "#D4F0FF"],
      text: "#1A3A6C",
      sub: "rgba(20,50,120,0.45)",
      pill: "rgba(255,255,255,0.38)",
      shadow: "rgba(80,150,220,0.35)",
    },
    dark: {
      bg: ["#0D1F3C", "#162D5A", "#1E3D7A"],
      text: "#B8D4FF",
      sub: "rgba(140,190,255,0.5)",
      pill: "rgba(0,0,0,0.3)",
      shadow: "rgba(20,60,160,0.5)",
    },
  },
  snowy: {
    light: {
      bg: ["#EEF2FF", "#DBEAFE", "#F0F9FF"],
      text: "#1E3A5F",
      sub: "rgba(20,50,100,0.4)",
      pill: "rgba(255,255,255,0.45)",
      shadow: "rgba(100,150,220,0.3)",
    },
    dark: {
      bg: ["#0F172A", "#1E2D4A", "#1A3060"],
      text: "#C0D8FF",
      sub: "rgba(160,200,255,0.5)",
      pill: "rgba(0,0,0,0.3)",
      shadow: "rgba(30,70,160,0.5)",
    },
  },
};

// ─────────────────────────────────────────────────────────────
//  WEATHER CANVAS ANIMATIONS
// ─────────────────────────────────────────────────────────────

/* ── Sunny: floating light rays + lens flare ── */
const SunnyCanvas = ({ isDark }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.offsetWidth;
    c.height = c.offsetHeight;
    let raf,
      t = 0;
    const rays = Array.from({ length: 8 }, (_, i) => ({
      angle: (i / 8) * Math.PI * 2,
      speed: 0.003 + i * 0.001,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      const cx = c.width * 0.78,
        cy = c.height * 0.22;
      // Sun glow
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 70);
      g.addColorStop(
        0,
        isDark ? "rgba(255,180,50,0.45)" : "rgba(255,220,80,0.6)",
      );
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, 70, 0, Math.PI * 2);
      ctx.fill();
      // Rays
      rays.forEach((r) => {
        const angle = r.angle + t * r.speed;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        const rg = ctx.createLinearGradient(0, 0, 100, 0);
        rg.addColorStop(
          0,
          isDark ? "rgba(255,200,60,0.25)" : "rgba(255,240,100,0.3)",
        );
        rg.addColorStop(1, "transparent");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.moveTo(10, -3);
        ctx.lineTo(100, -8);
        ctx.lineTo(100, 8);
        ctx.lineTo(10, 3);
        ctx.fill();
        ctx.restore();
      });
      // Lens flare dots
      [0.3, 0.5, 0.65].forEach((s, i) => {
        const fx = cx - (cx - c.width * 0.15) * s;
        const fy = cy + (c.height * 0.6 - cy) * s;
        const sz = [6, 10, 4][i];
        const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, sz);
        fg.addColorStop(
          0,
          isDark ? "rgba(255,230,100,0.22)" : "rgba(255,255,180,0.35)",
        );
        fg.addColorStop(1, "transparent");
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(fx, fy, sz, 0, Math.PI * 2);
        ctx.fill();
      });
      t++;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [isDark]);
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
};

/* ── Cloudy: realistic drifting clouds ── */
const CloudyCanvas = ({ isDark }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.offsetWidth;
    c.height = c.offsetHeight;
    let raf;
    const drawCloud = (x, y, scale, alpha) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      const circles = [
        { dx: 0, dy: 0, r: 28 * scale },
        { dx: 22, dy: -8, r: 22 * scale },
        { dx: -22, dy: -5, r: 20 * scale },
        { dx: 42, dy: 4, r: 16 * scale },
        { dx: -40, dy: 4, r: 14 * scale },
        { dx: 12, dy: -18, r: 16 * scale },
      ];
      const col = isDark ? "rgba(140,155,190,X)" : "rgba(255,255,255,X)";
      circles.forEach(({ dx, dy, r }) => {
        const g = ctx.createRadialGradient(
          x + dx,
          y + dy - r * 0.2,
          0,
          x + dx,
          y + dy,
          r,
        );
        g.addColorStop(0, col.replace("X", "0.9"));
        g.addColorStop(0.6, col.replace("X", "0.6"));
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    };
    const clouds = [
      { x: c.width * 0.6, y: 40, scale: 1.1, alpha: 0.85, speed: 0.18 },
      { x: c.width * 0.15, y: 65, scale: 0.75, alpha: 0.55, speed: 0.12 },
      { x: c.width * 0.88, y: 28, scale: 0.6, alpha: 0.45, speed: 0.22 },
      { x: -40, y: 80, scale: 0.5, alpha: 0.3, speed: 0.08 },
    ];
    const animate = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      clouds.forEach((cl) => {
        drawCloud(cl.x, cl.y, cl.scale, cl.alpha);
        cl.x += cl.speed;
        if (cl.x - 80 > c.width) cl.x = -80;
      });
      raf = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(raf);
  }, [isDark]);
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
};

/* ── Rainy: realistic rain streaks + puddle ripples ── */
const RainyCanvas = ({ isDark }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.offsetWidth;
    c.height = c.offsetHeight;
    let raf;
    // Rain drops
    const drops = Array.from({ length: 55 }, () => ({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      len: 8 + Math.random() * 14,
      speed: 7 + Math.random() * 8,
      alpha: 0.15 + Math.random() * 0.35,
      thick: 0.8 + Math.random() * 0.8,
    }));
    // Ripples
    const ripples = [];
    const spawnRipple = () => {
      ripples.push({
        x: Math.random() * c.width,
        y: c.height - 8 - Math.random() * 14,
        r: 0,
        maxR: 18 + Math.random() * 18,
        alpha: 0.5,
        speed: 0.6,
      });
    };
    let rippleTimer = 0;
    const animate = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      // Draw rain
      drops.forEach((d) => {
        ctx.save();
        ctx.globalAlpha = d.alpha;
        ctx.strokeStyle = isDark
          ? "rgba(180,210,255,1)"
          : "rgba(100,160,220,1)";
        ctx.lineWidth = d.thick;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.len * 0.15, d.y + d.len);
        ctx.stroke();
        ctx.restore();
        d.y += d.speed;
        d.x -= d.speed * 0.15;
        if (d.y > c.height) {
          d.y = -d.len;
          d.x = Math.random() * c.width;
        }
      });
      // Ripples
      rippleTimer++;
      if (rippleTimer % 14 === 0) spawnRipple();
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        ctx.save();
        ctx.globalAlpha = rp.alpha;
        ctx.strokeStyle = isDark ? "rgba(150,200,255,1)" : "rgba(80,140,200,1)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        rp.r += rp.speed;
        rp.alpha -= 0.018;
        if (rp.alpha <= 0) ripples.splice(i, 1);
      }
      raf = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(raf);
  }, [isDark]);
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
};

/* ── Snowy: falling snowflakes ── */
const SnowyCanvas = ({ isDark }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.offsetWidth;
    c.height = c.offsetHeight;
    let raf;
    const flakes = Array.from({ length: 45 }, () => ({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      r: 1.5 + Math.random() * 3.5,
      speed: 0.6 + Math.random() * 1.2,
      drift: (Math.random() - 0.5) * 0.4,
      alpha: 0.4 + Math.random() * 0.5,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.02,
    }));
    const animate = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      flakes.forEach((f) => {
        f.wobble += f.wobbleSpeed;
        ctx.save();
        ctx.globalAlpha = f.alpha;
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
        g.addColorStop(
          0,
          isDark ? "rgba(200,220,255,1)" : "rgba(255,255,255,1)",
        );
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        f.y += f.speed;
        f.x += f.drift + Math.sin(f.wobble) * 0.5;
        if (f.y > c.height + 5) {
          f.y = -5;
          f.x = Math.random() * c.width;
        }
        if (f.x < -5) f.x = c.width + 5;
        if (f.x > c.width + 5) f.x = -5;
      });
      raf = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(raf);
  }, [isDark]);
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
};

/* ── Windy: flowing wind lines ── */
const WindyCanvas = ({ isDark }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.offsetWidth;
    c.height = c.offsetHeight;
    let raf;
    const lines = Array.from({ length: 18 }, (_, i) => ({
      y: 10 + (i / 18) * c.height * 0.85,
      x: -Math.random() * c.width,
      len: 40 + Math.random() * 80,
      speed: 3 + Math.random() * 4,
      alpha: 0.08 + Math.random() * 0.22,
      thick: 0.6 + Math.random() * 1.2,
      curve: (Math.random() - 0.5) * 12,
    }));
    const animate = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      lines.forEach((l) => {
        ctx.save();
        ctx.globalAlpha = l.alpha;
        ctx.strokeStyle = isDark ? "rgba(180,210,255,1)" : "rgba(80,130,200,1)";
        ctx.lineWidth = l.thick;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(l.x, l.y);
        ctx.bezierCurveTo(
          l.x + l.len * 0.33,
          l.y + l.curve,
          l.x + l.len * 0.66,
          l.y - l.curve * 0.5,
          l.x + l.len,
          l.y,
        );
        ctx.stroke();
        ctx.restore();
        l.x += l.speed;
        if (l.x > c.width + 20) {
          l.x = -l.len - 20;
          l.y = 10 + Math.random() * c.height * 0.85;
        }
      });
      raf = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(raf);
  }, [isDark]);
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
};

/* ── Hot: heat shimmer + floating embers ── */
const HotCanvas = ({ isDark }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.offsetWidth;
    c.height = c.offsetHeight;
    let raf,
      t = 0;
    const embers = Array.from({ length: 20 }, () => ({
      x: Math.random() * c.width,
      y: c.height * 0.5 + Math.random() * c.height * 0.5,
      r: 1 + Math.random() * 2.5,
      speed: 0.5 + Math.random() * 1.2,
      drift: (Math.random() - 0.5) * 0.8,
      alpha: 0.4 + Math.random() * 0.5,
    }));
    const animate = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      // Heat shimmer wave
      for (let i = 0; i < 4; i++) {
        const wy = c.height * (0.3 + i * 0.18) + Math.sin(t * 0.025 + i) * 10;
        const wg = ctx.createLinearGradient(0, wy - 12, 0, wy + 12);
        wg.addColorStop(0, "transparent");
        wg.addColorStop(
          0.5,
          isDark ? "rgba(255,120,30,0.06)" : "rgba(255,140,30,0.08)",
        );
        wg.addColorStop(1, "transparent");
        ctx.fillStyle = wg;
        ctx.fillRect(0, wy - 12, c.width, 24);
      }
      // Embers
      embers.forEach((e) => {
        ctx.save();
        ctx.globalAlpha = e.alpha;
        const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 2);
        g.addColorStop(0, isDark ? "rgba(255,200,50,1)" : "rgba(255,160,30,1)");
        g.addColorStop(
          0.5,
          isDark ? "rgba(255,100,20,0.6)" : "rgba(255,80,0,0.5)",
        );
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        e.y -= e.speed;
        e.x += e.drift;
        e.alpha -= 0.003;
        if (e.y < 0 || e.alpha <= 0) {
          e.x = Math.random() * c.width;
          e.y = c.height * 0.7 + Math.random() * c.height * 0.3;
          e.alpha = 0.4 + Math.random() * 0.5;
        }
      });
      t++;
      raf = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(raf);
  }, [isDark]);
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
};

/* ── Cold: frost crystals ── */
const ColdCanvas = ({ isDark }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.offsetWidth;
    c.height = c.offsetHeight;
    let raf,
      t = 0;
    // Frost corner crystals
    const drawFrostBranch = (x, y, angle, len, depth) => {
      if (depth === 0 || len < 3) return;
      const ex = x + Math.cos(angle) * len;
      const ey = y + Math.sin(angle) * len;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      if (depth > 1) {
        [-Math.PI / 4, Math.PI / 4, -Math.PI / 3, Math.PI / 3].forEach((a) => {
          drawFrostBranch(ex, ey, angle + a, len * 0.55, depth - 1);
        });
      }
    };
    // Floating ice particles
    const particles = Array.from({ length: 25 }, () => ({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      r: 1 + Math.random() * 2,
      alpha: 0.2 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
    }));
    const animate = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      // Frost corners
      [
        [0, 0],
        [c.width, 0],
      ].forEach(([fx, fy], qi) => {
        ctx.save();
        ctx.strokeStyle = isDark
          ? "rgba(160,200,255,0.18)"
          : "rgba(180,220,255,0.45)";
        ctx.lineWidth = 0.7;
        const baseAngles =
          qi === 0
            ? [0.2, 0.6, 1.0]
            : [Math.PI - 0.2, Math.PI - 0.6, Math.PI - 1.0];
        baseAngles.forEach((a) => drawFrostBranch(fx, fy, a, 35, 3));
        ctx.restore();
      });
      // Floating ice particles
      particles.forEach((p) => {
        p.phase += 0.012;
        const py = p.y + Math.sin(p.phase) * 4;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = isDark ? "rgba(180,220,255,1)" : "rgba(100,170,230,1)";
        ctx.beginPath();
        ctx.arc(p.x, py, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      t++;
      raf = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(raf);
  }, [isDark]);
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
};

// ─── Weather canvas selector ───────────────────────────────────
const WeatherCanvas = ({ condition, isDark }) => {
  switch (condition) {
    case "sunny":
      return <SunnyCanvas isDark={isDark} />;
    case "hot":
      return <HotCanvas isDark={isDark} />;
    case "rainy":
      return <RainyCanvas isDark={isDark} />;
    case "cloudy":
      return <CloudyCanvas isDark={isDark} />;
    case "cold":
      return <ColdCanvas isDark={isDark} />;
    case "windy":
      return <WindyCanvas isDark={isDark} />;
    case "snowy":
      return <SnowyCanvas isDark={isDark} />;
    default:
      return <CloudyCanvas isDark={isDark} />;
  }
};

// ─── Weather label / icon map ──────────────────────────────────
const W_META = {
  sunny: { icon: "☀️", label: "Sunny" },
  hot: { icon: "🌡️", label: "Hot" },
  rainy: { icon: "🌧️", label: "Rainy" },
  cold: { icon: "🌨️", label: "Cold" },
  cloudy: { icon: "☁️", label: "Cloudy" },
  windy: { icon: "💨", label: "Windy" },
  snowy: { icon: "❄️", label: "Snowy" },
};

// ─────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
const WelcomeCard = ({ weather }) => {
  useEffect(() => {
    injectFonts();
  }, []);

  const { isDark } = useContext(ThemeContext);
  const user = useSelector(selectUser);
  const isGuest = useSelector(selectIsGuest);
  const tableNumber = useSelector(selectTableNumber);
  const session = useSelector(selectSession);
  const cartItems = useSelector(selectCartItems);

  const cardRef = useRef(null);
  const greetRef = useRef(null);
  const prefixRef = useRef(null);
  const nameRowRef = useRef(null);
  const subRef = useRef(null);
  const pillsRef = useRef(null);
  const stripRef = useRef(null);
  const badgeRef = useRef(null);
  const shimmerRef = useRef(null);

  const condition = weather?.condition || "cloudy";
  const theme = (WEATHER_THEME[condition] || WEATHER_THEME.cloudy)[
    isDark ? "dark" : "light"
  ];
  const wMeta = W_META[condition] || W_META.cloudy;
  const tc = TIER[user?.loyaltyTier || "none"];
  const firstName = user?.name?.split(" ")[0] || "Friend";
  const displayName = isGuest ? "Guest" : firstName;
  const cartCount = cartItems?.reduce((a, i) => a + i.quantity, 0) ?? 0;
  const { label: greetLabel, sub: greetSub } = getGreeting();

  const sessionStart = session?.createdAt
    ? new Date(session.createdAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const bgGradient = useMemo(
    () =>
      `linear-gradient(148deg, ${theme.bg[0]} 0%, ${theme.bg[1]} 55%, ${theme.bg[2]} 100%)`,
    [theme],
  );

  // ── GSAP entrance ────────────────────────────────────────────
  useEffect(() => {
    if (
      !cardRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const tl = gsap.timeline({ delay: 0.1, defaults: { ease: "power3.out" } });
    tl.fromTo(
      cardRef.current,
      { y: 30, opacity: 0, scale: 0.97 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.65,
        force3D: true,
        clearProps: "transform",
      },
    );
    const staggerEls = [
      greetRef,
      prefixRef,
      nameRowRef,
      subRef,
      pillsRef,
      stripRef,
    ]
      .map((r) => r.current)
      .filter(Boolean);
    tl.fromTo(
      staggerEls,
      { y: 12, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.32, stagger: 0.07 },
      "-=0.45",
    );
    if (badgeRef.current) {
      tl.fromTo(
        badgeRef.current,
        { scale: 0.4, opacity: 0, rotation: -15 },
        {
          scale: 1,
          opacity: 1,
          rotation: 0,
          duration: 0.55,
          ease: "back.out(2.8)",
          force3D: true,
          clearProps: "transform",
        },
        0.25,
      );
    }
    if (shimmerRef.current) {
      tl.fromTo(
        shimmerRef.current,
        { x: "-115%" },
        { x: "215%", duration: 1.6, ease: "power1.inOut" },
        0.28,
      );
    }
    return () => tl.kill();
  }, []);

  return (
    <>
      <style>{`
        .wc-root {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          -webkit-tap-highlight-color: transparent;
        }
        /* Pill: frosted glass */
        .wc-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 99px;
          font-size: 11px;
          font-weight: 600;
          font-family: 'Plus Jakarta Sans', sans-serif;
          letter-spacing: 0.01em;
          white-space: nowrap;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transition: background 0.3s, border-color 0.3s;
        }
        .wc-strip-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 9.5px;
          font-weight: 500;
          font-family: 'Plus Jakarta Sans', sans-serif;
          letter-spacing: 0.02em;
          opacity: 0.5;
        }
        /* Table badge pulse ring */
        @keyframes wc-ring-pulse {
          0%   { transform: scale(1);   opacity: 0.5; }
          70%  { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .wc-badge-ring {
          animation: wc-ring-pulse 2.2s ease-out infinite;
        }
        /* Greeting label glow */
        @keyframes wc-label-glow {
          0%, 100% { opacity: 0.45; }
          50%       { opacity: 0.75; }
        }
        .wc-greet-label { animation: wc-label-glow 3s ease-in-out infinite; }
      `}</style>

      <div
        ref={cardRef}
        className="wc-root"
        style={{
          position: "relative",
          overflow: "hidden",
          margin: "16px",
          borderRadius: 24,
          background: bgGradient,
          boxShadow: [
            `0 16px 48px ${theme.shadow}`,
            `0 1px 0 rgba(255,255,255,${isDark ? "0.08" : "0.55"}) inset`,
            `0 0 0 1px rgba(${isDark ? "255,255,255,0.06" : "0,0,0,0.04"})`,
          ].join(", "),
          minHeight: 190,
          transition: "background 0.5s ease, box-shadow 0.5s ease",
        }}
      >
        {/* ── Realistic weather canvas ── */}
        <WeatherCanvas condition={condition} isDark={isDark} />

        {/* ── Top edge highlight ── */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: `linear-gradient(90deg, transparent 5%, rgba(255,255,255,${isDark ? "0.14" : "0.7"}) 50%, transparent 95%)`,
            pointerEvents: "none",
            zIndex: 2,
          }}
        />

        {/* ── Bottom depth vignette ── */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "45%",
            background: `linear-gradient(to top, rgba(${isDark ? "0,0,0,0.3" : "0,0,0,0.06"}) 0%, transparent 100%)`,
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        {/* ── Shimmer sweep ── */}
        <div
          ref={shimmerRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "40%",
            background: `linear-gradient(108deg, transparent 20%, rgba(255,255,255,${isDark ? "0.06" : "0.14"}) 50%, transparent 80%)`,
            pointerEvents: "none",
            zIndex: 2,
            transform: "translateX(-115%)",
          }}
        />

        {/* ── TABLE BADGE — top right ── */}
        {tableNumber && (
          <div
            ref={badgeRef}
            style={{ position: "absolute", top: 14, right: 14, zIndex: 10 }}
          >
            {/* Pulse ring */}
            <div
              className="wc-badge-ring"
              style={{
                position: "absolute",
                inset: -6,
                borderRadius: 18,
                border: `2px solid rgba(255,255,255,${isDark ? "0.2" : "0.5"})`,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "10px 14px",
                borderRadius: 18,
                background: isDark
                  ? "rgba(0,0,0,0.35)"
                  : "rgba(255,255,255,0.3)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: `1px solid rgba(255,255,255,${isDark ? "0.12" : "0.5"})`,
                boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                minWidth: 52,
              }}
            >
              <Armchair
                size={11}
                color={isDark ? "rgba(255,255,255,0.55)" : theme.text}
                strokeWidth={2.2}
              />
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 7.5,
                  fontWeight: 700,
                  color: isDark ? "rgba(255,255,255,0.45)" : theme.text,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  marginTop: 4,
                  lineHeight: 1,
                  opacity: 0.7,
                }}
              >
                Table
              </span>
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 26,
                  fontWeight: 900,
                  color: isDark ? "#fff" : theme.text,
                  lineHeight: 1.05,
                  letterSpacing: "-0.04em",
                  marginTop: 1,
                }}
              >
                {tableNumber}
              </span>
            </div>
          </div>
        )}

        {/* ── MAIN CONTENT ── */}
        <div
          style={{
            position: "relative",
            zIndex: 5,
            padding: "22px 20px 20px",
            paddingRight: tableNumber ? 90 : 20,
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          {/* Greeting label */}
          <p
            ref={greetRef}
            className="wc-greet-label"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              color: theme.sub,
              lineHeight: 1,
              marginBottom: 4,
            }}
          >
            {greetLabel}
          </p>

          {/* "Hey," prefix */}
          <p
            ref={prefixRef}
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 12,
              fontWeight: 300,
              color: theme.sub,
              letterSpacing: "0.04em",
              lineHeight: 1,
            }}
          >
            {isGuest ? "Welcome," : "Hey,"}
          </p>

          {/* ── BIG NAME ── */}
          <div
            ref={nameRowRef}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 2,
            }}
          >
            <span
              style={{
                fontFamily:
                  "'Bricolage Grotesque', 'Plus Jakarta Sans', system-ui, sans-serif",
                fontSize: "clamp(34px, 9.5vw, 46px)",
                fontWeight: 900,
                color: theme.text,
                letterSpacing: "-0.02em", // tighter than before
                lineHeight: 1.0,
                textShadow: isDark
                  ? "0 2px 16px rgba(0,0,0,0.4)"
                  : "0 2px 12px rgba(255,255,255,0.4)",
              }}
            >
              {displayName}
            </span>
            <span
              style={{
                fontSize: "clamp(22px, 6vw, 28px)",
                lineHeight: 1,
                filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.18))",
              }}
            >
              👋
            </span>
          </div>

          {/* Sub line */}
          <p
            ref={subRef}
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 12,
              fontWeight: 400,
              color: theme.sub,
              letterSpacing: "0.01em",
              marginTop: 4,
              lineHeight: 1.4,
            }}
          >
            {greetSub}
          </p>

          {/* ── PILLS ── */}
          <div
            ref={pillsRef}
            style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}
          >
            {/* Weather pill */}
            <span
              className="wc-pill"
              style={{
                background: isDark
                  ? "rgba(0,0,0,0.28)"
                  : "rgba(255,255,255,0.38)",
                color: theme.text,
                border: `1px solid rgba(255,255,255,${isDark ? "0.12" : "0.55"})`,
                boxShadow: `0 1px 0 rgba(255,255,255,${isDark ? "0.06" : "0.6"}) inset`,
              }}
            >
              <span style={{ fontSize: 13, lineHeight: 1 }}>{wMeta.icon}</span>
              {wMeta.label}
              {weather?.temp != null && (
                <span style={{ opacity: 0.6, fontWeight: 500 }}>
                  · {Math.round(weather.temp)}°C
                </span>
              )}
            </span>

            {/* Tier pill */}
            {!isGuest && (
              <span
                className="wc-pill"
                style={{
                  background: isDark
                    ? "rgba(0,0,0,0.28)"
                    : "rgba(255,255,255,0.38)",
                  color: theme.text,
                  border: `1px solid rgba(255,255,255,${isDark ? "0.12" : "0.55"})`,
                  boxShadow: `0 1px 0 rgba(255,255,255,${isDark ? "0.06" : "0.6"}) inset`,
                }}
              >
                <span style={{ fontSize: 12 }}>{tc.emoji}</span>
                {tc.label}
              </span>
            )}
          </div>

          {/* ── STATUS STRIP ── */}
          <div
            ref={stripRef}
            style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 6 }}
          >
            {sessionStart && (
              <span className="wc-strip-item" style={{ color: theme.text }}>
                <Clock size={9} strokeWidth={2.5} /> Since {sessionStart}
              </span>
            )}
            {cartCount > 0 && (
              <span className="wc-strip-item" style={{ color: theme.text }}>
                <ShoppingBag size={9} strokeWidth={2.5} />
                {cartCount} item{cartCount !== 1 ? "s" : ""} in cart
              </span>
            )}
            {session?.status === "active" && (
              <span className="wc-strip-item" style={{ color: theme.text }}>
                <Wifi size={9} strokeWidth={2.5} /> Active session
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default WelcomeCard;
