// frontend/src/modules/customer/pages/LoginPage.jsx
// ─── NEXARA — Premium Login ───────────────────────────────────────────────────
// Mobile-first, pixel-perfect. No emoji — SVG icons only.
// Desktop: split layout. Mobile: stacked hero + card.
// GSAP cinematic entrance. All auth logic identical.

import { useEffect, useRef, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  checkUsername, loginUser, registerUser,
  guestLogin, forgotPasscode, verifyOtp,
  selectAuthLoading, selectAuthError, selectBlockState,
  clearError, clearBlockState,
} from '@store/slices/authSlice'
import { selectTableNumber, selectSession, fetchActiveSession } from '@store/slices/tableSessionSlice'
import { selectVenueCafeId, selectVenueMode, selectVenueName } from '@store/slices/venueSlice'
import { persistSession } from '@modules/table/hooks/tableSession.utils'
import { preloadSounds } from '@shared/utils/soundPlayer'
import { BRAND, FONTS } from '@shared/config/brand'
import gsap from 'gsap'

/* ═══ BG VARIANTS ══════════════════════════════════════════════════════════ */
const BGS = [
  { a:'radial-gradient(ellipse at 40% 55%,#0d4a3a 0%,#062b22 40%,#020f0a 100%)',b:'radial-gradient(ellipse at 70% 30%,rgba(0,80,55,0.55) 0%,transparent 60%)',c:'radial-gradient(ellipse at 20% 80%,rgba(0,60,45,0.4) 0%,transparent 50%)'},
  { a:'radial-gradient(ellipse at 38% 58%,#0e5236 0%,#072e1e 40%,#020e08 100%)',b:'radial-gradient(ellipse at 72% 28%,rgba(8,90,50,0.52) 0%,transparent 58%)',c:'radial-gradient(ellipse at 18% 78%,rgba(5,65,38,0.38) 0%,transparent 52%)'},
  { a:'radial-gradient(ellipse at 45% 50%,#0a4040 0%,#052828 40%,#010d0d 100%)',b:'radial-gradient(ellipse at 65% 25%,rgba(0,70,70,0.5) 0%,transparent 60%)',c:'radial-gradient(ellipse at 25% 75%,rgba(0,55,55,0.4) 0%,transparent 55%)'},
]
const BG = BGS[Math.floor(Math.random() * BGS.length)]

/* ═══ SVG ICONS (no emoji anywhere) ════════════════════════════════════════ */
const SvgWave = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <path d="M6 22c2-3 4-5 6-5s4 4 6 4 4-6 6-6 3 2 4 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="8" cy="10" r="2" fill="currentColor" opacity="0.4"/>
    <circle cx="24" cy="8" r="1.5" fill="currentColor" opacity="0.3"/>
    <path d="M14 6l2-2 2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
  </svg>
)
const SvgLock = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="6" y="12" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M10 12V9a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="14" cy="18.5" r="1.5" fill="currentColor"/>
  </svg>
)
const SvgCheck = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M9 14.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const IArrow=()=><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4.5 12.5 8 9 11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
const IUser=()=><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M2.5 13.5C2.5 11 5 9 8 9s5.5 2 5.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
const IShield=()=><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5L12 3.5V7.5C12 10 9.5 12 7 13 4.5 12 2 10 2 7.5V3.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M5 7l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
const IStar=()=><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5l1.6 3.8H13l-3.2 2.6 1.1 4.1L7 9.6 3.1 12l1.1-4.1L1 5.3h4.4L7 1.5z" fill="#0a6640"/></svg>
const IBack=()=><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
const IEye=({open})=>open?<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1.5 8C3 4.5 5 3 8 3s5 1.5 6.5 5c-1.5 3.5-3.5 5-6.5 5S3 11.5 1.5 8z" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/></svg>:<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M6.5 6.7A2 2 0 009.3 9.5M4.5 4.7C2.8 5.8 1.9 6.9 1.5 8c1.5 3.5 3.5 5 6.5 5 1.4 0 2.6-.4 3.6-1M6 3.2C6.6 3.1 7.3 3 8 3c3 0 5 1.5 6.5 5-.4.9-.9 1.7-1.5 2.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
const ILock=()=><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="3" y="6" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 6V4.5a2 2 0 014 0V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
const IX=()=><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
const Spin=({sz=14,dk=false})=><span className="inline-block shrink-0 animate-spin" style={{width:sz,height:sz,borderRadius:'50%',border:`2px solid ${dk?'rgba(5,45,30,.2)':'rgba(255,255,255,.25)'}`,borderTopColor:dk?'#0a3d28':'#fff'}}/>

/* ═══ PIN DOTS ═════════════════════════════════════════════════════════════ */
const PinDots = ({ length }) => (
  <div className="flex items-center justify-center gap-3.5 my-5">
    {[0,1,2,3].map(i => (
      <div key={i} className="transition-all duration-200 ease-out" style={{
        width: length > i ? 15 : 12,
        height: length > i ? 15 : 12,
        borderRadius: '50%',
        background: length > i ? '#059669' : 'transparent',
        border: length > i ? '2px solid #059669' : '2px solid rgba(10,50,36,.18)',
        boxShadow: length > i ? '0 0 12px rgba(5,150,105,.4)' : 'none',
      }} />
    ))}
  </div>
)

/* ═══ PIN KEYPAD ══════════════════════════════════════════════════════════ */
const KEYS = ['1','2','3','4','5','6','7','8','9','','0','del']
const PinKeypad = ({ onKey, disabled }) => (
  <div className="grid grid-cols-3 gap-2 w-full max-w-[250px] mx-auto">
    {KEYS.map((k, i) => {
      if (k === '') return <div key={i} />
      const isDel = k === 'del'
      return (
        <button key={i} type="button"
          onClick={() => !disabled && onKey(isDel ? '⌫' : k)}
          disabled={disabled}
          className="flex items-center justify-center rounded-2xl font-semibold
                     transition-all duration-100 active:scale-90 disabled:opacity-30"
          style={{
            height: 52, fontSize: isDel ? 0 : 21,
            fontFamily: FONTS.body,
            color: isDel ? 'rgba(220,60,60,.6)' : '#0d2e1f',
            background: isDel ? 'rgba(220,38,38,.06)' : 'rgba(10,50,36,.05)',
            border: `1.5px solid ${isDel ? 'rgba(220,38,38,.1)' : 'rgba(10,50,36,.08)'}`,
          }}>
          {isDel ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7 5l-4 5 4 5h10V5H7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M10 8l4 4M14 8l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          ) : k}
        </button>
      )
    })}
  </div>
)

/* ═══ BLOCK TIMER ════════════════════════════════════════════════════════ */
const BlockTimer = ({ seconds, onExpired }) => {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    const t = setInterval(() => setLeft(p => { if (p <= 1) { clearInterval(t); onExpired?.(); return 0 } return p - 1 }), 1000)
    return () => clearInterval(t)
  }, [seconds, onExpired])
  const m = Math.floor(left / 60), s = left % 60
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl mb-4"
      style={{ background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.15)' }}>
      <ILock />
      <span className="text-[13px] font-semibold text-red-700/70" style={{ fontFamily: FONTS.body }}>
        Blocked — try in {m > 0 ? `${m}m ` : ''}{String(s).padStart(2, '0')}s
      </span>
    </div>
  )
}

/* ═══ SUCCESS BURST ══════════════════════════════════════════════════════ */
const SuccessBurst = ({ show }) => {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="absolute w-2 h-2 rounded-full top-1/2 left-1/2"
          style={{ background: i % 2 === 0 ? '#0d9060' : '#34d399', animation: `lp-burst .65s ease-out ${i * .05}s both`, '--deg': `${i * 45}deg` }} />
      ))}
      <div className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(16,185,129,.12)', border: '2px solid rgba(16,185,129,.3)', animation: 'lp-pop .4s cubic-bezier(.22,.68,0,1.3) both' }}>
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <path d="M6 13l5 5.5 9-10.5" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="20" strokeDashoffset="20" style={{ animation: 'lp-draw .3s ease-out .18s forwards' }} />
        </svg>
      </div>
    </div>
  )
}

/* ═══ FORGOT SHEET ═══════════════════════════════════════════════════════ */
const ForgotSheet = ({ username, onClose }) => {
  const dispatch = useDispatch()
  const [step, setStep] = useState('request')
  const [otp, setOtp] = useState(''); const [newPin, setNewPin] = useState(''); const [confirmPin, setConfirmPin] = useState('')
  const [masked, setMasked] = useState(''); const [loading, setLoading] = useState(false); const [err, setErr] = useState('')
  const [success, setSuccess] = useState(false); const [showPin, setShowPin] = useState(false)
  const handleRequest = async () => { setLoading(true); setErr(''); const r = await dispatch(forgotPasscode(username)); setLoading(false); if (r.meta.requestStatus === 'rejected') { setErr(r.payload || 'Failed'); return } setMasked(r.payload?.data?.maskedEmail || ''); setStep('verify') }
  const handleVerify = async () => { if (!otp || otp.length < 6) { setErr('Enter 6-digit OTP'); return } if (!newPin || newPin.length < 4) { setErr('Enter 4-digit passcode'); return } if (newPin !== confirmPin) { setErr('Passcodes do not match'); return } setLoading(true); setErr(''); const r = await dispatch(verifyOtp({ username, otp, newPasscode: newPin })); setLoading(false); if (r.meta.requestStatus === 'rejected') { setErr(r.payload || 'Failed'); return } setSuccess(true); setTimeout(onClose, 1800) }
  const inp = 'lp-inp w-full rounded-2xl text-center font-bold tracking-widest'
  const is = { fontFamily: FONTS.body, fontSize: 20, padding: '12px 16px', background: 'rgba(10,50,36,.05)', border: '1.5px solid rgba(10,50,36,.12)', color: '#0d2e1f' }
  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center" style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-sm rounded-t-3xl p-6 pb-8" style={{ background: 'rgba(245,242,235,.97)', border: '1px solid rgba(255,255,255,.7)', animation: 'lp-slide-up .3s ease-out' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[17px] font-bold text-[#0d2e1f]" style={{ fontFamily: FONTS.body }}>{success ? 'Reset complete' : 'Reset passcode'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5"><IX /></button>
        </div>
        {success ? <div className="flex items-center gap-3 text-emerald-700"><SvgCheck /><p className="text-[13px]" style={{ fontFamily: FONTS.body }}>Your passcode has been reset.</p></div>
        : step === 'request' ? <>
          <p className="text-[13px] text-[#0d2e1f]/50 mb-4" style={{ fontFamily: FONTS.body }}>OTP will be sent to <strong className="text-[#0d2e1f]/70">{username}</strong>'s email.</p>
          {err && <p className="text-[12px] text-red-600 mb-3" style={{ fontFamily: FONTS.body }}>{err}</p>}
          <button onClick={handleRequest} disabled={loading} className="w-full py-3.5 rounded-2xl text-[14px] font-bold text-white flex items-center justify-center gap-2" style={{ background: '#059669', fontFamily: FONTS.body, opacity: loading ? 0.7 : 1 }}>{loading && <Spin sz={16} />}Send OTP</button>
        </> : <>
          <p className="text-[12px] text-[#0d2e1f]/40 mb-3" style={{ fontFamily: FONTS.body }}>OTP sent to {masked}</p>
          {err && <p className="text-[12px] text-red-600 mb-3" style={{ fontFamily: FONTS.body }}>{err}</p>}
          <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit OTP" className={inp + ' mb-3'} style={is} />
          <div className="relative mb-3"><input value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="New passcode" type={showPin ? 'text' : 'password'} className={inp} style={{ ...is, paddingRight: 40 }} /><button type="button" onClick={() => setShowPin(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0d2e1f]/30"><IEye open={showPin} /></button></div>
          <input value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Confirm" type="password" className={inp + ' mb-4'} style={is} />
          <button onClick={handleVerify} disabled={loading} className="w-full py-3.5 rounded-2xl text-[14px] font-bold text-white flex items-center justify-center gap-2" style={{ background: '#059669', fontFamily: FONTS.body, opacity: loading ? 0.7 : 1 }}>{loading && <Spin sz={16} />}Reset Passcode</button>
        </>}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN LOGIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
const LoginPage = () => {
  const dispatch = useDispatch(), navigate = useNavigate()
  const authLoading = useSelector(selectAuthLoading), authError = useSelector(selectAuthError), blockState = useSelector(selectBlockState)
  const tableNumber = useSelector(selectTableNumber), session = useSelector(selectSession)
  const venueCafeId = useSelector(selectVenueCafeId), venueMode = useSelector(selectVenueMode), venueName = useSelector(selectVenueName)
  const isRemote = venueMode === 'remote', CAFE_ID = venueCafeId ?? BRAND.cafeId ?? 'demo'
  const curtain = useRef(null), heroRef = useRef(null), logoRef = useRef(null), cardRef = useRef(null), inputRef = useRef(null), debRef = useRef(null), alive = useRef(true)

  const [step, setStep] = useState('username')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [, setIsNewUser] = useState(false)
  const [localErr, setLocalErr] = useState('')
  const [guestLoad, setGuestLoad] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [ustatus, setUstatus] = useState(null)
  const [checked, setChecked] = useState('')
  const [burst, setBurst] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [blocked, setBlocked] = useState(false)

  const busy = authLoading || submitting || guestLoad
  useEffect(() => { alive.current = true; return () => { alive.current = false; clearTimeout(debRef.current) } }, [])
  useEffect(() => { if (blockState?.remainingSeconds) setBlocked(true) }, [blockState])

  /* ── GSAP entrance ─────────────────────────────────────────────────────── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.fromTo(curtain.current, { scaleY: 1, transformOrigin: 'top center' }, { scaleY: 0, duration: 1.1, ease: 'power4.inOut' }, 0)
      tl.fromTo('.lp-bg', { scale: 1.05 }, { scale: 1, duration: 2.2 }, 0.05)
      tl.fromTo(logoRef.current, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.9, ease: 'back.out(1.6)' }, 0.8)
      tl.fromTo(heroRef.current?.querySelectorAll('.he') ?? [], { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.6 }, 1.1)
      tl.fromTo(cardRef.current, { y: 60, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.85, ease: 'back.out(1.1)' }, 1.0)
      tl.fromTo(cardRef.current?.querySelectorAll('.cf') ?? [], { y: 16, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, duration: 0.45 }, 1.35)
    })
    setTimeout(() => inputRef.current?.focus(), 1500)
    return () => ctx.revert()
  }, [])

  useEffect(() => { dispatch(clearError()); return () => dispatch(clearError()) }, [dispatch])

  /* ── Username check ────────────────────────────────────────────────────── */
  const doCheck = useCallback(async val => {
    if (!val || val.length < 2) { if (alive.current) setUstatus(null); return }
    if (!/^[a-z0-9_.-]+$/.test(val)) { if (alive.current) setUstatus('invalid'); return }
    if (alive.current) setUstatus('checking')
    try {
      const r = await dispatch(checkUsername(val))
      if (!alive.current) return
      if (r.meta.requestStatus === 'fulfilled') { const ex = r.payload?.exists ?? r.payload?.data?.exists ?? false; setUstatus(ex ? 'exists' : 'free'); setChecked(val) }
      else setUstatus(null)
    } catch { if (alive.current) setUstatus(null) }
  }, [dispatch])

  const onUsernameChange = e => { const v = e.target.value; setUsername(v); setLocalErr(''); const l = v.trim().toLowerCase(); clearTimeout(debRef.current); if (!l || l.length < 2) { setUstatus(null); return } if (!/^[a-z0-9_.-]+$/.test(l)) { setUstatus('invalid'); return } debRef.current = setTimeout(() => doCheck(l), 450) }

  const onUsernameSubmit = async e => {
    e?.preventDefault(); if (busy) return; setLocalErr(''); dispatch(clearError())
    const val = username.trim().toLowerCase()
    if (!val || val.length < 2) { setLocalErr('Please enter a username'); return }
    if (!/^[a-z0-9_.-]+$/.test(val)) { setLocalErr('Only letters, numbers, _ . - allowed'); return }
    setSubmitting(true); let ex = null
    if (checked === val && (ustatus === 'exists' || ustatus === 'free')) { ex = ustatus === 'exists' }
    else { const cr = await dispatch(checkUsername(val)); if (cr.meta.requestStatus === 'rejected') { setLocalErr('Could not reach server'); setSubmitting(false); return } ex = cr.payload?.exists ?? cr.payload?.data?.exists ?? false; setUstatus(ex ? 'exists' : 'free'); setChecked(val) }
    setSubmitting(false); setIsNewUser(!ex)
    if (cardRef.current) { gsap.to(cardRef.current, { x: -10, opacity: 0.7, duration: 0.12, ease: 'power2.in', onComplete: () => { setStep(ex ? 'pin' : 'create_pin'); setPin(''); setConfirmPin(''); gsap.fromTo(cardRef.current, { x: 10, opacity: 0.7 }, { x: 0, opacity: 1, duration: 0.25, ease: 'power2.out' }) } }) }
    else setStep(ex ? 'pin' : 'create_pin')
  }

  /* ── PIN ────────────────────────────────────────────────────────────────── */
  const onPinKey = key => {
    setLocalErr(''); dispatch(clearBlockState())
    if (key === '⌫') { if (step === 'confirm_pin') setConfirmPin(p => p.slice(0, -1)); else setPin(p => p.slice(0, -1)); return }
    if (step === 'confirm_pin') { if (confirmPin.length >= 4) return; const n = confirmPin + key; setConfirmPin(n); if (n.length === 4) setTimeout(() => doConfirm(n), 120) }
    else { if (pin.length >= 4) return; const n = pin + key; setPin(n); if (n.length === 4) { if (step === 'pin') setTimeout(() => doLogin(n), 120); if (step === 'create_pin') setTimeout(() => { setStep('confirm_pin'); setConfirmPin('') }, 120) } }
  }

  const doLogin = async p => {
    setSubmitting(true); setLocalErr(''); dispatch(clearError())
    const r = await dispatch(loginUser({ username: username.trim().toLowerCase(), passcode: p }))
    setSubmitting(false)
    if (r.meta.requestStatus === 'rejected') { setPin(''); if (cardRef.current) gsap.to(cardRef.current, { x: -6, duration: .04, ease: 'power2.in', yoyo: true, repeat: 5, onComplete: () => gsap.set(cardRef.current, { x: 0 }) }); return }
    setBurst(true); setTimeout(() => goMenu(false), 800)
  }

  const doConfirm = async cv => {
    if (cv !== pin) { setLocalErr('Passcodes do not match'); if (cardRef.current) gsap.to(cardRef.current, { x: -6, duration: .04, ease: 'power2.in', yoyo: true, repeat: 5, onComplete: () => gsap.set(cardRef.current, { x: 0 }) }); setTimeout(() => { setStep('create_pin'); setPin(''); setConfirmPin(''); setLocalErr('') }, 1000); return }
    setSubmitting(true); setLocalErr('')
    const r = await dispatch(registerUser({ username: username.trim().toLowerCase(), passcode: pin, cafeId: CAFE_ID }))
    setSubmitting(false)
    if (r.meta.requestStatus === 'rejected') { setLocalErr(typeof r.payload === 'string' ? r.payload : 'Registration failed'); setStep('create_pin'); setPin(''); setConfirmPin(''); return }
    setBurst(true); setTimeout(() => goMenu(true), 800)
  }

  const goMenu = useCallback(async isNew => { try { await dispatch(fetchActiveSession()) } catch (_) {} if (session) persistSession(session); preloadSounds('customer'); navigate('/menu', { replace: true, state: isNew ? { firstTimeUser: true } : undefined }) }, [navigate, session, dispatch])
  const doGuest = async () => { setGuestLoad(true); const r = await dispatch(guestLogin(CAFE_ID)); if (!alive.current) return; setGuestLoad(false); if (r.meta.requestStatus === 'rejected') { setLocalErr(typeof r.payload === 'string' ? r.payload : 'Guest login failed'); return } preloadSounds('customer'); navigate('/menu', { replace: true }) }
  const goBack = () => { dispatch(clearError()); dispatch(clearBlockState()); setPin(''); setConfirmPin(''); setLocalErr(''); setBlocked(false); gsap.to(cardRef.current, { x: 10, opacity: 0.7, duration: 0.12, ease: 'power2.in', onComplete: () => { setStep('username'); gsap.fromTo(cardRef.current, { x: -10, opacity: 0.7 }, { x: 0, opacity: 1, duration: 0.25, ease: 'power2.out' }) } }) }

  const displayErr = localErr || authError
  const currentPin = step === 'confirm_pin' ? confirmPin : pin
  const isBlocked = blocked || !!blockState?.remainingSeconds
  const displayName = venueName || BRAND.name

  const titles = {
    username:    { t: 'Welcome', s: 'Enter your username to get started' },
    pin:         { t: `Welcome back, ${username}`, s: 'Enter your 4-digit passcode' },
    create_pin:  { t: 'Create a passcode', s: 'Choose a 4-digit passcode to secure your account' },
    confirm_pin: { t: 'Confirm passcode', s: 'Enter it one more time' },
  }
  const { t: stepTitle, s: stepSub } = titles[step]

  /* ═══ RENDER ═══════════════════════════════════════════════════════════ */
  return (
    <div className="relative min-h-dvh w-full flex flex-col lg:flex-row overflow-hidden">
      <style>{`
@import url('${FONTS.googleUrl}');
@keyframes lp-slide-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes lp-pop{from{opacity:0;transform:scale(0)}to{opacity:1;transform:scale(1)}}
@keyframes lp-draw{to{stroke-dashoffset:0}}
@keyframes lp-burst{0%{transform:rotate(var(--deg,0deg)) translateY(-60px) scale(0);opacity:1}60%{opacity:1}100%{transform:rotate(var(--deg,0deg)) translateY(-60px) scale(0);opacity:0}}
@keyframes lp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes lp-breathe{0%,100%{opacity:.5}50%{opacity:.7}}
@keyframes lp-shimmer{0%{transform:translateX(-100%) skewX(-15deg)}100%{transform:translateX(320%) skewX(-15deg)}}
.lp-float{animation:lp-float 4.5s ease-in-out infinite}
.lp-shine::after{content:'';position:absolute;inset:0;background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.15) 50%,transparent 62%);animation:lp-shimmer 3s ease-in-out infinite;pointer-events:none}
.lp-inp:focus{outline:none;border-color:rgba(10,60,42,.5)!important;box-shadow:0 0 0 3px rgba(10,60,42,.1),0 2px 12px rgba(0,0,0,.06)}
.lp-inp::placeholder{color:rgba(60,80,70,.35)}
      `}</style>

      <SuccessBurst show={burst} />
      {showForgot && <ForgotSheet username={username} onClose={() => setShowForgot(false)} />}
      <div ref={curtain} className="fixed inset-0 z-[100]" style={{ background: '#020e09' }} />

      {/* BG */}
      <div className="lp-bg fixed inset-0 z-0">
        <div className="absolute inset-0" style={{ background: BG.a }} />
        <div className="absolute inset-0" style={{ background: BG.b }} />
        <div className="absolute inset-0" style={{ background: BG.c }} />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '300px', mixBlendMode: 'overlay' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(0,100,65,.1) 0%, transparent 60%)', animation: 'lp-breathe 5s ease-in-out infinite' }} />
      </div>

      {/* ═══ LAYOUT ═══ */}
      <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-stretch min-h-dvh w-full">

        {/* ── HERO ── */}
        <div ref={heroRef}
          className="flex flex-col items-center justify-center w-full lg:w-[46%] xl:w-[44%]
                     lg:min-h-dvh lg:sticky lg:top-0
                     pt-[max(40px,calc(env(safe-area-inset-top)+24px))]
                     pb-3 sm:pb-4 lg:pb-0
                     px-6 sm:px-8">

          {/* Logo */}
          <div ref={logoRef} className="lp-float mb-4 lg:mb-6 relative" style={{ opacity: 0 }}>
            <div className="relative">
              {/* Outer ring */}
              <div className="absolute -inset-3 rounded-[20px] lg:rounded-[24px] border border-white/[0.06]" />
              <div className="absolute -inset-6 rounded-[24px] lg:rounded-[28px] border border-white/[0.03]" />

              {BRAND.logo ? (
                <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 lg:w-24 lg:h-24
                                rounded-2xl lg:rounded-3xl flex items-center justify-center overflow-hidden
                                bg-white/[0.06] border border-white/[0.12]
                                shadow-[0_16px_48px_rgba(0,0,0,0.4)]
                                backdrop-blur-xl">
                  <img src={BRAND.logo} alt={displayName}
                    className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 object-contain" />
                </div>
              ) : (
                <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 lg:w-24 lg:h-24
                                rounded-2xl lg:rounded-3xl flex items-center justify-center
                                bg-white/[0.06] border border-white/[0.12]
                                shadow-[0_16px_48px_rgba(0,0,0,0.4)]
                                backdrop-blur-xl
                                text-emerald-400/60">
                  <SvgWave />
                </div>
              )}
            </div>
          </div>

          {/* Brand name */}
          <h1 className="he text-[20px] sm:text-[22px] lg:text-[28px] xl:text-[32px]
                         font-extrabold text-white/90 tracking-tight text-center leading-tight mb-1"
            style={{ opacity: 0, fontFamily: FONTS.heading }}>
            {BRAND.name}
          </h1>

          {/* Tagline */}
          <div className="he flex items-center gap-2.5 mb-3 lg:mb-4" style={{ opacity: 0 }}>
            <div className="w-5 sm:w-6 h-px bg-white/15 rounded-full" />
            <p className="text-[9px] sm:text-[10px] lg:text-[11px] font-semibold text-white/30
                          tracking-[0.2em] uppercase"
              style={{ fontFamily: FONTS.body }}>
              {BRAND.tagline}
            </p>
            <div className="w-5 sm:w-6 h-px bg-white/15 rounded-full" />
          </div>

          {/* Venue + mode badges */}
          {venueName && venueName !== BRAND.name && (
            <div className="he px-3 py-1.5 rounded-full text-[11px] font-semibold text-white/70 mb-1.5
                            bg-white/[0.08] border border-white/[0.12] backdrop-blur-sm"
              style={{ opacity: 0, fontFamily: FONTS.body }}>
              {venueName}
            </div>
          )}
          {tableNumber && (
            <div className="he px-3 py-1.5 rounded-full text-[11px] font-semibold text-white/70 mb-1.5
                            bg-white/[0.08] border border-white/[0.12] backdrop-blur-sm"
              style={{ opacity: 0, fontFamily: FONTS.body }}>
              Table {tableNumber}
            </div>
          )}
          {isRemote && (
            <div className="he px-3 py-1.5 rounded-full text-[10px] font-semibold text-amber-300/70 mb-1.5
                            bg-amber-500/[0.08] border border-amber-400/[0.12] backdrop-blur-sm"
              style={{ opacity: 0, fontFamily: FONTS.body }}>
              Remote ordering
            </div>
          )}

          {/* Desktop description */}
          <p className="he hidden lg:block text-[13px] text-white/20 text-center max-w-[240px] leading-relaxed mt-3"
            style={{ opacity: 0, fontFamily: FONTS.body }}>
            Sign in to order, earn loyalty points, and enjoy your favorites
          </p>
        </div>

        {/* ── CARD ── */}
        <div className="flex-1 flex items-start lg:items-center justify-center
                        w-full lg:w-[54%] xl:w-[56%]
                        px-4 sm:px-5 lg:px-8 xl:px-12
                        pb-[max(20px,calc(env(safe-area-inset-bottom)+12px))] lg:py-8">
          <div ref={cardRef}
            className="w-full max-w-[380px] sm:max-w-[400px] lg:max-w-[420px]
                       rounded-2xl sm:rounded-3xl overflow-hidden"
            style={{
              opacity: 0,
              backdropFilter: 'blur(48px) saturate(150%) brightness(1.15)',
              WebkitBackdropFilter: 'blur(48px) saturate(150%) brightness(1.15)',
              background: 'rgba(245,242,235,.9)',
              border: '1px solid rgba(255,255,255,.65)',
              boxShadow: '0 28px 70px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.85)',
            }}>

            {/* Top shimmer line */}
            <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.85) 30%, white 50%, rgba(255,255,255,.85) 70%, transparent)' }} />

            <div className="px-5 sm:px-6 lg:px-7 pt-6 sm:pt-7 pb-6 sm:pb-7">

              {/* Back button */}
              {step !== 'username' && (
                <button onClick={goBack}
                  className="cf flex items-center gap-1.5 mb-4 text-[13px] font-medium text-[#0d2e1f]/40
                             hover:text-[#0d2e1f]/60 transition-colors"
                  style={{ fontFamily: FONTS.body, background: 'none', border: 'none' }}>
                  <IBack /> Back
                </button>
              )}

              {/* Heading — SVG icon + text, NO emoji */}
              <div className="cf text-center mb-5">
                <div className="flex justify-center mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center
                                  bg-emerald-600/8 text-emerald-700/50">
                    {step === 'username' ? <SvgWave /> :
                     step === 'pin' ? <SvgLock /> :
                     <SvgCheck />}
                  </div>
                </div>
                <h2 className="text-[18px] sm:text-[20px] font-bold text-[#0d2e1f] mb-1 leading-tight"
                  style={{ fontFamily: FONTS.heading, letterSpacing: '-0.02em' }}>
                  {stepTitle}
                </h2>
                <p className="text-[12px] sm:text-[13px] text-[#0d2e1f]/45 leading-relaxed"
                  style={{ fontFamily: FONTS.body }}>
                  {stepSub}
                </p>
              </div>

              {/* Error */}
              {displayErr && !isBlocked && (
                <div className="cf flex items-center gap-2 mb-4 px-3.5 py-3 rounded-xl text-[12px] font-medium text-red-700/70"
                  style={{ animation: 'lp-slide-up .2s ease-out', fontFamily: FONTS.body, background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.12)' }}>
                  <IX />{displayErr}
                </div>
              )}
              {isBlocked && blockState?.remainingSeconds && (
                <BlockTimer seconds={blockState.remainingSeconds} onExpired={() => { setBlocked(false); dispatch(clearBlockState()); setPin('') }} />
              )}

              {/* ── USERNAME STEP ── */}
              {step === 'username' && (
                <form onSubmit={onUsernameSubmit} autoComplete="off">
                  <label className="cf block mb-2 text-[10px] font-bold tracking-[.12em] uppercase text-[#0d2e1f]/35"
                    style={{ fontFamily: FONTS.body }}>Username</label>
                  <div className="cf mb-4">
                    <input ref={inputRef} type="text" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                      placeholder="your_username" value={username} onChange={onUsernameChange} disabled={busy}
                      className="lp-inp w-full rounded-2xl font-medium transition-all duration-200 disabled:opacity-40"
                      style={{ fontFamily: FONTS.body, fontSize: 15, padding: '14px 16px', background: 'rgba(10,50,36,.04)', border: '1.5px solid rgba(10,50,36,.1)', color: '#0d2e1f' }} />
                  </div>

                  <button type="submit" disabled={busy || !username.trim() || ustatus === 'invalid'}
                    className="cf relative overflow-hidden w-full flex items-center justify-center gap-2
                               rounded-2xl text-white font-bold
                               transition-all duration-200 active:scale-[.97]
                               disabled:opacity-40 lp-shine mb-4"
                    style={{
                      fontFamily: FONTS.body, fontSize: 15, padding: '15px 20px',
                      background: ustatus === 'exists' ? '#059669' : ustatus === 'free' ? '#2563eb' : '#0a4433',
                      boxShadow: '0 6px 24px rgba(8,60,40,.4)',
                    }}>
                    {busy ? <Spin sz={16} /> : null}
                    <span>{busy ? 'Please wait...' : ustatus === 'exists' ? 'Sign in' : ustatus === 'free' ? 'Create account' : 'Continue'}</span>
                    {!busy && <IArrow />}
                  </button>

                  <div className="cf flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-[#0d2e1f]/8 rounded-full" />
                    <span className="text-[10px] font-bold tracking-[.12em] text-[#0d2e1f]/20" style={{ fontFamily: FONTS.body }}>OR</span>
                    <div className="flex-1 h-px bg-[#0d2e1f]/8 rounded-full" />
                  </div>

                  {!isRemote && (
                    <button onClick={doGuest} disabled={busy} type="button"
                      className="cf w-full flex items-center justify-center gap-2
                                 rounded-2xl font-semibold
                                 transition-all duration-200 active:scale-[.97]
                                 disabled:opacity-30 mb-3"
                      style={{
                        fontFamily: FONTS.body, fontSize: 14, padding: '13px 18px',
                        color: '#0d3326', background: 'rgba(10,60,40,.06)', border: '1.5px solid rgba(10,60,40,.1)',
                      }}>
                      {guestLoad ? <Spin sz={16} dk /> : <IUser />}
                      {guestLoad ? 'Setting up...' : 'Continue as guest'}
                    </button>
                  )}

                  {isRemote && (
                    <div className="cf px-4 py-3 rounded-xl mb-3 text-center"
                      style={{ background: 'rgba(217,119,6,.05)', border: '1px solid rgba(217,119,6,.1)' }}>
                      <p className="text-[11px] text-amber-700/50 leading-relaxed" style={{ fontFamily: FONTS.body }}>
                        Guest access requires being at the venue
                      </p>
                    </div>
                  )}

                  <button onClick={() => navigate('/staff/login')} disabled={busy} type="button"
                    className="cf w-full flex items-center justify-center gap-2
                               rounded-xl font-medium text-[#0d2e1f]/30
                               hover:text-[#0d2e1f]/45
                               transition-colors mb-5"
                    style={{ fontFamily: FONTS.body, fontSize: 12, padding: '11px 16px', border: '1px solid rgba(10,50,36,.06)', background: 'transparent' }}>
                    <IShield /> Staff login
                  </button>

                  <div className="cf flex items-start gap-3 px-4 py-3.5 rounded-xl"
                    style={{ background: 'rgba(10,60,40,.05)', border: '1px solid rgba(10,60,40,.08)' }}>
                    <span className="mt-0.5 shrink-0"><IStar /></span>
                    <div>
                      <p className="text-[11px] font-bold text-[#0a3326] mb-0.5" style={{ fontFamily: FONTS.body }}>
                        Earn loyalty points
                      </p>
                      <p className="text-[10px] text-[#0d2e1f]/38 leading-relaxed" style={{ fontFamily: FONTS.body }}>
                        Bronze, Silver, Gold — up to 15% off at {displayName}
                      </p>
                    </div>
                  </div>
                </form>
              )}

              {/* ── PIN STEPS ── */}
              {(step === 'pin' || step === 'create_pin' || step === 'confirm_pin') && (
                <div>
                  {(step === 'create_pin' || step === 'confirm_pin') && (
                    <div className="flex items-center justify-center gap-2 mb-4">
                      {['create_pin', 'confirm_pin'].map((s, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                            style={{
                              background: step === s || (step === 'confirm_pin' && i === 0) ? '#059669' : 'rgba(10,50,36,.08)',
                              color: step === s || (step === 'confirm_pin' && i === 0) ? '#fff' : 'rgba(10,50,36,.35)',
                              fontFamily: FONTS.body,
                            }}>{i + 1}</div>
                          {i === 0 && <div className="w-8 h-px" style={{ background: step === 'confirm_pin' ? '#059669' : 'rgba(10,50,36,.1)' }} />}
                        </div>
                      ))}
                    </div>
                  )}
                  <PinDots length={currentPin.length} />
                  <div className="flex justify-center mb-4">
                    <button type="button" onClick={() => setShowPin(p => !p)}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-[#0d2e1f]/35"
                      style={{ fontFamily: FONTS.body, background: 'none', border: 'none' }}>
                      <IEye open={showPin} /> {showPin ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <PinKeypad onKey={onPinKey} disabled={busy || isBlocked} />
                  {step === 'pin' && (
                    <div className="flex justify-center mt-5">
                      <button type="button" onClick={() => setShowForgot(true)}
                        className="flex items-center gap-1.5 text-[11px] font-medium text-[#0d2e1f]/30"
                        style={{ fontFamily: FONTS.body, background: 'none', border: 'none' }}>
                        <ILock /> Forgot passcode?
                      </button>
                    </div>
                  )}
                  {busy && <div className="flex justify-center mt-4"><Spin sz={20} dk /></div>}
                </div>
              )}
            </div>

            {/* Bottom shimmer */}
            <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.6) 50%, transparent)' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage