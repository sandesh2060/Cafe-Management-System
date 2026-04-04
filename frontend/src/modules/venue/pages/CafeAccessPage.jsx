// frontend/src/modules/venue/pages/CafeAccessPage.jsx
// ─── NEXARA — Premium Venue Discovery ────────────────────────────────────────
// Mobile: single column, immersive dark glass
// Tablet: centered wider column
// Desktop: 50/50 split — left branded hero, right search panel

import { useState, useEffect, useCallback, useRef, useLayoutEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { selectIsLoggedIn } from '@store/slices/authSlice'
import { selectVenue } from '@store/slices/venueSlice'
import { BRAND, FONTS } from '@shared/config/brand'
import gsap from 'gsap'
import {
  searchCafes, getNearbyCafes, lookupByCode, getFavorites, getRecent,
} from '../services/venueDiscovery.service'

/* ═══ TABS ═══════════════════════════════════════════════════════════════════ */
const TABS = [
  { id: 'search', label: 'Search', ic: IcS },
  { id: 'nearby', label: 'Nearby', ic: IcP },
  { id: 'favorites', label: 'Favorites', ic: IcH },
  { id: 'code', label: 'Code', ic: IcX },
  { id: 'recent', label: 'Recent', ic: IcC },
]

/* ═══ ICONS ══════════════════════════════════════════════════════════════════ */
function IcS(){return<svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="shrink-0"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
function IcH(){return<svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="shrink-0"><path d="M8 13.5s-5.5-3.5-5.5-7A3 3 0 018 4a3 3 0 015.5 2.5c0 3.5-5.5 7-5.5 7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>}
function IcP(){return<svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="shrink-0"><path d="M8 1.5A4.5 4.5 0 003.5 6C3.5 9.5 8 14.5 8 14.5s4.5-5 4.5-8.5A4.5 4.5 0 008 1.5z" stroke="currentColor" strokeWidth="1.5"/><circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.3"/></svg>}
function IcX(){return<svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="shrink-0"><path d="M3 6h10M3 10h10M6 3l-1 10M11 3l-1 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>}
function IcC(){return<svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="shrink-0"><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function IcChev(){return<svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function IcWarn(){return<svg width="22" height="22" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5v4M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
function IcMap(){return<svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-emerald-400/60"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg>}

/* ═══ HOOKS ══════════════════════════════════════════════════════════════════ */
const useStagger = (ref, deps = []) => {
  useLayoutEffect(() => {
    if (!ref.current) return
    const els = ref.current.querySelectorAll('.sg')
    if (!els.length) return
    gsap.set(els, { y: 24, opacity: 0, scale: 0.96 })
    gsap.to(els, {
      y: 0, opacity: 1, scale: 1,
      duration: 0.5, stagger: 0.07,
      ease: 'back.out(1.2)', clearProps: 'all',
    })
  }, deps)
}

const useTabSlider = (active, scrollRef, barRef) => {
  useLayoutEffect(() => {
    if (!scrollRef.current || !barRef.current) return
    const btn = scrollRef.current.querySelector(`[data-tab="${active}"]`)
    if (!btn) return
    const sr = scrollRef.current.getBoundingClientRect()
    const br = btn.getBoundingClientRect()
    gsap.to(barRef.current, {
      x: br.left - sr.left + scrollRef.current.scrollLeft,
      width: br.width,
      duration: 0.4, ease: 'elastic.out(1, 0.75)',
    })
    btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [active])
}

/* ═══ CAFE CARD ══════════════════════════════════════════════════════════════ */
const CafeCard = ({ cafe, onSelect }) => {
  const r = useRef(null)
  const tap = () => {
    if (!r.current) return onSelect(cafe)
    gsap.timeline()
      .to(r.current, { scale: 0.955, duration: 0.1, ease: 'power2.in' })
      .to(r.current, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)', onStart: () => onSelect(cafe) })
  }
  return (
    <button ref={r} onClick={tap}
      className="sg group w-full flex items-center gap-3.5
                 p-3.5 sm:p-4 lg:p-[18px]
                 rounded-2xl
                 border border-white/[0.06]
                 bg-white/[0.02]
                 backdrop-blur-md
                 will-change-transform
                 hover:bg-white/[0.055] hover:border-white/[0.14]
                 hover:shadow-[0_8px_32px_rgba(0,0,0,0.2)]
                 transition-[background,border,box-shadow] duration-300 ease-out
                 text-left cursor-pointer select-none"
      style={{ fontFamily: FONTS.body, WebkitTapHighlightColor: 'transparent' }}>
      {cafe.logo ? (
        <img src={cafe.logo} alt=""
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover shrink-0
                     ring-1 ring-white/10 shadow-lg shadow-black/20" />
      ) : (
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl shrink-0
                        flex items-center justify-center
                        bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-emerald-600/5
                        ring-1 ring-white/10 shadow-lg shadow-black/20
                        text-base sm:text-lg">
          {BRAND.emoji ?? '☕'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] sm:text-[14.5px] font-semibold text-white/90 truncate
                      group-hover:text-white transition-colors duration-300">
          {cafe.name}
        </p>
        {cafe.address && (
          <p className="text-[11px] sm:text-[12px] text-white/30 mt-0.5 truncate
                        group-hover:text-white/40 transition-colors duration-300">
            {cafe.address}
          </p>
        )}
        {cafe.distanceMeters != null && (
          <p className="text-[10px] sm:text-[11px] font-bold mt-1 text-emerald-400/80 tracking-wide">
            {cafe.distanceMeters < 1000 ? `${cafe.distanceMeters}m` : `${(cafe.distanceMeters / 1000).toFixed(1)}km`} away
          </p>
        )}
      </div>
      <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
                       bg-white/[0.04] group-hover:bg-emerald-500/15
                       transition-all duration-300
                       group-hover:translate-x-0.5">
        <span className="text-white/20 group-hover:text-emerald-400 transition-colors duration-300">
          <IcChev />
        </span>
      </div>
    </button>
  )
}

/* ═══ SKELETON ═══════════════════════════════════════════════════════════════ */
const Skel = ({ n = 3 }) => (
  <div className="flex flex-col gap-3">
    {[...Array(n)].map((_, i) => (
      <div key={i}
        className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl
                   border border-white/[0.04] bg-white/[0.015]">
        <div className="w-11 sm:w-12 h-11 sm:h-12 rounded-xl bg-white/[0.05] animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-3/5 rounded-lg bg-white/[0.05] animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }} />
          <div className="h-2.5 w-2/5 rounded-md bg-white/[0.03] animate-pulse"
            style={{ animationDelay: `${i * 100 + 50}ms` }} />
        </div>
      </div>
    ))}
  </div>
)

/* ═══ EMPTY STATE ════════════════════════════════════════════════════════════ */
const EmptyMsg = ({ msg, icon }) => (
  <div className="flex flex-col items-center py-16 sm:py-20">
    <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-4
                    ring-1 ring-white/[0.06]">
      {icon || <IcMap />}
    </div>
    <p className="text-[12.5px] sm:text-[13.5px] text-white/25 text-center max-w-[240px] leading-relaxed"
      style={{ fontFamily: FONTS.body }}>
      {msg}
    </p>
  </div>
)

/* ═══ INITIAL SEARCH STATE (replaces skeleton) ══════════════════════════════ */
const SearchPrompt = () => (
  <div className="flex flex-col items-center py-12 sm:py-16">
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5
                    flex items-center justify-center mb-5
                    ring-1 ring-emerald-500/10 shadow-lg shadow-emerald-900/10">
      <IcS />
    </div>
    <p className="text-[13px] sm:text-[14px] text-white/20 text-center max-w-[220px] leading-relaxed"
      style={{ fontFamily: FONTS.body }}>
      Type at least 2 characters to search venues
    </p>
  </div>
)

/* ═══ BOTTOM SHEET ══════════════════════════════════════════════════════════ */
const Sheet = ({ cafe, onConfirm, onCancel }) => {
  const s = useRef(null), o = useRef(null), d = useRef(null)

  useLayoutEffect(() => {
    gsap.fromTo(o.current, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' })
    gsap.fromTo(s.current, { y: '100%' }, { y: '0%', duration: 0.6, ease: 'power4.out' })
  }, [])

  const close = () => {
    gsap.to(s.current, { y: '100%', duration: 0.35, ease: 'power3.in' })
    gsap.to(o.current, { opacity: 0, duration: 0.3, delay: 0.05, onComplete: onCancel })
  }

  const onTS = e => { d.current = e.touches[0].clientY }
  const onTM = e => { if (d.current == null) return; gsap.set(s.current, { y: Math.max(0, e.touches[0].clientY - d.current) }) }
  const onTE = e => { if (d.current == null) return; const dy = e.changedTouches[0].clientY - d.current; d.current = null; dy > 80 ? close() : gsap.to(s.current, { y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' }) }

  return (
    <div ref={o} className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
      <div ref={s} onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}
        className="w-full max-w-[480px] rounded-t-[28px] overflow-hidden
                   border-t border-x border-white/[0.08] will-change-transform"
        style={{ background: 'linear-gradient(180deg, rgba(16,26,24,0.98) 0%, rgba(8,16,14,0.99) 100%)',
                 paddingBottom: 'max(28px, calc(env(safe-area-inset-bottom) + 16px))' }}>

        <div className="flex justify-center pt-3 pb-5">
          <div className="w-10 h-1 rounded-full bg-white/[0.15]" />
        </div>

        <div className="px-6 sm:px-7">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center
                            bg-amber-500/10 ring-1 ring-amber-400/15 text-amber-400">
              <IcWarn />
            </div>
          </div>

          <h3 className="text-center text-[17px] sm:text-[19px] font-bold text-white/92 mb-2 tracking-tight"
            style={{ fontFamily: FONTS.body }}>
            You're not inside this venue
          </h3>
          <p className="text-center text-[12.5px] sm:text-[13.5px] text-white/35 leading-relaxed mb-7
                        max-w-[270px] mx-auto"
            style={{ fontFamily: FONTS.body }}>
            Access <span className="text-white/70 font-semibold">{cafe?.name}</span> remotely
            to browse the menu and order for delivery or pickup.
          </p>

          <button onClick={onConfirm}
            className="w-full py-3.5 sm:py-4 rounded-2xl
                       text-[14px] sm:text-[15px] font-bold text-white
                       active:scale-[0.97] will-change-transform mb-3
                       shadow-[0_8px_32px_rgba(5,150,105,0.3)]
                       hover:shadow-[0_12px_40px_rgba(5,150,105,0.4)]
                       transition-shadow duration-300"
            style={{ WebkitTapHighlightColor: 'transparent', fontFamily: FONTS.body,
              background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)' }}>
            Continue Anyway
          </button>

          <button onClick={close}
            className="w-full py-3 sm:py-3.5 rounded-2xl
                       text-[13px] sm:text-[14px] font-semibold text-white/35
                       border border-white/[0.06] bg-white/[0.02]
                       hover:text-white/50 hover:border-white/[0.1] hover:bg-white/[0.04]
                       active:scale-[0.97] will-change-transform
                       transition-all duration-300"
            style={{ WebkitTapHighlightColor: 'transparent', fontFamily: FONTS.body }}>
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══ HERO PANEL (desktop) ══════════════════════════════════════════════════ */
const HeroPanel = () => (
  <div className="hidden lg:flex flex-col items-center justify-center relative w-full h-full overflow-hidden px-10 xl:px-14">
    {/* Ambient glow layers */}
    <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 35%, rgba(16,185,129,0.08) 0%, transparent 55%)' }} />
    <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 80%, rgba(5,80,55,0.06) 0%, transparent 45%)' }} />
    <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 70% 20%, rgba(13,148,136,0.05) 0%, transparent 40%)' }} />

    {/* Logo */}
    <div className="relative mb-10">
      <div className="w-24 h-24 xl:w-28 xl:h-28 2xl:w-32 2xl:h-32 rounded-3xl
                      flex items-center justify-center text-4xl xl:text-5xl 2xl:text-6xl
                      bg-white/[0.03] border border-white/[0.07]
                      shadow-[0_24px_80px_rgba(0,0,0,0.4)]
                      backdrop-blur-xl">
        {BRAND.emoji ?? '☕'}
      </div>
      {/* Rings */}
      <div className="absolute -inset-3 rounded-[22px] xl:rounded-[26px] border border-white/[0.04]" />
      <div className="absolute -inset-6 rounded-[26px] xl:rounded-[30px] border border-white/[0.02]" />
      <div className="absolute -inset-3 rounded-[22px] xl:rounded-[26px] border border-emerald-400/[0.06]
                      animate-ping" style={{ animationDuration: '4s' }} />
    </div>

    {/* Brand */}
    <h2 className="text-[28px] xl:text-[34px] 2xl:text-[40px] font-extrabold text-white/92
                   tracking-tight mb-2 text-center leading-tight"
      style={{ fontFamily: FONTS.body }}>
      {BRAND.name || 'Nexara'}
    </h2>

    <p className="text-[11px] xl:text-[12px] font-semibold text-white/25 tracking-[0.2em] uppercase mb-6"
      style={{ fontFamily: FONTS.body }}>
      {BRAND.tagline || 'Foundation meets flow.'}
    </p>

    <p className="text-[13px] xl:text-[14px] text-white/22 text-center max-w-[280px] leading-relaxed mb-12"
      style={{ fontFamily: FONTS.body }}>
Top spots, anytime, anywhere.    </p>

    {/* Stats */}
    <div className="flex gap-8 xl:gap-10">
      {[{ n: '20+', l: 'Venues' }, { n: '500+', l: 'Tables' }, { n: '4', l: 'Cities' }].map((s, i) => (
        <div key={i} className="text-center">
          <p className="text-[22px] xl:text-[26px] font-bold text-emerald-400/60 tracking-tight"
            style={{ fontFamily: FONTS.body }}>{s.n}</p>
          <p className="text-[10px] xl:text-[11px] text-white/20 mt-1 font-medium tracking-wider uppercase"
            style={{ fontFamily: FONTS.body }}>{s.l}</p>
        </div>
      ))}
    </div>

    {/* Bottom decoration */}
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-20">
      <div className="w-1 h-1 rounded-full bg-emerald-400" />
      <div className="w-8 h-px bg-white/30" />
      <p className="text-[9px] text-white/40 tracking-[0.2em] uppercase font-medium"
        style={{ fontFamily: FONTS.body }}>Powered by Nexara</p>
      <div className="w-8 h-px bg-white/30" />
      <div className="w-1 h-1 rounded-full bg-emerald-400" />
    </div>
  </div>
)

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */
const CafeAccessPage = ({ onSelectCafe, onConfirmRemote, onGoBack, isCafeSelected }) => {
  const [tab, setTab] = useState('search')
  const [cafes, setCafes] = useState([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [code, setCode] = useState('')
  const [codeErr, setCodeErr] = useState('')
  const [gps, setGps] = useState(null)
  const [picked, setPicked] = useState(null)
  const [searched, setSearched] = useState(false)

  const debounce = useRef(null)
  const pageRef = useRef(null)
  const heroRef = useRef(null)
  const headerRef = useRef(null)
  const tabBarRef = useRef(null)
  const scrollRef = useRef(null)
  const indicatorRef = useRef(null)
  const contentRef = useRef(null)
  const listRef = useRef(null)

  useTabSlider(tab, scrollRef, indicatorRef)
  useStagger(listRef, [cafes, tab])

  /* ── Entrance animation ────────────────────────────────────────────────── */
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      if (heroRef.current) tl.fromTo(heroRef.current, { x: -50, opacity: 0 }, { x: 0, opacity: 1, duration: 1, ease: 'power4.out' }, 0)
      if (headerRef.current) tl.fromTo(headerRef.current, { y: -24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0.15)
      if (tabBarRef.current) tl.fromTo(tabBarRef.current, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 0.25)
      if (contentRef.current) tl.fromTo(contentRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65 }, 0.35)
    }, pageRef)
    return () => ctx.revert()
  }, [])

  /* ── GPS ────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {}, { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    )
  }, [])

  /* ── Tab data ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (tab === 'search' || tab === 'code') { setLoading(false); return }
    setCafes([]); setLoading(true)
    const go = async () => {
      try {
        let r
        switch (tab) {
          case 'favorites': r = await getFavorites(); break
          case 'nearby': r = gps ? await getNearbyCafes(gps.lat, gps.lng) : { cafes: [] }; break
          case 'recent': r = await getRecent(); break
          default: r = { cafes: [] }
        }
        setCafes(r?.cafes ?? [])
      } catch { setCafes([]) }
      setLoading(false)
    }
    go()
  }, [tab, gps])

  /* ── Search ────────────────────────────────────────────────────────────── */
  const onSearch = useCallback(v => {
    setQuery(v); clearTimeout(debounce.current)
    if (!v.trim() || v.length < 2) { setCafes([]); setSearched(false); return }
    setLoading(true); setSearched(true)
    debounce.current = setTimeout(async () => {
      try { setCafes((await searchCafes(v))?.cafes ?? []) } catch { setCafes([]) }
      setLoading(false)
    }, 300)
  }, [])

  /* ── Code lookup ───────────────────────────────────────────────────────── */
  const onCodeSubmit = useCallback(async () => {
    const c = code.trim(); if (!c) return
    setCodeErr(''); setLoading(true)
    try {
      const r = await lookupByCode(c)
      if (r?.cafe) { setPicked(r.cafe); onSelectCafe(r.cafe, 'remote') }
      else setCodeErr('No venue found with this code')
    } catch { setCodeErr('No venue found with this code') }
    setLoading(false)
  }, [code, onSelectCafe])

  const pick = c => { setPicked(c); onSelectCafe(c, 'remote') }

  /* ── Tab switch with crossfade ─────────────────────────────────────────── */
  const switchTab = id => {
    if (id === tab) return
    setSearched(false); setQuery(''); setCafes([]); setCodeErr('')
    if (contentRef.current) {
      gsap.to(contentRef.current, { opacity: 0, y: 10, duration: 0.15, ease: 'power2.in',
        onComplete: () => { setTab(id); gsap.to(contentRef.current, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' }) }
      })
    } else setTab(id)
  }

  const INP = `w-full py-3 sm:py-3.5 px-4 sm:px-5 rounded-2xl
    text-[14px] sm:text-[15px] font-medium text-white/90
    placeholder-white/20
    bg-white/[0.04] border border-white/[0.07]
    outline-none transition-all duration-300
    focus:border-emerald-500/40 focus:bg-white/[0.06]
    focus:ring-2 focus:ring-emerald-500/10
    focus:shadow-[0_0_20px_rgba(16,185,129,0.08)]`

  /* ═══ RENDER ═══════════════════════════════════════════════════════════════ */
  return (
    <div ref={pageRef}
      className="relative min-h-dvh flex flex-col lg:flex-row overflow-hidden"
      style={{ fontFamily: FONTS.body }}>

      {/* ── Background ── */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 40% 25%, #0c231d 0%, #060e0c 50%, #030807 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 75% 75%, rgba(5,80,55,0.1) 0%, transparent 55%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 20% 60%, rgba(13,148,136,0.04) 0%, transparent 40%)' }} />
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '200px' }} />
      </div>

      {/* ── Confirm sheet ── */}
      {isCafeSelected && picked && <Sheet cafe={picked} onConfirm={onConfirmRemote} onCancel={onGoBack} />}

      {/* ═══ LEFT — Hero (desktop only) ═══════════════════════════════════════ */}
      <div ref={heroRef}
        className="hidden lg:flex lg:w-[48%] xl:w-[45%] 2xl:w-[42%] relative z-10 min-h-dvh"
        style={{ opacity: 0 }}>
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />
        <HeroPanel />
      </div>

      {/* ═══ RIGHT — Search panel ═════════════════════════════════════════════ */}
      <div className="relative z-10 flex-1 flex flex-col min-h-dvh">
        <div className="flex flex-col flex-1 w-full
                        max-w-full sm:max-w-lg md:max-w-xl lg:max-w-none
                        mx-auto lg:mx-0
                        px-5 sm:px-6 md:px-8 lg:px-10 xl:px-14 2xl:px-16"
          style={{
            paddingTop: 'max(48px, calc(env(safe-area-inset-top) + 20px))',
            paddingBottom: 'max(20px, calc(env(safe-area-inset-bottom) + 12px))',
          }}>

          {/* ── Header ── */}
          <div ref={headerRef} className="text-center lg:text-left mb-6 sm:mb-7 lg:mb-8" style={{ opacity: 0 }}>
            {/* Mobile pill */}
            <div className="inline-flex lg:hidden items-center gap-2 px-3.5 py-1.5 rounded-full mb-4
                            bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] sm:text-[11px] font-bold text-white/35 tracking-[0.18em] uppercase">
                Discover
              </span>
            </div>

            <h1 className="text-[24px] sm:text-[28px] md:text-[30px] lg:text-[26px] xl:text-[30px]
                           font-extrabold text-white/95 tracking-tight mb-1.5 leading-none">
              <span className="lg:hidden">Find your venue</span>
              <span className="hidden lg:inline">Search venues</span>
            </h1>
            <p className="text-[12px] sm:text-[13px] lg:text-[14px] text-white/28 leading-relaxed">
              Search by name, browse nearby, or enter a venue code
            </p>
          </div>

          {/* ── Tab bar ── */}
          <div ref={tabBarRef} className="mb-5 sm:mb-6 lg:mb-7" style={{ opacity: 0 }}>
            <div ref={scrollRef}
              className="relative flex gap-1.5 sm:gap-2 overflow-x-auto pb-2.5 lg:flex-wrap"
              style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
              {/* Sliding indicator */}
              <div ref={indicatorRef}
                className="absolute bottom-0 h-[2.5px] rounded-full bg-emerald-400
                           will-change-transform shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                style={{ left: 0, width: 0 }} />
              {TABS.map(t => {
                const on = tab === t.id; const I = t.ic
                return (
                  <button key={t.id} data-tab={t.id} onClick={() => switchTab(t.id)}
                    className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5
                      rounded-xl text-[11.5px] sm:text-[12.5px] font-semibold
                      whitespace-nowrap shrink-0
                      transition-all duration-300 cursor-pointer select-none
                      ${on
                        ? 'bg-emerald-500/12 text-emerald-400'
                        : 'bg-white/[0.025] text-white/30 hover:text-white/50 hover:bg-white/[0.045]'
                      }`}
                    style={{ fontFamily: FONTS.body, WebkitTapHighlightColor: 'transparent' }}>
                    <I />{t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Content area ── */}
          <div ref={contentRef} className="flex-1 pb-6" style={{ opacity: 0 }}>

            {/* SEARCH */}
            {tab === 'search' && (
              <div>
                <div className="relative mb-4 sm:mb-5">
                  <div className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-white/20">
                    <IcS />
                  </div>
                  <input type="text" placeholder="Search cafe by name…"
                    value={query} onChange={e => onSearch(e.target.value)} autoFocus
                    className={`${INP} pl-11 sm:pl-12`}
                    style={{ fontFamily: FONTS.body }} />
                </div>
                {loading && <Skel />}
                <div ref={listRef} className="flex flex-col gap-2.5 sm:gap-3">
                  {!loading && cafes.map(c => <CafeCard key={c._id} cafe={c} onSelect={pick} />)}
                </div>
                {!loading && !cafes.length && searched && <EmptyMsg msg={`No venues found for "${query}"`} />}
                {!loading && !cafes.length && !searched && <SearchPrompt />}
              </div>
            )}

            {/* NEARBY */}
            {tab === 'nearby' && (
              <div>
                {!gps && <EmptyMsg msg="Enable location access to discover nearby venues" />}
                {loading && gps && <Skel />}
                <div ref={listRef} className="flex flex-col gap-2.5 sm:gap-3">
                  {!loading && cafes.map(c => <CafeCard key={c._id} cafe={c} onSelect={pick} />)}
                </div>
                {!loading && gps && !cafes.length && <EmptyMsg msg="No venues found nearby" />}
              </div>
            )}

            {/* FAVORITES */}
            {tab === 'favorites' && (
              <div>
                {loading && <Skel />}
                <div ref={listRef} className="flex flex-col gap-2.5 sm:gap-3">
                  {!loading && cafes.map(c => <CafeCard key={c._id} cafe={c} onSelect={pick} />)}
                </div>
                {!loading && !cafes.length && <EmptyMsg msg="No favorites yet — save venues you love" />}
              </div>
            )}

            {/* CODE */}
            {tab === 'code' && (
              <div>
                <div className="flex gap-3 mb-4">
                  <input type="text" placeholder="Enter venue code"
                    value={code}
                    onChange={e => { setCode(e.target.value); setCodeErr('') }}
                    onKeyDown={e => e.key === 'Enter' && onCodeSubmit()}
                    autoFocus
                    className={INP}
                    style={{ fontFamily: FONTS.body, flex: 1 }} />
                  <button onClick={onCodeSubmit} disabled={!code.trim() || loading}
                    className="px-6 sm:px-7 py-3 sm:py-3.5 rounded-2xl
                               text-[14px] font-bold text-white shrink-0
                               active:scale-[0.95] will-change-transform
                               disabled:opacity-20 disabled:cursor-not-allowed
                               transition-all duration-300
                               shadow-[0_4px_16px_rgba(5,150,105,0.2)]"
                    style={{
                      fontFamily: FONTS.body, WebkitTapHighlightColor: 'transparent',
                      background: code.trim() ? 'linear-gradient(135deg, #059669, #0d9488)' : 'rgba(255,255,255,0.03)',
                    }}>
                    Go
                  </button>
                </div>
                {codeErr && (
                  <div className="flex items-center justify-center py-3 px-4 rounded-xl
                                  bg-red-500/[0.08] border border-red-500/15">
                    <span className="text-[12px] sm:text-[13px] font-medium text-red-400/80">{codeErr}</span>
                  </div>
                )}
                {!codeErr && !loading && <EmptyMsg msg="Enter the venue code printed on your table or receipt" />}
              </div>
            )}

            {/* RECENT */}
            {tab === 'recent' && (
              <div>
                {loading && <Skel />}
                <div ref={listRef} className="flex flex-col gap-2.5 sm:gap-3">
                  {!loading && cafes.map(c => <CafeCard key={c._id} cafe={c} onSelect={pick} />)}
                </div>
                {!loading && !cafes.length && <EmptyMsg msg="No recent visits yet — order from a venue to see it here" />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CafeAccessPage