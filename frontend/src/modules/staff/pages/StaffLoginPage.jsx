// src/modules/staff/pages/StaffLoginPage.jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { useDispatch, useSelector }                  from 'react-redux'
import { useNavigate }                               from 'react-router-dom'
import {
  loginStaff,
  selectAuthLoading,
  selectAuthError,
  selectRole,
  selectIsLoggedIn,
  clearError,
} from '@store/slices/authSlice'
import { Lock, User, Eye, EyeOff, ArrowLeft, ShieldCheck, ChevronRight } from 'lucide-react'
import gsap from 'gsap'

/* ── Role → home path (mirrors ProtectedRoute / AppRoutes) ───────────────── */
const ROLE_HOME = {
  waiter:  '/waiter',
  kitchen: '/kitchen',
  cashier: '/cashier',
  manager: '/manager',
  admin:   '/admin',
}

/* ── Role badge config ───────────────────────────────────────────────────── */
const ROLE_META = {
  waiter:  { label: 'Waiter',  color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',  border: 'rgba(56,189,248,0.25)'  },
  kitchen: { label: 'Kitchen', color: '#fb923c', bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.25)'  },
  cashier: { label: 'Cashier', color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.25)'  },
  manager: { label: 'Manager', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)' },
  admin:   { label: 'Admin',   color: '#f43f5e', bg: 'rgba(244,63,94,0.1)',   border: 'rgba(244,63,94,0.25)'   },
}

/* ─────────────────────────────────────────────────────────────────────────── */
const StaffLoginPage = () => {
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const loading    = useSelector(selectAuthLoading)
  const apiError   = useSelector(selectAuthError)
  const isLoggedIn = useSelector(selectIsLoggedIn)
  const role       = useSelector(selectRole)

  /* If already logged in as staff, go straight to dashboard */
  useEffect(() => {
    if (isLoggedIn && role && role !== 'customer') {
      navigate(ROLE_HOME[role] ?? '/', { replace: true })
    }
  }, [isLoggedIn, role, navigate])

  const panelRef    = useRef(null)
  const logoRef     = useRef(null)
  const formRef     = useRef(null)
  const scanLineRef = useRef(null)

  /* Stable DOM refs for inputs — never replaced, cursor never lost */
  const usernameRef = useRef(null)
  const passwordRef = useRef(null)

  const [username,     setUsername]     = useState('')
  const [password,     setPassword]     = useState('')
  const [showPass,     setShowPass]     = useState(false)
  const [localError,   setLocalError]   = useState('')
  const [grantedRole,  setGrantedRole]  = useState(null)   // success badge
  const [isSubmitting, setIsSubmitting] = useState(false)

  /* ── GSAP entrance ── */
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    if (logoRef.current)
      tl.fromTo(logoRef.current,  { y: -28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0)
    if (panelRef.current)
      tl.fromTo(panelRef.current, { y: 44,  opacity: 0 }, { y: 0, opacity: 1, duration: 0.65 }, 0.18)
    if (formRef.current)
      tl.fromTo(formRef.current,  { y: 18,  opacity: 0 }, { y: 0, opacity: 1, duration: 0.5  }, 0.38)

    /* scan line */
    if (scanLineRef.current) {
      gsap.fromTo(scanLineRef.current,
        { top: '0%', opacity: 0.7 },
        { top: '100%', opacity: 0, duration: 2.4, repeat: -1, ease: 'none', delay: 1.2 }
      )
    }

    setTimeout(() => usernameRef.current?.focus(), 480)
    return () => { dispatch(clearError()) }
  }, []) // eslint-disable-line

  useEffect(() => { dispatch(clearError()) }, [username, password]) // eslint-disable-line

  const handleUsernameChange = useCallback((e) => {
    setUsername(e.target.value)
    setLocalError('')
  }, [])

  const handlePasswordChange = useCallback((e) => {
    setPassword(e.target.value)
    setLocalError('')
  }, [])

  /* ── Submit ─────────────────────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (isSubmitting || loading) return

    setLocalError('')
    if (!username.trim()) { setLocalError('Username is required');  return }
    if (!password)         { setLocalError('Password is required');  return }

    setIsSubmitting(true)

    const result = await dispatch(loginStaff({
      username: username.trim().toLowerCase(),
      password,
    }))

    if (result.meta.requestStatus === 'rejected') {
      setIsSubmitting(false)
      /* shake */
      if (panelRef.current) {
        gsap.timeline()
          .to(panelRef.current, { x: -10, duration: 0.07 })
          .to(panelRef.current, { x:  10, duration: 0.07 })
          .to(panelRef.current, { x:  -6, duration: 0.07 })
          .to(panelRef.current, { x:   6, duration: 0.07 })
          .to(panelRef.current, { x:   0, duration: 0.07 })
      }
      return
    }

    /* ── Success ── */
    const { token, user } = result.payload
    localStorage.setItem('kc_token', token)   // same key axios interceptor reads

    setGrantedRole(user.role)

    /* Animate out → navigate — ProtectedRoute takes over from here */
    setTimeout(() => {
      if (panelRef.current) {
        gsap.to(panelRef.current, {
          scale: 1.03, opacity: 0, duration: 0.4, ease: 'power2.in',
          onComplete: () => navigate(ROLE_HOME[user.role] ?? '/', { replace: true }),
        })
      } else {
        navigate(ROLE_HOME[user.role] ?? '/', { replace: true })
      }
    }, 650)
  }

  const displayError = localError || apiError
  const isBusy       = loading || isSubmitting

  /* ── Input class helper — all border/bg via className, zero inline style ── */
  const inputClass = (hasValue) =>
    `sl-input ${hasValue ? 'sl-input-filled' : 'sl-input-base'} ${displayError ? 'sl-input-error' : ''}`

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#07090B', position: 'relative', overflow: 'hidden',
      padding: '24px 18px',
      fontFamily: '"DM Sans", system-ui, sans-serif',
    }}>
      <style>{`
        @keyframes sl-grid   { 0%,100%{opacity:.03} 50%{opacity:.058} }
        @keyframes sl-pulse  { 0%,100%{opacity:.16} 50%{opacity:.30}  }
        @keyframes sl-spin   { to{transform:rotate(360deg)} }
        @keyframes sl-in     { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sl-badge  { 0%{transform:scale(0) translateY(6px);opacity:0} 70%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }

        /* ── Input: all state via className — cursor never drops ── */
        .sl-input {
          width:100%; padding:13px 42px 13px 40px; border-radius:12px;
          font-family:"DM Sans",system-ui,sans-serif; font-size:14px; font-weight:500;
          box-sizing:border-box; outline:none;
          transition:border-color 0.22s, box-shadow 0.22s;
          -webkit-tap-highlight-color:transparent;
          caret-color:#38bdf8;
        }
        .sl-input-base {
          background:rgba(255,255,255,0.04); color:#E8F0F8;
          border:1px solid rgba(255,255,255,0.09);
          box-shadow:inset 0 1px 3px rgba(0,0,0,0.3);
        }
        .sl-input-base::placeholder { color:rgba(148,183,210,0.3); }
        .sl-input-base:focus {
          border-color:rgba(56,189,248,0.45);
          box-shadow:0 0 0 3px rgba(56,189,248,0.1),inset 0 1px 3px rgba(0,0,0,0.3);
        }
        .sl-input-filled {
          background:rgba(56,189,248,0.04); color:#E8F0F8;
          border:1px solid rgba(56,189,248,0.2);
          box-shadow:inset 0 1px 3px rgba(0,0,0,0.3);
        }
        .sl-input-filled::placeholder { color:rgba(148,183,210,0.3); }
        .sl-input-filled:focus {
          border-color:rgba(56,189,248,0.5);
          box-shadow:0 0 0 3px rgba(56,189,248,0.1),inset 0 1px 3px rgba(0,0,0,0.3);
        }
        .sl-input-error {
          border-color:rgba(244,63,94,0.45) !important;
          box-shadow:0 0 0 3px rgba(244,63,94,0.09) !important;
        }
        .sl-back:hover { background:rgba(255,255,255,0.06) !important; }
        .sl-in   { animation:sl-in   0.3s ease-out both; }
        .sl-badge{ animation:sl-badge 0.42s cubic-bezier(.22,.68,0,1.3) both; }
      `}</style>

      {/* Grid bg */}
      <div aria-hidden style={{
        position:'fixed',inset:0,zIndex:0,pointerEvents:'none',
        backgroundImage:`linear-gradient(rgba(56,189,248,0.04) 1px,transparent 1px),
                         linear-gradient(90deg,rgba(56,189,248,0.04) 1px,transparent 1px)`,
        backgroundSize:'44px 44px',
        animation:'sl-grid 7s ease-in-out infinite',
      }}/>

      {/* Orbs */}
      <div aria-hidden style={{
        position:'fixed',top:'-12%',right:'-10%',width:400,height:400,borderRadius:'50%',
        background:'radial-gradient(circle,rgba(56,189,248,0.11) 0%,transparent 68%)',
        filter:'blur(52px)',pointerEvents:'none',zIndex:0,
        animation:'sl-pulse 5s ease-in-out infinite',
      }}/>
      <div aria-hidden style={{
        position:'fixed',bottom:'-14%',left:'-12%',width:340,height:340,borderRadius:'50%',
        background:'radial-gradient(circle,rgba(167,139,250,0.09) 0%,transparent 68%)',
        filter:'blur(48px)',pointerEvents:'none',zIndex:0,
      }}/>

      {/* ── Logo ── */}
      <div ref={logoRef} style={{textAlign:'center',marginBottom:28,position:'relative',zIndex:10}}>
        <div style={{position:'relative',width:64,height:64,margin:'0 auto 14px',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{
            position:'absolute',inset:-8,borderRadius:'50%',
            background:'radial-gradient(circle,rgba(56,189,248,0.2) 0%,transparent 70%)',
            filter:'blur(12px)',animation:'sl-pulse 3s ease-in-out infinite',
          }}/>
          <div style={{
            width:64,height:64,borderRadius:18,
            background:'linear-gradient(135deg,rgba(56,189,248,0.14) 0%,rgba(56,189,248,0.04) 100%)',
            border:'1px solid rgba(56,189,248,0.22)',
            display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
          }}>
            <ShieldCheck
              size={28}
              color={grantedRole ? '#4ade80' : '#38bdf8'}
              strokeWidth={1.8}
              style={{transition:'color 0.35s'}}
            />
          </div>
        </div>
        <h1 style={{fontSize:'clamp(22px,5.5vw,26px)',fontWeight:800,letterSpacing:'-0.03em',color:'#E8F4FF',margin:'0 0 4px',lineHeight:1.2}}>
          Staff Portal
        </h1>
        <p style={{fontSize:11,fontWeight:600,letterSpacing:'0.22em',textTransform:'uppercase',color:'rgba(56,189,248,0.4)',margin:0}}>
          कौसी चिया · Secure Access
        </p>
      </div>

      {/* ── Panel ── */}
      <div ref={panelRef} style={{
        width:'100%',maxWidth:360,position:'relative',zIndex:10,
        borderRadius:22,overflow:'hidden',
        background:'rgba(9,13,17,0.9)',
        backdropFilter:'blur(40px) saturate(140%)',
        WebkitBackdropFilter:'blur(40px) saturate(140%)',
        border:'1px solid rgba(255,255,255,0.07)',
        boxShadow:'0 32px 80px rgba(0,0,0,0.75),0 0 0 1px rgba(56,189,248,0.05)',
      }}>
        {/* Scan line */}
        <div ref={scanLineRef} aria-hidden style={{
          position:'absolute',left:0,right:0,height:1,top:'0%',
          background:'linear-gradient(90deg,transparent 0%,rgba(56,189,248,0.55) 50%,transparent 100%)',
          pointerEvents:'none',zIndex:20,
        }}/>
        {/* Top accent */}
        <div style={{
          position:'absolute',top:0,left:'10%',right:'10%',height:1,borderRadius:99,
          background:'linear-gradient(90deg,transparent,rgba(56,189,248,0.45) 40%,rgba(167,139,250,0.35) 60%,transparent)',
        }}/>

        <div ref={formRef} style={{padding:'28px 24px 24px'}}>

          {/* Success badge */}
          {grantedRole && ROLE_META[grantedRole] && (
            <div className="sl-badge" style={{
              display:'flex',alignItems:'center',gap:8,
              padding:'9px 14px',borderRadius:10,marginBottom:18,
              background:ROLE_META[grantedRole].bg,
              border:`1px solid ${ROLE_META[grantedRole].border}`,
              color:ROLE_META[grantedRole].color,
              fontSize:13,fontWeight:700,
            }}>
              <ShieldCheck size={14} strokeWidth={2.5}/>
              {ROLE_META[grantedRole].label} — Access granted
              <ChevronRight size={14} style={{marginLeft:'auto'}}/>
            </div>
          )}

          {/* Error */}
          {displayError && !grantedRole && (
            <div className="sl-in" style={{
              marginBottom:16,padding:'10px 14px',borderRadius:10,
              background:'rgba(244,63,94,0.08)',border:'1px solid rgba(244,63,94,0.22)',
              color:'#fda4af',fontSize:13,fontWeight:500,
              display:'flex',alignItems:'flex-start',gap:8,
            }}>
              <span style={{flexShrink:0,marginTop:1}}>⚠</span>
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off" noValidate>

            {/* Username */}
            <div style={{marginBottom:14}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(148,183,210,0.5)',marginBottom:7}}>
                Username
              </label>
              <div style={{position:'relative'}}>
                <User size={15} strokeWidth={2} style={{
                  position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',
                  color:username?'rgba(56,189,248,0.55)':'rgba(148,183,210,0.28)',
                  pointerEvents:'none',transition:'color 0.2s',
                }}/>
                <input
                  ref={usernameRef}
                  className={inputClass(username)}
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="your_username"
                  value={username}
                  onChange={handleUsernameChange}
                  onKeyDown={e => e.key === 'Enter' && passwordRef.current?.focus()}
                  disabled={isBusy || !!grantedRole}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{marginBottom:22}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(148,183,210,0.5)',marginBottom:7}}>
                Password
              </label>
              <div style={{position:'relative'}}>
                <Lock size={15} strokeWidth={2} style={{
                  position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',
                  color:password?'rgba(56,189,248,0.55)':'rgba(148,183,210,0.28)',
                  pointerEvents:'none',transition:'color 0.2s',
                }}/>
                <input
                  ref={passwordRef}
                  className={inputClass(password)}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={handlePasswordChange}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  disabled={isBusy || !!grantedRole}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',
                    background:'none',border:'none',padding:4,cursor:'pointer',
                    color:'rgba(148,183,210,0.32)',display:'flex',alignItems:'center',
                  }}
                >
                  {showPass ? <EyeOff size={15} strokeWidth={2}/> : <Eye size={15} strokeWidth={2}/>}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isBusy || !!grantedRole}
              style={{
                width:'100%',padding:'14px 20px',borderRadius:14,border:'none',
                cursor: isBusy || grantedRole ? 'not-allowed' : 'pointer',
                background: grantedRole
                  ? 'linear-gradient(135deg,#22c55e 0%,#16a34a 100%)'
                  : isBusy
                  ? 'rgba(56,189,248,0.18)'
                  : 'linear-gradient(135deg,#0ea5e9 0%,#2563eb 100%)',
                color:'#fff',
                fontFamily:'"DM Sans",system-ui,sans-serif',
                fontWeight:700,fontSize:15,minHeight:50,
                display:'flex',alignItems:'center',justifyContent:'center',gap:9,
                boxShadow: isBusy || grantedRole ? 'none' : '0 6px 28px rgba(14,165,233,0.32)',
                transition:'all 0.25s',
                opacity: isBusy && !grantedRole ? 0.6 : 1,
              }}
            >
              {isBusy && !grantedRole && (
                <span style={{width:16,height:16,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'sl-spin 0.7s linear infinite',flexShrink:0}}/>
              )}
              {grantedRole ? '✓ Redirecting…' : isBusy ? 'Verifying…' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div style={{display:'flex',alignItems:'center',gap:10,margin:'20px 0 14px'}}>
            <div style={{flex:1,height:1,background:'rgba(255,255,255,0.06)'}}/>
            <span style={{fontSize:10,fontWeight:600,letterSpacing:'0.08em',color:'rgba(148,183,210,0.2)'}}>NOT STAFF?</span>
            <div style={{flex:1,height:1,background:'rgba(255,255,255,0.06)'}}/>
          </div>

          {/* Back */}
          <button
            onClick={() => navigate('/login')}
            className="sl-back"
            style={{
              width:'100%',padding:'12px 16px',borderRadius:12,
              border:'1px solid rgba(255,255,255,0.07)',background:'transparent',
              color:'rgba(148,183,210,0.45)',
              fontFamily:'"DM Sans",system-ui,sans-serif',fontWeight:600,fontSize:13,
              display:'flex',alignItems:'center',justifyContent:'center',gap:8,
              cursor:'pointer',transition:'background 0.18s',
              WebkitTapHighlightColor:'transparent',
            }}
          >
            <ArrowLeft size={14} strokeWidth={2.2}/>
            Back to Customer Login
          </button>

          <p style={{textAlign:'center',marginTop:16,fontSize:10,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(56,189,248,0.15)'}}>
            🔒 Encrypted · Staff Only
          </p>
        </div>
      </div>

      {/* Footer */}
      <p style={{marginTop:22,position:'relative',zIndex:10,fontSize:10,fontWeight:600,letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(56,189,248,0.11)'}}>
        Powered by ConvoS
      </p>
    </div>
  )
}

export default StaffLoginPage