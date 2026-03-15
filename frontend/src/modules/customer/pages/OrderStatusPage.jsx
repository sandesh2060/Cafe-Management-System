// frontend/src/modules/customer/pages/OrderStatusPage.jsx
// Route: /order/status          → live active order tracker
// Route: /order/status?id=abc   → read-only past order detail (from OrderHistoryPage)
//
// When ?id= param is present:
//   - Looks up that order in Redux history
//   - Shows the same UI in read-only mode (no socket updates needed)
//   - Back button goes to /order/history
//
// When no ?id= param:
//   - Shows active order with live socket updates
//   - Back button goes to /menu

import { useEffect, useCallback, useContext, useMemo } from 'react'
import { useNavigate, useLocation }  from 'react-router-dom'
import { useSelector, useDispatch }  from 'react-redux'
import { motion, AnimatePresence }   from 'motion/react'
import { ThemeContext }              from '@shared/context/ThemeContext'
import {
  selectActiveOrder,
  selectOrderHistory,
  selectOrderLoading,
  fetchActiveOrder,
  fetchOrderHistory,
}                                    from '@store/slices/orderSlice'

// ── Status pipeline ───────────────────────────────────────────────────────────
const STEPS = [
  {
    key:   'pending',
    label: 'Order Placed',
    sub:   'We received your order',
    color: '#F59E0B',
    glow:  'rgba(245,158,11,0.45)',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  },
  {
    key:   'preparing',
    label: 'Kitchen Cooking',
    sub:   'Your food is being prepared',
    color: '#3B82F6',
    glow:  'rgba(59,130,246,0.45)',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <path d="M12 2a7 7 0 017 7c0 4-3 6-3 9H8c0-3-3-5-3-9a7 7 0 017-7z"/>
        <path d="M8 18h8M8 21h8"/>
      </svg>
    ),
  },
  {
    key:   'on_the_way',
    label: 'On the Way',
    sub:   'Waiter is heading to your table',
    color: '#F97316',
    glow:  'rgba(249,115,22,0.45)',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <circle cx="12" cy="8" r="3"/>
        <path d="M6.5 19a5.5 5.5 0 0111 0"/>
        <path d="M3 11l4 2M17 13l4-2"/>
      </svg>
    ),
  },
  {
    key:   'delivered',
    label: 'Delivered',
    sub:   'Enjoy your meal!',
    color: '#10B981',
    glow:  'rgba(16,185,129,0.45)',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
        <path d="M22 4L12 14.01l-3-3"/>
      </svg>
    ),
  },
]

const STATUS_INDEX = {
  pending: 0, preparing: 1, on_the_way: 2,
  delivered: 3, paid: 3, cancelled: -1,
}

// ── SVG ring progress ─────────────────────────────────────────────────────────
const ProgressRing = ({ step, total, color }) => {
  const R   = 38
  const C   = 2 * Math.PI * R
  const pct = (step / total) * C

  return (
    <svg width="96" height="96" viewBox="0 0 96 96"
      style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
      <circle cx="48" cy="48" r={R} fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
      <motion.circle
        cx="48" cy="48" r={R} fill="none"
        stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={C}
        initial={{ strokeDashoffset: C }}
        animate={{ strokeDashoffset: C - pct }}
        transition={{ duration: 1.3, ease: [0.4, 0, 0.2, 1] }}
        style={{ filter: `drop-shadow(0 0 5px ${color})` }}
      />
    </svg>
  )
}

// ── Floating particle ─────────────────────────────────────────────────────────
const FloatParticle = ({ emoji, x, delay, repeatDelay }) => (
  <motion.div
    style={{
      position: 'fixed', left: `${x}%`, bottom: '-5%',
      fontSize: 20, pointerEvents: 'none', userSelect: 'none', zIndex: 0,
    }}
    initial={{ y: 0, opacity: 0, scale: 0.6 }}
    animate={{ y: -380, opacity: [0, 0.9, 0.9, 0], scale: [0.6, 1.1, 0.9] }}
    transition={{ duration: 5, delay, ease: 'easeOut', repeat: Infinity, repeatDelay }}
  >
    {emoji}
  </motion.div>
)

// ── Step row ──────────────────────────────────────────────────────────────────
const StepRow = ({ step, idx, currentIdx, isDark: D, delay }) => {
  const done   = idx < currentIdx
  const active = idx === currentIdx
  const dim    = idx > currentIdx
  const isLast = idx === STEPS.length - 1

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.2, 0, 0, 1] }}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 44 }}>
        <motion.div
          animate={{
            background: dim
              ? D ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
              : step.color,
            boxShadow: active ? `0 0 18px ${step.glow}` : 'none',
            scale:     active ? [1, 1.1, 1] : 1,
          }}
          transition={{
            scale:      { duration: 1.8, repeat: active ? Infinity : 0, ease: 'easeInOut' },
            background: { duration: 0.4 },
          }}
          style={{
            width: 44, height: 44, borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', flexShrink: 0,
          }}
        >
          {active && (
            <motion.div
              style={{ position: 'absolute', inset: -5, borderRadius: 20, border: `2px solid ${step.color}` }}
              animate={{ opacity: [0.5, 0], scale: [1, 1.45] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
          <motion.span
            animate={{ color: dim ? (D ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)') : '#fff' }}
            transition={{ duration: 0.3 }}
          >
            {step.svg}
          </motion.span>
          <AnimatePresence>
            {done && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                style={{
                  position: 'absolute', bottom: -5, right: -5,
                  width: 17, height: 17, borderRadius: '50%', background: '#10B981',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `2.5px solid ${D ? '#0F0A06' : '#FAF6EE'}`,
                }}
              >
                <svg viewBox="0 0 10 10" width="9" height="9" fill="none"
                  stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M2 5l2.5 2.5L8 2.5"/>
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {!isLast && (
          <div style={{
            width: 2, height: 32, margin: '3px 0', borderRadius: 2, overflow: 'hidden',
            background: D ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
          }}>
            <motion.div
              style={{
                width: '100%', borderRadius: 2,
                background: `linear-gradient(${step.color}, ${STEPS[idx + 1].color})`,
              }}
              initial={{ height: '0%' }}
              animate={{ height: done ? '100%' : '0%' }}
              transition={{ duration: 0.7, delay: delay + 0.2, ease: [0.4, 0, 0.2, 1] }}
            />
          </div>
        )}
      </div>

      <div style={{ paddingTop: 8, paddingBottom: isLast ? 0 : 16 }}>
        <motion.p
          style={{ margin: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}
          animate={{
            color: active
              ? step.color
              : done
              ? D ? '#FFF8EE' : '#120D06'
              : D ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)',
          }}
          transition={{ duration: 0.4 }}
        >
          {step.label}
        </motion.p>
        <motion.p
          style={{ margin: '3px 0 0', fontSize: 11, fontWeight: 500 }}
          animate={{
            color: active || done
              ? D ? 'rgba(255,248,238,0.45)' : 'rgba(92,51,23,0.48)'
              : D ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          }}
          transition={{ duration: 0.4 }}
        >
          {step.sub}
        </motion.p>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OrderStatusPage
// ─────────────────────────────────────────────────────────────────────────────
const OrderStatusPage = () => {
  const navigate      = useNavigate()
  const location      = useLocation()
  const dispatch      = useDispatch()
  const { isDark: D } = useContext(ThemeContext)

  // ── Query param: ?id= means history detail view ───────────────────────────
  const historyId   = new URLSearchParams(location.search).get('id')
  const activeOrder = useSelector(selectActiveOrder)
  const allHistory  = useSelector(selectOrderHistory)
  const loading     = useSelector(selectOrderLoading)

  // Smart order resolution:
  //   ?id=xxx → find in history (read-only detail)
  //   no ?id  → show live active order
  const order = historyId
    ? (allHistory.find(o => o._id === historyId) ?? activeOrder)
    : activeOrder

  const isHistoryView = !!historyId

  // ── Data fetching ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (historyId) {
      // Need history to find the order by id
      if (allHistory.length === 0) dispatch(fetchOrderHistory({ page: 1, limit: 50 }))
    } else {
      // Live mode — fetch active order
      if (!activeOrder) dispatch(fetchActiveOrder())
      // NOTE: Live socket updates arrive via useSocket.js → socketOrderUpdated
      // → orderSlice → selectActiveOrder → this component re-renders automatically.
      // No local socket listeners here to avoid double-dispatch.
    }
  }, [historyId, activeOrder, allHistory.length, dispatch])

  const currentIdx  = STATUS_INDEX[order?.status ?? 'pending'] ?? 0
  const isCancelled = order?.status === 'cancelled'
  const isDone      = ['delivered', 'paid'].includes(order?.status)
  const activeStep  = STEPS[Math.max(0, Math.min(currentIdx, STEPS.length - 1))]

  // Back: history view → history page, live view → menu
  const handleBack = useCallback(() => {
    navigate(isHistoryView ? '/order/history' : '/menu')
  }, [navigate, isHistoryView])

  const particles = useMemo(
    () =>
      (order?.items ?? []).slice(0, 6).map((item, i) => ({
        emoji:       item.emoji ?? '🍽️',
        x:           10 + i * 16,
        delay:       i * 0.6,
        repeatDelay: Math.random() * 3 + 2,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [order?._id]
  )

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading && !order) {
    return (
      <div style={{
        minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: D ? '#0F0A06' : '#FAF6EE',
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
          style={{
            width: 38, height: 38, borderRadius: '50%',
            border: '3.5px solid transparent',
            borderTopColor: '#FF9F1C', borderRightColor: 'rgba(255,159,28,0.25)',
          }}
        />
      </div>
    )
  }

  // ── No order ──────────────────────────────────────────────────────────────
  if (!order) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          minHeight: '100svh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 28px',
          textAlign: 'center', background: D ? '#0F0A06' : '#FAF6EE',
          fontFamily: '"Baloo 2", system-ui, sans-serif',
        }}
      >
        <motion.span
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ fontSize: 60 }}
        >🍽️</motion.span>
        <p style={{ margin: 0, fontSize: 19, fontWeight: 800, color: D ? '#FFF8EE' : '#120D06' }}>
          {isHistoryView ? 'Order not found' : 'No active order'}
        </p>
        <p style={{ margin: 0, fontSize: 13, color: D ? 'rgba(255,248,238,0.42)' : 'rgba(92,51,23,0.5)', lineHeight: 1.6 }}>
          {isHistoryView
            ? 'This order could not be found in your history'
            : 'Place an order from the menu\nto track it here'}
        </p>
        <button onClick={handleBack} style={{
          marginTop: 8, padding: '13px 30px', borderRadius: 15,
          border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
          color: '#fff', background: 'linear-gradient(135deg,#FF9F1C,#E05C2A)',
          boxShadow: '0 6px 22px rgba(255,130,0,0.38)',
          fontFamily: '"Baloo 2", system-ui, sans-serif',
          WebkitTapHighlightColor: 'transparent',
        }}>
          {isHistoryView ? 'Back to History' : 'Browse Menu'}
        </button>
      </motion.div>
    )
  }

  return (
    <div style={{
      minHeight:     '100svh',
      background:    D ? '#0F0A06' : '#FAF6EE',
      fontFamily:    '"Baloo 2", system-ui, sans-serif',
      paddingTop:    'env(safe-area-inset-top, 0px)',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)',
      overflowX:     'hidden',
      position:      'relative',
    }}>

      {/* Ambient glow */}
      <motion.div
        animate={{ background: `radial-gradient(ellipse 80% 50% at 50% -5%, ${activeStep.glow.replace('0.45','0.18')} 0%, transparent 70%)` }}
        transition={{ duration: 1.2 }}
        style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}
      />

      {/* Celebration particles */}
      {isDone && particles.map((p, i) => <FloatParticle key={i} {...p} />)}

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 16px 10px' }}
        >
          <button
            onClick={handleBack}
            aria-label={isHistoryView ? 'Back to order history' : 'Back to menu'}
            style={{
              width: 40, height: 40, borderRadius: 14, flexShrink: 0,
              border: D ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(210,185,145,0.5)',
              background: D ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)',
              color: D ? 'rgba(255,248,238,0.55)' : 'rgba(92,51,23,0.55)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)', WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, lineHeight: 1.2, color: D ? '#FFF8EE' : '#120D06' }}>
              {isHistoryView ? 'Order Detail' : 'Order Status'}
            </h1>
            {order.tableNumber && (
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: D ? 'rgba(255,184,77,0.7)' : 'rgba(200,104,10,0.8)' }}>
                Table {order.tableNumber}
                {isHistoryView && (
                  <span style={{ marginLeft: 8, opacity: 0.6 }}>
                    · #{order._id?.slice(-6).toUpperCase()}
                  </span>
                )}
              </p>
            )}
          </div>
        </motion.div>

        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Cancelled card */}
          {isCancelled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: 'spring', stiffness: 260, damping: 22 }}
              style={{
                borderRadius: 28, padding: '36px 20px',
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center',
              }}
            >
              <motion.span
                animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                transition={{ duration: 0.7, delay: 0.3 }}
                style={{ fontSize: 56 }}
              >❌</motion.span>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: D ? '#FFF8EE' : '#120D06' }}>
                Order Cancelled
              </p>
              <p style={{ margin: 0, fontSize: 13, color: D ? 'rgba(255,248,238,0.45)' : 'rgba(92,51,23,0.5)' }}>
                Your order was cancelled. No charge applied.
              </p>
              <button onClick={handleBack} style={{
                marginTop: 8, padding: '13px 30px', borderRadius: 15,
                border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
                color: '#fff', background: 'linear-gradient(135deg,#FF9F1C,#E05C2A)',
                boxShadow: '0 6px 20px rgba(255,130,0,0.35)',
                fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
              }}>
                {isHistoryView ? 'Back to History' : 'Order Again'}
              </button>
            </motion.div>
          )}

          {!isCancelled && (
            <>
              {/* Hero card with ring */}
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.55, delay: 0.08, ease: [0.2, 0, 0, 1] }}
                style={{
                  borderRadius: 28, padding: '22px 20px',
                  background: D ? 'rgba(255,255,255,0.034)' : 'rgba(255,255,255,0.92)',
                  border: D ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(210,185,145,0.45)',
                  boxShadow: D
                    ? '0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.06)'
                    : '0 4px 28px rgba(130,80,20,0.1), inset 0 1px 0 rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(14px)',
                  display: 'flex', alignItems: 'center', gap: 18,
                  overflow: 'hidden', position: 'relative',
                }}
              >
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: `radial-gradient(ellipse 90% 90% at 5% 50%, ${activeStep.glow.replace('0.45','0.1')} 0%, transparent 70%)`,
                }}/>

                <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
                  <ProgressRing step={currentIdx + 1} total={STEPS.length} color={activeStep.color} />
                  <motion.div
                    animate={{ background: activeStep.color, boxShadow: `0 4px 18px ${activeStep.glow}` }}
                    transition={{ duration: 0.6 }}
                    style={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%,-50%)',
                      width: 50, height: 50, borderRadius: 17,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                    }}
                  >
                    <motion.div
                      animate={{ scale: isHistoryView ? 1 : [1, 1.18, 1] }}
                      transition={{ duration: 2.2, repeat: isHistoryView ? 0 : Infinity, ease: 'easeInOut' }}
                    >
                      {activeStep.svg}
                    </motion.div>
                  </motion.div>
                </div>

                <div style={{ flex: 1, position: 'relative' }}>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={activeStep.key + '-label'}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.35 }}
                      style={{ margin: 0, fontSize: 19, fontWeight: 900, lineHeight: 1.2, color: D ? '#FFF8EE' : '#120D06' }}
                    >
                      {activeStep.label}
                    </motion.p>
                  </AnimatePresence>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={activeStep.key + '-sub'}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.35, delay: 0.08 }}
                      style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 500, color: D ? 'rgba(255,248,238,0.43)' : 'rgba(92,51,23,0.5)' }}
                    >
                      {activeStep.sub}
                    </motion.p>
                  </AnimatePresence>

                  <AnimatePresence>
                    {isDone && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.75, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.75 }}
                        transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
                        style={{
                          marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '5px 10px', borderRadius: 20,
                          background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none"
                          stroke="#10B981" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981' }}>
                          {isHistoryView ? 'Order completed ✓' : 'Enjoy your meal! 🎉'}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Steps timeline */}
              <motion.div
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.18 }}
                style={{
                  borderRadius: 24, padding: '18px 16px 12px',
                  background: D ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.88)',
                  border: D ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(210,185,145,0.4)',
                  boxShadow: D ? 'none' : '0 2px 14px rgba(130,80,20,0.07)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <p style={{ margin: '0 0 14px', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: D ? 'rgba(255,248,238,0.28)' : 'rgba(92,51,23,0.32)' }}>
                  Progress
                </p>
                {STEPS.map((step, i) => (
                  <StepRow key={step.key} step={step} idx={i} currentIdx={currentIdx} isDark={D} delay={0.22 + i * 0.07} />
                ))}
              </motion.div>
            </>
          )}

          {/* Order items */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: isCancelled ? 0.15 : 0.32 }}
            style={{
              borderRadius: 24, padding: '18px 16px',
              background: D ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.88)',
              border: D ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(210,185,145,0.4)',
              boxShadow: D ? 'none' : '0 2px 14px rgba(130,80,20,0.07)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: D ? 'rgba(255,248,238,0.28)' : 'rgba(92,51,23,0.32)' }}>
              Your Order · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
            </p>

            {order.items.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (isCancelled ? 0.2 : 0.38) + i * 0.055, duration: 0.32 }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 0',
                  borderBottom: i < order.items.length - 1
                    ? `1px solid ${D ? 'rgba(255,255,255,0.05)' : 'rgba(92,51,23,0.07)'}` : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                    background: D ? 'rgba(255,159,28,0.1)' : 'rgba(255,240,210,0.8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
                  }}>
                    {item.emoji}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{
                      margin: 0, fontSize: 13, fontWeight: 700,
                      color: D ? '#FFF8EE' : '#120D06',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {item.name}
                      {item.portionLabel && (
                        <span style={{ fontWeight: 500, marginLeft: 4, fontSize: 11, color: D ? 'rgba(255,248,238,0.38)' : 'rgba(92,51,23,0.42)' }}>
                          ({item.portionLabel})
                        </span>
                      )}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 500, color: D ? 'rgba(255,248,238,0.32)' : 'rgba(92,51,23,0.38)' }}>
                      ×{item.quantity}
                    </p>
                  </div>
                </div>
                <p style={{
                  margin: 0, fontSize: 13, fontWeight: 800, flexShrink: 0, marginLeft: 8,
                  fontVariantNumeric: 'tabular-nums', color: D ? '#FFB84D' : '#C8680A',
                }}>
                  Rs{(item.price ?? 0) * (item.quantity ?? 1)}
                </p>
              </motion.div>
            ))}

            {/* Totals */}
            <div style={{
              marginTop: 14, paddingTop: 14,
              borderTop: `1px solid ${D ? 'rgba(255,255,255,0.07)' : 'rgba(210,185,145,0.45)'}`,
            }}>
              {(order.discountAmt ?? 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                  <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>
                    {order.loyaltyTier && order.loyaltyTier !== 'none'
                      ? `${order.loyaltyTier.charAt(0).toUpperCase() + order.loyaltyTier.slice(1)} Discount (${order.discountPct ?? 0}%)`
                      : 'Discount'}
                  </span>
                  <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    −Rs{order.discountAmt}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: D ? '#FFF8EE' : '#120D06' }}>Total</span>
                <span style={{ fontSize: 19, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: D ? '#FFB84D' : '#C8680A' }}>
                  Rs{order.total ?? 0}
                </span>
              </div>
            </div>

            {(order.pointsEarned ?? 0) > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                style={{
                  marginTop: 11, display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 12px', borderRadius: 14,
                  background: 'rgba(255,159,28,0.09)', border: '1px solid rgba(255,159,28,0.2)',
                }}
              >
                <motion.span
                  animate={{ scale: [1, 1.35, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.5 }}
                  style={{ fontSize: 14 }}
                >⚡</motion.span>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#FF9F1C' }}>
                  +{order.pointsEarned} loyalty points earned
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Special note */}
          {order.specialNote && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              style={{
                borderRadius: 18, padding: '13px 15px',
                background: D ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.75)',
                border: D ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(210,185,145,0.35)',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}
            >
              <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>📝</span>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: D ? 'rgba(255,248,238,0.28)' : 'rgba(92,51,23,0.32)' }}>
                  Note
                </p>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 500, lineHeight: 1.6, color: D ? 'rgba(255,248,238,0.58)' : 'rgba(92,51,23,0.62)' }}>
                  {order.specialNote}
                </p>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  )
}

export default OrderStatusPage