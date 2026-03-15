// src/modules/customer/pages/ItemDetailPage.jsx
// Route: /menu/item/:id
//
// REDESIGN: Luxury editorial food aesthetic
//  — Cinematic parallax hero with depth layers
//  — Staggered reveal animations, scroll-triggered sections
//  — Magnetic add-to-cart bar with spring physics
//  — Glass morphism nav with shimmer sweep
//  — Spring-animated custom selector pills
//  — Rich review cards with like burst animation
//  — Hard-refresh fix: skeleton shown when allItems.length === 0 OR menuLoading

import {
  useEffect, useRef, useCallback, useContext,
  useState, useMemo, useLayoutEffect,
} from "react"
import { createPortal }              from "react-dom"
import { useParams, useNavigate }    from "react-router-dom"
import { useDispatch, useSelector }  from "react-redux"
import gsap                          from "gsap"
import { ScrollTrigger }             from "gsap/ScrollTrigger"
import {
  ArrowLeft, Plus, Minus, Flame, Clock, Leaf,
  ChevronRight, ShoppingCart, Check, Sparkles,
  Shield, Star, ThumbsUp, Zap, ChefHat, Heart,
  Pencil, Trash2, X, Loader2, Send, RotateCcw,
} from "lucide-react"
import { Swiper, SwiperSlide }       from "swiper/react"
import { FreeMode }                  from "swiper/modules"
import "swiper/css"
import "swiper/css/free-mode"

import { addItem, selectCartItems, selectCartCount } from "@store/slices/cartSlice"
import { selectAllItems }                            from "@store/slices/menuSlice"
import { selectUser, selectIsGuest }                 from "@store/slices/authSlice"
import { selectTier }                                from "@store/slices/loyaltySlice"
import { ThemeContext }                              from "@shared/context/ThemeContext"
import CartDrawer                                    from "../components/cart/CartDrawer"
import { useLenis }                                  from "lenis/react"
import useReviews                                    from "../hooks/useReviews"

gsap.registerPlugin(ScrollTrigger)

// ─── Menu loading selector ─────────────────────────────────────────────────────
const selectMenuLoading = (s) => {
  const m = s.menu
  if (!m) return false
  if (typeof m.loading === "boolean") return m.loading
  if (m.status === "loading" || m.status === "pending") return true
  if (typeof m.isLoading === "boolean") return m.isLoading
  return false
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const SPICE_LABEL = [null, "Mild", "Medium", "Hot"]
const SPICE_COLOR = [null, "#F59E0B", "#F97316", "#EF4444"]

const STATIC_EXTRA_GROUPS = [
  {
    id: "extras", label: "Add Extras", required: false, type: "multi",
    options: [
      { id: "extra_sauce",   label: "Extra Sauce",   priceDelta: 20, emoji: "🔥" },
      { id: "extra_cheese",  label: "Extra Cheese",  priceDelta: 40, emoji: "🧀" },
      { id: "extra_topping", label: "Extra Topping", priceDelta: 30, emoji: "🥗" },
    ],
  },
  {
    id: "spice", label: "Spice Level", required: false, type: "single",
    options: [
      { id: "mild",   label: "Mild",   emoji: "😊", priceDelta: 0 },
      { id: "medium", label: "Medium", emoji: "🌶️", priceDelta: 0 },
      { id: "hot",    label: "Hot",    emoji: "🔥", priceDelta: 0 },
    ],
  },
]

const FALLBACK_SIZE_GROUP = {
  id: "size", label: "Choose Size", required: true, type: "single",
  options: [
    { id: "regular", label: "Regular", priceDelta: 0 },
    { id: "large",   label: "Large",   priceDelta: 60 },
    { id: "xl",      label: "XL",      priceDelta: 120 },
  ],
}

const LOYALTY_TIER = {
  bronze: { label: "Bronze", color: "#CD7F32", icon: "🥉", multiplier: 1 },
  silver: { label: "Silver", color: "#C0C0C0", icon: "🥈", multiplier: 1.5 },
  gold:   { label: "Gold",   color: "#FFD700", icon: "🥇", multiplier: 2 },
  none:   { label: "Member", color: "#FF9F1C", icon: "☕", multiplier: 1 },
}

const calcPoints = (total, tier) =>
  Math.floor((total / 10) * (LOYALTY_TIER[tier]?.multiplier ?? 1))

// ─── StarRow ───────────────────────────────────────────────────────────────────
const StarRow = ({ rating, size = 12 }) => (
  <span style={{ display: "inline-flex", gap: 2 }}>
    {[1,2,3,4,5].map(s => (
      <svg key={s} width={size} height={size} viewBox="0 0 24 24">
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill={s <= rating ? "#FBBF24" : "none"}
          stroke={s <= rating ? "#FBBF24" : "#44403c"}
          strokeWidth="1.5"
        />
      </svg>
    ))}
  </span>
)

// ─── StarPicker ────────────────────────────────────────────────────────────────
const StarPicker = ({ value, onChange, size = 32 }) => {
  const [hov, setHov] = useState(0)
  const active = hov || value
  return (
    <div style={{ display: "flex", gap: 8 }} onMouseLeave={() => setHov(0)}>
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button"
          onClick={() => onChange(s)} onMouseEnter={() => setHov(s)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, WebkitTapHighlightColor: "transparent" }}>
          <svg width={size} height={size} viewBox="0 0 24 24">
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={s <= active ? "#FBBF24" : "none"}
              stroke={s <= active ? "#FBBF24" : "#57534e"}
              strokeWidth="1.5"
              style={{ transition: "all 0.15s ease" }}
            />
          </svg>
        </button>
      ))}
    </div>
  )
}

// ─── CustomPill — spring-animated selector chip ────────────────────────────────
const CustomPill = ({ label, emoji, priceLabel, selected, onClick, D }) => {
  const ref = useRef(null)
  const handle = () => {
    if (ref.current) {
      gsap.timeline()
        .to(ref.current, { scale: 0.86, duration: 0.08, ease: "power2.in" })
        .to(ref.current, { scale: 1.07, duration: 0.18, ease: "back.out(4)" })
        .to(ref.current, { scale: 1,    duration: 0.2,  ease: "elastic.out(1, 0.5)" })
    }
    onClick()
  }
  return (
    <button ref={ref} onClick={handle} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "8px 14px", borderRadius: 12, cursor: "pointer",
      fontFamily: "'Baloo 2', system-ui, sans-serif",
      fontSize: 12, fontWeight: selected ? 700 : 500,
      color: selected ? "#FF9F1C" : D ? "rgba(255,255,255,0.5)" : "rgba(30,20,10,0.5)",
      background: selected
        ? D ? "rgba(255,159,28,0.14)" : "rgba(255,159,28,0.09)"
        : D ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
      border: `1.5px solid ${selected ? "rgba(255,159,28,0.5)" : D ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
      boxShadow: selected ? "0 0 20px rgba(255,159,28,0.16)" : "none",
      transition: "color 0.2s, background 0.2s, border-color 0.2s, box-shadow 0.2s",
      WebkitTapHighlightColor: "transparent", letterSpacing: "-0.01em",
    }}>
      {emoji && <span style={{ fontSize: 14 }}>{emoji}</span>}
      {label}
      {priceLabel && (
        <span style={{ fontSize: 10, fontWeight: 600, color: selected ? "#FF9F1C" : D ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.28)" }}>
          {priceLabel}
        </span>
      )}
      {selected && <Check size={10} strokeWidth={3} color="#FF9F1C" />}
    </button>
  )
}

// ─── ReviewCard ────────────────────────────────────────────────────────────────
const ReviewCard = ({ review, myReview, D, onLike, onEditStart, onDelete }) => {
  const isOwn   = myReview?._id === review._id
  const liked   = review._liked ?? false
  const likeRef = useRef(null)
  const ringRef = useRef(null)

  const handleLike = () => {
    if (likeRef.current) {
      gsap.timeline()
        .to(likeRef.current, { scale: 0.5,  duration: 0.08, ease: "power3.in" })
        .to(likeRef.current, { scale: 1.45, duration: 0.22, ease: "back.out(3.5)" })
        .to(likeRef.current, { scale: 1,    duration: 0.18, ease: "elastic.out(1, 0.5)" })
    }
    if (ringRef.current && !liked) {
      gsap.fromTo(ringRef.current,
        { scale: 0.5, opacity: 0.8 },
        { scale: 2.4, opacity: 0, duration: 0.42, ease: "power2.out" }
      )
    }
    onLike(review._id)
  }

  const initials = (review.customerName ?? "A").slice(0, 2).toUpperCase()

  return (
    <div style={{
      padding: "18px 20px", borderRadius: 18,
      background: D ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.78)",
      border: `1px solid ${D ? "rgba(255,255,255,0.06)" : "rgba(210,185,145,0.32)"}`,
      boxShadow: D
        ? "0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 24px rgba(0,0,0,0.28)"
        : "0 1px 0 rgba(255,255,255,1) inset, 0 2px 16px rgba(130,80,20,0.05)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: "#FF9F1C",
            background: D ? "rgba(255,159,28,0.14)" : "rgba(255,243,220,0.9)",
            border: `1.5px solid ${D ? "rgba(255,159,28,0.2)" : "rgba(255,200,130,0.4)"}`,
          }}>{initials}</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                {review.customerName ?? "Anonymous"}
              </span>
              {isOwn && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 6,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  color: "#FF9F1C", background: "rgba(255,159,28,0.12)",
                  border: "1px solid rgba(255,159,28,0.25)",
                }}>You</span>
              )}
            </div>
            <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, display: "block" }}>
              {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </div>
        <StarRow rating={review.rating} size={11} />
      </div>

      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: "var(--text-secondary)", fontWeight: 440 }}>
        {review.text}
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
        <button onClick={handleLike} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "none", border: "none", cursor: "pointer", padding: 0,
          position: "relative", WebkitTapHighlightColor: "transparent",
        }}>
          <div ref={ringRef} style={{
            position: "absolute", left: -5, top: -5, width: 24, height: 24, borderRadius: "50%",
            background: "rgba(255,159,28,0.3)", pointerEvents: "none", opacity: 0,
          }} />
          <span ref={likeRef} style={{ display: "flex" }}>
            <ThumbsUp size={13} strokeWidth={2}
              style={{ color: liked ? "#FF9F1C" : "var(--text-muted)", fill: liked ? "#FF9F1C" : "none", transition: "color 0.2s" }} />
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: liked ? "#FF9F1C" : "var(--text-muted)", transition: "color 0.2s" }}>
            {review.likes ?? 0} helpful
          </span>
        </button>
        {isOwn && (
          <div style={{ display: "flex", gap: 14 }}>
            <button onClick={() => onEditStart(review)} style={{
              display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600,
              color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0,
              WebkitTapHighlightColor: "transparent",
            }}>
              <Pencil size={11} strokeWidth={2} /> Edit
            </button>
            <button onClick={onDelete} style={{
              display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600,
              color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: 0,
              WebkitTapHighlightColor: "transparent",
            }}>
              <Trash2 size={11} strokeWidth={2} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ReviewForm ────────────────────────────────────────────────────────────────
const ReviewForm = ({ D, myReview, submitting, onSubmit, onCancel }) => {
  const isEdit = !!myReview
  const [rating, setRating] = useState(myReview?.rating ?? 0)
  const [text,   setText]   = useState(myReview?.text   ?? "")
  const MIN       = 10
  const canSubmit = rating > 0 && text.trim().length >= MIN && !submitting

  const handle = async () => {
    if (!canSubmit) return
    const ok = await onSubmit({ rating, text: text.trim() })
    if (ok && !isEdit) { setRating(0); setText("") }
  }

  const MOODS = ["", "😞 Poor", "😕 Fair", "😐 Okay", "😊 Good", "🤩 Excellent!"]

  return (
    <div style={{
      padding: "20px", borderRadius: 20,
      background: D
        ? "linear-gradient(135deg,rgba(255,159,28,0.07),rgba(224,92,42,0.04))"
        : "linear-gradient(135deg,rgba(255,248,235,0.95),rgba(255,235,200,0.7))",
      border: `1px solid ${D ? "rgba(255,159,28,0.18)" : "rgba(255,200,130,0.45)"}`,
      boxShadow: D ? "0 4px 32px rgba(0,0,0,0.18)" : "0 4px 24px rgba(130,80,20,0.05)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
          {isEdit ? "✏️ Edit your review" : "⭐ Write a review"}
        </span>
        {isEdit && (
          <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, WebkitTapHighlightColor: "transparent" }}>
            <X size={16} strokeWidth={2} />
          </button>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <StarPicker value={rating} onChange={setRating} />
        {rating > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, color: "#FF9F1C", marginTop: 6, display: "block" }}>
            {MOODS[rating]}
          </span>
        )}
      </div>

      <textarea rows={3} value={text} onChange={e => setText(e.target.value)}
        placeholder="Share your experience… (min 10 chars)"
        maxLength={500}
        style={{
          width: "100%", resize: "none", outline: "none", boxSizing: "border-box",
          fontFamily: "'Baloo 2', system-ui, sans-serif", fontSize: 13, lineHeight: 1.6,
          borderRadius: 14, padding: "10px 14px",
          background: D ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.9)",
          border: `1.5px solid ${D ? "rgba(255,159,28,0.18)" : "rgba(200,175,135,0.5)"}`,
          color: "var(--text-primary)", transition: "border-color 0.2s, box-shadow 0.2s",
        }}
        onFocus={e => { e.target.style.borderColor = "rgba(255,159,28,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(255,159,28,0.1)" }}
        onBlur={e  => { e.target.style.borderColor = D ? "rgba(255,159,28,0.18)" : "rgba(200,175,135,0.5)"; e.target.style.boxShadow = "none" }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        <span style={{ fontSize: 10, color: text.length < MIN ? "#ef4444" : "var(--text-muted)" }}>
          {text.length}/500{text.length > 0 && text.length < MIN && ` · ${MIN - text.length} more`}
        </span>
        <button onClick={handle} disabled={!canSubmit} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "9px 18px", borderRadius: 12, border: "none", cursor: canSubmit ? "pointer" : "not-allowed",
          fontSize: 12, fontWeight: 700,
          color: canSubmit ? "#fff" : "var(--text-muted)",
          background: canSubmit ? "linear-gradient(135deg,#FF9F1C,#E05C2A)" : D ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
          boxShadow: canSubmit ? "0 4px 16px rgba(255,130,0,0.35)" : "none",
          fontFamily: "'Baloo 2', system-ui, sans-serif",
          transition: "all 0.2s ease", WebkitTapHighlightColor: "transparent",
        }}>
          {submitting
            ? <><Loader2 size={12} strokeWidth={2.5} style={{ animation: "spin 0.7s linear infinite" }} />Saving…</>
            : <><Send size={12} strokeWidth={2.5} />{isEdit ? "Update" : "Post"}</>
          }
        </button>
      </div>
    </div>
  )
}

// ─── SimilarCard ───────────────────────────────────────────────────────────────
const SimilarCard = ({ item, navigate, dispatch, D }) => {
  const cardRef = useRef(null)
  const btnRef  = useRef(null)

  const handleAdd = useCallback(e => {
    e.stopPropagation()
    if (btnRef.current) {
      gsap.timeline()
        .to(btnRef.current, { scale: 0.7,  duration: 0.08, ease: "power3.in" })
        .to(btnRef.current, { scale: 1.32, duration: 0.2,  ease: "back.out(4)" })
        .to(btnRef.current, { scale: 1,    duration: 0.22, ease: "elastic.out(1, 0.45)" })
    }
    const hp = Array.isArray(item.portions) && item.portions.length > 0
    const dp = hp ? (item.portions.find(p => p.isDefault) ?? item.portions[0]) : null
    dispatch(addItem({
      menuItemId: item._id, name: item.name,
      price: dp ? dp.price : item.price,
      emoji: item.emoji, category: item.category,
      quantity: 1, portionId: dp?.id ?? null, portionLabel: dp?.label ?? null,
    }))
  }, [dispatch, item])

  return (
    <div ref={cardRef}
      onClick={() => navigate(`/menu/item/${item._id}`)}
      role="button" tabIndex={0}
      onKeyDown={e => e.key === "Enter" && navigate(`/menu/item/${item._id}`)}
      onTouchStart={() => gsap.to(cardRef.current, { scale: 0.96, duration: 0.1 })}
      onTouchEnd={() => gsap.to(cardRef.current, { scale: 1, duration: 0.35, ease: "back.out(2)" })}
      style={{
        borderRadius: 18, overflow: "hidden", cursor: "pointer",
        background: D ? "rgba(255,255,255,0.03)" : "#fff",
        border: `1px solid ${D ? "rgba(255,255,255,0.07)" : "rgba(210,185,145,0.38)"}`,
        boxShadow: D
          ? "0 4px 20px rgba(0,0,0,0.4)"
          : "0 2px 16px rgba(130,80,20,0.08), 0 1px 0 rgba(255,255,255,0.95) inset",
        WebkitTapHighlightColor: "transparent",
      }}>
      <div style={{
        height: 100, position: "relative", overflow: "hidden",
        background: D ? "rgba(255,159,28,0.07)" : "rgba(255,248,235,0.9)",
      }}>
        {item.image
          ? <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>{item.emoji}</div>
        }
      </div>
      <div style={{ padding: "10px 12px 14px" }}>
        <p style={{
          margin: 0, fontSize: 12, fontWeight: 700, lineHeight: 1.35,
          color: "var(--text-primary)", letterSpacing: "-0.02em",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{item.name}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: D ? "#FFB84D" : "#C8680A", letterSpacing: "-0.02em" }}>
            {Array.isArray(item.portions) && item.portions.length > 0
              ? `from Rs ${Math.min(...item.portions.map(p => p.price))}`
              : `Rs ${item.price}`}
          </span>
          <button ref={btnRef} onClick={handleAdd} aria-label={`Add ${item.name}`} style={{
            width: 28, height: 28, borderRadius: 9, border: "none", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#fff",
            background: "linear-gradient(135deg,#FF9F1C,#E05C2A)",
            boxShadow: "0 2px 12px rgba(255,130,0,0.38)",
            WebkitTapHighlightColor: "transparent",
          }}>
            <Plus size={13} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── SectionHead ───────────────────────────────────────────────────────────────
const SectionHead = ({ children, icon, noMargin }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: noMargin ? 0 : 20 }}>
    <div style={{ width: 3, height: 20, borderRadius: 2, background: "linear-gradient(180deg,#FF9F1C,#E05C2A)", flexShrink: 0 }} />
    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
      {children}
    </h2>
    {icon}
  </div>
)

// ─── Main Page ─────────────────────────────────────────────────────────────────
const ItemDetailPage = () => {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const dispatch  = useDispatch()
  const { isDark: D } = useContext(ThemeContext)
  const lenis     = useLenis()

  const allItems    = useSelector(selectAllItems)
  const cartCount   = useSelector(selectCartCount)
  const isGuest     = useSelector(selectIsGuest)
  const tier        = useSelector(selectTier)
  const menuLoading = useSelector(selectMenuLoading)

  const item    = allItems.find(i => i._id === id) ?? null
  const cafeId  = item?.cafeId?.toString() ?? ""
  const similar = allItems
    .filter(i => i._id !== id && i.category === item?.category && i.isAvailable)
    .slice(0, 8)

  const {
    reviews, summary, loading: reviewsLoading, hasMore, myReview,
    submitting, loadMore, submit, remove, like,
  } = useReviews(cafeId ? id : null, cafeId)

  const [showForm,   setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleEditStart  = r => { setEditTarget(r); setShowForm(true) }
  const handleFormCancel = () => { setEditTarget(null); setShowForm(false) }
  const handleSubmit     = async ({ rating, text }) => {
    const ok = await submit({ rating, text })
    if (ok) { setShowForm(false); setEditTarget(null) }
    return ok
  }

  // ── Portions ─────────────────────────────────────────────────────────────────
  const hasPortions    = Array.isArray(item?.portions) && item.portions.length > 0
  const defaultPortion = hasPortions ? (item.portions.find(p => p.isDefault) ?? item.portions[0]) : null

  const portionGroup = useMemo(() => {
    if (!hasPortions) return FALLBACK_SIZE_GROUP
    const sorted = [...item.portions].sort((a, b) =>
      a.sortOrder !== b.sortOrder ? a.sortOrder - b.sortOrder : a.price - b.price
    )
    return {
      id: "portion", label: "Choose Size", required: true, type: "single",
      options: sorted.map(p => ({ id: p.id, label: p.label, priceDelta: p.price - (item?.price ?? 0), _absPrice: p.price })),
    }
  }, [hasPortions, item])

  const allGroups = useMemo(() => [portionGroup, ...STATIC_EXTRA_GROUPS], [portionGroup])

  const buildDefaults = useCallback(() => {
    const d = { extras: [], spice: "mild" }
    if (hasPortions) d.portion = defaultPortion?.id ?? portionGroup.options[0]?.id
    else d.size = "regular"
    return d
  }, [hasPortions, defaultPortion, portionGroup])

  const [qty,        setQty]        = useState(1)
  const [customs,    setCustoms]    = useState(buildDefaults)
  const [addedFlash, setAddedFlash] = useState(false)
  const [wishlist,   setWishlist]   = useState(false)

  useEffect(() => { setCustoms(buildDefaults()) }, [buildDefaults])

  const selectedPortionPrice = useMemo(() => {
    if (!hasPortions) return item?.price ?? 0
    const selId   = customs.portion ?? defaultPortion?.id
    const portion = item.portions.find(p => p.id === selId)
    return portion ? portion.price : item.price
  }, [hasPortions, customs.portion, item, defaultPortion])

  const extrasPrice = useMemo(() => {
    let extra = 0
    STATIC_EXTRA_GROUPS.forEach(g => {
      if (g.type === "single") {
        const sel = g.options.find(o => o.id === customs[g.id])
        if (sel) extra += sel.priceDelta
      } else {
        ;(customs[g.id] ?? []).forEach(oid => {
          const o = g.options.find(o => o.id === oid)
          if (o) extra += o.priceDelta
        })
      }
    })
    if (!hasPortions) {
      const sz = FALLBACK_SIZE_GROUP.options.find(o => o.id === customs.size)
      if (sz) extra += sz.priceDelta
    }
    return extra
  }, [customs, hasPortions])

  const unitPrice  = selectedPortionPrice + extrasPrice
  const totalPrice = unitPrice * qty
  const points     = calcPoints(totalPrice, tier)
  const TIER       = LOYALTY_TIER[tier] ?? LOYALTY_TIER.none

  // ── Refs ──────────────────────────────────────────────────────────────────────
  const pageRef    = useRef(null)
  const navRef     = useRef(null)
  const heroRef    = useRef(null)
  const heroImgRef = useRef(null)
  const glowRef    = useRef(null)
  const shimRef    = useRef(null)
  const infoRef    = useRef(null)
  const custRef    = useRef(null)
  const reviewsRef = useRef(null)
  const simRef     = useRef(null)
  const barRef     = useRef(null)
  const btnRef     = useRef(null)
  const plusRef    = useRef(null)
  const minusRef   = useRef(null)
  const qtyRef     = useRef(null)
  const heartRef   = useRef(null)

  useLayoutEffect(() => {
    if (navRef.current)     gsap.set(navRef.current,     { y: -90, opacity: 0 })
    if (heroRef.current)    gsap.set(heroRef.current,    { opacity: 0 })
    if (heroImgRef.current) gsap.set(heroImgRef.current, { scale: 1.08 })
    if (barRef.current)     gsap.set(barRef.current,     { y: 110, opacity: 0 })
  }, [])

  useEffect(() => {
    if (!item) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const tl = gsap.timeline({ defaults: { ease: "expo.out" } })
    tl.to(navRef.current,     { y: 0, opacity: 1, duration: 0.78, ease: "back.out(1.5)" }, 0)
    tl.to(heroRef.current,    { opacity: 1, duration: 0.6, ease: "power2.out" }, 0.05)
    tl.to(heroImgRef.current, { scale: 1,   duration: 1.4, ease: "power3.out" }, 0.05)
    if (glowRef.current)
      tl.fromTo(glowRef.current,
        { opacity: 0, scale: 0.5 },
        { opacity: 1, scale: 1, duration: 1.0, ease: "power2.out" }, 0.18)
    if (shimRef.current)
      tl.fromTo(shimRef.current, { x: "-120%" }, { x: "120%", duration: 1.2, ease: "power2.inOut" }, 0.4)

    const infoKids = infoRef.current ? Array.from(infoRef.current.children) : []
    if (infoKids.length)
      tl.fromTo(infoKids,
        { y: 26, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "power2.out", clearProps: "all" },
        0.24)

    tl.to(barRef.current, { y: 0, opacity: 1, duration: 0.65, ease: "back.out(1.5)" }, 0.28)

    const ctx = gsap.context(() => {
      ;[custRef, reviewsRef, simRef].forEach(r => {
        if (!r.current) return
        gsap.fromTo(r.current,
          { y: 34, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55, ease: "power2.out",
            scrollTrigger: { trigger: r.current, start: "top 92%", once: true } })
      })
    }, pageRef)

    return () => ctx.revert()
  }, [item])

  // Parallax hero
  useEffect(() => {
    if (!item || !heroImgRef.current) return
    const st = ScrollTrigger.create({
      trigger: heroRef.current, start: "top top", end: "bottom top",
      onUpdate: self => gsap.set(heroImgRef.current, { y: self.progress * 65 }),
    })
    return () => st.kill()
  }, [item])

  const handleBack = useCallback(() => {
    gsap.to(navRef.current, {
      y: -90, opacity: 0, duration: 0.25, ease: "power3.in",
      onComplete: () => navigate(-1),
    })
  }, [navigate])

  const bumpBtn = useCallback(ref => {
    if (!ref.current) return
    gsap.timeline()
      .to(ref.current, { scale: 0.72, duration: 0.08, ease: "power3.in" })
      .to(ref.current, { scale: 1.28, duration: 0.2,  ease: "back.out(3.5)" })
      .to(ref.current, { scale: 1,    duration: 0.22, ease: "elastic.out(1, 0.45)" })
  }, [])

  const animateQty = useCallback(dir => {
    if (!qtyRef.current) return
    gsap.fromTo(qtyRef.current,
      { y: dir > 0 ? -14 : 14, opacity: 0, scale: 0.75 },
      { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2.5)" })
  }, [])

  const increaseQty = useCallback(() => { bumpBtn(plusRef);  animateQty(1);  setQty(q => q + 1) }, [bumpBtn, animateQty])
  const decreaseQty = useCallback(() => {
    if (qty <= 1) return
    bumpBtn(minusRef); animateQty(-1); setQty(q => q - 1)
  }, [qty, bumpBtn, animateQty])

  const handleSingleCustom = (gid, oid) => setCustoms(p => ({ ...p, [gid]: oid }))
  const handleMultiCustom  = (gid, oid) => setCustoms(p => {
    const cur = p[gid] ?? []
    return { ...p, [gid]: cur.includes(oid) ? cur.filter(i => i !== oid) : [...cur, oid] }
  })

  const handleAddToCart = useCallback(() => {
    if (!item) return
    if (btnRef.current) {
      gsap.timeline()
        .to(btnRef.current, { scale: 0.93, duration: 0.1,  ease: "power3.in" })
        .to(btnRef.current, { scale: 1.04, duration: 0.22, ease: "back.out(3)" })
        .to(btnRef.current, { scale: 1,    duration: 0.28, ease: "elastic.out(1, 0.45)" })
    }
    let portionId = null, portionLabel = null
    if (hasPortions) {
      const selId   = customs.portion ?? defaultPortion?.id
      const portion = item.portions.find(p => p.id === selId)
      if (portion) { portionId = portion.id; portionLabel = portion.label }
    }
    dispatch(addItem({
      menuItemId: item._id, name: item.name, price: unitPrice,
      emoji: item.emoji, category: item.category, quantity: qty,
      portionId, portionLabel, customizations: customs,
    }))
    setAddedFlash(true)
    setTimeout(() => setAddedFlash(false), 1600)
    setTimeout(() => setDrawerOpen(true), 320)
  }, [item, dispatch, qty, unitPrice, customs, hasPortions, defaultPortion])

  const toggleWishlist = useCallback(() => {
    setWishlist(v => !v)
    if (heartRef.current) {
      gsap.timeline()
        .to(heartRef.current, { scale: 0.55, duration: 0.1,  ease: "power3.in" })
        .to(heartRef.current, { scale: 1.42, duration: 0.25, ease: "back.out(3)" })
        .to(heartRef.current, { scale: 1,    duration: 0.22, ease: "elastic.out(1.2, 0.5)" })
    }
  }, [])

  // ── SKELETON ───────────────────────────────────────────────────────────────────
  if (!item && (menuLoading || allItems.length === 0)) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-app)", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 20px" }}>
        <style>{`@keyframes idp-pulse{0%,100%{opacity:1}50%{opacity:0.42}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: "100%", maxWidth: 480, paddingTop: "max(80px, calc(env(safe-area-inset-top,0px) + 72px))" }}>
          <div style={{ width: "100%", height: 280, borderRadius: 24, marginBottom: 22,
            background: D ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)", animation: "idp-pulse 1.6s ease-in-out infinite" }} />
          <div style={{ height: 28, borderRadius: 10, width: "70%", marginBottom: 12,
            background: D ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)", animation: "idp-pulse 1.6s 0.1s ease-in-out infinite" }} />
          <div style={{ height: 16, borderRadius: 8, width: "45%", marginBottom: 20,
            background: D ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)", animation: "idp-pulse 1.6s 0.2s ease-in-out infinite" }} />
          <div style={{ display: "flex", gap: 8 }}>
            {[60, 80, 70].map((w, i) => (
              <div key={i} style={{ height: 28, borderRadius: 20, width: w,
                background: D ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)",
                animation: `idp-pulse 1.6s ${i * 0.1}s ease-in-out infinite` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── 404 ────────────────────────────────────────────────────────────────────────
  if (!item) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-app)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{ fontSize: 64 }}>🍽️</span>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.04em" }}>Item not found</p>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>This dish may no longer be available</p>
        <button onClick={() => navigate("/menu")} style={{
          marginTop: 8, padding: "12px 28px", borderRadius: 14, border: "none",
          cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#fff",
          background: "linear-gradient(135deg,#FF9F1C,#E05C2A)",
          boxShadow: "0 4px 20px rgba(255,130,0,0.4)",
          fontFamily: "'Baloo 2', system-ui, sans-serif",
        }}>Back to Menu</button>
      </div>
    )
  }

  const isBest = item.tags?.includes("bestseller")
  const isNew  = item.tags?.includes("new")

  return (
    <div ref={pageRef} style={{
      position: "relative", minHeight: "100vh",
      background: D
        ? "radial-gradient(ellipse 90% 45% at 50% 0%, rgba(255,140,20,0.07) 0%, transparent 55%), var(--bg-app)"
        : "radial-gradient(ellipse 90% 45% at 50% 0%, rgba(255,220,150,0.16) 0%, transparent 55%), var(--bg-app)",
      paddingBottom: "calc(116px + env(safe-area-inset-bottom, 0px))",
      fontFamily: "'Baloo 2', system-ui, sans-serif",
    }}>

      {/* ══ NAV (portal) ══ */}
      {createPortal(
        <div ref={navRef} style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          display: "flex", justifyContent: "center", padding: "0 16px",
          paddingTop: "max(14px, calc(env(safe-area-inset-top,0px) + 10px))",
          pointerEvents: "none",
        }}>
          {/* ambient glow */}
          <div ref={glowRef} aria-hidden style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)",
            top: "max(6px, calc(env(safe-area-inset-top,0px) + 2px))",
            width: 380, height: 100, borderRadius: "50%",
            background: D
              ? "radial-gradient(ellipse, rgba(255,140,20,0.28) 0%, transparent 68%)"
              : "radial-gradient(ellipse, rgba(255,159,28,0.2) 0%, transparent 68%)",
            filter: "blur(22px)", pointerEvents: "none", opacity: 0,
          }} />

          <div style={{
            pointerEvents: "auto", position: "relative",
            width: "100%", maxWidth: 480, overflow: "hidden",
            borderRadius: 28, padding: "10px 14px",
            background: D ? "rgba(8,4,1,0.85)" : "rgba(255,252,244,0.85)",
            backdropFilter: "blur(52px) saturate(210%)",
            WebkitBackdropFilter: "blur(52px) saturate(210%)",
            border: D ? "1px solid rgba(255,159,28,0.15)" : "1px solid rgba(255,255,255,0.88)",
            boxShadow: D
              ? "0 1px 0 rgba(255,255,255,0.07) inset, 0 24px 64px rgba(0,0,0,0.72)"
              : "0 1px 0 rgba(255,255,255,1) inset, 0 20px 52px rgba(130,80,20,0.13)",
          }}>
            {/* shimmer */}
            <div ref={shimRef} aria-hidden style={{
              position: "absolute", top: 0, bottom: 0, left: 0, width: "40%",
              pointerEvents: "none", zIndex: 1, transform: "translateX(-120%)",
              background: D
                ? "linear-gradient(105deg,transparent,rgba(255,255,255,0.07) 50%,transparent)"
                : "linear-gradient(105deg,transparent,rgba(255,255,255,0.3) 50%,transparent)",
            }} />
            {/* bottom line */}
            <div aria-hidden style={{
              position: "absolute", bottom: 0, left: "12%", right: "12%", height: 1, pointerEvents: "none",
              background: "linear-gradient(90deg,transparent,#FF9F1C 28%,#FFD580 50%,#E05C2A 72%,transparent)",
              opacity: D ? 0.48 : 0.38,
            }} />

            <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={handleBack} aria-label="Back" style={{
                width: 38, height: 38, borderRadius: 12, border: "none", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: D ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.65)",
                boxShadow: D ? "none" : "0 1px 0 rgba(255,255,255,1) inset",
                color: "var(--text-secondary)", cursor: "pointer", WebkitTapHighlightColor: "transparent",
              }}>
                <ArrowLeft size={17} strokeWidth={2} />
              </button>

              <div style={{ flex: 1, textAlign: "center", overflow: "hidden" }}>
                <p style={{
                  margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: "-0.03em",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  background: D
                    ? "linear-gradient(118deg,#FFE0A0,#FF9F1C 55%,#E05C2A)"
                    : "linear-gradient(118deg,#C8680A,#E05C2A)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}>{item.name}</p>
                <p style={{ margin: 0, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginTop: 1 }}>
                  {item.category?.replace(/_/g, " ")}
                </p>
              </div>

              <button ref={heartRef} onClick={toggleWishlist} aria-label="Wishlist" style={{
                width: 38, height: 38, borderRadius: 12, border: "none", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: wishlist
                  ? D ? "rgba(255,80,80,0.18)" : "rgba(255,80,80,0.1)"
                  : D ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.65)",
                color: wishlist ? "#ef4444" : "var(--text-secondary)",
                cursor: "pointer", WebkitTapHighlightColor: "transparent",
                transition: "background 0.2s, color 0.2s",
              }}>
                <Heart size={16} strokeWidth={2} fill={wishlist ? "#ef4444" : "none"} />
              </button>

              <div onClick={() => cartCount > 0 && setDrawerOpen(true)} style={{
                width: 38, height: 38, borderRadius: 12, position: "relative",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: cartCount > 0
                  ? D ? "rgba(255,159,28,0.16)" : "rgba(255,159,28,0.1)"
                  : D ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.65)",
                color: cartCount > 0 ? "#FF9F1C" : "var(--text-secondary)",
                cursor: cartCount > 0 ? "pointer" : "default",
                transition: "background 0.2s",
              }}>
                <ShoppingCart size={16} strokeWidth={1.9} />
                {cartCount > 0 && (
                  <span style={{
                    position: "absolute", top: -6, right: -6,
                    width: 16, height: 16, borderRadius: "50%",
                    background: "linear-gradient(135deg,#FF9F1C,#E05C2A)",
                    color: "#fff", fontSize: 9, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "2px solid var(--bg-app)",
                  }}>{cartCount}</span>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ══ HERO ══ */}
      <div ref={heroRef} style={{
        position: "relative", width: "100%", overflow: "hidden",
        height: "clamp(260px, 44vw, 360px)",
        marginTop: "max(72px, calc(env(safe-area-inset-top,0px) + 68px))",
      }}>
        <div ref={heroImgRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "110%" }}>
          {item.image
            ? <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{
                width: "100%", height: "100%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 100,
                background: D
                  ? "radial-gradient(ellipse at 50% 55%, rgba(255,159,28,0.13), rgba(8,4,1,0.97))"
                  : "radial-gradient(ellipse at 50% 55%, rgba(255,235,180,0.45), rgba(255,252,244,0.97))",
              }}>{item.emoji}</div>
          }
        </div>
        {/* fade to page bg */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(to top, var(--bg-app) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)",
        }} />
        {/* badges */}
        <div style={{ position: "absolute", top: 16, left: 16, display: "flex", gap: 6 }}>
          {isBest && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "5px 10px", borderRadius: 10, fontSize: 10, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: "0.05em",
              color: "#fff", background: "linear-gradient(135deg,#FF9F1C,#E05C2A)",
              boxShadow: "0 4px 16px rgba(255,130,0,0.45)",
            }}>
              <Flame size={9} strokeWidth={3} />Bestseller
            </span>
          )}
          {isNew && (
            <span style={{
              padding: "5px 10px", borderRadius: 10, fontSize: 10, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: "0.05em",
              color: "#fff", background: "linear-gradient(135deg,#22c55e,#16a34a)",
            }}>New</span>
          )}
        </div>
        {/* veg indicator */}
        <div style={{
          position: "absolute", top: 16, right: 16,
          width: 28, height: 28, borderRadius: 9,
          background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)",
          border: `2px solid ${item.isVeg ? "#22c55e" : "#ef4444"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: item.isVeg ? "#22c55e" : "#ef4444" }} />
        </div>
        {/* rating pill */}
        {summary && (
          <div style={{
            position: "absolute", bottom: 16, right: 16,
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 20,
            background: D ? "rgba(8,4,1,0.78)" : "rgba(255,252,244,0.9)",
            backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            border: D ? "1px solid rgba(255,159,28,0.18)" : "1px solid rgba(255,255,255,0.88)",
          }}>
            <StarRow rating={Math.round(summary.avg)} size={11} />
            <span style={{ fontSize: 13, fontWeight: 800, color: D ? "#FFB84D" : "#C8680A", letterSpacing: "-0.02em" }}>{summary.avg}</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>({summary.total})</span>
          </div>
        )}
      </div>

      {/* ══ INFO ══ */}
      <div ref={infoRef} style={{ padding: "22px 20px 0" }}>
        {/* name + price */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <h1 style={{
            margin: 0, flex: 1, lineHeight: 1.15, letterSpacing: "-0.04em",
            fontSize: "clamp(22px, 5.5vw, 28px)", fontWeight: 900,
            color: "var(--text-primary)",
          }}>{item.name}</h1>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{
              margin: 0, fontWeight: 900, letterSpacing: "-0.04em",
              fontSize: "clamp(20px, 5vw, 26px)",
              background: D
                ? "linear-gradient(135deg,#FFE0A0,#E05C2A)"
                : "linear-gradient(135deg,#C8680A,#E05C2A)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              {hasPortions
                ? `from Rs ${Math.min(...item.portions.map(p => p.price))}`
                : `Rs ${item.price}`}
            </p>
            {extrasPrice > 0 && (
              <p style={{ margin: "2px 0 0", fontSize: 10, fontWeight: 600, color: "var(--text-muted)" }}>+Rs {extrasPrice} extras</p>
            )}
          </div>
        </div>

        {/* meta chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {[
            { icon: <Clock size={10} strokeWidth={2} style={{ color: "#FF9F1C" }} />,      label: `${item.preparationTimeMinutes ?? 10} min` },
            item.spiceLevel > 0 && { icon: <Flame size={10} strokeWidth={2.5} style={{ color: SPICE_COLOR[item.spiceLevel] }} />, label: SPICE_LABEL[item.spiceLevel] },
            { icon: <Leaf size={10}  strokeWidth={2.5} style={{ color: item.isVeg ? "#22c55e" : "#ef4444" }} />, label: item.isVeg ? "Veg" : "Non-Veg" },
            summary && { icon: <Star size={10} strokeWidth={2.5} fill="#FBBF24" stroke="#FBBF24" />, label: `${summary.avg} · ${summary.total} reviews`, accent: true },
            hasPortions && { icon: <ChefHat size={10} strokeWidth={2} style={{ color: "var(--text-muted)" }} />, label: `${item.portions.length} sizes` },
          ].filter(Boolean).map((c, i) => (
            <span key={i} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "5px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
              color: c.accent ? "#FF9F1C" : "var(--text-secondary)",
              background: c.accent
                ? D ? "rgba(255,159,28,0.11)" : "rgba(255,159,28,0.07)"
                : D ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.72)",
              border: `1px solid ${c.accent ? "rgba(255,159,28,0.28)" : D ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.88)"}`,
            }}>
              {c.icon}{c.label}
            </span>
          ))}
        </div>

        {/* description */}
        {item.description && (
          <p style={{ margin: "14px 0 0", fontSize: 13.5, lineHeight: 1.7, color: "var(--text-secondary)", fontWeight: 440 }}>
            {item.description}
          </p>
        )}

        {/* allergens */}
        {item.allergens?.length > 0 && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            marginTop: 14, padding: "12px 14px", borderRadius: 14,
            background: D ? "rgba(245,158,11,0.07)" : "rgba(254,243,199,0.8)",
            border: `1px solid ${D ? "rgba(245,158,11,0.18)" : "rgba(251,191,36,0.28)"}`,
          }}>
            <Shield size={13} style={{ color: "#F59E0B", marginTop: 1, flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, lineHeight: 1.5, color: D ? "#FBD34D" : "#92400E" }}>
              Contains: {item.allergens.join(", ")}
            </p>
          </div>
        )}
      </div>

      {/* ══ LOYALTY ══ */}
      {!isGuest && points > 0 && (
        <div style={{ padding: "20px 20px 0" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "14px 16px", borderRadius: 18,
            background: D
              ? "linear-gradient(135deg,rgba(255,159,28,0.08),rgba(224,92,42,0.05))"
              : "linear-gradient(135deg,rgba(255,248,235,0.95),rgba(255,235,200,0.7))",
            border: `1px solid ${D ? "rgba(255,159,28,0.2)" : "rgba(255,200,130,0.48)"}`,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 13, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              background: `${TIER.color}20`, border: `1.5px solid ${TIER.color}35`,
            }}>{TIER.icon}</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TIER.color }}>{TIER.label} Reward</p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>Add to cart to earn</p>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "7px 12px", borderRadius: 11,
              background: `${TIER.color}18`, border: `1.5px solid ${TIER.color}3a`,
            }}>
              <Zap size={13} strokeWidth={2.5} style={{ color: TIER.color }} />
              <span style={{ fontSize: 16, fontWeight: 900, color: TIER.color, fontVariantNumeric: "tabular-nums" }}>+{points}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: TIER.color, opacity: 0.7 }}>pts</span>
            </div>
          </div>
        </div>
      )}

      {/* ══ CUSTOMISE ══ */}
      <div ref={custRef} style={{ padding: "28px 20px 0" }}>
        <SectionHead icon={<Sparkles size={14} style={{ color: "#FF9F1C" }} />}>Customize</SectionHead>

        {allGroups.map(group => (
          <div key={group.id} style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-primary)" }}>
                {group.label}
              </span>
              {group.required
                ? <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 6, textTransform: "uppercase", letterSpacing: "0.06em", color: "#FF9F1C", background: "rgba(255,159,28,0.1)", border: "1px solid rgba(255,159,28,0.22)" }}>Required</span>
                : <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 6, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", border: `1px solid ${D ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}` }}>Optional</span>
              }
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {group.options.map(opt => {
                const selected = group.type === "single"
                  ? customs[group.id] === opt.id
                  : (customs[group.id] ?? []).includes(opt.id)
                const priceLabel = group.id === "portion" && opt._absPrice != null
                  ? `Rs ${opt._absPrice}`
                  : opt.priceDelta > 0 ? `+${opt.priceDelta}` : null
                return (
                  <CustomPill key={opt.id}
                    label={opt.label} emoji={opt.emoji}
                    priceLabel={priceLabel} selected={selected} D={D}
                    onClick={() => group.type === "single"
                      ? handleSingleCustom(group.id, opt.id)
                      : handleMultiCustom(group.id, opt.id)
                    }
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ══ REVIEWS ══ */}
      <div ref={reviewsRef} style={{ padding: "28px 20px 0" }}>
        <SectionHead icon={<Star size={14} fill="#FBBF24" stroke="#FBBF24" />}>Ratings & Reviews</SectionHead>

        {/* summary panel */}
        {summary && (
          <div style={{
            display: "flex", gap: 20, padding: "18px 20px", borderRadius: 20, marginBottom: 20,
            background: D ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.78)",
            border: `1px solid ${D ? "rgba(255,255,255,0.06)" : "rgba(210,185,145,0.32)"}`,
            boxShadow: D
              ? "0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 24px rgba(0,0,0,0.28)"
              : "0 1px 0 rgba(255,255,255,1) inset, 0 2px 16px rgba(130,80,20,0.05)",
          }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, width: 72 }}>
              <span style={{
                fontSize: 46, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.05em",
                background: "linear-gradient(135deg,#FBBF24,#F97316)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>{summary.avg || "—"}</span>
              <StarRow rating={Math.round(summary.avg)} size={12} />
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginTop: 4 }}>{summary.total} reviews</span>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, justifyContent: "center" }}>
              {(summary.dist ?? [0,0,0,0,0]).map((count, i) => {
                const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, width: 8, color: "var(--text-muted)", textAlign: "right", flexShrink: 0 }}>{5 - i}</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, overflow: "hidden", background: D ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }}>
                      <div style={{
                        height: "100%", borderRadius: 3, width: `${pct}%`,
                        background: i === 0 ? "linear-gradient(90deg,#FBBF24,#F97316)" : i <= 1 ? "#FBBF24" : D ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)",
                        transition: "width 0.9s ease",
                      }} />
                    </div>
                    <span style={{ fontSize: 9, width: 24, color: "var(--text-muted)", flexShrink: 0 }}>{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* write review */}
        {!isGuest && !showForm && (
          <button onClick={() => { setEditTarget(null); setShowForm(true) }} style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "13px 20px", borderRadius: 14, border: myReview ? "1px solid rgba(255,159,28,0.28)" : "none",
            cursor: "pointer", marginBottom: 16, fontSize: 13, fontWeight: 700,
            color: myReview ? "#FF9F1C" : "#fff",
            background: myReview
              ? D ? "rgba(255,159,28,0.07)" : "rgba(255,159,28,0.05)"
              : "linear-gradient(135deg,#FF9F1C,#E05C2A)",
            boxShadow: myReview ? "none" : "0 4px 20px rgba(255,130,0,0.35)",
            fontFamily: "'Baloo 2', system-ui, sans-serif",
            WebkitTapHighlightColor: "transparent",
          }}>
            {myReview
              ? <><RotateCcw size={14} strokeWidth={2.5} />Update my review</>
              : <><Pencil size={14} strokeWidth={2.5} />Write a Review</>
            }
          </button>
        )}

        {showForm && (
          <div style={{ marginBottom: 16 }}>
            <ReviewForm D={D} myReview={editTarget ?? myReview} submitting={submitting}
              onSubmit={handleSubmit} onCancel={handleFormCancel} />
          </div>
        )}

        {isGuest && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "14px 16px", borderRadius: 16, marginBottom: 16,
            background: D ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.68)",
            border: `1px solid ${D ? "rgba(255,255,255,0.06)" : "rgba(210,185,145,0.32)"}`,
          }}>
            <span style={{ fontSize: 26 }}>🔐</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>Sign in to review</p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Share your experience with others</p>
            </div>
            <button onClick={() => navigate("/login")} style={{
              padding: "8px 14px", borderRadius: 11, border: "none", cursor: "pointer",
              fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0,
              background: "linear-gradient(135deg,#FF9F1C,#E05C2A)",
              fontFamily: "'Baloo 2', system-ui, sans-serif",
              WebkitTapHighlightColor: "transparent",
            }}>Sign in</button>
          </div>
        )}

        {reviewsLoading && reviews.length === 0
          ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 10 }}>
              <Loader2 size={20} strokeWidth={2} style={{ animation: "spin 0.7s linear infinite", color: "#FF9F1C" }} />
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading reviews…</span>
            </div>
          : reviews.length === 0
          ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "36px 0", gap: 8 }}>
              <span style={{ fontSize: 40 }}>💬</span>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>No reviews yet</p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>Be the first to share your experience!</p>
            </div>
          : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {reviews.map(review => (
                <ReviewCard key={review._id} review={review} myReview={myReview} D={D}
                  onLike={like} onEditStart={handleEditStart} onDelete={remove} />
              ))}
            </div>
        }

        {hasMore && (
          <button onClick={loadMore} disabled={reviewsLoading} style={{
            width: "100%", marginTop: 12, padding: "12px 20px", borderRadius: 14,
            border: `1px solid ${D ? "rgba(255,255,255,0.08)" : "rgba(210,185,145,0.32)"}`,
            background: D ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.68)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontSize: 13, fontWeight: 700, color: "#FF9F1C",
            fontFamily: "'Baloo 2', system-ui, sans-serif",
            WebkitTapHighlightColor: "transparent",
          }}>
            {reviewsLoading
              ? <><Loader2 size={14} strokeWidth={2} style={{ animation: "spin 0.7s linear infinite" }} />Loading…</>
              : <>Load more reviews <ChevronRight size={14} strokeWidth={2.5} /></>
            }
          </button>
        )}
      </div>

      {/* ══ SIMILAR ══ */}
      {similar.length > 0 && (
        <div ref={simRef} style={{ marginTop: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px 4px" }}>
            <SectionHead noMargin>You Might Also Like</SectionHead>
            <button onClick={() => navigate("/menu")} style={{
              display: "flex", alignItems: "center", gap: 3,
              fontSize: 11, fontWeight: 700, color: "#FF9F1C",
              background: "none", border: "none", cursor: "pointer", padding: 0,
              fontFamily: "'Baloo 2', system-ui, sans-serif",
              WebkitTapHighlightColor: "transparent",
            }}>See all <ChevronRight size={12} strokeWidth={2.5} /></button>
          </div>
          <div style={{ height: 16 }} />
          <Swiper
            modules={[FreeMode]}
            freeMode={{ enabled: true, momentum: true, momentumRatio: 0.6 }}
            slidesPerView="auto" spaceBetween={12}
            slidesOffsetBefore={20} slidesOffsetAfter={20}
          >
            {similar.map(sim => (
              <SwiperSlide key={sim._id} style={{ width: 152 }}>
                <SimilarCard item={sim} navigate={navigate} dispatch={dispatch} D={D} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}

      {/* ══ STICKY BAR (portal) ══ */}
      {createPortal(
        <div ref={barRef} style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          zIndex: 40, width: "100%", maxWidth: 480,
          padding: "12px 16px",
          paddingBottom: "max(16px, calc(env(safe-area-inset-bottom,0px) + 12px))",
          background: D ? "rgba(6,3,1,0.9)" : "rgba(255,252,244,0.93)",
          backdropFilter: "blur(38px) saturate(210%)",
          WebkitBackdropFilter: "blur(38px) saturate(210%)",
          borderTop: D ? "1px solid rgba(255,159,28,0.12)" : "1px solid rgba(255,255,255,0.92)",
          boxShadow: D ? "0 -14px 40px rgba(0,0,0,0.65)" : "0 -8px 32px rgba(130,80,20,0.08)",
        }}>
          {hasPortions && customs.portion && (
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)" }}>
                {item.portions.find(p => p.id === customs.portion)?.label ?? ""} · Rs {selectedPortionPrice}
              </span>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* stepper */}
            <div style={{
              display: "flex", alignItems: "center", borderRadius: 14, overflow: "hidden",
              background: D ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.72)",
              border: `1.5px solid ${D ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)"}`,
            }}>
              <button ref={minusRef} onClick={decreaseQty} disabled={qty <= 1} aria-label="Decrease" style={{
                width: 44, height: 48, border: "none", background: "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: qty > 1 ? "var(--text-primary)" : "var(--text-muted)",
                cursor: qty > 1 ? "pointer" : "not-allowed", WebkitTapHighlightColor: "transparent",
              }}>
                <Minus size={15} strokeWidth={2.5} />
              </button>
              <div style={{
                width: 36, height: 48, display: "flex", alignItems: "center", justifyContent: "center",
                borderLeft:  `1px solid ${D ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
                borderRight: `1px solid ${D ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
              }}>
                <span ref={qtyRef} style={{
                  display: "block", fontSize: 17, fontWeight: 900,
                  color: "var(--text-primary)", fontVariantNumeric: "tabular-nums",
                }}>{qty}</span>
              </div>
              <button ref={plusRef} onClick={increaseQty} aria-label="Increase" style={{
                width: 44, height: 48, border: "none", background: "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-primary)", cursor: "pointer", WebkitTapHighlightColor: "transparent",
              }}>
                <Plus size={15} strokeWidth={2.5} />
              </button>
            </div>

            {/* add to cart */}
            <button ref={btnRef} onClick={handleAddToCart}
              aria-label={`Add ${qty} ${item.name} to cart`}
              style={{
                flex: 1, height: 48, borderRadius: 14, border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                color: "#fff", fontSize: 14, fontWeight: 800, letterSpacing: "-0.02em",
                fontFamily: "'Baloo 2', system-ui, sans-serif",
                position: "relative", overflow: "hidden",
                background: addedFlash
                  ? "linear-gradient(135deg,#22c55e,#16a34a)"
                  : "linear-gradient(135deg,#FF9F1C 0%,#F07A18 45%,#E05C2A 100%)",
                boxShadow: addedFlash
                  ? "0 4px 24px rgba(34,197,94,0.45)"
                  : "0 4px 24px rgba(255,130,0,0.42)",
                transition: "background 0.3s ease, box-shadow 0.3s ease",
                WebkitTapHighlightColor: "transparent",
              }}>
              {/* sliding shine */}
              {!addedFlash && (
                <div aria-hidden style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  background: "linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.14) 50%,transparent 65%)",
                  backgroundSize: "200% 100%",
                  animation: "btn-shine 2.6s ease-in-out infinite",
                }} />
              )}
              {addedFlash
                ? <><Check size={17} strokeWidth={3} />Added! Opening cart…</>
                : <><ShoppingCart size={16} strokeWidth={2} />Add to Cart · Rs {totalPrice}</>
              }
            </button>
          </div>
        </div>,
        document.body
      )}

      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} lenis={lenis} />

      <style>{`
        @keyframes spin     { to { transform: rotate(360deg); } }
        @keyframes idp-pulse{ 0%,100%{opacity:1} 50%{opacity:0.42} }
        @keyframes btn-shine{
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  )
}

export default ItemDetailPage