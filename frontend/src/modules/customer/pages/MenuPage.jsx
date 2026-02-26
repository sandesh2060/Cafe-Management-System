// src/modules/customer/pages/MenuPage.jsx
import { useEffect, useRef, useContext, useState, useCallback } from 'react'
import { useDispatch, useSelector }                              from 'react-redux'
import { useNavigate }                                           from 'react-router-dom'
import gsap                                                      from 'gsap'
import { ScrollTrigger }                                         from 'gsap/ScrollTrigger'
import { ScrollToPlugin }                                        from 'gsap/ScrollToPlugin'
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
import NavAvatar                   from '../components/menu/NavAvatar'
import NotificationBell            from '../components/notifications/NotificationBell'
import CallStatusBanner            from '../components/callwaiter/CallStatusBanner'
import { useRecommendations }      from '../hooks/useRecommendations'
import { usePaymentLogoutTrigger } from '../hooks/usePaymentLogoutTrigger'
import { Search, X, Sparkles, ChevronUp, Moon, Sun } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

const CAFE_ID = import.meta.env.VITE_CAFE_ID || 'demo'

const injectFonts = () => {
  if (document.getElementById('mp-fonts')) return
  const l = document.createElement('link')
  l.id = 'mp-fonts'; l.rel = 'stylesheet'
  l.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&family=DM+Sans:wght@400;500;600;700&display=swap'
  document.head.appendChild(l)
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
  const { isDark, toggleTheme } = useContext(ThemeContext)

  const { recommendations, weather, loading: recLoading } = useRecommendations(CAFE_ID)
  usePaymentLogoutTrigger()

  const [searchOpen,    setSearchOpen]    = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)

  const pageRef        = useRef(null)
  const headerRef      = useRef(null)
  const navLeftRef     = useRef(null)
  const navRightRef    = useRef(null)
  const searchBtnRef   = useRef(null)
  const searchRowRef   = useRef(null)
  const searchInputRef = useRef(null)
  const searchFieldRef = useRef(null)
  const clearBtnRef    = useRef(null)
  const scrollerRef    = useRef(null)
  const welcomeRef     = useRef(null)
  const recRef         = useRef(null)
  const pillsRef       = useRef(null)
  const gridRef        = useRef(null)
  const scrollBtnRef   = useRef(null)
  const brandDotRef    = useRef(null)

  useEffect(() => { injectFonts(); dispatch(fetchMenu(CAFE_ID)) }, [dispatch])

  useEffect(() => {
    if (!brandDotRef.current) return
    gsap.to(brandDotRef.current, {
      scale: 1.8, opacity: 0,
      duration: 1.6, repeat: -1,
      ease: 'power2.out',
    })
  }, [])

  const animateGrid = useCallback(() => {
    if (!gridRef.current) return
    const cards = gridRef.current.querySelectorAll('.mc')
    if (!cards.length) return
    gsap.fromTo(cards,
      { y: 24, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, duration: 0.38, stagger: 0.05, ease: 'power2.out', force3D: true, clearProps: 'all' }
    )
  }, [])

  useEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const ctx = gsap.context(() => {
        gsap.fromTo(headerRef.current,
          { y: -56, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', force3D: true, clearProps: 'transform' }
        )
        gsap.fromTo(navLeftRef.current,
          { x: -20, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.44, delay: 0.12, ease: 'power3.out', force3D: true, clearProps: 'transform' }
        )
        gsap.fromTo(
          navRightRef.current?.children ? Array.from(navRightRef.current.children) : [],
          { scale: 0.5, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.36, delay: 0.18, stagger: 0.08, ease: 'back.out(2.5)', force3D: true, clearProps: 'transform' }
        )
        ;[welcomeRef, recRef, pillsRef].forEach((r, i) => {
          if (!r.current) return
          gsap.fromTo(r.current,
            { y: 32, opacity: 0 },
            {
              y: 0, opacity: 1, duration: 0.52, ease: 'power2.out', force3D: true, clearProps: 'transform',
              scrollTrigger: { trigger: r.current, scroller: scrollerRef.current, start: 'top 96%' },
              delay: i * 0.06,
            }
          )
        })
        ScrollTrigger.create({
          trigger: gridRef.current, scroller: scrollerRef.current, start: 'top 94%',
          onEnter: animateGrid,
        })
        ScrollTrigger.create({
          trigger: scrollerRef.current, scroller: scrollerRef.current, start: 'top-=1',
          onUpdate: self => {
            const p = Math.min(self.scroll() / 60, 1)
            gsap.set(headerRef.current, { paddingTop: `${11 - p * 3}px`, paddingBottom: `${10 - p * 2}px` })
          },
        })
      }, pageRef)
      return () => { ctx.revert(); ScrollTrigger.getAll().forEach(t => t.kill()) }
    })
    return () => mm.revert()
  }, [animateGrid])

  useEffect(() => {
    if (!items.length) return
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) animateGrid()
  }, [activeCategory, searchQuery, items.length, animateGrid])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || !scrollBtnRef.current) return
    const btn = scrollBtnRef.current
    let visible = false
    const onScroll = () => {
      const scrolled = scroller.scrollTop
      if (scrolled > 80 && !visible) {
        visible = true; btn.style.pointerEvents = 'auto'
        gsap.to(btn, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2.4)', overwrite: true })
      } else if (scrolled <= 80 && visible) {
        visible = false; btn.style.pointerEvents = 'none'
        gsap.to(btn, { scale: 0, opacity: 0, duration: 0.2, ease: 'power2.in', overwrite: true })
      }
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [])

  const openSearch = () => {
    setSearchOpen(true)
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    tl.to(navLeftRef.current, { opacity: 0, x: -12, duration: 0.18, force3D: true }, 0)
    tl.to(
      Array.from(navRightRef.current?.children ?? []).filter(el => el !== searchBtnRef.current),
      { opacity: 0, scale: 0.8, duration: 0.16, stagger: 0.04 }, 0
    )
    tl.to(searchBtnRef.current, { rotate: 90, duration: 0.22, ease: 'back.out(3)' }, 0)
    tl.set(searchRowRef.current, { display: 'block' }, 0.12)
    tl.fromTo(searchRowRef.current,
      { height: 0, opacity: 0, paddingTop: 0, paddingBottom: 0 },
      { height: 'auto', opacity: 1, paddingTop: 10, paddingBottom: 10, duration: 0.34 }, 0.12
    )
    tl.fromTo(searchInputRef.current,
      { scaleX: 0.88, opacity: 0, transformOrigin: 'right center' },
      { scaleX: 1, opacity: 1, duration: 0.38, ease: 'expo.out', clearProps: 'transform',
        onComplete: () => searchFieldRef.current?.focus() }, 0.2
    )
  }

  const closeSearch = () => {
    if (searchQuery) { dispatch(setSearchQuery('')); searchFieldRef.current?.focus(); return }
    const tl = gsap.timeline({
      defaults: { ease: 'power3.inOut' },
      onComplete: () => {
        setSearchOpen(false)
        gsap.set(searchRowRef.current, { display: 'none', height: 0, opacity: 0, paddingTop: 0, paddingBottom: 0 })
      },
    })
    tl.to(searchInputRef.current,  { opacity: 0, scaleX: 0.88, duration: 0.18 }, 0)
    tl.to(searchRowRef.current,    { height: 0, opacity: 0, paddingTop: 0, paddingBottom: 0, duration: 0.26 }, 0.06)
    tl.to(searchBtnRef.current,    { rotate: 0, duration: 0.22, ease: 'back.out(2)', clearProps: 'transform' }, 0)
    tl.to(navLeftRef.current,      { opacity: 1, x: 0, duration: 0.28, clearProps: 'transform' }, 0.12)
    tl.to(
      Array.from(navRightRef.current?.children ?? []).filter(el => el !== searchBtnRef.current),
      { opacity: 1, scale: 1, duration: 0.28, stagger: 0.05, ease: 'back.out(2)', clearProps: 'transform' }, 0.16
    )
  }

  useEffect(() => {
    if (!clearBtnRef.current) return
    gsap.to(clearBtnRef.current, searchQuery
      ? { scale: 1, opacity: 1, rotate: 0,  duration: 0.22, ease: 'back.out(2.5)', clearProps: 'transform' }
      : { scale: 0, opacity: 0, rotate: 45, duration: 0.16, ease: 'power2.in' }
    )
  }, [searchQuery])

  const handleScrollTop = () => {
    gsap.fromTo(scrollBtnRef.current, { scale: 0.82 }, { scale: 1, duration: 0.45, ease: 'elastic.out(1.2,0.5)' })
    gsap.to(scrollerRef.current, { scrollTo: { y: 0 }, duration: 0.65, ease: 'power3.inOut' })
  }

  // Theme-aware values
  const navBg         = isDark ? 'rgba(8,5,2,0.85)'          : 'rgba(255,251,244,0.85)'
  const navBorder     = isDark ? 'rgba(255,159,28,0.08)'      : 'rgba(210,168,110,0.22)'
  const navShadow     = isDark
    ? '0 1px 0 rgba(255,159,28,0.05), 0 6px 28px rgba(0,0,0,0.5)'
    : '0 1px 0 rgba(210,168,110,0.3), 0 4px 18px rgba(92,51,23,0.06)'
  const iconColor     = isDark ? 'rgba(255,200,120,0.5)'      : 'rgba(92,51,23,0.4)'
  const iconHover     = isDark ? '#FFB84D'                    : '#8B5E3C'

  return (
    <div
      ref={pageRef}
      className="mp-root customer-container min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--bg-app)', fontFamily: '"DM Sans", sans-serif' }}
    >

      {/* ══════════ NAVBAR ══════════ */}
      <header
        ref={headerRef}
        style={{
          position: 'sticky', top: 0, zIndex: 40,
          padding: '11px 18px 10px',
          background: navBg,
          backdropFilter: 'blur(32px) saturate(160%)',
          WebkitBackdropFilter: 'blur(32px) saturate(160%)',
          borderBottom: `1px solid ${navBorder}`,
          boxShadow: navShadow,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* LEFT: avatar + brand */}
          <div ref={navLeftRef} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <NavAvatar
              name={user?.name}
              avatar={user?.avatar}
              isOnline={true}
              onClick={() => navigate('/profile')}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontFamily: '"Fraunces", serif',
                  fontWeight: 900, fontSize: 16,
                  letterSpacing: '-0.03em', lineHeight: 1,
                  background: isDark
                    ? 'linear-gradient(120deg,#FFD580 0%,#FF9F1C 55%,#E05C2A 100%)'
                    : 'linear-gradient(120deg,#E08800 0%,#E05C2A 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  कौसी चिया
                </span>
                {/* pulsing live dot */}
                <span style={{ position: 'relative', width: 6, height: 6, flexShrink: 0 }}>
                  <span ref={brandDotRef} style={{
                    position: 'absolute', inset: -2,
                    borderRadius: '50%',
                    background: 'rgba(34,197,94,0.45)',
                    transformOrigin: 'center',
                  }} />
                  <span style={{
                    position: 'absolute', inset: 0,
                    borderRadius: '50%', background: '#22c55e',
                  }} />
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 500, color: iconColor, lineHeight: 1 }}>
                  {user?.name ? `Hey, ${user.name.split(' ')[0]} 👋` : 'Smart Cafe · Kathmandu'}
                </span>
                {weather?.condition && (
                  <>
                    <span style={{ color: iconColor, opacity: 0.4, fontSize: 8 }}>·</span>
                    <span style={{ fontSize: 10, lineHeight: 1 }}>{weather.icon || '🌤️'}</span>
                    {weather.temp && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: iconColor, lineHeight: 1 }}>
                        {Math.round(weather.temp)}°
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: bare icon buttons */}
          <div ref={navRightRef} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>

            {/* Theme toggle */}
            <button onClick={toggleTheme} aria-label="Toggle theme" className="nb-icon">
              {isDark ? <Sun size={19} /> : <Moon size={19} />}
            </button>

            {/* Bell — wrapped to override its internal styles */}
            <span className="nb-bell-wrap">
              <NotificationBell />
            </span>

            {/* Search */}
            <button
              ref={searchBtnRef}
              onClick={searchOpen ? closeSearch : openSearch}
              aria-label={searchOpen ? 'Close search' : 'Search'}
              className="nb-icon"
              style={{ color: searchOpen ? '#FF9F1C' : undefined }}
            >
              {searchOpen ? <X size={19} /> : <Search size={19} />}
            </button>
          </div>
        </div>

        {/* Search expand row */}
        <div ref={searchRowRef} style={{ display: 'none', height: 0, opacity: 0, overflow: 'hidden' }}>
          <div ref={searchInputRef} style={{ position: 'relative', marginTop: 9 }}>
            <span style={{
              position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: searchFocused ? '#FF9F1C' : iconColor,
              transition: 'color 0.2s',
              display: 'flex',
            }}>
              <Search size={14} />
            </span>
            <input
              ref={searchFieldRef}
              type="text" inputMode="search"
              value={searchQuery}
              onChange={e => dispatch(setSearchQuery(e.target.value))}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search dishes, flavours…"
              className="mp-search-input"
            />
            <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {searchQuery && items.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,159,28,0.12)', color: '#FF9F1C' }}>
                  {items.length}
                </span>
              )}
              <button
                ref={clearBtnRef}
                onClick={() => { dispatch(setSearchQuery('')); searchFieldRef.current?.focus() }}
                aria-label="Clear"
                style={{
                  width: 24, height: 24, borderRadius: 7, border: 'none',
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', opacity: 0,
                }}
              >
                <X size={12} />
              </button>
            </div>
          </div>
          {searchQuery && (
            <p style={{ fontSize: 11, marginTop: 6, paddingLeft: 4, color: iconColor }}>
              {items.length > 0
                ? <>{items.length} result{items.length !== 1 ? 's' : ''} for <strong style={{ color: '#FF9F1C' }}>"{searchQuery}"</strong></>
                : <>No results for <strong style={{ color: '#E05C2A' }}>"{searchQuery}"</strong></>
              }
            </p>
          )}
        </div>
      </header>

      {callStatus !== 'idle' && (
        <div style={{ zIndex: 30, padding: '8px 16px 0' }}><CallStatusBanner /></div>
      )}

      {/* SCROLL BODY */}
      <div
        ref={scrollerRef}
        className="scrollbar-hide"
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 112 }}
      >
        <div ref={welcomeRef}><WelcomeCard weather={weather} /></div>
        {!searchQuery && (
          <div ref={recRef}>
            <RecommendedSection items={recommendations} weather={weather} loading={recLoading} />
          </div>
        )}
        {!searchQuery && (
          <div
            ref={pillsRef}
            style={{
              position: 'sticky', top: 0, zIndex: 20,
              padding: '10px 0 8px',
              background: isDark ? 'rgba(8,5,2,0.93)' : 'rgba(255,251,244,0.93)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              borderBottom: `1px solid ${navBorder}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px', marginBottom: 8 }}>
              <Sparkles size={13} style={{ color: '#FF9F1C' }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: iconColor }}>
                Categories
              </span>
            </div>
            <CategoryPills categories={categories} active={activeCategory} onChange={c => dispatch(setActiveCategory(c))} />
          </div>
        )}
        <div ref={gridRef} style={{ padding: '12px 16px 32px' }}>
          <MenuGrid items={items} />
        </div>
      </div>

      <FloatingActions />

      {/* Scroll to top */}
      <button
        ref={scrollBtnRef}
        onClick={handleScrollTop}
        aria-label="Scroll to top"
        style={{
          position: 'fixed', bottom: 96, right: 16,
          width: 38, height: 38, borderRadius: 12,
          border: 'none', cursor: 'pointer',
          background: isDark ? 'rgba(16,10,4,0.92)' : 'rgba(255,251,244,0.95)',
          backdropFilter: 'blur(16px)', color: '#FF9F1C',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isDark
            ? '0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,159,28,0.1)'
            : '0 4px 16px rgba(92,51,23,0.13), 0 0 0 1px rgba(210,168,110,0.18)',
          zIndex: 40, opacity: 0, transform: 'scale(0)', pointerEvents: 'none',
        }}
      >
        <ChevronUp size={16} strokeWidth={2.5} />
      </button>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

        /* Minimal bare icon button — no box */
        .nb-icon {
          background: none;
          border: none;
          padding: 2px;
          margin: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${iconColor};
          border-radius: 6px;
          transition: color 0.16s ease, transform 0.15s cubic-bezier(.34,1.56,.64,1), opacity 0.15s;
          -webkit-tap-highlight-color: transparent;
          outline: none;
        }
        .nb-icon:hover  { color: ${iconHover}; transform: scale(1.15); }
        .nb-icon:active { transform: scale(0.85); opacity: 0.7; }
        .nb-icon:focus-visible { outline: 2px solid rgba(255,159,28,0.4); outline-offset: 3px; }

        /* Strip all styles from NotificationBell's internal button */
        .nb-bell-wrap > button,
        .nb-bell-wrap button {
          all: unset !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 2px !important;
          border-radius: 6px !important;
          color: ${iconColor} !important;
          position: relative !important;
          transition: color 0.16s ease, transform 0.15s cubic-bezier(.34,1.56,.64,1) !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        .nb-bell-wrap > button:hover,
        .nb-bell-wrap button:hover  { color: ${iconHover} !important; transform: scale(1.15) !important; }
        .nb-bell-wrap > button:active,
        .nb-bell-wrap button:active { transform: scale(0.85) !important; }
        .nb-bell-wrap button svg    { color: inherit !important; width: 19px !important; height: 19px !important; }

        .mp-search-input {
          width: 100%; height: 42px;
          padding: 0 68px 0 36px;
          border-radius: 13px;
          background: ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'};
          color: var(--text-primary);
          border: 1.5px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'};
          outline: none;
          font-family: "DM Sans", sans-serif;
          font-size: 14px;
          transition: border-color 0.22s, box-shadow 0.22s, background 0.22s;
        }
        .mp-search-input::placeholder { color: ${isDark ? 'rgba(255,200,100,0.2)' : 'rgba(92,51,23,0.25)'}; }
        .mp-search-input:focus {
          border-color: rgba(255,159,28,0.4);
          background: ${isDark ? 'rgba(255,159,28,0.05)' : 'rgba(255,159,28,0.03)'};
          box-shadow: 0 0 0 3px rgba(255,159,28,0.08);
        }
      `}</style>
    </div>
  )
}

export default MenuPage