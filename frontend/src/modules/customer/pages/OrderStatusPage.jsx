// src/modules/customer/pages/OrderStatusPage.jsx
//
// ─── MODULE 21 CHANGES ────────────────────────────────────────────────────────
// ★ FeedbackSheet wired in:
//   - Shown when order status is 'delivered' or 'paid' AND feedback not yet submitted
//   - Auto-prompts 2s after the delivered/paid state is detected
//   - Manual trigger: "Rate your order" button below order items
//   - Checks GET /feedback/order/:orderId on mount to skip if already submitted
//   - Dismissed feedback is tracked in component state (no re-prompt same session)
//
// ALL other logic, animations, ProgressRing, StepRow, FloatParticle — IDENTICAL
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useCallback, useContext, useMemo, useState, useRef } from 'react'
import { useNavigate, useLocation }  from 'react-router-dom'
import { useSelector, useDispatch }  from 'react-redux'
import { motion, AnimatePresence }   from 'motion/react'
import { ThemeContext }              from '@shared/context/ThemeContext'
import { BRAND, getPalette }         from '@shared/config/brand'
import {
  selectActiveOrder, selectOrderHistory, selectOrderLoading,
  fetchActiveOrder, fetchOrderHistory,
} from '@store/slices/orderSlice'
import { selectUser }                from '@store/slices/authSlice'
import api                           from '@api/axios'
// ★ NEW
import FeedbackSheet from '../components/feedback/FeedbackSheet'

// ── Status pipeline ───────────────────────────────────────────────────────────
const STEPS = [
  {
    key:'pending', label:'Order Placed', sub:'We received your order',
    color:'#F59E0B', glow:'rgba(245,158,11,0.45)',
    svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  },
  {
    key:'preparing', label:'Kitchen Cooking', sub:'Your food is being prepared',
    color:'#3B82F6', glow:'rgba(59,130,246,0.45)',
    svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M12 2a7 7 0 017 7c0 4-3 6-3 9H8c0-3-3-5-3-9a7 7 0 017-7z"/><path d="M8 18h8M8 21h8"/></svg>,
  },
  {
    key:'on_the_way', label:'On the Way', sub:'Waiter is heading to your table',
    color:'#F97316', glow:'rgba(249,115,22,0.45)',
    svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><circle cx="12" cy="8" r="3"/><path d="M6.5 19a5.5 5.5 0 0111 0"/><path d="M3 11l4 2M17 13l4-2"/></svg>,
  },
  {
    key:'delivered', label:'Delivered', sub:'Enjoy your meal!',
    color:'#10B981', glow:'rgba(16,185,129,0.45)',
    svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>,
  },
]
const STATUS_INDEX = { pending:0, preparing:1, on_the_way:2, delivered:3, paid:3, cancelled:-1 }

// ── SVG ring progress ─────────────────────────────────────────────────────────
const ProgressRing = ({ step, total, color }) => {
  const R = 38, C = 2*Math.PI*R, pct = (step/total)*C
  return (
    <svg width="96" height="96" viewBox="0 0 96 96"
      style={{ transform:'rotate(-90deg)', position:'absolute', inset:0 }}>
      <circle cx="48" cy="48" r={R} fill="none" stroke="var(--divider)" strokeWidth="5"/>
      <motion.circle cx="48" cy="48" r={R} fill="none"
        stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={C}
        initial={{ strokeDashoffset:C }}
        animate={{ strokeDashoffset:C-pct }}
        transition={{ duration:1.3, ease:[0.4,0,0.2,1] }}
        style={{ filter:`drop-shadow(0 0 5px ${color})` }}/>
    </svg>
  )
}

// ── Floating particle ─────────────────────────────────────────────────────────
const FloatParticle = ({ emoji, x, delay, repeatDelay }) => (
  <motion.div
    className="fixed bottom-[-5%] text-[20px] pointer-events-none select-none z-0"
    style={{ left:`${x}%` }}
    initial={{ y:0, opacity:0, scale:0.6 }}
    animate={{ y:-380, opacity:[0,0.9,0.9,0], scale:[0.6,1.1,0.9] }}
    transition={{ duration:5, delay, ease:'easeOut', repeat:Infinity, repeatDelay }}>
    {emoji}
  </motion.div>
)

// ── Step row ──────────────────────────────────────────────────────────────────
const StepRow = ({ step, idx, currentIdx, delay }) => {
  const done   = idx < currentIdx
  const active = idx === currentIdx
  const dim    = idx > currentIdx
  const isLast = idx === STEPS.length-1

  return (
    <motion.div
      initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }}
      transition={{ delay, duration:0.45, ease:[0.2,0,0,1] }}
      className="flex items-start gap-3.5">
      <div className="flex flex-col items-center flex-shrink-0 w-11">
        <motion.div
          animate={{ background:dim?'var(--pill-bg)':step.color, boxShadow:active?`0 0 18px ${step.glow}`:'none', scale:active?[1,1.1,1]:1 }}
          transition={{ scale:{ duration:1.8, repeat:active?Infinity:0, ease:'easeInOut' }, background:{ duration:0.4 } }}
          className="w-11 h-11 rounded-2xl flex items-center justify-center relative flex-shrink-0">
          {active && (
            <motion.div className="absolute border-2 rounded-[20px]"
              style={{ inset:-5, borderColor:step.color }}
              animate={{ opacity:[0.5,0], scale:[1,1.45] }}
              transition={{ duration:1.5, repeat:Infinity, ease:'easeOut' }}/>
          )}
          <motion.span animate={{ color:dim?'var(--text-disabled)':'#fff' }} transition={{ duration:0.3 }}>
            {step.svg}
          </motion.span>
          <AnimatePresence>
            {done && (
              <motion.div
                initial={{ scale:0, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0, opacity:0 }}
                className="absolute -bottom-[5px] -right-[5px] w-[17px] h-[17px] rounded-full bg-green-500 flex items-center justify-center"
                style={{ border:'2.5px solid var(--bg)' }}>
                <svg viewBox="0 0 10 10" width="9" height="9" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M2 5l2.5 2.5L8 2.5"/>
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        {!isLast && (
          <div className="w-0.5 rounded-sm overflow-hidden my-0.5 h-8" style={{ background:'var(--divider)' }}>
            <motion.div className="w-full rounded-sm"
              style={{ background:`linear-gradient(${step.color},${STEPS[idx+1].color})` }}
              initial={{ height:'0%' }} animate={{ height:done?'100%':'0%' }}
              transition={{ duration:0.7, delay:delay+0.2, ease:[0.4,0,0.2,1] }}/>
          </div>
        )}
      </div>
      <div className={`pt-2 ${isLast?'':'pb-4'}`}>
        <motion.p className="m-0 text-[14px] font-bold leading-[1.2]"
          animate={{ color:active?step.color:done?'var(--text-primary)':'var(--text-disabled)' }}
          transition={{ duration:0.4 }}>
          {step.label}
        </motion.p>
        <motion.p className="m-0 mt-0.5 text-[11px] font-medium"
          animate={{ color:active||done?'var(--text-muted)':'var(--text-disabled)' }}
          transition={{ duration:0.4 }}>
          {step.sub}
        </motion.p>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function OrderStatusPage() {
  const navigate      = useNavigate()
  const location      = useLocation()
  const dispatch      = useDispatch()
  const { isDark: D } = useContext(ThemeContext)
  const user          = useSelector(selectUser)

  const historyId   = new URLSearchParams(location.search).get('id')
  const activeOrder = useSelector(selectActiveOrder)
  const allHistory  = useSelector(selectOrderHistory)
  const loading     = useSelector(selectOrderLoading)

  const order         = historyId ? (allHistory.find(o=>o._id===historyId) ?? activeOrder) : activeOrder
  const isHistoryView = !!historyId

  // ★ Feedback state
  const [feedbackOpen,      setFeedbackOpen]      = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [feedbackChecked,   setFeedbackChecked]   = useState(false)
  const autoPromptRef = useRef(null)

  useEffect(() => {
    if (historyId) { if (allHistory.length===0) dispatch(fetchOrderHistory({ page:1, limit:50 })) }
    else { if (!activeOrder) dispatch(fetchActiveOrder()) }
  }, [historyId, activeOrder, allHistory.length, dispatch])

  const currentIdx  = STATUS_INDEX[order?.status ?? 'pending'] ?? 0
  const isCancelled = order?.status === 'cancelled'
  const isDone      = ['delivered','paid'].includes(order?.status)
  const activeStep  = STEPS[Math.max(0, Math.min(currentIdx, STEPS.length-1))]

  // ★ Check if feedback already submitted for this order
  useEffect(() => {
    if (!isDone || !order?._id || feedbackChecked || isHistoryView) return
    setFeedbackChecked(true)
    api.get(`/feedback/order/${order._id}`)
      .then(r => {
        const already = !!(r.feedback ?? r.data?.feedback)
        setFeedbackSubmitted(already)
        // Auto-prompt after 2s if not submitted yet
        if (!already) {
          autoPromptRef.current = setTimeout(() => setFeedbackOpen(true), 2000)
        }
      })
      .catch(() => {
        // If endpoint fails, still show prompt after 3s
        autoPromptRef.current = setTimeout(() => setFeedbackOpen(true), 3000)
      })
    return () => clearTimeout(autoPromptRef.current)
  }, [isDone, order?._id, feedbackChecked, isHistoryView])

  const handleBack = useCallback(() => {
    if (isHistoryView) navigate('/order/history')
    else navigate('/menu')
  }, [navigate, isHistoryView])

  const particles = useMemo(() =>
    (order?.items??[]).slice(0,6).map((item,i) => ({
      emoji:item.emoji??'🍽️', x:10+i*16, delay:i*0.6, repeatDelay:Math.random()*3+2,
    })), [order?._id]) // eslint-disable-line

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading && !order) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'var(--bg)' }}>
      <motion.div animate={{ rotate:360 }} transition={{ duration:0.9, repeat:Infinity, ease:'linear' }}
        className="w-[38px] h-[38px] rounded-full"
        style={{ border:'3.5px solid transparent', borderTopColor:'var(--accent)', borderRightColor:'var(--accent-dim)' }}/>
    </div>
  )

  // ── No order ──────────────────────────────────────────────────────────────
  if (!order) return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
      className="min-h-screen flex flex-col items-center justify-center gap-4 px-7 text-center"
      style={{ background:'var(--bg)' }}>
      <motion.span animate={{ y:[0,-10,0] }} transition={{ duration:3.5, repeat:Infinity, ease:'easeInOut' }} className="text-[60px]">🍽️</motion.span>
      <p className="m-0 text-[19px] font-extrabold" style={{ color:'var(--text-primary)' }}>
        {isHistoryView ? 'Order not found' : 'No active order'}
      </p>
      <p className="m-0 text-[13px] leading-[1.6]" style={{ color:'var(--text-muted)' }}>
        {isHistoryView ? 'This order could not be found in your history' : `Place an order from the menu to track it here`}
      </p>
      <button onClick={handleBack}
        className="mt-2 px-[30px] py-[13px] rounded-[15px] border-none cursor-pointer text-[14px] font-bold text-white"
        style={{ background:'var(--accent-gradient)', boxShadow:'0 6px 22px var(--accent-glow)', WebkitTapHighlightColor:'transparent' }}>
        {isHistoryView ? 'Back to History' : 'Browse Menu'}
      </button>
    </motion.div>
  )

  return (
    <div className="min-h-screen overflow-x-hidden relative"
      style={{ background:'var(--bg)', paddingTop:'env(safe-area-inset-top,0px)', paddingBottom:'calc(env(safe-area-inset-bottom,0px)+32px)' }}>

      {/* Ambient glow */}
      <motion.div
        animate={{ background:`radial-gradient(ellipse 80% 50% at 50% -5%,${activeStep.glow.replace('0.45','0.18')} 0%,transparent 70%)` }}
        transition={{ duration:1.2 }}
        className="fixed inset-0 pointer-events-none z-0"/>

      {isDone && particles.map((p,i) => <FloatParticle key={i} {...p}/>)}

      <div className="relative z-[1]">

        {/* Header */}
        <motion.div initial={{ opacity:0, y:-14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.45 }}
          className="flex items-center gap-3 px-4 pt-5 pb-2.5">
          <button onClick={handleBack}
            className="w-10 h-10 rounded-[14px] flex-shrink-0 flex items-center justify-center cursor-pointer"
            style={{ border:'1px solid var(--card-border)', background:'var(--pill-bg)', color:'var(--text-secondary)', backdropFilter:'blur(8px)', WebkitTapHighlightColor:'transparent' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div>
            <h1 className="m-0 text-[18px] font-extrabold leading-[1.2]" style={{ color:'var(--text-primary)' }}>
              {isHistoryView ? 'Order Detail' : 'Order Status'}
            </h1>
            {order.tableNumber && (
              <p className="m-0 text-[11px] font-semibold" style={{ color:'var(--accent)' }}>
                Table {order.tableNumber}
                {isHistoryView && <span className="ml-2" style={{ color:'var(--text-muted)' }}>· #{order._id?.slice(-6).toUpperCase()}</span>}
              </p>
            )}
          </div>
        </motion.div>

        <div className="px-4 flex flex-col gap-3.5">

          {/* Cancelled */}
          {isCancelled && (
            <motion.div initial={{ opacity:0, scale:0.92 }} animate={{ opacity:1, scale:1 }}
              transition={{ duration:0.5, type:'spring', stiffness:260, damping:22 }}
              className="rounded-[28px] p-9 flex flex-col items-center gap-3 text-center"
              style={{ background:'var(--danger-bg)', border:'1px solid var(--danger-border)' }}>
              <motion.span animate={{ rotate:[0,-10,10,-5,5,0] }} transition={{ duration:0.7, delay:0.3 }} className="text-[56px]">❌</motion.span>
              <p className="m-0 text-[20px] font-extrabold" style={{ color:'var(--text-primary)' }}>Order Cancelled</p>
              <p className="m-0 text-[13px]" style={{ color:'var(--text-muted)' }}>Your order was cancelled. No charge applied.</p>
              <button onClick={handleBack}
                className="mt-2 px-[30px] py-[13px] rounded-[15px] border-none cursor-pointer text-[14px] font-bold text-white"
                style={{ background:'var(--accent-gradient)', boxShadow:'0 6px 20px var(--accent-glow)', WebkitTapHighlightColor:'transparent' }}>
                {isHistoryView ? 'Back to History' : 'Order Again'}
              </button>
            </motion.div>
          )}

          {!isCancelled && (
            <>
              {/* Hero card */}
              <motion.div initial={{ opacity:0, y:18, scale:0.97 }} animate={{ opacity:1, y:0, scale:1 }}
                transition={{ duration:0.55, delay:0.08, ease:[0.2,0,0,1] }}
                className="rounded-[28px] p-[22px_20px] flex items-center gap-[18px] overflow-hidden relative"
                style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)', boxShadow:'var(--card-shadow)', backdropFilter:'blur(14px)' }}>
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background:`radial-gradient(ellipse 90% 90% at 5% 50%,${activeStep.glow.replace('0.45','0.1')} 0%,transparent 70%)` }}/>
                <div className="relative w-24 h-24 flex-shrink-0">
                  <ProgressRing step={currentIdx+1} total={STEPS.length} color={activeStep.color}/>
                  <motion.div
                    animate={{ background:activeStep.color, boxShadow:`0 4px 18px ${activeStep.glow}` }}
                    transition={{ duration:0.6 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50px] h-[50px] rounded-[17px] flex items-center justify-center text-white">
                    <motion.div animate={{ scale:isHistoryView?1:[1,1.18,1] }} transition={{ duration:2.2, repeat:isHistoryView?0:Infinity, ease:'easeInOut' }}>
                      {activeStep.svg}
                    </motion.div>
                  </motion.div>
                </div>
                <div className="flex-1 relative">
                  <AnimatePresence mode="wait">
                    <motion.p key={activeStep.key+'-label'} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} transition={{ duration:0.35 }}
                      className="m-0 text-[19px] font-black leading-[1.2]" style={{ color:'var(--text-primary)' }}>
                      {activeStep.label}
                    </motion.p>
                  </AnimatePresence>
                  <AnimatePresence mode="wait">
                    <motion.p key={activeStep.key+'-sub'} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }} transition={{ duration:0.35, delay:0.08 }}
                      className="m-0 mt-1 text-[12px] font-medium" style={{ color:'var(--text-muted)' }}>
                      {activeStep.sub}
                    </motion.p>
                  </AnimatePresence>
                  <AnimatePresence>
                    {isDone && (
                      <motion.div initial={{ opacity:0, scale:0.75, y:6 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.75 }}
                        transition={{ delay:0.4, type:'spring', stiffness:300 }}
                        className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-[20px]"
                        style={{ background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.3)' }}>
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                        <span className="text-[11px] font-bold" style={{ color:'#10B981' }}>
                          {isHistoryView ? 'Order completed ✓' : 'Enjoy your meal! 🎉'}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Steps timeline */}
              <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5, delay:0.18 }}
                className="rounded-[24px] pt-[18px] px-4 pb-3"
                style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)', boxShadow:'var(--card-shadow)', backdropFilter:'blur(10px)' }}>
                <p className="m-0 mb-3.5 text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color:'var(--text-muted)' }}>Progress</p>
                {STEPS.map((step,i) => <StepRow key={step.key} step={step} idx={i} currentIdx={currentIdx} delay={0.22+i*0.07}/>)}
              </motion.div>
            </>
          )}

          {/* Order items */}
          <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
            transition={{ duration:0.5, delay:isCancelled?0.15:0.32 }}
            className="rounded-[24px] p-[18px_16px]"
            style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)', boxShadow:'var(--card-shadow)', backdropFilter:'blur(10px)' }}>
            <p className="m-0 mb-3 text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color:'var(--text-muted)' }}>
              Your Order · {order.items.length} item{order.items.length!==1?'s':''}
            </p>
            {order.items.map((item,i) => (
              <motion.div key={i}
                initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
                transition={{ delay:(isCancelled?0.2:0.38)+i*0.055, duration:0.32 }}
                className="flex items-center justify-between py-[9px]"
                style={{ borderBottom:i<order.items.length-1?'1px solid var(--divider)':'none' }}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-[17px]"
                    style={{ background:'var(--accent-dim)' }}>
                    {item.emoji}
                  </div>
                  <div className="min-w-0">
                    <p className="m-0 text-[13px] font-bold truncate" style={{ color:'var(--text-primary)' }}>
                      {item.name}
                      {item.portionLabel && <span className="font-medium ml-1 text-[11px]" style={{ color:'var(--text-muted)' }}>({item.portionLabel})</span>}
                    </p>
                    <p className="m-0 mt-0.5 text-[11px] font-medium" style={{ color:'var(--text-muted)' }}>×{item.quantity}</p>
                  </div>
                </div>
                <p className="m-0 text-[13px] font-extrabold flex-shrink-0 ml-2" style={{ fontVariantNumeric:'tabular-nums', color:'var(--accent)' }}>
                  {BRAND.currency}{(item.price??0)*(item.quantity??1)}
                </p>
              </motion.div>
            ))}

            {/* Totals */}
            <div className="mt-3.5 pt-3.5" style={{ borderTop:'1px solid var(--divider-strong)' }}>
              {(order.discountAmt??0) > 0 && (
                <div className="flex justify-between mb-[7px]">
                  <span className="text-[12px] font-semibold" style={{ color:'var(--success)' }}>
                    {order.loyaltyTier && order.loyaltyTier!=='none'
                      ? `${order.loyaltyTier.charAt(0).toUpperCase()+order.loyaltyTier.slice(1)} Discount (${order.discountPct??0}%)`
                      : 'Discount'}
                  </span>
                  <span className="text-[12px] font-bold" style={{ color:'var(--success)', fontVariantNumeric:'tabular-nums' }}>
                    −{BRAND.currency}{order.discountAmt}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-baseline">
                <span className="text-[15px] font-extrabold" style={{ color:'var(--text-primary)' }}>Total</span>
                <span className="text-[19px] font-black" style={{ fontVariantNumeric:'tabular-nums', color:'var(--accent)' }}>
                  {BRAND.currency}{order.total??0}
                </span>
              </div>
            </div>

            {(order.pointsEarned??0) > 0 && (
              <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.65 }}
                className="mt-[11px] flex items-center gap-2 px-3 py-[9px] rounded-[14px]"
                style={{ background:'var(--loyalty-bg)', border:'1px solid var(--loyalty-border)' }}>
                <motion.span animate={{ scale:[1,1.35,1] }} transition={{ duration:1.6, repeat:Infinity, repeatDelay:2.5 }} className="text-[14px]">⚡</motion.span>
                <p className="m-0 text-[12px] font-bold" style={{ color:'var(--loyalty-text)' }}>
                  +{order.pointsEarned} loyalty points earned
                </p>
              </motion.div>
            )}

            {/* ★ Feedback button — shown when delivered/paid + not yet submitted */}
            {isDone && !isHistoryView && !feedbackSubmitted && (
              <motion.div
                initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                transition={{ delay:0.8, duration:0.4 }}
                className="mt-3">
                <button
                  onClick={() => setFeedbackOpen(true)}
                  className="w-full py-[12px] rounded-[14px] border-none cursor-pointer text-[13px] font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    color: '#fff',
                    boxShadow: '0 4px 16px rgba(245,158,11,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    WebkitTapHighlightColor: 'transparent',
                  }}>
                  ⭐ Rate your order
                </button>
              </motion.div>
            )}

            {/* Already submitted */}
            {isDone && !isHistoryView && feedbackSubmitted && (
              <motion.div
                initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.8 }}
                className="mt-3 flex items-center justify-center gap-2 py-2"
                style={{ color:'var(--text-muted)', fontSize:12 }}>
                ✅ Feedback submitted — thank you!
              </motion.div>
            )}
          </motion.div>

          {/* Special note */}
          {order.specialNote && (
            <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5 }}
              className="rounded-[18px] p-[13px_15px] flex gap-2.5 items-start"
              style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)' }}>
              <span className="text-[15px] flex-shrink-0 mt-px">📝</span>
              <div>
                <p className="m-0 mb-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em]" style={{ color:'var(--text-muted)' }}>Note</p>
                <p className="m-0 text-[12px] font-medium leading-[1.6]" style={{ color:'var(--text-secondary)' }}>{order.specialNote}</p>
              </div>
            </motion.div>
          )}

        </div>
      </div>

      {/* ★ FeedbackSheet */}
      <FeedbackSheet
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        order={order}
        onSuccess={() => {
          setFeedbackSubmitted(true)
          setFeedbackOpen(false)
        }}
      />
    </div>
  )
}