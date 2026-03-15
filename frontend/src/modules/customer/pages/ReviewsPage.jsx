// src/modules/customer/pages/ReviewsPage.jsx
// Route: /reviews
//
// ✅ Header: "Write" only when no myReview, "Edit" only when myReview exists
// ✅ MyReview card pinned at top with content pre-loaded, edit/delete inline
// ✅ Modal seeds rating+text from existing immediately (lazy useState)
// ✅ GSAP: slide-up sheet, card stagger, star bounce, bar animate, like pulse

import {
  useEffect, useRef, useState, useCallback,
  useContext, useMemo, memo,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ThemeContext } from "@shared/context/ThemeContext";
import { selectUser, selectIsGuest } from "@store/slices/authSlice";
import {
  fetchReviews, fetchMyReview, submitReview, editReview, removeReview,
  likeReview, optimisticLike, clearSubmitError,
  selectReviewsForItem, selectReviewSummary, selectReviewPagination,
  selectReviewsLoading, selectReviewsHasMore, selectMyReview,
  selectSubmitting, selectSubmitError,
} from "@store/slices/reviewSlice";

gsap.registerPlugin(ScrollTrigger);

const CAFE_CONTEXT_ID = "cafe_global";
const MAX_CHARS = 500;
const MIN_CHARS = 10;

// ── helpers ────────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("en-NP").format(n ?? 0);
const timeAgo = (d) => {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60)      return "just now";
  if (s < 3600)    return `${Math.floor(s/60)}m ago`;
  if (s < 86400)   return `${Math.floor(s/3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s/86400)}d ago`;
  return new Date(d).toLocaleDateString("en-NP", { day:"numeric", month:"short", year:"numeric" });
};
const initials    = (n="") => n.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()||"?";
const ACOLORS     = ["#F97316","#EAB308","#22C55E","#06B6D4","#8B5CF6","#EC4899","#14B8A6","#F43F5E"];
const avatarColor = (n="") => { let h=0; for(let i=0;i<n.length;i++) h=(h*31+n.charCodeAt(i))>>>0; return ACOLORS[h%ACOLORS.length]; };

// ── SVG icons ─────────────────────────────────────────────────────────────────
const StarFillSvg = ({size=13, color="#F59E0B"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{flexShrink:0}}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);
const StarEmptySvg = ({size=13, color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" style={{flexShrink:0}}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);
const BackIcon = ({size=14}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const WriteIcon = ({size=12}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
  </svg>
);
const EditIcon = ({size=12}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const TrashIcon = ({size=12}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/>
  </svg>
);
const CloseIcon = ({size=13}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{flexShrink:0}}>
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);

// ── Star row display ───────────────────────────────────────────────────────────
const StarRow = ({rating, size=11}) => {
  const safeRating = Math.min(5, Math.max(0, Math.floor(Number(rating) || 0)));
  const full  = safeRating;
  const empty = 5 - safeRating;
  return (
    <span style={{display:"inline-flex", alignItems:"center", gap:1}}>
      {Array(full).fill(0).map((_,i)  => <StarFillSvg  key={`f${i}`} size={size}/>)}
      {Array(empty).fill(0).map((_,i) => <StarEmptySvg key={`e${i}`} size={size} color="var(--text-muted)"/>)}
    </span>
  );
};

// ── Star picker ────────────────────────────────────────────────────────────────
const StarPicker = ({value, onChange}) => {
  const [hov, setHov] = useState(0);
  const starsRef = useRef([]);
  const LABELS = ["Terrible","Poor","Okay","Good","Excellent"];
  const active = hov || value;

  const bounce = (i) => {
    const el = starsRef.current[i];
    if (!el) return;
    gsap.fromTo(el, {scale:1}, {scale:1.4, duration:0.13, yoyo:true, repeat:1, ease:"back.out(3)"});
  };

  return (
    <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:10}}>
      <div style={{display:"flex", gap:6}}>
        {[1,2,3,4,5].map((n) => (
          <button key={n} type="button"
            ref={el => starsRef.current[n-1]=el}
            onClick={() => { onChange(n); bounce(n-1); }}
            onMouseEnter={() => setHov(n)}
            onMouseLeave={() => setHov(0)}
            style={{
              background:"none", border:"none", cursor:"pointer",
              padding:4, outline:"none",
              transform: active>=n ? "scale(1.1)" : "scale(1)",
              transition:"transform 0.16s cubic-bezier(0.34,1.56,0.64,1)",
            }}>
            {active>=n
              ? <StarFillSvg  size={34} color="#F59E0B"/>
              : <StarEmptySvg size={34} color="var(--text-muted)"/>}
          </button>
        ))}
      </div>
      <span style={{
        fontSize:11, fontWeight:700, letterSpacing:"0.08em",
        textTransform:"uppercase", minHeight:14, transition:"color 0.15s",
        color: active ? "#F59E0B" : "var(--text-muted)",
      }}>
        {active ? LABELS[active-1] : "Tap to rate"}
      </span>
    </div>
  );
};

// ── Avatar ─────────────────────────────────────────────────────────────────────
const Avatar = ({name, src, size=38}) => {
  const [err, setErr] = useState(false);
  if (src && !err) return (
    <img src={src} alt={name} onError={()=>setErr(true)} style={{
      width:size, height:size, borderRadius:"50%", objectFit:"cover",
      flexShrink:0, border:"2px solid var(--card-border)",
    }}/>
  );
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%", flexShrink:0,
      background:avatarColor(name), display:"flex", alignItems:"center",
      justifyContent:"center", fontSize:size*0.36, fontWeight:800, color:"#fff",
      border:"2px solid var(--card-border)", fontFamily:"'Sora',sans-serif",
      letterSpacing:"-0.02em",
    }}>
      {initials(name)}
    </div>
  );
};

// ── Skeleton ───────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div style={{background:"var(--card-bg)", border:"1px solid var(--card-border)", borderRadius:13, padding:14}}>
    <div style={{display:"flex", gap:10, alignItems:"flex-start"}}>
      <div className="skel" style={{width:38, height:38, borderRadius:"50%", flexShrink:0}}/>
      <div style={{flex:1, display:"flex", flexDirection:"column", gap:8, paddingTop:2}}>
        <div className="skel" style={{height:11, width:"46%", borderRadius:5}}/>
        <div className="skel" style={{height:9,  width:"24%", borderRadius:5}}/>
        <div className="skel" style={{height:9,  width:"80%", borderRadius:5, marginTop:4}}/>
        <div className="skel" style={{height:9,  width:"60%", borderRadius:5}}/>
      </div>
    </div>
  </div>
);

// ── Summary panel ──────────────────────────────────────────────────────────────
const SummaryPanel = ({summary, activeFilter, onFilter}) => {
  const barsRef = useRef(null);
  useEffect(() => {
    if (!barsRef.current || !summary) return;
    const fills = barsRef.current.querySelectorAll(".bar-fill");
    gsap.fromTo(fills,
      {scaleX:0, transformOrigin:"left center"},
      {scaleX:1, duration:0.55, stagger:0.05, ease:"power2.out", delay:0.1});
  }, [summary]);

  if (!summary) return null;
  const {avg, total, dist} = summary;

  return (
    <div style={{background:"var(--card-bg)", border:"1px solid var(--card-border)", borderRadius:13, padding:"16px 14px", marginBottom:10}}>
      <div style={{display:"flex", gap:14, alignItems:"center"}}>
        <div style={{textAlign:"center", flexShrink:0, minWidth:60}}>
          <div style={{fontSize:40, fontWeight:900, lineHeight:1, color:"var(--text-primary)", fontFamily:"'Sora',sans-serif", letterSpacing:"-0.04em"}}>
            {avg.toFixed(1)}
          </div>
          <div style={{marginTop:5}}><StarRow rating={avg} size={12}/></div>
          <div style={{marginTop:4, fontSize:9.5, color:"var(--text-muted)", fontWeight:500}}>
            {fmt(total)} review{total!==1?"s":""}
          </div>
        </div>
        <div ref={barsRef} style={{flex:1, display:"flex", flexDirection:"column", gap:7}}>
          {[5,4,3,2,1].map((star,i) => {
            const count = dist?.[i]??0;
            const pct   = total>0 ? (count/total)*100 : 0;
            const on    = activeFilter===star;
            return (
              <button key={star} onClick={()=>onFilter(on?null:star)}
                style={{display:"flex", alignItems:"center", gap:5, background:"none", border:"none", cursor:"pointer", outline:"none", padding:0}}>
                <span style={{fontSize:9.5, fontWeight:700, width:8, textAlign:"right", flexShrink:0, color:on?"var(--accent)":"var(--text-muted)", transition:"color 0.15s"}}>{star}</span>
                <StarFillSvg size={8} color={on?"var(--accent)":"#F59E0B"}/>
                <div style={{flex:1, height:5, borderRadius:99, background:"var(--divider)", overflow:"hidden"}}>
                  <div className="bar-fill" style={{height:"100%", borderRadius:99, width:`${pct}%`, background:on?"var(--accent)":"linear-gradient(90deg,#F59E0B,#F97316)"}}/>
                </div>
                <span style={{fontSize:9, width:14, textAlign:"right", flexShrink:0, color:"var(--text-muted)", fontWeight:500}}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── MY REVIEW CARD — pinned at top, shows existing review with edit/delete ─────
const MyReviewCard = ({review, onEdit, onDelete}) => {
  const cardRef = useRef(null);

  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(cardRef.current,
      {opacity:0, y:-12, scale:0.98},
      {opacity:1, y:0,   scale:1, duration:0.42, ease:"back.out(1.6)"});
  }, [review?._id]);

  if (!review) return null;

  return (
    <div ref={cardRef} style={{
      background:"var(--card-bg)",
      border:"1.5px solid var(--accent-border)",
      borderRadius:13, padding:"13px 13px 11px",
      marginBottom:10, position:"relative",
      boxShadow:"0 0 0 3px var(--accent-dim)",
    }}>
      {/* "Your review" badge */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        marginBottom:10,
      }}>
        <div style={{
          display:"inline-flex", alignItems:"center", gap:5,
          fontSize:9, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase",
          color:"var(--accent)", background:"var(--accent-dim)",
          border:"1px solid var(--accent-border)", padding:"3px 8px", borderRadius:6,
        }}>
          <span>✦</span> Your review
        </div>
        {/* Edit + Delete actions */}
        <div style={{display:"flex", gap:5}}>
          <button className="icon-btn" style={{color:"var(--accent)"}}
            onClick={()=>onEdit(review)} title="Edit your review">
            <EditIcon size={12}/>
          </button>
          <button className="icon-btn" style={{color:"var(--danger)"}}
            onClick={()=>onDelete(review)} title="Delete your review">
            <TrashIcon size={12}/>
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{display:"flex", gap:10, alignItems:"flex-start"}}>
        <Avatar name={review.customerName} src={review.customerAvatar} size={36}/>
        <div style={{flex:1, minWidth:0}}>
          <div style={{display:"flex", alignItems:"center", gap:5, flexWrap:"wrap"}}>
            <span style={{fontSize:12.5, fontWeight:700, color:"var(--text-primary)", fontFamily:"'Sora',sans-serif"}}>
              {review.customerName}
            </span>
            <span style={{fontSize:9.5, color:"var(--text-muted)", fontWeight:500}}>
              {timeAgo(review.createdAt)}
            </span>
          </div>
          <div style={{marginTop:3}}><StarRow rating={review.rating} size={11}/></div>
        </div>
      </div>

      <p style={{margin:"9px 0 0", fontSize:12.5, lineHeight:1.75, fontStyle:"italic",
        color:"var(--text-secondary)", fontFamily:"'Lora',Georgia,serif"}}>
        {review.text}
      </p>

      {/* Tap to edit hint */}
      <button onClick={()=>onEdit(review)} style={{
        display:"flex", alignItems:"center", gap:5, marginTop:10,
        background:"none", border:"none", cursor:"pointer", outline:"none",
        padding:0, color:"var(--accent)", fontSize:11, fontWeight:600,
        fontFamily:"'Sora',sans-serif", opacity:0.8,
        transition:"opacity 0.15s",
      }}
        onMouseEnter={e=>e.currentTarget.style.opacity=1}
        onMouseLeave={e=>e.currentTarget.style.opacity=0.8}>
        <EditIcon size={11}/>
        Tap to edit
      </button>
    </div>
  );
};

// ── Review card (other users) ──────────────────────────────────────────────────
const ReviewCard = memo(({review, currentUser, isGuest, onLike}) => {
  const cardRef = useRef(null);
  const liked   = review._liked ?? false;

  const handleLike = useCallback(() => {
    const icon = cardRef.current?.querySelector(".like-heart");
    if (icon) gsap.fromTo(icon,{scale:1},{scale:1.6,duration:0.13,yoyo:true,repeat:1,ease:"back.out(4)"});
    onLike(review._id);
  }, [onLike, review._id]);

  const press   = () => gsap.to(cardRef.current, {scale:0.978, duration:0.1, ease:"power2.out"});
  const release = () => gsap.to(cardRef.current, {scale:1, duration:0.26, ease:"back.out(2.5)"});

  return (
    <div ref={cardRef} className="rev-card" onMouseDown={press} onMouseUp={release} onMouseLeave={release}
      style={{padding:"13px 13px 11px", position:"relative"}}>

      <div style={{display:"flex", gap:10, alignItems:"flex-start"}}>
        <Avatar name={review.customerName} src={review.customerAvatar} size={38}/>
        <div style={{flex:1, minWidth:0, paddingTop:1}}>
          <div style={{display:"flex", alignItems:"center", gap:5, flexWrap:"wrap"}}>
            <span style={{fontSize:12.5, fontWeight:700, color:"var(--text-primary)", fontFamily:"'Sora',sans-serif"}}>
              {review.customerName}
            </span>
            <span style={{fontSize:9.5, color:"var(--text-muted)", fontWeight:500}}>
              {timeAgo(review.createdAt)}
            </span>
          </div>
          <div style={{marginTop:3}}><StarRow rating={review.rating} size={11}/></div>
        </div>
      </div>

      <p style={{margin:"10px 0 0", fontSize:12.5, lineHeight:1.75, fontStyle:"italic",
        color:"var(--text-secondary)", fontFamily:"'Lora',Georgia,serif"}}>
        {review.text}
      </p>

      {review.photoUrl && (
        <div style={{marginTop:10, borderRadius:8, overflow:"hidden"}}>
          <img src={review.photoUrl} alt="" style={{width:"100%", maxHeight:180, objectFit:"cover", display:"block"}}/>
        </div>
      )}

      {review.managerReply?.text && (
        <div style={{marginTop:10, padding:"8px 10px", background:"var(--reply-bg)",
          border:"1px solid var(--reply-border)", borderLeft:"3px solid var(--accent)", borderRadius:8}}>
          <div style={{fontSize:8.5, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", color:"var(--accent)", marginBottom:4}}>
            ☕ Cafe response
          </div>
          <p style={{margin:0, fontSize:12, lineHeight:1.6, color:"var(--text-secondary)"}}>
            {review.managerReply.text}
          </p>
        </div>
      )}

      <div style={{marginTop:10, paddingTop:9, borderTop:"1px solid var(--divider)", display:"flex", alignItems:"center", gap:6}}>
        <button onClick={handleLike} style={{
          display:"flex", alignItems:"center", gap:4, padding:"3px 8px", borderRadius:7,
          background: liked?"var(--like-active-bg)":"var(--like-bg)",
          border:`1px solid ${liked?"var(--accent-border)":"var(--divider)"}`,
          color: liked?"var(--accent)":"var(--text-muted)",
          fontSize:11, fontWeight:600, cursor: isGuest?"default":"pointer",
          outline:"none", transition:"all 0.18s",
        }}>
          <span className="like-heart" style={{fontSize:12, lineHeight:1}}>{liked?"♥":"♡"}</span>
          <span>{fmt(review.likes??0)}</span>
        </button>
        <span style={{marginLeft:"auto", fontSize:9.5, color:"var(--text-muted)", fontWeight:500}}>
          {review.rating}/5
        </span>
      </div>
    </div>
  );
});
ReviewCard.displayName = "ReviewCard";

// ── Review modal (write / edit) ────────────────────────────────────────────────
const ReviewModal = ({isOpen, onClose, existing, onSubmit, submitting, submitError}) => {
  // Seed immediately from existing — fixes stale-on-mount bug
  const [rating, setRating] = useState(() => existing?.rating ?? 0);
  const [text,   setText]   = useState(() => existing?.text   ?? "");

  const overlayRef  = useRef(null);
  const panelRef    = useRef(null);
  const textareaRef = useRef(null);
  const dispatch    = useDispatch();

  // Re-seed whenever target review or open state changes
  useEffect(() => {
    setRating(existing?.rating ?? 0);
    setText(existing?.text   ?? "");
    if (submitError) dispatch(clearSubmitError());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?._id, isOpen]);

  // Animate textarea content in when editing
  useEffect(() => {
    if (!isOpen || !textareaRef.current || !existing?.text) return;
    gsap.fromTo(textareaRef.current,
      {opacity:0, y:6},
      {opacity:1, y:0, duration:0.3, ease:"power2.out", delay:0.25});
  }, [isOpen, existing?._id]);

  // Slide-up animation
  useEffect(() => {
    if (!isOpen || !overlayRef.current || !panelRef.current) return;
    gsap.fromTo(overlayRef.current, {opacity:0}, {opacity:1, duration:0.22, ease:"power2.out"});
    gsap.fromTo(panelRef.current,   {y:"100%"},  {y:"0%",  duration:0.42, ease:"power3.out"});
  }, [isOpen]);

  const dismiss = useCallback(() => {
    if (!overlayRef.current || !panelRef.current) { onClose(); return; }
    gsap.to(panelRef.current,   {y:"100%",  duration:0.3,  ease:"power3.in"});
    gsap.to(overlayRef.current, {opacity:0, duration:0.24, ease:"power2.in", onComplete:onClose});
  }, [onClose]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!rating || text.trim().length < MIN_CHARS) return;
    const ok = await onSubmit({rating, text:text.trim()});
    if (ok) {
      // Success flash animation before closing
      if (panelRef.current) {
        gsap.to(panelRef.current, {
          boxShadow:"0 -24px 60px rgba(56,189,248,0.3)",
          duration:0.2, yoyo:true, repeat:1,
          onComplete: dismiss,
        });
      } else {
        dismiss();
      }
    }
  }, [rating, text, onSubmit, dismiss]);

  const chars   = text.length;
  const over    = chars > MAX_CHARS;
  const canPost = rating>0 && chars>=MIN_CHARS && !over && !submitting;

  if (!isOpen) return null;
  return (
    <div ref={overlayRef}
      onClick={e => e.target===overlayRef.current && dismiss()}
      style={{
        position:"fixed", inset:0, zIndex:1000,
        display:"flex", flexDirection:"column", justifyContent:"flex-end",
        background:"rgba(0,0,0,0.58)", backdropFilter:"blur(8px)",
      }}>
      <div ref={panelRef} style={{
        width:"100%", maxWidth:520, margin:"0 auto",
        background:"var(--modal-bg)", border:"1px solid var(--card-border)",
        borderRadius:"20px 20px 0 0", padding:"0 20px 36px",
        boxShadow:"0 -24px 60px rgba(0,0,0,0.4)",
        maxHeight:"92dvh", overflowY:"auto",
      }}>
        {/* Drag handle */}
        <div style={{width:36, height:4, borderRadius:99, background:"var(--divider)", margin:"12px auto 20px"}}/>

        {/* Title row */}
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22}}>
          <div>
            <h2 style={{margin:0, fontSize:16, fontWeight:800, color:"var(--text-primary)", fontFamily:"'Sora',sans-serif"}}>
              {existing ? "Edit your review" : "Write a review"}
            </h2>
            {existing && (
              <p style={{margin:"3px 0 0", fontSize:10.5, color:"var(--text-muted)", fontWeight:500}}>
                Your review from {timeAgo(existing.createdAt)}
              </p>
            )}
          </div>
          <button onClick={dismiss} style={{
            width:28, height:28, borderRadius:8, display:"flex",
            alignItems:"center", justifyContent:"center",
            cursor:"pointer", outline:"none",
            background:"var(--pill-bg)", border:"1px solid var(--divider)",
            color:"var(--text-muted)", flexShrink:0,
          }}>
            <CloseIcon size={13}/>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Star picker — pre-filled when editing */}
          <div style={{marginBottom:22}}>
            <StarPicker value={rating} onChange={setRating}/>
          </div>

          {/* Textarea — pre-filled when editing */}
          <div style={{position:"relative", marginBottom:12}}>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e=>setText(e.target.value)}
              placeholder="Share your experience — what made it memorable?"
              rows={5}
              style={{
                width:"100%", boxSizing:"border-box",
                padding:"11px 12px 28px", borderRadius:12,
                background:"var(--input-bg)",
                border:`1.5px solid ${over?"var(--danger)":"var(--input-border)"}`,
                color:"var(--text-primary)", fontSize:13, lineHeight:1.72,
                fontFamily:"'Lora',Georgia,serif", resize:"none", outline:"none",
                transition:"border-color 0.2s",
              }}
              onFocus={e=>{e.target.style.borderColor=over?"var(--danger)":"var(--accent)";}}
              onBlur={e=>{e.target.style.borderColor=over?"var(--danger)":"var(--input-border)";}}
            />
            <span style={{
              position:"absolute", bottom:8, right:10, fontSize:10, fontWeight:600,
              color: over?"var(--danger)" : chars>MAX_CHARS*0.85?"#F59E0B":"var(--text-muted)",
            }}>
              {chars}/{MAX_CHARS}
            </span>
          </div>

          {submitError && (
            <div style={{padding:"9px 12px", borderRadius:9, marginBottom:12,
              background:"var(--error-bg)", border:"1px solid var(--danger)",
              color:"var(--danger)", fontSize:12, fontWeight:500}}>
              {submitError}
            </div>
          )}

          <button type="submit" disabled={!canPost}
            onMouseDown={e=>canPost&&(e.currentTarget.style.transform="scale(0.97)")}
            onMouseUp={e=>(e.currentTarget.style.transform="scale(1)")}
            style={{
              width:"100%", padding:"13px", border:"none", borderRadius:12,
              outline:"none", fontSize:13, fontWeight:700,
              fontFamily:"'Sora',sans-serif", letterSpacing:"0.01em",
              cursor: canPost?"pointer":"not-allowed",
              background: canPost
                ? "linear-gradient(135deg,var(--accent),var(--accent-dark))"
                : "var(--btn-disabled)",
              color: canPost?"#fff":"var(--text-muted)",
              boxShadow: canPost?"0 4px 16px var(--accent-glow)":"none",
              transition:"opacity 0.18s, transform 0.12s",
            }}>
            {submitting ? "Saving…" : existing ? "Update Review" : "Post Review"}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Delete modal ───────────────────────────────────────────────────────────────
const DeleteModal = ({isOpen, onClose, onConfirm, submitting}) => {
  const overlayRef = useRef(null);
  const panelRef   = useRef(null);
  useEffect(() => {
    if (!isOpen||!overlayRef.current||!panelRef.current) return;
    gsap.fromTo(overlayRef.current,{opacity:0},{opacity:1,duration:0.18});
    gsap.fromTo(panelRef.current,{scale:0.88,opacity:0,y:14},{scale:1,opacity:1,y:0,duration:0.3,ease:"back.out(2)"});
  },[isOpen]);
  const dismiss = useCallback(()=>{
    if(!overlayRef.current||!panelRef.current){onClose();return;}
    gsap.to(panelRef.current,  {scale:0.9,opacity:0,duration:0.17});
    gsap.to(overlayRef.current,{opacity:0,duration:0.17,onComplete:onClose});
  },[onClose]);
  if (!isOpen) return null;
  return (
    <div ref={overlayRef} onClick={e=>e.target===overlayRef.current&&dismiss()}
      style={{position:"fixed",inset:0,zIndex:1100,display:"flex",alignItems:"center",
        justifyContent:"center",padding:"0 20px",
        background:"rgba(0,0,0,0.65)",backdropFilter:"blur(8px)"}}>
      <div ref={panelRef} style={{width:"100%",maxWidth:310,textAlign:"center",
        background:"var(--modal-bg)",border:"1px solid var(--card-border)",
        borderRadius:20,padding:"26px 20px",boxShadow:"0 24px 60px rgba(0,0,0,0.5)"}}>
        <div style={{fontSize:40,lineHeight:1,marginBottom:12}}>🗑️</div>
        <h3 style={{margin:"0 0 8px",fontSize:15,fontWeight:800,color:"var(--text-primary)",fontFamily:"'Sora',sans-serif"}}>
          Delete review?
        </h3>
        <p style={{margin:"0 0 20px",fontSize:12,lineHeight:1.6,color:"var(--text-muted)"}}>
          This cannot be undone. Your review will be permanently removed.
        </p>
        <div style={{display:"flex",gap:8}}>
          <button onClick={dismiss} style={{flex:1,padding:"10px",borderRadius:10,
            background:"var(--pill-bg)",border:"1px solid var(--divider)",
            cursor:"pointer",fontSize:12,fontWeight:600,color:"var(--text-secondary)",
            fontFamily:"'Sora',sans-serif",outline:"none"}}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={submitting} style={{flex:1,padding:"10px",
            border:"none",borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:700,
            color:"#fff",fontFamily:"'Sora',sans-serif",outline:"none",
            background:"linear-gradient(135deg,#EF4444,#DC2626)",
            boxShadow:"0 4px 12px rgba(239,68,68,0.3)",opacity:submitting?0.7:1}}>
            {submitting?"Deleting…":"Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Empty state ────────────────────────────────────────────────────────────────
const EmptyState = ({onWrite, isGuest}) => {
  const ref = useRef(null);
  useEffect(()=>{
    if(!ref.current) return;
    gsap.fromTo(ref.current,{opacity:0,y:18},{opacity:1,y:0,duration:0.48,ease:"back.out(1.5)",delay:0.12});
  },[]);
  return (
    <div ref={ref} style={{textAlign:"center",padding:"48px 24px 36px"}}>
      <div style={{fontSize:44,lineHeight:1,marginBottom:12}}>☕</div>
      <h3 style={{margin:"0 0 8px",fontSize:15,fontWeight:800,color:"var(--text-primary)",fontFamily:"'Sora',sans-serif"}}>
        No reviews yet
      </h3>
      <p style={{margin:"0 0 20px",fontSize:13,color:"var(--text-muted)",lineHeight:1.6}}>
        Be the first to share your experience!
      </p>
      {!isGuest && (
        <button onClick={onWrite} className="cta-btn" style={{margin:"0 auto"}}>
          <WriteIcon size={13}/> Write the first review
        </button>
      )}
    </div>
  );
};

// ══ MAIN PAGE ══════════════════════════════════════════════════════════════════
export default function ReviewsPage() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const {isDark}   = useContext(ThemeContext);
  const D          = isDark;

  const currentUser = useSelector(selectUser);
  const isGuest     = useSelector(selectIsGuest);

  const selReviews    = useMemo(()=>selectReviewsForItem(CAFE_CONTEXT_ID),  []);
  const selSummary    = useMemo(()=>selectReviewSummary(CAFE_CONTEXT_ID),   []);
  const selPagination = useMemo(()=>selectReviewPagination(CAFE_CONTEXT_ID),[]);
  const selLoading    = useMemo(()=>selectReviewsLoading(CAFE_CONTEXT_ID),  []);
  const selHasMore    = useMemo(()=>selectReviewsHasMore(CAFE_CONTEXT_ID),  []);
  const selMine       = useMemo(()=>selectMyReview(CAFE_CONTEXT_ID),        []);

  const reviews    = useSelector(selReviews);
  const summary    = useSelector(selSummary);
  const pagination = useSelector(selPagination);
  const loading    = useSelector(selLoading);
  const hasMore    = useSelector(selHasMore);
  // myReview from selector — used ONLY for submit/edit ID logic (may be sparse)
  const myReview   = useSelector(selMine);
  const submitting  = useSelector(selectSubmitting);
  const submitError = useSelector(selectSubmitError);

  // ── APPROACH B: derive display review from the full reviews list ──────────────
  // The reviews list is populated server-side with full user data (name, avatar, date).
  // selectMyReview may only have _id/customerId — never use it for display.
  const myDisplayReview = useMemo(() => {
    if (!currentUser?._id || !reviews.length) return null;
    const uid = String(currentUser._id);
    return reviews.find(r => {
      const rid = r.customerId?._id
        ? String(r.customerId._id)
        : String(r.customerId ?? "");
      return rid === uid;
    }) ?? null;
  }, [reviews, currentUser?._id]);

  const [sort,         setSort]         = useState("recent");
  const [filter,       setFilter]       = useState(null);
  const [writeOpen,    setWriteOpen]    = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const editTargetRef = useRef(null);
  const headerRef     = useRef(null);
  const listRef       = useRef(null);
  const sentinelRef   = useRef(null);
  const scrollCtxRef  = useRef(null);

  // Fetch on sort/filter change
  useEffect(()=>{
    dispatch(fetchReviews({menuItemId:CAFE_CONTEXT_ID, page:1, sort, rating:filter??undefined}));
    if (!isGuest) dispatch(fetchMyReview(CAFE_CONTEXT_ID));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[sort, filter]);

  // Header entrance animation
  useEffect(()=>{
    if (!headerRef.current) return;
    gsap.fromTo(headerRef.current.querySelectorAll(".hdr-el"),
      {opacity:0, y:-10}, {opacity:1, y:0, stagger:0.04, duration:0.4, ease:"power3.out"});
  },[]);

  // Card stagger on load
  useEffect(()=>{
    if (!listRef.current||loading) return;
    const cards = listRef.current.querySelectorAll(".rev-card:not(.gsap-done)");
    if (!cards.length) return;
    gsap.fromTo(cards,
      {opacity:0, y:18, scale:0.98},
      {opacity:1, y:0,  scale:1, stagger:0.04, duration:0.38, ease:"back.out(1.4)"});
    cards.forEach(c=>c.classList.add("gsap-done"));
  },[reviews,loading]);

  // Scroll reveal
  useEffect(()=>{
    if (!listRef.current) return;
    scrollCtxRef.current = gsap.context(()=>{
      gsap.utils.toArray(".rev-card").forEach(card=>{
        ScrollTrigger.create({trigger:card, start:"top 94%", onEnter:()=>{
          if (!card.classList.contains("gsap-done")) {
            gsap.fromTo(card,{opacity:0,y:14},{opacity:1,y:0,duration:0.36,ease:"power3.out"});
            card.classList.add("gsap-done");
          }
        }});
      });
    }, listRef.current);
    return ()=>scrollCtxRef.current?.revert();
  },[reviews]);

  // Infinite scroll sentinel
  useEffect(()=>{
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(([entry])=>{
      if (entry.isIntersecting && hasMore && !loading)
        dispatch(fetchReviews({menuItemId:CAFE_CONTEXT_ID, page:(pagination?.page??1)+1, sort, rating:filter??undefined}));
    },{threshold:0.1});
    obs.observe(sentinelRef.current);
    return ()=>obs.disconnect();
  },[hasMore,loading,pagination,sort,filter,dispatch]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleLike = useCallback((id)=>{
    if (isGuest) return;
    dispatch(optimisticLike({reviewId:id, menuItemId:CAFE_CONTEXT_ID}));
    dispatch(likeReview({reviewId:id, menuItemId:CAFE_CONTEXT_ID}));
  },[isGuest,dispatch]);

  const handleEditOpen = useCallback((review)=>{
    // Always use the full-data review from the list for modal pre-fill
    editTargetRef.current = review;
    setEditTarget(review);
    setWriteOpen(true);
  },[]);

  const handleWriteOpen = useCallback(()=>{
    // If user already has a review, open edit mode with FULL display data
    if (myDisplayReview) { handleEditOpen(myDisplayReview); return; }
    editTargetRef.current = null;
    setEditTarget(null);
    setWriteOpen(true);
  },[myDisplayReview, handleEditOpen]);

  const handleModalClose = useCallback(()=>{
    editTargetRef.current = null;
    setWriteOpen(false);
    setEditTarget(null);
    dispatch(clearSubmitError());
  },[dispatch]);

  const handleSubmit = useCallback(async({rating, text})=>{
    dispatch(clearSubmitError());
    // Use editTargetRef (full data) for _id, fall back to myReview selector _id
    const target = editTargetRef.current || myReview || null;
    if (target?._id) {
      const res = await dispatch(editReview({
        reviewId:String(target._id), menuItemId:CAFE_CONTEXT_ID, rating, text,
      }));
      return editReview.fulfilled.match(res);
    }
    const cafeId = currentUser?.cafeId ?? import.meta.env.VITE_CAFE_ID ?? null;
    const res = await dispatch(submitReview({menuItemId:CAFE_CONTEXT_ID, cafeId, rating, text}));
    return submitReview.fulfilled.match(res);
  },[myReview,currentUser,dispatch]);

  const handleDelete = useCallback(async()=>{
    if (!deleteTarget) return;
    const res = await dispatch(removeReview({reviewId:deleteTarget._id, menuItemId:CAFE_CONTEXT_ID}));
    if (removeReview.fulfilled.match(res)) setDeleteTarget(null);
  },[deleteTarget,dispatch]);

  // Other reviews — exclude the current user's own review (shown separately above)
  const otherReviews = useMemo(()=>{
    if (!currentUser?._id) return reviews;
    const uid = String(currentUser._id);
    return reviews.filter(r => {
      const rid = r.customerId?._id
        ? String(r.customerId._id)
        : String(r.customerId ?? "");
      return rid !== uid;
    });
  },[reviews, currentUser?._id]);

  // ── Theme ─────────────────────────────────────────────────────────────────────
  const cssVars = D ? {
    "--bg":"#070C13","--card-bg":"rgba(12,20,32,0.97)","--modal-bg":"#0C1520",
    "--pill-bg":"rgba(255,255,255,0.06)","--pill-active-bg":"rgba(56,189,248,0.14)",
    "--card-border":"rgba(255,255,255,0.07)","--divider":"rgba(255,255,255,0.08)",
    "--input-bg":"rgba(255,255,255,0.04)","--input-border":"rgba(255,255,255,0.12)",
    "--text-primary":"#EFF6FF","--text-secondary":"#A8BDD8","--text-muted":"rgba(168,189,216,0.45)",
    "--accent":"#38BDF8","--accent-dark":"#0284C7","--accent-dim":"rgba(56,189,248,0.10)",
    "--accent-border":"rgba(56,189,248,0.24)","--accent-glow":"rgba(56,189,248,0.28)",
    "--like-bg":"rgba(255,255,255,0.05)","--like-active-bg":"rgba(56,189,248,0.11)",
    "--reply-bg":"rgba(56,189,248,0.05)","--reply-border":"rgba(56,189,248,0.14)",
    "--danger":"#F87171","--error-bg":"rgba(248,113,113,0.09)",
    "--btn-disabled":"rgba(255,255,255,0.07)","--header-bg":"rgba(7,12,19,0.93)",
    "--pill-border":"rgba(255,255,255,0.09)","--pill-active-border":"rgba(56,189,248,0.28)",
    "--tab-active":"#38BDF8","--tab-inactive":"rgba(168,189,216,0.38)",
  } : {
    "--bg":"#EEF5FF","--card-bg":"#FFFFFF","--modal-bg":"#FFFFFF",
    "--pill-bg":"rgba(14,165,233,0.07)","--pill-active-bg":"rgba(2,132,199,0.11)",
    "--card-border":"rgba(14,165,233,0.10)","--divider":"rgba(14,165,233,0.10)",
    "--input-bg":"#F6FAFF","--input-border":"rgba(14,165,233,0.20)",
    "--text-primary":"#0B1929","--text-secondary":"#2A4668","--text-muted":"rgba(42,70,104,0.48)",
    "--accent":"#0284C7","--accent-dark":"#0369A1","--accent-dim":"rgba(2,132,199,0.08)",
    "--accent-border":"rgba(2,132,199,0.20)","--accent-glow":"rgba(2,132,199,0.22)",
    "--like-bg":"rgba(14,165,233,0.07)","--like-active-bg":"rgba(2,132,199,0.10)",
    "--reply-bg":"rgba(2,132,199,0.04)","--reply-border":"rgba(2,132,199,0.12)",
    "--danger":"#EF4444","--error-bg":"rgba(239,68,68,0.08)",
    "--btn-disabled":"rgba(0,0,0,0.07)","--header-bg":"rgba(238,245,255,0.92)",
    "--pill-border":"rgba(14,165,233,0.14)","--pill-active-border":"rgba(2,132,199,0.28)",
    "--tab-active":"#0284C7","--tab-inactive":"rgba(42,70,104,0.35)",
  };

  const showEmpty = !loading && reviews.length===0 && !myDisplayReview;

  return (
    <div style={{...cssVars, minHeight:"100dvh", background:"var(--bg)", fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=Lora:ital,wght@1,400;1,500&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }

        .rev-card {
          background:var(--card-bg); border:1px solid var(--card-border);
          border-radius:13px; will-change:transform;
          transition:box-shadow 0.2s, border-color 0.2s;
        }
        .rev-card:hover { box-shadow:0 4px 20px rgba(0,0,0,0.13); border-color:var(--accent-border); }

        .icon-btn {
          display:flex; align-items:center; justify-content:center;
          width:26px; height:26px; border-radius:7px;
          background:var(--pill-bg); border:1px solid var(--pill-border);
          cursor:pointer; outline:none; flex-shrink:0;
          transition:background 0.13s, transform 0.1s;
        }
        .icon-btn:hover  { background:var(--like-active-bg); }
        .icon-btn:active { transform:scale(0.87); }

        .back-btn {
          display:flex; align-items:center; justify-content:center;
          width:30px; height:30px; border-radius:8px;
          background:transparent; border:none;
          cursor:pointer; outline:none; flex-shrink:0;
          color:var(--text-secondary);
          transition:background 0.13s, transform 0.1s;
          padding:0;
        }
        .back-btn:hover  { background:var(--pill-bg); }
        .back-btn:active { transform:scale(0.9); }

        .cta-btn {
          display:inline-flex; align-items:center; gap:5px;
          padding:6px 12px; border-radius:8px;
          background:linear-gradient(135deg,var(--accent),var(--accent-dark));
          color:#fff; border:none; cursor:pointer;
          font-size:11.5px; font-weight:700; font-family:'Sora',sans-serif;
          letter-spacing:0.01em; box-shadow:0 2px 10px var(--accent-glow);
          transition:opacity 0.15s, transform 0.11s; outline:none;
        }
        .cta-btn:active { transform:scale(0.94); opacity:0.9; }

        .sort-tab {
          background:none; border:none; border-bottom:2px solid transparent;
          padding:4px 1px 5px; font-size:12px; font-weight:600;
          color:var(--tab-inactive); cursor:pointer; outline:none;
          white-space:nowrap; transition:color 0.14s, border-color 0.14s;
          font-family:'DM Sans',system-ui,sans-serif;
        }
        .sort-tab:hover { color:var(--text-secondary); }
        .sort-tab.active { color:var(--tab-active); border-bottom-color:var(--tab-active); }

        .star-pill {
          display:inline-flex; align-items:center; gap:3px;
          padding:3px 7px; border-radius:6px;
          background:var(--pill-bg); border:1px solid var(--pill-border);
          font-size:10.5px; font-weight:600; color:var(--text-muted);
          cursor:pointer; outline:none; white-space:nowrap;
          transition:background 0.13s, border-color 0.13s, color 0.13s;
        }
        .star-pill:hover { background:var(--pill-active-bg); color:var(--text-secondary); }
        .star-pill.on { background:var(--pill-active-bg); border-color:var(--pill-active-border); color:var(--accent); }

        .skel {
          background:linear-gradient(90deg,var(--pill-bg) 0%,var(--divider) 50%,var(--pill-bg) 100%);
          background-size:200% 100%; animation:shimmer 1.4s linear infinite;
        }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        .rev-header {
          position:sticky; top:0; z-index:100;
          background:var(--header-bg);
          backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
          border-bottom:1px solid var(--divider);
        }

        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:var(--divider); border-radius:99px; }
      `}</style>

      {/* ══ HEADER ══ */}
      <header ref={headerRef} className="rev-header">
        {/* Row 1 */}
        <div style={{maxWidth:600, margin:"0 auto", display:"flex", alignItems:"center", gap:9, padding:"9px 13px"}}>
          <button className="hdr-el back-btn" onClick={()=>navigate(-1)}>
            <BackIcon size={14}/>
          </button>

          <div className="hdr-el" style={{flex:1, minWidth:0}}>
            <h1 style={{margin:0, fontSize:15, fontWeight:800, lineHeight:1, color:"var(--text-primary)", fontFamily:"'Sora',sans-serif"}}>
              Reviews
            </h1>
            {summary && (
              <div style={{display:"flex", alignItems:"center", gap:5, marginTop:3}}>
                <StarRow rating={summary.avg} size={9}/>
                <span style={{fontSize:9.5, color:"var(--text-muted)", fontWeight:500}}>
                  {summary.avg.toFixed(1)} · {fmt(summary.total)} total
                </span>
              </div>
            )}
          </div>

          {/* Show "Write" only when user has NO review yet */}
          {!isGuest && !myDisplayReview && (
            <button className="hdr-el cta-btn" onClick={handleWriteOpen}>
              <WriteIcon size={12}/>
              Write
            </button>
          )}
          {/* Show "Edit" only when user HAS a review — uses full display data */}
          {!isGuest && myDisplayReview && (
            <button className="hdr-el cta-btn" onClick={()=>handleEditOpen(myDisplayReview)}>
              <EditIcon size={12}/>
              Edit
            </button>
          )}
        </div>

        {/* Row 2: sort + filter */}
        <div style={{maxWidth:600, margin:"0 auto", display:"flex", alignItems:"center", gap:6,
          padding:"5px 13px 7px", borderTop:"1px solid var(--divider)", overflowX:"auto"}}>
          <button className={`sort-tab${sort==="recent"?" active":""}`} onClick={()=>setSort("recent")}>
            Recent
          </button>
          <button className={`sort-tab${sort==="top"?" active":""}`} onClick={()=>setSort("top")}>
            Top
          </button>
          <div style={{width:1, height:14, background:"var(--divider)", flexShrink:0, margin:"0 2px"}}/>
          {[5,4,3,2,1].map(s=>(
            <button key={s} className={`star-pill${filter===s?" on":""}`}
              onClick={()=>setFilter(filter===s?null:s)}>
              {s}<StarFillSvg size={8} color={filter===s?"var(--accent)":"#F59E0B"}/>
            </button>
          ))}
          {filter!==null && (
            <button className="star-pill" onClick={()=>setFilter(null)}
              style={{color:"var(--danger)", borderColor:"var(--danger)", background:"transparent"}}>
              ✕
            </button>
          )}
        </div>
      </header>

      {/* ══ MAIN ══ */}
      <main style={{maxWidth:600, margin:"0 auto", padding:"10px 11px 100px"}}>

        {summary && summary.total>0 && (
          <SummaryPanel summary={summary} activeFilter={filter} onFilter={s=>setFilter(s)}/>
        )}

        {/* MY REVIEW — pinned at top, sourced from full list data */}
        {!isGuest && myDisplayReview && (
          <MyReviewCard
            review={myDisplayReview}
            onEdit={handleEditOpen}
            onDelete={setDeleteTarget}
          />
        )}

        {/* "Write your review" nudge — only when user has NO review */}
        {!isGuest && !myDisplayReview && !loading && reviews.length>0 && (
          <div style={{display:"flex", alignItems:"center", gap:10, borderRadius:12,
            marginBottom:10, padding:"10px 13px",
            background:"var(--accent-dim)", border:"1px solid var(--accent-border)"}}>
            <span style={{fontSize:18}}>✍️</span>
            <div style={{flex:1}}>
              <p style={{margin:0, fontSize:12, fontWeight:700, color:"var(--text-primary)"}}>
                Enjoyed your visit?
              </p>
              <p style={{margin:"2px 0 0", fontSize:10.5, color:"var(--text-muted)"}}>
                Share your experience with others.
              </p>
            </div>
            <button className="cta-btn" style={{flexShrink:0}} onClick={handleWriteOpen}>
              Write
            </button>
          </div>
        )}

        {/* Other reviews list */}
        <div ref={listRef} style={{display:"flex", flexDirection:"column", gap:9}}>
          {loading && reviews.length===0 && Array(4).fill(0).map((_,i)=><SkeletonCard key={i}/>)}
          {showEmpty && <EmptyState onWrite={handleWriteOpen} isGuest={isGuest}/>}
          {otherReviews.map(r=>(
            <ReviewCard key={r._id} review={r}
              currentUser={currentUser} isGuest={isGuest}
              onLike={handleLike}/>
          ))}
          {loading && reviews.length>0 && (
            <div style={{textAlign:"center", padding:"12px 0", fontSize:10.5, color:"var(--text-muted)", fontWeight:500}}>
              Loading more…
            </div>
          )}
          <div ref={sentinelRef} style={{height:1}}/>
        </div>

        {!hasMore && reviews.length>3 && !loading && (
          <div style={{textAlign:"center", padding:"20px 0 4px", fontSize:10.5, color:"var(--text-muted)", fontWeight:500}}>
            — {fmt(reviews.length)} review{reviews.length!==1?"s":""} —
          </div>
        )}
      </main>

      {/* ══ MODALS ══ */}
      <ReviewModal
        isOpen={writeOpen}
        onClose={handleModalClose}
        existing={editTarget ?? (writeOpen && myDisplayReview ? myDisplayReview : null)}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitError={submitError}
      />
      <DeleteModal
        isOpen={!!deleteTarget}
        onClose={()=>setDeleteTarget(null)}
        onConfirm={handleDelete}
        submitting={submitting}
      />
    </div>
  );
}