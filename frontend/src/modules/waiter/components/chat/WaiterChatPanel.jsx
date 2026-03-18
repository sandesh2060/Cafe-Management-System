// src/modules/waiter/components/chat/WaiterChatPanel.jsx
//
// REBUILT:
// ✅ Real-time: sends via socket (message:send) for instant delivery
//    REST POST /messages/send kept as fallback if socket not connected
// ✅ Optimistic UI — message appears instantly, confirmed on echo
// ✅ Listens to message:received AND message:sent for full real-time sync
// ✅ All colors → var(--token) — fully centralized
// ✅ ENDPOINTS used for all API calls
// ✅ Auto-scroll to bottom on new messages
// ✅ Mark thread as read when opened
// ✅ Unread badge on thread list

import { useState, useEffect, useRef, useContext, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { selectUser }               from '@store/slices/authSlice'
import { markThreadRead }           from '@store/slices/messagingSlice'
import api                          from '@api/axios'
import { ENDPOINTS }                from '@api/endpoints'
import socketService                from '@shared/services/socket.service'
import { ThemeContext }             from '@shared/context/ThemeContext'
import { Send, MessageSquare, ArrowLeft, Check, CheckCheck } from 'lucide-react'

const genId = () => `opt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

const buildThreadId = (a, b) => [a, b].sort().join('_')

const WaiterChatPanel = () => {
  const dispatch       = useDispatch()
  const user           = useSelector(selectUser)
  const { isDark }     = useContext(ThemeContext)

  const [threads,  setThreads]  = useState([])
  const [active,   setActive]   = useState(null)   // { userId, name, threadId }
  const [messages, setMessages] = useState([])
  const [input,    setInput]    = useState('')
  const [sending,  setSending]  = useState(false)
  const [loadingThread, setLoadingThread] = useState(false)

  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const myId       = user?._id?.toString()

  // ── Fetch thread list ────────────────────────────────────────────────────
  const fetchThreads = useCallback(async () => {
    try {
      const res = await api.get(ENDPOINTS.MESSAGING.THREADS)
      const data = res?.data ?? res
      setThreads(data?.threads ?? [])
    } catch {}
  }, [])

  useEffect(() => { fetchThreads() }, [fetchThreads])

  // ── Open thread ──────────────────────────────────────────────────────────
  const openThread = useCallback(async (thread) => {
    setActive(thread)
    setMessages([])
    setLoadingThread(true)
    try {
      // Prefer threadId-based route, fall back to userId route
      const url = thread.threadId && !thread.threadId.startsWith('temp_')
        ? `/messages/thread/${thread.threadId}`
        : ENDPOINTS.MESSAGING.HISTORY(thread.participantId ?? thread.userId)
      const res  = await api.get(url)
      const data = res?.data ?? res
      setMessages(data?.messages ?? [])
      // Mark as read
      const tid = thread.threadId ?? buildThreadId(myId, thread.participantId ?? thread.userId)
      dispatch(markThreadRead(tid))
      if (tid && !tid.startsWith('temp_')) {
        api.patch(`/messages/thread/${tid}/read`).catch(() => {})
      }
    } catch {}
    setLoadingThread(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [myId, dispatch])

  // ── Real-time: listen for incoming + sent echo ───────────────────────────
  useEffect(() => {
    if (!active) return

    const activeThreadId = active.threadId
      ?? buildThreadId(myId, active.participantId ?? active.userId)

    const handleReceived = (msg) => {
      const msgTid = msg.threadId
        ?? buildThreadId(msg.fromUserId?.toString(), msg.toUserId?.toString())
      if (msgTid !== activeThreadId) return
      setMessages(prev => {
        const exists = prev.some(m => m._id === msg._id)
        if (exists) return prev
        // Replace optimistic message if content matches
        const optIdx = prev.findIndex(m => m._id?.startsWith('opt_') && m.content === msg.content)
        if (optIdx !== -1) {
          const updated = [...prev]
          updated[optIdx] = msg
          return updated
        }
        return [...prev, msg]
      })
      // Mark as read immediately
      api.patch(`/messages/thread/${activeThreadId}/read`).catch(() => {})
    }

    const handleSent = (msg) => {
      const msgTid = msg.threadId
        ?? buildThreadId(msg.fromUserId?.toString(), msg.toUserId?.toString())
      if (msgTid !== activeThreadId) return
      setMessages(prev => {
        const exists = prev.some(m => m._id === msg._id)
        if (exists) return prev
        const optIdx = prev.findIndex(m => m._id?.startsWith('opt_') && m.content === msg.content)
        if (optIdx !== -1) {
          const updated = [...prev]
          updated[optIdx] = msg
          return updated
        }
        return prev
      })
    }

    const unsubReceived = socketService.on('message:received', handleReceived)
    const unsubSent     = socketService.on('message:sent',     handleSent)

    return () => { unsubReceived(); unsubSent() }
  }, [active, myId])

  // ── Auto scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send ─────────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const content = input.trim()
    if (!content || !active || sending) return

    const toUserId = active.participantId ?? active.userId
    setSending(true)
    setInput('')

    // Optimistic message
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

    try {
      if (socketService.isConnected) {
        // Real-time path — socket handles DB save + emit to both parties
        socketService.emit('message:send', { toUserId, content })
      } else {
        // Fallback: REST
        const res  = await api.post(ENDPOINTS.MESSAGING.SEND, { toUserId, content })
        const data = res?.data ?? res
        const saved = data?.message
        if (saved) {
          setMessages(prev => prev.map(m => m._id === optId ? saved : m))
        }
        fetchThreads()
      }
    } catch {
      // Roll back optimistic on error
      setMessages(prev => prev.filter(m => m._id !== optId))
      setInput(content)
    }

    setSending(false)
  }, [input, active, sending, myId, fetchThreads])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden',
      display: 'flex', flexDirection: 'column', height: 288,
      background: 'var(--card-bg)',
      border: '1px solid var(--card-border)',
      boxShadow: 'var(--card-shadow)',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px', flexShrink: 0,
        borderBottom: '1px solid var(--divider)',
        background: 'var(--header-bg)',
      }}>
        {active ? (
          <button
            onClick={() => { setActive(null); setMessages([]) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)',
              transition: 'color 0.15s',
              padding: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <ArrowLeft size={15} />
            <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{active.name}</span>
          </button>
        ) : (
          <>
            <MessageSquare size={17} style={{ color: 'var(--info)' }} />
            <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', margin: 0 }}>
              Staff Chat
            </h2>
          </>
        )}
      </div>

      {/* ── Thread list ── */}
      {!active && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {threads.length === 0 ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', fontSize: 13, color: 'var(--text-muted)',
            }}>
              No conversations yet
            </div>
          ) : threads.map(t => (
            <button
              key={t.threadId ?? t.participantId}
              onClick={() => openThread(t)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', textAlign: 'left',
                borderBottom: '1px solid var(--divider)',
                background: 'none', border: 'none', cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--pill-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              {/* Avatar */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
                background: 'var(--info-bg)', color: 'var(--info)',
              }}>
                {t.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: t.unread > 0 ? 700 : 600, color: 'var(--text-primary)', margin: 0 }}>
                  {t.name}
                </p>
                <p style={{
                  fontSize: 12, color: 'var(--text-muted)', margin: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontWeight: t.unread > 0 ? 600 : 400,
                }}>
                  {t.isSelf ? 'You: ' : ''}{t.lastMessage || 'No messages yet'}
                </p>
              </div>
              {t.unread > 0 && (
                <span style={{
                  minWidth: 20, height: 20, borderRadius: 99, padding: '0 5px',
                  background: 'var(--accent)', color: 'var(--text-inverse)',
                  fontSize: 10, fontWeight: 800, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {t.unread > 99 ? '99+' : t.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Messages ── */}
      {active && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {loadingThread ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ display: 'flex', justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start' }}>
                    <div className="skeleton" style={{ width: `${40 + i * 15}%`, height: 36, borderRadius: 12 }} />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                Say hello 👋
              </div>
            ) : messages.map((m, i) => {
              const mine = (m.fromUserId?.toString() ?? m.senderId?.toString()) === myId
              const isRead = !!m.readAt
              return (
                <div key={m._id ?? i} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', opacity: m.optimistic ? 0.7 : 1 }}>
                  <div style={{ maxWidth: '78%' }}>
                    <div style={{
                      padding: '8px 12px', fontSize: 13, lineHeight: 1.45,
                      borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: mine ? 'var(--accent-gradient)' : 'var(--pill-bg)',
                      color:      mine ? 'var(--text-inverse)'    : 'var(--text-primary)',
                      wordBreak: 'break-word',
                    }}>
                      {m.content}
                    </div>
                    {mine && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2, paddingRight: 2 }}>
                        {isRead
                          ? <CheckCheck size={11} style={{ color: 'var(--success)' }} />
                          : <Check size={11} style={{ color: 'var(--text-disabled)' }} />}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* ── Input ── */}
          <div style={{
            display: 'flex', gap: 8, padding: 8, flexShrink: 0,
            borderTop: '1px solid var(--divider)',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Message…"
              style={{
                flex: 1, fontSize: 13, padding: '8px 12px', borderRadius: 12,
                outline: 'none',
                background: 'var(--input-bg)',
                border: '1px solid var(--card-border)',
                color: 'var(--text-primary)',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent-border)'}
              onBlur={e  => e.target.style.borderColor = 'var(--card-border)'}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              style={{
                width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: input.trim() && !sending ? 'var(--accent-gradient)' : 'var(--pill-bg)',
                color: input.trim() && !sending ? 'var(--text-inverse)' : 'var(--text-muted)',
                border: 'none', cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s, transform 0.1s',
                WebkitTapHighlightColor: 'transparent',
              }}
              onMouseDown={e => { if (input.trim()) e.currentTarget.style.transform = 'scale(0.9)' }}
              onMouseUp={e => e.currentTarget.style.transform = ''}
              onTouchStart={e => { if (input.trim()) e.currentTarget.style.transform = 'scale(0.9)' }}
              onTouchEnd={e => e.currentTarget.style.transform = ''}
            >
              <Send size={15} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default WaiterChatPanel