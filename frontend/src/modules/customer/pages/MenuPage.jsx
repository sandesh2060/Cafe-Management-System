// src/modules/customer/pages/MenuPage.jsx
// ═══════════════════════════════════════════════════════════════
//  ✦ ULTRA-REFINED  ·  Icon-only search expands on tap
//  ✦ No greeting in navbar — clean, app-like chrome
//  ✦ Pro typography: Fraunces display + DM Sans body
//  ✦ Hardware-accelerated GSAP throughout
// ═══════════════════════════════════════════════════════════════
import { useEffect, useRef, useContext, useState, useCallback } from 'react'
import { useDispatch, useSelector }                              from 'react-redux'
import { useNavigate }                                           from 'react-router-dom'
import gsap                                                      from 'gsap'
import { ScrollTrigger }                                         from 'gsap/ScrollTrigger'
import {
  fetchMenu, selectFilteredItems, selectCategories,
  selectActiveCategory, selectSearchQuery,
  setActiveCategory, setSearchQuery,
} from '@store/slices/menuSlice'
import { selectUser }              from '@store/slices/authSlice'
import { selectCallStatus }        from '@store/slices/callWaiterSlice'
import { ThemeContext }            from '@shared/context/ThemeContext'
import FloatingActions             from '../components/menu/FloatingActions'
import RecommendedSection          from '../components/menu/RecommendedSection'
import MenuGrid                    from '../components/menu/MenuGrid'
import CategoryPills               from '../components/menu/CategoryPills'
import WelcomeCard                 from '../components/menu/WelcomeCard'
import NotificationBell            from '../components/notifications/NotificationBell'
import CallStatusBanner            from '../components/callwaiter/CallStatusBanner'
import { useRecommendations }      from '../hooks/useRecommendations'
import { usePaymentLogoutTrigger } from '../hooks/usePaymentLogoutTrigger'
import { Search, X, ArrowUp, Sparkles } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const CAFE_ID = import.meta.env.VITE_CAFE_ID || 'demo'

// ─── font injection (idempotent) ────────────────────────────────
const injectFonts = () => {
  if (document.getElementById('mp-fonts')) return
  const link = document.createElement('link')
  link.id = 'mp-fonts'
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,700;9..144,900&family=DM+Sans:wght@300;400;500;600;700&display=swap'
  document.head.appendChild(link)
}

const MenuPage = () => {
  const dispatch       = useDispatch()
  const navigate       = useNavigate()
  const user           = useSelector(selectUser)
  const items          = useSelector(selectFilteredItems)
  const categories     = useSelector(selectCategories)
  const activeCategory = useSelector(selectActiveCategory)
  const searchQuery    = useSelector(selectSearchQuery)
  const callStatus     = useSelector(selectCallStatus)
  const { isDark }     = useContext(ThemeContext)

  const { recommendations, weather, loading: recLoading } = useRecommendations(CAFE_ID)
  usePaymentLogoutTrigger()

  // ── local UI state ─────────────────────────────────────────
  const [searchOpen,    setSearchOpen]    = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)

  // ── refs ── navbar ──────────────────────────────────────────
  const pageRef        = useRef(null)
  const headerRef      = useRef(null)
  const navLogoRef     = useRef(null)
  const navActionsRef  = useRef(null)
  const searchBtnRef   = useRef(null)
  const searchRowRef   = useRef(null)
  const searchInputRef = useRef(null)
  const searchFieldRef = useRef(null)
  const searchGlowRef  = useRef(null)
  const clearBtnRef    = useRef(null)

  // ── refs ── body ────────────────────────────────────────────
  const scrollerRef  = useRef(null)
  const welcomeRef   = useRef(null)
  const recRef       = useRef(null)
  const pillsRef     = useRef(null)
  const gridRef      = useRef(null)
  const scrollBtnRef = useRef(null)

  useEffect(() => {
    injectFonts()
    dispatch(fetchMenu(CAFE_ID))
  }, [dispatch])

  // ══════════════════════════════════════════════════════════════
  //  ENTRANCE + SCROLL ANIMATIONS
  // ══════════════════════════════════════════════════════════════
  useEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const ctx = gsap.context(() => {

        // navbar entrance
        const tl = gsap.timeline({ delay: 0.06, defaults: { ease: 'power3.out' } })
        tl.fromTo(headerRef.current,
            { y: -20, opacity: 0 },
            { y:   0, opacity: 1, duration: 0.5, force3D: true, clearProps: 'transform' }
          )
          .fromTo(navLogoRef.current,
            { x: -16, opacity: 0 },
            { x:   0, opacity: 1, duration: 0.42, force3D: true, clearProps: 'transform' },
            '-=0.28'
          )
          .fromTo(navActionsRef.current?.children ? Array.from(navActionsRef.current.children) : [],
            { scale: 0.7, opacity: 0 },
            { scale: 1,   opacity: 1, duration: 0.38, stagger: 0.06, ease: 'back.out(2)', force3D: true, clearProps: 'transform' },
            '-=0.3'
          )

        // body sections — scroll-triggered
        const sections = [welcomeRef, recRef, pillsRef].map(r => r.current).filter(Boolean)
        sections.forEach((el, i) => {
          gsap.from(el, {
            scrollTrigger: { trigger: el, scroller: scrollerRef.current, start: 'top 95%' },
            y: 30, opacity: 0, duration: 0.52, delay: i * 0.04,
            ease: 'power2.out', force3D: true, clearProps: 'transform',
          })
        })

        // grid entrance
        ScrollTrigger.create({
          trigger: gridRef.current, scroller: scrollerRef.current, start: 'top 92%',
          onEnter: animateGrid,
        })

        // header compress on scroll
        ScrollTrigger.create({
          trigger: scrollerRef.current, scroller: scrollerRef.current, start: 'top-=1',
          onUpdate: (self) => {
            const p = Math.min(self.scroll() / 80, 1)
            if (headerRef.current) {
              gsap.set(headerRef.current, {
                paddingTop:    `${12 - p * 5}px`,
                paddingBottom: `${8  - p * 3}px`,
              })
            }
          },
        })

        // scroll-to-top button
        gsap.set(scrollBtnRef.current, { scale: 0, opacity: 0, force3D: true })
        ScrollTrigger.create({
          trigger: scrollerRef.current, scroller: scrollerRef.current, start: 'top-=260',
          onEnter:     () => gsap.to(scrollBtnRef.current, { scale: 1, opacity: 1, duration: 0.32, ease: 'back.out(2.2)', force3D: true, clearProps: 'transform' }),
          onLeaveBack: () => gsap.to(scrollBtnRef.current, { scale: 0, opacity: 0, duration: 0.22, ease: 'power2.in', force3D: true }),
        })
      }, pageRef)

      return () => { ctx.revert(); ScrollTrigger.getAll().forEach(t => t.kill()) }
    })
    return () => mm.revert()
  }, [])

  // ── re-animate grid on filter/search change ──────────────────
  const animateGrid = useCallback(() => {
    if (!gridRef.current) return
    const cards = gridRef.current.querySelectorAll('.mc')
    if (!cards.length) return
    gsap.fromTo(cards,
      { y: 28, opacity: 0, scale: 0.94, force3D: true },
      { y:  0, opacity: 1, scale: 1,    duration: 0.4, stagger: 0.055, ease: 'power2.out', force3D: true, clearProps: 'all' }
    )
  }, [])

  useEffect(() => {
    if (!items.length) return
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) animateGrid()
  }, [activeCategory, searchQuery, items.length, animateGrid])

  // ══════════════════════════════════════════════════════════════
  //  SEARCH EXPAND / COLLAPSE
  // ══════════════════════════════════════════════════════════════
  const openSearch = () => {
    setSearchOpen(true)

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    // shrink logo + hide actions
    tl.to(navLogoRef.current,
      { opacity: 0, x: -10, duration: 0.2, force3D: true }, 0
    )
    tl.to(Array.from(navActionsRef.current?.children ?? []).filter(el => el !== searchBtnRef.current),
      { opacity: 0, scale: 0.8, duration: 0.18, stagger: 0.03, force3D: true }, 0
    )
    // spin search icon → active state handled by class change
    tl.to(searchBtnRef.current,
      { rotate: 90, duration: 0.22, ease: 'back.out(3)', force3D: true }, 0
    )

    // reveal search row
    tl.set(searchRowRef.current, { display: 'block' }, 0.14)
    tl.fromTo(searchRowRef.current,
      { height: 0, opacity: 0, paddingTop: 0, paddingBottom: 0 },
      { height: 'auto', opacity: 1, paddingTop: 12, paddingBottom: 12, duration: 0.38 },
      0.14
    )
    // slide-in input
    tl.fromTo(searchInputRef.current,
      { scaleX: 0.85, opacity: 0, transformOrigin: 'right center', force3D: true },
      { scaleX: 1,    opacity: 1, duration: 0.42, ease: 'expo.out', force3D: true, clearProps: 'transform',
        onComplete: () => searchFieldRef.current?.focus() },
      0.22
    )
    // glow pulse
    if (searchGlowRef.current) {
      tl.fromTo(searchGlowRef.current,
        { opacity: 0, scaleX: 0.6, force3D: true },
        { opacity: 1, scaleX: 1,   duration: 0.6, ease: 'power2.out', force3D: true, clearProps: 'transform' },
        0.25
      )
    }
  }

  const closeSearch = () => {
    if (searchQuery) {
      dispatch(setSearchQuery(''))
      searchFieldRef.current?.focus()
      return
    }

    const tl = gsap.timeline({
      defaults: { ease: 'power3.inOut' },
      onComplete: () => {
        setSearchOpen(false)
        gsap.set(searchRowRef.current, { display: 'none', height: 0, opacity: 0, paddingTop: 0, paddingBottom: 0 })
      },
    })

    tl.to(searchInputRef.current,  { opacity: 0, scaleX: 0.88, duration: 0.2, force3D: true }, 0)
    tl.to(searchRowRef.current,    { height: 0, opacity: 0, paddingTop: 0, paddingBottom: 0, duration: 0.28 }, 0.06)
    tl.to(searchBtnRef.current,    { rotate: 0, duration: 0.24, ease: 'back.out(2)', force3D: true, clearProps: 'transform' }, 0)
    tl.to(navLogoRef.current,      { opacity: 1, x: 0, duration: 0.32, force3D: true, clearProps: 'transform' }, 0.14)
    tl.to(Array.from(navActionsRef.current?.children ?? []).filter(el => el !== searchBtnRef.current),
      { opacity: 1, scale: 1, duration: 0.32, stagger: 0.04, ease: 'back.out(2)', force3D: true, clearProps: 'transform' }, 0.18
    )
  }

  // ── clear button animate in/out ──────────────────────────────
  useEffect(() => {
    if (!clearBtnRef.current) return
    if (searchQuery) {
      gsap.to(clearBtnRef.current, { scale: 1, opacity: 1, rotate: 0, duration: 0.24, ease: 'back.out(2.5)', force3D: true, clearProps: 'transform' })
    } else {
      gsap.to(clearBtnRef.current, { scale: 0, opacity: 0, rotate: 45, duration: 0.18, ease: 'power2.in', force3D: true })
    }
  }, [searchQuery])

  // ── derived ──────────────────────────────────────────────────
  const firstName = user?.name?.split(' ')[0] || 'there'
  const initials  = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '☕'

  // ══════════════════════════════════════════════════════════════
  return (
    <div
      ref={pageRef}
      className="mp-root customer-container min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--bg-app)', fontFamily: '"DM Sans", sans-serif' }}
    >

      {/* ╔═══════════════════════════════════════════════════════╗
          ║  NAVBAR — icon-only, no greeting text               ║
          ╚═══════════════════════════════════════════════════════╝ */}
      <header
        ref={headerRef}
        className="sticky top-0 z-40 px-4 pt-3 pb-2"
        style={{
          background: isDark
            ? 'rgba(10, 7, 4, 0.94)'
            : 'rgba(255, 251, 244, 0.94)',
          backdropFilter: 'blur(26px)',
          WebkitBackdropFilter: 'blur(26px)',
          borderBottom: '1px solid var(--border-color)',
          boxShadow: isDark
            ? '0 1px 0 rgba(255,159,28,0.08), 0 6px 28px rgba(0,0,0,0.35)'
            : '0 1px 0 rgba(220,190,140,0.6), 0 4px 20px rgba(0,0,0,0.06)',
        }}
      >
        {/* ── Top row ───────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">

          {/* Logo / wordmark */}
          <div ref={navLogoRef} className="flex items-center gap-2.5 flex-shrink-0">
            <button
              onClick={() => navigate('/profile')}
              aria-label="Go to profile"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black select-none flex-shrink-0 active:scale-95 transition-transform"
              style={{
                background: 'linear-gradient(135deg,#FF9F1C,#E05C2A)',
                boxShadow: '0 3px 12px rgba(255,159,28,0.45)',
                fontFamily: '"Fraunces", serif',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {initials}
            </button>
            <span
              className="text-base font-bold tracking-tight leading-none hidden xs:block"
              style={{ color: 'var(--text-primary)', fontFamily: '"Fraunces", serif', fontWeight: 700 }}
            >
              Menu
            </span>
          </div>

          {/* Action icons */}
          <div ref={navActionsRef} className="flex items-center gap-1.5">
            <NotificationBell />

            {/* Search icon — morphs on open */}
            <button
              ref={searchBtnRef}
              onClick={searchOpen ? closeSearch : openSearch}
              aria-label={searchOpen ? 'Close search' : 'Open search'}
              className="nav-icon-btn"
              style={searchOpen ? {
                background: 'linear-gradient(135deg,#FF9F1C,#E05C2A)',
                color: '#fff',
                borderColor: 'transparent',
                boxShadow: '0 4px 14px rgba(255,159,28,0.4)',
              } : {}}
            >
              {searchOpen
                ? <X className="w-4 h-4" />
                : <Search className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ── Expanding search row ──────────────────────────── */}
        <div
          ref={searchRowRef}
          className="relative overflow-hidden"
          style={{ display: 'none', height: 0, opacity: 0 }}
        >
          {/* ambient glow */}
          <div
            ref={searchGlowRef}
            className="absolute inset-x-0 bottom-0 h-px pointer-events-none opacity-0"
            style={{ background: 'linear-gradient(90deg,transparent,rgba(255,159,28,0.6),transparent)' }}
          />

          <div ref={searchInputRef} className="relative mt-1">
            {/* left icon */}
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <Search
                className="w-4 h-4 transition-colors duration-300"
                style={{ color: searchFocused ? '#FF9F1C' : 'var(--text-muted)' }}
              />
            </div>

            <input
              ref={searchFieldRef}
              type="text"
              inputMode="search"
              value={searchQuery}
              onChange={e => dispatch(setSearchQuery(e.target.value))}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search dishes, flavours, categories…"
              className="search-input"
              style={{ fontSize: '16px' }}
            />

            {/* right — count + clear */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {searchQuery && items.length > 0 && (
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full animate-fade-in hidden sm:flex items-center gap-1"
                  style={{ background: 'rgba(255,159,28,0.12)', color: '#FF9F1C' }}
                >
                  {items.length} found
                </span>
              )}
              <button
                ref={clearBtnRef}
                onClick={() => { dispatch(setSearchQuery('')); searchFieldRef.current?.focus() }}
                aria-label="Clear search"
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-200"
                style={{ scale: 0, opacity: 0, background: 'var(--bg-card)', color: 'var(--text-muted)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* search result hint */}
          {searchQuery && (
            <p className="text-[11px] mt-1.5 px-1 animate-fade-in" style={{ color: 'var(--text-muted)' }}>
              {items.length > 0
                ? <>{items.length} result{items.length !== 1 ? 's' : ''} for <strong style={{ color: '#FF9F1C' }}>"{searchQuery}"</strong></>
                : <>No results for <strong style={{ color: '#E05C2A' }}>"{searchQuery}"</strong></>
              }
            </p>
          )}
        </div>
      </header>

      {/* call status */}
      {callStatus !== 'idle' && (
        <div className="z-30 px-4 pt-2"><CallStatusBanner /></div>
      )}

      {/* ╔═══════════════════════════════════════════════════════╗
          ║  SCROLL BODY                                        ║
          ╚═══════════════════════════════════════════════════════╝ */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden pb-28 scrollbar-hide"
      >
        {/* Welcome card */}
        <div ref={welcomeRef}>
          <WelcomeCard weather={weather} />
        </div>

        {/* Recommendations */}
        {!searchQuery && (
          <div ref={recRef}>
            <RecommendedSection items={recommendations} weather={weather} loading={recLoading} />
          </div>
        )}

        {/* Sticky category pills */}
        {!searchQuery && (
          <div
            ref={pillsRef}
            className="sticky z-20 pt-3 pb-2"
            style={{
              top: 0,
              background: isDark ? 'rgba(10,7,4,0.92)' : 'rgba(255,251,244,0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <div className="px-4 flex items-center gap-2 mb-2.5">
              <Sparkles className="w-3.5 h-3.5" style={{ color: '#FF9F1C' }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--text-muted)', fontFamily: '"DM Sans", sans-serif' }}
              >
                Categories
              </span>
            </div>
            <CategoryPills
              categories={categories}
              active={activeCategory}
              onChange={c => dispatch(setActiveCategory(c))}
            />
          </div>
        )}

        {/* Menu grid */}
        <div ref={gridRef} className="px-4 pt-3 pb-8">
          <MenuGrid items={items} />
        </div>
      </div>

      {/* Floating actions */}
      <FloatingActions />

      {/* Scroll to top */}
      <button
        ref={scrollBtnRef}
        onClick={() => scrollerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Scroll to top"
        className="fixed bottom-24 right-4 w-11 h-11 rounded-2xl shadow-xl flex items-center justify-center z-40"
        style={{
          background: 'linear-gradient(135deg,#FF9F1C,#E05C2A)',
          color: '#fff',
          boxShadow: '0 4px 18px rgba(255,159,28,0.45)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 12V4M4 7l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* ── Scoped styles ──────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,700;9..144,900&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

        .nav-icon-btn {
          width: 36px; height: 36px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          color: var(--text-secondary);
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          transition: transform 0.18s cubic-bezier(.34,1.56,.64,1), background 0.2s, box-shadow 0.2s;
          cursor: pointer;
          transform: translateZ(0);
          -webkit-font-smoothing: antialiased;
        }
        .nav-icon-btn:hover  { background: var(--bg-hover, var(--bg-card)); transform: scale(1.06) translateZ(0); }
        .nav-icon-btn:active { transform: scale(0.9) translateZ(0); }

        .search-input {
          width: 100%;
          height: 48px;
          padding-left: 42px;
          padding-right: 90px;
          border-radius: 16px;
          background: var(--bg-card);
          color: var(--text-primary);
          border: 1.5px solid var(--border-color);
          outline: none;
          font-family: "DM Sans", sans-serif;
          font-size: 15px;
          transition: border-color 0.25s, box-shadow 0.25s;
        }
        .search-input::placeholder { color: var(--text-muted); }
        .search-input:focus {
          border-color: #FF9F1C;
          box-shadow: 0 0 0 3px rgba(255,159,28,0.14), 0 4px 16px rgba(255,159,28,0.1);
        }

        @keyframes fadeIn { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:translateY(0) } }
        .animate-fade-in { animation: fadeIn 0.24s ease-out both; }

        /* Hardware acceleration */
        .mp-root button, .mp-root [class*="transition"] {
          transform: translateZ(0);
          -webkit-font-smoothing: antialiased;
        }
      `}</style>
    </div>
  )
}

export default MenuPage