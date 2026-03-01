// src/modules/customer/pages/LoginPage.jsx
import { useEffect, useRef, useState, useContext, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  checkUsername, registerWithUsername, loginWithUsername, loginAsGuest,
  selectAuthLoading, selectAuthError, clearError,
} from "@store/slices/authSlice";
import { selectTableNumber } from "@store/slices/tableSessionSlice";
import { ThemeContext } from "@shared/context/ThemeContext";
import { preloadSounds } from "@shared/utils/soundPlayer";
import { UserRound, ArrowRight, AtSign, Sparkles, Check, X, Shield } from "lucide-react";
import gsap from "gsap";

const BG = "https://res.cloudinary.com/dszy3sf5c/image/upload/v1771077596/friends_brc5cy.png";

/* ─── Animated Logo ─── */
const AnimatedLogo = ({ isDark: D }) => (
  <>
    <style>{`
      @keyframes lp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
      @keyframes lp-steam1{0%{opacity:0;transform:translateY(0) scaleX(1)}20%{opacity:.75}80%{opacity:.2}100%{opacity:0;transform:translateY(-22px) scaleX(1.5)}}
      @keyframes lp-steam2{0%{opacity:0;transform:translateY(0) scaleX(1)}20%{opacity:.6}80%{opacity:.15}100%{opacity:0;transform:translateY(-18px) scaleX(1.3)}}
      @keyframes lp-steam3{0%{opacity:0;transform:translateY(0) scaleX(1)}25%{opacity:.55}80%{opacity:.1}100%{opacity:0;transform:translateY(-20px) scaleX(1.4)}}
      @keyframes lp-cup-glow{0%,100%{filter:drop-shadow(0 0 6px rgba(255,159,28,.45)) drop-shadow(0 4px 18px rgba(0,0,0,.5))}50%{filter:drop-shadow(0 0 14px rgba(255,200,80,.75)) drop-shadow(0 4px 22px rgba(0,0,0,.55))}}
      @keyframes lp-brand-sweep{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
      @keyframes lp-brand-in{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes lp-line-in{from{transform:scaleX(0);opacity:0}to{transform:scaleX(1);opacity:1}}
      @keyframes lp-sub-in{from{opacity:0;letter-spacing:.35em}to{opacity:1;letter-spacing:.24em}}
      @keyframes lp-shimmer{0%{left:-100%}55%{left:160%}100%{left:160%}}
      @keyframes lp-spin{to{transform:rotate(360deg)}}
      @keyframes lp-badge-in{0%{transform:scale(0) rotate(-12deg);opacity:0}60%{transform:scale(1.15) rotate(3deg)}100%{transform:scale(1) rotate(0deg);opacity:1}}
      @keyframes lp-pulse-ring{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.9);opacity:0}}
      @keyframes lp-slide-up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      @keyframes lp-success-burst{0%{transform:scale(0);opacity:1}60%{transform:scale(1.3);opacity:.8}100%{transform:scale(2.2);opacity:0}}
      @keyframes lp-check-draw{from{stroke-dashoffset:24}to{stroke-dashoffset:0}}

      /* ── Stable input base — never changes, never causes remount ── */
      .lp-input {
        width:100%; padding:14px 44px 14px 42px; border-radius:14px;
        font-family:"DM Sans",system-ui,sans-serif; font-weight:500; font-size:15px;
        box-sizing:border-box; outline:none;
        transition:border-color 0.25s, box-shadow 0.25s, background 0.25s;
        -webkit-tap-highlight-color:transparent;
      }
      /* dark / light base */
      .lp-input-dark  { background:rgba(255,255,255,0.05); color:#FFF8EE; }
      .lp-input-light { background:rgba(255,255,255,0.75); color:#2A1A08; }
      /* placeholder */
      .lp-input-dark::placeholder  { color:rgba(255,185,90,0.28);  }
      .lp-input-light::placeholder { color:rgba(180,110,30,0.38);  }
      /* status border + shadow — swapped via className only, no inline style */
      .lp-input-idle-dark   { border:1px solid rgba(255,159,28,0.22); box-shadow:0 2px 12px rgba(0,0,0,0.25); }
      .lp-input-idle-light  { border:1px solid rgba(200,104,10,0.22); box-shadow:0 2px 8px rgba(92,51,23,0.08); }
      .lp-input-exists      { border:1px solid rgba(34,197,94,0.5);   box-shadow:0 0 0 3px rgba(34,197,94,0.12); }
      .lp-input-free        { border:1px solid rgba(99,179,237,0.5);  box-shadow:0 0 0 3px rgba(99,179,237,0.12); }
      .lp-input-invalid     { border:1px solid rgba(220,38,38,0.45);  box-shadow:none; }
      .lp-input-checking-dk { border:1px solid rgba(255,159,28,0.3);  box-shadow:none; }
      .lp-input-checking-lt { border:1px solid rgba(200,104,10,0.25); box-shadow:none; }

      .lp-cup-wrap{animation:lp-float 3.6s ease-in-out infinite,lp-cup-glow 3.2s ease-in-out infinite;transform-origin:center;will-change:transform,filter}
      .lp-steam-1{animation:lp-steam1 2.0s ease-out 0.3s infinite}
      .lp-steam-2{animation:lp-steam2 2.4s ease-out 0.9s infinite}
      .lp-steam-3{animation:lp-steam3 2.2s ease-out 1.5s infinite}
      .lp-brand-text{background:linear-gradient(120deg,#FFE8A0 0%,#FF9F1C 25%,#FFD580 50%,#E05C2A 75%,#FFE8A0 100%);background-size:250% 250%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:lp-brand-in .75s cubic-bezier(.22,.68,0,1.3) .35s both,lp-brand-sweep 5s ease-in-out 1.1s infinite;filter:drop-shadow(0 2px 12px rgba(0,0,0,.45))}
      .lp-brand-text-light{background:linear-gradient(120deg,#C8680A 0%,#E8892A 25%,#FF9F1C 50%,#C8680A 75%,#E8892A 100%);background-size:250% 250%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:lp-brand-in .75s cubic-bezier(.22,.68,0,1.3) .35s both,lp-brand-sweep 5s ease-in-out 1.1s infinite;filter:drop-shadow(0 2px 12px rgba(0,0,0,.25))}
      .lp-divider-line{transform-origin:center;animation:lp-line-in .6s ease-out .85s both}
      .lp-subtitle{animation:lp-sub-in .7s ease-out .9s both}
      .lp-badge-in{animation:lp-badge-in 0.45s cubic-bezier(.22,.68,0,1.3) both}
      .lp-slide-up{animation:lp-slide-up 0.35s ease-out both}
    `}</style>
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:22}}>
      <div style={{position:"relative",width:88,height:88,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
        <svg aria-hidden="true" width="64" height="30" viewBox="0 0 64 30" style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",overflow:"visible"}}>
          <path className="lp-steam-1" d="M20 28 Q16 20 20 14 Q24 8 20 2" stroke={D?"rgba(255,200,100,0.8)":"rgba(200,104,10,0.7)"} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          <path className="lp-steam-2" d="M32 28 Q28 18 32 12 Q36 6 32 0" stroke={D?"rgba(255,200,100,0.8)":"rgba(200,104,10,0.7)"} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          <path className="lp-steam-3" d="M44 28 Q40 20 44 14 Q48 8 44 2" stroke={D?"rgba(255,200,100,0.8)":"rgba(200,104,10,0.7)"} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        </svg>
        <div className="lp-cup-wrap" style={{position:"absolute",bottom:0}}>
          <svg width="80" height="64" viewBox="0 0 80 64" fill="none">
            <ellipse cx="40" cy="58" rx="34" ry="5" fill={D?"rgba(255,159,28,0.18)":"rgba(200,104,10,0.14)"}/>
            <ellipse cx="40" cy="56.5" rx="30" ry="3.5" fill="url(#saucerGrad)" stroke={D?"rgba(255,159,28,0.4)":"rgba(200,104,10,0.45)"} strokeWidth="0.8"/>
            <path d="M14 16 L20 52 Q20 56 40 56 Q60 56 60 52 L66 16 Z" fill="url(#cupBodyGrad)"/>
            <path d="M18 16 L23 48 Q23 52 40 52 Q57 52 57 48 L62 16 Z" fill="url(#cupInnerGrad)"/>
            <ellipse cx="40" cy="18" rx="26" ry="5" fill="url(#teaGrad)"/>
            <ellipse cx="40" cy="16" rx="26" ry="5" fill="url(#rimGrad)" stroke={D?"rgba(255,210,100,0.5)":"rgba(200,104,10,0.5)"} strokeWidth="1"/>
            <path d="M62 24 Q74 24 74 36 Q74 48 62 48" stroke="url(#handleGrad)" strokeWidth="5" strokeLinecap="round" fill="none"/>
            <path d="M22 22 Q24 38 25 48" stroke="rgba(255,255,255,0.18)" strokeWidth="3" strokeLinecap="round"/>
            <defs>
              <linearGradient id="saucerGrad" x1="10" y1="53" x2="70" y2="60" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={D?"#8B5E1A":"#B8742A"}/><stop offset="50%" stopColor={D?"#C4872A":"#D4922A"}/><stop offset="100%" stopColor={D?"#6B4010":"#8B5018"}/></linearGradient>
              <linearGradient id="cupBodyGrad" x1="14" y1="16" x2="66" y2="56" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={D?"#C4882A":"#D4942A"}/><stop offset="40%" stopColor={D?"#A06A1A":"#B87820"}/><stop offset="100%" stopColor={D?"#6B4010":"#8B5018"}/></linearGradient>
              <linearGradient id="cupInnerGrad" x1="18" y1="16" x2="62" y2="52" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={D?"#E09830":"#E8A030"} stopOpacity="0.6"/><stop offset="100%" stopColor={D?"#7B4A14":"#9B5C1A"} stopOpacity="0"/></linearGradient>
              <linearGradient id="teaGrad" x1="14" y1="13" x2="66" y2="23" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={D?"#8B5A14":"#7A4A0C"}/><stop offset="50%" stopColor={D?"#C47A1A":"#A86018"}/><stop offset="100%" stopColor={D?"#5A3A0C":"#4A2A08"}/></linearGradient>
              <linearGradient id="rimGrad" x1="14" y1="11" x2="66" y2="21" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={D?"#D4922A":"#D49030"}/><stop offset="50%" stopColor={D?"#FFD080":"#FFBD50"}/><stop offset="100%" stopColor={D?"#B07020":"#B07020"}/></linearGradient>
              <linearGradient id="handleGrad" x1="62" y1="24" x2="74" y2="48" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={D?"#C4882A":"#D4942A"}/><stop offset="100%" stopColor={D?"#7B4A14":"#9B5C1A"}/></linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      <div style={{textAlign:"center",marginTop:10}}>
        <h1 className={D?"lp-brand-text":"lp-brand-text-light"} style={{fontFamily:'"Noto Sans Devanagari",serif',fontWeight:900,fontSize:"clamp(30px,8vw,38px)",letterSpacing:"-0.022em",lineHeight:1.3,margin:"0 0 10px",paddingTop:6}}>कौसी चिया</h1>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
          <div className="lp-divider-line" style={{width:32,height:1,borderRadius:99,background:D?"linear-gradient(90deg,transparent,rgba(255,200,80,0.5))":"linear-gradient(90deg,transparent,rgba(200,104,10,0.45))"}}/>
          <p className="lp-subtitle" style={{fontFamily:'"DM Sans",system-ui,sans-serif',fontSize:10,fontWeight:700,letterSpacing:"0.24em",textTransform:"uppercase",color:D?"rgba(255,200,90,0.65)":"rgba(150,80,10,0.72)",margin:0}}>Smart Café · Kathmandu</p>
          <div className="lp-divider-line" style={{width:32,height:1,borderRadius:99,background:D?"linear-gradient(90deg,rgba(255,200,80,0.5),transparent)":"linear-gradient(90deg,rgba(200,104,10,0.45),transparent)"}}/>
        </div>
      </div>
    </div>
  </>
);

/* ─── Live badge ─── */
const UsernameBadge = ({ status, D }) => {
  if (!status) return null;
  const cfg = {
    checking:{bg:D?"rgba(255,159,28,0.12)":"rgba(200,104,10,0.08)",border:D?"rgba(255,159,28,0.25)":"rgba(200,104,10,0.2)",color:D?"#FFB84D":"#C8680A",icon:<span style={{width:12,height:12,borderRadius:"50%",border:"2px solid currentColor",borderTopColor:"transparent",display:"inline-block",animation:"lp-spin .7s linear infinite"}}/>,text:"Checking…"},
    exists:{bg:D?"rgba(34,197,94,0.1)":"rgba(21,128,61,0.08)",border:D?"rgba(34,197,94,0.3)":"rgba(21,128,61,0.2)",color:D?"#4ade80":"#15803d",icon:<Check size={11} strokeWidth={3}/>,text:"Found — logging you in!"},
    free:{bg:D?"rgba(99,179,237,0.1)":"rgba(37,99,235,0.07)",border:D?"rgba(99,179,237,0.3)":"rgba(37,99,235,0.18)",color:D?"#93c5fd":"#2563eb",icon:<Sparkles size={11}/>,text:"Username available!"},
    invalid:{bg:"rgba(220,38,38,0.07)",border:"rgba(220,38,38,0.22)",color:D?"#fca5a5":"#991b1b",icon:<X size={11} strokeWidth={3}/>,text:"Letters, numbers, _ . - only"},
  }[status];
  if (!cfg) return null;
  return (
    <div key={status} className="lp-badge-in" style={{display:"flex",alignItems:"center",gap:7,padding:"7px 11px",borderRadius:10,background:cfg.bg,border:`1px solid ${cfg.border}`,color:cfg.color,fontSize:12,fontWeight:600,fontFamily:'"DM Sans",system-ui,sans-serif',marginBottom:12}}>
      {cfg.icon}{cfg.text}
    </div>
  );
};

/* ─── Success Burst overlay ─── */
const SuccessBurst = ({ show, D }) => {
  if (!show) return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
      {[...Array(8)].map((_,i) => (
        <div key={i} style={{
          position:"absolute",width:8,height:8,borderRadius:"50%",
          background:i%2===0?"#FF9F1C":"#22c55e",
          top:"50%",left:"50%",
          transform:`rotate(${i*45}deg) translateY(-60px)`,
          animation:`lp-success-burst 0.7s ease-out ${i*0.05}s both`,
        }}/>
      ))}
      <div style={{width:72,height:72,borderRadius:"50%",background:"linear-gradient(135deg,#22c55e,#16a34a)",display:"flex",alignItems:"center",justifyContent:"center",animation:"lp-badge-in 0.4s cubic-bezier(.22,.68,0,1.3) both",boxShadow:"0 8px 40px rgba(34,197,94,0.5)"}}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M7 16 L13 22 L25 10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="24" strokeDashoffset="24" style={{animation:"lp-check-draw 0.35s ease-out 0.2s forwards"}}/>
        </svg>
      </div>
    </div>
  );
};

/* ─── Main ─── */
const LoginPage = () => {
  const dispatch    = useDispatch();
  const navigate    = useNavigate();
  const loading     = useSelector(selectAuthLoading);
  const error       = useSelector(selectAuthError);
  const tableNumber = useSelector(selectTableNumber);
  const { isDark }  = useContext(ThemeContext);
  const D = isDark;

  const logoRef     = useRef(null);
  const cardRef     = useRef(null);
  const inputRef    = useRef(null);
  const debounceRef = useRef(null);

  const [usernameInput,  setUsernameInput]  = useState('');
  const [localError,     setLocalError]     = useState('');
  const [guestLoading,   setGuestLoading]   = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [checkedValue,   setCheckedValue]   = useState('');
  const [showBurst,      setShowBurst]      = useState(false);
  const [isSubmitting,   setIsSubmitting]   = useState(false);

  useEffect(() => {
    const tl = gsap.timeline({ defaults:{ ease:"power3.out" } });
    if (logoRef.current) tl.fromTo(logoRef.current, { y:-22, opacity:0 }, { y:0, opacity:1, duration:0.8 }, 0);
    if (cardRef.current) tl.fromTo(cardRef.current, { y:50,  opacity:0 }, { y:0, opacity:1, duration:0.7 }, 0.25);
  }, []);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 400); }, []);
  useEffect(() => { dispatch(clearError()); return () => dispatch(clearError()); }, [dispatch]);

  /* ── Live debounced check ── */
  const doLiveCheck = useCallback(async (val) => {
    if (!val || val.length < 2) { setUsernameStatus(null); return; }
    if (!/^[a-z0-9_.-]+$/.test(val)) { setUsernameStatus('invalid'); return; }
    setUsernameStatus('checking');
    try {
      const result = await dispatch(checkUsername(val));
      if (result.meta.requestStatus === 'fulfilled') {
        const exists = result.payload?.exists ?? false;
        setUsernameStatus(exists ? 'exists' : 'free');
        setCheckedValue(val);
      } else {
        setUsernameStatus(null);
      }
    } catch { setUsernameStatus(null); }
  }, [dispatch]);

  const handleChange = (e) => {
    const val = e.target.value;
    setUsernameInput(val);
    setLocalError('');
    const lower = val.trim().toLowerCase();
    clearTimeout(debounceRef.current);
    if (!lower || lower.length < 2) { setUsernameStatus(null); return; }
    if (!/^[a-z0-9_.-]+$/.test(lower)) { setUsernameStatus('invalid'); return; }
    debounceRef.current = setTimeout(() => doLiveCheck(lower), 500);
  };

  /* ── Navigate helper ── */
  const goToMenu = (isNew) => {
    preloadSounds('customer');
    if (isNew) {
      navigate('/menu', { replace: true, state: { firstTimeUser: true } });
    } else {
      navigate('/menu', { replace: true });
    }
  };

  /* ── Submit: auto-login or register ── */
  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (isSubmitting) return;
    setLocalError('');
    dispatch(clearError());
    const val = usernameInput.trim().toLowerCase();

    if (!val || val.length < 2) { setLocalError('Please enter a username'); return; }
    if (!/^[a-z0-9_.-]+$/.test(val)) { setLocalError('Only letters, numbers, _ . - allowed'); return; }

    setIsSubmitting(true);

    let exists = null;
    if (checkedValue === val && (usernameStatus === 'exists' || usernameStatus === 'free')) {
      exists = usernameStatus === 'exists';
    } else {
      const checkResult = await dispatch(checkUsername(val));
      if (checkResult.meta.requestStatus === 'rejected') {
        setLocalError('Could not reach server — please try again');
        setIsSubmitting(false);
        return;
      }
      exists = checkResult.payload?.exists ?? false;
      setUsernameStatus(exists ? 'exists' : 'free');
      setCheckedValue(val);
    }

    if (exists) {
      const result = await dispatch(loginWithUsername(val));
      if (result.meta.requestStatus === 'rejected') {
        setLocalError(typeof result.payload === 'string' ? result.payload : 'Login failed');
        setIsSubmitting(false);
        return;
      }
      const payload = result.payload;
      const token = payload?.token ?? payload?.data?.token;
      if (!token) { setLocalError('Login failed — no token received'); setIsSubmitting(false); return; }
      localStorage.setItem('kc_token', token);
      setShowBurst(true);
      setTimeout(() => goToMenu(false), 900);
    } else {
      if (cardRef.current) {
        gsap.to(cardRef.current, { scale:0.97, duration:0.12, ease:"power2.in",
          onComplete: () => gsap.to(cardRef.current, { scale:1, duration:0.5, ease:"elastic.out(1.2,0.5)" })
        });
      }
      const result = await dispatch(registerWithUsername({ username: val, name: val }));
      if (result.meta.requestStatus === 'rejected') {
        setLocalError(typeof result.payload === 'string' ? result.payload : 'Registration failed');
        setIsSubmitting(false);
        return;
      }
      const payload = result.payload;
      const token = payload?.token ?? payload?.data?.token;
      if (!token) { setLocalError('Registration failed — no token received'); setIsSubmitting(false); return; }
      localStorage.setItem('kc_token', token);
      setShowBurst(true);
      setTimeout(() => goToMenu(true), 900);
    }
  };

  /* ── Guest ── */
  const handleGuest = async () => {
    setGuestLoading(true);
    const result = await dispatch(loginAsGuest());
    setGuestLoading(false);
    if (result.meta.requestStatus === 'rejected') {
      setLocalError(typeof result.payload === 'string' ? result.payload : 'Guest login failed');
      return;
    }
    const payload = result.payload;
    const token = payload?.token ?? payload?.data?.token;
    if (!token) { setLocalError('Guest login failed'); return; }
    localStorage.setItem('kc_token', token);
    preloadSounds('customer');
    navigate('/menu', { replace: true });
  };

  /* ── Staff login ── */
  const handleStaffLogin = () => {
    navigate('/staff/login');
  };

  const displayError = localError || error;
  const isLoading    = loading || isSubmitting;

  /* All input border/shadow state is expressed as a CSS className only.
     Zero inline style properties change on the <input> element itself —
     this is the only reliable way to prevent browsers from dropping the
     cursor/focus position on every keystroke. */
  const inputStatusClass =
    usernameStatus === 'exists'    ? 'lp-input-exists'
    : usernameStatus === 'free'    ? 'lp-input-free'
    : usernameStatus === 'invalid' ? 'lp-input-invalid'
    : usernameStatus === 'checking'? (D ? 'lp-input-checking-dk' : 'lp-input-checking-lt')
    : (D ? 'lp-input-idle-dark' : 'lp-input-idle-light');

  const iconColor = usernameStatus==='exists'
    ? D?"#4ade80":"#15803d"
    : usernameStatus==='free'
    ? D?"#93c5fd":"#2563eb"
    : D?"rgba(255,159,28,0.55)":"rgba(180,100,20,0.6)";  // ← warm amber in light mode

  const btnBg = usernameStatus==='exists'
    ?"linear-gradient(135deg,#22c55e 0%,#16a34a 100%)"
    :usernameStatus==='free'
    ?"linear-gradient(135deg,#60a5fa 0%,#2563eb 100%)"
    :"linear-gradient(135deg,#FF9F1C 0%,#E8612A 100%)";

  const btnShadow = usernameStatus==='exists'
    ?"0 6px 28px rgba(34,197,94,0.4)"
    :usernameStatus==='free'
    ?"0 6px 28px rgba(96,165,250,0.4)"
    :"0 6px 28px rgba(255,159,28,0.44)";

  const btnLabel = isLoading?"Please wait…"
    :usernameStatus==='exists'?"Sign in →"
    :usernameStatus==='free'?"Create account →"
    :"Continue";

  const canSubmit = !isLoading && !!usernameInput.trim() && usernameStatus !== 'invalid';

  return (
    <div style={{minHeight:"100dvh",display:"flex",flexDirection:"column",position:"relative",overflow:"hidden"}}>
      <SuccessBurst show={showBurst} D={D}/>

      <img src={BG} alt="" aria-hidden="true" style={{position:"fixed",inset:0,width:"100%",height:"100%",objectFit:"cover",zIndex:0,pointerEvents:"none",filter:D?"brightness(0.85) saturate(0.9)":"brightness(1.05) saturate(0.85)"}}/>
      <div aria-hidden="true" style={{position:"fixed",inset:0,zIndex:1,pointerEvents:"none",background:D?"linear-gradient(180deg,rgba(5,2,0,0.22) 0%,rgba(8,4,1,0.62) 65%,rgba(8,4,1,0.90) 100%)":"linear-gradient(180deg,rgba(240,234,214,0.12) 0%,rgba(240,234,214,0.72) 65%,rgba(240,234,214,0.95) 100%)"}}/>

      <div style={{position:"relative",zIndex:2,display:"flex",flexDirection:"column",minHeight:"100dvh",padding:"0 18px"}}>
        <div ref={logoRef} style={{paddingTop:"max(56px,calc(env(safe-area-inset-top) + 38px))",display:"flex",flexDirection:"column",alignItems:"center"}}>
          <AnimatedLogo isDark={D}/>
        </div>

        <div style={{flex:1}}/>

        <div ref={cardRef} style={{
          marginBottom:"max(28px,calc(env(safe-area-inset-bottom) + 20px))",
          borderRadius:28,overflow:"hidden",position:"relative",
          background:D?"rgba(9,5,1,0.82)":"rgba(250,246,234,0.86)",
          backdropFilter:"blur(42px) saturate(165%)",WebkitBackdropFilter:"blur(42px) saturate(165%)",
          border:D?"1px solid rgba(255,159,28,0.14)":"1px solid rgba(255,255,255,0.72)",
          boxShadow:D?"0 -1px 0 rgba(255,255,255,0.06) inset,0 32px 80px rgba(0,0,0,0.7)":"0 -1px 0 rgba(255,255,255,0.95) inset,0 24px 60px rgba(92,51,23,0.24)",
          padding:"26px 22px 24px",
        }}>
          <div style={{position:"absolute",top:0,left:"12%",right:"12%",height:1.5,borderRadius:99,background:"linear-gradient(90deg,transparent,#FF9F1C 28%,#FFD580 50%,#E05C2A 72%,transparent)",opacity:D?0.65:0.5}}/>

          {tableNumber && (
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:18,padding:"9px 16px",borderRadius:14,background:D?"rgba(255,159,28,0.08)":"rgba(255,159,28,0.1)",border:`1px solid ${D?"rgba(255,159,28,0.2)":"rgba(255,159,28,0.26)"}`}}>
              <span style={{fontSize:15}}>🪑</span>
              <span style={{fontSize:13,fontWeight:600,color:D?"#FFB84D":"#C8680A",fontFamily:'"DM Sans",system-ui,sans-serif'}}>Table {tableNumber} is ready for you</span>
            </div>
          )}

          {displayError && (
            <div className="lp-slide-up" style={{marginBottom:14,padding:"10px 14px",borderRadius:12,background:"rgba(220,38,38,0.07)",border:"1px solid rgba(220,38,38,0.2)",color:D?"#FCA5A5":"#991B1B",fontSize:13,fontFamily:'"DM Sans",system-ui,sans-serif'}}>
              {displayError}
            </div>
          )}

          <div style={{textAlign:"center",marginBottom:22}}>
            <h2 style={{fontFamily:'"Noto Sans Devanagari","DM Sans",system-ui,sans-serif',fontWeight:800,fontSize:"clamp(21px,5.5vw,25px)",letterSpacing:"-0.03em",color:D?"#FFF8EE":"#120D06",margin:"0 0 5px",lineHeight:1.2}}>स्वागत छ! 🙏</h2>
            <p style={{fontFamily:'"DM Sans",system-ui,sans-serif',fontSize:13,color:D?"rgba(240,196,110,0.52)":"rgba(92,51,23,0.5)",margin:0}}>Enter your username to sign in or register</p>
          </div>

          <form onSubmit={handleSubmit} autoComplete="off">
            <label style={{fontFamily:'"DM Sans",system-ui,sans-serif',fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:D?"rgba(255,200,90,0.55)":"rgba(150,80,10,0.65)",marginBottom:7,display:"block"}}>Username</label>
            <div style={{position:"relative",marginBottom:8}}>
              {/* FIX: icon color now uses warm amber in light mode to match palette */}
              <AtSign size={16} strokeWidth={2} style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",color:iconColor,pointerEvents:"none",transition:"color 0.25s"}}/>

              {/* FIX: className drives CSS-only styles (placeholder color etc.)
                  so the style object only contains things that must change with
                  usernameStatus — React will NOT remount the input because the
                  element type + ref are stable. */}
              <input
                ref={inputRef}
                className={`lp-input ${D ? 'lp-input-dark' : 'lp-input-light'} ${inputStatusClass}`}
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="your_username"
                value={usernameInput}
                onChange={handleChange}
                onKeyDown={e => e.key==='Enter' && handleSubmit()}
                disabled={isLoading}
              />

              {usernameStatus==='exists' && (
                <div style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)"}}>
                  <div style={{position:"relative",width:20,height:20,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <div style={{position:"absolute",width:"100%",height:"100%",borderRadius:"50%",background:"rgba(34,197,94,0.3)",animation:"lp-pulse-ring 1.2s ease-out infinite"}}/>
                    <Check size={13} color={D?"#4ade80":"#15803d"} strokeWidth={3}/>
                  </div>
                </div>
              )}
              {usernameStatus==='free'     && <div style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)"}}><Sparkles size={14} color={D?"#93c5fd":"#2563eb"}/></div>}
              {usernameStatus==='checking' && <div style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",width:14,height:14,borderRadius:"50%",border:`2px solid ${D?"rgba(255,159,28,0.4)":"rgba(200,104,10,0.3)"}`,borderTopColor:D?"#FF9F1C":"#C8680A",animation:"lp-spin .7s linear infinite"}}/>}
            </div>

            <UsernameBadge status={usernameStatus} D={D}/>

            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,
                padding:"15px 18px",borderRadius:16,marginBottom:14,border:"none",
                background:!canSubmit?(D?"rgba(255,159,28,0.2)":"rgba(200,104,10,0.15)"):btnBg,
                color:"#FFFFFF",fontFamily:'"DM Sans",system-ui,sans-serif',
                fontWeight:700,fontSize:15,minHeight:52,
                boxShadow:!canSubmit?"none":btnShadow,
                transition:"all 0.3s cubic-bezier(.22,.68,0,1.2)",
                WebkitTapHighlightColor:"transparent",
                position:"relative",overflow:"hidden",cursor:canSubmit?"pointer":"not-allowed",
                opacity:!canSubmit?0.45:1,
              }}
            >
              {isLoading && <span style={{width:16,height:16,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",animation:"lp-spin .7s linear infinite",flexShrink:0}}/>}
              {btnLabel}
              {!isLoading && <ArrowRight size={15} strokeWidth={2.5}/>}
            </button>
          </form>

          {/* ── OR divider ── */}
          <div style={{display:"flex",alignItems:"center",gap:10,margin:"0 0 14px"}}>
            <div style={{flex:1,height:1,background:D?"rgba(255,255,255,0.07)":"rgba(92,51,23,0.1)"}}/>
            <span style={{fontSize:11,fontWeight:600,letterSpacing:"0.07em",color:D?"rgba(255,196,100,0.3)":"rgba(92,51,23,0.32)",fontFamily:'"DM Sans",system-ui,sans-serif'}}>OR</span>
            <div style={{flex:1,height:1,background:D?"rgba(255,255,255,0.07)":"rgba(92,51,23,0.1)"}}/>
          </div>

          {/* ── Guest login ── */}
          <button
            onClick={handleGuest}
            disabled={isLoading||guestLoading}
            style={{
              width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,
              padding:"13px 18px",borderRadius:16,marginBottom:12,
              border:D?"1px solid rgba(255,255,255,0.1)":"1px solid rgba(0,0,0,0.07)",
              background:D?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.88)",
              color:D?"#FFF8EE":"#1A1208",
              fontFamily:'"DM Sans",system-ui,sans-serif',fontWeight:600,fontSize:14,
              cursor:"pointer",minHeight:48,
              opacity:(isLoading||guestLoading)?0.55:1,
              transition:"opacity 0.15s",
              WebkitTapHighlightColor:"transparent",
            }}
          >
            <UserRound size={16} strokeWidth={2.2}/>
            {guestLoading?"Setting up…":"Continue as Guest"}
          </button>

          {/* ── Staff login ── */}
          <button
            onClick={handleStaffLogin}
            disabled={isLoading}
            style={{
              width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8,
              padding:"11px 18px",borderRadius:16,marginBottom:16,
              border:D?"1px solid rgba(255,159,28,0.15)":"1px solid rgba(180,100,20,0.18)",
              background:"transparent",
              color:D?"rgba(255,184,77,0.7)":"rgba(150,80,10,0.65)",
              fontFamily:'"DM Sans",system-ui,sans-serif',fontWeight:600,fontSize:13,
              cursor:"pointer",minHeight:42,
              opacity:isLoading?0.45:1,
              transition:"opacity 0.15s, background 0.15s",
              WebkitTapHighlightColor:"transparent",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = D?"rgba(255,159,28,0.07)":"rgba(180,100,20,0.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <Shield size={14} strokeWidth={2}/>
            Staff Login
          </button>

          {/* ── Loyalty tip ── */}
          <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 13px",borderRadius:14,background:D?"rgba(255,159,28,0.06)":"rgba(255,242,205,0.8)",border:D?"1px solid rgba(255,159,28,0.12)":"1px solid rgba(228,182,78,0.35)"}}>
            <span style={{fontSize:14,flexShrink:0,marginTop:1}}>⭐</span>
            <div>
              <p style={{fontFamily:'"DM Sans",system-ui,sans-serif',fontWeight:700,fontSize:12,color:D?"#FFB84D":"#7A4A0A",margin:"0 0 2px"}}>Sign in to earn loyalty points</p>
              <p style={{fontFamily:'"DM Sans",system-ui,sans-serif',fontSize:11,color:D?"rgba(255,175,60,0.5)":"rgba(122,74,10,0.55)",margin:0,lineHeight:1.4}}>Bronze → Silver → Gold · Up to 15% off</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;