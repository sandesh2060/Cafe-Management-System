// src/modules/customer/components/menu/MenuCard.jsx
// Features:
//   • Glass price pill: "Rs 180 / 300" format
//   • Cart-aware: card tints warm amber when item is in cart
//   • Add button expands to show ×N quantity when in cart
//   • Portion sheet for multi-size items
//   • GSAP animations throughout, iOS Safari safe

import { useState, useContext, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { X, Plus, Check } from "lucide-react";
import { ThemeContext } from "@shared/context/ThemeContext";
import { addItem } from "@store/slices/cartSlice";
import { lockScroll, unlockScroll } from "@shared/utils/lenisLock";
import { useEffect } from "react";

// ─── Cart quantity selector ───────────────────────────────────────────────────

function useCartQty(menuItemId) {
  return useSelector((state) => {
    const items = state.cart?.items ?? [];
    return items
      .filter((i) => i.menuItemId === menuItemId)
      .reduce((sum, i) => sum + (i.quantity ?? 1), 0);
  });
}

// ─── Glass Price Pill ─────────────────────────────────────────────────────────

function GlassPill({ children, isDark: D, inCart }) {
  return (
    <div
      className="relative flex-1 min-w-0 h-[36px] rounded-[10px] flex items-center justify-center overflow-hidden"
      style={{
        background: inCart
          ? D ? "rgba(255,159,28,0.20)" : "rgba(255,159,28,0.16)"
          : D ? "rgba(255,159,28,0.09)" : "rgba(255,159,28,0.10)",
        border: inCart
          ? D ? "1px solid rgba(255,159,28,0.52)" : "1px solid rgba(200,104,10,0.45)"
          : D ? "1px solid rgba(255,159,28,0.26)" : "1px solid rgba(200,104,10,0.26)",
        backdropFilter: "blur(16px) saturate(180%)",
        WebkitBackdropFilter: "blur(16px) saturate(180%)",
        boxShadow: D
          ? "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(255,159,28,0.12)"
          : "inset 0 1px 0 rgba(255,255,255,0.90), inset 0 -1px 0 rgba(200,104,10,0.08)",
        transition: "background 0.30s ease, border-color 0.30s ease",
        transform: "translate3d(0,0,0)",
      }}
    >
      {/* Top shine specular */}
      <div
        aria-hidden
        className="absolute top-0 left-[8%] right-[8%] h-px pointer-events-none z-[1]"
        style={{
          background: D
            ? "linear-gradient(90deg,transparent,rgba(255,255,255,0.42) 38%,rgba(255,255,255,0.68) 50%,rgba(255,255,255,0.42) 62%,transparent)"
            : "linear-gradient(90deg,transparent,rgba(255,255,255,0.95) 50%,transparent)",
        }}
      />
      {children}
    </div>
  );
}

function PriceDisplay({ item, isDark: D, inCart }) {
  const hasPortions = Array.isArray(item.portions) && item.portions.length > 0;

  const textStyle = {
    fontSize: "13px",
    fontWeight: 900,
    letterSpacing: "-0.025em",
    lineHeight: 1,
    color: D ? "#FFD580" : "#B85C08",
    textShadow: D ? "0 1px 8px rgba(255,140,0,0.50)" : "none",
    fontVariantNumeric: "tabular-nums",
    position: "relative",
    zIndex: 2,
    whiteSpace: "nowrap",
  };

  const sepStyle = {
    color: D ? "rgba(255,159,28,0.38)" : "rgba(170,90,8,0.35)",
    fontWeight: 300,
    fontSize: "11px",
    margin: "0 3px",
  };

  const renderPrice = () => {
    if (!hasPortions) {
      return <span style={textStyle}>Rs {item.price}</span>;
    }
    if (item.portions.length === 2) {
      return (
        <span style={textStyle}>
          Rs {item.portions[0].price}
          <span style={sepStyle}>/</span>
          {item.portions[1].price}
        </span>
      );
    }
    const prices = item.portions.map((p) => p.price);
    return (
      <span style={textStyle}>
        Rs {Math.min(...prices)}
        <span style={sepStyle}>/</span>
        {Math.max(...prices)}
      </span>
    );
  };

  return <GlassPill isDark={D} inCart={inCart}>{renderPrice()}</GlassPill>;
}

// ─── Add Button (expands to ×N when in cart) ──────────────────────────────────

function AddButton({ qty, onClick, onTouchStart, onTouchEnd, btnRef }) {
  const hasQty = qty > 0;

  return (
    <div
      ref={btnRef}
      onClick={onClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="button"
      tabIndex={0}
      aria-label="Add to cart"
      className="relative flex-shrink-0 flex items-center justify-center cursor-pointer [-webkit-tap-highlight-color:transparent] touch-manipulation overflow-hidden"
      style={{
        width: hasQty ? "54px" : "36px",
        height: "36px",
        borderRadius: "10px",
        background: "linear-gradient(135deg,#FF9F1C 0%,#E05C2A 100%)",
        boxShadow: hasQty
          ? "0 4px 18px rgba(255,130,0,0.55), inset 0 1px 0 rgba(255,255,255,0.20)"
          : "0 4px 14px rgba(255,130,0,0.40), inset 0 1px 0 rgba(255,255,255,0.18)",
        transform: "translate3d(0,0,0)",
        willChange: "transform",
        transition: "width 0.28s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.20s ease",
      }}
    >
      {/* Shine on button */}
      <div
        aria-hidden
        style={{
          position: "absolute", top: 0, left: "10%", right: "10%", height: "1px",
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.45) 50%,transparent)",
          pointerEvents: "none", zIndex: 1,
        }}
      />

      {hasQty ? (
        <div
          className="flex items-center gap-[4px] px-[8px]"
          style={{ position: "relative", zIndex: 2 }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-0.01em",
              lineHeight: 1,
              textShadow: "0 1px 3px rgba(0,0,0,0.22)",
              whiteSpace: "nowrap",
            }}
          >
            ×{qty}
          </span>
          <div
            style={{
              width: "1px", height: "11px",
              background: "rgba(255,255,255,0.32)",
              flexShrink: 0,
            }}
          />
          <Plus size={12} color="rgba(255,255,255,0.92)" strokeWidth={3} />
        </div>
      ) : (
        <div style={{ position: "relative", zIndex: 2 }}>
          <Plus size={17} color="#fff" strokeWidth={3} />
        </div>
      )}
    </div>
  );
}

// ─── Portion Sheet ────────────────────────────────────────────────────────────

function PortionSheet({ item, onClose }) {
  const { isDark: D } = useContext(ThemeContext);
  const dispatch = useDispatch();

  const defaultPortion =
    item.portions?.find((p) => p.isDefault) ?? item.portions?.[0] ?? null;
  const [selectedId, setSelectedId] = useState(defaultPortion?.id ?? null);

  const closingRef = useRef(false);
  const overlayRef = useRef(null);
  const sheetRef   = useRef(null);
  const optsRef    = useRef([]);
  const btnRef     = useRef(null);

  useEffect(() => () => unlockScroll(), []);

  useEffect(() => {
    if (!overlayRef.current || !sheetRef.current) return;
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.fromTo(overlayRef.current, { opacity: 0 },   { opacity: 1, duration: 0.24 }, 0);
    tl.fromTo(sheetRef.current,   { y: "100%" },     { y: "0%",   duration: 0.40 }, 0.04);
    const opts = optsRef.current.filter(Boolean);
    if (opts.length)
      tl.fromTo(
        opts,
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.26, stagger: 0.06, ease: "power3.out" },
        0.2,
      );
    if (btnRef.current)
      tl.fromTo(btnRef.current, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.24 }, 0.3);
  }, []);

  const animateClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    gsap
      .timeline({ onComplete: onClose })
      .to(sheetRef.current,   { y: "100%", duration: 0.26, ease: "power3.in" }, 0)
      .to(overlayRef.current, { opacity: 0, duration: 0.20, ease: "power2.in" }, 0);
  }, [onClose]);

  const selectedPortion = item.portions?.find((p) => p.id === selectedId) ?? null;

  const handleAdd = useCallback(() => {
    if (!selectedPortion) return;
    dispatch(
      addItem({
        menuItemId:   item._id,
        name:         item.name,
        price:        selectedPortion.price,
        quantity:     1,
        emoji:        item.emoji,
        category:     item.category,
        portionId:    selectedPortion.id,
        portionLabel: selectedPortion.label,
      }),
    );
    gsap
      .timeline()
      .to(btnRef.current, { scale: 0.93, duration: 0.09, ease: "power2.in" })
      .to(btnRef.current, {
        scale: 1,
        duration: 0.28,
        ease: "back.out(3)",
        onComplete: animateClose,
      });
  }, [selectedPortion, item, dispatch, animateClose]);

  return createPortal(
    <>
      <div
        ref={overlayRef}
        onClick={animateClose}
        className="fixed inset-0 z-[99990] touch-none"
        style={{
          background: D ? "rgba(0,0,0,0.72)" : "rgba(8,3,0,0.42)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          willChange: "opacity",
        }}
      />

      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        className={`fixed bottom-0 left-0 right-0 z-[99991] rounded-t-[24px] ${
          D ? "bg-[rgba(14,7,2,0.97)]" : "bg-[rgba(255,252,246,0.97)]"
        }`}
        style={{
          backdropFilter: "blur(48px) saturate(200%)",
          WebkitBackdropFilter: "blur(48px) saturate(200%)",
          borderTop: D
            ? "1px solid rgba(255,159,28,0.20)"
            : "1px solid rgba(255,255,255,0.90)",
          boxShadow: D
            ? "0 -24px 64px rgba(0,0,0,0.80)"
            : "0 -12px 48px rgba(92,51,23,0.15)",
          paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 24px)",
          transform: "translate3d(0,0,0)",
          willChange: "transform",
        }}
      >
        {/* Gold accent line */}
        <div
          aria-hidden
          className="absolute top-0 left-[12%] right-[12%] h-0.5 rounded-full pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg,transparent,#FF9F1C 30%,#FFD580 50%,#E05C2A 70%,transparent)",
            opacity: D ? 0.65 : 0.45,
          }}
        />

        {/* Drag handle */}
        <div
          className={`w-9 h-1 rounded-full mx-auto mt-3.5 ${
            D ? "bg-white/15" : "bg-[rgba(92,51,23,0.14)]"
          }`}
        />

        {/* Header */}
        <div
          className={`flex items-center gap-3 px-4 py-3.5 ${
            D ? "border-b border-white/[0.07]" : "border-b border-[rgba(92,51,23,0.09)]"
          }`}
        >
          <div
            className={`w-12 h-12 rounded-[14px] flex-shrink-0 text-[28px] flex items-center justify-center ${
              D
                ? "bg-[rgba(255,159,28,0.10)] border border-[rgba(255,159,28,0.18)]"
                : "bg-[rgba(255,200,130,0.14)] border border-[rgba(255,200,130,0.30)]"
            }`}
          >
            {item.emoji ?? "🍽️"}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`m-0 text-[16px] font-extrabold tracking-[-0.03em] leading-tight truncate ${
                D ? "text-[#FFF8EE]" : "text-[#120D06]"
              }`}
            >
              {item.name}
            </p>
            <p
              className={`m-0 mt-0.5 text-xs ${
                D ? "text-[rgba(255,196,110,0.5)]" : "text-[rgba(92,51,23,0.45)]"
              }`}
            >
              Choose your size
            </p>
          </div>
          <button
            onClick={animateClose}
            aria-label="Close"
            className={`w-[34px] h-[34px] rounded-[10px] border-none flex items-center justify-center flex-shrink-0 cursor-pointer [-webkit-tap-highlight-color:transparent] ${
              D
                ? "bg-white/[0.08] text-[rgba(255,196,110,0.5)]"
                : "bg-[rgba(92,51,23,0.06)] text-[rgba(92,51,23,0.45)]"
            }`}
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* Options */}
        <div className="px-4 pt-3.5 pb-3 flex flex-col gap-2.5">
          {(item.portions ?? []).map((portion, i) => {
            const sel = selectedId === portion.id;
            return (
              <button
                key={portion.id}
                ref={(el) => { optsRef.current[i] = el; }}
                onClick={() => setSelectedId(portion.id)}
                className={[
                  "flex items-center justify-between px-4 py-3.5 rounded-2xl cursor-pointer border-[1.5px] transition-all duration-150 [-webkit-tap-highlight-color:transparent] touch-manipulation font-sans w-full",
                  sel
                    ? "border-[rgba(255,159,28,0.60)] shadow-[0_0_0_3px_rgba(255,159,28,0.10),0_4px_14px_rgba(255,130,0,0.16)]"
                    : D ? "border-white/[0.09]" : "border-[rgba(92,51,23,0.10)]",
                  sel
                    ? D ? "bg-[rgba(255,159,28,0.11)]" : "bg-[rgba(255,159,28,0.07)]"
                    : D ? "bg-white/[0.03]" : "bg-white/85",
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-[22px] h-[22px] rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-150"
                    style={{
                      border: `2px solid ${
                        sel ? "#FF9F1C" : D ? "rgba(255,255,255,0.18)" : "rgba(92,51,23,0.18)"
                      }`,
                      background: sel
                        ? "linear-gradient(135deg,#FF9F1C,#E05C2A)"
                        : "transparent",
                    }}
                  >
                    {sel && <Check size={11} color="#fff" strokeWidth={3.5} />}
                  </div>
                  <span
                    className={`text-[15px] font-bold transition-colors duration-150 ${
                      sel
                        ? D ? "text-[#FFB84D]" : "text-[#C8680A]"
                        : D ? "text-[#FFF8EE]" : "text-[#120D06]"
                    }`}
                  >
                    {portion.label}
                  </span>
                </div>
                <span
                  className={`text-[16px] font-black tracking-[-0.04em] font-mono transition-colors duration-150 ${
                    sel
                      ? D ? "text-[#FFB84D]" : "text-[#C8680A]"
                      : D ? "text-[rgba(255,196,110,0.5)]" : "text-[rgba(92,51,23,0.45)]"
                  }`}
                >
                  Rs {portion.price}
                </span>
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <div className="px-4">
          <button
            ref={btnRef}
            onClick={handleAdd}
            disabled={!selectedPortion}
            className="w-full h-14 rounded-[17px] border-none text-[15px] font-extrabold tracking-[-0.02em] flex items-center justify-center gap-2 [-webkit-tap-highlight-color:transparent] transition-all duration-200"
            style={{
              background: selectedPortion
                ? "linear-gradient(135deg,#FF9F1C 0%,#E05C2A 100%)"
                : D ? "rgba(255,255,255,0.06)" : "rgba(92,51,23,0.06)",
              boxShadow: selectedPortion
                ? "0 8px 28px rgba(255,130,0,0.44), 0 1px 0 rgba(255,255,255,0.22) inset"
                : "none",
              color: selectedPortion
                ? "#fff"
                : D ? "rgba(255,196,110,0.5)" : "rgba(92,51,23,0.45)",
              cursor: selectedPortion ? "pointer" : "not-allowed",
              transform: "translate3d(0,0,0)",
              willChange: "transform",
            }}
          >
            <Plus size={17} strokeWidth={3} />
            <span>
              {selectedPortion
                ? `Add to Cart · Rs ${selectedPortion.price}`
                : "Select a size"}
            </span>
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}

// ─── MenuCard ─────────────────────────────────────────────────────────────────

export default function MenuCard({ item }) {
  const { isDark: D } = useContext(ThemeContext);
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const cartQty   = useCartQty(item._id);
  const inCart    = cartQty > 0;

  const [sheetOpen, setSheetOpen] = useState(false);
  const imgRef     = useRef(null);
  const plusBtnRef = useRef(null);
  const cardRef    = useRef(null);

  const hasPortions = Array.isArray(item.portions) && item.portions.length > 0;

  const handleCardClick = useCallback(
    () => navigate(`/menu/item/${item._id}`),
    [navigate, item._id],
  );

  const handlePlusClick = useCallback(
    (e) => {
      e.stopPropagation();
      if (hasPortions) {
        lockScroll();
        setSheetOpen(true);
      } else {
        dispatch(
          addItem({
            menuItemId:   item._id,
            name:         item.name,
            price:        item.price,
            quantity:     1,
            emoji:        item.emoji,
            category:     item.category,
            portionId:    null,
            portionLabel: null,
          }),
        );
        if (plusBtnRef.current) {
          gsap
            .timeline()
            .to(plusBtnRef.current, { scale: 0.78, duration: 0.09, ease: "power2.in",   force3D: true })
            .to(plusBtnRef.current, { scale: 1.18, duration: 0.22, ease: "back.out(4)", force3D: true })
            .to(plusBtnRef.current, { scale: 1,    duration: 0.18, ease: "power2.out",  force3D: true });
        }
      }
    },
    [hasPortions, item, dispatch],
  );

  const onEnter = useCallback(() => {
    if (imgRef.current)
      gsap.to(imgRef.current, { scale: 1.06, duration: 0.50, ease: "power2.out", force3D: true });
  }, []);

  const onLeave = useCallback(() => {
    if (imgRef.current)
      gsap.to(imgRef.current, { scale: 1, duration: 0.55, ease: "power2.out", force3D: true });
  }, []);

  return (
    <>
      <div
        className="relative rounded-[18px]"
        style={{
          clipPath: "inset(0 round 18px)",
          WebkitClipPath: "inset(0 round 18px)",
          isolation: "isolate",
        }}
      >
        <div
          ref={cardRef}
          onClick={handleCardClick}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          onTouchStart={() =>
            gsap.to(cardRef.current, {
              scale: 0.968, duration: 0.10,
              ease: "power2.out", force3D: true, overwrite: true,
            })
          }
          onTouchEnd={() =>
            gsap.to(cardRef.current, {
              scale: 1, duration: 0.42,
              ease: "back.out(2.4)", force3D: true, overwrite: true,
            })
          }
          onTouchCancel={() =>
            gsap.to(cardRef.current, {
              scale: 1, duration: 0.35,
              ease: "power3.out", force3D: true, overwrite: true,
            })
          }
          className="rounded-[18px] cursor-pointer select-none relative [-webkit-tap-highlight-color:transparent] touch-manipulation"
          style={{
            background: inCart
              ? D
                ? "linear-gradient(160deg,#1F1106 0%,#251309 100%)"
                : "linear-gradient(160deg,#FFFAF4 0%,#FFF5E2 100%)"
              : D ? "#1A0E04" : "#FFFFFF",
            border: inCart
              ? D
                ? "1px solid rgba(255,159,28,0.26)"
                : "1px solid rgba(200,104,10,0.20)"
              : D
                ? "1px solid rgba(255,255,255,0.08)"
                : "1px solid rgba(92,51,23,0.09)",
            boxShadow: inCart
              ? D
                ? "0 2px 20px rgba(255,130,0,0.16), 0 0 0 0.5px rgba(255,159,28,0.10) inset"
                : "0 2px 14px rgba(200,104,10,0.12), 0 1px 0 rgba(255,255,255,0.9) inset"
              : D
                ? "0 2px 16px rgba(0,0,0,0.42), 0 0 0 0.5px rgba(255,255,255,0.05) inset"
                : "0 2px 10px rgba(92,51,23,0.10), 0 1px 0 rgba(255,255,255,0.9) inset",
            transform: "translate3d(0,0,0)",
            willChange: "transform",
            WebkitMaskImage: "radial-gradient(white,white)",
            transition: "background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease",
          }}
        >
          {/* ── Image ── */}
          <div
            className="relative overflow-hidden"
            style={{
              aspectRatio: "4/3",
              background: inCart
                ? D ? "#2B1609" : "#F9EDD8"
                : D ? "#251408" : "#F5EEE0",
              transition: "background 0.35s ease",
            }}
          >
            {item.image ? (
              <img
                ref={imgRef}
                src={item.image}
                alt={item.name}
                loading="lazy"
                className="w-full h-full object-cover block"
                style={{
                  transform: "translate3d(0,0,0)",
                  willChange: "transform",
                  filter: inCart ? "brightness(0.90) saturate(1.08)" : "none",
                  transition: "filter 0.35s ease",
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[46px]">
                {item.emoji ?? "🍽️"}
              </div>
            )}

            {/* Veg / non-veg dot */}
            {item.isVeg !== undefined && (
              <div
                className="absolute top-2 left-2 w-[22px] h-[22px] rounded-[6px] flex items-center justify-center"
                style={{
                  border: `2px solid ${item.isVeg ? "#22c55e" : "#ef4444"}`,
                  background: D ? "rgba(10,5,1,0.85)" : "rgba(255,252,247,0.92)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                }}
              >
                <div
                  className="w-[9px] h-[9px] rounded-full"
                  style={{ background: item.isVeg ? "#22c55e" : "#ef4444" }}
                />
              </div>
            )}

            {/* Sizes badge */}
            {hasPortions && (
              <div
                className="absolute top-2 right-2 px-[9px] py-[3px] rounded-[8px] text-[9px] font-bold tracking-[0.04em]"
                style={{
                  background: D ? "rgba(10,5,1,0.82)" : "rgba(255,252,247,0.90)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  color: D ? "#FFB84D" : "#C8680A",
                  border: `1px solid ${
                    D ? "rgba(255,159,28,0.22)" : "rgba(255,159,28,0.28)"
                  }`,
                }}
              >
                {item.portions.length} sizes
              </div>
            )}

            {/* Bottom fade — matches card bg */}
            <div
              className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
              style={{
                background: `linear-gradient(to top,${
                  inCart
                    ? D ? "#251309" : "#FFF5E2"
                    : D ? "#1A0E04" : "#FFFFFF"
                },transparent)`,
                transition: "background 0.35s ease",
              }}
            />
          </div>

          {/* ── Info ── */}
          <div className="px-3 pt-2.5 pb-3">
            <p
              className="m-0 text-[13px] font-bold tracking-[-0.015em] leading-[1.3] truncate"
              style={{
                color: inCart
                  ? D ? "#FFE09A" : "#9A4A04"
                  : D ? "#FFF8EE" : "#120D06",
                transition: "color 0.30s ease",
              }}
            >
              {item.name}
            </p>

            {item.description && (
              <p
                className="m-0 mt-[3px] text-[11px] leading-[1.45] overflow-hidden"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  color: D ? "rgba(255,196,110,0.5)" : "rgba(92,51,23,0.45)",
                }}
              >
                {item.description}
              </p>
            )}

            {/* ── Price + Add row ── */}
            <div className="flex items-center justify-between mt-2.5 gap-2 min-w-0">
              <PriceDisplay item={item} isDark={D} inCart={inCart} />
              <AddButton
                qty={cartQty}
                btnRef={plusBtnRef}
                onClick={handlePlusClick}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      </div>

      {sheetOpen && (
        <PortionSheet
          item={item}
          onClose={() => {
            setSheetOpen(false);
            unlockScroll();
          }}
        />
      )}
    </>
  );
}