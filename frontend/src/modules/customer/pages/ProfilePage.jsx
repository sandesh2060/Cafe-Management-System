// src/modules/customer/pages/ProfilePage.jsx
//
// ✅ getPalette(isDark) replaces all hardcoded hex/rgba local token vars
//    (bg, surface, surface2, border, textMain, textMuted → all from brand.js)
// ✅ BRAND.name replaces hardcoded "कौसी चिया" in About section
// ✅ BRAND.currency replaces hardcoded Rs in OrderItem
// ✅ All animation, avatar, sound, modal, session logic unchanged

import { useState, useEffect, useContext, useCallback, useRef } from 'react'
import { createPortal }              from 'react-dom'
import { useDispatch, useSelector }  from 'react-redux'
import { useNavigate }               from 'react-router-dom'
import {
  motion, AnimatePresence,
  useMotionValue, animate,
}                                    from 'motion/react'
import toast                         from 'react-hot-toast'
import {
  User, Edit3, Check, X,
  ChevronRight, ShieldCheck, Clock, Award,
  AlertTriangle, Package, ArrowLeft,
  Volume2, VolumeX, Bell, BellOff,
  Sun, Moon, Vibrate,
  Info, MapPin,
}                                    from 'lucide-react'

import { selectUser, selectIsGuest, updateUser } from '@store/slices/authSlice'
import { selectLoyalty }             from '@store/slices/loyaltySlice'
import {
  selectOrderHistory,
  selectOrderLoading,
  fetchOrderHistory,
}                                    from '@store/slices/orderSlice'
import {
  selectTableId,
  selectTableNumber,
}                                    from '@store/slices/tableSessionSlice'
import { ThemeContext }              from '@shared/context/ThemeContext'
import { BRAND, getPalette }         from '@shared/config/brand'
import LogoutButton                  from '../components/profile/LogoutButton'
import api                           from '@api/axios'
import { ENDPOINTS as EP }           from '@api/endpoints'

// ── Constants ─────────────────────────────────────────────────────────────────
const TIER_META = {
  bronze: { emoji: '🥉', label: 'Bronze', next: 'Silver', gradient: 'linear-gradient(135deg,#CD7F32,#E8A96A)' },
  silver: { emoji: '🥈', label: 'Silver', next: 'Gold',   gradient: 'linear-gradient(135deg,#9CA3AF,#D1D5DB)' },
  gold:   { emoji: '🥇', label: 'Gold',   next: null,     gradient: 'linear-gradient(135deg,#F59E0B,#FCD34D)' },
  none:   { emoji: '☕', label: 'Member', next: 'Bronze', gradient: 'linear-gradient(135deg,#FF9F1C,#E05C2A)'  },
}
const ORDER_STATUS_META = {
  pending:    { label: 'Pending',   color: '#D97706', bg: '#FFFBEB' },
  preparing:  { label: 'Preparing', color: '#2563EB', bg: '#EFF6FF' },
  on_the_way: { label: 'On Way',    color: '#7C3AED', bg: '#EDE9FE' },
  delivered:  { label: 'Delivered', color: '#16A34A', bg: '#F0FDF4' },
  paid:       { label: 'Paid',      color: '#059669', bg: '#D4F0E0' },
  cancelled:  { label: 'Cancelled', color: '#DC2626', bg: '#FEF2F2' },
}
const POINTS_FOR_TIER = { none: 0, bronze: 0, silver: 500, gold: 1500 }

const fmt      = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
const initials = (name) =>
  (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

const CUSTOMER_SOUND_KEYS = [
  { key: 'orderPlaced',    label: 'Order Placed',    icon: '🛍️' },
  { key: 'orderReady',     label: 'Order Ready',     icon: '🔔' },
  { key: 'orderDelivered', label: 'Order Delivered', icon: '✅' },
  { key: 'pointsEarned',   label: 'Points Earned',   icon: '⭐' },
  { key: 'tierUpgraded',   label: 'Tier Upgraded',   icon: '🏆' },
  { key: 'notification',   label: 'Notifications',   icon: '📣' },
]
const SOUND_PREFS_KEY = 'kc_sound_prefs'
const loadSoundPrefs  = () => { try { return JSON.parse(localStorage.getItem(SOUND_PREFS_KEY) || '{}') } catch { return {} } }
const saveSoundPrefs  = (p) => { try { localStorage.setItem(SOUND_PREFS_KEY, JSON.stringify(p)) } catch {} }
const APP_VERSION     = import.meta.env.VITE_APP_VERSION || '1.0.0'

// ── SVG Theme Toggle ──────────────────────────────────────────────────────────
const ThemeToggle = ({ isDark, onToggle }) => (
  <motion.button onClick={onToggle} whileTap={{ scale: 0.92 }} aria-label="Toggle theme"
    className="relative flex-shrink-0 [-webkit-tap-highlight-color:transparent]"
    style={{
      width: 72, height: 36, borderRadius: 999, overflow: 'hidden',
      boxShadow: isDark
        ? '0 2px 14px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)'
        : '0 2px 14px rgba(56,189,248,0.5), inset 0 1px 0 rgba(255,255,255,0.9)',
    }}>
    <motion.div className="absolute inset-0" animate={{
      background: isDark
        ? 'linear-gradient(135deg,#060c24 0%,#0f172a 100%)'
        : 'linear-gradient(135deg,#38bdf8 0%,#7dd3fc 100%)',
    }} transition={{ duration: 0.5 }} />
    {[{ x:7,y:6,r:2.5 },{ x:18,y:11,r:1.8 },{ x:9,y:20,r:2.0 },{ x:24,y:7,r:1.5 },{ x:28,y:20,r:1.6 }]
      .map((s, i) => (
        <motion.div key={`s${i}`} className="absolute rounded-full"
          style={{ width: s.r*2, height: s.r*2, left: s.x, top: s.y, background:'#fff', borderRadius:'50%' }}
          animate={{ opacity: isDark ? 1 : 0, scale: isDark ? 1 : 0 }}
          transition={{ duration:0.35, delay: isDark ? i*0.06 : 0 }} />
      ))}
    <motion.div className="absolute" style={{ right:-2, bottom:-1 }}
      animate={{ opacity: isDark ? 0 : 1, x: isDark ? 12 : 0 }}
      transition={{ duration:0.4, ease:'easeInOut' }}>
      <svg width="34" height="18" viewBox="0 0 34 18" fill="none">
        <ellipse cx="17" cy="14" rx="15" ry="6" fill="white"/>
        <ellipse cx="12" cy="10" rx="9"  ry="7" fill="white"/>
        <ellipse cx="22" cy="10" rx="8"  ry="6" fill="white"/>
        <ellipse cx="17" cy="7"  rx="6"  ry="5.5" fill="white"/>
      </svg>
    </motion.div>
    <motion.div
      animate={{ x: isDark ? 37 : 3 }}
      transition={{ type:'spring', stiffness:420, damping:34, mass:0.7 }}
      style={{
        position:'absolute', top:'50%', marginTop:-15,
        width:30, height:30, borderRadius:'50%', overflow:'hidden',
        background: isDark
          ? 'radial-gradient(circle at 38% 30%, #f8fafc 0%, #e2e8f0 50%, #94a3b8 100%)'
          : 'radial-gradient(circle at 38% 30%, #fef9c3 0%, #fbbf24 50%, #b45309 100%)',
        boxShadow: isDark
          ? '0 2px 12px rgba(0,0,0,0.65), inset 0 1.5px 3px rgba(255,255,255,0.85)'
          : '0 3px 12px rgba(180,83,9,0.6), inset 0 1.5px 3px rgba(255,255,255,0.9)',
      }}>
      <AnimatePresence mode="wait">
        {isDark ? (
          <motion.svg key="moon" width="30" height="30" viewBox="0 0 30 30" fill="none"
            style={{ position:'absolute', top:0, left:0 }}
            initial={{ opacity:0, scale:0.75 }} animate={{ opacity:1, scale:1 }}
            exit={{ opacity:0, scale:0.75 }} transition={{ duration:0.18 }}>
            <circle cx="11" cy="13" r="5.5" fill="#475569" opacity="0.55"/>
            <circle cx="11" cy="13" r="3.5" fill="#334155" opacity="0.40"/>
            <circle cx="21" cy="20" r="3.8" fill="#475569" opacity="0.50"/>
            <circle cx="21" cy="20" r="2.2" fill="#334155" opacity="0.35"/>
          </motion.svg>
        ) : (
          <motion.svg key="sun" width="30" height="30" viewBox="0 0 30 30" fill="none"
            style={{ position:'absolute', top:0, left:0 }}
            initial={{ opacity:0, scale:0.75 }} animate={{ opacity:1, scale:1 }}
            exit={{ opacity:0, scale:0.75 }} transition={{ duration:0.18 }}>
            <circle cx="11" cy="10" r="11" fill="#fef3c7" opacity="0.65"/>
            <circle cx="10" cy="9"  r="7"  fill="#ffffff"  opacity="0.55"/>
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.div>
    <div className="absolute inset-0 pointer-events-none" style={{
      borderRadius:999,
      border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(255,255,255,0.8)',
    }}/>
  </motion.button>
)

// ── Animated Star ─────────────────────────────────────────────────────────────
const AnimatedStar = ({ size=14, delay=0 }) => (
  <motion.div
    animate={{ scale:[1,1.35,0.9,1.2,1], rotate:[0,15,-10,5,0] }}
    transition={{ duration:2.4, delay, repeat:Infinity, repeatDelay:1.2, ease:'easeInOut' }}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <motion.path
        d="M12 2l2.9 6.1L22 9.3l-5 5 1.2 7.1L12 18l-6.2 3.4L7 14.3 2 9.3l7.1-1.2z"
        fill="#FF9F1C" stroke="#FF9F1C" strokeWidth="1.5" strokeLinejoin="round"
        animate={{ fill:['#FF9F1C','#FFD580','#E05C2A','#FF9F1C'] }}
        transition={{ duration:2.4, delay, repeat:Infinity, repeatDelay:1.2 }} />
    </svg>
  </motion.div>
)

// ── Floating Orbs ─────────────────────────────────────────────────────────────
const FloatingOrbs = ({ isDark }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[
      { w:180, h:180, top:'5%',  left:'-10%', delay:0   },
      { w:120, h:120, top:'40%', right:'-8%', delay:0.8 },
      { w:90,  h:90,  top:'70%', left:'20%',  delay:1.4 },
    ].map((orb, i) => (
      <motion.div key={i} className="absolute rounded-full"
        style={{
          width:orb.w, height:orb.h, top:orb.top, left:orb.left, right:orb.right,
          // ✅ var(--orb-color) from brand.js
          background: 'radial-gradient(circle, var(--orb-color) 0%, transparent 70%)',
          filter:'blur(20px)',
        }}
        animate={{ y:[0,-18,0], scale:[1,1.05,1] }}
        transition={{ duration:5+i*1.5, repeat:Infinity, delay:orb.delay, ease:'easeInOut' }} />
    ))}
  </div>
)

// ── Back Button ───────────────────────────────────────────────────────────────
const GlassBackButton = ({ onClick }) => (
  <motion.button onClick={onClick} whileTap={{ scale:0.88 }}
    className="flex items-center gap-2 px-3 py-2 rounded-2xl [-webkit-tap-highlight-color:transparent]"
    style={{
      // ✅ var tokens
      background: 'var(--pill-bg)',
      border: '1px solid var(--pill-border)',
      backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
      boxShadow:'var(--card-shadow)',
    }}
    aria-label="Go back">
    <ArrowLeft size={15} strokeWidth={2.5} style={{ color:'var(--text-primary)' }} />
  </motion.button>
)

// ── Confirm Modal ─────────────────────────────────────────────────────────────
const ConfirmModal = ({ isDark, oldUsername, newUsername, onConfirm, onCancel, saving }) => {
  const P = getPalette(isDark)
  return createPortal(
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,0.55)', backdropFilter:'blur(8px)' }}
      onClick={onCancel}>
      <motion.div
        initial={{ y:60, opacity:0, scale:0.96 }} animate={{ y:0, opacity:1, scale:1 }}
        exit={{ y:60, opacity:0, scale:0.96 }}
        transition={{ type:'spring', stiffness:380, damping:32 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl p-6 space-y-5"
        style={{
          background:'var(--modal-bg)',
          border:'1px solid var(--modal-border)',
          boxShadow:'var(--card-shadow)',
        }}>
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background:'var(--accent-dim)' }}>
            <ShieldCheck size={28} color="var(--accent)" />
          </div>
        </div>
        <div className="text-center space-y-1.5">
          <h3 className="text-lg font-bold" style={{ color:'var(--text-primary)' }}>Change Username?</h3>
          <p className="text-sm" style={{ color:'var(--text-secondary)' }}>Changing your login handle from</p>
          <div className="flex items-center justify-center gap-3 py-2 flex-wrap">
            <span className="font-mono text-sm px-3 py-1.5 rounded-xl font-bold"
              style={{ background:'var(--pill-bg)', color:'var(--text-secondary)' }}>
              @{oldUsername || 'none'}
            </span>
            <span style={{ color:'var(--accent)' }}>→</span>
            <span className="font-mono text-sm px-3 py-1.5 rounded-xl font-bold"
              style={{ background:'var(--accent-dim)', color:'var(--accent)' }}>
              @{newUsername}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onCancel} disabled={saving}
            className="py-3 rounded-2xl font-semibold text-sm active:scale-95 transition-all"
            style={{ background:'var(--pill-bg)', color:'var(--text-secondary)' }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={saving}
            className="py-3 rounded-2xl font-semibold text-sm active:scale-95 transition-all flex items-center justify-center gap-2"
            style={{ background:'var(--accent-gradient)', color:'#fff', boxShadow:'0 4px 20px var(--accent-glow)' }}>
            {saving
              ? <motion.div animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }}
                  className="w-4 h-4 rounded-full border-2 border-white border-t-transparent" />
              : <><Check size={15} /> Confirm</>
            }
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}

// ── AVATARS ───────────────────────────────────────────────────────────────────
const AVATARS = [
  { id:'the_regular',  label:'The Regular',    bg:'linear-gradient(135deg,#FF9F1C,#E05C2A)', svg:(<svg viewBox="0 0 64 64" fill="none" className="w-full h-full"><ellipse cx="32" cy="54" rx="14" ry="8" fill="#E05C2A"/><rect x="20" y="44" width="24" height="14" rx="6" fill="#E05C2A"/><rect x="26" y="50" width="12" height="6" rx="3" fill="#C44A1A"/><rect x="28" y="38" width="8" height="8" rx="3" fill="#FDDCB5"/><circle cx="32" cy="30" r="14" fill="#FDDCB5"/><ellipse cx="32" cy="17" rx="13" ry="3.5" fill="#5C3317"/><path d="M19 17 Q20 10 32 10 Q44 10 45 17" fill="#5C3317"/><rect x="26" y="15" width="12" height="4" rx="2" fill="#3D2010"/><path d="M25 29 Q27 27 29 29" stroke="#5C3317" strokeWidth="2" strokeLinecap="round" fill="none"/><path d="M35 29 Q37 27 39 29" stroke="#5C3317" strokeWidth="2" strokeLinecap="round" fill="none"/><path d="M28 35 Q32 38 36 35" stroke="#5C3317" strokeWidth="1.5" strokeLinecap="round" fill="none"/><rect x="44" y="42" width="8" height="10" rx="2" fill="#fff"/><rect x="44" y="42" width="8" height="3" rx="1" fill="#FF9F1C"/><path d="M52 46 Q55 46 55 49 Q55 52 52 52" stroke="#E05C2A" strokeWidth="1.5" fill="none"/></svg>) },
  { id:'bookworm',     label:'The Bookworm',   bg:'linear-gradient(135deg,#8B5CF6,#6D28D9)', svg:(<svg viewBox="0 0 64 64" fill="none" className="w-full h-full"><rect x="20" y="44" width="24" height="14" rx="6" fill="#7C3AED"/><rect x="42" y="46" width="10" height="14" rx="2" fill="#A78BFA"/><rect x="42" y="46" width="2" height="14" rx="1" fill="#6D28D9"/><line x1="44" y1="50" x2="52" y2="50" stroke="#DDD6FE" strokeWidth="0.8"/><line x1="44" y1="53" x2="52" y2="53" stroke="#DDD6FE" strokeWidth="0.8"/><rect x="28" y="38" width="8" height="8" rx="3" fill="#FDDCB5"/><circle cx="32" cy="29" r="14" fill="#FDDCB5"/><path d="M20 26 Q20 14 32 14 Q44 14 44 26" fill="#5C3317"/><circle cx="32" cy="14" r="5" fill="#5C3317"/><rect x="21" y="27" width="9" height="7" rx="3.5" fill="none" stroke="#5C3317" strokeWidth="2"/><rect x="34" y="27" width="9" height="7" rx="3.5" fill="none" stroke="#5C3317" strokeWidth="2"/><line x1="30" y1="30.5" x2="34" y2="30.5" stroke="#5C3317" strokeWidth="1.5"/><circle cx="25.5" cy="30.5" r="1.5" fill="#5C3317"/><circle cx="38.5" cy="30.5" r="1.5" fill="#5C3317"/><path d="M28 37 Q32 39 36 37" stroke="#5C3317" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>) },
  { id:'workaholic',   label:'The Workaholic', bg:'linear-gradient(135deg,#2563EB,#1D4ED8)', svg:(<svg viewBox="0 0 64 64" fill="none" className="w-full h-full"><rect x="10" y="50" width="44" height="5" rx="2" fill="#374151"/><rect x="14" y="38" width="36" height="14" rx="2" fill="#1F2937"/><rect x="16" y="40" width="32" height="10" rx="1" fill="#1D4ED8"/><rect x="18" y="41" width="10" height="1.5" rx="0.5" fill="#93C5FD" opacity="0.7"/><rect x="22" y="28" width="20" height="12" rx="4" fill="#DBEAFE"/><polygon points="32,30 30,36 32,38 34,36" fill="#2563EB"/><rect x="28" y="22" width="8" height="8" rx="3" fill="#FDDCB5"/><circle cx="32" cy="16" r="12" fill="#FDDCB5"/><path d="M20 14 Q22 6 32 6 Q42 6 44 14" fill="#374151"/><circle cx="27" cy="16" r="2" fill="#374151"/><circle cx="37" cy="16" r="2" fill="#374151"/><path d="M28 21 Q32 24 36 21" stroke="#5C3317" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>) },
  { id:'foodie',       label:'The Foodie',     bg:'linear-gradient(135deg,#E05C2A,#C44A1A)', svg:(<svg viewBox="0 0 64 64" fill="none" className="w-full h-full"><rect x="20" y="42" width="24" height="16" rx="6" fill="#FDE8DF"/><path d="M24 42 Q32 38 40 42 L38 54 Q32 56 26 54 Z" fill="white"/><circle cx="32" cy="48" r="2" fill="#FF9F1C"/><rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/><circle cx="32" cy="27" r="15" fill="#FDDCB5"/><path d="M17 24 Q18 14 32 13 Q46 14 47 24" fill="#92400E"/><path d="M23 25 Q23 22 25 22 Q27 22 27 25 Q27 22 29 22 Q31 22 31 25 Q31 27 27 30 Q23 27 23 25Z" fill="#E05C2A"/><path d="M33 25 Q33 22 35 22 Q37 22 37 25 Q37 22 39 22 Q41 22 41 25 Q41 27 37 30 Q33 27 33 25Z" fill="#E05C2A"/><path d="M24 33 Q32 40 40 33" stroke="#5C3317" strokeWidth="2" strokeLinecap="round" fill="none"/><circle cx="22" cy="31" r="3.5" fill="#FCA5A5" opacity="0.6"/><circle cx="42" cy="31" r="3.5" fill="#FCA5A5" opacity="0.6"/></svg>) },
  { id:'hipster',      label:'The Hipster',    bg:'linear-gradient(135deg,#2D9B5A,#1E7A42)', svg:(<svg viewBox="0 0 64 64" fill="none" className="w-full h-full"><rect x="18" y="42" width="28" height="16" rx="6" fill="#2D9B5A"/><rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/><circle cx="32" cy="28" r="14" fill="#FDDCB5"/><path d="M19 30 Q20 40 32 42 Q44 40 45 30 Q40 36 32 36 Q24 36 19 30Z" fill="#5C3317"/><path d="M18 24 Q20 13 32 12 Q44 13 46 24" fill="#E05C2A"/><rect x="17" y="22" width="30" height="5" rx="2.5" fill="#C44A1A"/><circle cx="32" cy="12" r="4" fill="#FF9F1C"/><circle cx="27" cy="27" r="2.5" fill="#5C3317"/><circle cx="37" cy="27" r="2.5" fill="#5C3317"/></svg>) },
  { id:'socialite',    label:'The Socialite',  bg:'linear-gradient(135deg,#EC4899,#BE185D)', svg:(<svg viewBox="0 0 64 64" fill="none" className="w-full h-full"><rect x="18" y="42" width="28" height="16" rx="6" fill="#FBCFE8"/><rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/><circle cx="32" cy="26" r="14" fill="#FDDCB5"/><path d="M18 22 Q18 10 32 10 Q46 10 46 22 Q42 18 38 22 Q35 16 32 20 Q29 16 26 22 Q22 18 18 22Z" fill="#92400E"/><circle cx="27" cy="25" r="2.5" fill="#5C3317"/><circle cx="37" cy="25" r="2.5" fill="#5C3317"/><path d="M28 31 Q32 35 36 31" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" fill="none"/><circle cx="22" cy="29" r="3" fill="#FCA5A5" opacity="0.5"/><circle cx="42" cy="29" r="3" fill="#FCA5A5" opacity="0.5"/></svg>) },
  { id:'student',      label:'The Student',    bg:'linear-gradient(135deg,#0EA5E9,#0369A1)', svg:(<svg viewBox="0 0 64 64" fill="none" className="w-full h-full"><rect x="17" y="42" width="30" height="16" rx="6" fill="#BAE6FD"/><rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/><circle cx="32" cy="27" r="14" fill="#FDDCB5"/><rect x="20" y="17" width="24" height="5" rx="1" fill="#1C1917"/><polygon points="32,10 44,17 32,20 20,17" fill="#374151"/><line x1="44" y1="17" x2="46" y2="24" stroke="#1C1917" strokeWidth="1.5"/><circle cx="46" cy="25" r="2" fill="#F59E0B"/><circle cx="27" cy="27" r="2.5" fill="#374151"/><circle cx="37" cy="27" r="2.5" fill="#374151"/><path d="M28 33 Q32 35 36 33" stroke="#5C3317" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>) },
  { id:'elder',        label:'The Elder',      bg:'linear-gradient(135deg,#92400E,#78350F)', svg:(<svg viewBox="0 0 64 64" fill="none" className="w-full h-full"><rect x="18" y="42" width="28" height="16" rx="6" fill="#D97706"/><rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/><circle cx="32" cy="27" r="14" fill="#FDDCB5"/><path d="M18 23 Q20 13 32 13 Q44 13 46 23" fill="#E5E7EB"/><rect x="23" y="29" width="7" height="5" rx="2.5" fill="none" stroke="#92400E" strokeWidth="1.8"/><rect x="34" y="29" width="7" height="5" rx="2.5" fill="none" stroke="#92400E" strokeWidth="1.8"/><line x1="30" y1="31.5" x2="34" y2="31.5" stroke="#92400E" strokeWidth="1.5"/><circle cx="26.5" cy="25" r="2" fill="#5C3317"/><circle cx="37.5" cy="25" r="2" fill="#5C3317"/><path d="M26 35 Q32 39 38 35" stroke="#5C3317" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>) },
  { id:'sporty',       label:'The Sporty One', bg:'linear-gradient(135deg,#16A34A,#15803D)', svg:(<svg viewBox="0 0 64 64" fill="none" className="w-full h-full"><rect x="18" y="42" width="28" height="16" rx="6" fill="#16A34A"/><text x="32" y="54" textAnchor="middle" fontSize="9" fontWeight="bold" fill="white" fontFamily="monospace">7</text><rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/><circle cx="32" cy="27" r="14" fill="#FDDCB5"/><rect x="18" y="24" width="28" height="5" rx="2.5" fill="#FBBF24"/><path d="M18 24 Q20 14 32 13 Q44 14 46 24" fill="#15803D"/><circle cx="27" cy="28" r="3" fill="white"/><circle cx="37" cy="28" r="3" fill="white"/><circle cx="27" cy="28" r="2" fill="#15803D"/><circle cx="37" cy="28" r="2" fill="#15803D"/><path d="M25 34 Q32 40 39 34" stroke="#5C3317" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>) },
  { id:'artist',       label:'The Artist',     bg:'linear-gradient(135deg,#F59E0B,#92400E)', svg:(<svg viewBox="0 0 64 64" fill="none" className="w-full h-full"><rect x="18" y="42" width="28" height="16" rx="6" fill="#FEF3C7"/><ellipse cx="26" cy="48" rx="3" ry="2" fill="#EC4899" opacity="0.6" transform="rotate(-15 26 48)"/><ellipse cx="36" cy="51" rx="3" ry="2" fill="#2563EB" opacity="0.5" transform="rotate(10 36 51)"/><rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/><circle cx="32" cy="27" r="14" fill="#FDDCB5"/><ellipse cx="32" cy="16" rx="14" ry="6" fill="#92400E"/><ellipse cx="32" cy="15" rx="10" ry="7" fill="#B45309"/><circle cx="38" cy="12" r="2.5" fill="#92400E"/><circle cx="27" cy="26" r="2.5" fill="#92400E"/><circle cx="37" cy="26" r="2.5" fill="#92400E"/><path d="M28 33 Q32 37 36 33" stroke="#5C3317" strokeWidth="1.8" strokeLinecap="round" fill="none"/></svg>) },
]

// ── AvatarPicker ──────────────────────────────────────────────────────────────
const AvatarPicker = ({ isDark, current, onSelect, onClose }) =>
  createPortal(
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background:'rgba(0,0,0,0.55)', backdropFilter:'blur(8px)' }}
      onClick={onClose}>
      <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:32 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl p-6 pb-10 space-y-5"
        style={{ background:'var(--modal-bg)', border:'1px solid var(--modal-border)', borderBottom:'none' }}>
        <div className="flex justify-center -mt-2">
          <div className="w-10 h-1 rounded-full" style={{ background:'var(--divider)' }}/>
        </div>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base" style={{ color:'var(--text-primary)' }}>Choose Avatar</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90"
            style={{ background:'var(--pill-bg)' }}>
            <X size={14} color="var(--text-muted)"/>
          </button>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {AVATARS.map((av) => {
            const sel = current === av.id
            return (
              <motion.button key={av.id} whileTap={{ scale:0.88 }}
                onClick={() => onSelect(av.id)}
                className="relative flex flex-col items-center gap-1.5">
                <div className="w-full aspect-square rounded-2xl overflow-hidden p-0.5"
                  style={{
                    background:av.bg,
                    boxShadow: sel ? '0 0 0 3px var(--accent),0 4px 16px var(--accent-glow)' : '0 2px 8px rgba(0,0,0,0.12)',
                    transform: sel ? 'scale(1.08)' : 'scale(1)', transition:'all 0.18s ease',
                  }}>{av.svg}</div>
                <span className="text-[9px] font-semibold text-center leading-tight w-full"
                  style={{ color: sel ? 'var(--accent)' : 'var(--text-muted)' }}>{av.label}</span>
                {sel && (
                  <motion.div initial={{ scale:0 }} animate={{ scale:1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background:'var(--accent)', border:'2px solid var(--modal-bg)' }}>
                    <Check size={9} color="white" strokeWidth={3}/>
                  </motion.div>
                )}
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )

// ── AvatarEditor ──────────────────────────────────────────────────────────────
const AvatarEditor = ({ user, isDark, onAvatarChange, saving }) => {
  const [pickerOpen, setPickerOpen] = useState(false)
  const currentId = user?.avatar || null
  const currentAv = AVATARS.find((a) => a.id === currentId)
  return (
    <>
      <div className="relative w-20 h-20 flex-shrink-0">
        <motion.div whileHover={{ scale:1.03 }}
          className="w-20 h-20 rounded-[22px] overflow-hidden flex items-center justify-center text-white text-2xl font-bold"
          style={{
            background: currentAv ? currentAv.bg : 'var(--accent-gradient)',
            boxShadow:'0 6px 24px var(--accent-glow)', padding: currentAv ? '2px' : 0,
          }}>
          {currentAv ? currentAv.svg : <span>{initials(user?.name)}</span>}
        </motion.div>
        {saving && (
          <div className="absolute inset-0 rounded-[22px] flex items-center justify-center"
            style={{ background:'rgba(0,0,0,0.4)' }}>
            <motion.div animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }}
              className="w-6 h-6 rounded-full border-2 border-white border-t-transparent"/>
          </div>
        )}
        <motion.button onClick={() => setPickerOpen(true)} disabled={saving}
          whileTap={{ scale:0.85 }}
          className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
          style={{ background:'var(--accent-gradient)', border:'2.5px solid var(--modal-bg)' }}>
          <Edit3 size={12} color="#fff"/>
        </motion.button>
      </div>
      <AnimatePresence>
        {pickerOpen && (
          <AvatarPicker isDark={isDark} current={currentId}
            onSelect={(id) => { setPickerOpen(false); onAvatarChange(id) }}
            onClose={() => setPickerOpen(false)} />
        )}
      </AnimatePresence>
    </>
  )
}

// ── Animated Counter ──────────────────────────────────────────────────────────
const AnimatedCounter = ({ value, prefix='', suffix='' }) => {
  const mv = useMotionValue(0)
  const [display, setDisplay] = useState('0')
  useEffect(() => {
    const num  = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0
    const ctrl = animate(mv, num, {
      duration:1.2, ease:[0.22,1,0.36,1],
      onUpdate:(v) => setDisplay(prefix + Math.round(v).toLocaleString() + suffix),
    })
    return ctrl.stop
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps
  return <span>{display}</span>
}

// ── Loyalty Bar ───────────────────────────────────────────────────────────────
const LoyaltyBar = ({ tier, points }) => {
  const meta     = TIER_META[tier] || TIER_META.bronze
  const nextTier = meta.next?.toLowerCase()
  const max      = nextTier ? POINTS_FOR_TIER[nextTier] : POINTS_FOR_TIER.gold
  const base     = POINTS_FOR_TIER[tier] || 0
  const pct      = nextTier ? Math.min(100, ((points - base) / (max - base)) * 100) : 100
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between">
        <span className="text-xs font-semibold" style={{ color:'var(--text-muted)' }}>
          {nextTier ? `${points} / ${max} pts to ${meta.next}` : 'Max tier reached 🎉'}
        </span>
        <span className="text-xs font-bold" style={{ color:'var(--accent)' }}>{Math.round(pct)}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background:'var(--divider)' }}>
        <motion.div
          initial={{ width:0 }} animate={{ width:`${pct}%` }}
          transition={{ duration:1.4, ease:[0.22,1,0.36,1], delay:0.4 }}
          className="h-full rounded-full relative overflow-hidden"
          style={{ background:meta.gradient }}>
          <motion.div className="absolute inset-0"
            style={{ background:'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.35) 50%,transparent 100%)' }}
            animate={{ x:['-100%','200%'] }}
            transition={{ duration:1.8, repeat:Infinity, repeatDelay:2, ease:'easeInOut', delay:1.4 }} />
        </motion.div>
      </div>
    </div>
  )
}

// ── Order Item ────────────────────────────────────────────────────────────────
const OrderItem = ({ order, border }) => {
  const [open, setOpen] = useState(false)
  const meta = ORDER_STATUS_META[order.status] || ORDER_STATUS_META.pending
  return (
    <motion.div layout className="overflow-hidden">
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors active:opacity-70"
        style={{ background: open ? 'var(--pill-bg-hover)' : 'transparent' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background:meta.bg }}>
          <Package size={16} color={meta.color}/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold font-mono" style={{ color:'var(--text-primary)' }}>
              #{order._id.slice(-6).toUpperCase()}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background:meta.bg, color:meta.color }}>{meta.label}</span>
          </div>
          <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>
            {/* ✅ BRAND.currency */}
            {fmt(order.createdAt)} · {BRAND.currency} {order.total}
            {order.items?.length > 0 && ` · ${order.items.length} item${order.items.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration:0.2 }}>
          <ChevronRight size={15} style={{ color:'var(--text-muted)' }}/>
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
            exit={{ height:0, opacity:0 }} transition={{ duration:0.22 }}
            className="px-4 pb-3.5 space-y-2 overflow-hidden"
            style={{ background:'var(--pill-bg)' }}>
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between items-center text-xs">
                <span style={{ color:'var(--text-secondary)' }}>
                  {item.emoji} {item.name}
                  {item.portion && <span className="opacity-60"> · {item.portion}</span>}
                  <span className="font-semibold"> ×{item.quantity}</span>
                </span>
                {/* ✅ BRAND.currency */}
                <span className="font-semibold font-mono" style={{ color:'var(--text-primary)' }}>
                  {BRAND.currency} {(item.price ?? 0) * (item.quantity ?? 1)}
                </span>
              </div>
            ))}
            {(order.pointsEarned ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 pt-1.5 border-t"
                style={{ borderColor:'var(--divider)' }}>
                <AnimatedStar size={11} delay={0}/>
                <span className="text-xs font-bold" style={{ color:'var(--accent)' }}>
                  +{order.pointsEarned} points earned
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Section Wrapper ───────────────────────────────────────────────────────────
const Section = ({ title, children, delay=0 }) => (
  <motion.div initial={{ y:20, opacity:0 }} animate={{ y:0, opacity:1 }}
    transition={{ duration:0.4, ease:[0.22,1,0.36,1], delay }}
    className="rounded-3xl overflow-hidden"
    style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)', boxShadow:'var(--card-shadow)' }}>
    {title && (
      <div className="px-4 pt-4 pb-3">
        <h3 className="font-bold text-sm" style={{ color:'var(--text-primary)' }}>{title}</h3>
      </div>
    )}
    {children}
  </motion.div>
)

// ── Toggle Row ────────────────────────────────────────────────────────────────
const ToggleRow = ({ label, sublabel, icon:Icon, iconColor, value, onChange, last=false }) => (
  <div className="flex items-center gap-3 px-4 py-3.5"
    style={{ borderBottom: last ? 'none' : '1px solid var(--divider)' }}>
    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background:'var(--pill-bg)' }}>
      <Icon size={16} color={iconColor ?? 'var(--text-muted)'}/>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold" style={{ color:'var(--text-primary)' }}>{label}</p>
      {sublabel && <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>{sublabel}</p>}
    </div>
    <motion.button
      onClick={() => onChange(!value)}
      whileTap={{ scale:0.9 }}
      className="relative flex-shrink-0 [-webkit-tap-highlight-color:transparent]"
      style={{
        width:46, height:26, borderRadius:999,
        background: value ? 'var(--accent-gradient)' : 'var(--pill-bg)',
        boxShadow: value ? '0 2px 10px var(--accent-glow)' : 'none',
        transition:'background 0.25s, box-shadow 0.25s',
      }}
      aria-label={`Toggle ${label}`}
    >
      <motion.div animate={{ x: value ? 22 : 2 }}
        transition={{ type:'spring', stiffness:460, damping:32 }}
        style={{
          position:'absolute', top:3, width:20, height:20, borderRadius:'50%',
          background:'#fff', boxShadow:'0 1px 4px rgba(0,0,0,0.2)',
        }} />
    </motion.button>
  </div>
)

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════
const ProfilePage = () => {
  const dispatch    = useDispatch()
  const navigate    = useNavigate()
  const user        = useSelector(selectUser)
  const isGuest     = useSelector(selectIsGuest)
  const loyaltyRaw  = useSelector(selectLoyalty)
  const loyalty     = loyaltyRaw?.loyalty ?? loyaltyRaw ?? {}
  const history     = useSelector(selectOrderHistory)
  const histLoading = useSelector(selectOrderLoading)
  const tableId     = useSelector(selectTableId)
  const tableNumber = useSelector(selectTableNumber) ?? (tableId ? `…${tableId.slice(-4)}` : null)
  const { isDark, toggleTheme } = useContext(ThemeContext)

  const handleBack = useCallback(() => {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/menu', { replace: true })
  }, [navigate])

  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameVal,     setUsernameVal]     = useState(user?.username || '')
  const [usernameErr,     setUsernameErr]     = useState('')
  const [showConfirm,     setShowConfirm]     = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [savedFlash,      setSavedFlash]      = useState(false)
  const [avatarSaving,    setAvatarSaving]    = useState(false)
  const [soundPrefs,      setSoundPrefs]      = useState(() => loadSoundPrefs())
  const masterMuted = soundPrefs.__master === false

  const setMasterMute = (muted) => {
    const next = { ...soundPrefs, __master: !muted }
    setSoundPrefs(next); saveSoundPrefs(next)
  }
  const toggleSound = (key) => {
    const next = { ...soundPrefs, [key]: soundPrefs[key] !== false ? false : true }
    setSoundPrefs(next); saveSoundPrefs(next)
  }
  const isSoundOn = (key) => !masterMuted && soundPrefs[key] !== false

  const [hapticOn, setHapticOn] = useState(() => localStorage.getItem('kc_haptic') !== 'false')
  const toggleHaptic = (v) => { setHapticOn(v); localStorage.setItem('kc_haptic', String(v)) }

  useEffect(() => { if (!isGuest) dispatch(fetchOrderHistory()) }, [dispatch, isGuest])
  useEffect(() => { setUsernameVal(user?.username || '') }, [user?.username])

  const validateUsername = (val) => {
    if (!val)            return 'Username cannot be empty'
    if (val.length < 3)  return 'At least 3 characters'
    if (val.length > 20) return 'At most 20 characters'
    if (!/^[a-z0-9_]+$/.test(val)) return 'Letters, numbers, underscores only'
    if (val === user?.username) return 'Same as current username'
    return ''
  }

  const handleUsernameChange = (e) => {
    const v = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setUsernameVal(v); setUsernameErr(validateUsername(v))
  }
  const handleUsernameSave = () => {
    const err = validateUsername(usernameVal)
    if (err) { setUsernameErr(err); return }
    setShowConfirm(true)
  }
  const handleConfirmUsername = async () => {
    setSaving(true)
    try {
      const res = await api.patch(EP.AUTH.UPDATE_PROFILE, { username: usernameVal })
      dispatch(updateUser(res.data))
      setShowConfirm(false); setEditingUsername(false)
      setSavedFlash(true); setTimeout(() => setSavedFlash(false), 2500)
    } catch (err) {
      setUsernameErr(err.response?.data?.message || 'Failed to update')
      setShowConfirm(false)
    } finally { setSaving(false) }
  }

  const handleAvatarChange = useCallback(async (avatarId) => {
    setAvatarSaving(true)
    try {
      const res = await api.patch(EP.AUTH.UPDATE_PROFILE, { avatar: avatarId })
      dispatch(updateUser(res.data))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update avatar')
    } finally { setAvatarSaving(false) }
  }, [dispatch])

  const tier       = loyalty?.tier ?? 'none'
  const tierMeta   = TIER_META[tier] || TIER_META.none
  const totalSpend = history.reduce((s, o) => s + (o.total || 0), 0)

  return (
    <div className="customer-container min-h-screen flex flex-col relative"
      style={{ background:'var(--bg)' }}>
      <FloatingOrbs isDark={isDark} />

      {/* ── Header ── */}
      <header className="px-4 pt-5 pb-3 sticky top-0 z-20 flex items-center justify-between"
        style={{
          background:'var(--header-bg)',
          backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
          borderBottom:'1px solid var(--divider)',
        }}>
        <GlassBackButton onClick={handleBack} />
        <motion.h1 initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.4, delay:0.1 }}
          className="text-lg font-bold absolute left-1/2 -translate-x-1/2"
          style={{ color:'var(--text-primary)' }}>Profile</motion.h1>
        <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
      </header>

      <div className="flex-1 overflow-auto px-4 pt-4 pb-8 space-y-4 relative z-10">

        {/* ── Active Session Banner ── */}
        {tableNumber && (
          <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
            transition={{ duration:0.35 }}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background:'var(--accent-dim)', border:'1px solid var(--accent-border)' }}>
            <div className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background:'var(--success)', boxShadow:'0 0 6px var(--success)' }} />
            <MapPin size={14} color="var(--accent)" className="flex-shrink-0"/>
            <p className="text-sm font-semibold" style={{ color:'var(--text-primary)' }}>
              Seated at <span style={{ color:'var(--accent)' }}>Table {tableNumber}</span>
            </p>
            <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background:'var(--success-bg)', color:'var(--success)' }}>ACTIVE</span>
          </motion.div>
        )}

        {/* ── User Card ── */}
        <motion.div initial={{ y:20, opacity:0 }} animate={{ y:0, opacity:1 }}
          transition={{ duration:0.4, ease:[0.22,1,0.36,1] }}
          className="rounded-3xl p-5 space-y-4 relative overflow-hidden"
          style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)', boxShadow:'var(--card-shadow)' }}>
          <div className="absolute inset-0 pointer-events-none rounded-3xl"
            style={{ background:'radial-gradient(ellipse at 20% 0%, var(--accent-dim) 0%, transparent 60%)' }}/>

          <div className="flex items-start gap-4">
            {!isGuest ? (
              <AvatarEditor user={user} isDark={isDark} onAvatarChange={handleAvatarChange} saving={avatarSaving}/>
            ) : (
              <div className="w-20 h-20 rounded-[22px] flex items-center justify-center flex-shrink-0"
                style={{ background:'var(--accent-gradient)', boxShadow:'0 4px 20px var(--accent-glow)' }}>
                <User size={32} color="#fff"/>
              </div>
            )}
            <div className="flex-1 min-w-0 pt-1">
              <h2 className="text-xl font-bold truncate" style={{ color:'var(--text-primary)' }}>
                {isGuest ? 'Guest User' : user?.name}
              </h2>
              {!isGuest && user?.email && (
                <p className="text-sm truncate mt-0.5" style={{ color:'var(--text-muted)' }}>{user.email}</p>
              )}
              {isGuest && <p className="text-sm mt-0.5" style={{ color:'var(--text-muted)' }}>Sign in to save history</p>}
              {!isGuest && user?.role && (
                <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-1.5 capitalize"
                  style={{ background:'var(--accent-dim)', color:'var(--accent)' }}>
                  {user.role}
                </span>
              )}
              <AnimatePresence>
                {savedFlash && (
                  <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                    className="flex items-center gap-1 mt-1.5">
                    <Check size={12} color="var(--success)"/>
                    <span className="text-xs font-semibold" style={{ color:'var(--success)' }}>Username updated!</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Username editor */}
          {!isGuest && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color:'var(--text-muted)' }}>Username</span>
                {!editingUsername && (
                  <button onClick={() => { setEditingUsername(true); setUsernameErr('') }}
                    className="flex items-center gap-1 text-xs font-semibold active:scale-95 transition-all"
                    style={{ color:'var(--accent)' }}>
                    <Edit3 size={11}/> Edit
                  </button>
                )}
              </div>
              <AnimatePresence mode="wait">
                {editingUsername ? (
                  <motion.div key="edit" initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} className="space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold select-none" style={{ color:'var(--text-muted)' }}>@</span>
                        <input value={usernameVal} onChange={handleUsernameChange}
                          maxLength={20} autoFocus placeholder="your_handle"
                          className="w-full pl-7 pr-3 py-2.5 rounded-xl text-sm font-mono font-semibold outline-none"
                          style={{
                            background:'var(--input-bg)', color:'var(--text-primary)',
                            border:`1.5px solid ${usernameErr ? 'var(--danger)' : 'var(--input-border-focus)'}`,
                          }} />
                      </div>
                      <button onClick={handleUsernameSave} disabled={!!usernameErr || !usernameVal}
                        className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-90 flex-shrink-0"
                        style={{ background:(usernameErr || !usernameVal) ? 'var(--btn-disabled)' : 'var(--accent-gradient)', opacity:(usernameErr || !usernameVal) ? 0.4 : 1 }}>
                        <Check size={16} color="#fff"/>
                      </button>
                      <button onClick={() => { setEditingUsername(false); setUsernameVal(user?.username||''); setUsernameErr('') }}
                        className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-90 flex-shrink-0"
                        style={{ background:'var(--pill-bg)' }}>
                        <X size={16} color="var(--text-muted)"/>
                      </button>
                    </div>
                    {usernameErr && (
                      <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} className="flex items-center gap-1.5">
                        <AlertTriangle size={11} color="var(--danger)"/>
                        <p className="text-xs" style={{ color:'var(--danger)' }}>{usernameErr}</p>
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="display" initial={{ opacity:0 }} animate={{ opacity:1 }}>
                    <span className="font-mono text-sm font-bold px-3 py-1.5 rounded-xl inline-block"
                      style={{ background:'var(--pill-bg)', color:'var(--text-primary)' }}>
                      @{user?.username || '—'}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* ── Loyalty Card ── */}
        {!isGuest && (
          <motion.div initial={{ y:20, opacity:0 }} animate={{ y:0, opacity:1 }}
            transition={{ duration:0.4, ease:[0.22,1,0.36,1], delay:0.07 }}
            className="rounded-3xl p-5 space-y-4 relative overflow-hidden"
            style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)', boxShadow:'var(--card-shadow)' }}>
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
              style={{ background:'radial-gradient(circle, var(--accent-dim) 0%, transparent 70%)', filter:'blur(12px)' }}/>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div animate={{ rotate:[0,8,-6,4,0] }}
                  transition={{ duration:3, repeat:Infinity, repeatDelay:2, ease:'easeInOut' }}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background:'var(--pill-bg)' }}>
                  {tierMeta.emoji}
                </motion.div>
                <div>
                  <p className="font-bold text-base" style={{ color:'var(--text-primary)' }}>{tierMeta.label} Member</p>
                  <p className="text-xs" style={{ color:'var(--text-muted)' }}>
                    {(loyalty?.points || 0).toLocaleString()} points
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  <AnimatedStar size={14} delay={0}/>
                  <AnimatedStar size={11} delay={0.3}/>
                  <AnimatedStar size={13} delay={0.6}/>
                  <span className="text-lg font-bold ml-1" style={{ color:'var(--accent)' }}>
                    {loyalty?.discountPct || 0}%
                  </span>
                </div>
                <p className="text-xs" style={{ color:'var(--text-muted)' }}>discount</p>
              </div>
            </div>
            <LoyaltyBar tier={tier} points={loyalty?.points || 0} />
          </motion.div>
        )}

        {/* ── Stats ── */}
        {!isGuest && history.length > 0 && (
          <motion.div initial={{ y:20, opacity:0 }} animate={{ y:0, opacity:1 }}
            transition={{ duration:0.4, ease:[0.22,1,0.36,1], delay:0.13 }}
            className="grid grid-cols-3 gap-3">
            {[
              { icon:Package, label:'Orders', value:history.length,       prefix:'',                color:'var(--accent)'  },
              { icon:Award,   label:'Points', value:loyalty?.points||0,   prefix:'',                color:'var(--success)' },
              { icon:Clock,   label:'Spent',  value:totalSpend,            prefix:`${BRAND.currency} `, color:'var(--warning)' },
            ].map(({ icon:Icon, label, value, prefix, color }, i) => (
              <motion.div key={label} initial={{ y:16, opacity:0 }} animate={{ y:0, opacity:1 }}
                transition={{ duration:0.35, delay:0.15+i*0.06 }}
                className="rounded-2xl p-3.5 flex flex-col items-center gap-1.5"
                style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)' }}>
                <Icon size={18} color={color}/>
                <p className="text-sm font-bold font-mono leading-tight" style={{ color:'var(--text-primary)' }}>
                  <AnimatedCounter value={value} prefix={prefix}/>
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color:'var(--text-muted)' }}>{label}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── Sound Settings ── */}
        <Section title="🔔 Sound Settings" delay={0.16}>
          <ToggleRow label="All Sounds" sublabel={masterMuted ? 'All notifications muted' : 'Sounds are enabled'}
            icon={masterMuted ? VolumeX : Volume2} iconColor="var(--accent)"
            value={!masterMuted} onChange={(v) => setMasterMute(!v)} />
          <AnimatePresence>
            {!masterMuted && (
              <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
                exit={{ height:0, opacity:0 }} transition={{ duration:0.22 }}>
                {CUSTOMER_SOUND_KEYS.map((s, i) => (
                  <ToggleRow key={s.key}
                    label={s.icon+' '+s.label}
                    icon={isSoundOn(s.key) ? Bell : BellOff}
                    iconColor={isSoundOn(s.key) ? 'var(--accent)' : 'var(--text-muted)'}
                    value={isSoundOn(s.key)} onChange={() => toggleSound(s.key)}
                    last={i===CUSTOMER_SOUND_KEYS.length-1} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </Section>

        {/* ── App Preferences ── */}
        <Section title="⚙️ App Preferences" delay={0.19}>
          <ToggleRow label="Dark Mode" sublabel={isDark ? 'Using dark theme' : 'Using light theme'}
            icon={isDark ? Moon : Sun} iconColor="var(--accent)"
            value={isDark} onChange={toggleTheme} />
          <ToggleRow label="Haptic Feedback" sublabel="Vibrate on actions"
            icon={Vibrate} iconColor="#8B5CF6"
            value={hapticOn} onChange={toggleHaptic} last />
        </Section>

        {/* ── Order History ── */}
        {!isGuest && (
          <Section title="Order History" delay={0.22}>
            {history.length > 0 && (
              <div className="px-4 pb-1 flex justify-end -mt-2 mb-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background:'var(--pill-bg)', color:'var(--text-muted)' }}>{history.length}</span>
              </div>
            )}
            {histLoading ? (
              <div className="px-4 pb-4 space-y-3">
                {[1,2,3].map((i) => (
                  <motion.div key={i} animate={{ opacity:[0.4,0.8,0.4] }}
                    transition={{ duration:1.4, repeat:Infinity, delay:i*0.15 }}
                    className="h-14 rounded-2xl" style={{ background:'var(--pill-bg)' }}/>
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="px-4 pb-6 text-center space-y-1">
                <p className="text-2xl">😋</p>
                <p className="text-sm" style={{ color:'var(--text-muted)' }}>No past orders yet. Order something!</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor:'var(--divider)' }}>
                {history.map((order) => (
                  <OrderItem key={order._id} order={order} />
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ── About ── */}
        <Section title="ℹ️ About" delay={0.25}>
          <div className="px-4 pb-4 space-y-3">
            <div className="flex items-center gap-3 pt-1">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                style={{ background:'var(--accent-dim)' }}>{BRAND.emoji}</div>
              <div>
                {/* ✅ BRAND.name — no hardcoded "कौसी चिया" */}
                <p className="text-sm font-bold" style={{ color:'var(--text-primary)' }}>{BRAND.name}</p>
                <p className="text-xs" style={{ color:'var(--text-muted)' }}>{BRAND.tagline}</p>
              </div>
              <span className="ml-auto text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background:'var(--pill-bg)', color:'var(--text-muted)' }}>
                v{APP_VERSION}
              </span>
            </div>
            <div className="flex flex-col gap-1.5 pt-1">
              {[
                { label:'Privacy Policy',   icon:ShieldCheck },
                { label:'Terms of Service', icon:Info        },
              ].map(({ label, icon:Icon }) => (
                <button key={label}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl active:scale-95 transition-all"
                  style={{ background:'var(--pill-bg)' }}>
                  <Icon size={14} color="var(--text-muted)"/>
                  <span className="text-sm" style={{ color:'var(--text-muted)' }}>{label}</span>
                  <ChevronRight size={13} style={{ color:'var(--text-muted)', marginLeft:'auto' }}/>
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Logout ── */}
        <motion.div initial={{ y:20, opacity:0 }} animate={{ y:0, opacity:1 }}
          transition={{ duration:0.4, ease:[0.22,1,0.36,1], delay:0.28 }}>
          <LogoutButton />
        </motion.div>
      </div>

      <AnimatePresence>
        {showConfirm && (
          <ConfirmModal isDark={isDark} oldUsername={user?.username} newUsername={usernameVal}
            onConfirm={handleConfirmUsername} onCancel={() => setShowConfirm(false)} saving={saving} />
        )}
      </AnimatePresence>
    </div>
  )
}

export default ProfilePage