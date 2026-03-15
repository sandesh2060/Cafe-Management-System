// src/modules/customer/components/menu/QuoteOrderCard.jsx
//
// Active Order: unified card for all items in one order, with realistic
// blue water SVG wave fill animation keyed to order status.
// Quote section: unchanged — shows when no active order.
// Full light / dark mode support via ThemeContext.

import {
  useState, useEffect, useContext, useRef, useCallback, useMemo,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSelector }  from "react-redux";
import { useNavigate }  from "react-router-dom";
import { ThemeContext } from "@shared/context/ThemeContext";
import {
  selectActiveOrder,
  selectOrderLoading,
  selectOrderHistory,
} from "@store/slices/orderSlice";
import { selectUser, selectIsGuest } from "@store/slices/authSlice";
import {
  ShoppingBag, CreditCard, ChevronRight, Loader2,
} from "lucide-react";

// ── Font injection ─────────────────────────────────────────────────────────────
const injectFonts = () => {
  if (document.getElementById("qoc-fonts")) return;
  const l = document.createElement("link");
  l.id = "qoc-fonts"; l.rel = "stylesheet";
  l.href =
    "https://fonts.googleapis.com/css2?family=Lora:ital,wght@1,400;1,500&family=DM+Sans:wght@400;500;600;700&display=swap";
  document.head.appendChild(l);
};

// ── Status config ──────────────────────────────────────────────────────────────
const ACTIVE_STATUSES  = new Set(["pending","confirmed","preparing","ready","on_the_way","served","delivered"]);
// Pay Now ONLY when all items are served/delivered
const PAYABLE_STATUSES = new Set(["served","delivered"]);
// Gallery shown while order is in-progress (not yet served)
const GALLERY_STATUSES = new Set(["pending","confirmed","preparing","ready","on_the_way"]);

const STATUS_CFG = {
  pending:    { label: "Order Placed",    emoji: "📋", fill: 0.15, speed: 0.6,  color: "#F59E0B" },
  confirmed:  { label: "Confirmed",       emoji: "✅", fill: 0.32, speed: 0.9,  color: "#10B981" },
  preparing:  { label: "Being Prepared",  emoji: "👨‍🍳", fill: 0.58, speed: 1.6,  color: "#3B82F6" },
  ready:      { label: "Ready!",          emoji: "🔔", fill: 0.85, speed: 2.4,  color: "#8B5CF6" },
  on_the_way: { label: "On the Way",      emoji: "🛵", fill: 0.78, speed: 2.0,  color: "#F97316" },
  served:     { label: "Served!",         emoji: "🍽️", fill: 1.00, speed: 0.4,  color: "#06B6D4" },
  delivered:  { label: "Delivered!",      emoji: "🎉", fill: 1.00, speed: 0.4,  color: "#06B6D4" },
  cancelled:  { label: "Cancelled",       emoji: "❌", fill: 0.0,  speed: 0.3,  color: "#6B7280" },
};
const DEFAULT_CFG = STATUS_CFG.pending;

// ── Wave fill SVG canvas ───────────────────────────────────────────────────────
// Uses two offset sinusoidal waves rendered via requestAnimationFrame.
// fillLevel: 0–1.  speed: wave oscillation speed multiplier.
// isDark changes the colour palette.

const W = 300;  // viewBox width
const H = 120;  // viewBox height

function WaveFill({ fillLevel, speed, isDark }) {
  const canvasRef  = useRef(null);
  const rafRef     = useRef(null);
  const tRef       = useRef(0);
  const curFillRef = useRef(fillLevel);

  useEffect(() => {
    // Smoothly animate fill level
    const target = fillLevel;
    const step = () => {
      const diff = target - curFillRef.current;
      if (Math.abs(diff) > 0.001) {
        curFillRef.current += diff * 0.04;
      } else {
        curFillRef.current = target;
      }
    };

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const draw = (ts) => {
      tRef.current = ts * 0.001 * speed;
      step();

      const t    = tRef.current;
      const fill = curFillRef.current;
      const yBase = H * (1 - fill);

      ctx.clearRect(0, 0, W, H);

      // ── Wave 1 (front, more opaque) ──────────────────────────────────
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 2) {
        const y = yBase
          + Math.sin((x / W) * 2.8 * Math.PI + t * 1.8) * 5
          + Math.sin((x / W) * 1.2 * Math.PI - t * 1.1) * 3;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();

      const grad1 = ctx.createLinearGradient(0, yBase - 10, 0, H);
      if (isDark) {
        grad1.addColorStop(0,   "rgba(56, 189, 248, 0.28)");
        grad1.addColorStop(0.4, "rgba(14, 165, 233, 0.22)");
        grad1.addColorStop(1,   "rgba(2,  132, 199, 0.18)");
      } else {
        grad1.addColorStop(0,   "rgba(56, 189, 248, 0.18)");
        grad1.addColorStop(0.4, "rgba(14, 165, 233, 0.14)");
        grad1.addColorStop(1,   "rgba(2,  132, 199, 0.10)");
      }
      ctx.fillStyle = grad1;
      ctx.fill();

      // ── Wave 2 (back, lighter, offset) ───────────────────────────────
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 2) {
        const y = yBase
          + Math.sin((x / W) * 2.2 * Math.PI - t * 1.3 + 1.2) * 6
          + Math.sin((x / W) * 0.9 * Math.PI + t * 0.7 + 2.1) * 4;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();

      const grad2 = ctx.createLinearGradient(0, yBase - 8, 0, H);
      if (isDark) {
        grad2.addColorStop(0,   "rgba(186, 230, 253, 0.08)");
        grad2.addColorStop(1,   "rgba(56,  189, 248, 0.05)");
      } else {
        grad2.addColorStop(0,   "rgba(186, 230, 253, 0.12)");
        grad2.addColorStop(1,   "rgba(56,  189, 248, 0.07)");
      }
      ctx.fillStyle = grad2;
      ctx.fill();

      // ── Bubble layer ──────────────────────────────────────────────────
      if (fill > 0.08 && speed > 0.5) {
        const bubbleSeeds = [
          { x: 0.18, freq: 1.4, r: 2.2 },
          { x: 0.42, freq: 1.9, r: 1.6 },
          { x: 0.67, freq: 1.1, r: 2.5 },
          { x: 0.82, freq: 2.1, r: 1.4 },
        ];
        bubbleSeeds.forEach(({ x: xf, freq, r }) => {
          const bx = xf * W;
          const by = yBase + 8 + Math.sin(t * freq + xf * 10) * (H - yBase - 16) * 0.7;
          if (by > yBase + 4 && by < H - 4) {
            ctx.beginPath();
            ctx.arc(bx, by, r, 0, Math.PI * 2);
            ctx.fillStyle = isDark
              ? "rgba(186, 230, 253, 0.12)"
              : "rgba(255, 255, 255, 0.22)";
            ctx.fill();
          }
        });
      }

      // ── Surface shimmer line ──────────────────────────────────────────
      if (fill > 0.02) {
        const shimX1 = W * 0.15 + Math.sin(t * 1.3) * W * 0.1;
        const shimX2 = shimX1 + W * 0.28;
        const shimY  = yBase + Math.sin((shimX1 / W) * 2.8 * Math.PI + t * 1.8) * 5;
        const shimGrad = ctx.createLinearGradient(shimX1, shimY, shimX2, shimY);
        shimGrad.addColorStop(0,   "rgba(255,255,255,0)");
        shimGrad.addColorStop(0.4, isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.22)");
        shimGrad.addColorStop(1,   "rgba(255,255,255,0)");
        ctx.beginPath();
        ctx.moveTo(shimX1, shimY);
        ctx.lineTo(shimX2, shimY);
        ctx.strokeStyle = shimGrad;
        ctx.lineWidth   = 1.5;
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [fillLevel, speed, isDark]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{
        position:  "absolute",
        inset:     0,
        width:     "100%",
        height:    "100%",
        borderRadius: 18,
        pointerEvents: "none",
      }}
    />
  );
}

// ── Quote bank (unchanged) ─────────────────────────────────────────────────────
const QUOTES = {
  life: [
    { text: "Life is short. Eat the good stuff first.", emoji: "✨" },
    { text: "Every day is a fresh start. Make it delicious.", emoji: "🌅" },
    { text: "The best things in life aren't things.", emoji: "🌿" },
    { text: "Slow down. The best moments can't be rushed.", emoji: "🍃" },
    { text: "You don't need a reason to treat yourself.", emoji: "🎁" },
    { text: "जिन्दगी छोटो छ, मज्जाले बाँच।", emoji: "🌸" },
    { text: "A good day starts with a good decision.", emoji: "💛" },
    { text: "Peace is not a place. It's a choice.", emoji: "🕊️" },
  ],
  relationship: [
    { text: "The best conversations happen over food.", emoji: "🤝" },
    { text: "Good company makes even simple food taste better.", emoji: "❤️" },
    { text: "साथी नै सम्पत्ति — त्यसैले राम्रो साथी कहिल्यै नछोड्नू।", emoji: "🫂" },
    { text: "Share your table. Share your heart.", emoji: "💞" },
    { text: "The people you eat with shape who you become.", emoji: "🌻" },
    { text: "Some friendships are best measured in shared meals.", emoji: "🍽️" },
    { text: "Love is just breakfast for the soul.", emoji: "🥐" },
  ],
  food: [
    { text: "Hunger is the best seasoning.", emoji: "🍜" },
    { text: "You can't buy happiness — but you can order it.", emoji: "😋" },
    { text: "Good food, good mood. It's that simple.", emoji: "🌶️" },
    { text: "First, we eat. Then, we do everything else.", emoji: "🍛" },
    { text: "Food is not just fuel. It's memory.", emoji: "🥘" },
    { text: "One bite at a time — that's how you savour life.", emoji: "🫕" },
    { text: "खाना भनेको माया हो — पकाइएको।", emoji: "🍲" },
    { text: "Diet starts tomorrow. Today, we feast.", emoji: "😅" },
  ],
  coffee: [
    { text: "First coffee. Then adulting.", emoji: "☕" },
    { text: "Behind every great day is a great cup of tea.", emoji: "🍵" },
    { text: "Sip slowly. Life moves fast enough.", emoji: "☕" },
    { text: "चिया एक कप मात्र — तर असर सारा दिन।", emoji: "🍵" },
    { text: "Coffee: because adulting is hard.", emoji: "☕" },
    { text: "A warm cup is a small hug from the universe.", emoji: "🤗" },
    { text: "Good conversations start with good chai.", emoji: "🫖" },
  ],
  flirty: [
    { text: "You look like you have great taste.", emoji: "😏" },
    { text: "Is it warm in here, or is it just your order?", emoji: "🔥" },
    { text: "Someone as good-looking shouldn't have to wait long.", emoji: "😉" },
    { text: "Your vibe is as warm as this café.", emoji: "✨" },
    { text: "You clearly know how to pick the good stuff.", emoji: "💫" },
    { text: "Confidence looks good on you. So does that choice.", emoji: "😎" },
  ],
  weather: {
    sunny:  [
      { text: "Sunny day energy — radiate it.", emoji: "☀️" },
      { text: "The sun came out just for this meal.", emoji: "🌞" },
    ],
    rainy:  [
      { text: "Rain outside, warmth inside. Perfect.", emoji: "🌧️" },
      { text: "पानी परेको दिन गरमागरम खाना — स्वर्ग।", emoji: "🫖" },
    ],
    cold:   [
      { text: "Cold weather was invented to justify warm food.", emoji: "❄️" },
      { text: "Let the cold stay outside. You're cozy now.", emoji: "🧣" },
    ],
    cloudy: [
      { text: "Cloudy days call for comfort food.", emoji: "☁️" },
      { text: "Even grey skies have silver linings — and good meals.", emoji: "🌥️" },
    ],
    hot:    [
      { text: "Cool down. You've earned this break.", emoji: "🌡️" },
      { text: "गर्मीमा केही चिसो, केही मीठो — यही जिन्दगी।", emoji: "🧊" },
    ],
    windy:  [
      { text: "The wind brought you here. Good call.", emoji: "💨" },
    ],
    snowy:  [
      { text: "Let it snow — as long as the food is hot.", emoji: "⛄" },
    ],
  },
  hustle: [
    { text: "Recharge. Even the best engines need fuel.", emoji: "⚡" },
    { text: "You're doing great. Sit down and breathe.", emoji: "🧘" },
    { text: "मेहनत र खानाले नै संसार चल्छ।", emoji: "💪" },
    { text: "Success tastes better when you've paused to enjoy it.", emoji: "🏆" },
  ],
  guest: [
    { text: "New here? You picked the right place.", emoji: "👋" },
    { text: "Every regular was once a first-timer. Welcome.", emoji: "🌟" },
    { text: "नया अनुहार, नया कथा — स्वागत छ।", emoji: "🙏" },
  ],
  order: [
    { text: "Good things are on their way to you.", emoji: "🛵" },
    { text: "Patience is the secret ingredient.", emoji: "⏱️" },
    { text: "Worth the wait. We promise.", emoji: "🍽️" },
    { text: "Your order is being made with care. Hang tight.", emoji: "👨‍🍳" },
  ],
};

const pickPool = ({ weather, hour, isGuest, orderCount, hasActiveOrder, loyaltyTier }) => {
  if (hasActiveOrder) return QUOTES.order;
  const cond = weather?.condition;
  if (cond && QUOTES.weather[cond])
    return [...QUOTES.weather[cond], ...(hour < 12 ? QUOTES.coffee : QUOTES.food)];
  if (isGuest || orderCount === 0) return [...QUOTES.guest, ...QUOTES.food];
  if (loyaltyTier === "gold" || loyaltyTier === "silver")
    return [...QUOTES.hustle, ...QUOTES.life];
  if (hour < 6)  return QUOTES.life;
  if (hour < 11) return [...QUOTES.coffee, ...QUOTES.life];
  if (hour < 14) return [...QUOTES.food, ...QUOTES.relationship];
  if (hour < 17) return [...QUOTES.life, ...QUOTES.flirty];
  if (hour < 20) return [...QUOTES.food, ...QUOTES.relationship];
  return [...QUOTES.life, ...QUOTES.coffee];
};

const pickQuote = (pool, lastIdx) => {
  if (!pool.length) return { text: "Good food. Good vibes.", emoji: "✨" };
  let idx = Math.floor(Math.random() * pool.length);
  if (pool.length > 1 && idx === lastIdx) idx = (idx + 1) % pool.length;
  return pool[idx];
};

// ── TimerRing (quote countdown) ────────────────────────────────────────────────
const TimerRing = ({ progress, color }) => {
  const r = 9, circ = 2 * Math.PI * r;
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r={r} fill="none" stroke={color}
        strokeOpacity="0.15" strokeWidth="2" />
      <circle cx="11" cy="11" r={r} fill="none" stroke={color}
        strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - progress)}
        transform="rotate(-90 11 11)"
        style={{ transition: "stroke-dashoffset 1.1s linear" }}
      />
    </svg>
  );
};

const QuoteIcon = ({ color }) => (
  <svg width="22" height="16" viewBox="0 0 44 30" fill="none" aria-hidden="true"
    style={{ flexShrink: 0 }}>
    <path d="M0 30V18C0 12.4 1.6 8 4.8 4.8C8 1.6 12.4 0 18 0L19.2 2.8C16.4 3.4 14.2 4.7 12.6 6.7C11.1 8.6 10.2 10.8 10.1 13.3H18V30H0Z"
      fill={color} fillOpacity="0.22" />
    <path d="M25 30V18C25 12.4 26.6 8 29.8 4.8C33 1.6 37.4 0 43 0L44.2 2.8C41.4 3.4 39.2 4.7 37.6 6.7C36.1 8.6 35.2 10.8 35.1 13.3H43V30H25Z"
      fill={color} fillOpacity="0.22" />
  </svg>
);

const normItem = (item) => ({
  name: item?.menuItem?.name ?? item?.name ?? "Item",
  qty:  item?.quantity ?? item?.qty ?? 1,
  price: item?.price ?? item?.menuItem?.price ?? null,
});

const RevealWords = ({ text, id }) => (
  <>
    {text.split(" ").map((word, i) => (
      <motion.span key={`${id}-${i}`}
        initial={{ opacity: 0, y: 10, filter: "blur(5px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.42, delay: 0.12 + i * 0.032, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: "inline-block", marginRight: "0.25em" }}
      >
        {word}
      </motion.span>
    ))}
  </>
);

const INTERVAL = 60_000;
const EXIT_MS  = 400;
const selectOrderHistoryLength = (s) => s.order.orderHistory?.length ?? 0;

// ── Main component ─────────────────────────────────────────────────────────────
export default function QuoteOrderCard({ onViewOrder, onPay }) {
  useEffect(() => { injectFonts(); }, []);

  const { isDark }      = useContext(ThemeContext);
  const D               = isDark;
  const navigate        = useNavigate();
  const activeOrder     = useSelector(selectActiveOrder);
  const orderLoading    = useSelector(selectOrderLoading);
  const orderHistoryLen = useSelector(selectOrderHistoryLength);
  const user            = useSelector(selectUser);
  const isGuest         = useSelector(selectIsGuest);

  const [weather,  setWeather]  = useState(null);
  const [quote,    setQuote]    = useState(null);
  const [animKey,  setAnimKey]  = useState(0);
  const [progress, setProgress] = useState(1);
  const [phase,    setPhase]    = useState("in");

  const poolRef    = useRef([]);
  const lastIdxRef = useRef(-1);
  const startRef   = useRef(Date.now());
  const timerRef   = useRef(null);
  const tickRef    = useRef(null);

  const isActive  = !!activeOrder && ACTIVE_STATUSES.has(activeOrder?.status);
  const isPayable = isActive && PAYABLE_STATUSES.has(activeOrder?.status);
  const isGallery = isActive && GALLERY_STATUSES.has(activeOrder?.status);

  const cfg = useMemo(() =>
    STATUS_CFG[activeOrder?.status] ?? DEFAULT_CFG,
  [activeOrder?.status]);

  const normItems = useMemo(() =>
    (activeOrder?.items ?? []).map(normItem),
  [activeOrder?.items]);

  const displayItems = normItems.slice(0, 2);
  const extraCount   = Math.max(0, normItems.length - 2);
  const total        = activeOrder?.totalAmount ?? activeOrder?.total ?? null;
  const tableLabel   = activeOrder?.tableNumber ?? activeOrder?.table?.number ?? null;
  const orderNum     = activeOrder?.orderNumber ?? activeOrder?.displayId ?? null;

  // ── Weather bridge ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => setWeather(e.detail);
    window.addEventListener("qoc:weather", handler);
    if (window.__qocWeather) setWeather(window.__qocWeather);
    return () => window.removeEventListener("qoc:weather", handler);
  }, []);

  // ── Quote engine ───────────────────────────────────────────────────────────
  const nextQuote = useCallback(() => {
    const pool = poolRef.current;
    if (!pool.length) return;
    const q = pickQuote(pool, lastIdxRef.current);
    lastIdxRef.current = pool.indexOf(q);
    setQuote(q); setAnimKey(k => k + 1);
    setProgress(1); startRef.current = Date.now();
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    const pool = pickPool({
      weather, hour, isGuest,
      orderCount:     orderHistoryLen,
      hasActiveOrder: isActive,
      loyaltyTier:    user?.loyaltyTier,
    });
    poolRef.current    = pool;
    lastIdxRef.current = -1;
    const q = pickQuote(pool, -1);
    lastIdxRef.current = pool.indexOf(q);
    setQuote(q); setAnimKey(k => k + 1);
    setProgress(1); startRef.current = Date.now();
  }, [weather, isGuest, orderHistoryLen, isActive, user?.loyaltyTier]);

  const advance = useCallback(() => {
    setPhase("out");
    setTimeout(() => { nextQuote(); setPhase("in"); }, EXIT_MS);
  }, [nextQuote]);

  useEffect(() => {
    if (isActive || !quote) {
      clearInterval(timerRef.current); clearInterval(tickRef.current); return;
    }
    startRef.current = Date.now(); setProgress(1); setPhase("in");
    timerRef.current = setInterval(advance, INTERVAL);
    tickRef.current  = setInterval(() => {
      setProgress(Math.max(0, 1 - (Date.now() - startRef.current) / INTERVAL));
    }, 1000);
    return () => { clearInterval(timerRef.current); clearInterval(tickRef.current); };
  }, [isActive, quote, advance]);

  const handleViewOrder = useCallback(() =>
    onViewOrder ? onViewOrder() : navigate("/order/status"), [onViewOrder, navigate]);
  const handlePay = useCallback(() =>
    onPay ? onPay() : navigate("/payment"), [onPay, navigate]);
  const handleGallery = useCallback(() =>
    navigate("/gallery"), [navigate]);
  const handleReviews = useCallback(() =>
    navigate("/reviews"), [navigate]);

  // ── Theme tokens ───────────────────────────────────────────────────────────
  const cardBg     = D ? "rgba(10, 18, 30, 0.97)"  : "rgba(240, 249, 255, 0.98)";
  const cardBorder = D ? "rgba(56, 189, 248, 0.14)" : "rgba(14, 165, 233, 0.20)";
  const cardShadow = D
    ? "0 4px 32px rgba(0,0,0,0.60), 0 1px 0 rgba(56,189,248,0.08) inset"
    : "0 4px 24px rgba(14,165,233,0.12), 0 1px 0 rgba(255,255,255,1) inset";

  const textPri    = D ? "#E0F2FE" : "#0C2340";
  const textSec    = D ? "#BAE6FD" : "#075985";
  const textMut    = D ? "rgba(186,230,253,0.45)" : "rgba(7,89,133,0.45)";
  const divider    = D ? "rgba(56,189,248,0.10)"  : "rgba(14,165,233,0.12)";
  const accentC    = D ? "#38BDF8" : "#0369A1";
  const btnBg      = D ? "rgba(56,189,248,0.10)"  : "rgba(14,165,233,0.08)";
  const btnBorder  = D ? "rgba(56,189,248,0.20)"  : "rgba(14,165,233,0.20)";

  const isNepali = /[\u0900-\u097F]/.test(quote?.text ?? "");

  return (
    <>
      <style>{`
        .qoc * { box-sizing: border-box; }
        .qoc { margin: 0 16px 12px; font-family: 'DM Sans', system-ui, sans-serif; }

        .qoc-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 7px 13px; border-radius: 10px;
          font-size: 11.5px; font-weight: 600; letter-spacing: 0.01em;
          cursor: pointer; border: 1px solid transparent;
          transition: opacity 0.15s, transform 0.15s, box-shadow 0.2s;
          white-space: nowrap; outline: none;
          font-family: 'DM Sans', system-ui, sans-serif;
          -webkit-tap-highlight-color: transparent;
        }
        .qoc-btn:active { transform: scale(0.93); opacity: 0.80; }

        .qoc-btn-ghost {
          background: ${btnBg};
          border-color: ${btnBorder};
          color: ${textSec};
        }
        .qoc-btn-primary {
          background: linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%);
          color: #fff;
          box-shadow: 0 3px 14px rgba(14,165,233,0.40);
        }
        .qoc-btn-primary:hover { box-shadow: 0 4px 18px rgba(14,165,233,0.55); }

        @keyframes qoc-pulse-ring {
          0%  { transform: scale(1);   opacity: 0.7; }
          70% { transform: scale(2.4); opacity: 0;   }
          100%{ transform: scale(2.4); opacity: 0;   }
        }
        .qoc-pulse-ring { animation: qoc-pulse-ring 2s ease-out infinite; }

        @keyframes qoc-spin { to { transform: rotate(360deg); } }
        .qoc-spin { animation: qoc-spin 1s linear infinite; }

        .qoc-lora {
          font-family: 'Lora', Georgia, serif;
          font-style: italic; font-weight: 400;
          line-height: 1.72; letter-spacing: -0.005em;
        }

        @keyframes qoc-shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(250%);  }
        }
        .qoc-water-shimmer {
          position: absolute; top: 0; left: 0;
          width: 40%; height: 100%;
          background: linear-gradient(
            105deg,
            transparent 0%,
            rgba(255,255,255,0.06) 40%,
            rgba(255,255,255,0.14) 50%,
            rgba(255,255,255,0.06) 60%,
            transparent 100%
          );
          animation: qoc-shimmer 3.5s ease-in-out infinite;
          pointer-events: none; border-radius: 18px;
        }

        @keyframes qoc-celebrate {
          0%,100% { transform: scale(1);    }
          25%     { transform: scale(1.08); }
          50%     { transform: scale(0.96); }
          75%     { transform: scale(1.04); }
        }
        .qoc-celebrate { animation: qoc-celebrate 0.6s ease-in-out; }
      `}</style>

      <div className="qoc">
        <motion.div
          layout
          transition={{ layout: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
          style={{
            position: "relative", overflow: "hidden",
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            boxShadow: cardShadow,
            borderRadius: 18,
          }}
        >
          {/* Shimmer overlay — always present, subtle */}
          <div className="qoc-water-shimmer" />

          <AnimatePresence mode="wait" initial={false}>

            {/* ── Loading ── */}
            {orderLoading && !activeOrder && (
              <motion.div key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{
                  position: "relative", zIndex: 2,
                  padding: "18px", display: "flex", alignItems: "center", gap: 8,
                }}
              >
                <Loader2 size={12} className="qoc-spin" style={{ color: textMut }} strokeWidth={2} />
                <span style={{ fontSize: 11.5, color: textMut, fontWeight: 500 }}>
                  Checking your order…
                </span>
              </motion.div>
            )}

            {/* ══ ACTIVE ORDER CARD ══ */}
            {isActive && (
              <motion.div
                key={`order-${activeOrder._id}-${activeOrder.status}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                style={{ position: "relative", zIndex: 2 }}
              >
                {/* ── Wave fill canvas (positioned absolute behind content) ── */}
                <div
                  style={{
                    position: "absolute", inset: 0,
                    borderRadius: 18, overflow: "hidden",
                    pointerEvents: "none",
                  }}
                >
                  <WaveFill
                    fillLevel={cfg.fill}
                    speed={cfg.speed}
                    isDark={D}
                  />
                </div>

                {/* ── Card content (above wave) ── */}
                <div style={{
                  position: "relative", zIndex: 1,
                  display: "flex", flexDirection: "column",
                  padding: "14px 15px",
                  gap: 10,
                  // Subtle frosted glass over the wave
                  backdropFilter: "blur(1px)",
                  WebkitBackdropFilter: "blur(1px)",
                }}>

                  {/* TOP ROW: status + order number */}
                  <div style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between", gap: 8,
                  }}>
                    {/* Status badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ position: "relative", width: 10, height: 10, flexShrink: 0 }}>
                        <div className="qoc-pulse-ring" style={{
                          position: "absolute", inset: -3, borderRadius: "50%",
                          border: `1.5px solid ${cfg.color}`,
                        }} />
                        <div style={{
                          width: 10, height: 10, borderRadius: "50%",
                          background: cfg.color,
                          boxShadow: `0 0 6px ${cfg.color}80`,
                        }} />
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: cfg.color,
                        letterSpacing: "0.04em", textTransform: "uppercase", lineHeight: 1,
                        textShadow: D ? `0 0 12px ${cfg.color}60` : "none",
                      }}>
                        {cfg.emoji} {cfg.label}
                      </span>
                    </div>

                    {/* Order number + table */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {tableLabel && (
                        <span style={{
                          fontSize: 10, color: textMut, fontWeight: 600,
                          background: D ? "rgba(56,189,248,0.10)" : "rgba(14,165,233,0.08)",
                          border: `1px solid ${D ? "rgba(56,189,248,0.18)" : "rgba(14,165,233,0.16)"}`,
                          padding: "2px 7px", borderRadius: 6,
                        }}>
                          🪑 {tableLabel}
                        </span>
                      )}
                      {orderNum && (
                        <span style={{
                          fontSize: 9.5, color: textMut, fontWeight: 600,
                          letterSpacing: "0.06em", textTransform: "uppercase",
                        }}>
                          #{orderNum}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* DIVIDER */}
                  <div style={{ height: 1, background: divider }} />

                  {/* ITEMS + TOTAL row */}
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    {/* Items list */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={{
                        fontSize: 8.5, fontWeight: 700, color: textMut,
                        textTransform: "uppercase", letterSpacing: "0.14em",
                        marginBottom: 1,
                      }}>
                        Your Order
                      </span>

                      {displayItems.map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.08 + i * 0.06, duration: 0.32, ease: [0.22,1,0.36,1] }}
                          style={{ display: "flex", alignItems: "center", gap: 6 }}
                        >
                          {/* Water-drop bullet */}
                          <svg width="7" height="9" viewBox="0 0 7 9" style={{ flexShrink: 0, marginTop: 1 }}>
                            <path
                              d="M3.5 0 C3.5 0 0 3.5 0 5.5 A3.5 3.5 0 0 0 7 5.5 C7 3.5 3.5 0 3.5 0Z"
                              fill={D ? "rgba(56,189,248,0.55)" : "rgba(14,165,233,0.45)"}
                            />
                          </svg>
                          <span style={{
                            fontSize: 12.5, fontWeight: 600,
                            color: textPri, lineHeight: 1.3, flex: 1,
                          }}>
                            {item.qty > 1 && (
                              <span style={{
                                color: D ? "#38BDF8" : "#0284C7",
                                fontWeight: 800, marginRight: 3, fontSize: 12,
                              }}>
                                {item.qty}×
                              </span>
                            )}
                            {item.name}
                          </span>
                          {item.price != null && (
                            <span style={{
                              fontSize: 11, fontWeight: 600, color: textMut,
                              flexShrink: 0,
                            }}>
                              Rs {item.price * item.qty}
                            </span>
                          )}
                        </motion.div>
                      ))}

                      {extraCount > 0 && (
                        <span style={{
                          fontSize: 11, color: textMut, fontWeight: 500,
                          paddingLeft: 13,
                        }}>
                          +{extraCount} more item{extraCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {/* Total pill */}
                    {total != null && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.18, duration: 0.38, ease: [0.34,1.56,0.64,1] }}
                        style={{
                          display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                          background: D
                            ? "rgba(14,165,233,0.12)"
                            : "rgba(14,165,233,0.08)",
                          border: `1px solid ${D ? "rgba(56,189,248,0.22)" : "rgba(14,165,233,0.18)"}`,
                          borderRadius: 12,
                          padding: "8px 12px",
                          gap: 2,
                        }}
                      >
                        <span style={{
                          fontSize: 8, fontWeight: 700, color: textMut,
                          textTransform: "uppercase", letterSpacing: "0.12em",
                        }}>
                          Total
                        </span>
                        <span style={{
                          fontSize: 16, fontWeight: 800,
                          color: D ? "#38BDF8" : "#0369A1",
                          letterSpacing: "-0.04em", lineHeight: 1,
                        }}>
                          Rs {total}
                        </span>
                      </motion.div>
                    )}
                  </div>

                  {/* DIVIDER */}
                  <div style={{ height: 1, background: divider }} />

                  {/* ACTION BUTTONS */}
                  <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                    <button
                      className="qoc-btn qoc-btn-ghost"
                      onClick={handleViewOrder}
                    >
                      <ShoppingBag size={11} strokeWidth={2.4} />
                      View Order
                    </button>

                    {/* Gallery + Reviews — while order is still being prepared */}
                    {isGallery && (
                      <>
                        <motion.button
                          className="qoc-btn qoc-btn-ghost"
                          onClick={handleGallery}
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.1, duration: 0.36, ease: [0.34,1.56,0.64,1] }}
                          style={{
                            background: D ? "rgba(56,189,248,0.08)" : "rgba(14,165,233,0.06)",
                            borderColor: D ? "rgba(56,189,248,0.18)" : "rgba(14,165,233,0.16)",
                            color: D ? "#7DD3FC" : "#0369A1",
                          }}
                        >
                          📸 Kitchen
                        </motion.button>
                        <motion.button
                          className="qoc-btn qoc-btn-ghost"
                          onClick={handleReviews}
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.16, duration: 0.36, ease: [0.34,1.56,0.64,1] }}
                          style={{
                            background: D ? "rgba(251,191,36,0.08)" : "rgba(245,158,11,0.06)",
                            borderColor: D ? "rgba(251,191,36,0.18)" : "rgba(245,158,11,0.16)",
                            color: D ? "#FCD34D" : "#B45309",
                          }}
                        >
                          ⭐ Reviews
                        </motion.button>
                      </>
                    )}

                    {/* Pay Now — ONLY when served or delivered */}
                    {isPayable && (
                      <motion.button
                        className="qoc-btn qoc-btn-primary"
                        onClick={handlePay}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.12, duration: 0.38, ease: [0.34,1.56,0.64,1] }}
                      >
                        <CreditCard size={11} strokeWidth={2.4} />
                        Pay Now
                        <ChevronRight size={10} strokeWidth={2.5} style={{ marginLeft: -2 }} />
                      </motion.button>
                    )}

                    {/* Fill level label */}
                    <span style={{
                      marginLeft: "auto",
                      fontSize: 9, fontWeight: 700, color: textMut,
                      letterSpacing: "0.06em", textTransform: "uppercase",
                    }}>
                      {Math.round(cfg.fill * 100)}%
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══ QUOTE VIEW ══ */}
            {!isActive && !orderLoading && quote && (
              <motion.div key="quote-shell"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.28 }}
                style={{ position: "relative", zIndex: 2 }}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", padding: "11px 15px 0", gap: 7 }}>
                  <TimerRing progress={progress} color={accentC} />
                  <span style={{
                    fontSize: 8.5, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.20em", color: textMut, lineHeight: 1, flex: 1,
                  }}>
                    Quote of the moment
                  </span>
                </div>

                {/* Quote body */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`body-${animKey}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: phase === "out" ? 0 : 1, y: phase === "out" ? -8 : 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: EXIT_MS / 1000, ease: [0.4, 0, 0.2, 1] }}
                    style={{ padding: "9px 15px 13px" }}
                  >
                    <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5, x: -4 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{ duration: 0.48, ease: [0.34,1.56,0.64,1], delay: 0.05 }}
                        style={{ marginTop: 5, flexShrink: 0 }}
                      >
                        <QuoteIcon color={accentC} />
                      </motion.div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <motion.span
                          key={`emoji-${animKey}`}
                          initial={{ opacity: 0, scale: 0.3, rotate: -15 }}
                          animate={{ opacity: 1, scale: 1, rotate: 0 }}
                          transition={{ duration: 0.48, ease: [0.34,1.56,0.64,1], delay: 0.08 }}
                          style={{
                            display: "inline-block", fontSize: 18, lineHeight: 1,
                            marginBottom: 6, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.12))",
                          }}
                        >
                          {quote.emoji ?? "💬"}
                        </motion.span>

                        <p className="qoc-lora" style={{
                          fontSize: isNepali ? 13 : 14,
                          color: textPri, margin: 0,
                          lineHeight: isNepali ? 1.88 : 1.72,
                        }}>
                          <RevealWords key={`w-${animKey}`} text={quote.text} id={animKey} />
                        </p>

                        {quote.author && (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.55, duration: 0.4 }}
                            style={{
                              fontSize: 11, fontWeight: 600, color: accentC,
                              margin: "7px 0 0",
                              fontFamily: "'DM Sans', sans-serif",
                              letterSpacing: "0.02em",
                            }}
                          >
                            — {quote.author}
                          </motion.p>
                        )}
                      </div>
                    </div>

                    {/* Progress dots */}
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: 0.5, duration: 0.4 }}
                      style={{
                        display: "flex", gap: 4, marginTop: 10,
                        justifyContent: "flex-end", alignItems: "center",
                      }}
                    >
                      {Array.from({ length: Math.min(poolRef.current.length, 8) }, (_, i) => {
                        const activeIdx = lastIdxRef.current % 8;
                        return (
                          <motion.div key={i}
                            animate={{
                              width: i === activeIdx ? 18 : 4,
                              background: i === activeIdx
                                ? accentC
                                : D ? "rgba(56,189,248,0.18)" : "rgba(14,165,233,0.18)",
                            }}
                            transition={{ duration: 0.48, ease: [0.34,1.56,0.64,1] }}
                            style={{ height: 3.5, borderRadius: 99 }}
                          />
                        );
                      })}
                    </motion.div>
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}