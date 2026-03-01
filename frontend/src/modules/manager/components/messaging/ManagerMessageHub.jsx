// src/modules/manager/components/messaging/ManagerMessageHub.jsx
// ═══════════════════════════════════════════════════════════════════════════
//  Kausī Chiyā — Manager Message Hub
//  Manager sees ALL staff threads · can message any role
//  Perfect responsive: mobile (full-screen chat) / tablet / desktop (split)
//  Rich GSAP animations · Playfair Display + DM Sans
//  Dark: near-black #080602 · Light: warm cream #F5EFE0
//  API:
//    GET    /messages/threads          → { threads: [{threadId, participant, lastMessage, unreadCount, updatedAt}] }
//    GET    /messages/thread/:threadId → { messages: [{_id, senderId, content, createdAt, role}] }
//    POST   /messages/send             → { recipientId, content }
//    GET    /staff                     → { staff: [{_id, name, role, isActive}] }
//    WebSocket / polling for real-time (polling every 4s shown here)
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react'
import { ThemeContext } from '@shared/context/ThemeContext'
import { useSelector }  from 'react-redux'
import api              from '@api/axios'
import gsap             from 'gsap'
import toast            from 'react-hot-toast'
import {
  MessageSquare, Search, Send, ChevronLeft,
  Users, Wifi, WifiOff, Clock, Check, CheckCheck,
  Plus, X, Filter, Loader, RefreshCw, Sparkles,
  Bell, BellOff, ArrowDown,
} from 'lucide-react'

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const SAFFRON = '#FF9F1C'
const TERRA   = '#E05C2A'
const MATCHA  = '#2D9B5A'
const PURPLE  = '#7C3AED'

const tv = (dark, d, l) => dark ? d : l

const surf = (dark) => ({
  page:    dark ? '#080602'               : '#F5EFE0',
  card:    dark ? 'rgba(14,9,3,0.96)'    : 'rgba(255,252,244,0.97)',
  input:   dark ? 'rgba(255,255,255,0.05)': 'rgba(255,255,255,0.88)',
  border:  dark ? 'rgba(255,159,28,0.11)' : 'rgba(210,185,140,0.5)',
  chip:    dark ? 'rgba(255,255,255,0.07)': 'rgba(255,255,255,0.72)',
  hover:   dark ? 'rgba(255,255,255,0.04)': 'rgba(255,159,28,0.07)',
  active:  dark ? `${SAFFRON}16`          : `${SAFFRON}12`,
  text:    dark ? '#FFF8EE'               : '#1A0D04',
  sub:     dark ? 'rgba(255,248,238,0.42)': 'rgba(26,13,4,0.44)',
  muted:   dark ? 'rgba(255,248,238,0.22)': 'rgba(26,13,4,0.25)',
  shadow:  dark
    ? '0 8px 40px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.025)'
    : '0 8px 40px rgba(80,40,10,0.09),inset 0 1px 0 rgba(255,255,255,0.95)',
  msgSelf: dark ? `linear-gradient(135deg,${SAFFRON},${TERRA})` : `linear-gradient(135deg,${SAFFRON},${TERRA})`,
  msgOther:dark ? 'rgba(255,255,255,0.08)': 'rgba(255,255,255,0.85)',
})

const ROLE_META = {
  waiter:  { color: SAFFRON, label: 'Waiter',  grad: `${SAFFRON},${TERRA}`,    emoji: '🍽️' },
  kitchen: { color: TERRA,   label: 'Kitchen', grad: `${TERRA},#C04418`,        emoji: '👨‍🍳' },
  cashier: { color: MATCHA,  label: 'Cashier', grad: `${MATCHA},#1B6B3A`,       emoji: '💰' },
  manager: { color: PURPLE,  label: 'Manager', grad: `${PURPLE},#5848C0`,       emoji: '🏢' },
}

const POLL_MS = 4000 // polling interval

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmtTime = (iso) => {
  if (!iso) return ''
  const d   = new Date(iso)
  const now = new Date()
  const diffMin = Math.floor((now - d) / 60000)
  if (diffMin < 1)  return 'now'
  if (diffMin < 60) return `${diffMin}m`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return 'Yesterday'
  if (diffD < 7) return d.toLocaleDateString('en-US', { weekday: 'short' })
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const fmtFull = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const getInitials = (name = '') => {
  const parts = name.trim().split(' ')
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : (name[0] || '?').toUpperCase()
}

// ─── ATOMS ────────────────────────────────────────────────────────────────────
const Avatar = ({ name, role, size = 38, online = false }) => {
  const meta = ROLE_META[role] ?? { grad: `${SAFFRON},${TERRA}`, color: SAFFRON }
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: size * 0.35,
        background: `linear-gradient(135deg,${meta.grad})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 900, fontSize: size * 0.35,
        fontFamily: 'DM Sans,sans-serif', letterSpacing: '-0.5px',
        boxShadow: `0 4px 12px ${meta.color}30`,
      }}>
        {getInitials(name)}
      </div>
      {online && (
        <span style={{
          position: 'absolute', bottom: -1, right: -1,
          width: size * 0.28, height: size * 0.28, borderRadius: '50%',
          background: MATCHA, border: '2px solid transparent',
          boxShadow: `0 0 0 2px rgba(0,0,0,0.15)`,
        }} />
      )}
    </div>
  )
}

const RolePill = ({ role, size = 'sm' }) => {
  const meta = ROLE_META[role] ?? { color: SAFFRON, label: role }
  const fs   = size === 'xs' ? 9 : 10
  return (
    <span style={{
      fontSize: fs, fontWeight: 800, letterSpacing: '0.35px', textTransform: 'uppercase',
      padding: size === 'xs' ? '2px 6px' : '2px 8px', borderRadius: 99,
      background: meta.color + '18', color: meta.color,
      border: `1px solid ${meta.color}28`, fontFamily: 'DM Sans,sans-serif',
      whiteSpace: 'nowrap',
    }}>
      {meta.emoji} {meta.label}
    </span>
  )
}

const Skeleton = ({ dark, h = 52, radius = 14 }) => (
  <div style={{
    height: h, borderRadius: radius,
    background: tv(dark, 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.06)'),
    animation: 'mmh-shimmer 1.8s ease-in-out infinite',
  }} />
)

// ─── THREAD ROW ───────────────────────────────────────────────────────────────
const ThreadRow = ({ thread, isActive, onClick, dark, index }) => {
  const ref  = useRef(null)
  const s    = surf(dark)
  const meta = ROLE_META[thread.role] ?? { color: SAFFRON }

  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current,
      { opacity: 0, x: -18 },
      { opacity: 1, x: 0, duration: 0.38, delay: index * 0.048, ease: 'power3.out' }
    )
  }, [])

  const handleClick = () => {
    if (ref.current)
      gsap.timeline()
        .to(ref.current, { scale: 0.97, duration: 0.07 })
        .to(ref.current, { scale: 1, duration: 0.28, ease: 'back.out(2)' })
    onClick(thread)
  }

  return (
    <button ref={ref} onClick={handleClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
        background: isActive ? s.active : 'transparent',
        borderLeft: isActive ? `3px solid ${SAFFRON}` : '3px solid transparent',
        transition: 'background 0.15s',
        position: 'relative',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = s.hover }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>

      <Avatar name={thread.name} role={thread.role} size={42} online={thread.online} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
          <p style={{
            fontSize: 13, fontWeight: thread.unread > 0 ? 800 : 600, margin: 0,
            color: s.text, fontFamily: 'DM Sans,sans-serif',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: '65%',
          }}>{thread.name}</p>
          <span style={{ fontSize: 10, color: s.muted, flexShrink: 0, fontFamily: 'DM Sans,sans-serif' }}>
            {fmtTime(thread.updatedAt)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <p style={{
            fontSize: 12, margin: 0, color: thread.unread > 0 ? s.sub : s.muted,
            fontWeight: thread.unread > 0 ? 600 : 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1, fontFamily: 'DM Sans,sans-serif',
          }}>
            {thread.isSelf ? '↩ You: ' : ''}{thread.lastMessage || 'No messages yet'}
          </p>
          {thread.unread > 0 && (
            <span style={{
              flexShrink: 0, minWidth: 18, height: 18, borderRadius: 99, padding: '0 5px',
              background: `linear-gradient(135deg,${SAFFRON},${TERRA})`,
              color: '#fff', fontSize: 9, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'DM Mono,monospace', boxShadow: `0 2px 8px ${SAFFRON}55`,
            }}>
              {thread.unread > 99 ? '99+' : thread.unread}
            </span>
          )}
        </div>
        <div style={{ marginTop: 4 }}>
          <RolePill role={thread.role} size="xs" />
        </div>
      </div>
    </button>
  )
}

// ─── MESSAGE BUBBLE ───────────────────────────────────────────────────────────
const Bubble = ({ msg, isSelf, dark, showTime, isFirst }) => {
  const ref = useRef(null)
  const s   = surf(dark)

  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current,
      { opacity: 0, y: 10, scale: 0.96, x: isSelf ? 8 : -8 },
      { opacity: 1, y: 0, scale: 1, x: 0, duration: 0.35, ease: 'back.out(1.6)' }
    )
  }, [])

  return (
    <div ref={ref} style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isSelf ? 'flex-end' : 'flex-start',
      marginBottom: isFirst ? 8 : 3,
    }}>
      <div style={{
        maxWidth: '78%', padding: '10px 14px', borderRadius: 18,
        borderBottomRightRadius: isSelf ? 4 : 18,
        borderBottomLeftRadius: isSelf ? 18 : 4,
        background: isSelf ? s.msgSelf : s.msgOther,
        border: isSelf ? 'none' : `1px solid ${s.border}`,
        boxShadow: isSelf
          ? `0 4px 16px ${SAFFRON}33`
          : tv(dark, '0 2px 8px rgba(0,0,0,0.25)', '0 2px 8px rgba(0,0,0,0.07)'),
        position: 'relative',
      }}>
        <p style={{
          fontSize: 14, margin: 0, lineHeight: 1.5,
          color: isSelf ? '#fff' : s.text,
          fontFamily: 'DM Sans,sans-serif',
          wordBreak: 'break-word',
        }}>
          {msg.content}
        </p>
      </div>
      {showTime && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, paddingLeft: isSelf ? 0 : 2, paddingRight: isSelf ? 2 : 0 }}>
          <span style={{ fontSize: 10, color: s.muted, fontFamily: 'DM Sans,sans-serif' }}>
            {fmtFull(msg.createdAt)}
          </span>
          {isSelf && (
            msg.read
              ? <CheckCheck size={11} color={MATCHA} />
              : <Check size={11} color={tv(dark, 'rgba(255,255,255,0.35)', 'rgba(0,0,0,0.3)')} />
          )}
        </div>
      )}
    </div>
  )
}

// ─── DATE DIVIDER ─────────────────────────────────────────────────────────────
const DateDivider = ({ label, dark }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,transparent,${tv(dark,'rgba(255,255,255,0.08)','rgba(0,0,0,0.08)')},transparent)` }} />
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.4px', color: surf(dark).muted, fontFamily: 'DM Sans,sans-serif', whiteSpace: 'nowrap' }}>{label}</span>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,${tv(dark,'rgba(255,255,255,0.08)','rgba(0,0,0,0.08)')},transparent)` }} />
  </div>
)

// ─── STAFF PICKER MODAL ───────────────────────────────────────────────────────
const StaffPicker = ({ staff, dark, onSelect, onClose }) => {
  const [q, setQ] = useState('')
  const overlayRef = useRef(null)
  const cardRef    = useRef(null)
  const s = surf(dark)

  useEffect(() => {
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.22 })
    gsap.fromTo(cardRef.current,
      { opacity: 0, scale: 0.92, y: 20 },
      { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'back.out(1.6)' }
    )
  }, [])

  const close = () => {
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.18 })
    gsap.to(cardRef.current, { opacity: 0, scale: 0.94, y: 12, duration: 0.2, ease: 'power2.in', onComplete: onClose })
  }

  const filtered = staff.filter(st =>
    !q || st.name.toLowerCase().includes(q.toLowerCase()) || st.role.includes(q.toLowerCase())
  )

  return (
    <div ref={overlayRef} onClick={close}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 20px' }}>
      <div ref={cardRef} onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 440, background: s.card, border: `1px solid ${s.border}`, borderRadius: 24, overflow: 'hidden', boxShadow: s.shadow }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 18px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 11, background: `${SAFFRON}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={15} color={SAFFRON} />
            </div>
            <h3 style={{ fontFamily: 'Playfair Display,serif', fontSize: 16, fontWeight: 800, margin: 0, color: s.text }}>New Conversation</h3>
          </div>
          <button onClick={close} style={{ width: 30, height: 30, borderRadius: 9, border: 'none', cursor: 'pointer', background: s.chip, color: s.sub, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
        </div>
        {/* Search */}
        <div style={{ padding: '14px 18px', position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 30, top: '50%', transform: 'translateY(-50%)', color: s.muted, pointerEvents: 'none' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search staff…"
            autoFocus
            style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 12, border: `1.5px solid ${s.border}`, background: s.input, color: s.text, fontSize: 13, fontFamily: 'DM Sans,sans-serif', outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => { e.target.style.borderColor = SAFFRON; e.target.style.boxShadow = `0 0 0 3px ${SAFFRON}15` }}
            onBlur={e  => { e.target.style.borderColor = s.border; e.target.style.boxShadow = 'none' }}
          />
        </div>
        {/* List */}
        <div style={{ maxHeight: 300, overflowY: 'auto', padding: '0 10px 14px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: s.muted, fontSize: 13, fontFamily: 'DM Sans,sans-serif' }}>No staff found</div>
          ) : filtered.map((st, i) => {
            const meta = ROLE_META[st.role] ?? { color: SAFFRON, grad: `${SAFFRON},${TERRA}` }
            return (
              <button key={st._id} onClick={() => { onSelect(st); close() }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'transparent', textAlign: 'left', marginBottom: 2, animation: `mmh-fadein 0.3s ease ${i*0.04}s both` }}
                onMouseEnter={e => e.currentTarget.style.background = s.hover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <Avatar name={st.name} role={st.role} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: s.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.name}</p>
                  <div style={{ marginTop: 3 }}><RolePill role={st.role} size="xs" /></div>
                </div>
                {!st.isActive && <span style={{ fontSize: 10, color: s.muted, fontFamily: 'DM Sans,sans-serif' }}>Inactive</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
const EmptyChat = ({ dark }) => {
  const s = surf(dark)
  const iconRef = useRef(null)

  useEffect(() => {
    if (!iconRef.current) return
    gsap.to(iconRef.current, { y: -6, duration: 1.8, repeat: -1, yoyo: true, ease: 'sine.inOut' })
  }, [])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '40px 20px', textAlign: 'center' }}>
      <div ref={iconRef} style={{
        width: 72, height: 72, borderRadius: 24,
        background: `linear-gradient(135deg,${SAFFRON}20,${TERRA}18)`,
        border: `1.5px solid ${SAFFRON}28`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 8px 32px ${SAFFRON}20`,
      }}>
        <MessageSquare size={30} color={SAFFRON} strokeWidth={1.5} />
      </div>
      <div>
        <h3 style={{ fontFamily: 'Playfair Display,serif', fontSize: 18, fontWeight: 800, margin: '0 0 6px', color: s.text }}>Select a conversation</h3>
        <p style={{ fontSize: 13, margin: 0, color: s.sub, fontFamily: 'DM Sans,sans-serif', lineHeight: 1.5 }}>
          Choose a staff member to start<br />messaging them directly
        </p>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {Object.entries(ROLE_META).map(([role, meta]) => (
          <span key={role} style={{ fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 99, background: meta.color+'14', color: meta.color, border: `1px solid ${meta.color}22`, fontFamily: 'DM Sans,sans-serif' }}>
            {meta.emoji} {meta.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const ManagerMessageHub = () => {
  const { isDark }    = useContext(ThemeContext)
  const currentUser   = useSelector(s => s.auth?.user)
  const myId          = currentUser?._id

  // ── State ─────────────────────────────────────────────────────────────────
  const [threads,      setThreads]      = useState([])
  const [allStaff,     setAllStaff]     = useState([])
  const [activeThread, setActiveThread] = useState(null)   // { threadId, name, role, participantId }
  const [messages,     setMessages]     = useState([])
  const [draft,        setDraft]        = useState('')
  const [loadingList,  setLoadingList]  = useState(true)
  const [loadingMsgs,  setLoadingMsgs]  = useState(false)
  const [sending,      setSending]      = useState(false)
  const [search,       setSearch]       = useState('')
  const [roleFilter,   setRoleFilter]   = useState('all')
  const [showPicker,   setShowPicker]   = useState(false)
  const [connected,    setConnected]    = useState(true)
  const [showScrollBtn,setShowScrollBtn]= useState(false)
  const [mobileView,   setMobileView]   = useState('list') // 'list' | 'chat' — mobile only

  // ── Refs ──────────────────────────────────────────────────────────────────
  const inputRef     = useRef(null)
  const messagesEndRef = useRef(null)
  const listRef      = useRef(null)
  const chatAreaRef  = useRef(null)
  const headerRef    = useRef(null)
  const pollTimer    = useRef(null)
  const threadPoll   = useRef(null)
  const prevActiveId = useRef(null)

  // ── Breakpoint ────────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h, { passive: true })
    return () => window.removeEventListener('resize', h)
  }, [])

  // ── Fetch thread list ─────────────────────────────────────────────────────
  const fetchThreads = useCallback(async (silent = false) => {
    if (!silent) setLoadingList(true)
    try {
      const [tRes, sRes] = await Promise.allSettled([
        api.get('/messages/threads'),
        api.get('/staff'),
      ])
      if (tRes.status === 'fulfilled') {
        const data = tRes.value?.data ?? tRes.value
        setThreads(data?.threads ?? [])
        setConnected(true)
      }
      if (sRes.status === 'fulfilled') {
        const data = sRes.value?.data ?? sRes.value
        setAllStaff(data?.staff ?? [])
      }
    } catch {
      setConnected(false)
    }
    if (!silent) setLoadingList(false)
  }, [])

  useEffect(() => {
    fetchThreads()
    // Poll thread list every 8s
    pollTimer.current = setInterval(() => fetchThreads(true), 8000)
    return () => clearInterval(pollTimer.current)
  }, [fetchThreads])

  // Entrance animation
  useEffect(() => {
    if (headerRef.current)
      gsap.fromTo(headerRef.current, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' })
  }, [])

  // ── Fetch messages for active thread ─────────────────────────────────────
  const fetchMessages = useCallback(async (threadId, silent = false) => {
    if (!threadId) return
    if (!silent) setLoadingMsgs(true)
    try {
      const res  = await api.get(`/messages/thread/${threadId}`)
      const data = res?.data ?? res
      setMessages(data?.messages ?? [])
      setConnected(true)
    } catch {
      setConnected(false)
    }
    if (!silent) setLoadingMsgs(false)
  }, [])

  // When active thread changes
  useEffect(() => {
    if (!activeThread) return
    if (activeThread.threadId !== prevActiveId.current) {
      prevActiveId.current = activeThread.threadId
      setMessages([])
      fetchMessages(activeThread.threadId)
    }
    // Poll messages every 4s
    clearInterval(threadPoll.current)
    threadPoll.current = setInterval(() => fetchMessages(activeThread.threadId, true), POLL_MS)
    return () => clearInterval(threadPoll.current)
  }, [activeThread, fetchMessages])

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' })
  }, [])

  useEffect(() => {
    if (messages.length === 0) return
    const el = chatAreaRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (isNearBottom) scrollToBottom()
  }, [messages, scrollToBottom])

  // Track scroll position for the scroll-to-bottom button
  const handleScroll = useCallback(() => {
    const el = chatAreaRef.current
    if (!el) return
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollBtn(fromBottom > 150)
  }, [])

  // ── Select thread ─────────────────────────────────────────────────────────
  const handleSelectThread = useCallback((thread) => {
    setActiveThread(thread)
    if (isMobile) setMobileView('chat')
    // Mark as read locally
    setThreads(prev => prev.map(t => t.threadId === thread.threadId ? { ...t, unread: 0 } : t))
    // Animate chat panel in (desktop)
    if (chatAreaRef.current && !isMobile)
      gsap.fromTo(chatAreaRef.current, { opacity: 0, x: 14 }, { opacity: 1, x: 0, duration: 0.28, ease: 'expo.out' })
  }, [isMobile])

  // ── Start new convo from staff picker ────────────────────────────────────
  const handlePickStaff = useCallback((staff) => {
    // Check if thread already exists
    const existing = threads.find(t => t.participantId === staff._id)
    if (existing) {
      handleSelectThread(existing)
      return
    }
    // Create a temporary thread
    const tempThread = {
      threadId:      `temp_${staff._id}`,
      participantId: staff._id,
      name:          staff.name,
      role:          staff.role,
      lastMessage:   '',
      unread:        0,
      updatedAt:     new Date().toISOString(),
      isNew:         true,
    }
    setThreads(prev => [tempThread, ...prev])
    handleSelectThread(tempThread)
  }, [threads, handleSelectThread])

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!draft.trim() || !activeThread || sending) return
    const content = draft.trim()
    setSending(true)
    setDraft('')

    // Optimistic update
    const optimistic = {
      _id:       `opt_${Date.now()}`,
      senderId:  myId,
      content,
      createdAt: new Date().toISOString(),
      optimistic: true,
    }
    setMessages(prev => [...prev, optimistic])
    scrollToBottom()

    try {
      await api.post('/messages/send', {
        recipientId: activeThread.participantId,
        content,
        threadId: activeThread.isNew ? undefined : activeThread.threadId,
      })
      // Refresh
      await fetchMessages(activeThread.threadId, true)
      await fetchThreads(true)
      // If it was a new thread, refresh to get real threadId
      if (activeThread.isNew) {
        const res  = await api.get('/messages/threads')
        const data = res?.data ?? res
        const threads = data?.threads ?? []
        setThreads(threads)
        const real = threads.find(t => t.participantId === activeThread.participantId)
        if (real) setActiveThread(real)
      }
    } catch {
      toast.error('Failed to send message')
      setMessages(prev => prev.filter(m => m._id !== optimistic._id))
      setDraft(content)
    }
    setSending(false)
  }, [draft, activeThread, sending, myId, fetchMessages, fetchThreads, scrollToBottom])

  // ─ Key handler ─────────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Group messages by date ────────────────────────────────────────────────
  const groupedMessages = useMemo(() => {
    const groups = []
    let lastDate = null
    messages.forEach(msg => {
      const d    = msg.createdAt ? new Date(msg.createdAt).toDateString() : 'Unknown'
      const today = new Date().toDateString()
      const yesterday = new Date(Date.now() - 86400000).toDateString()
      const label = d === today ? 'Today' : d === yesterday ? 'Yesterday' : d
      if (d !== lastDate) {
        groups.push({ type: 'date', label })
        lastDate = d
      }
      groups.push({ type: 'msg', msg })
    })
    return groups
  }, [messages])

  // ── Filtered threads ──────────────────────────────────────────────────────
  const filteredThreads = useMemo(() => threads.filter(t => {
    const matchQ = !search || t.name.toLowerCase().includes(search.toLowerCase())
    const matchR = roleFilter === 'all' || t.role === roleFilter
    return matchQ && matchR
  }), [threads, search, roleFilter])

  const totalUnread = threads.reduce((sum, t) => sum + (t.unread || 0), 0)

  const s = surf(isDark)

  // ─────────────────────────────────────────────────────────────────────────
  // THREAD LIST PANEL
  // ─────────────────────────────────────────────────────────────────────────
  const ThreadListPanel = () => (
    <div style={{
      width: isMobile ? '100%' : 'clamp(260px, 32%, 340px)',
      flexShrink: 0,
      borderRight: isMobile ? 'none' : `1px solid ${s.border}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: s.card,
    }}>
      {/* Header */}
      <div ref={headerRef} style={{ padding: '18px 16px 14px', borderBottom: `1px solid ${s.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontFamily: 'Playfair Display,serif', fontSize: 20, fontWeight: 900, margin: 0, letterSpacing: '-0.4px', color: s.text }}>Messages</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? MATCHA : '#EF4444', animation: connected ? 'mmh-pulse 2s ease-in-out infinite' : 'none' }} />
              <p style={{ fontSize: 11, margin: 0, color: s.sub, fontFamily: 'DM Sans,sans-serif' }}>
                {connected ? `${threads.length} conversations` : 'Reconnecting…'}
              </p>
              {totalUnread > 0 && (
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: `linear-gradient(135deg,${SAFFRON},${TERRA})`, color: '#fff', boxShadow: `0 2px 8px ${SAFFRON}44` }}>
                  {totalUnread}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => fetchThreads()} title="Refresh"
              style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${s.border}`, background: s.chip, color: s.sub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={13} />
            </button>
            <button onClick={() => setShowPicker(true)} title="New conversation"
              style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${SAFFRON},${TERRA})`, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 3px 12px ${SAFFRON}44` }}>
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: s.muted, pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations…"
            style={{ width: '100%', padding: '9px 12px 9px 33px', borderRadius: 12, border: `1.5px solid ${s.border}`, background: s.input, color: s.text, fontSize: 12, fontFamily: 'DM Sans,sans-serif', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
            onFocus={e => { e.target.style.borderColor = SAFFRON; e.target.style.boxShadow = `0 0 0 3px ${SAFFRON}12` }}
            onBlur={e  => { e.target.style.borderColor = s.border; e.target.style.boxShadow = 'none' }}
          />
        </div>

        {/* Role filter chips */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 2 }}>
          {['all', ...Object.keys(ROLE_META)].map(r => {
            const active = roleFilter === r
            const meta   = r === 'all' ? null : ROLE_META[r]
            const clr    = meta?.color ?? SAFFRON
            return (
              <button key={r} onClick={() => setRoleFilter(r)} style={{
                padding: '5px 11px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                border: `1px solid ${active ? clr+'40' : s.border}`,
                background: active ? `${clr}18` : 'transparent',
                color: active ? clr : s.muted, cursor: 'pointer',
                fontFamily: 'DM Sans,sans-serif', textTransform: 'capitalize',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {r === 'all' ? 'All' : `${meta.emoji} ${meta.label}`}
              </button>
            )
          })}
        </div>
      </div>

      {/* Thread list */}
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
        className="mmh-scroll">
        {loadingList ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px' }}>
            {[0,1,2,3,4].map(i => <Skeleton key={i} dark={isDark} h={72} />)}
          </div>
        ) : filteredThreads.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <MessageSquare size={28} color={s.muted} strokeWidth={1.5} style={{ marginBottom: 10 }} />
            <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 6px', color: s.sub, fontFamily: 'DM Sans,sans-serif' }}>
              {threads.length === 0 ? 'No conversations yet' : 'No results'}
            </p>
            <p style={{ fontSize: 11, margin: 0, color: s.muted, fontFamily: 'DM Sans,sans-serif' }}>
              {threads.length === 0 ? 'Tap + to start messaging' : 'Try a different search'}
            </p>
          </div>
        ) : (
          filteredThreads.map((thread, i) => (
            <ThreadRow
              key={thread.threadId}
              thread={thread}
              index={i}
              isActive={activeThread?.threadId === thread.threadId}
              onClick={handleSelectThread}
              dark={isDark}
            />
          ))
        )}
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // CHAT PANEL
  // ─────────────────────────────────────────────────────────────────────────
  const ChatPanel = () => {
    if (!activeThread) return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: s.page }}>
        <EmptyChat dark={isDark} />
      </div>
    )

    const meta = ROLE_META[activeThread.role] ?? { color: SAFFRON, emoji: '👤', label: 'Staff' }

    return (
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: s.page, position: 'relative' }}>

        {/* Chat header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
          background: s.card,
          borderBottom: `1px solid ${s.border}`,
          flexShrink: 0,
          boxShadow: tv(isDark, '0 2px 12px rgba(0,0,0,0.25)', '0 2px 12px rgba(80,40,10,0.06)'),
        }}>
          {/* Back button (mobile) */}
          {isMobile && (
            <button onClick={() => setMobileView('list')}
              style={{ width: 36, height: 36, borderRadius: 11, border: `1px solid ${s.border}`, background: s.chip, color: s.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ChevronLeft size={16} />
            </button>
          )}

          <Avatar name={activeThread.name} role={activeThread.role} size={40} online={activeThread.online} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 14, fontWeight: 800, margin: 0, color: s.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeThread.name}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <RolePill role={activeThread.role} size="xs" />
              {activeThread.online && <span style={{ fontSize: 10, color: MATCHA, fontWeight: 600, fontFamily: 'DM Sans,sans-serif' }}>Active now</span>}
            </div>
          </div>

          {/* Connection indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            {connected
              ? <Wifi size={13} color={MATCHA} />
              : <WifiOff size={13} color="#EF4444" style={{ animation: 'mmh-pulse 1s ease-in-out infinite' }} />}
          </div>
        </div>

        {/* Messages area */}
        <div ref={chatAreaRef} onScroll={handleScroll}
          style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column' }}
          className="mmh-scroll">

          {loadingMsgs ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10 }}>
              {[0,1,2,3,4,5].map(i => (
                <div key={i} style={{ display: 'flex', justifyContent: i%2===0 ? 'flex-end' : 'flex-start' }}>
                  <div style={{ width: `${45 + Math.random()*25}%`, height: 44, borderRadius: 16, background: tv(isDark,'rgba(255,255,255,0.06)','rgba(0,0,0,0.07)'), animation: `mmh-shimmer 1.8s ease-in-out ${i*0.1}s infinite` }} />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', paddingTop: 40 }}>
              <div style={{ width: 52, height: 52, borderRadius: 18, background: `linear-gradient(135deg,${meta.color}20,${meta.color}10)`, border: `1px solid ${meta.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                {meta.emoji}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px', color: s.text, fontFamily: 'DM Sans,sans-serif' }}>Start the conversation</p>
                <p style={{ fontSize: 12, margin: 0, color: s.sub, fontFamily: 'DM Sans,sans-serif' }}>Send a message to {activeThread.name}</p>
              </div>
            </div>
          ) : (
            <>
              {groupedMessages.map((item, i) => {
                if (item.type === 'date') return <DateDivider key={`d-${i}`} label={item.label} dark={isDark} />
                const msg     = item.msg
                const isSelf  = msg.senderId === myId
                const prevMsg = groupedMessages[i - 1]
                const isFirst = !prevMsg || prevMsg.type === 'date' || groupedMessages[i-1]?.msg?.senderId !== msg.senderId
                const nextItem = groupedMessages[i + 1]
                const showTime = !nextItem || nextItem.type === 'date' || nextItem?.msg?.senderId !== msg.senderId
                return (
                  <Bubble key={msg._id} msg={msg} isSelf={isSelf} dark={isDark} showTime={showTime} isFirst={isFirst} />
                )
              })}
              <div ref={messagesEndRef} style={{ height: 1 }} />
            </>
          )}
        </div>

        {/* Scroll to bottom button */}
        {showScrollBtn && (
          <button onClick={() => scrollToBottom('smooth')}
            style={{
              position: 'absolute', bottom: 90, right: 20, zIndex: 10,
              width: 38, height: 38, borderRadius: '50%', border: `1px solid ${s.border}`,
              background: s.card, color: s.sub, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: s.shadow, animation: 'mmh-fadein 0.2s ease',
            }}>
            <ArrowDown size={15} />
          </button>
        )}

        {/* Input area */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 10, padding: '12px 16px 14px',
          background: s.card, borderTop: `1px solid ${s.border}`, flexShrink: 0,
          boxShadow: tv(isDark, '0 -2px 16px rgba(0,0,0,0.22)', '0 -2px 12px rgba(80,40,10,0.05)'),
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${activeThread.name}…`}
              rows={1}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 16,
                border: `1.5px solid ${draft.length > 0 ? SAFFRON+'55' : s.border}`,
                background: s.input, color: s.text, fontSize: 13,
                fontFamily: 'DM Sans,sans-serif', outline: 'none',
                resize: 'none', overflowY: 'auto', maxHeight: 120, minHeight: 44,
                boxSizing: 'border-box', lineHeight: 1.5,
                transition: 'border-color 0.18s,box-shadow 0.18s',
                boxShadow: draft.length > 0 ? `0 0 0 3px ${SAFFRON}12` : 'none',
              }}
              onFocus={e => { e.target.style.borderColor = SAFFRON; e.target.style.boxShadow = `0 0 0 3px ${SAFFRON}15` }}
              onBlur={e  => { if (!draft) { e.target.style.borderColor = s.border; e.target.style.boxShadow = 'none' } }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
            />
          </div>
          <button onClick={handleSend} disabled={!draft.trim() || sending}
            style={{
              width: 44, height: 44, borderRadius: 14, border: 'none', cursor: draft.trim() && !sending ? 'pointer' : 'not-allowed',
              background: draft.trim() && !sending ? `linear-gradient(135deg,${SAFFRON},${TERRA})` : tv(isDark,'rgba(255,255,255,0.07)','rgba(0,0,0,0.07)'),
              color: draft.trim() && !sending ? '#fff' : s.muted,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: draft.trim() && !sending ? `0 4px 16px ${SAFFRON}44` : 'none',
              transition: 'background 0.2s,box-shadow 0.2s,transform 0.12s',
            }}
            onMouseDown={e => { if (draft.trim() && !sending) e.currentTarget.style.transform = 'scale(0.91)' }}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            {sending
              ? <Loader size={17} style={{ animation: 'mmh-spin 1s linear infinite' }} />
              : <Send size={16} style={{ transform: 'translateX(1px)' }} />}
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes mmh-shimmer { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes mmh-spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes mmh-fadein   { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes mmh-pulse    { 0%,100%{opacity:1} 50%{opacity:0.45} }
        .mmh-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,159,28,0.2) transparent; }
        .mmh-scroll::-webkit-scrollbar { width: 4px; }
        .mmh-scroll::-webkit-scrollbar-track { background: transparent; }
        .mmh-scroll::-webkit-scrollbar-thumb { background: rgba(255,159,28,0.2); border-radius: 99px; }
        .mmh-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,159,28,0.4); }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'DM Sans,sans-serif' }}>

        {/* Page title (visible in the outer dashboard context) */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

          {/* ── MOBILE: full-screen either list or chat ── */}
          {isMobile ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
              borderRadius: 20, overflow: 'hidden',
              background: s.card, border: `1px solid ${s.border}`, boxShadow: s.shadow,
            }}>
              {mobileView === 'list' ? <ThreadListPanel /> : <ChatPanel />}
            </div>
          ) : (
            /* ── DESKTOP / TABLET: side-by-side ── */
            <div style={{
              flex: 1, display: 'flex', minHeight: 0,
              borderRadius: 20, overflow: 'hidden',
              border: `1px solid ${s.border}`, boxShadow: s.shadow,
            }}>
              <ThreadListPanel />
              <ChatPanel />
            </div>
          )}
        </div>
      </div>

      {/* Staff picker modal */}
      {showPicker && (
        <StaffPicker
          staff={allStaff}
          dark={isDark}
          onSelect={handlePickStaff}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  )
}

export default ManagerMessageHub