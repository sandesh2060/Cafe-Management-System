// src/modules/customer/pages/ReviewsPage.jsx
// v2 — Full Tailwind CSS + CSS vars, navigate(-1) fixed
// ✅ Removed local cssVars block entirely — brand.js ThemeContext handles all tokens
// ✅ BRAND.locale, BRAND.emoji replace hardcoded strings
// ✅ navigate(-1) — no window.history.state guard
// ✅ All logic, modals, animations, GSAP, infinite scroll unchanged

import {
  useEffect, useRef, useState, useCallback,
  useContext, useMemo, memo,
} from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate }              from 'react-router-dom'
import gsap                         from 'gsap'
import { ScrollTrigger }            from 'gsap/ScrollTrigger'
import { ThemeContext }             from '@shared/context/ThemeContext'
import { BRAND }                    from '@shared/config/brand'
import { selectUser, selectIsGuest } from '@store/slices/authSlice'
import {
  fetchReviews, fetchMyReview, submitReview, editReview, removeReview,
  likeReview, optimisticLike, clearSubmitError,
  selectReviewsForItem, selectReviewSummary, selectReviewPagination,
  selectReviewsLoading, selectReviewsHasMore, selectMyReview,
  selectSubmitting, selectSubmitError,
} from '@store/slices/reviewSlice'

gsap.registerPlugin(ScrollTrigger)

const CAFE_CONTEXT_ID = 'cafe_global'
const MAX_CHARS = 500
const MIN_CHARS = 10

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = n => new Intl.NumberFormat(BRAND.locale).format(n ?? 0)
const timeAgo = d => {
  const s = (Date.now() - new Date(d)) / 1000
  if (s < 60)      return 'just now'
  if (s < 3600)    return `${Math.floor(s/60)}m ago`
  if (s < 86400)   return `${Math.floor(s/3600)}h ago`
  if (s < 2592000) return `${Math.floor(s/86400)}d ago`
  return new Date(d).toLocaleDateString(BRAND.locale, { day:'numeric', month:'short', year:'numeric' })
}
const initials    = (n='') => n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || '?'
const ACOLORS     = ['#F97316','#EAB308','#22C55E','#06B6D4','#8B5CF6','#EC4899','#14B8A6','#F43F5E']
const avatarColor = (n='') => { let h=0; for (let i=0;i<n.length;i++) h=(h*31+n.charCodeAt(i))>>>0; return ACOLORS[h%ACOLORS.length] }

// ── SVG icons ─────────────────────────────────────────────────────────────────
const StarFill  = ({ size=13, color='#F59E0B' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{flexShrink:0}}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
const StarEmpty = ({ size=13, color='currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" style={{flexShrink:0}}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
const BackIco   = ({ size=14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><polyline points="15 18 9 12 15 6"/></svg>
const WriteIco  = ({ size=12 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
const EditIco   = ({ size=12 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const TrashIco  = ({ size=12 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
const CloseIco  = ({ size=13 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{flexShrink:0}}><path d="M18 6 6 18M6 6l12 12"/></svg>

// ── Star row ──────────────────────────────────────────────────────────────────
const StarRow = ({ rating, size=11 }) => {
  const n = Math.min(5, Math.max(0, Math.floor(Number(rating)||0)))
  return (
    <span className="inline-flex items-center gap-px">
      {Array(n).fill(0).map((_,i)     => <StarFill  key={`f${i}`} size={size}/>)}
      {Array(5-n).fill(0).map((_,i)   => <StarEmpty key={`e${i}`} size={size} color="var(--text-muted)"/>)}
    </span>
  )
}

// ── Star picker ───────────────────────────────────────────────────────────────
const StarPicker = ({ value, onChange }) => {
  const [hov, setHov] = useState(0)
  const refs = useRef([])
  const LABELS = ['Terrible','Poor','Okay','Good','Excellent']
  const active = hov || value
  const bounce = i => { const el=refs.current[i]; if(!el)return; gsap.fromTo(el,{scale:1},{scale:1.4,duration:0.13,yoyo:true,repeat:1,ease:'back.out(3)'}) }
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="flex gap-1.5">
        {[1,2,3,4,5].map(n => (
          <button key={n} type="button" ref={el=>refs.current[n-1]=el}
            onClick={() => { onChange(n); bounce(n-1) }}
            onMouseEnter={() => setHov(n)} onMouseLeave={() => setHov(0)}
            className="bg-transparent border-none cursor-pointer p-1 outline-none transition-transform duration-150"
            style={{ transform:active>=n?'scale(1.1)':'scale(1)' }}>
            {active>=n ? <StarFill size={34} color="#F59E0B"/> : <StarEmpty size={34} color="var(--text-muted)"/>}
          </button>
        ))}
      </div>
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] min-h-[14px] transition-colors duration-150"
        style={{ color:active?'#F59E0B':'var(--text-muted)' }}>
        {active ? LABELS[active-1] : 'Tap to rate'}
      </span>
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({ name, src, size=38 }) => {
  const [err, setErr] = useState(false)
  if (src && !err) return (
    <img src={src} alt={name} onError={() => setErr(true)}
      className="rounded-full object-cover flex-shrink-0"
      style={{ width:size, height:size, border:'2px solid var(--card-border)' }}/>
  )
  return (
    <div className="rounded-full flex-shrink-0 flex items-center justify-center font-extrabold text-white"
      style={{ width:size, height:size, background:avatarColor(name), fontSize:size*0.36, border:'2px solid var(--card-border)', fontFamily:"'Sora',sans-serif", letterSpacing:'-0.02em' }}>
      {initials(name)}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="rounded-[13px] p-3.5" style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)' }}>
    <div className="flex gap-2.5 items-start">
      <div className="skel rounded-full flex-shrink-0" style={{ width:38, height:38 }}/>
      <div className="flex-1 flex flex-col gap-2 pt-0.5">
        <div className="skel rounded" style={{ height:11, width:'46%' }}/>
        <div className="skel rounded" style={{ height:9, width:'24%' }}/>
        <div className="skel rounded mt-1" style={{ height:9, width:'80%' }}/>
        <div className="skel rounded" style={{ height:9, width:'60%' }}/>
      </div>
    </div>
  </div>
)

// ── Summary panel ─────────────────────────────────────────────────────────────
const SummaryPanel = ({ summary, activeFilter, onFilter }) => {
  const barsRef = useRef(null)
  useEffect(() => {
    if (!barsRef.current || !summary) return
    const fills = barsRef.current.querySelectorAll('.bar-fill')
    gsap.fromTo(fills, { scaleX:0, transformOrigin:'left center' }, { scaleX:1, duration:0.55, stagger:0.05, ease:'power2.out', delay:0.1 })
  }, [summary])
  if (!summary) return null
  const { avg, total, dist } = summary
  return (
    <div className="rounded-[13px] p-4 mb-2.5" style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)' }}>
      <div className="flex gap-3.5 items-center">
        <div className="text-center flex-shrink-0 min-w-[60px]">
          <div className="text-[40px] font-black leading-none" style={{ color:'var(--text-primary)', fontFamily:"'Sora',sans-serif", letterSpacing:'-0.04em' }}>
            {avg.toFixed(1)}
          </div>
          <div className="mt-1.5"><StarRow rating={avg} size={12}/></div>
          <div className="mt-1 text-[9.5px] font-medium" style={{ color:'var(--text-muted)' }}>{fmt(total)} review{total!==1?'s':''}</div>
        </div>
        <div ref={barsRef} className="flex-1 flex flex-col gap-[7px]">
          {[5,4,3,2,1].map((star,i) => {
            const count = dist?.[i] ?? 0
            const pct   = total>0 ? (count/total)*100 : 0
            const on    = activeFilter === star
            return (
              <button key={star} onClick={() => onFilter(on?null:star)}
                className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer outline-none p-0">
                <span className="text-[9.5px] font-bold w-2 text-right flex-shrink-0 transition-colors duration-150"
                  style={{ color:on?'var(--accent)':'var(--text-muted)' }}>{star}</span>
                <StarFill size={8} color={on?'var(--accent)':'#F59E0B'}/>
                <div className="flex-1 h-[5px] rounded-full overflow-hidden" style={{ background:'var(--divider)' }}>
                  <div className="bar-fill h-full rounded-full"
                    style={{ width:`${pct}%`, background:on?'var(--accent)':'linear-gradient(90deg,#F59E0B,#F97316)' }}/>
                </div>
                <span className="text-[9px] w-3.5 text-right flex-shrink-0 font-medium" style={{ color:'var(--text-muted)' }}>{count}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── My review card ────────────────────────────────────────────────────────────
const MyReviewCard = ({ review, onEdit, onDelete }) => {
  const cardRef = useRef(null)
  useEffect(() => {
    if (!cardRef.current) return
    gsap.fromTo(cardRef.current, { opacity:0, y:-12, scale:0.98 }, { opacity:1, y:0, scale:1, duration:0.42, ease:'back.out(1.6)' })
  }, [review?._id])
  if (!review) return null
  return (
    <div ref={cardRef} className="rounded-[13px] p-[13px] pb-[11px] mb-2.5 relative"
      style={{ background:'var(--card-bg)', border:'1.5px solid var(--accent-border)', boxShadow:'0 0 0 3px var(--accent-dim)' }}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.1em] rounded-[6px] px-2 py-[3px]"
          style={{ color:'var(--accent)', background:'var(--accent-dim)', border:'1px solid var(--accent-border)' }}>
          <span>✦</span> Your review
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => onEdit(review)} title="Edit"
            className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center cursor-pointer outline-none transition-all duration-150"
            style={{ color:'var(--accent)', background:'var(--pill-bg)', border:'1px solid var(--divider)' }}>
            <EditIco size={12}/>
          </button>
          <button onClick={() => onDelete(review)} title="Delete"
            className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center cursor-pointer outline-none transition-all duration-150 text-red-400"
            style={{ background:'var(--pill-bg)', border:'1px solid var(--divider)' }}>
            <TrashIco size={12}/>
          </button>
        </div>
      </div>
      <div className="flex gap-2.5 items-start">
        <Avatar name={review.customerName} src={review.customerAvatar} size={36}/>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[12.5px] font-bold" style={{ color:'var(--text-primary)', fontFamily:"'Sora',sans-serif" }}>{review.customerName}</span>
            <span className="text-[9.5px] font-medium" style={{ color:'var(--text-muted)' }}>{timeAgo(review.createdAt)}</span>
          </div>
          <div className="mt-0.5"><StarRow rating={review.rating} size={11}/></div>
        </div>
      </div>
      <p className="mt-[9px] mb-0 text-[12.5px] leading-[1.75] italic" style={{ color:'var(--text-secondary)', fontFamily:"'Lora',Georgia,serif" }}>
        {review.text}
      </p>
      <button onClick={() => onEdit(review)}
        className="flex items-center gap-1.5 mt-2.5 bg-transparent border-none cursor-pointer p-0 text-[11px] font-semibold opacity-80 hover:opacity-100 transition-opacity"
        style={{ color:'var(--accent)', fontFamily:"'Sora',sans-serif" }}>
        <EditIco size={11}/> Tap to edit
      </button>
    </div>
  )
}

// ── Review card (other users) ─────────────────────────────────────────────────
const ReviewCard = memo(({ review, currentUser, isGuest, onLike }) => {
  const cardRef = useRef(null)
  const liked   = review._liked ?? false

  const handleLike = useCallback(() => {
    const icon = cardRef.current?.querySelector('.like-heart')
    if (icon) gsap.fromTo(icon, { scale:1 }, { scale:1.6, duration:0.13, yoyo:true, repeat:1, ease:'back.out(4)' })
    onLike(review._id)
  }, [onLike, review._id])

  const press   = () => gsap.to(cardRef.current, { scale:0.978, duration:0.1, ease:'power2.out' })
  const release = () => gsap.to(cardRef.current, { scale:1, duration:0.26, ease:'back.out(2.5)' })

  return (
    <div ref={cardRef} className="rev-card p-[13px] pb-[11px] relative"
      onMouseDown={press} onMouseUp={release} onMouseLeave={release}>
      <div className="flex gap-2.5 items-start">
        <Avatar name={review.customerName} src={review.customerAvatar} size={38}/>
        <div className="flex-1 min-w-0 pt-px">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[12.5px] font-bold" style={{ color:'var(--text-primary)', fontFamily:"'Sora',sans-serif" }}>{review.customerName}</span>
            <span className="text-[9.5px] font-medium" style={{ color:'var(--text-muted)' }}>{timeAgo(review.createdAt)}</span>
          </div>
          <div className="mt-0.5"><StarRow rating={review.rating} size={11}/></div>
        </div>
      </div>
      <p className="mt-2.5 mb-0 text-[12.5px] leading-[1.75] italic" style={{ color:'var(--text-secondary)', fontFamily:"'Lora',Georgia,serif" }}>
        {review.text}
      </p>
      {review.photoUrl && (
        <div className="mt-2.5 rounded-lg overflow-hidden">
          <img src={review.photoUrl} alt="" className="w-full max-h-[180px] object-cover block"/>
        </div>
      )}
      {review.managerReply?.text && (
        <div className="mt-2.5 p-2 rounded-lg" style={{ background:'var(--reply-bg)', border:'1px solid var(--reply-border)', borderLeft:'3px solid var(--accent)' }}>
          <div className="text-[8.5px] font-bold uppercase tracking-[0.1em] mb-1" style={{ color:'var(--accent)' }}>
            {BRAND.emoji} Cafe response
          </div>
          <p className="m-0 text-[12px] leading-[1.6]" style={{ color:'var(--text-secondary)' }}>{review.managerReply.text}</p>
        </div>
      )}
      <div className="mt-2.5 pt-[9px] flex items-center gap-1.5" style={{ borderTop:'1px solid var(--divider)' }}>
        <button onClick={handleLike}
          className="flex items-center gap-1 px-2 py-[3px] rounded-[7px] text-[11px] font-semibold outline-none transition-all duration-150"
          style={{ background:liked?'var(--accent-dim)':'var(--pill-bg)', border:`1px solid ${liked?'var(--accent-border)':'var(--divider)'}`, color:liked?'var(--accent)':'var(--text-muted)', cursor:isGuest?'default':'pointer' }}>
          <span className="like-heart text-[12px] leading-none">{liked?'♥':'♡'}</span>
          <span>{fmt(review.likes??0)}</span>
        </button>
        <span className="ml-auto text-[9.5px] font-medium" style={{ color:'var(--text-muted)' }}>{review.rating}/5</span>
      </div>
    </div>
  )
})
ReviewCard.displayName = 'ReviewCard'

// ── Review modal ──────────────────────────────────────────────────────────────
const ReviewModal = ({ isOpen, onClose, existing, onSubmit, submitting, submitError }) => {
  const [rating, setRating] = useState(() => existing?.rating ?? 0)
  const [text,   setText]   = useState(() => existing?.text ?? '')
  const overlayRef  = useRef(null)
  const panelRef    = useRef(null)
  const textareaRef = useRef(null)
  const dispatch    = useDispatch()

  useEffect(() => {
    setRating(existing?.rating ?? 0); setText(existing?.text ?? '')
    if (submitError) dispatch(clearSubmitError())
  }, [existing?._id, isOpen]) // eslint-disable-line

  useEffect(() => {
    if (!isOpen || !textareaRef.current || !existing?.text) return
    gsap.fromTo(textareaRef.current, { opacity:0, y:6 }, { opacity:1, y:0, duration:0.3, ease:'power2.out', delay:0.25 })
  }, [isOpen, existing?._id])

  useEffect(() => {
    if (!isOpen || !overlayRef.current || !panelRef.current) return
    gsap.fromTo(overlayRef.current, { opacity:0 }, { opacity:1, duration:0.22, ease:'power2.out' })
    gsap.fromTo(panelRef.current, { y:'100%' }, { y:'0%', duration:0.42, ease:'power3.out' })
  }, [isOpen])

  const dismiss = useCallback(() => {
    if (!overlayRef.current || !panelRef.current) { onClose(); return }
    gsap.to(panelRef.current, { y:'100%', duration:0.3, ease:'power3.in' })
    gsap.to(overlayRef.current, { opacity:0, duration:0.24, ease:'power2.in', onComplete:onClose })
  }, [onClose])

  const handleSubmit = useCallback(async e => {
    e.preventDefault()
    if (!rating || text.trim().length < MIN_CHARS) return
    const ok = await onSubmit({ rating, text:text.trim() })
    if (ok) { if(panelRef.current) gsap.to(panelRef.current,{boxShadow:'0 -24px 60px var(--accent-glow)',duration:0.2,yoyo:true,repeat:1,onComplete:dismiss}); else dismiss() }
  }, [rating, text, onSubmit, dismiss])

  const chars   = text.length
  const over    = chars > MAX_CHARS
  const canPost = rating>0 && chars>=MIN_CHARS && !over && !submitting

  if (!isOpen) return null
  return (
    <div ref={overlayRef} onClick={e => e.target===overlayRef.current&&dismiss()}
      className="fixed inset-0 z-[1000] flex flex-col justify-end"
      style={{ background:'var(--overlay-bg)', backdropFilter:'blur(8px)' }}>
      <div ref={panelRef}
        className="w-full max-w-[520px] mx-auto overflow-y-auto"
        style={{ background:'var(--modal-bg)', border:'1px solid var(--card-border)', borderRadius:'20px 20px 0 0', padding:'0 20px 36px', boxShadow:'0 -24px 60px rgba(0,0,0,0.4)', maxHeight:'92dvh' }}>
        <div className="w-9 h-1 rounded-full mx-auto my-3" style={{ background:'var(--divider)' }}/>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="m-0 text-[16px] font-extrabold" style={{ color:'var(--text-primary)', fontFamily:"'Sora',sans-serif" }}>
              {existing ? 'Edit your review' : 'Write a review'}
            </h2>
            {existing && <p className="m-0 mt-0.5 text-[10.5px] font-medium" style={{ color:'var(--text-muted)' }}>Your review from {timeAgo(existing.createdAt)}</p>}
          </div>
          <button onClick={dismiss} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer outline-none flex-shrink-0"
            style={{ background:'var(--pill-bg)', border:'1px solid var(--divider)', color:'var(--text-muted)' }}>
            <CloseIco size={13}/>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-5"><StarPicker value={rating} onChange={setRating}/></div>
          <div className="relative mb-3">
            <textarea ref={textareaRef} value={text} onChange={e=>setText(e.target.value)} rows={5}
              placeholder="Share your experience — what made it memorable?"
              className="w-full rounded-xl text-[13px] leading-[1.72] resize-none outline-none box-border transition-colors duration-200"
              style={{ padding:'11px 12px 28px', background:'var(--input-bg)', border:`1.5px solid ${over?'var(--danger)':'var(--input-border)'}`, color:'var(--text-primary)', fontFamily:"'Lora',Georgia,serif" }}
              onFocus={e=>{e.target.style.borderColor=over?'var(--danger)':'var(--accent)'}}
              onBlur={e=>{e.target.style.borderColor=over?'var(--danger)':'var(--input-border)'}}/>
            <span className="absolute bottom-2 right-2.5 text-[10px] font-semibold"
              style={{ color:over?'var(--danger)':chars>MAX_CHARS*0.85?'#F59E0B':'var(--text-muted)' }}>
              {chars}/{MAX_CHARS}
            </span>
          </div>
          {submitError && (
            <div className="px-3 py-[9px] rounded-[9px] mb-3 text-[12px] font-medium"
              style={{ background:'var(--danger-bg)', border:'1px solid var(--danger-border)', color:'var(--danger)' }}>
              {submitError}
            </div>
          )}
          <button type="submit" disabled={!canPost}
            onMouseDown={e=>canPost&&(e.currentTarget.style.transform='scale(0.97)')}
            onMouseUp={e=>(e.currentTarget.style.transform='scale(1)')}
            className="w-full py-[13px] rounded-xl border-none text-[13px] font-bold transition-opacity duration-150"
            style={{
              fontFamily:"'Sora',sans-serif", letterSpacing:'0.01em',
              cursor:canPost?'pointer':'not-allowed',
              background:canPost?'var(--accent-gradient)':'var(--pill-bg)',
              color:canPost?'#fff':'var(--text-muted)',
              boxShadow:canPost?'0 4px 16px var(--accent-glow)':'none',
            }}>
            {submitting ? 'Saving…' : existing ? 'Update Review' : 'Post Review'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Delete modal ──────────────────────────────────────────────────────────────
const DeleteModal = ({ isOpen, onClose, onConfirm, submitting }) => {
  const overlayRef = useRef(null)
  const panelRef   = useRef(null)
  useEffect(() => {
    if (!isOpen||!overlayRef.current||!panelRef.current) return
    gsap.fromTo(overlayRef.current, { opacity:0 }, { opacity:1, duration:0.18 })
    gsap.fromTo(panelRef.current, { scale:0.88, opacity:0, y:14 }, { scale:1, opacity:1, y:0, duration:0.3, ease:'back.out(2)' })
  }, [isOpen])
  const dismiss = useCallback(() => {
    if (!overlayRef.current||!panelRef.current) { onClose(); return }
    gsap.to(panelRef.current, { scale:0.9, opacity:0, duration:0.17 })
    gsap.to(overlayRef.current, { opacity:0, duration:0.17, onComplete:onClose })
  }, [onClose])
  if (!isOpen) return null
  return (
    <div ref={overlayRef} onClick={e=>e.target===overlayRef.current&&dismiss()}
      className="fixed inset-0 z-[1100] flex items-center justify-center p-5"
      style={{ background:'var(--overlay-bg)', backdropFilter:'blur(8px)' }}>
      <div ref={panelRef} className="w-full max-w-[310px] text-center rounded-[20px] p-[26px_20px]"
        style={{ background:'var(--modal-bg)', border:'1px solid var(--card-border)', boxShadow:'0 24px 60px rgba(0,0,0,0.5)' }}>
        <div className="text-[40px] leading-none mb-3">🗑️</div>
        <h3 className="m-0 mb-2 text-[15px] font-extrabold" style={{ color:'var(--text-primary)', fontFamily:"'Sora',sans-serif" }}>Delete review?</h3>
        <p className="m-0 mb-5 text-[12px] leading-[1.6]" style={{ color:'var(--text-muted)' }}>This cannot be undone. Your review will be permanently removed.</p>
        <div className="flex gap-2">
          <button onClick={dismiss} className="flex-1 py-2.5 rounded-[10px] text-[12px] font-semibold cursor-pointer outline-none"
            style={{ background:'var(--pill-bg)', border:'1px solid var(--divider)', color:'var(--text-secondary)', fontFamily:"'Sora',sans-serif" }}>Cancel</button>
          <button onClick={onConfirm} disabled={submitting}
            className="flex-1 py-2.5 rounded-[10px] border-none text-[12px] font-bold text-white cursor-pointer outline-none"
            style={{ background:'linear-gradient(135deg,#EF4444,#DC2626)', boxShadow:'0 4px 12px rgba(239,68,68,0.3)', opacity:submitting?.7:1, fontFamily:"'Sora',sans-serif" }}>
            {submitting?'Deleting…':'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyState = ({ onWrite, isGuest }) => {
  const ref = useRef(null)
  useEffect(() => { if(!ref.current)return; gsap.fromTo(ref.current,{opacity:0,y:18},{opacity:1,y:0,duration:0.48,ease:'back.out(1.5)',delay:0.12}) }, [])
  return (
    <div ref={ref} className="text-center px-6 pt-12 pb-9">
      <div className="text-[44px] leading-none mb-3">{BRAND.emoji}</div>
      <h3 className="m-0 mb-2 text-[15px] font-extrabold" style={{ color:'var(--text-primary)', fontFamily:"'Sora',sans-serif" }}>No reviews yet</h3>
      <p className="m-0 mb-5 text-[13px] leading-[1.6]" style={{ color:'var(--text-muted)' }}>Be the first to share your experience!</p>
      {!isGuest && (
        <button onClick={onWrite} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white border-none cursor-pointer text-[11.5px] font-bold mx-auto"
          style={{ background:'var(--accent-gradient)', boxShadow:'0 2px 10px var(--accent-glow)', fontFamily:"'Sora',sans-serif" }}>
          <WriteIco size={13}/> Write the first review
        </button>
      )}
    </div>
  )
}

// ══ MAIN ══════════════════════════════════════════════════════════════════════
export default function ReviewsPage() {
  const dispatch    = useDispatch()
  const navigate    = useNavigate()
  const { isDark }  = useContext(ThemeContext)
  const currentUser = useSelector(selectUser)
  const isGuest     = useSelector(selectIsGuest)

  const selReviews    = useMemo(() => selectReviewsForItem(CAFE_CONTEXT_ID), [])
  const selSummary    = useMemo(() => selectReviewSummary(CAFE_CONTEXT_ID), [])
  const selPagination = useMemo(() => selectReviewPagination(CAFE_CONTEXT_ID), [])
  const selLoading    = useMemo(() => selectReviewsLoading(CAFE_CONTEXT_ID), [])
  const selHasMore    = useMemo(() => selectReviewsHasMore(CAFE_CONTEXT_ID), [])
  const selMine       = useMemo(() => selectMyReview(CAFE_CONTEXT_ID), [])

  const reviews    = useSelector(selReviews)
  const summary    = useSelector(selSummary)
  const pagination = useSelector(selPagination)
  const loading    = useSelector(selLoading)
  const hasMore    = useSelector(selHasMore)
  const myReview   = useSelector(selMine)
  const submitting  = useSelector(selectSubmitting)
  const submitError = useSelector(selectSubmitError)

  const myDisplayReview = useMemo(() => {
    if (!currentUser?._id || !reviews.length) return null
    const uid = String(currentUser._id)
    return reviews.find(r => {
      const rid = r.customerId?._id ? String(r.customerId._id) : String(r.customerId ?? '')
      return rid === uid
    }) ?? null
  }, [reviews, currentUser?._id])

  const [sort,         setSort]         = useState('recent')
  const [filter,       setFilter]       = useState(null)
  const [writeOpen,    setWriteOpen]    = useState(false)
  const [editTarget,   setEditTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const editTargetRef = useRef(null)
  const headerRef     = useRef(null)
  const listRef       = useRef(null)
  const sentinelRef   = useRef(null)
  const scrollCtxRef  = useRef(null)

  useEffect(() => {
    dispatch(fetchReviews({ menuItemId:CAFE_CONTEXT_ID, page:1, sort, rating:filter??undefined }))
    if (!isGuest) dispatch(fetchMyReview(CAFE_CONTEXT_ID))
  }, [sort, filter]) // eslint-disable-line

  useEffect(() => {
    if (!headerRef.current) return
    gsap.fromTo(headerRef.current.querySelectorAll('.hdr-el'), { opacity:0, y:-10 }, { opacity:1, y:0, stagger:0.04, duration:0.4, ease:'power3.out' })
  }, [])

  useEffect(() => {
    if (!listRef.current || loading) return
    const cards = listRef.current.querySelectorAll('.rev-card:not(.gsap-done)')
    if (!cards.length) return
    gsap.fromTo(cards, { opacity:0, y:18, scale:0.98 }, { opacity:1, y:0, scale:1, stagger:0.04, duration:0.38, ease:'back.out(1.4)' })
    cards.forEach(c => c.classList.add('gsap-done'))
  }, [reviews, loading])

  useEffect(() => {
    if (!listRef.current) return
    scrollCtxRef.current = gsap.context(() => {
      gsap.utils.toArray('.rev-card').forEach(card => {
        ScrollTrigger.create({ trigger:card, start:'top 94%', onEnter:() => {
          if (!card.classList.contains('gsap-done')) {
            gsap.fromTo(card, { opacity:0, y:14 }, { opacity:1, y:0, duration:0.36, ease:'power3.out' })
            card.classList.add('gsap-done')
          }
        }})
      })
    }, listRef.current)
    return () => scrollCtxRef.current?.revert()
  }, [reviews])

  useEffect(() => {
    if (!sentinelRef.current) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore && !loading)
        dispatch(fetchReviews({ menuItemId:CAFE_CONTEXT_ID, page:(pagination?.page??1)+1, sort, rating:filter??undefined }))
    }, { threshold:0.1 })
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [hasMore, loading, pagination, sort, filter, dispatch])

  const handleLike = useCallback(id => {
    if (isGuest) return
    dispatch(optimisticLike({ reviewId:id, menuItemId:CAFE_CONTEXT_ID }))
    dispatch(likeReview({ reviewId:id, menuItemId:CAFE_CONTEXT_ID }))
  }, [isGuest, dispatch])

  const handleEditOpen = useCallback(review => {
    editTargetRef.current = review; setEditTarget(review); setWriteOpen(true)
  }, [])

  const handleWriteOpen = useCallback(() => {
    if (myDisplayReview) { handleEditOpen(myDisplayReview); return }
    editTargetRef.current = null; setEditTarget(null); setWriteOpen(true)
  }, [myDisplayReview, handleEditOpen])

  const handleModalClose = useCallback(() => {
    editTargetRef.current = null; setWriteOpen(false); setEditTarget(null)
    dispatch(clearSubmitError())
  }, [dispatch])

  const handleSubmit = useCallback(async ({ rating, text }) => {
    dispatch(clearSubmitError())
    const target = editTargetRef.current || myReview || null
    if (target?._id) {
      const res = await dispatch(editReview({ reviewId:String(target._id), menuItemId:CAFE_CONTEXT_ID, rating, text }))
      return editReview.fulfilled.match(res)
    }
    const cafeId = currentUser?.cafeId ?? import.meta.env.VITE_CAFE_ID ?? null
    const res = await dispatch(submitReview({ menuItemId:CAFE_CONTEXT_ID, cafeId, rating, text }))
    return submitReview.fulfilled.match(res)
  }, [myReview, currentUser, dispatch])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    const res = await dispatch(removeReview({ reviewId:deleteTarget._id, menuItemId:CAFE_CONTEXT_ID }))
    if (removeReview.fulfilled.match(res)) setDeleteTarget(null)
  }, [deleteTarget, dispatch])

  const otherReviews = useMemo(() => {
    if (!currentUser?._id) return reviews
    const uid = String(currentUser._id)
    return reviews.filter(r => {
      const rid = r.customerId?._id ? String(r.customerId._id) : String(r.customerId ?? '')
      return rid !== uid
    })
  }, [reviews, currentUser?._id])

  const showEmpty = !loading && reviews.length === 0 && !myDisplayReview

  return (
    <div className="min-h-dvh" style={{ background:'var(--bg)', fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=Lora:ital,wght@1,400;1,500&family=DM+Sans:wght@400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        .rev-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:13px;will-change:transform;transition:box-shadow .2s,border-color .2s}
        .rev-card:hover{box-shadow:var(--card-shadow);border-color:var(--accent-border)}
        .skel{background:linear-gradient(90deg,var(--pill-bg) 0%,var(--divider) 50%,var(--pill-bg) 100%);background-size:200% 100%;animation:shimmer 1.4s linear infinite}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:var(--divider);border-radius:99px}
      `}</style>

      {/* ── Header ── */}
      <header ref={headerRef} className="sticky top-0 z-[100]"
        style={{ background:'var(--header-bg)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', borderBottom:'1px solid var(--header-border)' }}>
        <div className="max-w-[600px] mx-auto flex items-center gap-2 px-[13px] py-[9px]">
          {/* ✅ navigate(-1) */}
          <button className="hdr-el flex items-center justify-center w-[30px] h-[30px] rounded-lg bg-transparent border-none cursor-pointer outline-none flex-shrink-0 transition-all duration-150 hover:bg-[var(--pill-bg)]"
            onClick={() => navigate(-1)} style={{ color:'var(--text-secondary)' }}>
            <BackIco size={14}/>
          </button>
          <div className="hdr-el flex-1 min-w-0">
            <h1 className="m-0 text-[15px] font-extrabold leading-none" style={{ color:'var(--text-primary)', fontFamily:"'Sora',sans-serif" }}>Reviews</h1>
            {summary && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <StarRow rating={summary.avg} size={9}/>
                <span className="text-[9.5px] font-medium" style={{ color:'var(--text-muted)' }}>{summary.avg.toFixed(1)} · {fmt(summary.total)} total</span>
              </div>
            )}
          </div>
          {!isGuest && !myDisplayReview && (
            <button className="hdr-el inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white border-none cursor-pointer text-[11.5px] font-bold"
              onClick={handleWriteOpen} style={{ background:'var(--accent-gradient)', boxShadow:'0 2px 10px var(--accent-glow)', fontFamily:"'Sora',sans-serif" }}>
              <WriteIco size={12}/> Write
            </button>
          )}
          {!isGuest && myDisplayReview && (
            <button className="hdr-el inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white border-none cursor-pointer text-[11.5px] font-bold"
              onClick={() => handleEditOpen(myDisplayReview)} style={{ background:'var(--accent-gradient)', boxShadow:'0 2px 10px var(--accent-glow)', fontFamily:"'Sora',sans-serif" }}>
              <EditIco size={12}/> Edit
            </button>
          )}
        </div>

        {/* Sort + filter */}
        <div className="max-w-[600px] mx-auto flex items-center gap-1.5 px-[13px] pb-[7px] pt-[5px] overflow-x-auto" style={{ borderTop:'1px solid var(--divider)' }}>
          {['recent','top'].map(s => (
            <button key={s} onClick={() => setSort(s)}
              className="border-b-2 pb-[5px] pt-1 text-[12px] font-semibold cursor-pointer bg-transparent border-l-0 border-r-0 border-t-0 outline-none whitespace-nowrap transition-all duration-150"
              style={{ borderBottomColor:sort===s?'var(--accent)':'transparent', color:sort===s?'var(--text-primary)':'var(--text-muted)', fontFamily:"'DM Sans',sans-serif" }}>
              {s==='recent'?'Recent':'Top'}
            </button>
          ))}
          <div className="w-px h-[14px] flex-shrink-0 mx-0.5" style={{ background:'var(--divider)' }}/>
          {[5,4,3,2,1].map(s => (
            <button key={s} onClick={() => setFilter(filter===s?null:s)}
              className="inline-flex items-center gap-[3px] px-[7px] py-0.5 rounded-[6px] text-[10.5px] font-semibold cursor-pointer outline-none whitespace-nowrap transition-all duration-150"
              style={{ background:filter===s?'var(--pill-bg)':'var(--pill-bg)', border:`1px solid ${filter===s?'var(--accent-border)':'var(--pill-border)'}`, color:filter===s?'var(--accent)':'var(--text-muted)' }}>
              {s}<StarFill size={8} color={filter===s?'var(--accent)':'#F59E0B'}/>
            </button>
          ))}
          {filter !== null && (
            <button onClick={() => setFilter(null)} className="inline-flex items-center gap-[3px] px-[7px] py-0.5 rounded-[6px] text-[10.5px] font-semibold cursor-pointer outline-none"
              style={{ color:'var(--danger)', borderColor:'var(--danger-border)', background:'transparent', border:'1px solid' }}>✕</button>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-[600px] mx-auto px-[11px] pt-2.5 pb-24">
        {summary && summary.total>0 && <SummaryPanel summary={summary} activeFilter={filter} onFilter={s=>setFilter(s)}/>}

        {!isGuest && myDisplayReview && (
          <MyReviewCard review={myDisplayReview} onEdit={handleEditOpen} onDelete={setDeleteTarget}/>
        )}

        {!isGuest && !myDisplayReview && !loading && reviews.length>0 && (
          <div className="flex items-center gap-2.5 rounded-xl mb-2.5 p-[10px_13px]"
            style={{ background:'var(--accent-dim)', border:'1px solid var(--accent-border)' }}>
            <span className="text-[18px]">✍️</span>
            <div className="flex-1">
              <p className="m-0 text-[12px] font-bold" style={{ color:'var(--text-primary)' }}>Enjoyed your visit?</p>
              <p className="m-0 mt-0.5 text-[10.5px]" style={{ color:'var(--text-muted)' }}>Share your experience with others.</p>
            </div>
            <button onClick={handleWriteOpen}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-white border-none cursor-pointer text-[11.5px] font-bold flex-shrink-0"
              style={{ background:'var(--accent-gradient)', fontFamily:"'Sora',sans-serif" }}>
              Write
            </button>
          </div>
        )}

        <div ref={listRef} className="flex flex-col gap-[9px]">
          {loading && reviews.length===0 && Array(4).fill(0).map((_,i) => <SkeletonCard key={i}/>)}
          {showEmpty && <EmptyState onWrite={handleWriteOpen} isGuest={isGuest}/>}
          {otherReviews.map(r => (
            <ReviewCard key={r._id} review={r} currentUser={currentUser} isGuest={isGuest} onLike={handleLike}/>
          ))}
          {loading && reviews.length>0 && (
            <div className="text-center py-3 text-[10.5px] font-medium" style={{ color:'var(--text-muted)' }}>Loading more…</div>
          )}
          <div ref={sentinelRef} className="h-px"/>
        </div>

        {!hasMore && reviews.length>3 && !loading && (
          <div className="text-center py-5 text-[10.5px] font-medium" style={{ color:'var(--text-muted)' }}>
            — {fmt(reviews.length)} review{reviews.length!==1?'s':''} —
          </div>
        )}
      </main>

      <ReviewModal isOpen={writeOpen} onClose={handleModalClose}
        existing={editTarget ?? (writeOpen && myDisplayReview ? myDisplayReview : null)}
        onSubmit={handleSubmit} submitting={submitting} submitError={submitError}/>
      <DeleteModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete} submitting={submitting}/>
    </div>
  )
}