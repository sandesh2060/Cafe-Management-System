// src/shared/components/notifications/ToastRenderer.jsx
//
// PRODUCTION FIXES vs previous version:
//
// 1. IMMEDIATE DISPLAY — critical/high priority toasts bypass the 320ms pump
//    delay and show instantly. Low priority waits for current toast to clear.
//
// 2. NO BELL POLLUTION — ToastRenderer no longer calls addNotification().
//    Only backend-originated events (socket notification:new) write to the bell.
//    Transient toasts (weather, idle, tip, festival) are ephemeral only.
//
// 3. DUPLICATE SYSTEM REMOVED — NotificationToast.jsx (the old minimal toast)
//    must be removed from your tree. This file is the single toast authority.
//
// 4. STALE TOAST GUARD — toasts older than 8s that arrive in the queue
//    (from a slow Redux hydration) are silently dropped, never shown.

import { useEffect, useRef, useContext, useState, useCallback } from 'react'
import { createPortal }             from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate }              from 'react-router-dom'
import gsap                         from 'gsap'
import { ThemeContext }             from '@shared/context/ThemeContext'
import { selectToasts, dismissToast } from '@store/slices/toastSlice'
import { playNotificationSound }    from '@shared/hooks/useNotificationSound'

// ── Type → visual config ──────────────────────────────────────────────────────
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
}
const getCfg = (type) => TYPE_CFG[type] ?? TYPE_CFG.system

// ── PRIORITY constants (must match toastSlice.js) ─────────────────────────────
const PRIORITY = { critical: 1, high: 2, medium: 3, low: 4 }

// ── Vibration ─────────────────────────────────────────────────────────────────
const VIBRATE_MAP = {
  order:    [60, 40, 60],
  kitchen:  [60, 40, 60],
  payment:  [80, 40, 80, 40, 120],
  loyalty:  [50, 30, 50, 30, 80],
  waiter:   [100],
  festival: [50, 30, 50, 30, 80],
  birthday: [80, 40, 120],
  system:   [40],
}
const vibrate = (type, pattern) => {
  try { navigator.vibrate?.(pattern ?? VIBRATE_MAP[type] ?? [40]) } catch {}
}

// ── Festival image ────────────────────────────────────────────────────────────
const FestivalImage = ({ src, emoji, color }) => {
  const imgRef        = useRef(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    if (!imgRef.current) return
    gsap.fromTo(imgRef.current,
      { y: -20, opacity: 0, scale: 0.7, rotate: -8 },
      { y: 0,   opacity: 1, scale: 1,   rotate: 0,
        duration: 0.65, ease: 'back.out(2)', delay: 0.15 }
    )
    gsap.to(imgRef.current, {
      y: -4, duration: 2.2, ease: 'sine.inOut',
      yoyo: true, repeat: -1, delay: 0.8,
    })
  }, [src])

  const bubbleStyle = {
    position: 'absolute', top: -18, left: 10,
    width: 56, height: 56, borderRadius: '50%',
    background: `${color}22`, border: `2px solid ${color}44`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28, boxShadow: `0 4px 16px ${color}33`,
    zIndex: 10, pointerEvents: 'none',
  }

  if (!src || err) {
    return <div ref={imgRef} style={bubbleStyle}>{emoji}</div>
  }

  return (
    <img
      ref={imgRef} src={src} alt="" onError={() => setErr(true)}
      style={{
        position: 'absolute', top: -22, left: 6,
        width: 64, height: 64, objectFit: 'contain',
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.35))',
        zIndex: 10, pointerEvents: 'none', userSelect: 'none',
      }}
    />
  )
}

// ── Single toast card ─────────────────────────────────────────────────────────
const ToastCard = ({ toast, isDark, onDismiss, onNavigate }) => {
  const cardRef  = useRef(null)
  const barRef   = useRef(null)
  const timerRef = useRef(null)
  const startYRef = useRef(null)

  const isFestival = toast.type === 'festival' || toast.type === 'birthday'
  const cfg        = getCfg(toast.type)
  const color      = (isFestival && toast.color) ? toast.color : cfg.color
  const icon       = toast.meta?.emoji ?? toast.emoji ?? cfg.icon
  const duration   = toast.duration ?? 5500

  const D      = isDark
  const bg     = D ? 'rgba(10,12,18,0.97)' : 'rgba(255,255,255,0.98)'
  const shadow = D
    ? `0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px ${color}20, 0 1px 0 rgba(255,255,255,0.06) inset`
    : `0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px ${color}18`

  // Entrance
  useEffect(() => {
    if (!cardRef.current) return
    gsap.fromTo(cardRef.current,
      { y: -88, opacity: 0, scale: 0.88, rotateX: 6 },
      { y: 0,   opacity: 1, scale: 1,    rotateX: 0,
        duration: 0.45, ease: 'back.out(1.6)' }
    )
  }, [])

  // Progress bar + auto-dismiss
  useEffect(() => {
    if (!barRef.current) return
    gsap.fromTo(barRef.current,
      { scaleX: 1 },
      { scaleX: 0, duration: duration / 1000, ease: 'none',
        transformOrigin: 'left center' }
    )
    timerRef.current = setTimeout(dismiss, duration)
    return () => clearTimeout(timerRef.current)
  }, [duration])

  const dismiss = useCallback(() => {
    clearTimeout(timerRef.current)
    if (!cardRef.current) { onDismiss(toast.id); return }
    gsap.to(cardRef.current, {
      y: -80, opacity: 0, scale: 0.9,
      duration: 0.25, ease: 'power3.in',
      onComplete: () => onDismiss(toast.id),
    })
  }, [toast.id, onDismiss])

  const handleTap = () => {
    dismiss()
    if (toast.navigate) onNavigate(toast.navigate)
  }

  // Swipe-up to dismiss
  const handleTouchStart = (e) => { startYRef.current = e.touches[0].clientY }
  const handleTouchMove  = (e) => {
    if (startYRef.current === null) return
    const dy = e.touches[0].clientY - startYRef.current
    if (dy < 0) gsap.set(cardRef.current, { y: Math.max(dy, -60) })
  }
  const handleTouchEnd = () => {
    if (!cardRef.current) return
    const ty = gsap.getProperty(cardRef.current, 'y')
    if (ty < -30) dismiss()
    else gsap.to(cardRef.current, { y: 0, duration: 0.3, ease: 'back.out(2)' })
    startYRef.current = null
  }

  return (
    <div style={{ position: 'relative', overflow: 'visible' }}>
      {isFestival && (
        <FestivalImage
          src={toast.imageUrl ?? toast.meta?.imageUrl ?? null}
          emoji={icon}
          color={color}
        />
      )}

      <div
        ref={cardRef}
        onClick={handleTap}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'relative',
          marginTop: isFestival ? 10 : 0,
          overflow: 'hidden', borderRadius: 18, cursor: 'pointer',
          background: bg,
          border: `1.5px solid ${color}35`,
          boxShadow: shadow,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          willChange: 'transform, opacity',
        }}
      >
        {/* Left accent */}
        <div style={{
          position: 'absolute', left: 0, top: '10%', bottom: '10%', width: 3,
          borderRadius: '0 3px 3px 0',
          background: `linear-gradient(180deg, ${color}44, ${color}, ${color}44)`,
        }} />

        {/* Glow blob */}
        <div style={{
          position: 'absolute', top: -24, right: 8, width: 70, height: 70,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}22, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        {/* Festival shimmer */}
        {isFestival && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `linear-gradient(120deg, ${color}08 0%, transparent 60%, ${color}06 100%)`,
          }} />
        )}

        {/* Content */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: isFestival ? '13px 42px 13px 82px' : '13px 42px 13px 16px',
        }}>
          {!isFestival && (
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: `${color}16`, border: `1px solid ${color}28`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>
              {icon}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            {toast.title && (
              <p style={{
                margin: 0, fontSize: 13, fontWeight: 800,
                letterSpacing: '-0.025em', lineHeight: 1.25,
                color: D ? '#F0F6FF' : '#0B1929',
                fontFamily: "'Baloo 2', system-ui, sans-serif",
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {toast.title}
              </p>
            )}
            <p style={{
              margin: toast.title ? '3px 0 0' : 0,
              fontSize: 12, lineHeight: 1.5, fontWeight: 500,
              color: D ? 'rgba(240,246,255,0.60)' : 'rgba(11,25,41,0.58)',
              fontFamily: "'Baloo 2', system-ui, sans-serif",
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {toast.message}
            </p>

            {toast.actions?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {toast.actions.map(action => (
                  <button
                    key={action.key}
                    onClick={(e) => { e.stopPropagation(); dismiss(); onNavigate(toast.navigate) }}
                    style={{
                      padding: '4px 10px', borderRadius: 8,
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      fontFamily: "'Baloo 2', system-ui, sans-serif",
                      background: action.primary ? color : 'transparent',
                      color: action.primary ? '#fff' : color,
                      border: action.primary ? 'none' : `1px solid ${color}40`,
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
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: color, boxShadow: `0 0 6px ${color}`,
            animation: 'tr-dot-pulse 1.6s ease-in-out infinite',
          }} />
        </div>

        {/* Dismiss X */}
        <button
          onClick={(e) => { e.stopPropagation(); dismiss() }}
          style={{
            position: 'absolute', top: 9, right: 9,
            width: 20, height: 20, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: D ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
            border: 'none', cursor: 'pointer',
            color: D ? 'rgba(240,246,255,0.35)' : 'rgba(11,25,41,0.35)',
            fontSize: 11, lineHeight: 1, padding: 0,
            WebkitTapHighlightColor: 'transparent',
          }}
        >✕</button>

        {/* Progress bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5 }}>
          <div ref={barRef} style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            borderRadius: 2, transformOrigin: 'left center',
          }} />
        </div>

        <style>{`
          @keyframes tr-dot-pulse {
            0%,100% { opacity: 1;   transform: scale(1);    }
            50%      { opacity: 0.4; transform: scale(0.75); }
          }
        `}</style>
      </div>
    </div>
  )
}

// ═══ ToastRenderer ════════════════════════════════════════════════════════════
//
// ARCHITECTURE:
//   allToasts (Redux) → seenRef dedup → sorted queue (priority order)
//   → current shown immediately if nothing displaying OR if incoming is
//     critical/high and current is lower priority (interrupt)
//
export default function ToastRenderer() {
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const { isDark } = useContext(ThemeContext)
  const allToasts  = useSelector(selectToasts)

  const [current, setCurrent] = useState(null)
  const queueRef  = useRef([])      // sorted pending toasts
  const seenRef   = useRef(new Set()) // IDs already enqueued this session
  const busyRef   = useRef(false)

  // ── When Redux adds new toasts ─────────────────────────────────────────────
  useEffect(() => {
    const now = Date.now()
    let hadNew = false

    allToasts.forEach(t => {
      if (seenRef.current.has(t.id)) return

      // Drop stale toasts (arrived >8s after creation — slow Redux hydration)
      if (now - t.createdAt > 8000) {
        seenRef.current.add(t.id)
        dispatch(dismissToast(t.id))
        return
      }

      seenRef.current.add(t.id)
      hadNew = true

      // Insert into queue maintaining priority order
      const priority = t.priority ?? 4
      const insertAt = queueRef.current.findIndex(q => q.priority > priority)
      if (insertAt === -1) queueRef.current.push(t)
      else queueRef.current.splice(insertAt, 0, t)
    })

    if (!hadNew) return

    // Interrupt: if incoming critical/high + currently showing medium/low → swap in
    const next = queueRef.current[0]
    if (
      next &&
      current &&
      next.priority <= PRIORITY.high &&
      current.priority >= PRIORITY.medium
    ) {
      // Push current back to front of queue so it shows after
      queueRef.current.shift()  // remove next (about to show it)
      queueRef.current.unshift(current) // put current back
      busyRef.current = false
      setCurrent(null)
      // Small delay so GSAP exit animation has time (but shorter than normal)
      setTimeout(() => showNext(next), 80)
      return
    }

    if (!busyRef.current) pump()
  }, [allToasts])

  const showNext = useCallback((toast) => {
    busyRef.current = true
    setCurrent(toast)
    const cfg = getCfg(toast.type)
    // Only play sound for types that have one
    if (cfg.sound) playNotificationSound(cfg.sound)
    vibrate(toast.type, toast.vibrate)
  }, [])

  const pump = useCallback(() => {
    if (busyRef.current) return
    if (queueRef.current.length === 0) return
    const next = queueRef.current.shift()
    showNext(next)
  }, [showNext])

  const handleDismiss = useCallback((id) => {
    dispatch(dismissToast(id))
    setCurrent(null)
    busyRef.current = false
    // Immediate pump for next in queue — no artificial delay
    setTimeout(pump, 120)
  }, [dispatch, pump])

  const handleNavigate = useCallback((path) => {
    if (path) navigate(path)
  }, [navigate])

  if (!current) return null

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 'calc(env(safe-area-inset-top, 0px) + 56px)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9500,
      width: 'calc(100vw - 28px)',
      maxWidth: 400,
      pointerEvents: 'auto',
      overflow: 'visible',
    }}>
      <ToastCard
        key={current.id}
        toast={current}
        isDark={isDark}
        onDismiss={handleDismiss}
        onNavigate={handleNavigate}
      />
    </div>,
    document.body
  )
}