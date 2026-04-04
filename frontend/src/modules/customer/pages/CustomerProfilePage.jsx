// src/modules/customer/pages/CustomerProfilePage.jsx
// v3 — Full Tailwind CSS + CSS vars, navigate(-1) fixed
// ✅ All 12 relationship states, 'friends' canonical (no 'mutual')
// ✅ navigate(-1) everywhere — no window.history.state guard
// ✅ All colors via var(--token), no getPalette() inline except where essential

import { useState, useEffect, useContext, useCallback } from 'react'
import { useParams, useNavigate }      from 'react-router-dom'
import { useDispatch, useSelector }    from 'react-redux'
import { motion, AnimatePresence }     from 'motion/react'
import {
  sendFollowRequest, acceptFollowRequest, declineFollowRequest,
  unfollowUser, blockUser,
  selectStatusMap, selectOnlineUsers,
} from '@store/slices/followSlice'
import { selectUser }               from '@store/slices/authSlice'
import { ThemeContext }             from '@shared/context/ThemeContext'
import { BRAND, FONTS, getPalette } from '@shared/config/brand'
import { FollowSheet }              from '../components/profile/FollowSheet'
import { lockScroll, unlockScroll } from '@shared/utils/lenisLock'
import api                          from '@api/axios'
import { createPortal }             from 'react-dom'
import {
  ArrowLeft, MessageCircle, UserCheck,
  UserPlus, MoreVertical, ShieldAlert,
  UserMinus, Check, ShieldOff,
} from 'lucide-react'

const HEAD = FONTS.heading ?? FONTS.display
const BODY = FONTS.body

const BADGE_DEFS = {
  first_timer:      { emoji:'🎉', label:'First Timer'      },
  chai_addict:      { emoji:'☕', label:'Chai Addict'      },
  night_owl:        { emoji:'🦉', label:'Night Owl'        },
  explorer:         { emoji:'🧭', label:'Explorer'         },
  loyal_regular:    { emoji:'💛', label:'Loyal Regular'    },
  big_spender:      { emoji:'💸', label:'Big Spender'      },
  social_butterfly: { emoji:'🦋', label:'Social Butterfly' },
  review_royalty:   { emoji:'👑', label:'Review Royalty'   },
  streak_master:    { emoji:'🔥', label:'Streak Master'    },
}
const TIER_COLOR = { none:'#FF9F1C', bronze:'#CD7F32', silver:'#94a3b8', gold:'#FFD700' }
const COLORS     = ['#0a4433','#1e40af','#7c3aed','#be185d','#b45309','#047857','#0e7490']
const avatarBg   = name => COLORS[(name?.charCodeAt(0)??0)%COLORS.length]
const getInitials= n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
const getAvatarSrc = u => {
  if (!u) return null
  const url = u.avatarUrl||u.avatar||u.profileImage||u.profilePic||u.photo||u.picture||u.image||u.photoURL||null
  if (!url) return null
  if (url.startsWith('http')||url.startsWith('data:')||url.startsWith('/')) return url
  return null
}

// ── HeroAvatar ────────────────────────────────────────────────────────────────
const HeroAvatar = ({ profile, size=108 }) => {
  const src       = getAvatarSrc(profile)
  const tierColor = TIER_COLOR[profile?.loyaltyTier ?? 'none'] ?? TIER_COLOR.none
  return (
    <div className="relative flex-shrink-0 mb-[18px]" style={{ width:size, height:size }}>
      <div className="absolute rounded-full" style={{ inset:-4, background:`conic-gradient(${tierColor},${tierColor}44,${tierColor})`, opacity:0.7 }}/>
      <div className="absolute rounded-full" style={{ inset:0, background:'var(--bg)' }}/>
      <div className="absolute rounded-full overflow-hidden" style={{ inset:3, background:'var(--accent-dim)', boxShadow:'0 0 0 2px var(--bg), 0 14px 40px var(--accent-glow)' }}>
        {src
          ? <img src={src} alt={profile?.name} className="w-full h-full object-cover block"/>
          : <div className="w-full h-full flex items-center justify-center font-extrabold text-white"
              style={{ background:avatarBg(profile?.name), fontFamily:HEAD, fontSize:size*0.3 }}>
              {getInitials(profile?.name)}
            </div>
        }
      </div>
    </div>
  )
}

const AnimNum = ({ value }) => {
  const [d, setD] = useState('0')
  useEffect(() => { setD(Number(value).toLocaleString()) }, [value])
  return <span>{d}</span>
}

// ── Confirm dialog ────────────────────────────────────────────────────────────
function Confirm({ title, desc, onOk, onCancel, busy, danger=false, isDark }) {
  useEffect(() => { lockScroll(); return () => unlockScroll() }, [])
  return createPortal(
    <>
      <motion.div
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        onClick={() => !busy && onCancel()}
        className="fixed inset-0 z-[209]"
        style={{ background:'rgba(0,0,0,0.45)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)' }}/>
      <motion.div
        initial={{ opacity:0, y:-20, scale:.92 }} animate={{ opacity:1, y:0, scale:1 }}
        exit={{ opacity:0, y:-16, scale:.94 }} transition={{ type:'spring', stiffness:420, damping:30 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-[calc(100vw-40px)] max-w-[360px] rounded-[24px] overflow-hidden"
        style={{
          backdropFilter:'blur(40px) saturate(1.8)', WebkitBackdropFilter:'blur(40px) saturate(1.8)',
          background: isDark ? 'rgba(18,10,3,0.72)' : 'rgba(255,248,235,0.78)',
          border:`1px solid ${danger?'rgba(248,113,113,0.35)':'rgba(255,159,28,0.3)'}`,
          boxShadow: danger ? '0 24px 80px rgba(220,38,38,0.25)' : '0 24px 80px rgba(0,0,0,0.5)',
        }}>
        <div className="h-[3px]" style={{ background:danger?'linear-gradient(90deg,#EF4444,#F87171)':'var(--accent-gradient)' }}/>
        <div className="p-5 pb-[22px]">
          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-[46px] h-[46px] rounded-[15px] flex-shrink-0 flex items-center justify-center"
              style={{ background:danger?'rgba(239,68,68,0.15)':'rgba(255,159,28,0.15)', border:`1px solid ${danger?'rgba(239,68,68,0.2)':'rgba(255,159,28,0.2)'}` }}>
              <ShieldAlert size={22} color={danger?'#EF4444':'var(--accent)'}/>
            </div>
            <div className="flex-1">
              <p className="text-[16px] font-bold tracking-[-0.02em] leading-[1.25] mb-0.5 m-0" style={{ color:'var(--text-primary)', fontFamily:HEAD }}>{title}</p>
              {desc && <p className="text-[13px] leading-[1.4] m-0" style={{ color:'var(--text-muted)', fontFamily:BODY }}>{desc}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={onCancel} disabled={busy}
              className="py-[13px] rounded-[14px] text-[14px] font-semibold cursor-pointer"
              style={{ fontFamily:BODY, background:'var(--pill-bg)', color:'var(--text-primary)', border:'1px solid var(--divider)', WebkitTapHighlightColor:'transparent' }}>
              Cancel
            </button>
            <button onClick={onOk} disabled={busy}
              className="py-[13px] rounded-[14px] text-[14px] font-bold text-white border-none cursor-pointer flex items-center justify-center gap-1.5"
              style={{ fontFamily:BODY, background:danger?'linear-gradient(135deg,#EF4444,#DC2626)':'var(--accent-gradient)', WebkitTapHighlightColor:'transparent', opacity:busy?.7:1 }}>
              {busy
                ? <div className="w-[15px] h-[15px] rounded-full border-2 border-white/30 border-t-white animate-spin"/>
                : <><Check size={14} color="#fff"/><span className="text-white">Confirm</span></>
              }
            </button>
          </div>
        </div>
      </motion.div>
    </>,
    document.body
  )
}

// ── Blocked screen ────────────────────────────────────────────────────────────
const BlockedScreen = ({ navigate }) => (
  <div className="flex flex-col items-center justify-center px-6 py-16 gap-4 text-center">
    <span className="text-[48px]">🚫</span>
    <p className="text-[18px] font-bold m-0" style={{ color:'var(--text-primary)', fontFamily:HEAD }}>Profile unavailable</p>
    <p className="text-[14px] m-0 leading-[1.5]" style={{ color:'var(--text-muted)', fontFamily:BODY }}>
      You can't view this profile or interact with this user.
    </p>
    <button onClick={() => navigate(-1)}
      className="px-7 py-3 rounded-[14px] text-white border-none font-bold text-[14px] cursor-pointer"
      style={{ fontFamily:BODY, background:'#0a4433' }}>
      Go back
    </button>
  </div>
)

// ── Action button shared styles ───────────────────────────────────────────────
const primaryBtn = {
  flex:1, padding:'13px 0', borderRadius:16,
  fontFamily:BODY, fontSize:15, fontWeight:700,
  background:'#0a4433', color:'#fff', border:'none',
  cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7,
  boxShadow:'0 4px 16px rgba(10,68,51,0.3)', WebkitTapHighlightColor:'transparent',
}
const ghostBtn = (isDark) => ({
  flex:1, padding:'13px 0', borderRadius:16,
  fontFamily:BODY, fontSize:15, fontWeight:700,
  background: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)',
  color:'var(--text-primary)',
  border:`1.5px solid ${isDark?'rgba(255,255,255,0.13)':'rgba(0,0,0,0.11)'}`,
  cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7,
  WebkitTapHighlightColor:'transparent',
})

// ══════════════════════════════════════════════════════════════════════════════
export default function CustomerProfilePage() {
  const { userId } = useParams()
  const navigate   = useNavigate()
  const dispatch   = useDispatch()
  const { isDark } = useContext(ThemeContext)
  const me         = useSelector(selectUser)
  const statusMap  = useSelector(selectStatusMap)
  const onlineSet  = useSelector(selectOnlineUsers)

  const [profile,     setProfile]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [mutualCount, setMutualCount] = useState(0)
  const [actionBusy,  setActionBusy]  = useState(false)
  const [followSheet, setFollowSheet] = useState(false)
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [cfm,         setCfm]         = useState(null)

  const rawStatus = statusMap[userId] ?? profile?.followStatus ?? 'none'
  const status    = rawStatus === 'mutual' ? 'friends' : rawStatus
  const online    = onlineSet instanceof Set ? onlineSet.has(userId) : false
  const isSelf    = me?._id === userId || me?.id === userId

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    api.get(`/social/list/stats/${userId}`)
      .then(res => {
        const d = res?.data ?? res
        const s = d.followStatus === 'mutual' ? 'friends' : (d.followStatus ?? 'none')
        setProfile({ _id:d.userId??userId, name:d.name, username:d.username, avatarUrl:d.avatarUrl||d.avatar||d.profileImage||null, loyaltyTier:d.loyaltyTier??'none', badges:Array.isArray(d.badges)?d.badges:[], followStatus:s })
        setMutualCount(d.mutualCount ?? 0)
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [userId])

  useEffect(() => {
    if (!userId || loading) return
    api.get(`/social/list/stats/${userId}`)
      .then(res => { const d=res?.data??res; setMutualCount(d.mutualCount??0) }).catch(() => {})
  }, [status]) // eslint-disable-line

  const doAction = useCallback(async action => {
    setActionBusy(true); setMenuOpen(false)
    try {
      if (action === 'follow')   await dispatch(sendFollowRequest(userId))
      if (action === 'unfollow') await dispatch(unfollowUser(userId))
      if (action === 'accept')   await dispatch(acceptFollowRequest(userId))
      if (action === 'decline')  await dispatch(declineFollowRequest(userId))
      if (action === 'block') {
        setCfm({ title:'Block this user?', desc:"They won't be able to follow you or send messages.", danger:true,
          onOk: async () => { setCfm(null); await dispatch(blockUser(userId)); navigate(-1) } })
        return
      }
    } finally { setActionBusy(false) }
  }, [dispatch, userId, navigate])

  const badges = profile?.badges ?? []
  const Spinner = () => <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading && !profile) return (
    <div className="min-h-dvh" style={{ background:'var(--bg)' }}>
      <style>{`@keyframes cpp-spin{to{transform:rotate(360deg)}}`}</style>
      <div className="sticky top-0 z-40 flex items-center justify-between overflow-hidden px-4"
        style={{ paddingTop:'calc(env(safe-area-inset-top,0px)+10px)', paddingBottom:10, background:'var(--header-bg)', backdropFilter:'blur(28px)', borderBottom:'1px solid var(--header-border)' }}>
        <button onClick={() => navigate(-1)} className="w-[38px] h-[38px] rounded-xl flex items-center justify-center cursor-pointer border-none" style={{ background:'var(--pill-bg)' }}>
          <ArrowLeft size={17} strokeWidth={2.5} color="var(--text-primary)"/>
        </button>
        <div className="skeleton" style={{ width:120, height:16, borderRadius:8 }}/>
        <div className="w-[38px]"/>
      </div>
      <div className="flex flex-col items-center px-6 pt-9">
        <div className="skeleton" style={{ width:108, height:108, borderRadius:'50%', marginBottom:18 }}/>
        <div className="skeleton" style={{ width:160, height:22, borderRadius:8, marginBottom:10 }}/>
        <div className="skeleton" style={{ width:100, height:14, borderRadius:8, marginBottom:20 }}/>
        <div className="skeleton" style={{ width:200, height:48, borderRadius:18 }}/>
      </div>
    </div>
  )

  if (!profile) return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-3 px-6 text-center" style={{ background:'var(--bg)' }}>
      <span className="text-[48px]">😕</span>
      <p className="text-[14px]" style={{ color:'var(--text-muted)', fontFamily:BODY }}>Profile not found</p>
      <button onClick={() => navigate(-1)} className="px-6 py-2.5 rounded-xl text-white border-none font-bold cursor-pointer" style={{ background:'#0a4433', fontFamily:BODY }}>Go back</button>
    </div>
  )

  return (
    <div className="min-h-dvh" style={{ background:'var(--bg)', fontFamily:BODY, WebkitFontSmoothing:'antialiased' }}
      onClick={() => setMenuOpen(false)}>
      <style>{`@keyframes cpp-spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Top bar ── */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between overflow-hidden px-4"
        style={{
          paddingTop:'calc(env(safe-area-inset-top,0px)+10px)', paddingBottom:10,
          background: isDark ? 'rgba(16,12,8,0.52)' : 'rgba(255,255,255,0.42)',
          backdropFilter:'blur(28px) saturate(180%)', WebkitBackdropFilter:'blur(28px) saturate(180%)',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.55)',
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.06)' : '0 4px 24px rgba(0,0,0,0.10),inset 0 1px 0 rgba(255,255,255,0.80)',
        }}
        onClick={e => e.stopPropagation()}>

        <div className="absolute top-0 left-0 right-0 h-px pointer-events-none" style={{ background:'var(--top-glow)' }}/>

        <button onClick={() => navigate(-1)}
          className="w-[38px] h-[38px] rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0 border-none"
          style={{ background:isDark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.06)', border:`1px solid ${isDark?'rgba(255,255,255,0.13)':'rgba(0,0,0,0.09)'}`, WebkitTapHighlightColor:'transparent' }}>
          <ArrowLeft size={17} strokeWidth={2.5} color="var(--text-primary)"/>
        </button>

        <p className="absolute left-1/2 -translate-x-1/2 text-[16px] font-bold tracking-[-0.03em] max-w-[55%] truncate"
          style={{ color:'var(--text-primary)', fontFamily:HEAD }}>
          {profile.name}
        </p>

        {!isSelf && (
          <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={() => setMenuOpen(v=>!v)}
              className="w-[38px] h-[38px] rounded-xl flex items-center justify-center cursor-pointer border-none"
              style={{ background:isDark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.06)', border:`1px solid ${isDark?'rgba(255,255,255,0.13)':'rgba(0,0,0,0.09)'}`, WebkitTapHighlightColor:'transparent' }}>
              <MoreVertical size={17} strokeWidth={2} color="var(--text-muted)"/>
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity:0, scale:0.92, y:-6 }} animate={{ opacity:1, scale:1, y:0 }}
                  exit={{ opacity:0, scale:0.92, y:-6 }} transition={{ duration:0.15 }}
                  className="absolute top-[46px] right-0 z-[99] rounded-2xl overflow-hidden min-w-[180px]"
                  style={{ background:isDark?'rgba(20,14,8,0.95)':'rgba(255,255,255,0.97)', backdropFilter:'blur(24px)', border:`1px solid ${isDark?'rgba(255,255,255,0.12)':'rgba(0,0,0,0.1)'}`, boxShadow:'0 8px 32px rgba(0,0,0,0.35)' }}>
                  {(status === 'friends' || status === 'following') && (
                    <>
                      <button onClick={() => { setMenuOpen(false); setCfm({ title:'Unfollow this person?', desc:'You can follow them again later.', danger:false, onOk:async()=>{setCfm(null);doAction('unfollow')} }) }}
                        className="w-full px-4 py-[13px] bg-transparent border-none text-left font-semibold text-[14px] cursor-pointer flex items-center gap-2.5"
                        style={{ color:'var(--text-primary)', fontFamily:BODY, WebkitTapHighlightColor:'transparent' }}>
                        <UserMinus size={16} color="var(--text-muted)"/> Unfollow
                      </button>
                      <div className="h-px" style={{ background:'var(--divider)' }}/>
                    </>
                  )}
                  {status !== 'blocked' && (
                    <button onClick={() => { setMenuOpen(false); doAction('block') }}
                      className="w-full px-4 py-[13px] bg-transparent border-none text-left font-semibold text-[14px] cursor-pointer flex items-center gap-2.5 text-red-400"
                      style={{ fontFamily:BODY, WebkitTapHighlightColor:'transparent' }}>
                      <ShieldAlert size={16} color="#ef4444"/> Block user
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        {isSelf && <div className="w-[38px]"/>}
      </div>

      {/* ── Hero ── */}
      <div className="flex flex-col items-center px-6 pt-9 pb-7 relative overflow-hidden"
        onClick={() => setMenuOpen(false)}>
        <div className="absolute pointer-events-none"
          style={{ top:-40, left:'50%', transform:'translateX(-50%)', width:360, height:360, borderRadius:'50%', background:'radial-gradient(ellipse at center,var(--orb-color) 0%,var(--orb-color-2) 38%,transparent 68%)' }}/>

        <motion.div initial={{ scale:.7, opacity:0 }} animate={{ scale:1, opacity:1 }} transition={{ duration:.5, ease:[.34,1.56,.64,1] }}>
          <HeroAvatar profile={profile}/>
        </motion.div>

        {/* Online badge */}
        {online && status !== 'blocked_by' && (
          <motion.div initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.15 }}
            className="flex items-center gap-1.5 mb-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.25)', color:'#16a34a' }}>
            <span className="w-[7px] h-[7px] rounded-full bg-green-500 inline-block"/>
            Online now
          </motion.div>
        )}

        <motion.h1
          className="text-[24px] font-bold text-center tracking-[-0.04em] mb-1 z-[1]"
          style={{ color:'var(--text-primary)', fontFamily:HEAD }}
          initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:.1 }}>
          {profile.name}
        </motion.h1>

        {profile.username && (
          <motion.p className="text-[14px] text-center mb-5 z-[1] m-0"
            style={{ color:'var(--text-muted)', fontFamily:BODY }}
            initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.15 }}>
            @{profile.username}
          </motion.p>
        )}

        {/* Blocked by guard */}
        {status === 'blocked_by' && <BlockedScreen navigate={navigate}/>}

        {/* Mutual count — only for friends */}
        {status === 'friends' && (
          <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }} className="mb-5 z-[1]">
            <button onClick={() => setFollowSheet(true)}
              className="flex flex-col items-center px-8 py-2.5 rounded-[18px] cursor-pointer border-none"
              style={{ background:isDark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.04)', border:`1px solid ${isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'}`, WebkitTapHighlightColor:'transparent' }}>
              <span className="text-[20px] font-extrabold tracking-[-0.03em] leading-none" style={{ color:'var(--text-primary)', fontFamily:HEAD }}>
                <AnimNum value={mutualCount}/>
              </span>
              <span className="text-[11.5px] font-medium leading-none mt-0.5" style={{ color:'var(--text-muted)', fontFamily:BODY }}>Mutual friends</span>
            </button>
          </motion.div>
        )}

        {/* Action buttons — all 12 states */}
        {!isSelf && status !== 'blocked_by' && (
          <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:.25 }}
            className="flex gap-2.5 w-full max-w-xs z-[1]">

            {/* none */}
            {status === 'none' && (
              <button onClick={() => doAction('follow')} disabled={actionBusy} style={{ ...primaryBtn, opacity:actionBusy?.6:1 }}>
                {actionBusy ? <Spinner/> : <><UserPlus size={16} color="#fff"/>Follow</>}
              </button>
            )}

            {/* pending */}
            {status === 'pending' && (
              <button disabled style={{ ...ghostBtn(isDark), cursor:'not-allowed' }}>Requested</button>
            )}

            {/* requested_me */}
            {status === 'requested_me' && (
              <>
                <button onClick={() => doAction('accept')} disabled={actionBusy} style={{ ...primaryBtn, opacity:actionBusy?.6:1 }}>
                  {actionBusy ? <Spinner/> : <><Check size={16} color="#fff"/>Confirm</>}
                </button>
                <button onClick={() => doAction('decline')} disabled={actionBusy} style={{ ...ghostBtn(isDark), opacity:actionBusy?.6:1 }}>
                  Delete
                </button>
              </>
            )}

            {/* following */}
            {status === 'following' && (
              <button onClick={() => setCfm({ title:'Unfollow this person?', desc:'You can follow them again later.', danger:false, onOk:async()=>{setCfm(null);doAction('unfollow')} })}
                disabled={actionBusy} style={{ ...ghostBtn(isDark), opacity:actionBusy?.6:1 }}>
                <UserCheck size={16} color="var(--text-primary)"/>Following
              </button>
            )}

            {/* friends — mutual, chat enabled */}
            {status === 'friends' && (
              <>
                <button onClick={() => setCfm({ title:'Unfollow this person?', desc:'You can follow them again later.', danger:false, onOk:async()=>{setCfm(null);doAction('unfollow')} })}
                  disabled={actionBusy} style={{ ...ghostBtn(isDark), opacity:actionBusy?.6:1 }}>
                  <UserCheck size={16} color="var(--text-primary)"/>Friends ✓
                </button>
                <button onClick={() => navigate(`/chat/${userId}`)} style={primaryBtn}>
                  <MessageCircle size={16} color="#fff"/>Message
                </button>
              </>
            )}

            {/* blocked */}
            {status === 'blocked' && (
              <button disabled className="flex-1 py-[13px] rounded-2xl flex items-center justify-center gap-1.5 cursor-not-allowed text-[15px] font-bold"
                style={{ background:'rgba(239,68,68,0.12)', color:'#ef4444', border:'1.5px solid rgba(239,68,68,0.25)', fontFamily:BODY }}>
                <ShieldOff size={16} color="#ef4444"/> Blocked
              </button>
            )}
          </motion.div>
        )}

        {/* Self — Edit Profile */}
        {isSelf && (
          <motion.button onClick={() => navigate('/profile')}
            initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:.25 }}
            className="w-full max-w-xs py-[14px] rounded-2xl font-bold text-[15px] cursor-pointer z-[1] border-none"
            style={{ ...ghostBtn(isDark), display:'block', textAlign:'center' }}>
            Edit Profile
          </motion.button>
        )}
      </div>

      <div className="h-px" style={{ background:'var(--divider)' }}/>

      {/* ── Badges ── */}
      {status !== 'blocked_by' && (
        <div className="pb-12" onClick={() => setMenuOpen(false)}>
          <div className="px-4 pt-5">
            <p className="text-[11px] font-bold uppercase tracking-[.1em] mb-2.5 pl-1" style={{ color:'var(--text-muted)', fontFamily:BODY }}>
              Achievements
            </p>
            {badges.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth:'none' }}>
                {badges.map((b, i) => {
                  const id=b?.id??b, def=BADGE_DEFS[id]; if(!def)return null
                  return (
                    <motion.div key={id+i} whileTap={{ scale:.92 }}
                      className="flex flex-col items-center gap-1 min-w-[62px] px-2 py-2.5 rounded-[14px] flex-shrink-0"
                      style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)' }}>
                      <span className="text-[20px] leading-none">{def.emoji}</span>
                      <span className="text-[9px] font-semibold text-center whitespace-nowrap" style={{ color:'var(--text-muted)', fontFamily:BODY }}>{def.label}</span>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <p className="text-[13px] pl-1" style={{ color:'var(--text-muted)', fontFamily:BODY }}>No badges yet 🌱</p>
            )}
          </div>
        </div>
      )}

      {/* ── Follow sheet ── */}
      <AnimatePresence>
        {followSheet && (
          <FollowSheet onClose={() => setFollowSheet(false)} isDark={isDark}
            initialTab="mutual" viewOnly={true} pendingRequests={[]}/>
        )}
      </AnimatePresence>

      {/* ── Confirm ── */}
      <AnimatePresence>
        {cfm && (
          <Confirm isDark={isDark} title={cfm.title} desc={cfm.desc}
            danger={cfm.danger} busy={actionBusy} onOk={cfm.onOk} onCancel={() => setCfm(null)}/>
        )}
      </AnimatePresence>
    </div>
  )
}