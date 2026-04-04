// frontend/src/modules/customer/pages/ProfilePage.jsx
// v5 — Full Tailwind CSS rewrite
// ✅ goBack fixed — always navigate(-1), never remounts MenuPage
// ✅ Tailwind CSS throughout — CSS vars from brand.js PALETTE
// ✅ Premium light & dark mode — warm amber/cream light, deep espresso dark
// ✅ All original logic preserved: social stats, follow sheet, loyalty, badges,
//    referral, sheets, settings, sound prefs, order history, avatar upload

import { useState, useEffect, useContext, useCallback, useRef } from 'react'
import { createPortal }             from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate }              from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, animate } from 'motion/react'
import toast                        from 'react-hot-toast'
import {
  Settings, Check, X, ChevronRight, Copy, Share2,
  ShieldCheck, Sun, Moon, Sparkles, Vibrate,
  Volume2, Info, Camera, Trash2, ArrowLeft,
} from 'lucide-react'

import { selectUser, selectIsGuest, updateUser } from '@store/slices/authSlice'
import { selectLoyalty }            from '@store/slices/loyaltySlice'
import { selectOrderHistory, selectOrderLoading, fetchOrderHistory } from '@store/slices/orderSlice'
import { showToast }                from '@store/slices/toastSlice'
import {
  selectPendingRequests,
  selectSocialCounts,
  setSocialCounts,
}                                   from '@store/slices/followSlice'
import { ThemeContext }             from '@shared/context/ThemeContext'
import { BRAND, FONTS, getPalette } from '@shared/config/brand'
import { useUIPrefs }               from '@shared/hooks/useUIPrefs'
import LogoutButton                 from '../components/profile/LogoutButton'
import { FollowSheet }              from '../components/profile/FollowSheet'
import api                          from '@api/axios'
import { ENDPOINTS as EP }          from '@api/endpoints'
import { lockScroll, unlockScroll } from '@shared/utils/lenisLock'

// ── Font aliases ──────────────────────────────────────────────────────────────
const HEAD = FONTS.heading ?? FONTS.display
const BODY = FONTS.body
const MONO = FONTS.mono
const APP_VER = import.meta.env.VITE_APP_VERSION || '1.0.0'

// ── Constants ─────────────────────────────────────────────────────────────────
const hasNudged  = () => sessionStorage.getItem('kc_pnudge') === '1'
const markNudged = () => sessionStorage.setItem('kc_pnudge', '1')
const isPhotoUrl = s => typeof s === 'string' && (s.startsWith('http://') || s.startsWith('https://'))
const isSvgId    = s => SVG_AVATARS.some(a => a.id === s)
const initials   = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
const fmt        = iso => new Date(iso).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'})
const loadSP     = () => { try { return JSON.parse(localStorage.getItem('kc_sound_prefs')||'{}') } catch { return {} } }
const saveSP     = p  => { try { localStorage.setItem('kc_sound_prefs', JSON.stringify(p)) } catch {} }

const OPTS = {
  gender:            [{v:'male',l:'Male 👨'},{v:'female',l:'Female 👩'},{v:'non-binary',l:'Non-binary 🌈'},{v:'prefer_not',l:'Prefer not to say'}],
  hobbies:           [{v:'coffee_lover',l:'☕ Coffee'},{v:'bookworm',l:'📚 Books'},{v:'gamer',l:'🎮 Gaming'},{v:'foodie',l:'🍜 Foodie'},{v:'traveller',l:'✈️ Travel'},{v:'sports',l:'⚽ Sports'},{v:'music',l:'🎵 Music'},{v:'art',l:'🎨 Art'},{v:'tech',l:'💻 Tech'},{v:'student',l:'📖 Study'}],
  occupation:        [{v:'student',l:'📚 Student'},{v:'working',l:'🏢 Working'},{v:'freelancer',l:'💻 Freelancer'},{v:'business_owner',l:'👔 Business'},{v:'other',l:'🌐 Other'}],
  foodPreference:    [{v:'veg',l:'🥗 Veg'},{v:'non_veg',l:'🍗 Non-Veg'},{v:'both',l:'🍽️ Both'},{v:'vegan',l:'🌱 Vegan'},{v:'halal',l:'🌙 Halal'},{v:'gluten_free',l:'🌾 GF'}],
  favouriteDrink:    [{v:'black_coffee',l:'☕ Black Coffee'},{v:'masala_chiya',l:'🍵 Masala Chiya'},{v:'cold_coffee',l:'🧊 Cold Coffee'},{v:'lassi',l:'🥛 Lassi'},{v:'juice',l:'🍊 Juice'},{v:'smoothie',l:'🥤 Smoothie'}],
  spiceTolerance:    [{v:'mild',l:'😌 Mild'},{v:'medium',l:'😊 Medium'},{v:'spicy',l:'😅 Spicy'},{v:'extra_spicy',l:'🔥 Lava'}],
  diningStyle:       [{v:'solo',l:'🧘 Solo'},{v:'friends',l:'👫 Friends'},{v:'family',l:'👨‍👩‍👧 Family'},{v:'work_meeting',l:'💼 Work'},{v:'date',l:'❤️ Date'}],
  preferredVisitTime:[{v:'morning',l:'🌅 Morning'},{v:'afternoon',l:'☀️ Afternoon'},{v:'evening',l:'🌆 Evening'},{v:'night_owl',l:'🦉 Night'}],
}

const BADGE_DEFS = {
  first_timer:{emoji:'🎉',label:'First Timer'}, chai_addict:{emoji:'☕',label:'Chai Addict'},
  night_owl:{emoji:'🦉',label:'Night Owl'}, explorer:{emoji:'🧭',label:'Explorer'},
  loyal_regular:{emoji:'💛',label:'Loyal Regular'}, big_spender:{emoji:'💸',label:'Big Spender'},
  social_butterfly:{emoji:'🦋',label:'Social Butterfly'}, review_royalty:{emoji:'👑',label:'Review Royalty'},
  streak_master:{emoji:'🔥',label:'Streak Master'},
}
const TIER_META = {none:{emoji:'☕',label:'Member'},bronze:{emoji:'🥉',label:'Bronze'},silver:{emoji:'🥈',label:'Silver'},gold:{emoji:'🥇',label:'Gold'}}
const TIER_PTS  = {none:0,bronze:0,silver:500,gold:1500}
const TIER_NEXT = {none:'bronze',bronze:'silver',silver:'gold',gold:null}
const STATUS_COL = {pending:'#B45309',preparing:'#1D4ED8',on_the_way:'#6D28D9',delivered:'#15803D',paid:'#0F766E',cancelled:'#B91C1C'}
const STATUS_LBL = {pending:'Pending',preparing:'Preparing',on_the_way:'On Way',delivered:'Delivered',paid:'Paid',cancelled:'Cancelled'}
const SOUND_KEYS = [
  {key:'orderPlaced',label:'Order Placed',icon:'🛍️'},{key:'orderReady',label:'Order Ready',icon:'🔔'},
  {key:'orderDelivered',label:'Delivered',icon:'✅'},{key:'pointsEarned',label:'Points Earned',icon:'⭐'},
  {key:'tierUpgraded',label:'Tier Upgraded',icon:'🏆'},{key:'notification',label:'Notifications',icon:'📣'},
]

const SVG_AVATARS = [
  {id:'the_regular',label:'Regular',bg:'linear-gradient(135deg,#FF9F1C,#E05C2A)',svg:<svg viewBox="0 0 64 64" fill="none" style={{width:'100%',height:'100%'}}><rect x="20" y="44" width="24" height="14" rx="6" fill="#E05C2A"/><rect x="28" y="38" width="8" height="8" rx="3" fill="#FDDCB5"/><circle cx="32" cy="30" r="14" fill="#FDDCB5"/><ellipse cx="32" cy="17" rx="13" ry="3.5" fill="#5C3317"/><path d="M25 29 Q27 27 29 29M35 29 Q37 27 39 29M28 35 Q32 38 36 35" stroke="#5C3317" strokeWidth="1.8" strokeLinecap="round" fill="none"/></svg>},
  {id:'bookworm',label:'Bookworm',bg:'linear-gradient(135deg,#8B5CF6,#6D28D9)',svg:<svg viewBox="0 0 64 64" fill="none" style={{width:'100%',height:'100%'}}><rect x="20" y="44" width="24" height="14" rx="6" fill="#7C3AED"/><rect x="28" y="38" width="8" height="8" rx="3" fill="#FDDCB5"/><circle cx="32" cy="29" r="14" fill="#FDDCB5"/><rect x="21" y="27" width="9" height="7" rx="3.5" fill="none" stroke="#5C3317" strokeWidth="2"/><rect x="34" y="27" width="9" height="7" rx="3.5" fill="none" stroke="#5C3317" strokeWidth="2"/><line x1="30" y1="30.5" x2="34" y2="30.5" stroke="#5C3317" strokeWidth="1.5"/></svg>},
  {id:'foodie',label:'Foodie',bg:'linear-gradient(135deg,#E05C2A,#C44A1A)',svg:<svg viewBox="0 0 64 64" fill="none" style={{width:'100%',height:'100%'}}><rect x="20" y="42" width="24" height="16" rx="6" fill="#FDE8DF"/><rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/><circle cx="32" cy="27" r="15" fill="#FDDCB5"/><path d="M17 24 Q18 14 32 13 Q46 14 47 24" fill="#92400E"/><path d="M24 33 Q32 40 40 33" stroke="#5C3317" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>},
  {id:'student',label:'Student',bg:'linear-gradient(135deg,#0EA5E9,#0369A1)',svg:<svg viewBox="0 0 64 64" fill="none" style={{width:'100%',height:'100%'}}><rect x="17" y="42" width="30" height="16" rx="6" fill="#BAE6FD"/><rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/><circle cx="32" cy="27" r="14" fill="#FDDCB5"/><polygon points="32,10 44,17 32,20 20,17" fill="#374151"/></svg>},
  {id:'artist',label:'Artist',bg:'linear-gradient(135deg,#F59E0B,#92400E)',svg:<svg viewBox="0 0 64 64" fill="none" style={{width:'100%',height:'100%'}}><rect x="18" y="42" width="28" height="16" rx="6" fill="#FEF3C7"/><rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/><circle cx="32" cy="27" r="14" fill="#FDDCB5"/><ellipse cx="32" cy="16" rx="14" ry="6" fill="#92400E"/></svg>},
  {id:'workaholic',label:'Work',bg:'linear-gradient(135deg,#2563EB,#1D4ED8)',svg:<svg viewBox="0 0 64 64" fill="none" style={{width:'100%',height:'100%'}}><rect x="14" y="38" width="36" height="14" rx="2" fill="#1F2937"/><rect x="16" y="40" width="32" height="10" rx="1" fill="#1D4ED8"/><rect x="28" y="22" width="8" height="8" rx="3" fill="#FDDCB5"/><circle cx="32" cy="16" r="12" fill="#FDDCB5"/></svg>},
]

// ── Animated number ───────────────────────────────────────────────────────────
function AnimNum({ value }) {
  const mv = useMotionValue(0)
  const [d, sd] = useState('0')
  useEffect(() => {
    const n = Number(String(value).replace(/\D/g,'')) || 0
    const c = animate(mv, n, { duration:1.1, ease:[.22,1,.36,1], onUpdate: v => sd(Math.round(v).toLocaleString()) })
    return c.stop
  }, [value]) // eslint-disable-line
  return <span>{d}</span>
}

// ── Toggle switch — uses CSS vars ─────────────────────────────────────────────
function Toggle({ value, onChange, label }) {
  return (
    <button
      type="button" onClick={() => onChange(!value)} aria-label={label}
      className="relative flex-shrink-0 cursor-pointer border-none p-0 transition-all duration-200"
      style={{
        width:50, height:28, borderRadius:999,
        background: value ? 'var(--accent-gradient)' : 'var(--pill-bg)',
        boxShadow: value ? '0 2px 10px var(--accent-glow)' : 'inset 0 1.5px 4px rgba(0,0,0,0.2)',
        outline: value ? 'none' : '1.5px solid var(--divider)',
        WebkitTapHighlightColor:'transparent',
      }}>
      <div
        className="absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white"
        style={{
          boxShadow:'0 1px 5px rgba(0,0,0,0.32)',
          transition:'transform .26s cubic-bezier(.34,1.56,.64,1)',
          transform: value ? 'translateX(24px)' : 'translateX(3px)',
        }}/>
    </button>
  )
}

// ── Chip options ──────────────────────────────────────────────────────────────
function Chips({ options, value, onChange, multi=false }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const on = multi ? (value||[]).includes(o.v) : value === o.v
        return (
          <button
            key={o.v} type="button"
            onClick={() => {
              if (multi) {
                const c = value||[]
                onChange(on ? c.filter(x=>x!==o.v) : [...c, o.v])
              } else onChange(on ? null : o.v)
            }}
            className="transition-all duration-150 cursor-pointer"
            style={{
              fontFamily:BODY, fontSize:12.5, fontWeight:on?700:500,
              padding:'7px 14px', borderRadius:999, whiteSpace:'nowrap',
              border:`1.5px solid ${on?'var(--accent-border)':'var(--divider)'}`,
              background: on ? 'var(--accent-dim)' : 'var(--pill-bg)',
              color: on ? 'var(--accent)' : 'var(--text-muted)',
              WebkitTapHighlightColor:'transparent',
            }}>
            {o.l}
          </button>
        )
      })}
    </div>
  )
}

// ── Input field ───────────────────────────────────────────────────────────────
function Inp({ style={}, ...props }) {
  return (
    <input
      className="w-full outline-none transition-all duration-150"
      style={{
        padding:'12px 14px', borderRadius:13,
        fontFamily:MONO, fontSize:16,
        color:'var(--text-primary)',
        background:'var(--input-bg)',
        border:'1.5px solid var(--input-border)',
        ...style,
      }}
      {...props}/>
  )
}

// ── Card surface ──────────────────────────────────────────────────────────────
function Card({ children, className='', style={} }) {
  return (
    <div
      className={`rounded-[18px] overflow-hidden ${className}`}
      style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)', ...style }}>
      {children}
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────
function SLabel({ children }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[.12em] mb-2 pl-0.5"
      style={{ color:'var(--text-muted)', fontFamily:BODY }}>
      {children}
    </p>
  )
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5 mb-3.5">
      <p className="text-[10px] font-bold uppercase tracking-[.12em]"
        style={{ color:'var(--text-muted)', fontFamily:BODY }}>
        {label}
      </p>
      {children}
    </div>
  )
}

// ── Save button ───────────────────────────────────────────────────────────────
function SaveBtn({ busy, onClick, label='Save' }) {
  return (
    <button
      type="button" onClick={onClick} disabled={busy}
      className="w-full flex items-center justify-center gap-2 rounded-[15px] font-bold cursor-pointer transition-opacity duration-150"
      style={{
        padding:'15px 0', fontFamily:BODY, fontSize:15,
        background:'var(--accent-gradient)', color:'#fff', border:'none',
        boxShadow:'0 4px 20px var(--accent-glow)',
        WebkitTapHighlightColor:'transparent',
        opacity: busy ? .5 : 1,
      }}>
      {busy
        ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>
        : <><Check size={15} color="#fff"/><span className="text-white">{label}</span></>
      }
    </button>
  )
}

// ── Bottom sheet ──────────────────────────────────────────────────────────────
function Sheet({ title, onClose, children, footer }) {
  useEffect(() => { lockScroll(); return () => unlockScroll() }, [])
  return createPortal(
    <>
      <motion.div
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        onClick={onClose}
        className="fixed inset-0 z-[200]"
        style={{ background:'rgba(0,0,0,0.62)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)' }}/>
      <motion.div
        initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
        transition={{type:'spring',stiffness:360,damping:34}}
        className="fixed bottom-0 left-0 right-0 z-[201] flex flex-col overflow-hidden"
        style={{
          maxHeight:'90dvh', borderRadius:'28px 28px 0 0',
          background:'var(--modal-bg)', border:'1px solid var(--modal-border)',
          borderBottom:'none', boxShadow:'0 -24px 80px rgba(0,0,0,0.55)',
        }}>
        {/* Handle */}
        <div className="flex justify-center pt-3.5 pb-1.5 flex-shrink-0">
          <div className="w-9 h-1 rounded-full" style={{background:'var(--divider)'}}/>
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3.5 flex-shrink-0"
          style={{ borderBottom:'1px solid var(--divider)' }}>
          <p className="text-[17px] font-bold tracking-[-0.02em]"
            style={{ color:'var(--text-primary)', fontFamily:HEAD }}>{title}</p>
          <button
            type="button" onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{ background:'var(--pill-bg)', border:'1px solid var(--divider)', WebkitTapHighlightColor:'transparent' }}>
            <X size={13} color="var(--text-muted)"/>
          </button>
        </div>
        {/* Body */}
        <div
          data-lenis-prevent
          onWheel={e=>e.stopPropagation()} onTouchStart={e=>e.stopPropagation()}
          className="flex-1 min-h-0 overflow-y-auto px-5 py-4"
          style={{ WebkitOverflowScrolling:'touch', overscrollBehavior:'contain' }}>
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 px-5 py-3" style={{
            paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 12px)',
            borderTop:'1px solid var(--divider)',
            background:'var(--modal-bg)',
          }}>
            {footer}
          </div>
        )}
      </motion.div>
    </>,
    document.body
  )
}

// ── Confirm dialog ────────────────────────────────────────────────────────────
function Confirm({ title, desc, detail, onOk, onCancel, busy, danger=false, isDark }) {
  useEffect(() => { lockScroll(); return () => unlockScroll() }, [])
  return createPortal(
    <>
      <motion.div
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        onClick={() => !busy && onCancel()}
        className="fixed inset-0 z-[209]"
        style={{ background:'rgba(0,0,0,0.45)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)' }}/>
      <motion.div
        initial={{opacity:0,y:-20,scale:.92}} animate={{opacity:1,y:0,scale:1}}
        exit={{opacity:0,y:-16,scale:.94}} transition={{type:'spring',stiffness:420,damping:30}}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-[calc(100vw-40px)] max-w-[360px] rounded-[24px] overflow-hidden"
        style={{
          backdropFilter:'blur(40px) saturate(1.8)', WebkitBackdropFilter:'blur(40px) saturate(1.8)',
          background: isDark ? 'rgba(18,10,3,0.72)' : 'rgba(255,248,235,0.78)',
          border:`1px solid ${danger?'rgba(248,113,113,0.35)':'rgba(255,159,28,0.3)'}`,
          boxShadow: danger ? '0 24px 80px rgba(220,38,38,0.25)' : '0 24px 80px rgba(0,0,0,0.5)',
        }}>
        <div className="h-[3px]" style={{ background: danger ? 'linear-gradient(90deg,#EF4444,#F87171)' : 'var(--accent-gradient)' }}/>
        <div className="p-5 pb-[22px]">
          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-[46px] h-[46px] rounded-[15px] flex-shrink-0 flex items-center justify-center"
              style={{
                background: danger ? 'rgba(239,68,68,0.15)' : 'rgba(255,159,28,0.15)',
                border:`1px solid ${danger?'rgba(239,68,68,0.2)':'rgba(255,159,28,0.2)'}`,
              }}>
              <ShieldCheck size={22} color={danger?'#EF4444':'var(--accent)'}/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[16px] font-bold tracking-[-0.02em] leading-[1.25] mb-1"
                style={{ color:'var(--text-primary)', fontFamily:HEAD }}>{title}</p>
              {desc && <p className="text-[13px] leading-[1.4]" style={{ color:'var(--text-muted)', fontFamily:BODY }}>{desc}</p>}
            </div>
          </div>
          {detail && (
            <div className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-[14px] mb-4"
              style={{ background:'var(--pill-bg)', border:'1px solid var(--divider)' }}>
              {detail}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" onClick={onCancel} disabled={busy}
              className="py-[13px] rounded-[14px] font-semibold text-[14px] cursor-pointer transition-opacity"
              style={{ fontFamily:BODY, background:'var(--pill-bg)', color:'var(--text-primary)', border:'1px solid var(--divider)', WebkitTapHighlightColor:'transparent' }}>
              Cancel
            </button>
            <button type="button" onClick={onOk} disabled={busy}
              className="py-[13px] rounded-[14px] font-bold text-[14px] text-white border-none cursor-pointer flex items-center justify-center gap-1.5 transition-opacity"
              style={{
                fontFamily:BODY,
                background: danger ? 'linear-gradient(135deg,#EF4444,#DC2626)' : 'var(--accent-gradient)',
                WebkitTapHighlightColor:'transparent',
                opacity: busy ? .7 : 1,
              }}>
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

// ── Order item row ────────────────────────────────────────────────────────────
function OItem({ order }) {
  const [open, setOpen] = useState(false)
  const col = STATUS_COL[order.status] || '#888'
  const lbl = STATUS_LBL[order.status] || order.status
  return (
    <div className="py-3" style={{ borderBottom:'1px solid var(--divider)' }}>
      <button type="button" onClick={() => setOpen(v=>!v)}
        className="w-full flex items-center gap-2.5 bg-transparent border-none cursor-pointer text-left p-1">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:col, boxShadow:`0 0 6px ${col}` }}/>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium flex items-center gap-2" style={{ color:'var(--text-primary)', fontFamily:MONO }}>
            #{order._id.slice(-6).toUpperCase()}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background:`${col}1a`, color:col, fontFamily:BODY }}>{lbl}</span>
          </p>
          <p className="text-[11.5px] mt-0.5" style={{ color:'var(--text-muted)', fontFamily:BODY }}>
            {fmt(order.createdAt)} · {BRAND.currency} {order.total}
          </p>
        </div>
        <motion.div animate={{rotate:open?90:0}} transition={{duration:.18}}>
          <ChevronRight size={14} color="var(--text-muted)"/>
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}}
            exit={{height:0,opacity:0}} transition={{duration:.2}}
            className="overflow-hidden pt-2.5">
            {order.items?.map((it,i) => (
              <div key={i} className="flex justify-between items-center mb-1.5">
                <span className="text-[12px]" style={{ color:'var(--text-muted)', fontFamily:BODY }}>
                  {it.emoji||'🍽️'} {it.name} <strong>×{it.quantity}</strong>
                </span>
                <span className="text-[12px]" style={{ color:'var(--text-primary)', fontFamily:MONO }}>
                  {BRAND.currency} {(it.price||0)*(it.quantity||1)}
                </span>
              </div>
            ))}
            {(order.pointsEarned||0)>0 && (
              <p className="text-[11.5px] font-semibold mt-1.5" style={{ color:'var(--accent)', fontFamily:BODY }}>
                ⭐ +{order.pointsEarned} pts
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Social stats bar ──────────────────────────────────────────────────────────
function SocialStats({ stats, isGuest, isDark, onOpen }) {
  if (isGuest) return null
  const items = [
    {key:'followers', label:'Followers', n:stats.followersCount},
    {key:'following', label:'Following', n:stats.followingCount},
    {key:'mutual',    label:'Mutual',    n:stats.mutualCount},
  ]
  return (
    <motion.div
      initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:.2}}
      className="flex w-full max-w-xs z-[1] mb-4 rounded-[18px] overflow-hidden"
      style={{
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        border:`1px solid ${isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'}`,
      }}>
      {items.map(({key,label,n},i) => (
        <button key={key} type="button" onClick={() => onOpen(key)}
          className="flex-1 flex flex-col items-center py-3 px-2 gap-0.5 bg-transparent border-none cursor-pointer"
          style={{
            borderRight: i<items.length-1 ? `1px solid ${isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'}` : 'none',
            WebkitTapHighlightColor:'transparent',
          }}>
          <span className="text-[20px] font-extrabold tracking-[-0.03em] leading-none"
            style={{ color:'var(--text-primary)', fontFamily:HEAD }}>
            <AnimNum value={n}/>
          </span>
          <span className="text-[11.5px] font-medium leading-none"
            style={{ color:'var(--text-muted)', fontFamily:BODY }}>
            {label}
          </span>
        </button>
      ))}
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function ProfilePage() {
  const dispatch    = useDispatch()
  const navigate    = useNavigate()
  const user        = useSelector(selectUser)
  const isGuest     = useSelector(selectIsGuest)
  const loyaltyRaw  = useSelector(selectLoyalty)
  const loyalty     = loyaltyRaw?.loyalty ?? loyaltyRaw ?? {}
  const history     = useSelector(selectOrderHistory) ?? []
  const histLoading = useSelector(selectOrderLoading)
  const pending     = useSelector(selectPendingRequests)
  const socialStats = useSelector(selectSocialCounts)
  const { isDark, toggleTheme } = useContext(ThemeContext)
  const { skyAnimationsEnabled, toggleSkyAnimations } = useUIPrefs()
  const fileRef = useRef(null)

  const [sheet,       setSheet]       = useState(null)
  const [followSheet, setFollowSheet] = useState(null)
  const [cfm,         setCfm]         = useState(null)
  const [busy,        setBusy]        = useState(false)
  const [avBusy,      setAvBusy]      = useState(false)
  const [imgPrev,     setImgPrev]     = useState(null)
  const [dEdit,       setDEdit]       = useState({})
  const [dPers,       setDPers]       = useState({})
  const [dPrefs,      setDPrefs]      = useState({})
  const [sp,          setSp]          = useState(loadSP)
  const [hap,         setHap]         = useState(() => localStorage.getItem('kc_haptic') !== 'false')

  const muted  = sp.__master === false
  const setMute = m => { const n={...sp,__master:!m}; setSp(n); saveSP(n) }
  const togSnd  = k => { const n={...sp,[k]:sp[k]!==false?false:true}; setSp(n); saveSP(n) }
  const sndOn   = k => !muted && sp[k] !== false

  useEffect(() => {
    if (!user) return
    setDEdit({ name:user.name||'', username:user.username||'', instagramHandle:user.instagramHandle||'' })
    setDPers({ dob:user.dob?new Date(user.dob).toISOString().slice(0,10):'', gender:user.gender||null, hobbies:user.hobbies||[], occupation:user.occupation||null })
    setDPrefs({ foodPreference:user.foodPreference||null, favouriteDrink:user.favouriteDrink||null, spiceTolerance:user.spiceTolerance||null, diningStyle:user.diningStyle||null, preferredVisitTime:user.preferredVisitTime||null })
  }, [user])

  useEffect(() => {
    if (!user?._id || isGuest) return
    api.get(`/social/list/stats/${user._id}`)
      .then(res => {
        const d = res?.data ?? res
        dispatch(setSocialCounts({ followersCount:d.followersCount??0, followingCount:d.followingCount??0, mutualCount:d.mutualCount??0 }))
      }).catch(() => {})
  }, [user?._id, isGuest, dispatch])

  useEffect(() => { if (!isGuest) dispatch(fetchOrderHistory()) }, [dispatch, isGuest])

  useEffect(() => {
    if (!user || isGuest || !user.isFirstLogin) return
    setTimeout(() => dispatch(showToast({ type:'system', title:`👋 Welcome to ${BRAND.name}!`, message:'Set up your profile to unlock personalised offers & bonus points 🎁', priority:2, duration:0, navigate:'/profile', actions:[{key:'setup',label:'Set Up Profile',primary:true}] })), 1500)
    api.patch(EP.AUTH.UPDATE_PROFILE, { isFirstLogin:false }).catch(() => {})
  }, []) // eslint-disable-line

  useEffect(() => {
    if (!user || isGuest || hasNudged()) return
    const missing = [!user.avatar&&'profile photo',!user.dob&&'date of birth',!user.gender&&'gender',!user.hobbies?.length&&'hobbies'].filter(Boolean)
    if (!missing.length) return
    markNudged()
    const msgs = [
      { title:'🕵️ We barely know you!', message:`Your ${missing[0]} is missing. We can't send you vibes without it! 🧋` },
      { title:'😅 Hello stranger…', message:`Add your ${missing[0]} — even your barista knows more about you!` },
      { title:'🍵 Your profile is cold.', message:`Add your ${missing[0]} to warm it up! Complete = surprise rewards 🎁` },
    ]
    const m = msgs[Math.floor(Math.random()*msgs.length)]
    setTimeout(() => dispatch(showToast({ type:'system', title:m.title, message:m.message, priority:4, duration:8000, navigate:'/profile', actions:[{key:'complete',label:'Complete Profile',primary:true}] })), 3000)
  }, []) // eslint-disable-line

  const save = useCallback(async (data, onDone) => {
    setBusy(true)
    try {
      const r = await api.patch(EP.AUTH.UPDATE_PROFILE, data)
      dispatch(updateUser(r?.data ?? r))
      toast.success('Saved!')
      onDone?.()
    } catch(e) { toast.error(e.response?.data?.message || 'Save failed') }
    finally { setBusy(false) }
  }, [dispatch])

  const saveEdit = useCallback(() => {
    if (dEdit.username && dEdit.username !== (user?.username||'')) {
      setCfm({
        title:'Change username?', desc:'This is your login handle.',
        detail: (
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-[12px]" style={{ fontFamily:MONO, background:'var(--pill-bg)', color:'var(--text-muted)' }}>@{user?.username||'none'}</span>
            <span className="font-semibold" style={{ color:'var(--accent)' }}>→</span>
            <span className="px-2.5 py-1 rounded-lg text-[12px]" style={{ fontFamily:MONO, background:'var(--accent-dim)', color:'var(--accent)' }}>@{dEdit.username}</span>
          </div>
        ),
        onOk: () => { setCfm(null); save(dEdit, () => setSheet(null)) },
      })
    } else save(dEdit, () => setSheet(null))
  }, [dEdit, user, save])

  const handleFile = useCallback(async e => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 5*1024*1024) { toast.error('Image must be under 5MB'); return }
    const prev = URL.createObjectURL(file); setImgPrev(prev); setSheet(null); setAvBusy(true)
    try {
      const fd = new FormData(); fd.append('avatar', file)
      const r = await api.post('/auth/avatar', fd, { headers:{'Content-Type':undefined} })
      dispatch(updateUser(r?.data?.user ?? r?.user ?? r?.data ?? r))
      setImgPrev(null); toast.success('Photo updated! 📸')
    } catch(e) { toast.error(e.response?.data?.message || 'Upload failed'); setImgPrev(null) }
    finally { setAvBusy(false); if (fileRef.current) fileRef.current.value=''; URL.revokeObjectURL(prev) }
  }, [dispatch])

  const pickSvg = useCallback(async id => {
    setSheet(null); setAvBusy(true)
    try { const r = await api.patch(EP.AUTH.UPDATE_PROFILE, { avatar:id }); dispatch(updateUser(r?.data ?? r)); setImgPrev(null) }
    catch { toast.error('Failed') } finally { setAvBusy(false) }
  }, [dispatch])

  const removePhoto = useCallback(() => {
    setCfm({
      title:'Remove photo?', desc:'Your profile will show initials.', danger:true,
      onOk: async () => {
        setCfm(null); setAvBusy(true)
        try {
          const r = await api.delete('/auth/avatar')
          dispatch(updateUser(r?.data?.user ?? r?.user ?? r?.data ?? r))
          setImgPrev(null); toast.success('Photo removed')
        } catch(e) { toast.error(e.response?.data?.message || 'Failed') }
        finally { setAvBusy(false) }
      },
    })
  }, [dispatch])

  const copyRef = () => { if (!user?.referralCode) return; navigator.clipboard?.writeText(user.referralCode).then(() => toast.success('Code copied!')) }
  const shareRef = async () => {
    if (!user?.referralCode) return
    const t = `Join me at ${BRAND.name}! Use code ${user.referralCode} for 50 bonus points.`
    if (navigator.share) try { await navigator.share({ title:`${BRAND.name} Referral`, text:t }) } catch {}
    else navigator.clipboard?.writeText(t).then(() => toast.success('Copied!'))
  }

  // ✅ FIX: goBack — always navigate(-1), never remounts MenuPage
  const goBack = useCallback(() => navigate(-1), [navigate])

  // Derived values
  const tier      = loyalty?.tier || 'none'
  const tierM     = TIER_META[tier] || TIER_META.none
  const totalPts  = loyalty?.points || 0
  const badges    = user?.badges || []
  const nextTier  = TIER_NEXT[tier]
  const maxPts    = nextTier ? TIER_PTS[nextTier] : 1500
  const basePts   = TIER_PTS[tier] || 0
  const barPct    = nextTier ? Math.min(100, ((totalPts-basePts)/(maxPts-basePts))*100) : 100
  const CFIELDS   = ['name','email','dob','gender','hobbies','occupation','foodPreference','favouriteDrink','spiceTolerance','diningStyle','preferredVisitTime','avatar']
  const completion = user ? Math.round(CFIELDS.filter(f=>{const v=user[f];return v!==null&&v!==undefined&&v!==''&&!(Array.isArray(v)&&v.length===0)}).length/CFIELDS.length*100) : 0
  const svgAv    = isSvgId(user?.avatar) ? SVG_AVATARS.find(a=>a.id===user.avatar) : null
  const photoUrl = isPhotoUrl(user?.avatar) ? user.avatar : null
  const dispSrc  = imgPrev || photoUrl
  const igHandle = user?.instagramHandle?.trim()

  return (
    <div
      className="min-h-dvh customer-container"
      style={{ background:'var(--bg)', fontFamily:BODY, WebkitFontSmoothing:'antialiased' }}>
      <style>{`@import url('${FONTS.googleUrl}');@keyframes pf-spin{to{transform:rotate(360deg)}}`}</style>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile}/>

      {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 flex items-center justify-between overflow-hidden"
        style={{
          paddingTop:'calc(env(safe-area-inset-top,0px) + 10px)',
          paddingBottom:10, paddingLeft:16, paddingRight:16,
          background: isDark ? 'rgba(16,12,8,0.52)' : 'rgba(255,255,255,0.42)',
          backdropFilter:'blur(28px) saturate(180%)', WebkitBackdropFilter:'blur(28px) saturate(180%)',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.55)',
          boxShadow: isDark
            ? '0 8px 32px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.06)'
            : '0 4px 24px rgba(0,0,0,0.10),inset 0 1px 0 rgba(255,255,255,0.80)',
        }}>
        {/* Top shimmer line */}
        <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background:'var(--top-glow)' }}/>

        <button type="button" onClick={goBack}
          className="w-[38px] h-[38px] rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
          style={{
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
            border:`1px solid ${isDark?'rgba(255,255,255,0.13)':'rgba(0,0,0,0.09)'}`,
            WebkitTapHighlightColor:'transparent',
          }}>
          <ArrowLeft size={17} strokeWidth={2.5} color="var(--text-primary)"/>
        </button>

        <p className="absolute left-1/2 -translate-x-1/2 text-[16px] font-bold tracking-[-0.03em]"
          style={{ color:'var(--text-primary)', fontFamily:HEAD }}>
          Profile
        </p>

        <button type="button" onClick={() => setSheet('settings')}
          className="w-[38px] h-[38px] rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
          style={{
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
            border:`1px solid ${isDark?'rgba(255,255,255,0.13)':'rgba(0,0,0,0.09)'}`,
            WebkitTapHighlightColor:'transparent',
          }}>
          <Settings size={17} strokeWidth={2} color="var(--text-muted)"/>
        </button>
      </div>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center px-6 pt-9 pb-7 relative overflow-hidden"
        style={{ background:'var(--bg)' }}>
        {/* Ambient glow orb */}
        <div className="absolute pointer-events-none"
          style={{
            top:-40, left:'50%', transform:'translateX(-50%)',
            width:360, height:360, borderRadius:'50%',
            background:'radial-gradient(ellipse at center, var(--orb-color) 0%, var(--orb-color-2) 38%, transparent 68%)',
          }}/>

        {/* Avatar */}
        <motion.div
          className="relative z-[1] mb-[18px]"
          initial={{scale:.7,opacity:0}} animate={{scale:1,opacity:1}}
          transition={{duration:.5,ease:[.34,1.56,.64,1]}}>
          <div className="w-[108px] h-[108px] rounded-full overflow-hidden relative"
            style={{
              background:'var(--accent-dim)',
              boxShadow:'0 0 0 3px var(--bg), 0 0 0 5px var(--accent-border), 0 14px 40px var(--accent-glow)',
            }}>
            {dispSrc
              ? <img src={dispSrc} alt={user?.name} className="w-full h-full object-cover block"/>
              : svgAv
              ? <div className="w-full h-full p-0.5" style={{ background:svgAv.bg }}>{svgAv.svg}</div>
              : <div className="w-full h-full flex items-center justify-center text-[32px] font-extrabold text-white"
                  style={{ background:'var(--accent-gradient)', fontFamily:HEAD }}>
                  {initials(user?.name)}
                </div>
            }
            {avBusy && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-[2.5px] border-white/30 border-t-white" style={{animation:'pf-spin .8s linear infinite'}}/>
              </div>
            )}
          </div>
          {!isGuest && (
            <button type="button" onClick={() => setSheet('avatar')}
              className="absolute bottom-0.5 right-0.5 w-[30px] h-[30px] rounded-full flex items-center justify-center cursor-pointer z-[2]"
              style={{ background:'var(--accent-gradient)', border:'2.5px solid var(--bg)' }}>
              <Camera size={12} color="#fff"/>
            </button>
          )}
        </motion.div>

        {/* Name */}
        <motion.h1
          className="text-[24px] font-bold text-center tracking-[-0.04em] mb-1 z-[1]"
          style={{ color:'var(--text-primary)', fontFamily:HEAD }}
          initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.1}}>
          {isGuest ? 'Guest User' : (user?.name || 'User')}
        </motion.h1>

        {/* Tagline */}
        <motion.p
          className="text-[14px] text-center mb-5 z-[1]"
          style={{ color:'var(--text-muted)', fontFamily:BODY }}
          initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.15}}>
          {isGuest
            ? 'Browsing as guest'
            : user?.username
            ? `@${user.username} · ${tierM.emoji} ${tierM.label}`
            : `${tierM.emoji} ${tierM.label} Member`
          }
        </motion.p>

        {/* Social stats */}
        <SocialStats stats={socialStats} isGuest={isGuest} isDark={isDark} onOpen={tab => setFollowSheet(tab)}/>

        {/* Instagram link */}
        {!isGuest && igHandle && (
          <motion.a
            href={`https://instagram.com/${igHandle}`} target="_blank" rel="noreferrer"
            initial={{opacity:0,scale:.9}} animate={{opacity:1,scale:1}} transition={{delay:.25}}
            className="inline-flex items-center gap-1.5 z-[1] mb-5 -mt-1 px-3.5 py-[7px] rounded-full no-underline cursor-pointer"
            style={{
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
              border: isDark ? '1px solid rgba(255,255,255,0.13)' : '1px solid rgba(0,0,0,0.09)',
              boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
              WebkitTapHighlightColor:'transparent',
            }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="ig-g" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f09433"/><stop offset="25%" stopColor="#e6683c"/><stop offset="50%" stopColor="#dc2743"/><stop offset="75%" stopColor="#cc2366"/><stop offset="100%" stopColor="#bc1888"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="6" stroke="url(#ig-g)" strokeWidth="2"/><circle cx="12" cy="12" r="4" stroke="url(#ig-g)" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1" fill="url(#ig-g)"/></svg>
            <span className="text-[13px] font-semibold" style={{ color:'var(--text-primary)', fontFamily:BODY }}>Instagram</span>
          </motion.a>
        )}

        {/* Profile completion bar */}
        {!isGuest && completion < 100 && (
          <motion.div
            className="mb-5 z-[1] w-full max-w-xs"
            initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:.28}}>
            <div className="flex justify-between mb-1.5">
              <span className="text-[11px]" style={{ color:'var(--text-muted)', fontFamily:BODY }}>Profile {completion}% complete</span>
              <span className="text-[11px] font-bold" style={{ color:'var(--accent)', fontFamily:MONO }}>{100-completion}% to go</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background:'var(--pill-bg)' }}>
              <motion.div
                className="h-full rounded-full" style={{ background:'var(--accent-gradient)' }}
                initial={{width:0}} animate={{width:`${completion}%`}}
                transition={{duration:1.2,ease:[.22,1,.36,1],delay:.6}}/>
            </div>
          </motion.div>
        )}

        {/* Edit Profile btn */}
        {!isGuest && (
          <motion.button
            type="button" onClick={() => setSheet('edit')}
            className="w-full max-w-xs py-[14px] rounded-[16px] font-bold text-[15px] cursor-pointer z-[1] tracking-[-0.01em]"
            style={{
              fontFamily:BODY, color:'var(--text-primary)',
              background: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)',
              border:`1.5px solid ${isDark?'rgba(255,255,255,0.13)':'rgba(0,0,0,0.11)'}`,
              WebkitTapHighlightColor:'transparent',
            }}
            initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:.3}}
            whileTap={{scale:.97}}>
            Edit Profile
          </motion.button>
        )}
      </div>

      {/* Divider */}
      <div className="h-px" style={{ background:'var(--divider)' }}/>

      {/* ── BODY ─────────────────────────────────────────────────────────── */}
      <div className="pb-12">

        {/* Loyalty card */}
        {!isGuest && (
          <div className="px-4 pt-5">
            <Card>
              <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="text-[15px] font-bold" style={{ color:'var(--text-primary)', fontFamily:HEAD }}>
                      {tierM.emoji} {tierM.label}
                    </p>
                    {nextTier && (
                      <p className="text-[11px] mt-0.5" style={{ color:'var(--text-muted)', fontFamily:BODY }}>
                        → {nextTier.charAt(0).toUpperCase()+nextTier.slice(1)}
                      </p>
                    )}
                  </div>
                  <p className="text-[13px]" style={{ color:'var(--accent)', fontFamily:MONO }}>
                    {totalPts.toLocaleString()} pts
                  </p>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'var(--pill-bg)' }}>
                  <motion.div
                    className="h-full rounded-full relative overflow-hidden"
                    style={{ background:'var(--accent-gradient)' }}
                    initial={{width:0}} animate={{width:`${barPct}%`}}
                    transition={{duration:1.3,ease:[.22,1,.36,1],delay:.5}}>
                    <motion.div
                      className="absolute inset-0"
                      style={{ background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.3) 50%,transparent)' }}
                      animate={{x:['-100%','200%']}}
                      transition={{duration:2,repeat:Infinity,repeatDelay:2.5,delay:1.5}}/>
                  </motion.div>
                </div>
                <div className="flex justify-between mt-[7px] text-[11px]" style={{ color:'var(--text-muted)', fontFamily:BODY }}>
                  <span>{nextTier ? `${totalPts.toLocaleString()} / ${maxPts.toLocaleString()} pts` : '🎉 Max tier!'}</span>
                  <span>{Math.round(barPct)}%</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Badges */}
        {!isGuest && badges.length > 0 && (
          <div className="px-4 pt-5">
            <p className="text-[11px] font-bold uppercase tracking-[.1em] mb-2.5 pl-1"
              style={{ color:'var(--text-muted)', fontFamily:BODY }}>Achievements</p>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth:'none' }}>
              {badges.map(b => {
                const def = BADGE_DEFS[b.id]; if (!def) return null
                return (
                  <motion.div key={b.id} whileTap={{scale:.92}}
                    className="flex flex-col items-center gap-1 min-w-[62px] px-2 py-2.5 rounded-[14px] flex-shrink-0"
                    style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)' }}>
                    <span className="text-[20px] leading-none">{def.emoji}</span>
                    <span className="text-[9px] font-semibold text-center whitespace-nowrap"
                      style={{ color:'var(--text-muted)', fontFamily:BODY }}>{def.label}</span>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* Referral */}
        {!isGuest && user?.referralCode && (
          <div className="px-4 pt-5">
            <Card>
              <div className="p-4">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[14px] font-bold" style={{ color:'var(--text-primary)', fontFamily:HEAD }}>🎁 Refer a Friend</p>
                  {(user.referralCount||0)>0 && (
                    <span className="text-[11px] font-semibold" style={{ color:'var(--success)', fontFamily:BODY }}>
                      ✓ {user.referralCount} referred
                    </span>
                  )}
                </div>
                <p className="text-[12px] mb-2.5" style={{ color:'var(--text-muted)', fontFamily:BODY }}>
                  Both earn <strong style={{ color:'var(--accent)' }}>50 bonus points</strong>
                </p>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 py-2.5 px-3.5 rounded-[12px] flex items-center justify-center"
                    style={{ background:'var(--pill-bg)', border:'1.5px solid var(--divider)' }}>
                    <span className="text-[17px] font-bold tracking-[.08em]"
                      style={{ color:'var(--accent)', fontFamily:MONO }}>
                      {user.referralCode}
                    </span>
                  </div>
                  <motion.button type="button" whileTap={{scale:.88}} onClick={copyRef}
                    className="w-[42px] h-[42px] rounded-xl flex items-center justify-center cursor-pointer"
                    style={{ border:'1.5px solid var(--divider)', background:'var(--pill-bg)' }}>
                    <Copy size={16} color="var(--accent)"/>
                  </motion.button>
                  <motion.button type="button" whileTap={{scale:.88}} onClick={shareRef}
                    className="w-[42px] h-[42px] rounded-xl flex items-center justify-center cursor-pointer border-none"
                    style={{ background:'var(--accent-gradient)' }}>
                    <Share2 size={16} color="#fff"/>
                  </motion.button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Nav groups */}
        {[
          { label:'My Profile', rows:[
            {icon:'🧬', bg:'var(--accent-dim)',  label:'Personal Info',  sub:'DOB, gender, hobbies',     key:'personal'},
            {icon:'✨', bg:'rgba(52,211,153,.15)', label:'Preferences',    sub:'Food, drink, dining style', key:'prefs'},
            {icon:'📦', bg:'rgba(96,165,250,.15)', label:'Order History', sub:`${history.length} order${history.length!==1?'s':''}`, key:'orders'},
          ]},
          { label:'More', rows:[
            {icon:'ℹ️', bg:'var(--pill-bg)', label:'About', sub:`${BRAND.name} v${APP_VER}`, key:'about'},
          ]},
        ].map((grp, gi) => (
          <motion.div key={grp.label} className="px-4 pt-5"
            initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.34+gi*.06}}>
            <p className="text-[11px] font-bold uppercase tracking-[.1em] mb-2.5 pl-1"
              style={{ color:'var(--text-muted)', fontFamily:BODY }}>{grp.label}</p>
            <Card>
              {grp.rows.map((row, ri, arr) => (
                <button key={row.key} type="button" onClick={() => setSheet(row.key)}
                  className="flex items-center gap-3 px-4 py-[13px] cursor-pointer bg-transparent border-none w-full text-left"
                  style={{
                    borderBottom: ri<arr.length-1 ? '1px solid var(--divider)' : 'none',
                    WebkitTapHighlightColor:'transparent',
                  }}>
                  <div className="w-[34px] h-[34px] rounded-[10px] flex-shrink-0 flex items-center justify-center text-[16px]"
                    style={{ background:row.bg }}>
                    {row.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium leading-[1.2]" style={{ color:'var(--text-primary)', fontFamily:BODY }}>
                      {row.label}
                    </p>
                    {row.sub && (
                      <p className="text-[11.5px] mt-0.5" style={{ color:'var(--text-muted)', fontFamily:BODY }}>
                        {row.sub}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={15} color="var(--text-muted)"/>
                </button>
              ))}
            </Card>
          </motion.div>
        ))}

        <motion.div className="px-4 pt-5 pb-2"
          initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.44}}>
          <LogoutButton/>
        </motion.div>
      </div>

      {/* ── SHEETS ───────────────────────────────────────────────────────── */}
      <AnimatePresence>

        {/* Avatar picker */}
        {sheet === 'avatar' && (
          <Sheet title="Profile Photo" onClose={() => setSheet(null)}>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex items-center gap-3.5 py-3.5 w-full text-left cursor-pointer bg-transparent border-none"
              style={{ borderBottom:'1px solid var(--divider)' }}>
              <div className="w-[46px] h-[46px] rounded-[14px] flex-shrink-0 flex items-center justify-center"
                style={{ background:'var(--accent-dim)' }}>
                <Camera size={20} color="var(--accent)"/>
              </div>
              <div>
                <p className="text-[14px] font-semibold" style={{ color:'var(--text-primary)', fontFamily:BODY }}>Upload Photo</p>
                <p className="text-[12px] mt-0.5" style={{ color:'var(--text-muted)', fontFamily:BODY }}>Camera or photo library · max 5MB</p>
              </div>
            </button>

            {(dispSrc || isPhotoUrl(user?.avatar)) && (
              <button type="button" onClick={removePhoto}
                className="flex items-center gap-3.5 py-3.5 w-full text-left cursor-pointer bg-transparent border-none"
                style={{ borderBottom:'1px solid rgba(239,68,68,0.2)' }}>
                <div className="w-[46px] h-[46px] rounded-[14px] flex-shrink-0 flex items-center justify-center bg-red-500/10">
                  <Trash2 size={18} color="#EF4444"/>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-red-400" style={{ fontFamily:BODY }}>Remove Photo</p>
                  <p className="text-[12px] mt-0.5" style={{ color:'var(--text-muted)', fontFamily:BODY }}>Revert to initials avatar</p>
                </div>
              </button>
            )}

            <p className="text-[10px] font-bold uppercase tracking-[.12em] mt-5 mb-3"
              style={{ color:'var(--text-muted)', fontFamily:BODY }}>Choose an avatar</p>
            <div className="grid grid-cols-3 gap-2.5">
              {SVG_AVATARS.map(av => {
                const sel = user?.avatar === av.id
                return (
                  <motion.button key={av.id} type="button" whileTap={{scale:.88}} onClick={() => pickSvg(av.id)}
                    className="flex flex-col items-center gap-1.5 bg-transparent border-none cursor-pointer p-0">
                    <div className="w-full aspect-square rounded-[16px] overflow-hidden p-0.5 relative transition-all duration-150"
                      style={{
                        background:av.bg,
                        boxShadow: sel ? '0 0 0 2.5px var(--accent), 0 4px 14px var(--accent-glow)' : '0 2px 8px rgba(0,0,0,0.1)',
                        transform: sel ? 'scale(1.06)' : 'scale(1)',
                      }}>
                      {av.svg}
                      {sel && (
                        <motion.div initial={{scale:0}} animate={{scale:1}}
                          className="absolute -top-[3px] -right-[3px] w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ background:'var(--accent-gradient)', border:'2px solid var(--bg)' }}>
                          <Check size={8} color="#fff" strokeWidth={3}/>
                        </motion.div>
                      )}
                    </div>
                    <span className="text-[10px] font-medium"
                      style={{ color: sel ? 'var(--accent)' : 'var(--text-muted)', fontFamily:BODY }}>
                      {av.label}
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </Sheet>
        )}

        {/* Edit profile */}
        {sheet === 'edit' && (
          <Sheet title="Edit Profile" onClose={() => setSheet(null)}
            footer={<SaveBtn busy={busy} onClick={saveEdit} label="Save Changes"/>}>
            <div className="mb-6">
              <SLabel>Identity</SLabel>
              <Field label="Full Name">
                <Inp value={dEdit.name||''} placeholder="Your name" onChange={e=>setDEdit(p=>({...p,name:e.target.value}))}/>
              </Field>
              <Field label="Username">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px]" style={{ fontFamily:MONO, color:'var(--text-muted)', flexShrink:0 }}>@</span>
                  <Inp style={{flex:1}} value={dEdit.username||''} maxLength={20} placeholder="your_handle"
                    onChange={e=>setDEdit(p=>({...p,username:e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'')}))}/>
                </div>
              </Field>
            </div>
            <div>
              <SLabel>Social</SLabel>
              <Field label="Instagram Handle">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px]" style={{ fontFamily:MONO, color:'var(--text-muted)', flexShrink:0 }}>@</span>
                  <Inp style={{flex:1}} value={dEdit.instagramHandle||''} maxLength={30} placeholder="yourhandle"
                    onChange={e=>setDEdit(p=>({...p,instagramHandle:e.target.value.replace(/^@/,'')}))}/>
                </div>
              </Field>
            </div>
          </Sheet>
        )}

        {/* Personal info */}
        {sheet === 'personal' && (
          <Sheet title="Personal Info" onClose={() => setSheet(null)}
            footer={<SaveBtn busy={busy} onClick={() => save(dPers, () => setSheet(null))}/>}>
            <div className="mb-6">
              <SLabel>About You</SLabel>
              <Field label="Date of Birth">
                <input type="date" value={dPers.dob||''} onChange={e=>setDPers(p=>({...p,dob:e.target.value}))}
                  className="w-full outline-none block"
                  style={{
                    padding:'12px 14px', borderRadius:13, fontFamily:MONO, fontSize:16, boxSizing:'border-box',
                    color:'var(--text-primary)', background:'var(--input-bg)', border:'1.5px solid var(--input-border)',
                    WebkitAppearance:'none', appearance:'none',
                  }}/>
              </Field>
              <Field label="Gender"><Chips options={OPTS.gender} value={dPers.gender} onChange={v=>setDPers(p=>({...p,gender:v}))}/></Field>
            </div>
            <div>
              <SLabel>Lifestyle</SLabel>
              <Field label="Occupation"><Chips options={OPTS.occupation} value={dPers.occupation} onChange={v=>setDPers(p=>({...p,occupation:v}))}/></Field>
              <Field label="Hobbies"><Chips options={OPTS.hobbies} value={dPers.hobbies} onChange={v=>setDPers(p=>({...p,hobbies:v}))} multi/></Field>
            </div>
          </Sheet>
        )}

        {/* Preferences */}
        {sheet === 'prefs' && (
          <Sheet title="Preferences" onClose={() => setSheet(null)}
            footer={<SaveBtn busy={busy} onClick={() => save(dPrefs, () => setSheet(null))}/>}>
            <div className="mb-6">
              <SLabel>Food & Drink</SLabel>
              {[['Food Preference','foodPreference',OPTS.foodPreference],['Favourite Drink','favouriteDrink',OPTS.favouriteDrink],['Spice Tolerance','spiceTolerance',OPTS.spiceTolerance]].map(([lbl,key,opts]) => (
                <Field key={key} label={lbl}>
                  <Chips options={opts} value={dPrefs[key]} onChange={v=>setDPrefs(p=>({...p,[key]:v}))}/>
                </Field>
              ))}
            </div>
            <div>
              <SLabel>Dining Habits</SLabel>
              {[['Dining Style','diningStyle',OPTS.diningStyle],['Visit Time','preferredVisitTime',OPTS.preferredVisitTime]].map(([lbl,key,opts]) => (
                <Field key={key} label={lbl}>
                  <Chips options={opts} value={dPrefs[key]} onChange={v=>setDPrefs(p=>({...p,[key]:v}))}/>
                </Field>
              ))}
            </div>
          </Sheet>
        )}

        {/* Order history */}
        {sheet === 'orders' && (
          <Sheet title="Order History" onClose={() => setSheet(null)}>
            {histLoading
              ? [1,2,3].map(i => (
                  <div key={i} className="h-[52px] mb-2 rounded-[10px]" style={{ background:'var(--pill-bg)' }}/>
                ))
              : history.length === 0
              ? <div className="text-center py-8">
                  <p className="text-[32px] mb-2">😋</p>
                  <p className="text-[14px]" style={{ color:'var(--text-muted)', fontFamily:BODY }}>No orders yet</p>
                </div>
              : history.map(o => <OItem key={o._id} order={o}/>)
            }
          </Sheet>
        )}

        {/* Settings */}
        {sheet === 'settings' && (
          <Sheet title="Settings" onClose={() => setSheet(null)}>
            {/* Sound */}
            <div className="mb-6">
              <SLabel>Sound</SLabel>
              <Card>
                <div className="flex items-center gap-3 px-4 py-[13px]" style={{ borderBottom:'1px solid var(--divider)' }}>
                  <div className="w-[34px] h-[34px] rounded-[10px] flex-shrink-0 flex items-center justify-center" style={{ background:'rgba(255,159,28,0.15)' }}>
                    <Volume2 size={16} color="var(--accent)"/>
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-medium" style={{ color:'var(--text-primary)', fontFamily:BODY }}>All Sounds</p>
                    <p className="text-[11.5px] mt-0.5" style={{ color:'var(--text-muted)', fontFamily:BODY }}>{muted?'Muted':'Enabled'}</p>
                  </div>
                  <Toggle value={!muted} onChange={v=>setMute(!v)} label="All Sounds"/>
                </div>
                {!muted && SOUND_KEYS.map((s, si, arr) => (
                  <div key={s.key} className="flex items-center gap-3 px-4 py-[13px]"
                    style={{ borderBottom:si<arr.length-1?'1px solid var(--divider)':'none' }}>
                    <div className="w-[34px] h-[34px] rounded-[10px] flex-shrink-0 flex items-center justify-center text-[15px]"
                      style={{ background:'var(--pill-bg)' }}>
                      {s.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] font-medium" style={{ color:'var(--text-primary)', fontFamily:BODY }}>{s.label}</p>
                    </div>
                    <Toggle value={sndOn(s.key)} onChange={() => togSnd(s.key)} label={s.label}/>
                  </div>
                ))}
              </Card>
            </div>

            {/* Display */}
            <div>
              <SLabel>Display</SLabel>
              <Card>
                {[
                  { icon: isDark ? <Moon size={16} color="var(--text-muted)"/> : <Sun size={16} color="var(--text-muted)"/>, bg:'var(--pill-bg)', label:'Dark Mode', sub:undefined, val:isDark, onChange:toggleTheme },
                  { icon:<Vibrate size={16} color="#8B5CF6"/>, bg:'rgba(139,92,246,0.15)', label:'Haptic', sub:undefined, val:hap, onChange:v=>{setHap(v);localStorage.setItem('kc_haptic',String(v))} },
                  { icon:<Sparkles size={16} color="#38BDF8"/>, bg:'rgba(56,189,248,0.15)', label:'Sky Animations', sub:skyAnimationsEnabled?'Live canvas':'Static bg', val:skyAnimationsEnabled, onChange:toggleSkyAnimations },
                ].map(({ icon, bg, label, sub, val, onChange }, i, arr) => (
                  <div key={label} className="flex items-center gap-3 px-4 py-[13px]"
                    style={{ borderBottom:i<arr.length-1?'1px solid var(--divider)':'none' }}>
                    <div className="w-[34px] h-[34px] rounded-[10px] flex-shrink-0 flex items-center justify-center" style={{ background:bg }}>
                      {icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] font-medium" style={{ color:'var(--text-primary)', fontFamily:BODY }}>{label}</p>
                      {sub && <p className="text-[11.5px] mt-0.5" style={{ color:'var(--text-muted)', fontFamily:BODY }}>{sub}</p>}
                    </div>
                    <Toggle value={val} onChange={onChange} label={label}/>
                  </div>
                ))}
              </Card>
            </div>
          </Sheet>
        )}

        {/* About */}
        {sheet === 'about' && (
          <Sheet title="About" onClose={() => setSheet(null)}>
            <div className="flex flex-col items-center py-4 pb-6 gap-2.5">
              <div className="w-16 h-16 rounded-[20px] flex items-center justify-center text-[28px]"
                style={{ background:'var(--accent-dim)', border:'1px solid var(--accent-border)' }}>
                {BRAND.emoji}
              </div>
              <p className="text-[18px] font-extrabold tracking-[-0.04em]" style={{ color:'var(--text-primary)', fontFamily:HEAD }}>{BRAND.name}</p>
              <p className="text-[13px] text-center" style={{ color:'var(--text-muted)', fontFamily:BODY }}>{BRAND.tagline}</p>
              <p className="text-[11px]" style={{ color:'var(--text-muted)', fontFamily:MONO }}>v{APP_VER}</p>
            </div>
            <Card>
              {[{label:'Privacy Policy',icon:ShieldCheck},{label:'Terms of Service',icon:Info}].map(({label,icon:Ic},i,arr) => (
                <div key={label} className="flex items-center gap-3 px-4 py-[13px] cursor-pointer"
                  style={{ borderBottom:i<arr.length-1?'1px solid var(--divider)':'none' }}>
                  <div className="w-[34px] h-[34px] rounded-[10px] flex-shrink-0 flex items-center justify-center" style={{ background:'var(--pill-bg)' }}>
                    <Ic size={15} color="var(--text-muted)"/>
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-medium" style={{ color:'var(--text-primary)', fontFamily:BODY }}>{label}</p>
                  </div>
                  <ChevronRight size={14} color="var(--text-muted)"/>
                </div>
              ))}
            </Card>
          </Sheet>
        )}

        {/* Follow sheet */}
        {followSheet && (
          <FollowSheet
            onClose={() => setFollowSheet(null)}
            isDark={isDark}
            initialTab={followSheet}
            viewOnly={false}
            pendingRequests={pending}
          />
        )}

      </AnimatePresence>

      {/* Confirm dialog */}
      <AnimatePresence>
        {cfm && (
          <Confirm
            isDark={isDark}
            title={cfm.title} desc={cfm.desc} detail={cfm.detail}
            danger={cfm.danger} busy={busy}
            onOk={cfm.onOk} onCancel={() => setCfm(null)}/>
        )}
      </AnimatePresence>
    </div>
  )
}