// frontend/src/modules/customer/components/profile/FollowSheet.jsx
//
// PATCH v2:
// ✅ Bug 7: remove_follower now calls removeFollower thunk (not unfollowUser)
//    Direction: DELETE /social/follower/:userId — removes them from MY followers
// ✅ Followers tab: shows "Follow Back" button for non-mutual followers
// ✅ All 'mutual'/'friends' normalized — only 'friends' used
// ✅ follow_back action dispatches sendFollowRequest for a follower I don't follow yet
// ✅ blocked_by: if user has status blocked_by, they are hidden from all lists

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import { createPortal }              from 'react-dom'
import { useDispatch, useSelector }  from 'react-redux'
import { useNavigate }               from 'react-router-dom'
import { motion, AnimatePresence }   from 'motion/react'
import {
  fetchFollowers, fetchFollowing, fetchMutual,
  unfollowUser, removeFollower, acceptFollowRequest,
  declineFollowRequest, sendFollowRequest,
  selectFollowLists, selectListsLoading, selectPendingRequests,
} from '@store/slices/followSlice'
import { lockScroll, unlockScroll }  from '@shared/utils/lenisLock'
import { FONTS, getPalette }         from '@shared/config/brand'
import api                           from '@api/axios'

const BODY = FONTS.body
const HEAD = FONTS.heading ?? FONTS.display

// ── Avatar ────────────────────────────────────────────────────────────────────
const COLORS = ['#92400E','#065F46','#1E40AF','#6D28D9','#9D174D','#B45309','#0E7490','#166534']
const avatarBg = name => COLORS[(name?.charCodeAt(0) ?? 0) % COLORS.length]
const getAvatar = u => u?.avatarUrl || u?.avatar || u?.profileImage || u?.profilePic || u?.photo || null

const Avatar = ({ user, size = 46 }) => {
  const url      = getAvatar(user)
  const initials = (user?.name || '?').slice(0, 2).toUpperCase()
  const bg       = avatarBg(user?.name)
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', flexShrink:0, overflow:'hidden', background:bg, boxShadow:'0 2px 8px rgba(0,0,0,0.15)' }}>
      {url && (
        <img src={url} alt={user?.name || ''} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
          onError={e => { e.currentTarget.style.display = 'none'; if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex' }}/>
      )}
      <div style={{ width:'100%', height:'100%', display:url ? 'none' : 'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:size * 0.33, fontFamily:HEAD }}>
        {initials}
      </div>
    </div>
  )
}

// ── Action button ─────────────────────────────────────────────────────────────
const ActionBtn = ({ label, onClick, variant = 'outline', isDark, busy = false }) => {
  const V = {
    outline:     { bg:isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)', color:isDark ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.62)', border:isDark ? '1.5px solid rgba(255,255,255,0.14)' : '1.5px solid rgba(0,0,0,0.11)' },
    friends:     { bg:'rgba(34,197,94,0.10)', color:'#16a34a', border:'1.5px solid rgba(34,197,94,0.28)' },
    follow_back: { bg:'linear-gradient(135deg,#FF9F1C 0%,#E05C2A 100%)', color:'#fff', border:'none' },
    danger:      { bg:'rgba(239,68,68,0.10)', color:'#ef4444', border:'1.5px solid rgba(239,68,68,0.28)' },
    accept:      { bg:'linear-gradient(135deg,#059669,#047857)', color:'#fff', border:'none' },
  }
  const s = V[variant] ?? V.outline
  return (
    <motion.button whileTap={{ scale:0.93 }} onClick={onClick} disabled={busy}
      style={{ padding:'6px 14px', borderRadius:9, fontSize:12.5, fontWeight:700, fontFamily:BODY, cursor:busy ? 'wait' : 'pointer', background:s.bg, color:s.color, border:s.border, opacity:busy ? 0.55 : 1, flexShrink:0, WebkitTapHighlightColor:'transparent', transition:'opacity .15s', minHeight:30, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
      {busy ? <div style={{ width:12, height:12, borderRadius:'50%', border:'2px solid currentColor', borderTopColor:'transparent', animation:'fs-spin .7s linear infinite' }}/> : label}
    </motion.button>
  )
}

// ── Row actions per tab ───────────────────────────────────────────────────────
// Followers tab:
//   - They follow ME
//   - If mutual (friends): "Friends ✓" (click to unfollow → drops mutual)
//   - If they follow me but I don't follow back: "Follow Back" + "Remove"
//
// Following tab:
//   - I follow THEM
//   - If mutual (friends): "Friends ✓" (click → confirm unfollow)
//   - If I follow but not mutual: "Following ✓" (click → confirm unfollow)
//
// Mutual tab:
//   - Friends (both follow each other)
//   - "Friends ✓" click → confirm unfollow
//
// Pending tab:
//   - They sent me a request
//   - Accept | Decline

const RowActions = ({ user, tab, isDark, onAction, busy, viewOnly }) => {
  const [confirmUnfollow, setConfirmUnfollow] = useState(false)

  if (viewOnly) return null

  // ── Followers tab ───────────────────────────────────────────────────────────
  if (tab === 'followers') {
    // isMutual true = friends (both follow each other)
    if (user.isMutual) {
      if (confirmUnfollow) return (
        <div style={{ display:'flex', gap:5 }}>
          <ActionBtn label="Unfollow" variant="danger" isDark={isDark} busy={busy} onClick={() => { setConfirmUnfollow(false); onAction('unfollow', user._id) }}/>
          <ActionBtn label="Cancel"   variant="outline" isDark={isDark}              onClick={() => setConfirmUnfollow(false)}/>
        </div>
      )
      return <ActionBtn label="Friends ✓" variant="friends" isDark={isDark} onClick={() => setConfirmUnfollow(true)}/>
    }
    // They follow me but I don't follow them back
    // FIX Bug 7: "Remove" now calls remove_follower (not unfollow)
    return (
      <div style={{ display:'flex', gap:5 }}>
        <ActionBtn label="Follow Back" variant="follow_back" isDark={isDark} busy={busy} onClick={() => onAction('follow_back', user._id)}/>
        <ActionBtn label="Remove"      variant="outline"     isDark={isDark} busy={busy} onClick={() => onAction('remove_follower', user._id)}/>
      </div>
    )
  }

  // ── Following tab ───────────────────────────────────────────────────────────
  if (tab === 'following') {
    if (confirmUnfollow) return (
      <div style={{ display:'flex', gap:5 }}>
        <ActionBtn label="Unfollow" variant="danger"  isDark={isDark} busy={busy} onClick={() => { setConfirmUnfollow(false); onAction('unfollow', user._id) }}/>
        <ActionBtn label="Cancel"   variant="outline" isDark={isDark}              onClick={() => setConfirmUnfollow(false)}/>
      </div>
    )
    if (user.isMutual) return <ActionBtn label="Friends ✓"  variant="friends" isDark={isDark} onClick={() => setConfirmUnfollow(true)}/>
    return              <ActionBtn label="Following ✓" variant="outline" isDark={isDark} onClick={() => setConfirmUnfollow(true)}/>
  }

  // ── Mutual tab ──────────────────────────────────────────────────────────────
  if (tab === 'mutual') {
    if (confirmUnfollow) return (
      <div style={{ display:'flex', gap:5 }}>
        <ActionBtn label="Unfollow" variant="danger"  isDark={isDark} busy={busy} onClick={() => { setConfirmUnfollow(false); onAction('unfollow', user._id) }}/>
        <ActionBtn label="Cancel"   variant="outline" isDark={isDark}              onClick={() => setConfirmUnfollow(false)}/>
      </div>
    )
    return <ActionBtn label="Friends ✓" variant="friends" isDark={isDark} onClick={() => setConfirmUnfollow(true)}/>
  }

  // ── Pending tab ─────────────────────────────────────────────────────────────
  if (tab === 'pending') {
    return (
      <div style={{ display:'flex', gap:5 }}>
        <ActionBtn label={busy ? '…' : 'Confirm'} variant="accept"  isDark={isDark} busy={busy} onClick={() => onAction('accept', user._id)}/>
        <ActionBtn label="Delete"                  variant="outline" isDark={isDark} busy={busy} onClick={() => onAction('decline', user._id)}/>
      </div>
    )
  }
  return null
}

// ── UserRow ───────────────────────────────────────────────────────────────────
const UserRow = ({ user, tab, isDark, P, onAction, actionLoading, onNavigate, viewOnly }) => {
  const busy = actionLoading === user._id
  return (
    <motion.div
      layout
      initial={{ opacity:0, x:-12 }}
      animate={{ opacity:1, x:0 }}
      exit={{ opacity:0, x:16, height:0, paddingTop:0, paddingBottom:0 }}
      transition={{ duration:0.22, ease:[0.22, 1, 0.36, 1] }}
      style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 20px', borderBottom:`1px solid ${isDark ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.055)'}`, overflow:'hidden' }}
    >
      <div onClick={() => onNavigate(user._id)} style={{ cursor:'pointer', flexShrink:0 }}>
        <Avatar user={user} size={46}/>
      </div>

      <div onClick={() => onNavigate(user._id)} style={{ flex:1, minWidth:0, cursor:'pointer' }}>
        <p style={{ fontFamily:BODY, fontSize:14, fontWeight:700, color:P.textPrimary, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {user.name}
        </p>
        {user.username && (
          <p style={{ fontFamily:BODY, fontSize:12, color:P.textMuted, margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            @{user.username}
          </p>
        )}
        {/* Friends tag on followers/following tabs */}
        {user.isMutual && (tab === 'followers' || tab === 'following') && (
          <span style={{ display:'inline-block', marginTop:3, fontSize:10, fontWeight:700, color:'#16a34a', background:'rgba(34,197,94,0.10)', border:'1px solid rgba(34,197,94,0.22)', borderRadius:99, padding:'1px 7px', fontFamily:BODY }}>
            ↔ Friends
          </span>
        )}
      </div>

      <div style={{ flexShrink:0 }}>
        <RowActions user={user} tab={tab} isDark={isDark} onAction={onAction} busy={busy} viewOnly={viewOnly}/>
      </div>
    </motion.div>
  )
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
const SkeletonRow = ({ isDark }) => (
  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 20px', borderBottom:`1px solid ${isDark ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.055)'}` }}>
    <div className="skeleton" style={{ width:46, height:46, borderRadius:'50%', flexShrink:0 }}/>
    <div style={{ flex:1, display:'flex', flexDirection:'column', gap:7 }}>
      <div className="skeleton" style={{ height:13, width:'52%', borderRadius:6 }}/>
      <div className="skeleton" style={{ height:10, width:'32%', borderRadius:6 }}/>
    </div>
  </div>
)

// ── Tab definitions ───────────────────────────────────────────────────────────
const TAB_META = {
  followers: { label:'Followers', icon:'👥', concept:'People who follow you' },
  following: { label:'Following', icon:'🔍', concept:'People you follow' },
  mutual:    { label:'Friends',   icon:'🤝', concept:'You follow each other' },
  pending:   { label:'Requests',  icon:'📬', concept:'Follow requests' },
}

// ── Main Sheet ────────────────────────────────────────────────────────────────
export const FollowSheet = ({
  onClose,
  isDark,
  initialTab     = 'followers',
  viewOnly       = false,
  pendingRequests: pendingProp = [],
}) => {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const P         = getPalette(isDark)

  const cachedLists  = useSelector(selectFollowLists)
  const listsLoading = useSelector(selectListsLoading)
  const pendingRedux = useSelector(selectPendingRequests)
  const pending      = pendingProp.length ? pendingProp : pendingRedux

  const [activeTab,  setActiveTab]  = useState(initialTab)
  const [actionLoad, setActionLoad] = useState(null)
  const [search,     setSearch]     = useState('')
  const [searchData, setSearchData] = useState(null)
  const [searchLoad, setSearchLoad] = useState(false)
  const [indicator,  setIndicator]  = useState({ left:0, width:0 })

  const searchTimer = useRef(null)
  const scrollRef   = useRef(null)
  const tabRefs     = useRef([])

  const TABS = viewOnly
    ? [{ key:'mutual', ...TAB_META.mutual }]
    : [
        { key:'followers', ...TAB_META.followers },
        { key:'following', ...TAB_META.following },
        { key:'mutual',    ...TAB_META.mutual    },
        { key:'pending',   ...TAB_META.pending, badge:pending.length },
      ]

  // Lock scroll
  useEffect(() => { lockScroll(); return () => unlockScroll() }, [])

  // Prefetch all lists in parallel on mount
  useEffect(() => {
    if (!viewOnly) {
      if (!cachedLists.followers) dispatch(fetchFollowers())
      if (!cachedLists.following) dispatch(fetchFollowing())
      if (!cachedLists.mutual)    dispatch(fetchMutual())
    } else {
      if (!cachedLists.mutual) dispatch(fetchMutual())
    }
  }, []) // eslint-disable-line

  // Sliding tab indicator position
  useLayoutEffect(() => {
    const idx = TABS.findIndex(t => t.key === activeTab)
    const el  = tabRefs.current[idx]
    if (el) setIndicator({ left:el.offsetLeft, width:el.offsetWidth })
  }, [activeTab, TABS.length])

  // Debounced search
  const handleSearch = val => {
    setSearch(val)
    clearTimeout(searchTimer.current)
    if (!val.trim()) { setSearchData(null); return }
    searchTimer.current = setTimeout(async () => {
      setSearchLoad(true)
      try {
        const tab = activeTab === 'pending' ? 'followers' : activeTab
        const res = await api.get(`/social/list/${tab}?search=${encodeURIComponent(val)}`)
        setSearchData(res?.data?.users ?? res?.data ?? [])
      } catch { setSearchData([]) }
      finally  { setSearchLoad(false) }
    }, 350)
  }

  const clearSearch = () => { setSearch(''); setSearchData(null) }

  const switchTab = tab => {
    setActiveTab(tab)
    clearSearch()
    scrollRef.current?.scrollTo({ top:0, behavior:'smooth' })
    if (tab !== 'pending') {
      const thunk = tab === 'followers' ? fetchFollowers : tab === 'following' ? fetchFollowing : fetchMutual
      if (!cachedLists[tab]) dispatch(thunk())
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleAction = useCallback(async (action, userId) => {
    setActionLoad(userId)
    try {
      if (action === 'unfollow') {
        await dispatch(unfollowUser(userId))
      }
      // FIX Bug 7: remove_follower → correct direction
      if (action === 'remove_follower') {
        await dispatch(removeFollower(userId))
      }
      // Follow back a follower I haven't followed yet
      if (action === 'follow_back') {
        await dispatch(sendFollowRequest(userId))
      }
      if (action === 'accept') {
        await dispatch(acceptFollowRequest(userId))
        dispatch(fetchFollowers())
        dispatch(fetchMutual())
      }
      if (action === 'decline') {
        await dispatch(declineFollowRequest(userId))
      }
    } finally {
      setActionLoad(null)
    }
  }, [dispatch])

  const handleNavigate = userId => {
    onClose()
    setTimeout(() => navigate(`/customer/${userId}`), 180)
  }

  // Resolve current list — filter out blocked_by users
  const getList = () => {
    if (search.trim()) return (searchData ?? []).filter(u => u.followStatus !== 'blocked_by')
    if (activeTab === 'pending') return pending
    return (cachedLists[activeTab] ?? []).filter(u => u.followStatus !== 'blocked_by')
  }

  // Map 'mutual' list key to 'mutual' tab — but displayed as 'Friends'
  // The cached key is still 'mutual' in Redux (list key), but the status value is 'friends'
  const isLoading = search.trim()
    ? searchLoad
    : activeTab === 'pending'
      ? false
      : listsLoading[activeTab] && !cachedLists[activeTab]

  const currentList = getList()
  const activeMeta  = TAB_META[activeTab] ?? TAB_META.followers

  const glass = isDark
    ? { bg:'rgba(16,10,4,0.84)', border:'rgba(255,255,255,0.10)', gloss:'rgba(255,255,255,0.28)', shadow:'0 -24px 80px rgba(0,0,0,0.70)' }
    : { bg:'rgba(248,244,238,0.90)', border:'rgba(0,0,0,0.08)', gloss:'rgba(255,255,255,0.90)', shadow:'0 -24px 80px rgba(0,0,0,0.16)' }

  return createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        onClick={onClose}
        style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.52)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)' }}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:400, damping:38, mass:0.9 }}
        style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:301, maxHeight:'88dvh', borderRadius:'28px 28px 0 0', display:'flex', flexDirection:'column', overflow:'hidden', backdropFilter:'blur(52px) saturate(200%)', WebkitBackdropFilter:'blur(52px) saturate(200%)', background:glass.bg, border:`1px solid ${glass.border}`, borderBottom:'none', boxShadow:`${glass.shadow}, inset 0 1px 0 ${glass.gloss}` }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`@keyframes fs-spin{to{transform:rotate(360deg)}}`}</style>

        {/* Drag handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'13px 0 6px', flexShrink:0 }}>
          <div style={{ width:36, height:4, borderRadius:99, background:isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.13)' }}/>
        </div>

        {/* Header */}
        <div style={{ padding:'4px 20px 12px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:20 }}>{activeMeta.icon}</span>
            <div>
              <p style={{ fontFamily:HEAD, fontSize:18, fontWeight:800, color:P.textPrimary, margin:0, letterSpacing:'-0.03em', lineHeight:1.15 }}>
                {activeMeta.label}
              </p>
              <p style={{ fontFamily:BODY, fontSize:11.5, color:P.textMuted, margin:0 }}>
                {activeMeta.concept}
              </p>
            </div>
          </div>
        </div>

        {/* Animated tab bar */}
        <div style={{ position:'relative', display:'flex', flexShrink:0, borderBottom:`1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }}>
          {TABS.map((tab, i) => (
            <button
              key={tab.key}
              ref={el => { tabRefs.current[i] = el }}
              onClick={() => switchTab(tab.key)}
              style={{ flex:1, padding:'12px 4px', fontFamily:BODY, fontSize:13.5, fontWeight:activeTab === tab.key ? 800 : 500, color:activeTab === tab.key ? P.textPrimary : P.textMuted, background:'transparent', border:'none', cursor:'pointer', transition:'color 0.2s, font-weight 0.15s', WebkitTapHighlightColor:'transparent', position:'relative', zIndex:1 }}
            >
              {tab.label}
              {tab.badge > 0 && (
                <span style={{ position:'absolute', top:6, right:'50%', transform:'translateX(130%)', minWidth:15, height:15, borderRadius:99, background:'#ef4444', color:'#fff', fontSize:8.5, fontWeight:800, display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'0 3px' }}>
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </button>
          ))}
          {/* Sliding indicator */}
          <motion.div
            animate={{ left:indicator.left, width:indicator.width }}
            transition={{ type:'spring', stiffness:500, damping:38, mass:0.6 }}
            style={{ position:'absolute', bottom:0, height:2.5, borderRadius:'2px 2px 0 0', background:isDark ? '#fff' : '#111', pointerEvents:'none' }}
          />
        </div>

        {/* Search bar */}
        {activeTab !== 'pending' && (
          <div style={{ padding:'10px 16px 6px', flexShrink:0, position:'relative' }}>
            <svg style={{ position:'absolute', left:28, top:'50%', transform:'translateY(-50%)', color:P.textMuted, pointerEvents:'none' }} width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input
              type="text" value={search}
              placeholder={`Search ${activeMeta.label.toLowerCase()}…`}
              onChange={e => handleSearch(e.target.value)}
              style={{ width:'100%', boxSizing:'border-box', paddingLeft:36, paddingRight:search ? 34 : 14, paddingTop:9, paddingBottom:9, borderRadius:12, fontSize:14, fontFamily:BODY, background:isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', border:`1.5px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.09)'}`, color:P.textPrimary, outline:'none' }}
            />
            {search && (
              <button onClick={clearSearch} style={{ position:'absolute', right:26, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:P.textMuted, display:'flex', alignItems:'center', justifyContent:'center', padding:2 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <line x1="3" y1="3" x2="11" y2="11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  <line x1="11" y1="3" x2="3" y2="11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        )}

        {/* List */}
        <div
          ref={scrollRef}
          data-lenis-prevent
          onWheel={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          style={{ flex:1, minHeight:0, overflowY:'auto', WebkitOverflowScrolling:'touch', overscrollBehavior:'contain' }}
        >
          {isLoading ? (
            [...Array(7)].map((_, i) => <SkeletonRow key={i} isDark={isDark}/>)
          ) : currentList.length === 0 ? (
            <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} style={{ textAlign:'center', padding:'52px 24px' }}>
              <p style={{ fontSize:36, marginBottom:10 }}>{activeMeta.icon}</p>
              <p style={{ fontFamily:HEAD, fontSize:15, fontWeight:700, color:P.textPrimary, marginBottom:4, letterSpacing:'-0.02em' }}>
                {search ? 'No results' : `No ${activeMeta.label.toLowerCase()} yet`}
              </p>
              <p style={{ fontFamily:BODY, fontSize:13, color:P.textMuted, lineHeight:1.5 }}>
                {search ? 'Try a different name' : activeMeta.concept}
              </p>
            </motion.div>
          ) : (
            <AnimatePresence initial={false}>
              {currentList.map(user => (
                <UserRow
                  key={user._id}
                  user={user}
                  tab={activeTab}
                  isDark={isDark}
                  P={P}
                  onAction={handleAction}
                  actionLoading={actionLoad}
                  onNavigate={handleNavigate}
                  viewOnly={viewOnly}
                />
              ))}
            </AnimatePresence>
          )}
          <div style={{ height:'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}/>
        </div>
      </motion.div>
    </>,
    document.body
  )
}

export default FollowSheet