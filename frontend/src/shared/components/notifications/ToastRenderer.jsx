// src/shared/components/notifications/ToastRenderer.jsx
//
// ✅ iPhone-style glass effect — light: white/80 frosted, dark: black/60 frosted
// ✅ Dynamic Island enter — fade + scale from top, spring bounce out
// ✅ Blur-in from top on enter (frosted appear)
// ✅ Swipe UP to dismiss (+ tap to dismiss)
// ✅ First-time login greeting — Redux loginCount===1 + localStorage guard
// ✅ Weather-based suggestions on login + weather change
// ✅ Max 1 visible — queue the rest
// ✅ Order/loyalty notifications persist to DB via notification.service.js
// ✅ Fully driven by toastSlice — no internal state for the queue

import { useEffect, useRef, useContext, useState, useCallback } from 'react'
import { createPortal }             from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate }              from 'react-router-dom'
import { motion, AnimatePresence }  from 'motion/react'
import { ThemeContext }             from '@shared/context/ThemeContext'
import { FONTS, BRAND }             from '@shared/config/brand'
import { selectToasts, dismissToast, showToast } from '@store/slices/toastSlice'
import { selectUser, selectIsLoggedIn, selectIsGuest } from '@store/slices/authSlice'
import { playNotificationSound }    from '@shared/utils/soundEngine'
import notificationService          from '@shared/services/notification.service'

// ─── Type → visual config ────────────────────────────────────────────────────
const TYPE_CFG = {
  order:    { color: '#FF9F1C', icon: '🍽️', sound: 'order'   },
  kitchen:  { color: '#FB923C', icon: '👨‍🍳', sound: 'order'   },
  payment:  { color: '#10B981', icon: '💳', sound: 'payment'  },
  loyalty:  { color: '#A78BFA', icon: '⭐',  sound: 'loyalty'  },
  waiter:   { color: '#F59E0B', icon: '🛎️', sound: 'waiter'   },
  weather:  { color: '#38BDF8', icon: '🌤️', sound: null       },
  festival: { color: '#F472B6', icon: '🎊',  sound: 'loyalty'  },
  birthday: { color: '#EC4899', icon: '🎂',  sound: 'loyalty'  },
  tip:      { color: '#F59E0B', icon: '😏',  sound: null       },
  idle:     { color: '#94A3B8', icon: '🤔',  sound: null       },
  message:  { color: '#7C3AED', icon: '💬',  sound: 'message'  },
  system:   { color: '#64748B', icon: '📢',  sound: 'system'   },
  welcome:  { color: '#10B981', icon: '👋',  sound: 'loyalty'  },
  suggest:  { color: '#0EA5E9', icon: '✨',  sound: null       },
}
const getCfg = (type) => TYPE_CFG[type] ?? TYPE_CFG.system

// Vibration map
const VIBRATE_MAP = {
  order:    [60, 40, 60],
  kitchen:  [60, 40, 60],
  payment:  [80, 40, 80, 40, 120],
  loyalty:  [50, 30, 50, 30, 80],
  waiter:   [100],
  festival: [50, 30, 50, 30, 80],
  birthday: [80, 40, 120],
  welcome:  [40, 20, 40],
  system:   [40],
}
// soundEngine.js already gates vibrate behind _unlocked internally.
// We call playNotificationSound which handles both sound + vibrate together.
const vibrate = (type, pattern) => {
  // playNotificationSound already calls vibrate internally with the right pattern.
  // This standalone vibrate is only used when we need vibrate WITHOUT sound.
  // Gate behind a gesture flag stored on window to avoid Chrome warning.
  if (!window.__userGestured) return
  try { navigator.vibrate?.(pattern ?? VIBRATE_MAP[type] ?? [40]) } catch {}
}

// Mark gesture on first interaction (mirrors soundEngine._unlock logic)
if (typeof window !== 'undefined' && !window.__userGestured) {
  const _markGesture = () => { window.__userGestured = true }
  window.addEventListener('click',      _markGesture, { once: true, passive: true, capture: true })
  window.addEventListener('touchstart', _markGesture, { once: true, passive: true, capture: true })
  window.addEventListener('keydown',    _markGesture, { once: true, passive: true, capture: true })
}

// ─── Weather suggestion copy ─────────────────────────────────────────────────
const WEATHER_SUGGEST = {
  rainy:  { title: '☔ Rainy day special',    message: 'Hot thukpa and masala tea are calling your name.',   navigate: '/menu?category=soup' },
  cold:   { title: '❄️ Something warm?',      message: 'Try our hot drinks & soups — perfect for the cold.', navigate: '/menu?category=hot'  },
  hot:    { title: '🧊 Beat the heat',        message: 'Cold drinks & chilled desserts available now.',       navigate: '/menu?category=cold' },
  windy:  { title: '💨 Windy outside?',       message: 'Settle in with a warm cup and snacks.',               navigate: '/menu'               },
  snowy:  { title: '❄️ Snow day comfort',     message: 'Stay warm — hot soups and teas freshly made.',        navigate: '/menu?category=hot'  },
  sunny:  { title: '☀️ Perfect sunny day',    message: 'Fresh juices and light bites are ready for you.',    navigate: '/menu?category=fresh'},
  cloudy: { title: '☁️ Cozy cloud vibes',     message: 'A warm latte pairs perfectly with this weather.',    navigate: '/menu?category=coffee'},
  stormy: { title: '⛈️ Storm outside',        message: 'You\'re safe inside — hot drinks on the house mood.',navigate: '/menu'               },
}

// ─── True see-through glass — Images 3 & 4 reference ─────────────────────────
// Exact traits extracted from the reference:
//   • Background clearly visible — blur smears it but shape/colors show through
//   • Base fill: near-zero opacity (8–12%) — no dark/light tint of its own
//   • The "glass" color comes entirely from the blurred backdrop, not a fill
//   • Thick specular RIM — a multi-layer border system:
//       outer: 1.5px rgba-white stroke (the bright edge catch)
//       inner: inset highlight on top+left, inset shadow on bottom+right
//   • Corner radius is large and consistent (like a physical glass sheet)
//   • Subtle diffuse drop shadow for lift off the page
const getGlass = (isDark, color) => ({
  // 65% transparent = 35% fill opacity
  bg: isDark
    ? `rgba(20, 18, 28, 0.35)`
    : `rgba(255, 255, 255, 0.35)`,

  // The thick specular rim — this is the KEY trait in images 3 & 4
  // A bright white stroke that catches light like a real glass edge
  border: `1.5px solid rgba(255, 255, 255, 0.38)`,

  // Multi-layer shadow system:
  //   1. Soft outer drop shadow (lift)
  //   2. Bright inset highlight on TOP edge (glass catching overhead light)
  //   3. Dark inset shadow on BOTTOM edge (glass edge in shadow)
  //   4. Bright inset on LEFT edge (side rim catch)
  shadow: [
    `0 16px 56px rgba(0,0,0,0.35)`,
    `0 2px 0 rgba(255,255,255,0.50) inset`,     // top rim — bright
    `0 -1.5px 0 rgba(0,0,0,0.22) inset`,        // bottom rim — dark
    `2px 0 0 rgba(255,255,255,0.18) inset`,      // left rim catch
    `-2px 0 0 rgba(255,255,255,0.08) inset`,     // right rim (dimmer)
  ].join(', '),

  // High blur + high saturation — background bleeds through vividly
  // brightness slightly above 1 lifts the overall glass feel
  blur: 'blur(48px) saturate(1.9) brightness(1.12)',

  // Text must stay readable over any background
  textPri:    'rgba(255,255,255,0.96)',
  textSec:    'rgba(255,255,255,0.62)',
  iconBg:     `rgba(255,255,255,0.12)`,
  pillBg:     `rgba(255,255,255,0.14)`,
  closeColor: 'rgba(255,255,255,0.45)',

  // Top gloss stripe — the thin bright line right at the very top edge
  // In images 3 & 4 this is the brightest part of the glass
  glossLine: `linear-gradient(90deg,
    transparent     4%,
    rgba(255,255,255,0.30) 20%,
    rgba(255,255,255,0.72) 50%,
    rgba(255,255,255,0.30) 80%,
    transparent     96%
  )`,
})

// ─── Progress bar (CSS only, no GSAP dep) ───────────────────────────────────
const ProgressBar = ({ duration, color }) => {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, borderRadius: '0 0 20px 20px', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(90deg, ${color}66, ${color}dd)`,
        transformOrigin: 'left center',
        animation: `tr-progress ${duration}ms linear forwards`,
      }}/>
      <style>{`@keyframes tr-progress { from { transform: scaleX(1) } to { transform: scaleX(0) } }`}</style>
    </div>
  )
}

// ─── Single toast card ───────────────────────────────────────────────────────
const ToastCard = ({ toast, isDark, onDismiss, onNavigate }) => {
  const startYRef  = useRef(null)
  const dragYRef   = useRef(0)
  const cardRef    = useRef(null)

  const cfg      = getCfg(toast.type)
  const color    = toast.color ?? cfg.color
  const icon     = toast.meta?.emoji ?? toast.emoji ?? cfg.icon
  const duration = toast.duration ?? 5500
  const glass    = getGlass(isDark, color)

  // Auto-dismiss
  useEffect(() => {
    const t = setTimeout(() => handleDismiss(), duration)
    return () => clearTimeout(t)
  }, [duration])

  const handleDismiss = useCallback(() => onDismiss(toast.id), [toast.id, onDismiss])

  const handleTap = (e) => {
    if (Math.abs(dragYRef.current) > 6) return // was a swipe, not a tap
    handleDismiss()
    if (toast.navigate) onNavigate(toast.navigate)
  }

  // ── Swipe-up to dismiss (pointer events for cross-device) ──
  const handlePointerDown = (e) => {
    startYRef.current = e.clientY
    dragYRef.current  = 0
    cardRef.current?.setPointerCapture?.(e.pointerId)
  }
  const handlePointerMove = (e) => {
    if (startYRef.current === null) return
    const dy = e.clientY - startYRef.current
    dragYRef.current = dy
    if (dy < 0 && cardRef.current) {
      cardRef.current.style.transform = `translateY(${Math.max(dy, -80)}px)`
      cardRef.current.style.opacity   = `${Math.max(0.3, 1 + dy / 80)}`
    }
  }
  const handlePointerUp = () => {
    if (dragYRef.current < -36) {
      // Flick up — dismiss with animation
      if (cardRef.current) {
        cardRef.current.style.transition = 'transform 0.22s cubic-bezier(0.4,0,1,1), opacity 0.22s'
        cardRef.current.style.transform  = 'translateY(-120px)'
        cardRef.current.style.opacity    = '0'
        setTimeout(handleDismiss, 200)
      } else {
        handleDismiss()
      }
    } else {
      // Snap back
      if (cardRef.current) {
        cardRef.current.style.transition = 'transform 0.32s cubic-bezier(0.34,1.56,0.64,1), opacity 0.32s'
        cardRef.current.style.transform  = 'translateY(0)'
        cardRef.current.style.opacity    = '1'
        setTimeout(() => {
          if (cardRef.current) cardRef.current.style.transition = ''
        }, 320)
      }
    }
    startYRef.current = null
  }

  return (
    <div
      ref={cardRef}
      onClick={handleTap}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position:             'relative',
        overflow:             'hidden',
        borderRadius:         22,
        cursor:               'pointer',
        background:           glass.bg,
        border:               glass.border,
        boxShadow:            glass.shadow,
        backdropFilter:       glass.blur,
        WebkitBackdropFilter: glass.blur,
        userSelect:           'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction:          'none',
        willChange:           'transform, opacity',
      }}
    >
      {/* ── Gloss shine stripe at very top — the bright horizontal line from reference ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: glass.glossLine,
        pointerEvents: 'none', zIndex: 3,
      }}/>
      {/* Inner top glow wash — bright area under the rim, like real glass */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '38%',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, transparent 100%)',
        borderRadius: '22px 22px 0 0',
        pointerEvents: 'none', zIndex: 1,
      }}/>

      {/* Left accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: '12%', bottom: '12%', width: 3,
        borderRadius: '0 3px 3px 0',
        background: `linear-gradient(180deg, ${color}33, ${color}cc, ${color}33)`,
      }}/>

      {/* Top-right glow */}
      <div style={{
        position: 'absolute', top: -20, right: 0, width: 80, height: 80,
        borderRadius: '50%', pointerEvents: 'none',
        background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
      }}/>

      {/* Content */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 11,
        padding: '13px 40px 13px 14px',
      }}>
        {/* Icon bubble */}
        <div style={{
          width: 42, height: 42, borderRadius: 13, flexShrink: 0,
          background: glass.iconBg,
          border: `1px solid ${color}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22,
          boxShadow: `0 2px 8px ${color}22`,
        }}>
          {icon}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {toast.title && (
            <p style={{
              margin: 0, fontSize: 13, fontWeight: 700,
              letterSpacing: '-0.022em', lineHeight: 1.3,
              color: glass.textPri,
              fontFamily: FONTS.brand,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {toast.title}
            </p>
          )}
          <p style={{
            margin: toast.title ? '2px 0 0' : 0,
            fontSize: 12, lineHeight: 1.5, fontWeight: 450,
            color: glass.textSec,
            fontFamily: FONTS.brand,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {toast.message}
          </p>

          {toast.actions?.length > 0 && (
            <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
              {toast.actions.map(action => (
                <button
                  key={action.key}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDismiss()
                    if (toast.navigate) onNavigate(toast.navigate)
                  }}
                  style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 11,
                    fontWeight: 700, cursor: 'pointer', fontFamily: FONTS.brand,
                    background: action.primary ? color : glass.pillBg,
                    color:      action.primary ? '#fff' : color,
                    border:     action.primary ? 'none' : `1px solid ${color}44`,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live dot */}
        <div style={{
          position: 'absolute', top: 12, right: 32,
          width: 6, height: 6, borderRadius: '50%',
          background: color, boxShadow: `0 0 6px ${color}`,
          animation: 'tr-pulse 1.8s ease-in-out infinite',
        }}/>
      </div>

      {/* Dismiss X */}
      <button
        onClick={(e) => { e.stopPropagation(); handleDismiss() }}
        style={{
          position: 'absolute', top: 10, right: 10,
          width: 20, height: 20, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: glass.pillBg,
          border: 'none', cursor: 'pointer',
          color: glass.closeColor,
          fontSize: 10, lineHeight: 1, padding: 0,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        ✕
      </button>

      <ProgressBar duration={duration} color={color}/>

      <style>{`
        @keyframes tr-pulse {
          0%,100% { opacity:1; transform:scale(1) }
          50% { opacity:0.35; transform:scale(0.7) }
        }
      `}</style>
    </div>
  )
}

// ─── First-login greeting builder ────────────────────────────────────────────
const FIRST_LOGIN_KEY = 'kc_welcomed'

const buildWelcomeToast = (user) => {
  const name    = user?.name?.split(' ')[0] ?? 'there'
  const isGuest = user?.isGuest
  if (isGuest) {
    return {
      type: 'welcome', priority: 3,
      title: `👋 Welcome to ${BRAND.name}!`,
      message: 'Browse our menu and place your order anytime.',
      duration: 6000,
      navigate: '/menu',
    }
  }
  return {
    type: 'welcome', priority: 3,
    title: `🎉 Welcome, ${name}!`,
    message: `Great to have you here. Enjoy your visit at ${BRAND.name}!`,
    duration: 6500,
    navigate: '/menu',
    actions: [{ key: 'menu', label: 'See Menu', primary: true }],
  }
}

// ─── Weather suggestion builder ──────────────────────────────────────────────
const buildWeatherToast = (condition) => {
  const s = WEATHER_SUGGEST[condition]
  if (!s) return null
  return {
    type: 'suggest', priority: 4,
    title: s.title, message: s.message,
    duration: 5000, navigate: s.navigate,
    actions: [{ key: 'view', label: 'View', primary: false }],
  }
}

// ═══ ToastRenderer ════════════════════════════════════════════════════════════
export default function ToastRenderer() {
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const { isDark } = useContext(ThemeContext)

  const allToasts  = useSelector(selectToasts)
  const user       = useSelector(selectUser)
  const isLoggedIn = useSelector(selectIsLoggedIn)
  const isGuest    = useSelector(selectIsGuest)

  const [current, setCurrent] = useState(null)
  const queueRef   = useRef([])
  const seenRef    = useRef(new Set())
  const busyRef    = useRef(false)
  const prevCond   = useRef(null)

  // ── First-login welcome ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || !user) return
    const loginCount = user?.loginCount ?? 0
    const welcomed   = localStorage.getItem(FIRST_LOGIN_KEY)

    // Show if: loginCount===1 (backend) AND localStorage flag not set
    // OR guest (always show, no localStorage check for guests)
    const shouldShow = isGuest
      ? !sessionStorage.getItem(FIRST_LOGIN_KEY + '_guest')
      : (loginCount === 1 && !welcomed)

    if (!shouldShow) return

    // Set guards
    if (isGuest) sessionStorage.setItem(FIRST_LOGIN_KEY + '_guest', '1')
    else localStorage.setItem(FIRST_LOGIN_KEY, '1')

    // Small delay so page loads first
    setTimeout(() => {
      dispatch(showToast(buildWelcomeToast(user)))
    }, 1200)
  }, [isLoggedIn, user?._id]) // only fire when user identity changes

  // ── Weather-based suggestion ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const condition = e.detail?.condition
      if (!condition || condition === prevCond.current) return
      prevCond.current = condition

      // Only show if logged in, not first visit (welcome toast already showing)
      if (!isLoggedIn) return
      const toast = buildWeatherToast(condition)
      if (!toast) return

      // Delay so weather badge appears first
      setTimeout(() => dispatch(showToast(toast)), 2500)
    }
    window.addEventListener('qoc:weather', handler)
    return () => window.removeEventListener('qoc:weather', handler)
  }, [isLoggedIn, dispatch])

  // ── Queue pump ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const now = Date.now()
    let hadNew = false

    allToasts.forEach(t => {
      if (seenRef.current.has(t.id)) return
      if (now - t.createdAt > 8000) {
        seenRef.current.add(t.id)
        dispatch(dismissToast(t.id))
        return
      }
      seenRef.current.add(t.id)
      hadNew = true
      // Insert by priority
      const insertAt = queueRef.current.findIndex(q => q.priority > t.priority)
      if (insertAt === -1) queueRef.current.push(t)
      else queueRef.current.splice(insertAt, 0, t)
    })

    if (!hadNew) return

    // High-priority interrupt
    const next = queueRef.current[0]
    if (next && current && next.priority <= 2 && current.priority >= 3) {
      queueRef.current.shift()
      queueRef.current.unshift(current)
      busyRef.current = false
      setCurrent(null)
      setTimeout(() => pump(next), 80)
      return
    }

    if (!busyRef.current) pump()
  }, [allToasts])

  const pump = useCallback((forceToast) => {
    if (busyRef.current && !forceToast) return
    const next = forceToast ?? queueRef.current.shift()
    if (!next) return
    busyRef.current = true
    setCurrent(next)
    const cfg = getCfg(next.type)
    if (cfg.sound) playNotificationSound(cfg.sound)
    vibrate(next.type, next.vibrate)
  }, [])

  const handleDismiss = useCallback((id) => {
    dispatch(dismissToast(id))
    setCurrent(null)
    busyRef.current = false
    setTimeout(pump, 140)
  }, [dispatch, pump])

  const handleNavigate = useCallback((path) => {
    if (path) navigate(path)
  }, [navigate])

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 'calc(env(safe-area-inset-top, 0px) + 56px)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9500,
      width: 'calc(100vw - 28px)',
      maxWidth: 400,
      pointerEvents: current ? 'auto' : 'none',
    }}>
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id}
            initial={{
              opacity: 0,
              scale: 0.82,
              y: -24,
              filter: 'blur(8px)',
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              filter: 'blur(0px)',
            }}
            exit={{
              opacity: 0,
              scale: 0.88,
              y: -18,
              filter: 'blur(4px)',
            }}
            transition={{
              enter: { duration: 0.38, ease: [0.34, 1.56, 0.64, 1] },
              exit:  { duration: 0.22, ease: [0.4, 0, 1, 1] },
              filter: { duration: 0.28 },
              opacity: { duration: 0.28 },
            }}
          >
            <ToastCard
              toast={current}
              isDark={isDark}
              onDismiss={handleDismiss}
              onNavigate={handleNavigate}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  )
}