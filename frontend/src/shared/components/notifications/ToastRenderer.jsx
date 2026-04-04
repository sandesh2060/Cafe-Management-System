// src/shared/components/notifications/ToastRenderer.jsx
//
// COMPLETE REWRITE — tier-aware, max-1-visible queue, swipe-up dismiss
//
// TIERS:
//   low  → no animation, plain frosted card, simple text only
//   mid  → spring animate in/out, icon + text + progress bar
//   high → spring animate + glow border + icon pulse ring + image + progress bar
//
// FEATURES:
//   - Max 1 toast visible, queue the rest by priority
//   - Swipe UP to dismiss (top toasts)
//   - Long press → snooze 10min
//   - Critical toasts (waiter, payment, session_expiry) never auto-dismiss
//   - Per-type colors, icons, sounds, vibration
//   - Profile completion bottom sheet opens on profile_nudge tap
//   - Progress bar for all non-critical toasts

import { useEffect, useRef, useContext, useState, useCallback } from 'react'
import { createPortal }             from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate }              from 'react-router-dom'
import { motion, AnimatePresence }  from 'motion/react'
import { ThemeContext }             from '@shared/context/ThemeContext'
import { FONTS, BRAND }             from '@shared/config/brand'
import { useDeviceTier }            from '@shared/hooks/useDeviceTier'
import { selectToasts, dismissToast } from '@store/slices/toastSlice'
import { selectUser, selectIsGuest }  from '@store/slices/authSlice'
import { playNotificationSound }      from '@shared/utils/soundEngine'
import api                            from '@api/axios'
import { ENDPOINTS as EP }            from '@api/endpoints'
import { updateUser }                 from '@store/slices/authSlice'

// ── Toast type visual config ──────────────────────────────────────────────────
const TYPE_CFG = {
  order:           { color: '#FF9F1C', icon: '🍽️',  sound: 'orderPlaced'    },
  order_ready:     { color: '#10B981', icon: '✅',   sound: 'orderReady'     },
  kitchen:         { color: '#FB923C', icon: '👨‍🍳', sound: 'orderPlaced'    },
  payment:         { color: '#10B981', icon: '💳',   sound: 'notification'   },
  loyalty:         { color: '#A78BFA', icon: '⭐',   sound: 'pointsEarned'   },
  badge:           { color: '#F59E0B', icon: '🏆',   sound: 'tierUpgraded'   },
  achievement:     { color: '#F59E0B', icon: '🏆',   sound: 'tierUpgraded'   },
  tier_upgrade:    { color: '#FFD700', icon: '🥇',   sound: 'tierUpgraded'   },
  points_milestone:{ color: '#A78BFA', icon: '🎯',   sound: 'pointsEarned'   },
  referral:        { color: '#34D399', icon: '🤝',   sound: 'pointsEarned'   },
  waiter:          { color: '#F59E0B', icon: '🛎️',  sound: 'orderReady'     },
  weather:         { color: '#38BDF8', icon: '🌤️',  sound: null             },
  festival:        { color: '#F472B6', icon: '🎊',   sound: 'notification'   },
  birthday:        { color: '#EC4899', icon: '🎂',   sound: 'tierUpgraded'   },
  international:   { color: '#F472B6', icon: '🌍',   sound: null             },
  idle:            { color: '#94A3B8', icon: '🤔',   sound: null             },
  cart_abandon:    { color: '#FB923C', icon: '🛒',   sound: null             },
  session_expiry:  { color: '#EF4444', icon: '⏰',   sound: 'notification'   },
  streak:          { color: '#F97316', icon: '🔥',   sound: 'pointsEarned'   },
  profile_nudge:   { color: '#6366F1', icon: '✏️',   sound: null             },
  reorder:         { color: '#FF9F1C', icon: '🔄',   sound: null             },
  quiz:            { color: '#8B5CF6', icon: '🎯',   sound: null             },
  mystery_item:    { color: '#06B6D4', icon: '🎲',   sound: null             },
  cross_sell:      { color: '#0EA5E9', icon: '✨',   sound: null             },
  news:            { color: '#64748B', icon: '📢',   sound: null             },
  shoutout:        { color: '#EC4899', icon: '💌',   sound: 'notification'   },
  welcome:         { color: '#10B981', icon: '👋',   sound: 'notification'   },
  suggest:         { color: '#0EA5E9', icon: '💡',   sound: null             },
  message:         { color: '#7C3AED', icon: '💬',   sound: 'notification'   },
  system:          { color: '#64748B', icon: '📢',   sound: null             },
}
const getCfg = (type) => TYPE_CFG[type] ?? TYPE_CFG.system

// Critical = never auto-dismiss
const CRITICAL_TYPES = new Set(['waiter','payment','session_expiry','order_ready'])

// Vibration patterns per type
const VIBRATE_MAP = {
  order: [60,40,60], order_ready: [80,40,80,40,120], kitchen: [60,40,60],
  payment: [80,40,80,40,160], waiter: [100,50,100,50,150],
  loyalty: [50,30,50,30,80], tier_upgrade: [80,40,120,40,80],
  birthday: [80,40,120], session_expiry: [100,50,100],
  badge: [60,40,80], welcome: [40,20,40], system: [40],
}
const doVibrate = (type, pattern) => {
  if (!window.__userGestured) return
  try { navigator.vibrate?.(pattern ?? VIBRATE_MAP[type] ?? [40]) } catch {}
}

// Mark user gesture (required for vibration)
if (typeof window !== 'undefined' && !window.__userGestured) {
  const mark = () => { window.__userGestured = true }
  ;['click','touchstart','keydown'].forEach(e =>
    window.addEventListener(e, mark, { once: true, passive: true, capture: true })
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE COMPLETION BOTTOM SHEET
// ═══════════════════════════════════════════════════════════════════════════════
const FIELD_CONFIG = {
  dob:              { label: 'Date of Birth', type: 'date', emoji: '🎂' },
  gender:           { label: 'Gender', type: 'select', emoji: '👤', options: [
    { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' },
    { value: 'non-binary', label: 'Non-binary' }, { value: 'prefer_not', label: 'Prefer not to say' },
  ]},
  hobbies:          { label: 'Hobbies', type: 'multiselect', emoji: '🎯', options: [
    { value: 'coffee_lover', label: '☕ Coffee Lover' }, { value: 'bookworm', label: '📚 Bookworm' },
    { value: 'gamer', label: '🎮 Gamer' },             { value: 'foodie', label: '🍜 Foodie' },
    { value: 'traveller', label: '✈️ Traveller' },     { value: 'sports', label: '⚽ Sports' },
    { value: 'music', label: '🎵 Music' },             { value: 'art', label: '🎨 Art' },
    { value: 'tech', label: '💻 Tech' },               { value: 'student', label: '📖 Student Life' },
  ]},
  occupation:       { label: 'Occupation', type: 'select', emoji: '💼', options: [
    { value: 'student', label: '📚 Student' }, { value: 'working', label: '🏢 Working' },
    { value: 'freelancer', label: '💻 Freelancer' }, { value: 'business_owner', label: '👔 Business Owner' },
    { value: 'other', label: '🌐 Other' },
  ]},
  foodPreference:   { label: 'Food Preference', type: 'select', emoji: '🍽️', options: [
    { value: 'veg', label: '🥗 Vegetarian' }, { value: 'non_veg', label: '🍗 Non-Veg' },
    { value: 'both', label: '🍽️ Both' },     { value: 'vegan', label: '🌱 Vegan' },
    { value: 'halal', label: '🌙 Halal' },   { value: 'gluten_free', label: '🌾 Gluten-Free' },
  ]},
  favouriteDrink:   { label: 'Favourite Drink', type: 'select', emoji: '☕', options: [
    { value: 'black_coffee', label: '☕ Black Coffee' }, { value: 'masala_chiya', label: '🍵 Masala Chiya' },
    { value: 'cold_coffee', label: '🧊 Cold Coffee' },   { value: 'lassi', label: '🥛 Lassi' },
    { value: 'juice', label: '🍊 Fresh Juice' },         { value: 'smoothie', label: '🥤 Smoothie' },
  ]},
  spiceTolerance:   { label: 'Spice Tolerance', type: 'select', emoji: '🌶️', options: [
    { value: 'mild', label: '😌 Mild' }, { value: 'medium', label: '😊 Medium' },
    { value: 'spicy', label: '😅 Spicy' }, { value: 'extra_spicy', label: '🔥 Extra Spicy' },
  ]},
  diningStyle:      { label: 'Dining Style', type: 'select', emoji: '🪑', options: [
    { value: 'solo', label: '🧘 Solo' },              { value: 'friends', label: '👫 With Friends' },
    { value: 'family', label: '👨‍👩‍👧 Family' },     { value: 'work_meeting', label: '💼 Work Meeting' },
    { value: 'date', label: '❤️ Date' },
  ]},
  preferredVisitTime:{ label: 'Preferred Visit Time', type: 'select', emoji: '⏰', options: [
    { value: 'morning', label: '🌅 Morning (before noon)' }, { value: 'afternoon', label: '☀️ Afternoon' },
    { value: 'evening', label: '🌆 Evening' },               { value: 'night_owl', label: '🦉 Night Owl' },
  ]},
}

const ProfileSheet = ({ field, onClose, onSave }) => {
  const cfg = FIELD_CONFIG[field]
  if (!cfg) return null
  const [value, setValue] = useState(cfg.type === 'multiselect' ? [] : '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!value || (Array.isArray(value) && !value.length)) return
    setSaving(true)
    try { await onSave(field, value) } finally { setSaving(false) }
    onClose()
  }

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 440, borderRadius: '24px 24px 0 0', padding: '20px 20px 40px', background: 'var(--modal-bg)', border: '1px solid var(--modal-border)', borderBottom: 'none', fontFamily: FONTS.body }}>

        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--divider)' }} />
        </div>

        <div style={{ fontSize: 24, textAlign: 'center', marginBottom: 8 }}>{cfg.emoji}</div>
        <h3 style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 4 }}>{cfg.label}</h3>
        <p style={{ fontFamily: FONTS.body, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 20 }}>
          This helps us personalise your experience
        </p>

        {/* Input */}
        {cfg.type === 'date' && (
          <input type="date" value={value} onChange={e => setValue(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 14, fontFamily: FONTS.mono, fontSize: 14, background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1.5px solid var(--input-border-focus)', outline: 'none' }} />
        )}

        {cfg.type === 'select' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {cfg.options.map(opt => (
              <button key={opt.value} onClick={() => setValue(opt.value)}
                style={{ padding: '10px 12px', borderRadius: 14, fontFamily: FONTS.body, fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left', background: value === opt.value ? 'var(--accent-dim)' : 'var(--pill-bg)', color: value === opt.value ? 'var(--accent)' : 'var(--text-secondary)', border: `1.5px solid ${value === opt.value ? 'var(--accent-border)' : 'var(--pill-border)'}`, transition: 'all 0.15s' }}>
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {cfg.type === 'multiselect' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {cfg.options.map(opt => {
              const sel = value.includes(opt.value)
              return (
                <button key={opt.value} onClick={() => setValue(prev => sel ? prev.filter(v=>v!==opt.value) : [...prev, opt.value])}
                  style={{ padding: '8px 14px', borderRadius: 999, fontFamily: FONTS.body, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', background: sel ? 'var(--accent-dim)' : 'var(--pill-bg)', color: sel ? 'var(--accent)' : 'var(--text-secondary)', border: `1.5px solid ${sel ? 'var(--accent-border)' : 'var(--pill-border)'}`, transition: 'all 0.15s' }}>
                  {opt.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Save */}
        <button onClick={handleSave} disabled={saving || !value || (Array.isArray(value) && !value.length)}
          style={{ width: '100%', marginTop: 20, padding: '14px 0', borderRadius: 16, fontFamily: FONTS.body, fontSize: 14, fontWeight: 700, background: 'var(--accent-gradient)', color: '#fff', border: 'none', cursor: 'pointer', opacity: (!value || (Array.isArray(value) && !value.length)) ? 0.4 : 1, boxShadow: '0 4px 20px var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {saving ? <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} /> : '✓ Save'}
        </button>
        <button onClick={onClose} style={{ width: '100%', marginTop: 10, padding: '10px 0', borderRadius: 16, fontFamily: FONTS.body, fontSize: 13, fontWeight: 500, background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
          Skip for now
        </button>
      </motion.div>
    </motion.div>,
    document.body
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOAST CARD — renders per tier
// ═══════════════════════════════════════════════════════════════════════════════
const ToastCard = ({ toast, isDark, tier, onDismiss, onNavigate, onOpenSheet }) => {
  const cardRef       = useRef(null)
  const startYRef     = useRef(null)
  const dragYRef      = useRef(0)
  const dismissedRef  = useRef(false)
  const longPressRef  = useRef(null)
  const timerRef      = useRef(null)
  const [snoozed, setSnoozed] = useState(false)

  const cfg      = getCfg(toast.type)
  const color    = toast.color ?? cfg.color
  const icon     = toast.emoji ?? toast.meta?.emoji ?? cfg.icon
  const isCrit   = CRITICAL_TYPES.has(toast.type) || toast.duration === 0
  const duration = isCrit ? null : (toast.duration ?? 5500)
  const isHigh   = tier === 'high'
  const isMid    = tier === 'mid'
  const isLow    = tier === 'low'

  // Auto-dismiss timer (skipped for critical)
  useEffect(() => {
    if (isCrit || snoozed) return
    timerRef.current = setTimeout(handleDismiss, duration)
    return () => clearTimeout(timerRef.current)
  }, [duration, isCrit, snoozed])

  const handleDismiss = useCallback(() => {
    if (dismissedRef.current) return
    dismissedRef.current = true
    onDismiss(toast.id)
  }, [toast.id, onDismiss])

  const handleTap = () => {
    if (Math.abs(dragYRef.current) > 6) return
    if (toast.type === 'profile_nudge' && toast.profileField) {
      onOpenSheet(toast.profileField)
      handleDismiss()
      return
    }
    handleDismiss()
    if (toast.navigate) onNavigate(toast.navigate)
  }

  // Swipe-up to dismiss
  const handlePointerDown = (e) => {
    startYRef.current = e.clientY; dragYRef.current = 0
    cardRef.current?.setPointerCapture?.(e.pointerId)
    // Long press → snooze
    longPressRef.current = setTimeout(() => {
      setSnoozed(true)
      clearTimeout(timerRef.current)
      if (cardRef.current) {
        cardRef.current.style.opacity = '0.5'
        cardRef.current.style.transform = 'scale(0.96)'
      }
      setTimeout(handleDismiss, 10 * 60 * 1000) // snooze 10min
    }, 600)
  }
  const handlePointerMove = (e) => {
    if (startYRef.current === null) return
    clearTimeout(longPressRef.current)
    const dy = e.clientY - startYRef.current
    dragYRef.current = dy
    if (dy < 0 && cardRef.current) {
      cardRef.current.style.transform = `translateY(${Math.max(dy, -100)}px) scale(${Math.max(0.92, 1 + dy / 600)})`
      cardRef.current.style.opacity   = `${Math.max(0.2, 1 + dy / 100)}`
    }
  }
  const handlePointerUp = () => {
    clearTimeout(longPressRef.current)
    if (dragYRef.current < -40) {
      if (cardRef.current) {
        cardRef.current.style.transition = 'transform .22s ease-in, opacity .22s'
        cardRef.current.style.transform  = 'translateY(-130px) scale(0.88)'
        cardRef.current.style.opacity    = '0'
        setTimeout(handleDismiss, 220)
      } else handleDismiss()
    } else if (cardRef.current) {
      cardRef.current.style.transition = 'transform .3s cubic-bezier(.34,1.56,.64,1), opacity .3s'
      cardRef.current.style.transform  = 'translateY(0) scale(1)'
      cardRef.current.style.opacity    = '1'
      setTimeout(() => { if (cardRef.current) cardRef.current.style.transition = '' }, 300)
    }
    startYRef.current = null
  }

  // ── LOW TIER — plain text card ──────────────────────────────────────────────
  if (isLow) return (
    <div ref={cardRef} onClick={handleTap} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 18, cursor: 'pointer', userSelect: 'none', touchAction: 'none', background: isDark ? 'rgba(16,12,8,0.92)' : 'rgba(255,255,255,0.92)', border: `1px solid ${color}30`, boxShadow: `0 4px 20px rgba(0,0,0,0.35)` }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: isDark ? '#FFF8EE' : '#1A0E04', fontFamily: FONTS.body, lineHeight: 1.2, marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{toast.title}</p>}
        {toast.message && <p style={{ margin: 0, fontSize: 11, color: isDark ? 'rgba(255,220,160,0.7)' : 'rgba(44,26,8,0.6)', fontFamily: FONTS.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{toast.message}</p>}
      </div>
      <button onClick={e => { e.stopPropagation(); handleDismiss() }} style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'rgba(128,128,128,0.2)', color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
    </div>
  )

  // ── MID / HIGH TIER ─────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes kc-prog { from{transform:scaleX(1)} to{transform:scaleX(0)} }
        @keyframes kc-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.5)} }
        @keyframes kc-ring  { 0%{transform:scale(1);opacity:0.7} 100%{transform:scale(2.2);opacity:0} }
        @keyframes spin     { to{transform:rotate(360deg)} }
      `}</style>

      <div
        ref={cardRef}
        onClick={handleTap}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'relative', overflow: 'hidden', touchAction: 'none', cursor: 'pointer',
          userSelect: 'none', willChange: 'transform, opacity', WebkitTapHighlightColor: 'transparent',
          borderRadius: 22, height: isHigh ? 76 : 70,
          display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px',
          background: isHigh
            ? isDark ? 'rgba(10,7,4,0.72)' : 'rgba(255,255,255,0.60)'
            : isDark ? 'rgba(16,12,8,0.58)' : 'rgba(255,255,255,0.46)',
          border: isHigh ? `1px solid ${color}40` : `1px solid ${color}22`,
          boxShadow: isHigh
            ? `0 10px 40px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.45) inset, 0 0 0 1px ${color}20, 0 6px 30px ${color}30`
            : `0 8px 28px rgba(0,0,0,0.42), 0 1px 0 rgba(255,255,255,0.38) inset, 0 4px 16px ${color}18`,
          backdropFilter: isHigh ? 'blur(28px) saturate(1.5)' : 'blur(18px)',
          WebkitBackdropFilter: isHigh ? 'blur(28px) saturate(1.5)' : 'blur(18px)',
          contain: 'layout style paint',
        }}
      >
        {/* Shimmer overlay for HIGH tier */}
        {isHigh && (
          <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `linear-gradient(105deg, transparent 30%, ${color}0a 50%, transparent 70%)` }} />
        )}

        {/* Left accent bar */}
        <div style={{ position: 'absolute', left: 0, top: '15%', bottom: '15%', width: 3, borderRadius: '0 3px 3px 0', background: `linear-gradient(180deg, ${color}80, ${color}, ${color}80)` }} />

        {/* Live dot */}
        <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: color, boxShadow: isHigh ? `0 0 10px ${color}, 0 0 20px ${color}55` : `0 0 6px ${color}`, animation: 'kc-pulse 2s ease-in-out infinite', marginLeft: 6 }} />

        {/* Icon */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {isHigh && isCrit && (
            <div style={{ position: 'absolute', inset: -2, borderRadius: '50%', border: `1.5px solid ${color}70`, animation: 'kc-ring 2s ease-out infinite' }} />
          )}
          <div style={{ width: isHigh ? 40 : 34, height: isHigh ? 40 : 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isHigh ? 18 : 16, background: isHigh ? `${color}30` : `${color}1c`, border: `1.5px solid ${color}${isHigh ? '60' : '35'}`, boxShadow: isHigh ? `0 0 16px ${color}35` : 'none', flexShrink: 0 }}>
            {icon}
          </div>
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {toast.title && (
            <p style={{ margin: 0, fontSize: isHigh ? 13 : 12.5, fontWeight: 700, fontFamily: FONTS.brand, lineHeight: 1.2, marginBottom: toast.message ? 2 : 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isDark ? '#fff' : '#0f0800', textShadow: isHigh ? `0 0 16px ${color}50` : 'none' }}>
              {toast.title}
            </p>
          )}
          {toast.message && (
            <p style={{ margin: 0, fontSize: isHigh ? 11.5 : 11, fontFamily: FONTS.brand, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isDark ? 'rgba(255,255,255,0.62)' : 'rgba(44,26,8,0.58)' }}>
              {toast.message}
            </p>
          )}
          {/* Snooze indicator */}
          {snoozed && (
            <p style={{ margin: '2px 0 0', fontSize: 9.5, color, fontFamily: FONTS.body, fontWeight: 600 }}>
              ⏱ Snoozed 10min
            </p>
          )}
        </div>

        {/* Action button */}
        {toast.actions?.length > 0 && (
          <button
            onClick={e => { e.stopPropagation(); handleDismiss(); if (toast.navigate) onNavigate(toast.navigate) }}
            style={{ flexShrink: 0, padding: '0 10px', height: isHigh ? 30 : 26, borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: FONTS.brand, fontSize: 11, fontWeight: 700, color: '#fff', background: isHigh ? `linear-gradient(135deg, ${color}, ${color}cc)` : color, boxShadow: isHigh ? `0 3px 14px ${color}60` : `0 2px 8px ${color}44`, WebkitTapHighlightColor: 'transparent', whiteSpace: 'nowrap' }}>
            {toast.actions[0].label}
          </button>
        )}

        {/* Close */}
        <button onClick={e => { e.stopPropagation(); handleDismiss() }}
          style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', border: `1px solid ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.10)'}`, background: isHigh ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.07)', color: isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.32)', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>
          ✕
        </button>

        {/* Progress bar (non-critical only) */}
        {!isCrit && duration && (
          <div style={{ position: 'absolute', bottom: 0, left: 14, right: 14, height: 2, borderRadius: 999, overflow: 'hidden', background: `${color}20` }}>
            <div style={{ position: 'absolute', inset: 0, background: isHigh ? `linear-gradient(90deg, ${color}66, ${color})` : `${color}99`, transformOrigin: 'left center', animation: `kc-prog ${duration}ms linear forwards` }} />
          </div>
        )}

        {/* Critical "swipe to dismiss" hint */}
        {isCrit && (
          <div style={{ position: 'absolute', bottom: 2, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 28, height: 2.5, borderRadius: 999, background: isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.12)' }} />
          </div>
        )}
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
export default function ToastRenderer() {
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const { isDark } = useContext(ThemeContext)
  const { tier }   = useDeviceTier()
  const allToasts  = useSelector(selectToasts)
  const user       = useSelector(selectUser)
  const isGuest    = useSelector(selectIsGuest)

  const [current,   setCurrent]   = useState(null)
  const [sheetField, setSheetField] = useState(null)
  const queueRef   = useRef([])
  const seenRef    = useRef(new Set())
  const busyRef    = useRef(false)

  const pump = useCallback((forceToast) => {
    if (busyRef.current && !forceToast) return
    const next = forceToast ?? queueRef.current.shift()
    if (!next) { busyRef.current = false; setCurrent(null); return }
    busyRef.current = true
    setCurrent(next)
    const cfg = getCfg(next.type)
    if (cfg.sound) {
      try { playNotificationSound(cfg.sound) } catch {}
    }
    doVibrate(next.type, next.vibrate)
  }, [])

  // Sync Redux toast queue → local queue
  useEffect(() => {
    const now = Date.now(); let hadNew = false
    allToasts.forEach(t => {
      if (seenRef.current.has(t.id)) return
      // Drop stale toasts (older than 10s and not critical)
      if (now - t.createdAt > 10000 && !CRITICAL_TYPES.has(t.type)) {
        seenRef.current.add(t.id); dispatch(dismissToast(t.id)); return
      }
      seenRef.current.add(t.id); hadNew = true
      const insertAt = queueRef.current.findIndex(q => q.priority > t.priority)
      if (insertAt === -1) queueRef.current.push(t)
      else queueRef.current.splice(insertAt, 0, t)
    })
    if (!hadNew) return

    // If incoming toast is critical and current is not → preempt
    const next = queueRef.current[0]
    if (next && current && next.priority <= 1 && current.priority > 1) {
      queueRef.current.shift()
      queueRef.current.unshift(current)
      busyRef.current = false
      setCurrent(null)
      setTimeout(() => pump(next), 100)
      return
    }
    if (!busyRef.current) pump()
  }, [allToasts])

  const handleDismiss = useCallback((id) => {
    dispatch(dismissToast(id))
    setCurrent(null)
    busyRef.current = false
    setTimeout(pump, 160)
  }, [dispatch, pump])

  const handleNavigate = useCallback((path) => { if (path) navigate(path) }, [navigate])

  // Save profile field from sheet
  const handleSheetSave = useCallback(async (field, value) => {
    if (!user?._id) return
    try {
      const res = await api.patch(EP.AUTH.UPDATE_PROFILE, { [field]: value })
      dispatch(updateUser(res.data))
    } catch (err) {
      console.warn('[ToastRenderer] profile save failed:', err.message)
    }
  }, [user, dispatch])

  // Tier-aware animation variants
  const variants = tier === 'mid'
    ? { initial: { opacity:0, scale:0.82, y:-16 }, animate: { opacity:1, scale:1, y:0 }, exit: { opacity:0, scale:0.90, y:-12 }, transition: { duration:0.30, ease:[0.34,1.36,0.64,1] } }
    : { initial: { opacity:0, scale:0.72, y:-22 }, animate: { opacity:1, scale:1, y:0 }, exit: { opacity:0, scale:0.86, y:-14 }, transition: { duration:0.34, ease:[0.34,1.56,0.64,1] } }

  return createPortal(
    <>
      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', top: 'calc(env(safe-area-inset-top,0px) + 62px)', width: 'calc(100vw - 44px)', maxWidth: 368, zIndex: 9500, pointerEvents: current ? 'auto' : 'none' }}>
        {tier === 'low'
          ? (current ? <ToastCard toast={current} isDark={isDark} tier={tier} onDismiss={handleDismiss} onNavigate={handleNavigate} onOpenSheet={setSheetField} /> : null)
          : (
            <AnimatePresence mode="wait">
              {current && (
                <motion.div key={current.id} {...variants}>
                  <ToastCard toast={current} isDark={isDark} tier={tier} onDismiss={handleDismiss} onNavigate={handleNavigate} onOpenSheet={setSheetField} />
                </motion.div>
              )}
            </AnimatePresence>
          )
        }
      </div>

      {/* Profile completion sheet */}
      <AnimatePresence>
        {sheetField && !isGuest && (
          <ProfileSheet field={sheetField} onClose={() => setSheetField(null)} onSave={handleSheetSave} />
        )}
      </AnimatePresence>
    </>,
    document.body
  )
}