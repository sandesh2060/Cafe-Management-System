// frontend/src/modules/customer/components/menu/CustomersSection.jsx
//
// PATCH v2:
// ✅ 'mutual' → 'friends' normalized throughout
// ✅ blocked_by users hidden from discovery strip
// ✅ FollowBtn: 'friends' status now shows correctly (was checking 'mutual' which never matched)
// ✅ stripUsers filter: hides 'blocked', 'blocked_by', 'friends', 'following', 'pending'
//    Shows: 'none' (discover) + 'requested_me' (they follow me, I haven't followed back)

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useDispatch, useSelector }  from "react-redux"
import { useNavigate }               from "react-router-dom"
import {
  fetchCustomers, sendFollowRequest, acceptFollowRequest,
  declineFollowRequest, unfollowUser,
  selectCustomers, selectFollowLoading, selectPendingRequests,
  selectStatusMap, selectOnlineUsers, fetchPendingRequests,
} from "@store/slices/followSlice"
import { selectRecentChats }         from "@store/slices/socialChatSlice"
import { selectUser }                from "@store/slices/authSlice"
import { FONTS }                     from "@shared/config/brand"

// ── Avatar colors ─────────────────────────────────────────────────────────────
const AVATAR_COLORS = ["#92400E","#065F46","#1E40AF","#6D28D9","#9D174D","#B45309","#0E7490","#166534"]
const avatarBg = (n = "") => AVATAR_COLORS[(n.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]
const getAvatar = u =>
  u?.avatar || u?.avatarUrl || u?.profileImage || u?.profilePic ||
  u?.photo  || u?.picture   || u?.image        || u?.photoURL   || null

// ── Tier ring definitions ─────────────────────────────────────────────────────
const TIER_RING = {
  gold: {
    outer:   "conic-gradient(from 0deg,#B7860B,#F5C842,#FDE68A,#F5C842,#B7860B,#E8A000,#F5C842,#B7860B)",
    shimmer: "conic-gradient(from 0deg,transparent 55%,rgba(255,255,255,0.55) 72%,transparent 88%)",
    glow:    "0 0 0 1px rgba(245,200,66,0.60), 0 0 14px rgba(245,200,66,0.45)",
    spinMs:  3200, shimMs:1800, width:3.5,
  },
  silver: {
    outer:   "conic-gradient(from 0deg,#94A3B8,#CBD5E1,#F1F5F9,#E2E8F0,#94A3B8,#CBD5E1,#94A3B8)",
    shimmer: "conic-gradient(from 0deg,transparent 50%,rgba(255,255,255,0.70) 68%,transparent 84%)",
    glow:    "0 0 0 1px rgba(148,163,184,0.50), 0 0 12px rgba(148,163,184,0.35)",
    spinMs:  4000, shimMs:2200, width:3,
  },
  bronze: {
    outer:   "conic-gradient(from 0deg,#8B4513,#CD7F32,#E8A96A,#F5C38A,#CD7F32,#A0522D,#CD7F32,#8B4513)",
    shimmer: "conic-gradient(from 0deg,transparent 58%,rgba(255,220,160,0.55) 74%,transparent 90%)",
    glow:    "0 0 0 1px rgba(205,127,50,0.55), 0 0 12px rgba(205,127,50,0.40)",
    spinMs:  4500, shimMs:2600, width:3,
  },
  none: { outer:null, shimmer:null, glow:null, spinMs:0, shimMs:0, width:0 },
}

const computeScore = (me, c) => {
  if (!me) return 0
  let s = 0
  const myH = new Set(me.hobbies ?? me.interests ?? []), thH = c.hobbies ?? c.interests ?? []
  if (myH.size && thH.length) s += (thH.filter(h => myH.has(h)).length / Math.max(myH.size, thH.length)) * 40
  const myC = new Set(me.favoriteCategories ?? []), thC = c.favoriteCategories ?? []
  if (myC.size && thC.length) s += (thC.filter(x => myC.has(x)).length / Math.max(myC.size, thC.length)) * 35
  const v = c.visitCount ?? c.orderHistory?.length ?? 0
  if (v > 0) s += Math.min(Math.log2(v + 1) / Math.log2(51), 1) * 25
  return s
}

// Particle burst
const PARTICLES = Array.from({ length:8 }, (_, i) => {
  const rad = (360 / 8 * i * Math.PI) / 180, dist = 24 + (i % 3) * 8
  return { tx:+(Math.cos(rad)*dist).toFixed(2), ty:+(Math.sin(rad)*dist).toFixed(2), size:3+(i%2)*2.5, color:i%2===0?"#FF9F1C":"#FFB84D", delay:i*18 }
})
const BURST_KF = PARTICLES.map((p, i) =>
  `@keyframes cs-burst-${i}{0%{transform:translate(-50%,-50%) scale(1.2);opacity:1}100%{transform:translate(calc(-50% + ${p.tx}px),calc(-50% + ${p.ty}px)) scale(0);opacity:0}}`
).join("")

const STYLES = `
  ${BURST_KF}
  @keyframes cs-ring-gold{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes cs-ring-silver{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes cs-ring-bronze{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes cs-shimmer{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes cs-online-pulse{0%{transform:scale(1);opacity:.70}70%{transform:scale(2.6);opacity:0}100%{opacity:0}}
  @keyframes cs-fadein{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}
  @keyframes cs-badge-pop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.25)}100%{transform:scale(1);opacity:1}}
  @keyframes cs-btn-press{0%{transform:scale(1)}40%{transform:scale(0.82)}70%{transform:scale(1.06)}100%{transform:scale(1)}}
  @keyframes cs-sent-in{0%{opacity:0;transform:scale(0.70)}55%{opacity:1;transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
  @keyframes cs-sent-out{0%{opacity:1;transform:scale(1) translateY(0)}20%{opacity:0.95;transform:scale(1.02) translateY(-1px)}60%{opacity:0.5;transform:scale(0.92) translateY(2px)}100%{opacity:0;transform:scale(0.80) translateY(6px)}}
  @keyframes cs-chat-badge{0%{transform:scale(0) rotate(-12deg);opacity:0}55%{transform:scale(1.22) rotate(4deg)}80%{transform:scale(0.94) rotate(-2deg)}100%{transform:scale(1) rotate(0deg);opacity:1}}
  .cs-scroll::-webkit-scrollbar{display:none}
`

// ── Avatar with tier ring ─────────────────────────────────────────────────────
const Avatar = ({ user, size = 54, online = false }) => {
  const url      = getAvatar(user)
  const initials = (user?.name || "?").slice(0, 2).toUpperCase()
  const bg       = avatarBg(user?.name)
  const tier     = (user?.loyaltyTier ?? "none").toLowerCase()
  const ring     = TIER_RING[tier] ?? TIER_RING.none
  const hasRing  = !!ring.outer
  const pad      = hasRing ? ring.width + 2.5 : 0
  const outer    = size + pad * 2

  return (
    <div style={{ position:"relative", width:outer, height:outer, flexShrink:0 }}>
      {hasRing && (
        <>
          <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:ring.outer, animation:`cs-ring-${tier} ${ring.spinMs}ms linear infinite`, boxShadow:ring.glow }}/>
          <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:ring.shimmer, animation:`cs-shimmer ${ring.shimMs}ms linear infinite`, pointerEvents:"none" }}/>
          <div style={{ position:"absolute", inset:ring.width+1, borderRadius:"50%", background:"var(--modal-bg)" }}/>
        </>
      )}
      <div style={{ position:"absolute", inset:hasRing ? ring.width+3 : 0, borderRadius:"50%", overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,0.20)" }}>
        {url && (
          <img src={url} alt={user?.name ?? ""} loading="lazy" decoding="async"
            style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
            onError={e => { e.currentTarget.style.display="none"; if(e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display="flex" }}/>
        )}
        <div style={{ width:"100%", height:"100%", borderRadius:"50%", background:`linear-gradient(135deg,${bg},${bg}bb)`, display:url?"none":"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:size*0.30, fontFamily:FONTS.heading, letterSpacing:"-0.02em" }}>
          {initials}
        </div>
      </div>
      {online && (
        <>
          <div style={{ position:"absolute", bottom:hasRing?ring.width-1:0, right:hasRing?ring.width-1:0, width:15, height:15, borderRadius:"50%", background:"rgba(34,197,94,0.38)", animation:"cs-online-pulse 2.2s ease-out infinite" }}/>
          <span style={{ position:"absolute", bottom:hasRing?ring.width+1:1, right:hasRing?ring.width+1:1, width:10, height:10, borderRadius:"50%", background:"#22c55e", border:"2.5px solid var(--modal-bg)", boxShadow:"0 0 8px rgba(34,197,94,0.85)", zIndex:2 }}/>
        </>
      )}
    </div>
  )
}

// ── FollowBtn ─────────────────────────────────────────────────────────────────
// FIX: checks 'friends' (not 'mutual') for mutual state
const FollowBtn = ({ userId, status, onAction, loading, phase, onTap }) => {
  const base = {
    display:"inline-flex", alignItems:"center", justifyContent:"center",
    padding:"7px 14px", borderRadius:11, fontSize:11, fontWeight:800,
    fontFamily:FONTS.brand, letterSpacing:"-0.01em", userSelect:"none",
    WebkitTapHighlightColor:"transparent", minHeight:30, flexShrink:0,
    border:"none", outline:"none",
  }

  // Pending — I sent a request
  if (status === "pending") return (
    <div style={{ ...base, cursor:"default", background:"var(--pill-bg)", color:"var(--text-muted)", border:"1.5px solid var(--divider)" }}>
      Sent ✓
    </div>
  )

  // requested_me — they sent ME a request → show Accept/Decline
  if (status === "requested_me") return (
    <div style={{ display:"flex", gap:5, flexShrink:0 }}>
      <div role="button" tabIndex={0}
        onClick={e => { e.stopPropagation(); !loading && onAction("accept", userId) }}
        style={{ ...base, cursor:"pointer", background:"#059669", color:"#fff", padding:"7px 10px", boxShadow:"0 2px 8px rgba(5,150,105,0.35)" }}>✓</div>
      <div role="button" tabIndex={0}
        onClick={e => { e.stopPropagation(); !loading && onAction("decline", userId) }}
        style={{ ...base, cursor:"pointer", background:"var(--pill-bg)", color:"var(--text-muted)", border:"1.5px solid var(--divider)", padding:"7px 10px" }}>✕</div>
    </div>
  )

  // FIX: 'friends' (not 'mutual') — mutual follow state
  if (status === "friends") return (
    <div style={{ ...base, cursor:"default", background:"rgba(34,197,94,0.10)", color:"#16a34a", border:"1.5px solid rgba(34,197,94,0.28)" }}>
      Friends ✓
    </div>
  )

  // following — I follow them, not mutual
  if (status === "following") return (
    <div style={{ ...base, cursor:"default", background:"var(--pill-bg)", color:"var(--text-muted)", border:"1.5px solid var(--divider)" }}>
      Following
    </div>
  )

  // blocked or blocked_by — show nothing
  if (status === "blocked" || status === "blocked_by" || phase === "done") return null

  // Sent animation state
  if (phase === "sent" || phase === "fading") return (
    <div style={{
      ...base, cursor:"default",
      background:"rgba(34,197,94,0.14)", color:"#16a34a",
      border:"1.5px solid rgba(34,197,94,0.30)",
      animation:phase === "sent"
        ? "cs-sent-in 0.38s cubic-bezier(0.34,1.56,0.64,1) both"
        : "cs-sent-out 0.40s cubic-bezier(0.55,0,1,0.45) forwards",
    }}>
      ✓ Sent
    </div>
  )

  // Idle — Follow button
  return (
    <div role="button" tabIndex={0}
      onClick={e => { e.stopPropagation(); onTap() }}
      style={{
        ...base, cursor:loading ? "wait" : "pointer", opacity:loading ? 0.65 : 1,
        background:"linear-gradient(135deg,#FF9F1C 0%,#E05C2A 100%)", color:"#fff",
        boxShadow:"0 3px 14px rgba(255,120,0,0.45), inset 0 1px 0 rgba(255,255,255,0.20)",
        animation:phase === "pressing" ? "cs-btn-press 0.40s cubic-bezier(0.34,1.56,0.64,1)" : "none",
      }}>
      <span>+ Follow</span>
    </div>
  )
}

// ── CustomerCard ──────────────────────────────────────────────────────────────
const CustomerCard = ({ user, status, online, unreadCount, onAction, actionLoading, onCardTap }) => {
  const cardRef = useRef(null)
  const [phase,   setPhase]   = useState("idle")
  const [pressed, setPressed] = useState(false)
  const timers = useRef([])
  const kill   = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  useEffect(() => () => kill(), [])

  useEffect(() => {
    if (!["pending", "following", "friends"].includes(status)) { kill(); setPhase("idle") }
  }, [status])

  const handleFollowTap = useCallback(() => {
    if (phase !== "idle") return
    setPhase("pressing")
    timers.current.push(setTimeout(() => setPhase("sent"),   220))
    timers.current.push(setTimeout(() => setPhase("fading"), 2200))
    timers.current.push(setTimeout(() => setPhase("done"),   2900))
    onAction("follow", user._id)
  }, [phase, onAction, user._id])

  const handleCardPress   = e => { if (e.target.closest("[data-follow-btn]")) return; setPressed(true) }
  const handleCardRelease = e => { setPressed(false); if (e.target.closest("[data-follow-btn]")) return; onCardTap(user._id) }

  return (
    <div
      ref={cardRef}
      onPointerDown={handleCardPress}
      onPointerUp={handleCardRelease}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display:"flex", flexDirection:"column", alignItems:"center", gap:9,
        padding:"18px 12px 15px", borderRadius:24, flexShrink:0, width:116,
        background:pressed ? "var(--accent-dim)" : "var(--card-bg)",
        border:`1px solid ${pressed ? "var(--accent-border)" : "var(--card-border)"}`,
        boxShadow:pressed ? "0 2px 8px rgba(0,0,0,0.08), 0 0 0 3px var(--accent-dim)" : "0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.06)",
        backdropFilter:"blur(18px)", WebkitBackdropFilter:"blur(18px)",
        position:"relative", overflow:"visible", cursor:"pointer",
        WebkitTapHighlightColor:"transparent",
        transform:pressed ? "scale(0.955)" : "scale(1)",
        transition:"transform 0.18s cubic-bezier(0.34,1.56,0.64,1), background 0.18s, border-color 0.16s, box-shadow 0.16s",
        userSelect:"none", willChange:"transform",
      }}
    >
      <div aria-hidden style={{ position:"absolute", top:0, left:"12%", right:"12%", height:1, borderRadius:"0 0 1px 1px", background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.24) 50%,transparent)", pointerEvents:"none", zIndex:2 }}/>
      <div aria-hidden style={{ position:"absolute", inset:0, borderRadius:24, background:"linear-gradient(160deg,rgba(255,255,255,0.055) 0%,transparent 55%)", pointerEvents:"none", zIndex:1 }}/>

      {unreadCount > 0 && (
        <div style={{ position:"absolute", top:9, right:9, zIndex:6, minWidth:18, height:18, borderRadius:99, background:"#ef4444", boxShadow:"0 0 10px rgba(239,68,68,0.75), 0 2px 4px rgba(0,0,0,0.20)", border:"2px solid var(--modal-bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px", fontSize:9, fontWeight:800, color:"#fff", fontFamily:FONTS.mono, animation:"cs-badge-pop 0.40s cubic-bezier(0.34,1.56,0.64,1) both" }}>
          {unreadCount > 9 ? "9+" : unreadCount}
        </div>
      )}

      {phase === "pressing" && (
        <div aria-hidden style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:10 }}>
          {PARTICLES.map((p, i) => (
            <div key={i} style={{ position:"absolute", top:"68%", left:"50%", width:p.size, height:p.size, borderRadius:"50%", background:p.color, animation:`cs-burst-${i} 0.52s cubic-bezier(0.22,1,0.36,1) ${p.delay}ms forwards` }}/>
          ))}
        </div>
      )}

      <div style={{ position:"relative", zIndex:2 }}>
        <Avatar user={user} size={54} online={online}/>
      </div>

      <div style={{ textAlign:"center", width:"100%", minWidth:0, zIndex:2 }}>
        <div style={{ fontSize:12.5, fontWeight:800, letterSpacing:"-0.03em", color:"var(--text-primary)", fontFamily:FONTS.heading, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", lineHeight:1.25 }}>
          {user.name?.split(" ")[0]}
        </div>
        {user.username && (
          <div style={{ fontSize:10, color:"var(--text-muted)", fontFamily:FONTS.body, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginTop:2, letterSpacing:"0.01em" }}>
            @{user.username}
          </div>
        )}
      </div>

      <div data-follow-btn onClick={e => e.stopPropagation()} style={{ zIndex:2 }}>
        <FollowBtn
          userId={user._id} status={status}
          onAction={onAction} loading={actionLoading === user._id}
          phase={phase} onTap={handleFollowTap}
        />
      </div>
    </div>
  )
}

// ── PendingBanner ─────────────────────────────────────────────────────────────
const PendingBanner = ({ requests, onAccept, onDecline, loading, onUserTap }) => {
  if (!requests?.length) return null
  return (
    <div style={{ margin:"0 16px 12px", padding:"12px 14px", borderRadius:18, background:"var(--accent-dim)", border:"1px solid var(--accent-border)", position:"relative", overflow:"hidden" }}>
      <div aria-hidden style={{ position:"absolute", top:0, left:"8%", right:"8%", height:1, background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.22) 50%,transparent)" }}/>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
        <span style={{ fontSize:10, fontWeight:800, letterSpacing:"0.07em", textTransform:"uppercase", color:"var(--accent)", fontFamily:FONTS.body }}>Follow Requests</span>
        <div style={{ minWidth:18, height:18, borderRadius:99, background:"#ef4444", boxShadow:"0 0 6px rgba(239,68,68,0.55)", border:"1.5px solid var(--modal-bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 5px", fontSize:10, fontWeight:800, color:"#fff", fontFamily:FONTS.mono }}>
          {requests.length}
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
        {requests.map(r => (
          <div key={r._id} style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div onClick={() => onUserTap(r._id)} style={{ cursor:"pointer", flexShrink:0 }}>
              <Avatar user={r} size={34}/>
            </div>
            <span onClick={() => onUserTap(r._id)} style={{ flex:1, fontSize:13, fontWeight:700, letterSpacing:"-0.01em", color:"var(--text-primary)", fontFamily:FONTS.body, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", cursor:"pointer" }}>
              {r.name}
            </span>
            <div role="button" tabIndex={0} onClick={() => !loading && onAccept(r._id)}
              style={{ height:30, padding:"0 12px", borderRadius:9, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:"#059669", color:"#fff", fontSize:12, fontWeight:800, fontFamily:FONTS.brand, cursor:"pointer", boxShadow:"0 2px 8px rgba(5,150,105,0.35)", WebkitTapHighlightColor:"transparent" }}>
              Accept
            </div>
            <div role="button" tabIndex={0} onClick={() => !loading && onDecline(r._id)}
              style={{ width:30, height:30, borderRadius:9, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:"var(--pill-bg)", color:"var(--text-muted)", border:"1px solid var(--divider)", cursor:"pointer", fontSize:14, fontWeight:600, WebkitTapHighlightColor:"transparent" }}>
              ✕
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── SkeletonCard ──────────────────────────────────────────────────────────────
const SkeletonCard = ({ delay = 0 }) => (
  <div style={{ width:116, flexShrink:0, borderRadius:24, padding:"18px 12px 15px", background:"var(--card-bg)", border:"1px solid var(--card-border)", display:"flex", flexDirection:"column", alignItems:"center", gap:9, opacity:0, animation:`cs-fadein 0.38s ease ${delay}ms forwards` }}>
    <div className="skeleton" style={{ width:60, height:60, borderRadius:"50%" }}/>
    <div className="skeleton" style={{ width:66, height:11, borderRadius:6 }}/>
    <div className="skeleton" style={{ width:48, height:9,  borderRadius:6 }}/>
    <div className="skeleton" style={{ width:74, height:29, borderRadius:11, marginTop:1 }}/>
  </div>
)

// ── CustomersSection ──────────────────────────────────────────────────────────
export const CustomersSection = () => {
  const dispatch    = useDispatch()
  const navigate    = useNavigate()
  const me          = useSelector(selectUser)
  const customers   = useSelector(selectCustomers)
  const loading     = useSelector(selectFollowLoading)
  const pending     = useSelector(selectPendingRequests)
  const statusMap   = useSelector(selectStatusMap)
  const recentChats = useSelector(selectRecentChats)
  const rawOnline   = useSelector(selectOnlineUsers)

  const onlineSet = useMemo(() => {
    if (rawOnline instanceof Set) return rawOnline
    if (Array.isArray(rawOnline)) return new Set(rawOnline)
    return new Set()
  }, [rawOnline])

  const unreadMap = useMemo(() => {
    const map = {}
    for (const chat of recentChats) {
      const uid = chat.otherUser?._id ?? chat.otherUser?.id
      if (uid && chat.unreadCount > 0) map[uid] = chat.unreadCount
    }
    return map
  }, [recentChats])

  const totalUnread = useMemo(() =>
    recentChats.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0)
  , [recentChats])

  const [actionLoading, setActionLoading] = useState(null)
  const myId = useMemo(() => me?._id ?? me?.id ?? null, [me])

  useEffect(() => { dispatch(fetchCustomers()); dispatch(fetchPendingRequests()) }, [dispatch])

  const handleAction = useCallback(async (action, userId) => {
    setActionLoading(userId)
    try {
      if (action === "follow")   await dispatch(sendFollowRequest(userId))
      if (action === "unfollow") await dispatch(unfollowUser(userId))
      if (action === "accept")   await dispatch(acceptFollowRequest(userId))
      if (action === "decline")  await dispatch(declineFollowRequest(userId))
    } finally { setActionLoading(null) }
  }, [dispatch])

  const handleCardTap = useCallback(userId => navigate(`/customer/${userId}`), [navigate])

  // FIX: hide blocked, blocked_by, friends (was 'mutual'), following, pending
  // Show: 'none' (discover) + 'requested_me' (follow back opportunity)
  const stripUsers = useMemo(() => {
    const requestedMe = [], discover = []
    for (const u of customers) {
      if (u._id === myId || u.id === myId) continue
      const rawStatus = statusMap[u._id] ?? u.followStatus ?? "none"
      // Normalize 'mutual' → 'friends' for any legacy values
      const s = rawStatus === "mutual" ? "friends" : rawStatus
      // FIX: hide blocked_by users from discovery
      if (["blocked", "blocked_by", "friends", "following", "pending"].includes(s)) continue
      const scored = { ...u, _score:computeScore(me, u) }
      if (s === "requested_me") requestedMe.push(scored)
      else if (s === "none")    discover.push(scored)
    }
    const sortFn = (a, b) => b._score - a._score
    return [...requestedMe.sort(sortFn), ...discover.sort(sortFn)]
  }, [customers, statusMap, me, myId])

  if (!loading && customers.length === 0 && !pending?.length) return null

  return (
    <>
      <style>{STYLES}</style>

      <section style={{ paddingBottom:14 }}>
        <PendingBanner
          requests={pending}
          onAccept={id => handleAction("accept", id)}
          onDecline={id => handleAction("decline", id)}
          loading={!!actionLoading}
          onUserTap={handleCardTap}
        />

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 16px", marginBottom:13 }}>
          <div>
            <h2 style={{ margin:0, fontSize:15, fontWeight:800, letterSpacing:"-0.03em", lineHeight:1.2, color:"var(--text-primary)", fontFamily:FONTS.heading }}>
              People here
            </h2>
            <p style={{ margin:"2px 0 0", fontSize:11, fontWeight:500, color:"var(--text-muted)", fontFamily:FONTS.body }}>
              Matched by taste &amp; vibe
            </p>
          </div>

          {/* Chats button */}
          <div role="button" tabIndex={0} onClick={() => navigate("/chat")}
            style={{ position:"relative", display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:12, background:"var(--pill-bg)", border:"1px solid var(--pill-border)", color:"var(--text-secondary)", fontSize:12, fontWeight:700, fontFamily:FONTS.brand, cursor:"pointer", letterSpacing:"-0.01em", WebkitTapHighlightColor:"transparent", userSelect:"none" }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink:0 }}>
              <path d="M1 1h12v9H8l-3 3V10H1V1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            Chats
            {totalUnread > 0 && (
              <div key={totalUnread}
                style={{ position:"absolute", top:-6, right:-6, minWidth:17, height:17, borderRadius:99, background:"#ef4444", boxShadow:"0 0 8px rgba(239,68,68,0.70), 0 2px 4px rgba(0,0,0,0.25)", border:"2px solid var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px", fontSize:9, fontWeight:800, color:"#fff", fontFamily:FONTS.mono, animation:"cs-chat-badge 0.45s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                {totalUnread > 9 ? "9+" : totalUnread}
              </div>
            )}
          </div>
        </div>

        {/* Card strip */}
        {loading && !stripUsers.length ? (
          <div style={{ display:"flex", gap:10, padding:"0 16px", overflowX:"hidden" }}>
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} delay={i * 65}/>)}
          </div>
        ) : stripUsers.length === 0 ? (
          <div style={{ padding:"2px 16px 6px" }}>
            <p style={{ fontSize:12, color:"var(--text-muted)", fontFamily:FONTS.body, margin:0, lineHeight:1.55 }}>
              No new people to discover 🌿{" "}
              <span onClick={() => navigate("/chat")} style={{ color:"var(--accent)", fontWeight:700, cursor:"pointer" }}>
                Open chats →
              </span>
            </p>
          </div>
        ) : (
          <div data-lenis-prevent className="cs-scroll"
            style={{ display:"flex", gap:10, padding:"4px 16px 10px", overflowX:"auto", WebkitOverflowScrolling:"touch", scrollbarWidth:"none", scrollSnapType:"x mandatory" }}>
            {stripUsers.map((user, i) => {
              const rawStatus = statusMap[user._id] ?? user.followStatus ?? "none"
              // Normalize 'mutual' → 'friends'
              const status = rawStatus === "mutual" ? "friends" : rawStatus
              return (
                <div key={user._id} style={{ scrollSnapAlign:"start", flexShrink:0, opacity:0, animation:`cs-fadein 0.38s ease ${i * 55}ms forwards` }}>
                  <CustomerCard
                    user={user} status={status}
                    online={onlineSet.has(user._id)}
                    unreadCount={unreadMap[user._id] ?? 0}
                    onAction={handleAction}
                    actionLoading={actionLoading}
                    onCardTap={handleCardTap}
                  />
                </div>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}

export default CustomersSection