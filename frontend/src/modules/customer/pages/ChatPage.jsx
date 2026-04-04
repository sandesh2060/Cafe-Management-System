// frontend/src/modules/customer/pages/ChatPage.jsx
//
// FIXES:
// ✅ ctxMenu state inside ChatPage (was outside component — caused crash)
// ✅ handleDeleteChat inside ChatPage (was inside Avatar — wrong scope)
// ✅ chatLoading state removed (was unused after nav-immediately fix)
// ✅ ChatRow passes onLongPress correctly
// ✅ Online strip — Instagram Stories style, mutual friends only, instant nav
// ✅ Zero lag — no await before navigation anywhere

import { useEffect, useState, useRef, useContext, useMemo, useCallback } from 'react'
import { useDispatch, useSelector }   from 'react-redux'
import { useNavigate }                from 'react-router-dom'
import { ThemeContext }               from '@shared/context/ThemeContext'
import { FONTS }                      from '@shared/config/brand'
import {
  fetchRecentChats, selectRecentChats,
  deleteChat, chatDeleted,
}                                     from '@store/slices/socialChatSlice'
import {
  fetchCustomers, selectCustomers, selectOnlineUsers,
  isFriends, updateStatus,
}                                     from '@store/slices/followSlice'
import { selectUser }                 from '@store/slices/authSlice'
import socketService                  from '@shared/services/socket.service'

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────
function useTokens(D) {
  return {
    F: { heading:FONTS.heading, body:FONTS.body, mono:FONTS.mono, brand:FONTS.brand },
    S: {
      pageH: 'max(16px, calc(env(safe-area-inset-top, 0px) + 12px))',
      pageB: 'max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px))',
      px: 16,
    },
    R: { search:14, backBtn:12, card:18, badge:99 },
    headerBg:     'var(--header-bg)',
    headerBorder: 'var(--header-border)',
    headerBlur:   'blur(28px) saturate(180%)',
    headerGloss:  D
      ? 'linear-gradient(90deg,transparent,rgba(255,255,255,0.06) 50%,transparent)'
      : 'linear-gradient(90deg,transparent,rgba(255,255,255,0.55) 50%,transparent)',
    backBg:     D ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    backBorder: D ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.09)',
    titleColor: 'var(--text-primary)',
    subColor:   'var(--text-muted)',
    searchBg:          'var(--input-bg)',
    searchBorder:      'var(--input-border)',
    searchFocusBorder: 'var(--input-border-focus)',
    searchFocusShadow: 'var(--input-shadow-focus)',
    searchColor: 'var(--text-primary)',
    searchIcon:  'var(--text-muted)',
    labelColor:  'var(--text-muted)',
    onlineDot:     '#22c55e',
    onlineDotGlow: 'rgba(34,197,94,0.65)',
    onlineBorder:  'var(--modal-bg)',
    onlinePulse:   'rgba(34,197,94,0.45)',
    rowBg:       'transparent',
    rowBgUnread: D ? 'rgba(255,159,28,0.07)' : 'rgba(255,159,28,0.06)',
    rowActive:   D ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    nameColor:   'var(--text-primary)',
    previewColor:'var(--text-muted)',
    previewUnread: D ? 'rgba(255,220,160,0.80)' : 'rgba(60,30,5,0.80)',
    timeColor:   'var(--text-muted)',
    badgeBg:     '#ef4444',
    badgeColor:  '#fff',
    divider:     D ? 'rgba(255,255,255,0.05)' : 'rgba(180,100,20,0.07)',
    stripBorder: D ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    avatarColors: ['#92400E','#065F46','#1E40AF','#6D28D9','#9D174D','#B45309','#0E7490','#166534'],
    emptyTitle:     'var(--text-primary)',
    emptyBody:      'var(--text-muted)',
    emptyBtnBg:     'var(--accent-gradient)',
    emptyBtnShadow: '0 6px 20px var(--accent-glow)',
    emptyBtnColor:  '#fff',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const getAvatarUrl = u =>
  u?.avatar || u?.avatarUrl || u?.profileImage || u?.profilePic ||
  u?.photo  || u?.picture   || u?.image        || u?.photoURL   || null

const timeAgo = d => {
  if (!d) return ''
  const m = Math.floor((Date.now() - new Date(d)) / 60000)
  if (m < 1)  return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar — shared by strip + rows
// ─────────────────────────────────────────────────────────────────────────────
const Avatar = ({ user, size = 48, online = false, T, pulse = false }) => {
  const url      = getAvatarUrl(user)
  const initials = (user?.name || '?').slice(0, 2).toUpperCase()
  const bg       = T.avatarColors[(user?.name?.charCodeAt(0) ?? 0) % T.avatarColors.length]

  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      {url && (
        <img
          src={url} alt={user?.name ?? 'User'} loading="lazy" decoding="async"
          style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', display:'block' }}
          onError={e => {
            e.currentTarget.style.display = 'none'
            if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex'
          }}
        />
      )}
      <div style={{
        width:size, height:size, borderRadius:'50%',
        background:`linear-gradient(135deg,${bg},${bg}bb)`,
        display: url ? 'none' : 'flex',
        alignItems:'center', justifyContent:'center',
        color:'#fff', fontWeight:800, fontSize:size*0.32,
        fontFamily:T.F.heading, letterSpacing:'-0.02em',
      }}>
        {initials}
      </div>
      {online && (
        <>
          {pulse && (
            <div style={{
              position:'absolute', bottom:-1, right:-1,
              width:14, height:14, borderRadius:'50%',
              background:T.onlinePulse,
              animation:'cp-pulse 2s ease-out infinite',
            }}/>
          )}
          <div style={{
            position:'absolute', bottom:1, right:1,
            width: size > 44 ? 12 : 10,
            height: size > 44 ? 12 : 10,
            borderRadius:'50%', background:T.onlineDot,
            border:`2px solid ${T.onlineBorder}`,
            boxShadow:`0 0 8px ${T.onlineDotGlow}`, zIndex:2,
          }}/>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OnlineStrip — Instagram Stories style
// Only mutual friends who are online. Tap → /chat/:id instantly.
// ─────────────────────────────────────────────────────────────────────────────
const OnlineStrip = ({ friends, T, onTap, onlineFriendIds }) => {
  if (!friends.length) return null
  const onlineCount = friends.filter(f => onlineFriendIds?.has(f._id)).length

  return (
    <div style={{
      borderBottom: `1px solid ${T.stripBorder}`,
      background: 'var(--bg)',
    }}>
      {/* Label */}
      <div style={{
        display:'flex', alignItems:'center', gap:6,
        padding:`10px ${T.S.px}px 8px`,
      }}>
        {/* Pulsing green indicator */}
        <div style={{ position:'relative', width:8, height:8, flexShrink:0 }}>
          <div style={{
            position:'absolute', inset:0, borderRadius:'50%',
            background:T.onlineDot,
            animation:'cp-pulse 2s ease-out infinite', opacity:0.5,
          }}/>
          <div style={{
            position:'absolute', inset:1, borderRadius:'50%',
            background:T.onlineDot,
            boxShadow:`0 0 6px ${T.onlineDotGlow}`,
          }}/>
        </div>
        <span style={{
          fontSize:10, fontWeight:700, letterSpacing:'0.08em',
          textTransform:'uppercase', color:T.labelColor, fontFamily:T.F.body,
        }}>
          {onlineCount > 0 ? `Active now · ${onlineCount}` : 'Friends'}
        </span>
      </div>

      {/* Horizontal scroll strip */}
      <div
        data-lenis-prevent
        style={{
          display:'flex', gap:16,
          padding:`0 ${T.S.px}px 12px`,
          overflowX:'auto', WebkitOverflowScrolling:'touch',
          scrollbarWidth:'none',
        }}
      >
        {friends.map((u, i) => (
          <button
            key={u._id}
            onClick={() => onTap(u._id)}
            style={{
              flexShrink:0, display:'flex', flexDirection:'column',
              alignItems:'center', gap:5,
              background:'none', border:'none', cursor:'pointer',
              padding:0, WebkitTapHighlightColor:'transparent',
              opacity:0, animation:`cp-fadein 0.28s ease ${i * 35}ms forwards`,
            }}
          >
            {/* Online → spinning green ring. Offline → plain avatar */}
            {onlineFriendIds?.has(u._id) ? (
              <div style={{
                borderRadius:'50%', padding:2,
                background:`conic-gradient(${T.onlineDot}, rgba(34,197,94,0.4), ${T.onlineDot})`,
                animation:'cp-ring-spin 4s linear infinite',
              }}>
                <div style={{ borderRadius:'50%', background:'var(--bg)', padding:2 }}>
                  <Avatar user={u} size={46} online={false} T={T}/>
                </div>
              </div>
            ) : (
              <div style={{ borderRadius:'50%', padding:2, background:'var(--divider)' }}>
                <div style={{ borderRadius:'50%', background:'var(--bg)', padding:2 }}>
                  <Avatar user={u} size={46} online={false} T={T}/>
                </div>
              </div>
            )}

            <span style={{
              fontSize:10, fontWeight: onlineFriendIds?.has(u._id) ? 700 : 500,
              color: onlineFriendIds?.has(u._id) ? 'var(--text-secondary)' : 'var(--text-muted)',
              fontFamily:T.F.body,
              whiteSpace:'nowrap', maxWidth:56,
              overflow:'hidden', textOverflow:'ellipsis', textAlign:'center',
            }}>
              {u.name?.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ChatRow — single recent conversation with long-press
// ─────────────────────────────────────────────────────────────────────────────
const ChatRow = ({ chat, online, T, onClick, onLongPress, index }) => {
  const { otherUser, lastMessage, unreadCount } = chat
  const unread    = unreadCount ?? 0
  const ref       = useRef(null)
  const longTimer = useRef(null)

  const press = () => {
    if (!ref.current) return
    ref.current.style.background = T.rowActive
    setTimeout(() => {
      if (ref.current) ref.current.style.background = unread > 0 ? T.rowBgUnread : T.rowBg
    }, 180)
  }

  const onTouchStart = e => {
    longTimer.current = setTimeout(
      () => onLongPress(chat, e.touches[0].clientX, e.touches[0].clientY),
      500
    )
  }
  const onTouchEnd = () => clearTimeout(longTimer.current)

  return (
    <div
      ref={ref}
      onClick={() => { press(); onClick() }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onContextMenu={e => { e.preventDefault(); onLongPress(chat, e.clientX, e.clientY) }}
      style={{
        display:'flex', alignItems:'center', gap:12,
        padding:`13px ${T.S.px}px`,
        borderBottom:`1px solid ${T.divider}`,
        background: unread > 0 ? T.rowBgUnread : T.rowBg,
        cursor:'pointer', WebkitTapHighlightColor:'transparent',
        transition:'background 0.18s ease',
        opacity:0, animation:`cp-fadein 0.35s ease ${index * 45}ms forwards`,
      }}
    >
      <Avatar user={otherUser} size={52} online={online} T={T} pulse={online}/>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:3 }}>
          <span style={{
            fontSize:14, fontWeight:unread > 0 ? 800 : 600,
            letterSpacing:'-0.02em', lineHeight:1.2,
            color:T.nameColor, fontFamily:T.F.heading,
            overflow:'hidden', textOverflow:'ellipsis',
            whiteSpace:'nowrap', maxWidth:'65%',
          }}>
            {otherUser?.name}
          </span>
          <span style={{
            fontSize:11, fontWeight:500, flexShrink:0, marginLeft:8,
            color:T.timeColor, fontFamily:T.F.mono,
          }}>
            {timeAgo(lastMessage?.createdAt)}
          </span>
        </div>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{
            fontSize:12, fontWeight:unread > 0 ? 600 : 400,
            color:unread > 0 ? T.previewUnread : T.previewColor,
            fontFamily:T.F.body, lineHeight:1.4,
            overflow:'hidden', textOverflow:'ellipsis',
            whiteSpace:'nowrap', maxWidth:'80%',
          }}>
            {lastMessage?.fromMe ? '↗ ' : ''}{lastMessage?.content ?? 'Say hi 👋'}
          </span>
          {unread > 0 && (
            <div style={{
              flexShrink:0, marginLeft:8, minWidth:20, height:20,
              borderRadius:T.R.badge,
              display:'flex', alignItems:'center', justifyContent:'center',
              padding:'0 6px', background:T.badgeBg,
              boxShadow:'0 2px 8px rgba(239,68,68,0.45)',
              fontSize:10, fontWeight:800,
              color:T.badgeColor, fontFamily:T.F.mono,
            }}>
              {unread > 9 ? '9+' : unread}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SearchResult
// ─────────────────────────────────────────────────────────────────────────────
const SearchResult = ({ user, online, T, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display:'flex', alignItems:'center', gap:12,
      padding:'10px 12px', borderRadius:T.R.card, marginBottom:8,
      cursor:'pointer', background:'var(--card-bg)',
      border:'1px solid var(--card-border)',
      WebkitTapHighlightColor:'transparent',
    }}
  >
    <Avatar user={user} size={42} online={online} T={T}/>
    <div style={{ flex:1, minWidth:0 }}>
      <p style={{
        margin:0, fontSize:14, fontWeight:700, letterSpacing:'-0.02em',
        color:T.nameColor, fontFamily:T.F.heading,
        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
      }}>
        {user.name}
      </p>
      {user.username && (
        <p style={{ margin:'1px 0 0', fontSize:11, fontWeight:500, color:T.subColor, fontFamily:T.F.body }}>
          @{user.username}
          {online && <span style={{ color:T.onlineDot, fontWeight:700 }}> · Active</span>}
        </p>
      )}
    </div>
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0, opacity:0.35 }}>
      <path d="M6 4l4 4-4 4" stroke="var(--text-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// ChatPage
// ─────────────────────────────────────────────────────────────────────────────
const ChatPage = () => {
  const dispatch      = useDispatch()
  const navigate      = useNavigate()
  const { isDark: D } = useContext(ThemeContext)
  const T             = useTokens(D)

  const recentChats = useSelector(selectRecentChats)
  const customers   = useSelector(selectCustomers)
  const rawOnline   = useSelector(selectOnlineUsers)
  const me          = useSelector(selectUser)

  const onlineSet = useMemo(() => {
    if (rawOnline instanceof Set)  return rawOnline
    if (Array.isArray(rawOnline))  return new Set(rawOnline)
    return new Set()
  }, [rawOnline])

  // ── ALL state lives here ──────────────────────────────────────────────────
  const [search,        setSearch]        = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching,     setSearching]     = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [ctxMenu,       setCtxMenu]       = useState(null) // { chat, x, y }

  const timerRef = useRef(null)
  const inputRef = useRef(null)
  const myId     = useMemo(() => me?._id ?? me?.id ?? null, [me])

  useEffect(() => {
    dispatch(fetchRecentChats())
    dispatch(fetchCustomers())
  }, [dispatch])

  // ── Socket: follow accepted → refresh ─────────────────────────────────────
  useEffect(() => {
    if (!myId) return
    const onAccepted = ({ by }) => {
      if (by?._id) dispatch(updateStatus({ userId: by._id, status: 'mutual' }))
      dispatch(fetchRecentChats())
      dispatch(fetchCustomers())
    }
    const onStatus = ({ userId, status }) => {
      if (status === 'mutual' || status === 'friends') {
        dispatch(updateStatus({ userId, status }))
        dispatch(fetchRecentChats())
      }
    }
    const u1 = socketService.on('follow:accepted',      onAccepted)
    const u2 = socketService.on('follow:status_update', onStatus)
    return () => { u1?.(); u2?.() }
  }, [myId, dispatch])

  // ── Strip friends — online mutual friends first, then offline mutual friends
  // Both groups show only mutual (friends/mutual) — online get green dot, offline don't
  const stripFriends = useMemo(() => {
    const mutual = customers.filter(c => c._id !== myId && isFriends(c.followStatus))
    const online  = mutual.filter(c =>  onlineSet.has(c._id))
    const offline = mutual.filter(c => !onlineSet.has(c._id))
    return [...online, ...offline]
  }, [customers, onlineSet, myId])

  // Keep onlineFriends for the header subtitle count
  const onlineFriends = useMemo(() =>
    customers.filter(c => c._id !== myId && onlineSet.has(c._id) && isFriends(c.followStatus))
  , [customers, onlineSet, myId])

  // ── Navigation — instant, no await ───────────────────────────────────────
  const handleChatNav = useCallback((userId) => {
    navigate(`/chat/${userId}`)
  }, [navigate])

  // ── Delete chat ───────────────────────────────────────────────────────────
  const handleDeleteChat = useCallback(async (threadId) => {
    setCtxMenu(null)
    dispatch(chatDeleted({ threadId }))          // optimistic
    dispatch(deleteChat(threadId))               // API
  }, [dispatch])

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = useCallback((val) => {
    setSearch(val)
    clearTimeout(timerRef.current)
    if (!val.trim()) { setSearchResults([]); setSearching(false); return }
    setSearching(true)
    timerRef.current = setTimeout(async () => {
      const res   = await dispatch(fetchCustomers({ search: val, limit: 10 }))
      const users = res.payload?.data?.users ?? res.payload?.users ?? []
      setSearchResults(users.filter(u => u._id !== myId && isFriends(u.followStatus)))
      setSearching(false)
    }, 380)
  }, [dispatch, myId])

  const clearSearch = useCallback(() => {
    setSearch(''); setSearchResults([]); setSearching(false)
    inputRef.current?.blur()
  }, [])

  // ── Close context menu on outside scroll ─────────────────────────────────
  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    window.addEventListener('scroll', close, { passive: true })
    return () => window.removeEventListener('scroll', close)
  }, [ctxMenu])

  return (
    <>
      <style>{`
        @keyframes cp-pulse {
          0%   { transform: scale(1);   opacity: 0.7; }
          70%  { transform: scale(2.2); opacity: 0;   }
          100% { transform: scale(2.2); opacity: 0;   }
        }
        @keyframes cp-fadein {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }

        @keyframes cp-menu-in {
          from { opacity: 0; transform: scale(0.92) translateY(-4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        .cp-input::placeholder { color: var(--text-disabled); }
        .cp-input:focus { outline: none; }
        .cp-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', background:'var(--bg)' }}>

        {/* ── Sticky header ─────────────────────────────────────────────── */}
        <div style={{
          position:'sticky', top:0, zIndex:40,
          background:T.headerBg, borderBottom:`1px solid ${T.headerBorder}`,
          backdropFilter:T.headerBlur, WebkitBackdropFilter:T.headerBlur,
        }}>
          <div aria-hidden style={{
            position:'absolute', top:0, left:'8%', right:'8%', height:1,
            background:T.headerGloss, pointerEvents:'none',
          }}/>

          {/* Title row */}
          <div style={{
            display:'flex', alignItems:'center', gap:12,
            padding:`${T.S.pageH} ${T.S.px}px 0`, marginBottom:12,
          }}>
            <button
              onClick={() => navigate(-1)}
              aria-label="Back"
              style={{
                width:38, height:38, borderRadius:T.R.backBtn, flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center',
                background:T.backBg, border:`1px solid ${T.backBorder}`,
                cursor:'pointer', WebkitTapHighlightColor:'transparent',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M11 4L6 9l5 5" stroke="var(--text-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <div style={{ flex:1 }}>
              <h1 style={{
                margin:0, fontSize:20, fontWeight:800,
                letterSpacing:'-0.03em', lineHeight:1.1,
                color:T.titleColor, fontFamily:T.F.heading,
              }}>
                Messages
              </h1>
              {onlineFriends.length > 0 && (
                <p style={{
                  margin:'2px 0 0', fontSize:11, fontWeight:500,
                  color:T.onlineDot, fontFamily:T.F.body,
                  display:'flex', alignItems:'center', gap:4,
                }}>
                  <span style={{
                    display:'inline-block', width:6, height:6, borderRadius:'50%',
                    background:T.onlineDot, boxShadow:`0 0 5px ${T.onlineDotGlow}`,
                  }}/>
                  {onlineFriends.length} active now
                </p>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div style={{ padding:`0 ${T.S.px}px 12px`, position:'relative' }}>
            <svg style={{
              position:'absolute', left:T.S.px + 13, top:'50%',
              transform:'translateY(-50%)', pointerEvents:'none',
              color: searchFocused ? 'var(--accent)' : T.searchIcon,
              transition:'color 0.18s',
            }} width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              ref={inputRef}
              className="cp-input"
              type="text"
              placeholder="Search friends…"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                width:'100%', boxSizing:'border-box',
                paddingLeft:38, paddingRight: search ? 36 : 14,
                paddingTop:11, paddingBottom:11,
                borderRadius:T.R.search,
                fontSize:'max(16px,13px)', fontFamily:T.F.body,
                background:T.searchBg,
                border:`1.5px solid ${searchFocused ? T.searchFocusBorder : T.searchBorder}`,
                color:T.searchColor,
                boxShadow: searchFocused ? T.searchFocusShadow : 'none',
                transition:'border-color 0.18s, box-shadow 0.18s',
                WebkitAppearance:'none',
              }}
            />
            {search && (
              <button
                onClick={clearSearch}
                style={{
                  position:'absolute', right:T.S.px + 10, top:'50%',
                  transform:'translateY(-50%)',
                  width:20, height:20, borderRadius:99, border:'none',
                  cursor:'pointer', background:'var(--pill-bg)',
                  color:'var(--text-muted)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  WebkitTapHighlightColor:'transparent',
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <div
          style={{ flex:1, overflowY:'auto', scrollbarWidth:'none' }}
          className="cp-scroll"
        >
          {/* Search results */}
          {search ? (
            <div style={{ padding:`14px ${T.S.px}px` }}>
              <p style={{
                margin:'0 0 10px', fontSize:10, fontWeight:700,
                letterSpacing:'0.07em', textTransform:'uppercase',
                color:T.labelColor, fontFamily:T.F.body,
              }}>
                {searching ? 'Searching…' : `Results · ${searchResults.length}`}
              </p>
              {searchResults.map(u => (
                <SearchResult
                  key={u._id} user={u}
                  online={onlineSet.has(u._id)} T={T}
                  onClick={() => handleChatNav(u._id)}
                />
              ))}
              {!searching && !searchResults.length && (
                <p style={{ fontSize:13, textAlign:'center', padding:'20px 0', color:T.subColor, fontFamily:T.F.body }}>
                  No mutual friends found for "{search}"
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Online friends strip — Instagram Stories style */}
              <OnlineStrip
                friends={stripFriends}
                T={T}
                onlineFriendIds={onlineSet}
                onTap={handleChatNav}
              />

              {/* Recent chats label */}
              {recentChats.length > 0 && (
                <div style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:`10px ${T.S.px}px 8px`,
                }}>
                  <span style={{
                    fontSize:10, fontWeight:700, letterSpacing:'0.07em',
                    textTransform:'uppercase', color:T.labelColor, fontFamily:T.F.body,
                  }}>Recent</span>
                  <span style={{ fontSize:10, fontWeight:600, color:T.labelColor, fontFamily:T.F.mono }}>
                    {recentChats.length}
                  </span>
                </div>
              )}

              {/* Recent chats / empty state */}
              {recentChats.length === 0 ? (
                <div style={{
                  display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center',
                  padding:'64px 32px', textAlign:'center',
                }}>
                  <div style={{ fontSize:56, lineHeight:1, marginBottom:16, animation:'cp-fadein 0.5s ease both' }}>
                    💬
                  </div>
                  <h3 style={{
                    margin:'0 0 8px', fontSize:17, fontWeight:800,
                    letterSpacing:'-0.03em', lineHeight:1.2,
                    color:T.emptyTitle, fontFamily:T.F.heading,
                  }}>
                    No messages yet
                  </h3>
                  <p style={{
                    margin:'0 0 8px', fontSize:13, lineHeight:1.6,
                    color:T.emptyBody, fontFamily:T.F.body, maxWidth:260,
                  }}>
                    {onlineFriends.length > 0
                      ? `${onlineFriends.length} friend${onlineFriends.length > 1 ? 's are' : ' is'} active — say hi! 👆`
                      : 'Follow someone and they follow back — then you can chat!'
                    }
                  </p>
                  {onlineFriends.length === 0 && (
                    <button
                      onClick={() => navigate('/menu')}
                      style={{
                        padding:'12px 24px', borderRadius:14, border:'none',
                        fontSize:14, fontWeight:800, letterSpacing:'-0.02em',
                        cursor:'pointer', fontFamily:T.F.brand,
                        background:T.emptyBtnBg, boxShadow:T.emptyBtnShadow, color:T.emptyBtnColor,
                        WebkitTapHighlightColor:'transparent',
                        position:'relative', overflow:'hidden', marginTop:16,
                      }}
                    >
                      <div aria-hidden style={{
                        position:'absolute', top:0, left:'8%', right:'8%', height:1,
                        background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.40) 50%,transparent)',
                        pointerEvents:'none',
                      }}/>
                      Browse People
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ paddingBottom:T.S.pageB }}>
                  {recentChats.map((chat, i) => (
                    <ChatRow
                      key={chat.threadId}
                      chat={chat}
                      online={onlineSet.has(chat.otherUser?._id)}
                      T={T}
                      onClick={() => handleChatNav(chat.otherUser?._id)}
                      onLongPress={(c, x, y) => setCtxMenu({ chat: c, x, y })}
                      index={i}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Long-press context menu ──────────────────────────────────────── */}
      {ctxMenu && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setCtxMenu(null)}
            style={{ position:'fixed', inset:0, zIndex:80 }}
          />
          {/* Menu */}
          <div style={{
            position:'fixed',
            top:  Math.min(ctxMenu.y + 4, window.innerHeight - 172),
            left: Math.max(8, Math.min(ctxMenu.x - 95, window.innerWidth - 204)),
            zIndex:81, borderRadius:16, overflow:'hidden', minWidth:196,
            background:'var(--card-bg)', border:'1px solid var(--card-border)',
            boxShadow:'0 12px 48px rgba(0,0,0,0.22)',
            animation:'cp-menu-in 0.18s cubic-bezier(0.34,1.56,0.64,1) both',
          }}>
            <button
              onClick={() => { setCtxMenu(null); handleChatNav(ctxMenu.chat.otherUser?._id) }}
              style={{
                width:'100%', display:'flex', alignItems:'center', gap:12,
                padding:'13px 16px', background:'none', border:'none',
                borderBottom:'1px solid var(--divider)',
                cursor:'pointer', WebkitTapHighlightColor:'transparent', textAlign:'left',
              }}
            >
              <span style={{ fontSize:18 }}>💬</span>
              <span style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', fontFamily:T.F.body }}>
                Open chat
              </span>
            </button>
            <button
              onClick={() => { setCtxMenu(null); navigate(`/customer/${ctxMenu.chat.otherUser?._id}`) }}
              style={{
                width:'100%', display:'flex', alignItems:'center', gap:12,
                padding:'13px 16px', background:'none', border:'none',
                borderBottom:'1px solid var(--divider)',
                cursor:'pointer', WebkitTapHighlightColor:'transparent', textAlign:'left',
              }}
            >
              <span style={{ fontSize:18 }}>👤</span>
              <span style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', fontFamily:T.F.body }}>
                View profile
              </span>
            </button>
            <button
              onClick={() => handleDeleteChat(ctxMenu.chat.threadId)}
              style={{
                width:'100%', display:'flex', alignItems:'center', gap:12,
                padding:'13px 16px', background:'none', border:'none',
                cursor:'pointer', WebkitTapHighlightColor:'transparent', textAlign:'left',
              }}
            >
              <span style={{ fontSize:18 }}>🗑️</span>
              <span style={{ fontSize:14, fontWeight:600, color:'#ef4444', fontFamily:T.F.body }}>
                Delete chat
              </span>
            </button>
          </div>
        </>
      )}
    </>
  )
}

export default ChatPage