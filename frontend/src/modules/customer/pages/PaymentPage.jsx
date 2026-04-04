// src/modules/customer/pages/PaymentPage.jsx
//
// BILLED STATUS FIX:
//   • If order.status === 'billed' when page loads (customer refreshed after
//     requesting bill), flowState is initialised to 'waiting_cashier' directly
//     instead of 'idle'. Avoids the customer seeing the payment form again.
//   • Confirm button disabled when order.status === 'billed' (belt + braces).
//   • handleCashCard: after /billing/:id/request succeeds, the backend now sets
//     order.status → 'billed'. The socket emits order:status_update with
//     status 'billed' — orderSlice.socketStatusUpdate handles this correctly.
//   • All gradient transition, GSAP, method toggle, icon fixes — unchanged.

import React, {
  useContext, useRef, useEffect, useState, useCallback, useMemo
} from "react"
import { useSelector }              from "react-redux"
import { useNavigate }              from "react-router-dom"
import { selectActiveOrder }        from "@store/slices/orderSlice"
import { selectLoyalty }            from "@store/slices/loyaltySlice"
import { ThemeContext }             from "@shared/context/ThemeContext"
import { BRAND, FONTS, getPalette } from "@shared/config/brand"
import socketService                from "@shared/services/socket.service"
import api                          from "@api/axios"
import gsap                         from "gsap"
import {
  CreditCard, Banknote, CheckCircle2, ChevronLeft, Clock, AlertCircle
} from "lucide-react"

const ESEWA = {
  green:  "#60BB46",
  dark:   "#3D9930",
  glow:   "rgba(96,187,70,0.28)",
  dim:    "rgba(96,187,70,0.12)",
  border: "rgba(96,187,70,0.30)",
  ring:   "rgba(96,187,70,0.16)",
}

const TIER_MULT  = { bronze: 1, silver: 1.5, gold: 2, none: 1 }
const calcPoints = (total, tier) => Math.floor((total / 10) * (TIER_MULT[tier] ?? 1))

const METHODS = [
  { id: "cash",  label: "Cash",  sub: "Pay at counter", esewa: false },
  { id: "card",  label: "Card",  sub: "Debit / Credit", esewa: false },
  { id: "esewa", label: "eSewa", sub: "Digital wallet",  esewa: true  },
]

function resolveTokens(id, P) {
  if (id === "esewa") return { ...ESEWA }
  const accent = P.accent || "#D97706"
  return {
    green:  accent,
    dark:   P.accentDark   || accent,
    glow:   P.accentGlow   || `${accent}44`,
    dim:    P.accentDim    || `${accent}18`,
    border: P.accentBorder || `${accent}40`,
    ring:   P.accentRing   || `${accent}22`,
  }
}

function PointsCounter({ target, color, font }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!target) return
    let raf, start = null
    const run = ts => {
      if (!start) start = ts
      const p = Math.min((ts - start) / 1100, 1)
      setN(Math.round((1 - Math.pow(2, -10 * p)) * target))
      if (p < 1) raf = requestAnimationFrame(run)
    }
    const tid = setTimeout(() => { raf = requestAnimationFrame(run) }, 380)
    return () => { clearTimeout(tid); cancelAnimationFrame(raf) }
  }, [target])
  return <span style={{ fontFamily: font, fontWeight: 800, fontSize: "1em", color, letterSpacing: "-0.03em" }}>{n}</span>
}

function MethodIcon({ id, isEsewa, selected, color, muted, fontBrand, size = 20 }) {
  if (isEsewa) return (
    <span style={{ fontSize: Math.max(9, size * 0.55), fontWeight: 900, fontFamily: fontBrand, color: selected ? ESEWA.green : muted, letterSpacing: "-0.01em", transition: "color 0.22s", lineHeight: 1, userSelect: "none" }}>eSewa</span>
  )
  const props = { size, strokeWidth: 1.8, color }
  if (id === "cash") return <Banknote {...props} />
  return <CreditCard {...props} />
}

const PaymentPage = () => {
  const order   = useSelector(selectActiveOrder)
  const loyalty = useSelector(selectLoyalty)
  const { isDark } = useContext(ThemeContext)
  const navigate   = useNavigate()
  const P          = getPalette(isDark)

  const FONT_BRAND   = FONTS.brand   || FONTS.heading
  const FONT_BODY    = FONTS.body
  const FONT_HEADING = FONTS.heading
  const DIVIDER_STR  = P.dividerStrong || P.divider
  const ACCENT_GRAD  = P.accentGradient
    || `linear-gradient(135deg, ${P.accent || "#D97706"} 0%, ${P.accentDark || P.accent || "#B45309"} 100%)`

  // FIX: if order is already 'billed' on load, go straight to waiting_cashier
  const alreadyBilled = order?.status === 'billed'

  const [selectedMethod, setSelectedMethod] = useState("cash")
  const [flowState,      setFlowState]      = useState(alreadyBilled ? "waiting_cashier" : "idle")
  const [errorMsg,       setErrorMsg]       = useState("")

  const flowStateRef = useRef(alreadyBilled ? "waiting_cashier" : "idle")
  const setFlow = useCallback((val) => { flowStateRef.current = val; setFlowState(val) }, [])

  // Sync if order status changes to 'billed' via socket while on this page
  useEffect(() => {
    if (order?.status === 'billed' && flowStateRef.current === 'idle') {
      setFlow('waiting_cashier')
    }
  }, [order?.status, setFlow])

  const pageRef       = useRef(null)
  const headerRef     = useRef(null)
  const billCardRef   = useRef(null)
  const itemsRef      = useRef([])
  const summaryRef    = useRef(null)
  const pointsRef     = useRef(null)
  const methodsRef    = useRef(null)
  const footerRef     = useRef(null)
  const methodBtnsRef = useRef([])
  const waitingRef    = useRef(null)

  const activeTokens = useMemo(() => resolveTokens(selectedMethod, P), [selectedMethod, isDark])
  const activeMeta   = useMemo(() => METHODS.find(m => m.id === selectedMethod) ?? METHODS[0], [selectedMethod])
  const isEsewa      = selectedMethod === "esewa"
  const isLoading    = flowState === "requesting" || flowState === "esewa_redirecting"
  // FIX: also disable confirm if order is already billed
  const btnDisabled  = isLoading || flowState === "waiting_cashier" || alreadyBilled

  useEffect(() => {
    const mm = gsap.matchMedia()
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } })
      if (headerRef.current)   tl.fromTo(headerRef.current,   { y: -22, opacity: 0 },           { y: 0, opacity: 1, duration: 0.46, clearProps: "transform,opacity" }, 0)
      if (billCardRef.current) tl.fromTo(billCardRef.current, { y: 36, opacity: 0, scale: 0.96 },{ y: 0, opacity: 1, scale: 1, duration: 0.56, clearProps: "transform,opacity" }, 0.08)
      const itemEls = itemsRef.current.filter(Boolean)
      if (itemEls.length) tl.fromTo(itemEls, { x: -18, opacity: 0 }, { x: 0, opacity: 1, duration: 0.30, stagger: 0.055, clearProps: "transform,opacity" }, 0.24)
      if (summaryRef.current)  tl.fromTo(summaryRef.current,  { y: 10, opacity: 0 },  { y: 0, opacity: 1, duration: 0.30, clearProps: "transform,opacity" }, 0.44)
      if (pointsRef.current)   tl.fromTo(pointsRef.current,   { y: 22, opacity: 0, scale: 0.94 }, { y: 0, opacity: 1, scale: 1, duration: 0.44, clearProps: "transform,opacity" }, 0.52)
      if (methodsRef.current)  tl.fromTo(methodsRef.current,  { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.44, clearProps: "transform,opacity" }, 0.62)
      const mEls = methodBtnsRef.current.filter(Boolean)
      if (mEls.length) tl.fromTo(mEls, { scale: 0.86, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.34, stagger: 0.08, ease: "back.out(2.2)", clearProps: "transform,opacity" }, 0.72)
      if (footerRef.current)   tl.fromTo(footerRef.current,   { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.38, clearProps: "transform,opacity" }, 0.82)
    })
    return () => mm.revert()
  }, [])

  useEffect(() => {
    if (!order?._id) return
    const unsub = socketService.on("payment:confirmed", (data) => {
      if (String(data.orderId) !== String(order._id)) return
      navigate("/payment/success", {
        state: {
          pointsEarned:  data.pointsEarned  ?? order.pointsEarned ?? 0,
          totalAmount:   data.total         ?? order.total        ?? 0,
          paymentMethod: data.paymentMethod,
        },
        replace: true,
      })
    })
    return unsub
  }, [order?._id, navigate])

  const handleSelectMethod = useCallback((id, idx) => {
    if (flowStateRef.current !== "idle") return
    setSelectedMethod(id)
    const el = methodBtnsRef.current[idx]
    if (!el) return
    gsap.timeline()
      .to(el, { scale: 0.91, duration: 0.10, ease: "power2.in" })
      .to(el, { scale: 1.04, duration: 0.22, ease: "back.out(2.8)" })
      .to(el, { scale: 1,    duration: 0.13, ease: "power2.out", clearProps: "transform" })
  }, [])

  const handleCashCard = useCallback(async () => {
    if (!order?._id || flowStateRef.current !== "idle") return
    setFlow("requesting")
    setErrorMsg("")
    try {
      await api.post(`/billing/${order._id}/request`, { paymentMethod: selectedMethod })
      setFlow("waiting_cashier")
      if (waitingRef.current) {
        const mm = gsap.matchMedia()
        mm.add("(prefers-reduced-motion: no-preference)", () => {
          gsap.fromTo(waitingRef.current,
            { opacity: 0, scale: 0.95, y: 18 },
            { opacity: 1, scale: 1, y: 0, duration: 0.38, ease: "back.out(1.8)", clearProps: "transform" }
          )
        })
      }
    } catch (err) {
      setFlow("error")
      setErrorMsg(err?.response?.data?.message || "Could not send payment request. Try again.")
    }
  }, [order?._id, selectedMethod, setFlow])

  const handleEsewa = useCallback(async () => {
    if (!order?._id || flowStateRef.current !== "idle") return
    setFlow("esewa_redirecting")
    setErrorMsg("")
    try {
      const res = await api.post("/esewa/initiate", { orderId: order._id })
      const { formUrl, formData } = res
      const form = document.createElement("form")
      form.method = "POST"; form.action = formUrl
      Object.entries(formData).forEach(([k, v]) => {
        const inp = document.createElement("input")
        inp.type = "hidden"; inp.name = k; inp.value = v
        form.appendChild(inp)
      })
      document.body.appendChild(form)
      form.submit()
    } catch (err) {
      setFlow("error")
      setErrorMsg(err?.response?.data?.message || "eSewa initiation failed. Try again.")
    }
  }, [order?._id, setFlow])

  const handleConfirm = useCallback(() => {
    if (selectedMethod === "esewa") handleEsewa()
    else handleCashCard()
  }, [selectedMethod, handleEsewa, handleCashCard])

  const handleBack = useCallback(() => {
    if (flowState === "waiting_cashier") return
    if (flowState === "error") { setFlow("idle"); return }
    if (flowState === "idle") navigate(-1)
  }, [flowState, navigate, setFlow])

  if (!order) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: P.bg, fontFamily: FONT_BODY }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 44, marginBottom: 12 }}>🧾</p>
          <p style={{ color: P.textMuted, fontSize: 15 }}>No active order to pay for.</p>
        </div>
      </div>
    )
  }

  const tier         = loyalty?.tier ?? "none"
  const pointsToEarn = calcPoints(order.total ?? 0, tier)
  const subtotal     = order.subtotal ?? order.subTotal ?? order.total ?? 0
  const discountAmt  = order.discountAmt ?? 0
  const discountPct  = order.discountPct ?? 0
  const items        = order.items ?? []

  const btnGradEsewa = `linear-gradient(135deg, ${ESEWA.green} 0%, ${ESEWA.dark} 100%)`
  const btnGradOther = ACCENT_GRAD

  return (
    <div ref={pageRef} style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: P.bg, fontFamily: FONT_BODY }}>

      <div aria-hidden style={{
        position: "fixed", top: -80, left: "50%", transform: "translateX(-50%)",
        width: 460, height: 230,
        background: `radial-gradient(ellipse, ${activeTokens.glow} 0%, transparent 68%)`,
        pointerEvents: "none", zIndex: 0, filter: "blur(44px)", opacity: 0.5,
        transition: "background 0.55s ease",
      }} />

      <header ref={headerRef} style={{
        position: "sticky", top: 0, zIndex: 20,
        background: P.headerBg, borderBottom: `1px solid ${P.headerBorder}`,
        backdropFilter: "blur(22px) saturate(170%)", WebkitBackdropFilter: "blur(22px) saturate(170%)",
        padding: "14px 16px 12px", display: "flex", alignItems: "center", gap: 10,
      }}>
        <button onClick={handleBack} disabled={flowState === "waiting_cashier"}
          style={{ width: 36, height: 36, borderRadius: 10, background: P.pillBg, border: `1px solid ${P.pillBorder}`, display: "flex", alignItems: "center", justifyContent: "center", color: P.textMuted, cursor: flowState === "waiting_cashier" ? "not-allowed" : "pointer", opacity: flowState === "waiting_cashier" ? 0.4 : 1, transition: "opacity 0.2s" }}>
          <ChevronLeft size={18} strokeWidth={2.2} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, fontFamily: FONT_HEADING, color: P.textPrimary, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            Payment
          </h1>
          <p style={{ margin: 0, fontSize: 11, color: P.textMuted }}>
            {items.length} item{items.length !== 1 ? "s" : ""} ·{" "}
            <span style={{ color: P.accent, fontWeight: 700 }}>{BRAND.currency} {order.total ?? 0}</span>
          </p>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px 16px 140px", display: "flex", flexDirection: "column", gap: 12, position: "relative", zIndex: 1 }}>

        {/* WAITING STATE — shown on load if already billed, or after requesting */}
        {flowState === "waiting_cashier" && (
          <div ref={waitingRef} style={{
            borderRadius: 18, background: isDark ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.06)",
            border: "1.5px solid rgba(245,158,11,0.30)", padding: "18px 16px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center",
          }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(245,158,11,0.14)", display: "flex", alignItems: "center", justifyContent: "center", animation: "pp-pulse 2s ease-in-out infinite" }}>
              <Clock size={22} color="#F59E0B" strokeWidth={2} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, fontFamily: FONT_HEADING, color: P.textPrimary, letterSpacing: "-0.02em" }}>
                Waiting for Cashier
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: P.textMuted, lineHeight: 1.5 }}>
                {alreadyBilled
                  ? "Your bill was already requested. The cashier will process it shortly."
                  : <>Your <strong style={{ color: P.textSecondary, textTransform: "capitalize" }}>{selectedMethod}</strong> request was sent.</>}
              </p>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B", animation: `pp-dot 1.4s ease-in-out ${i * 0.18}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {flowState === "error" && (
          <div style={{ borderRadius: 14, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.22)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle size={17} color="#EF4444" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#EF4444" }}>Payment failed</p>
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: P.textMuted }}>{errorMsg}</p>
            </div>
            <button onClick={() => setFlow("idle")} style={{ fontSize: 11, fontWeight: 700, color: "#EF4444", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 8, padding: "4px 10px", cursor: "pointer", flexShrink: 0 }}>Retry</button>
          </div>
        )}

        {/* BILL CARD */}
        <div ref={billCardRef} style={{ borderRadius: 20, background: P.cardBg, border: `1px solid ${P.cardBorder}`, boxShadow: P.cardShadow, overflow: "hidden" }}>
          <div style={{ padding: "13px 16px 11px", borderBottom: `1px solid ${P.divider}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0, fontSize: 11, fontWeight: 700, color: P.textMuted, textTransform: "uppercase", letterSpacing: "0.12em" }}>Bill Summary</h2>
            <span style={{ fontSize: 11, fontWeight: 700, color: P.accent, background: P.accentDim, border: `1px solid ${P.accentBorder || `${P.accent}40`}`, padding: "2px 9px", borderRadius: 99, letterSpacing: "0.04em" }}>
              #{order._id?.slice(-5)?.toUpperCase() ?? "ORDER"}
            </span>
          </div>
          <div style={{ padding: "4px 16px 8px" }}>
            {items.map((item, i) => (
              <div key={i} ref={el => { itemsRef.current[i] = el }}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: i < items.length - 1 ? `1px solid ${P.divider}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span style={{ fontSize: 24, flexShrink: 0, lineHeight: 1 }}>{item.emoji ?? "🍽️"}</span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: P.textPrimary, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
                    {item.portionLabel && <p style={{ margin: 0, fontSize: 11, color: P.textMuted }}>{item.portionLabel}</p>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: P.textMuted, background: P.pillBg, border: `1px solid ${P.pillBorder}`, padding: "2px 8px", borderRadius: 99 }}>×{item.quantity}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: P.textPrimary, minWidth: 64, textAlign: "right" }}>{BRAND.currency} {(item.price ?? 0) * (item.quantity ?? 1)}</span>
                </div>
              </div>
            ))}
          </div>
          <div ref={summaryRef} style={{ borderTop: `1.5px solid ${DIVIDER_STR}`, padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 8, background: isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.018)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: P.textSecondary }}>Subtotal</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: P.textSecondary }}>{BRAND.currency} {subtotal}</span>
            </div>
            {discountAmt > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: P.success, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle2 size={12} strokeWidth={2.5} />Loyalty ({discountPct}% off)
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: P.success }}>−{BRAND.currency} {discountAmt}</span>
              </div>
            )}
            <div style={{ height: 0, borderTop: `1px dashed ${P.divider}`, margin: "2px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 17, fontWeight: 800, fontFamily: FONT_HEADING, color: P.textPrimary, letterSpacing: "-0.02em" }}>Total</span>
              <span style={{ fontSize: 24, fontWeight: 900, fontFamily: FONT_BRAND, color: P.accent, letterSpacing: "-0.04em", lineHeight: 1 }}>{BRAND.currency} {order.total ?? 0}</span>
            </div>
          </div>
        </div>

        {/* LOYALTY POINTS */}
        {pointsToEarn > 0 && (
          <div ref={pointsRef} style={{ borderRadius: 16, background: P.accentDim || `${P.accent}18`, border: `1px solid ${P.accentBorder || `${P.accent}40`}`, padding: "13px 15px", display: "flex", alignItems: "center", gap: 12, position: "relative", overflow: "hidden" }}>
            <div aria-hidden style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: 1, background: `linear-gradient(90deg, transparent, ${P.accent}, transparent)`, opacity: 0.35 }} />
            <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", border: `1px solid ${P.accentBorder || `${P.accent}40`}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⭐</div>
            <p style={{ margin: 0, fontSize: 14, color: P.textSecondary, lineHeight: 1.4 }}>
              You'll earn <PointsCounter target={pointsToEarn} font={FONT_BRAND} color={P.accent} /> loyalty points
            </p>
          </div>
        )}

        {/* PAYMENT METHODS — hidden when already waiting */}
        {flowState === "idle" && (
          <div ref={methodsRef} style={{ borderRadius: 20, background: P.cardBg, border: `1px solid ${P.cardBorder}`, boxShadow: P.cardShadow, overflow: "visible" }}>
            <div style={{ padding: "13px 16px 11px", borderBottom: `1px solid ${P.divider}`, borderRadius: "20px 20px 0 0" }}>
              <h2 style={{ margin: 0, fontSize: 11, fontWeight: 700, color: P.textMuted, textTransform: "uppercase", letterSpacing: "0.12em" }}>Pay With</h2>
            </div>
            <div style={{ padding: "14px 14px 16px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {METHODS.map((m, idx) => {
                const sel = selectedMethod === m.id
                const t   = resolveTokens(m.id, P)
                return (
                  <button key={m.id} ref={el => { methodBtnsRef.current[idx] = el }}
                    onClick={() => handleSelectMethod(m.id, idx)}
                    style={{ position: "relative", border: sel ? `2px solid ${t.green}` : `1.5px solid ${P.cardBorder}`, borderRadius: 16, padding: "14px 6px 13px", background: sel ? t.dim : (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"), cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 7, transition: "border-color 0.22s, background 0.22s, box-shadow 0.22s", boxShadow: sel ? `0 0 0 4px ${t.ring}, 0 6px 20px ${t.glow}` : "none", overflow: "visible" }}>
                    {sel && (
                      <div style={{ position: "absolute", top: -8, right: -8, zIndex: 3, width: 20, height: 20, borderRadius: "50%", background: t.green, border: `2.5px solid ${P.cardBg}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <CheckCircle2 size={10} color="#fff" strokeWidth={3} />
                      </div>
                    )}
                    <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, background: sel ? t.dim : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"), border: `1.5px solid ${sel ? t.border : P.pillBorder}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.22s, border-color 0.22s" }}>
                      <MethodIcon id={m.id} isEsewa={m.esewa} selected={sel} color={sel ? t.green : P.textSecondary} muted={P.textSecondary} fontBrand={FONT_BRAND} size={20} />
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: sel ? t.green : P.textPrimary, transition: "color 0.22s", lineHeight: 1.2 }}>{m.label}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 10, color: P.textMuted, lineHeight: 1.2 }}>{m.sub}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* STICKY FOOTER */}
      <div ref={footerRef} style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 20, background: P.headerBg, borderTop: `1px solid ${P.headerBorder}`, backdropFilter: "blur(22px) saturate(170%)", WebkitBackdropFilter: "blur(22px) saturate(170%)", padding: "11px 16px calc(14px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: activeTokens.dim, border: `1px solid ${activeTokens.border}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.3s, border-color 0.3s" }}>
              <MethodIcon id={selectedMethod} isEsewa={isEsewa} selected color={activeTokens.green} muted={P.textSecondary} fontBrand={FONT_BRAND} size={13} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: P.textSecondary, transition: "color 0.22s" }}>
              {activeMeta.label} selected
            </span>
          </div>
          {pointsToEarn > 0 && <span style={{ fontSize: 12, color: P.textMuted, fontWeight: 500 }}>+{pointsToEarn} pts</span>}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, borderRadius: 14, background: P.pillBg, border: `1px solid ${P.pillBorder}`, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 14px", minWidth: 0 }}>
            <span style={{ fontSize: 19, fontWeight: 900, fontFamily: FONT_BRAND, color: P.textPrimary, letterSpacing: "-0.04em", whiteSpace: "nowrap" }}>{BRAND.currency} {order.total ?? 0}</span>
          </div>

          <button onClick={handleConfirm} disabled={btnDisabled}
            onMouseDown={e  => { if (!btnDisabled) e.currentTarget.style.transform = "scale(0.97)" }}
            onMouseUp={e    => { e.currentTarget.style.transform = "scale(1)" }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)" }}
            style={{ flex: 2.2, borderRadius: 14, border: "none", position: "relative", overflow: "hidden", color: "#fff", fontSize: 15, fontWeight: 800, fontFamily: FONT_BRAND, letterSpacing: "-0.02em", padding: "15px 20px", cursor: btnDisabled ? "not-allowed" : "pointer", opacity: btnDisabled ? 0.62 : 1, transition: "opacity 0.15s, transform 0.1s, box-shadow 0.3s", boxShadow: `0 8px 28px ${activeTokens.glow}, 0 1px 0 rgba(255,255,255,0.18) inset`, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: isEsewa ? ESEWA.green : P.accent }}>
            <span aria-hidden style={{ position: "absolute", inset: 0, background: btnGradOther, opacity: isEsewa ? 0 : 1, transition: "opacity 0.35s ease", borderRadius: "inherit" }} />
            <span aria-hidden style={{ position: "absolute", inset: 0, background: btnGradEsewa, opacity: isEsewa ? 1 : 0, transition: "opacity 0.35s ease", borderRadius: "inherit" }} />
            <span style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 7 }}>
              {isLoading ? (
                <span style={{ width: 18, height: 18, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "pp-spin 0.75s linear infinite", flexShrink: 0, display: "inline-block" }} />
              ) : flowState === "waiting_cashier" ? (
                <><Clock size={15} style={{ flexShrink: 0 }} /> Waiting…</>
              ) : (
                <><CheckCircle2 size={16} strokeWidth={2.5} style={{ flexShrink: 0 }} /> Confirm Payment</>
              )}
            </span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pp-spin  { to { transform: rotate(360deg); } }
        @keyframes pp-pulse { 0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.1);opacity:.7} }
        @keyframes pp-dot   { 0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1} }
      `}</style>
    </div>
  )
}

export default PaymentPage