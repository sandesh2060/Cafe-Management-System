// src/modules/customer/pages/OrderStatusPage.jsx
// Route: /order/status
// Shows live order status — updates via Redux (socket events from useSocket)

import { useEffect, useContext, useRef, useCallback } from 'react'
import { useSelector, useDispatch }   from 'react-redux'
import { useNavigate }                from 'react-router-dom'
import { motion, AnimatePresence }    from 'motion/react'
import gsap                           from 'gsap'
import {
  ChevronLeft, Clock, CheckCircle2, ChefHat,
  Bike, Star, XCircle, Receipt, RefreshCw,
} from 'lucide-react'
import { ThemeContext }               from '@shared/context/ThemeContext'
import {
  selectActiveOrder,
  selectOrderLoading,
  selectOrderHistory,
  fetchActiveOrder,
  cancelOrder,
  selectOrderPlacing,
}                                     from '@store/slices/orderSlice'

// ── Status pipeline ───────────────────────────────────────────────────────────
const STEPS = [
  { key: 'pending',    label: 'Order Placed',  icon: Receipt,      color: '#FF9F1C' },
  { key: 'preparing',  label: 'Preparing',     icon: ChefHat,      color: '#F97316' },
  { key: 'on_the_way', label: 'On the Way',    icon: Bike,         color: '#8B5CF6' },
  { key: 'delivered',  label: 'Delivered',     icon: CheckCircle2, color: '#22c55e' },
]

const CANCELLED = { key: 'cancelled', label: 'Cancelled', icon: XCircle, color: '#ef4444' }

const stepIndex = (status) => STEPS.findIndex(s => s.key === status)

// ── Animated step node ────────────────────────────────────────────────────────
const StepNode = ({ step, status, index, D }) => {
  const current = stepIndex(status)
  const done    = index <= current
  const active  = index === current
  const Icon    = step.icon

  return (
    <div className="flex flex-col items-center gap-1.5 flex-1">
      <motion.div
        animate={{
          scale:     active ? [1, 1.12, 1] : 1,
          boxShadow: active ? `0 0 0 6px ${step.color}22` : '0 0 0 0px transparent',
        }}
        transition={{ duration: active ? 1.6 : 0.3, repeat: active ? Infinity : 0 }}
        className="w-11 h-11 rounded-2xl flex items-center justify-center relative"
        style={{
          background: done
            ? `linear-gradient(135deg, ${step.color}dd, ${step.color})`
            : (D ? 'rgba(255,255,255,0.06)' : 'rgba(92,51,23,0.06)'),
          border: `2px solid ${done ? step.color : (D ? 'rgba(255,255,255,0.1)' : 'rgba(92,51,23,0.12)')}`,
          transition: 'all 0.4s ease',
        }}
      >
        <Icon size={18} strokeWidth={done ? 2 : 1.5}
          color={done ? '#fff' : (D ? 'rgba(255,255,255,0.3)' : 'rgba(92,51,23,0.3)')} />
        {active && (
          <motion.div
            className="absolute inset-0 rounded-2xl"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{ background: `${step.color}33` }}
          />
        )}
      </motion.div>
      <span className="text-[10px] font-bold text-center leading-tight"
        style={{ color: done ? step.color : (D ? 'rgba(255,255,255,0.3)' : 'rgba(92,51,23,0.3)') }}>
        {step.label}
      </span>
    </div>
  )
}

// ── Progress connector ────────────────────────────────────────────────────────
const Connector = ({ filled, color, D }) => (
  <div className="flex-1 h-0.5 mt-[-18px] relative">
    <div className="absolute inset-0 rounded-full"
      style={{ background: D ? 'rgba(255,255,255,0.08)' : 'rgba(92,51,23,0.1)' }} />
    <motion.div
      className="absolute inset-y-0 left-0 rounded-full"
      animate={{ width: filled ? '100%' : '0%' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{ background: color }} />
  </div>
)

// ── Order item row ────────────────────────────────────────────────────────────
const OrderItem = ({ item, D }) => (
  <div className="flex items-center justify-between gap-2 py-2"
    style={{ borderBottom: `1px solid ${D ? 'rgba(255,255,255,0.05)' : 'rgba(92,51,23,0.07)'}` }}>
    <div className="flex items-center gap-2.5">
      <span className="text-xl">{item.emoji}</span>
      <div>
        <p className="m-0 text-[13px] font-bold leading-snug"
          style={{ color: D ? '#FFF8EE' : '#120D06' }}>
          {item.name}
          {item.portionLabel && (
            <span className="ml-1.5 text-[10px] font-semibold"
              style={{ color: D ? 'rgba(255,184,77,0.5)' : 'rgba(92,51,23,0.45)' }}>
              ({item.portionLabel})
            </span>
          )}
        </p>
        <p className="m-0 text-[10px]" style={{ color: D ? 'rgba(196,154,108,0.6)' : 'rgba(139,94,60,0.5)' }}>
          ×{item.quantity}
        </p>
      </div>
    </div>
    <span className="text-[13px] font-extrabold font-mono flex-shrink-0"
      style={{ color: D ? '#FFB84D' : '#C8680A' }}>
      ₹{item.price * item.quantity}
    </span>
  </div>
)

// ════════════════════════════════════════════════════════════════════════════
const OrderStatusPage = () => {
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const { isDark: D } = useContext(ThemeContext)

  const order   = useSelector(selectActiveOrder)
  const loading = useSelector(selectOrderLoading)
  const history = useSelector(selectOrderHistory)

  // Fetch on mount in case of hard refresh
  useEffect(() => { dispatch(fetchActiveOrder()) }, [dispatch])

  // If no active order but history exists, show latest completed
  const displayOrder = order ?? history[0] ?? null

  const status    = displayOrder?.status ?? 'pending'
  const isCancelled = status === 'cancelled'
  const isDone    = status === 'delivered' || status === 'paid'
  const canCancel = status === 'pending'

  // Theme
  const bg      = D ? '#0F0A06' : '#FFF8EE'
  const surface = D ? '#1A1208' : '#FFFFFF'
  const border  = D ? 'rgba(255,159,28,0.12)' : '#F0D9B5'
  const text    = D ? '#FFF8EE' : '#5C3317'
  const muted   = D ? '#C49A6C' : '#8B5E3C'

  const currentStep = isCancelled ? CANCELLED : (STEPS[stepIndex(status)] ?? STEPS[0])
  const currentIndex = stepIndex(status)

  const handleCancel = useCallback(async () => {
    if (!displayOrder?._id || !canCancel) return
    await dispatch(cancelOrder(displayOrder._id))
  }, [dispatch, displayOrder, canCancel])

  const handleRefresh = useCallback(() => { dispatch(fetchActiveOrder()) }, [dispatch])

  if (loading && !displayOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 rounded-full border-2 border-t-transparent"
          style={{ borderColor: '#FF9F1C', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  if (!displayOrder) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6" style={{ background: bg }}>
        <motion.span
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{ fontSize: 56 }}>🍽️</motion.span>
        <p className="m-0 text-[17px] font-extrabold text-center" style={{ color: text }}>No active order</p>
        <p className="m-0 text-[13px] text-center" style={{ color: muted }}>Place an order from the menu to track it here.</p>
        <button onClick={() => navigate('/menu')}
          className="mt-2 px-6 py-3 rounded-2xl border-none cursor-pointer text-[14px] font-extrabold text-white"
          style={{ background: 'linear-gradient(135deg,#FF9F1C,#E05C2A)', boxShadow: '0 4px 18px rgba(255,130,0,0.4)' }}>
          Browse Menu
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: bg, fontFamily: '"DM Sans", system-ui, sans-serif' }}>
      {/* ── Nav ── */}
      <div className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top,0px)+14px)] pb-3"
        style={{ background: D ? 'rgba(10,5,1,0.85)' : 'rgba(255,251,243,0.9)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', borderBottom: `1px solid ${border}`, position: 'sticky', top: 0, zIndex: 40 }}>
        <button onClick={() => navigate('/menu')}
          className="flex items-center gap-1.5 border-none bg-transparent cursor-pointer px-0 py-0"
          style={{ color: muted, WebkitTapHighlightColor: 'transparent' }}>
          <ChevronLeft size={18} strokeWidth={2} />
          <span className="text-[13px] font-semibold">Menu</span>
        </button>
        <h1 className="m-0 text-[16px] font-extrabold" style={{ color: text }}>Order Status</h1>
        <button onClick={handleRefresh}
          className="w-8 h-8 rounded-xl flex items-center justify-center border-none cursor-pointer"
          style={{ background: D ? 'rgba(255,255,255,0.06)' : '#FFF0D6', border: `1px solid ${border}`, color: muted, WebkitTapHighlightColor: 'transparent' }}>
          <RefreshCw size={13} strokeWidth={2} />
        </button>
      </div>

      <div className="px-5 pb-10 space-y-5" style={{ paddingTop: 20 }}>

        {/* ── Status hero ── */}
        <motion.div
          layout
          className="rounded-3xl p-5 text-center"
          style={{
            background: isCancelled
              ? (D ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)')
              : (D ? `rgba(${currentStep.color.replace('#','').match(/.{2}/g)?.map(h=>parseInt(h,16)).join(',')},0.08)` : 'rgba(255,243,220,0.9)'),
            border: `1px solid ${isCancelled ? 'rgba(239,68,68,0.25)' : border}`,
            boxShadow: D ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 16px rgba(92,51,23,0.08)',
          }}
        >
          <motion.div
            key={status}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1,   opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-3"
            style={{ background: `linear-gradient(135deg, ${currentStep.color}bb, ${currentStep.color})`, boxShadow: `0 8px 24px ${currentStep.color}44` }}
          >
            <currentStep.icon size={28} color="#fff" strokeWidth={2} />
          </motion.div>

          <motion.p
            key={`label-${status}`}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="m-0 text-[20px] font-black tracking-tight"
            style={{ color: currentStep.color }}>
            {currentStep.label}
          </motion.p>

          <p className="m-0 text-[12px] mt-1" style={{ color: muted }}>
            Order #{displayOrder._id?.slice(-6).toUpperCase()}
          </p>

          {!isCancelled && !isDone && (
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <Clock size={12} strokeWidth={2} style={{ color: muted }} />
              <span className="text-[11px]" style={{ color: muted }}>
                {status === 'pending' ? 'Waiting for kitchen…' : status === 'preparing' ? 'Cooking your order…' : 'Heading to your table…'}
              </span>
            </div>
          )}

          {isDone && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.2 }}
              className="mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-full mx-auto"
              style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', display: 'inline-flex' }}>
              <Star size={13} fill="#22c55e" stroke="#22c55e" />
              <span className="text-[12px] font-bold" style={{ color: '#22c55e' }}>Enjoy your meal!</span>
            </motion.div>
          )}
        </motion.div>

        {/* ── Progress steps ── */}
        {!isCancelled && (
          <div className="rounded-3xl p-5"
            style={{ background: surface, border: `1px solid ${border}`, boxShadow: D ? '0 2px 16px rgba(0,0,0,0.3)' : '0 2px 8px rgba(92,51,23,0.06)' }}>
            <p className="m-0 text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: muted }}>Progress</p>
            <div className="flex items-start gap-1">
              {STEPS.map((step, i) => (
                <div key={step.key} className="flex items-start" style={{ flex: 1 }}>
                  <StepNode step={step} status={status} index={i} D={D} />
                  {i < STEPS.length - 1 && (
                    <Connector
                      filled={i < currentIndex}
                      color={STEPS[i].color}
                      D={D}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Order summary ── */}
        <div className="rounded-3xl p-5"
          style={{ background: surface, border: `1px solid ${border}`, boxShadow: D ? '0 2px 16px rgba(0,0,0,0.3)' : '0 2px 8px rgba(92,51,23,0.06)' }}>
          <p className="m-0 text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: muted }}>Your Items</p>
          {(displayOrder.items ?? []).map((item, i) => (
            <OrderItem key={i} item={item} D={D} />
          ))}
          <div className="mt-3 pt-2 space-y-1.5" style={{ borderTop: `1px solid ${border}` }}>
            <div className="flex justify-between text-[12px]" style={{ color: muted }}>
              <span>Subtotal</span><span className="font-mono font-bold">₹{displayOrder.subtotal}</span>
            </div>
            {displayOrder.discountAmt > 0 && (
              <div className="flex justify-between text-[12px]">
                <span style={{ color: '#22c55e' }}>Discount</span>
                <span className="font-mono font-bold" style={{ color: '#22c55e' }}>−₹{displayOrder.discountAmt}</span>
              </div>
            )}
            <div className="flex justify-between text-[15px] font-extrabold"
              style={{ color: text }}>
              <span>Total</span>
              <span className="font-mono" style={{ color: D ? '#FFB84D' : '#C8680A' }}>₹{displayOrder.total}</span>
            </div>
            {displayOrder.pointsEarned > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: '#F59E0B' }}>
                <Star size={11} fill="#F59E0B" stroke="#F59E0B" />
                +{displayOrder.pointsEarned} loyalty points earned
              </div>
            )}
          </div>
        </div>

        {/* ── Cancel button ── */}
        <AnimatePresence>
          {canCancel && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1,  y: 0  }}
              exit={{   opacity: 0,  y: -10 }}
              onClick={handleCancel}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl border-none cursor-pointer text-[13px] font-bold flex items-center justify-center gap-2"
              style={{
                background: D ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)',
                border:     '1px solid rgba(239,68,68,0.25)',
                color:      '#ef4444',
                fontFamily: '"DM Sans", system-ui, sans-serif',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <XCircle size={15} strokeWidth={2} />
              Cancel Order
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default OrderStatusPage