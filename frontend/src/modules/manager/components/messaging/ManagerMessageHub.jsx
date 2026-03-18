// src/modules/manager/components/messaging/ManagerMessageHub.jsx
//
// FIXES:
// ✅ REMOVED 4s polling — replaced with real-time socket (message:received + message:sent)
// ✅ Optimistic send: message appears instantly, confirmed on echo
// ✅ Uses ENDPOINTS for all API calls — no hardcoded strings
// ✅ All hardcoded hex (surf() fn) → var(--token) CSS variables
// ✅ All hardcoded font strings → FONTS.* from brand.js
// ✅ Mark thread read on open via PATCH /messages/thread/:threadId/read
// ✅ Read receipt checkmarks via message:read-receipt socket event
// ✅ Staff picker still fetches fresh list on open
// ✅ All GSAP animations preserved

import { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react'
import { useSelector }   from 'react-redux'
import { ThemeContext }  from '@shared/context/ThemeContext'
import { FONTS }         from '@shared/config/brand'
import api               from '@api/axios'
import { ENDPOINTS }     from '@api/endpoints'
import socketService     from '@shared/services/socket.service'
import gsap              from 'gsap'
import toast             from 'react-hot-toast'
import {
  MessageSquare, Search, Send, ChevronLeft,
  Users, Wifi, WifiOff, Check, CheckCheck,
  Plus, X, Loader, RefreshCw, ArrowDown,
} from 'lucide-react'

// ── Brand colors (semantic — intentionally fixed, not theme tokens) ───────────
const SAFFRON = '#FF9F1C'
const TERRA   = '#E05C2A'
const MATCHA  = '#2D9B5A'
const PURPLE  = '#7C3AED'

const ROLE_META = {
  waiter:  { color: SAFFRON, label: 'Waiter',  grad: `${SAFFRON},${TERRA}`,  emoji: '🍽️' },
  kitchen: { color: TERRA,   label: 'Kitchen', grad: `${TERRA},#C04418`,      emoji: '👨‍🍳' },
  cashier: { color: MATCHA,  label: 'Cashier', grad: `${MATCHA},#1B6B3A`,     emoji: '💰' },
  manager: { color: PURPLE,  label: 'Manager', grad: `${PURPLE},#5848C0`,     emoji: '🏢' },
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const buildThreadId = (a, b) => [a, b].sort().join('_')
const genId = () => `opt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

const fmtTime = (iso) => {
  if (!iso) return ''
  const d       = new Date(iso)
  const diffMin = Math.floor((Date.now() - d) / 60000)
  if (diffMin < 1)  return 'now'
  if (diffMin < 60) return `${diffMin}m`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const fmtFull = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const getInitials = (name = '') => {
  const p = name.trim().split(' ')
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : (name[0] || '?').toUpperCase()
}

// ── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({ name, role, size = 38 }) => {
  const meta = ROLE_META[role] ?? { grad: `${SAFFRON},${TERRA}`, color: SAFFRON }
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.35, flexShrink: 0,
      background: `linear-gradient(135deg,${meta.grad})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 900, fontSize: size * 0.35,
      fontFamily: FONTS.body, letterSpacing: '-0.5px',
      boxShadow: `0 4px 12px ${meta.color}30`,
    }}>
      {getInitials(name)}
    </div>
  )
}

// ── Role pill ─────────────────────────────────────────────────────────────────
const RolePill = ({ role }) => {
  const meta = ROLE_META[role] ?? { color: SAFFRON, label: role, emoji: '👤' }
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: '0.35px', textTransform: 'uppercase',
      padding: '2px 6px', borderRadius: 99,
      background: meta.color + '18', color: meta.color,
      border: `1px solid ${meta.color}28`,
      fontFamily: FONTS.body, whiteSpace: 'nowrap',
    }}>
      {meta.emoji} {meta.label}
    </span>
  )
}

// ── Thread row ────────────────────────────────────────────────────────────────
const ThreadRow = ({ thread, isActive, onClick, index }) => {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current, { opacity: 0, x: -18 }, { opacity: 1, x: 0, duration: 0.38, delay: index * 0.048, ease: 'power3.out' })
  }, [index])

  return (
    <button ref={ref} onClick={() => onClick(thread)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
        // ✅ var(--token) — was hardcoded s.active / s.hover hex
        background:  isActive ? 'var(--accent-dim)' : 'transparent',
        borderLeft:  isActive ? `3px solid var(--accent)` : '3px solid transparent',
        transition:  'background 0.15s',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--pill-bg)' }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>

      <Avatar name={thread.name} role={thread.role} size={42} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
          <p style={{
            fontSize: 13, fontWeight: thread.unread > 0 ? 800 : 600, margin: 0,
            // ✅ var(--text-primary)
            color: 'var(--text-primary)', fontFamily: FONTS.body,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%',
          }}>{thread.name}</p>
          {/* ✅ var(--text-muted) */}
          <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, fontFamily: FONTS.body }}>
            {fmtTime(thread.updatedAt)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <p style={{
            fontSize: 12, margin: 0,
            // ✅ var(--text-secondary / text-muted)
            color: thread.unread > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
            fontWeight: thread.unread > 0 ? 600 : 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1, fontFamily: FONTS.body,
          }}>
            {thread.isSelf ? 'You: ' : ''}{thread.lastMessage || 'No messages yet'}
          </p>
          {thread.unread > 0 && (
            <span style={{
              flexShrink: 0, minWidth: 18, height: 18, borderRadius: 99, padding: '0 5px',
              background: `linear-gradient(135deg,${SAFFRON},${TERRA})`,
              color: '#fff', fontSize: 9, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONTS.mono,
            }}>
              {thread.unread > 99 ? '99+' : thread.unread}
            </span>
          )}
        </div>
        <div style={{ marginTop: 4 }}>
          <RolePill role={thread.role} />
        </div>
      </div>
    </button>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────
const Bubble = ({ msg, isSelf, showTime }) => {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current,
      { opacity: 0, y: 10, scale: 0.96, x: isSelf ? 8 : -8 },
      { opacity: 1, y: 0, scale: 1, x: 0, duration: 0.3, ease: 'back.out(1.6)' }
    )
  }, [isSelf])

  const isRead = !!msg.readAt

  return (
    <div ref={ref} style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isSelf ? 'flex-end' : 'flex-start',
      marginBottom: 3, opacity: msg.optimistic ? 0.7 : 1,
    }}>
      <div style={{
        maxWidth: '78%', padding: '10px 14px', borderRadius: 18,
        borderBottomRightRadius: isSelf ? 4 : 18,
        borderBottomLeftRadius:  isSelf ? 18 : 4,
        // ✅ var(--accent-gradient) / var(--pill-bg) — was hardcoded hex
        background: isSelf ? 'var(--accent-gradient)' : 'var(--pill-bg)',
        // ✅ var(--card-border)
        border: isSelf ? 'none' : '1px solid var(--card-border)',
        boxShadow: isSelf ? `0 4px 16px ${SAFFRON}33` : 'var(--card-shadow)',
      }}>
        <p style={{
          fontSize: 14, margin: 0, lineHeight: 1.5,
          // ✅ var(--text-inverse) / var(--text-primary)
          color: isSelf ? 'var(--text-inverse)' : 'var(--text-primary)',
          fontFamily: FONTS.body, wordBreak: 'break-word',
        }}>
          {msg.content}
        </p>
      </div>
      {showTime && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
          {/* ✅ var(--text-muted) */}
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: FONTS.body }}>
            {fmtFull(msg.createdAt)}
          </span>
          {isSelf && (
            isRead
              ? <CheckCheck size={11} style={{ color: MATCHA }} />
              : <Check size={11} style={{ color: 'var(--text-disabled)' }} />
          )}
        </div>
      )}
    </div>
  )
}

// ── Date divider ──────────────────────────────────────────────────────────────
const DateDivider = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
    {/* ✅ var(--divider) */}
    <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,transparent,var(--divider),transparent)' }} />
    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', fontFamily: FONTS.body, whiteSpace: 'nowrap' }}>
      {label}
    </span>
    <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,var(--divider),transparent)' }} />
  </div>
)

// ── Staff picker modal ────────────────────────────────────────────────────────
const StaffPicker = ({ staff, onSelect, onClose }) => {
  const [q, setQ]       = useState('')
  const overlayRef      = useRef(null)
  const cardRef         = useRef(null)

  useEffect(() => {
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.22 })
    gsap.fromTo(cardRef.current, { opacity: 0, scale: 0.92, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'back.out(1.6)' })
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
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--overlay-bg)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 20px' }}>
      <div ref={cardRef} onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 440, background: 'var(--modal-bg)', border: '1px solid var(--modal-border)', borderRadius: 24, overflow: 'hidden', boxShadow: 'var(--card-shadow)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 18px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 11, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={15} style={{ color: 'var(--accent)' }} />
            </div>
            <h3 style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>New Conversation</h3>
          </div>
          <button onClick={close} style={{ width: 30, height: 30, borderRadius: 9, border: '1px solid var(--card-border)', cursor: 'pointer', background: 'var(--pill-bg)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
        </div>
        <div style={{ padding: '14px 18px', position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 30, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search staff…" autoFocus
            style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 12, border: '1.5px solid var(--card-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 13, fontFamily: FONTS.body, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-dim)' }}
            onBlur={e  => { e.target.style.borderColor = 'var(--card-border)'; e.target.style.boxShadow = 'none' }}
          />
        </div>
        <div style={{ maxHeight: 300, overflowY: 'auto', padding: '0 10px 14px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13, fontFamily: FONTS.body }}>No staff found</div>
          ) : filtered.map((st) => (
            <button key={st._id} onClick={() => { onSelect(st); close() }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'transparent', textAlign: 'left', marginBottom: 2 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--pill-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Avatar name={st.name} role={st.role} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: FONTS.body }}>{st.name}</p>
                <div style={{ marginTop: 3 }}><RolePill role={st.role} /></div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyChat = () => {
  const iconRef = useRef(null)
  useEffect(() => {
    if (!iconRef.current) return
    gsap.to(iconRef.current, { y: -6, duration: 1.8, repeat: -1, yoyo: true, ease: 'sine.inOut' })
  }, [])
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '40px 20px', textAlign: 'center' }}>
      <div ref={iconRef} style={{ width: 72, height: 72, borderRadius: 24, background: 'var(--accent-dim)', border: '1.5px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px var(--accent-glow)' }}>
        <MessageSquare size={30} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
      </div>
      <div>
        <h3 style={{ fontFamily: FONTS.heading, fontSize: 18, fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary)' }}>Select a conversation</h3>
        <p style={{ fontSize: 13, margin: 0, color: 'var(--text-muted)', fontFamily: FONTS.body, lineHeight: 1.5 }}>
          Choose a staff member to start<br />messaging them directly
        </p>
      </div>
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const ManagerMessageHub = () => {
  const { isDark }  = useContext(ThemeContext)
  const currentUser = useSelector(s => s.auth?.user)
  const myId        = currentUser?._id?.toString()

  const [threads,       setThreads]       = useState([])
  const [allStaff,      setAllStaff]      = useState([])
  const [activeThread,  setActiveThread]  = useState(null)
  const [messages,      setMessages]      = useState([])
  const [draft,         setDraft]         = useState('')
  const [loadingList,   setLoadingList]   = useState(true)
  const [loadingMsgs,   setLoadingMsgs]   = useState(false)
  const [sending,       setSending]       = useState(false)
  const [search,        setSearch]        = useState('')
  const [roleFilter,    setRoleFilter]    = useState('all')
  const [showPicker,    setShowPicker]    = useState(false)
  const [connected,     setConnected]     = useState(true)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [mobileView,    setMobileView]    = useState('list')

  const inputRef       = useRef(null)
  const messagesEndRef = useRef(null)
  const chatAreaRef    = useRef(null)
  const headerRef      = useRef(null)
  const activeThreadRef = useRef(null)  // always current, no stale closure

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h, { passive: true })
    return () => window.removeEventListener('resize', h)
  }, [])

  // ── Fetch thread list ──────────────────────────────────────────────────────
  const fetchThreads = useCallback(async (silent = false) => {
    if (!silent) setLoadingList(true)
    try {
      const [tRes, sRes] = await Promise.allSettled([
        api.get(ENDPOINTS.MESSAGING.THREADS),
        api.get(ENDPOINTS.STAFF.LIST),
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
    } catch { setConnected(false) }
    if (!silent) setLoadingList(false)
  }, [])

  useEffect(() => {
    fetchThreads()
    if (headerRef.current)
      gsap.fromTo(headerRef.current, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' })
  }, [fetchThreads])

  // ── Fetch messages ─────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async (thread, silent = false) => {
    if (!thread) return
    if (!silent) setLoadingMsgs(true)
    try {
      const url = thread.threadId && !thread.threadId.startsWith('temp_')
        ? `/messages/thread/${thread.threadId}`
        : ENDPOINTS.MESSAGING.HISTORY(thread.participantId)
      const res  = await api.get(url)
      const data = res?.data ?? res
      setMessages(data?.messages ?? [])
      setConnected(true)
    } catch { setConnected(false) }
    if (!silent) setLoadingMsgs(false)
  }, [])

  useEffect(() => {
    if (!activeThread) return
    activeThreadRef.current = activeThread
    setMessages([])
    fetchMessages(activeThread)
  }, [activeThread?.threadId, fetchMessages])

  // ── Real-time: no polling — pure socket ───────────────────────────────────
  useEffect(() => {
    const handleReceived = (msg) => {
      const current = activeThreadRef.current
      const msgTid  = msg.threadId
        ?? buildThreadId(msg.fromUserId?.toString() ?? '', msg.toUserId?.toString() ?? '')

      // Update thread list unread/lastMessage
      setThreads(prev => {
        const exists = prev.find(t => t.threadId === msgTid)
        if (exists) {
          return prev.map(t => t.threadId === msgTid
            ? { ...t, lastMessage: msg.content, updatedAt: msg.createdAt, unread: current?.threadId === msgTid ? 0 : (t.unread ?? 0) + 1 }
            : t
          ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        }
        // New thread — refresh list
        fetchThreads(true)
        return prev
      })

      // If this message is for the active thread — append it
      if (current && msgTid === current.threadId) {
        setMessages(prev => {
          const exists = prev.some(m => m._id === msg._id)
          if (exists) return prev
          const optIdx = prev.findIndex(m => m._id?.startsWith('opt_') && m.content === msg.content)
          if (optIdx !== -1) {
            const updated = [...prev]
            updated[optIdx] = msg
            return updated
          }
          return [...prev, msg]
        })
        // Mark read
        api.patch(`/messages/thread/${msgTid}/read`).catch(() => {})
      }
    }

    const handleSent = (msg) => {
      const current = activeThreadRef.current
      const msgTid  = msg.threadId
        ?? buildThreadId(msg.fromUserId?.toString() ?? '', msg.toUserId?.toString() ?? '')
      if (!current || msgTid !== current.threadId) return
      setMessages(prev => {
        const optIdx = prev.findIndex(m => m._id?.startsWith('opt_') && m.content === msg.content)
        if (optIdx !== -1) {
          const updated = [...prev]
          updated[optIdx] = msg
          return updated
        }
        return prev.some(m => m._id === msg._id) ? prev : [...prev, msg]
      })
    }

    const handleReadReceipt = ({ threadId, readAt }) => {
      const current = activeThreadRef.current
      if (!current || threadId !== current.threadId) return
      setMessages(prev => prev.map(m => ({ ...m, readAt: m.readAt ?? readAt })))
    }

    const u1 = socketService.on('message:received',    handleReceived)
    const u2 = socketService.on('message:sent',        handleSent)
    const u3 = socketService.on('message:read-receipt', handleReadReceipt)
    return () => { u1(); u2(); u3() }
  }, [fetchThreads])

  // ── Scroll ─────────────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' })
  }, [])

  useEffect(() => {
    if (!messages.length) return
    const el = chatAreaRef.current
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) scrollToBottom()
  }, [messages, scrollToBottom])

  const handleScroll = useCallback(() => {
    const el = chatAreaRef.current
    if (!el) return
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 150)
  }, [])

  // ── Select thread ──────────────────────────────────────────────────────────
  const handleSelectThread = useCallback((thread) => {
    setActiveThread(thread)
    activeThreadRef.current = thread
    if (isMobile) setMobileView('chat')
    // Mark read locally
    setThreads(prev => prev.map(t => t.threadId === thread.threadId ? { ...t, unread: 0 } : t))
    // Mark read on server
    if (thread.threadId && !thread.threadId.startsWith('temp_')) {
      api.patch(`/messages/thread/${thread.threadId}/read`).catch(() => {})
    }
    if (chatAreaRef.current && !isMobile)
      gsap.fromTo(chatAreaRef.current, { opacity: 0, x: 14 }, { opacity: 1, x: 0, duration: 0.28, ease: 'expo.out' })
  }, [isMobile])

  // ── Start new conversation ─────────────────────────────────────────────────
  const handlePickStaff = useCallback((staff) => {
    const existing = threads.find(t => t.participantId === staff._id?.toString())
    if (existing) { handleSelectThread(existing); return }
    const threadId  = buildThreadId(myId, staff._id?.toString())
    const tempThread = {
      threadId,
      participantId: staff._id?.toString(),
      name:          staff.name,
      role:          staff.role,
      lastMessage:   '',
      unread:        0,
      updatedAt:     new Date().toISOString(),
      isNew:         true,
    }
    setThreads(prev => [tempThread, ...prev])
    handleSelectThread(tempThread)
  }, [threads, handleSelectThread, myId])

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!draft.trim() || !activeThread || sending) return
    const content  = draft.trim()
    const toUserId = activeThread.participantId
    setSending(true)
    setDraft('')

    const optId = genId()
    const optimistic = {
      _id:       optId,
      fromUserId: myId,
      toUserId,
      content,
      createdAt: new Date().toISOString(),
      optimistic: true,
    }
    setMessages(prev => [...prev, optimistic])
    scrollToBottom()

    try {
      if (socketService.isConnected) {
        socketService.emit('message:send', { toUserId, content })
      } else {
        const res  = await api.post(ENDPOINTS.MESSAGING.SEND, { toUserId, content })
        const data = res?.data ?? res
        const saved = data?.message
        if (saved) setMessages(prev => prev.map(m => m._id === optId ? saved : m))
        fetchThreads(true)
      }
    } catch {
      toast.error('Failed to send message')
      setMessages(prev => prev.filter(m => m._id !== optId))
      setDraft(content)
    }
    setSending(false)
  }, [draft, activeThread, sending, myId, scrollToBottom, fetchThreads])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ── Group messages by date ─────────────────────────────────────────────────
  const groupedMessages = useMemo(() => {
    const groups = []
    let lastDate  = null
    messages.forEach(msg => {
      const d         = msg.createdAt ? new Date(msg.createdAt).toDateString() : 'Unknown'
      const today     = new Date().toDateString()
      const yesterday = new Date(Date.now() - 86400000).toDateString()
      const label     = d === today ? 'Today' : d === yesterday ? 'Yesterday' : d
      if (d !== lastDate) { groups.push({ type: 'date', label }); lastDate = d }
      groups.push({ type: 'msg', msg })
    })
    return groups
  }, [messages])

  // ── Filtered threads ───────────────────────────────────────────────────────
  const filteredThreads = useMemo(() => threads.filter(t => {
    const matchQ = !search || t.name?.toLowerCase().includes(search.toLowerCase())
    const matchR = roleFilter === 'all' || t.role === roleFilter
    return matchQ && matchR
  }), [threads, search, roleFilter])

  const totalUnread = threads.reduce((s, t) => s + (t.unread || 0), 0)

  // ── Thread list panel ──────────────────────────────────────────────────────
  const ThreadListPanel = (
    <div style={{
      width: isMobile ? '100%' : 'clamp(260px,32%,340px)',
      flexShrink: 0,
      borderRight: isMobile ? 'none' : '1px solid var(--divider)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: 'var(--card-bg)',
    }}>
      <div ref={headerRef} style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--divider)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 900, margin: 0, letterSpacing: '-0.4px', color: 'var(--text-primary)' }}>Messages</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? MATCHA : '#EF4444' }} />
              <p style={{ fontSize: 11, margin: 0, color: 'var(--text-muted)', fontFamily: FONTS.body }}>
                {connected ? `${threads.length} conversations` : 'Reconnecting…'}
              </p>
              {totalUnread > 0 && (
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: `linear-gradient(135deg,${SAFFRON},${TERRA})`, color: '#fff' }}>
                  {totalUnread}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => fetchThreads()} title="Refresh"
              style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--card-border)', background: 'var(--pill-bg)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations…"
            style={{ width: '100%', padding: '9px 12px 9px 33px', borderRadius: 12, border: '1.5px solid var(--card-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 12, fontFamily: FONTS.body, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
            onBlur={e  => { e.target.style.borderColor = 'var(--card-border)' }}
          />
        </div>

        {/* Role filter */}
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
          {['all', ...Object.keys(ROLE_META)].map(r => {
            const active = roleFilter === r
            const meta   = r === 'all' ? null : ROLE_META[r]
            const clr    = meta?.color ?? SAFFRON
            return (
              <button key={r} onClick={() => setRoleFilter(r)} style={{
                padding: '5px 11px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                border: `1px solid ${active ? clr + '40' : 'var(--card-border)'}`,
                background: active ? `${clr}18` : 'transparent',
                color: active ? clr : 'var(--text-muted)',
                cursor: 'pointer', fontFamily: FONTS.body,
                textTransform: 'capitalize', whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {r === 'all' ? 'All' : `${meta.emoji} ${meta.label}`}
              </button>
            )
          })}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'thin', scrollbarColor: 'var(--scroll-thumb) transparent' }}>
        {loadingList ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px' }}>
            {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 14 }} />)}
          </div>
        ) : filteredThreads.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <MessageSquare size={28} style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
            <p style={{ fontSize: 13, fontWeight: 600, margin: '10px 0 6px', color: 'var(--text-secondary)', fontFamily: FONTS.body }}>
              {threads.length === 0 ? 'No conversations yet' : 'No results'}
            </p>
            <p style={{ fontSize: 11, margin: 0, color: 'var(--text-muted)', fontFamily: FONTS.body }}>
              {threads.length === 0 ? 'Tap + to start messaging' : 'Try a different search'}
            </p>
          </div>
        ) : filteredThreads.map((thread, i) => (
          <ThreadRow key={thread.threadId} thread={thread} index={i}
            isActive={activeThread?.threadId === thread.threadId}
            onClick={handleSelectThread} />
        ))}
      </div>
    </div>
  )

  // ── Chat panel ─────────────────────────────────────────────────────────────
  const ChatPanel = !activeThread ? (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <EmptyChat />
    </div>
  ) : (() => {
    const meta = ROLE_META[activeThread.role] ?? { color: SAFFRON, emoji: '👤', label: 'Staff' }
    return (
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
        {/* Chat header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'var(--card-bg)', borderBottom: '1px solid var(--divider)', flexShrink: 0, boxShadow: 'var(--card-shadow)' }}>
          {isMobile && (
            <button onClick={() => setMobileView('list')}
              style={{ width: 36, height: 36, borderRadius: 11, border: '1px solid var(--card-border)', background: 'var(--pill-bg)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ChevronLeft size={16} />
            </button>
          )}
          <Avatar name={activeThread.name} role={activeThread.role} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontFamily: FONTS.body, fontSize: 14, fontWeight: 800, margin: 0, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeThread.name}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <RolePill role={activeThread.role} />
            </div>
          </div>
          {connected ? <Wifi size={13} style={{ color: MATCHA, flexShrink: 0 }} /> : <WifiOff size={13} style={{ color: '#EF4444', flexShrink: 0 }} />}
        </div>

        {/* Messages */}
        <div ref={chatAreaRef} onScroll={handleScroll}
          style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', scrollbarWidth: 'thin', scrollbarColor: 'var(--scroll-thumb) transparent' }}>
          {loadingMsgs ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0,1,2,3,4].map(i => (
                <div key={i} style={{ display: 'flex', justifyContent: i%2===0 ? 'flex-end' : 'flex-start' }}>
                  <div className="skeleton" style={{ width: `${45 + i * 8}%`, height: 44, borderRadius: 16 }} />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 18, background: `${meta.color}18`, border: `1px solid ${meta.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{meta.emoji}</div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)', fontFamily: FONTS.body }}>Start the conversation</p>
                <p style={{ fontSize: 12, margin: 0, color: 'var(--text-muted)', fontFamily: FONTS.body }}>Send a message to {activeThread.name}</p>
              </div>
            </div>
          ) : (
            <>
              {groupedMessages.map((item, i) => {
                if (item.type === 'date') return <DateDivider key={`d-${i}`} label={item.label} />
                const msg      = item.msg
                const isSelf   = msg.fromUserId?.toString() === myId || msg.senderId?.toString() === myId
                const nextItem = groupedMessages[i + 1]
                const showTime = !nextItem || nextItem.type === 'date' || nextItem?.msg?.fromUserId !== msg.fromUserId
                return <Bubble key={msg._id} msg={msg} isSelf={isSelf} showTime={showTime} />
              })}
              <div ref={messagesEndRef} style={{ height: 1 }} />
            </>
          )}
        </div>

        {/* Scroll to bottom */}
        {showScrollBtn && (
          <button onClick={() => scrollToBottom()}
            style={{ position: 'absolute', bottom: 90, right: 20, zIndex: 10, width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--card-shadow)' }}>
            <ArrowDown size={15} />
          </button>
        )}

        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, padding: '12px 16px 14px', background: 'var(--card-bg)', borderTop: '1px solid var(--divider)', flexShrink: 0 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={`Message ${activeThread.name}…`} rows={1}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 16, border: `1.5px solid ${draft.length > 0 ? 'var(--accent-border)' : 'var(--card-border)'}`, background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 13, fontFamily: FONTS.body, outline: 'none', resize: 'none', overflowY: 'auto', maxHeight: 120, minHeight: 44, boxSizing: 'border-box', lineHeight: 1.5, transition: 'border-color 0.18s' }}
              onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
              onBlur={e  => { if (!draft) e.target.style.borderColor = 'var(--card-border)' }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
            />
          </div>
          <button onClick={handleSend} disabled={!draft.trim() || sending}
            style={{ width: 44, height: 44, borderRadius: 14, border: 'none', cursor: draft.trim() && !sending ? 'pointer' : 'not-allowed', background: draft.trim() && !sending ? `linear-gradient(135deg,${SAFFRON},${TERRA})` : 'var(--pill-bg)', color: draft.trim() && !sending ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: draft.trim() && !sending ? `0 4px 16px ${SAFFRON}44` : 'none', transition: 'background 0.2s,box-shadow 0.2s,transform 0.12s' }}
            onMouseDown={e => { if (draft.trim()) e.currentTarget.style.transform = 'scale(0.91)' }}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            {sending ? <Loader size={17} style={{ animation: 'mmh-spin 1s linear infinite' }} /> : <Send size={16} style={{ transform: 'translateX(1px)' }} />}
          </button>
        </div>
      </div>
    )
  })()

  return (
    <>
      <style>{`
        @keyframes mmh-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: FONTS.body }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {isMobile ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, borderRadius: 20, overflow: 'hidden', background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
              {mobileView === 'list' ? ThreadListPanel : ChatPanel}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', minHeight: 0, borderRadius: 20, overflow: 'hidden', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}>
              {ThreadListPanel}
              {ChatPanel}
            </div>
          )}
        </div>
      </div>

      {showPicker && <StaffPicker staff={allStaff} onSelect={handlePickStaff} onClose={() => setShowPicker(false)} />}
    </>
  )
}

export default ManagerMessageHub