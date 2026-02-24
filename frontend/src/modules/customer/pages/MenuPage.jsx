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
import { Search, X, Sparkles }     from 'lucide-react'

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
  const { isDark }     = useContext(ThemeContext)

  const { recommendations, weather, loading: recLoading } = useRecommendations(CAFE_ID)
  usePaymentLogoutTrigger()

  const [searchOpen,    setSearchOpen]    = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)

  // refs
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

  useEffect(() => { injectFonts(); dispatch(fetchMenu(CAFE_ID)) }, [dispatch])

  // ── ANIMATIONS ─────────────────────────────────────────────────
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

        // Navbar slide in
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

        // Body sections — fade up on scroll
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

        // Grid on enter
        ScrollTrigger.create({
          trigger: gridRef.current, scroller: scrollerRef.current, start: 'top 94%',
          onEnter: animateGrid,
        })

        // Header compress
        ScrollTrigger.create({
          trigger: scrollerRef.current, scroller: scrollerRef.current, start: 'top-=1',
          onUpdate: self => {
            const p = Math.min(self.scroll() / 60, 1)
            gsap.set(headerRef.current, { paddingTop: `${12 - p * 4}px`, paddingBottom: `${8 - p * 2}px` })
          },
        })

        // (scroll-to-top handled by native scroll listener below for reliability)
      }, pageRef)
      return () => { ctx.revert(); ScrollTrigger.getAll().forEach(t => t.kill()) }
    })
    return () => mm.revert()
  }, [animateGrid])

  useEffect(() => {
    if (!items.length) return
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) animateGrid()
  }, [activeCategory, searchQuery, items.length, animateGrid])

  // ── Scroll-to-top button: native scroll listener (reliable with custom scroller) ──
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || !scrollBtnRef.current) return

    const btn = scrollBtnRef.current
    let visible = false

    const onScroll = () => {
      const scrolled = scroller.scrollTop
      if (scrolled > 80 && !visible) {
        visible = true
        btn.style.pointerEvents = 'auto'
        gsap.to(btn, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2.4)', overwrite: true })
      } else if (scrolled <= 80 && visible) {
        visible = false
        btn.style.pointerEvents = 'none'
        gsap.to(btn, { scale: 0, opacity: 0, duration: 0.2, ease: 'power2.in', overwrite: true })
      }
    }

    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [])


  // ── SEARCH ───────────────────────────────────────────────────
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

  // ── COLORS ──────────────────────────────────────────────────
  const navBg = isDark ? 'rgba(10,7,4,0.96)' : 'rgba(255,251,244,0.96)'
  const navShadow = isDark
    ? '0 1px 0 rgba(255,159,28,0.07), 0 4px 24px rgba(0,0,0,0.4)'
    : '0 1px 0 rgba(210,180,130,0.5), 0 4px 16px rgba(0,0,0,0.05)'

  return (
    <div
      ref={pageRef}
      className="mp-root customer-container min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--bg-app)', fontFamily: '"DM Sans", sans-serif' }}
    >

      {/* ══════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════ */}
      <header
        ref={headerRef}
        style={{
          position: 'sticky', top: 0, zIndex: 40,
          padding: '12px 16px 8px',
          background: navBg,
          backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
          borderBottom: '1px solid var(--border-color)',
          boxShadow: navShadow,
        }}
      >
        {/* ── Top bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>

          {/* Left: avatar + brand */}
          <div ref={navLeftRef} style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <NavAvatar
              name={user?.name}
              avatar={user?.avatar}
              isOnline={true}
              onClick={() => navigate('/profile')}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{
                fontFamily: '"Fraunces", serif',
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                color: 'var(--text-primary)',
              }}>
                Menu
              </span>
              {user?.name && (
                <span style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                  lineHeight: 1,
                }}>
                  {user.name.split(' ')[0]}
                </span>
              )}
            </div>
          </div>

          {/* Right: actions */}
          <div ref={navRightRef} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <NotificationBell />
            <button
              ref={searchBtnRef}
              onClick={searchOpen ? closeSearch : openSearch}
              aria-label={searchOpen ? 'Close search' : 'Search'}
              className="nav-icon-btn"
              style={searchOpen ? {
                background: 'linear-gradient(135deg,#FF9F1C,#E05C2A)',
                color: '#fff', borderColor: 'transparent',
                boxShadow: '0 3px 12px rgba(255,159,28,0.4)',
              } : {}}
            >
              {searchOpen ? <X size={16} /> : <Search size={16} />}
            </button>
          </div>
        </div>

        {/* ── Search row ── */}
        <div
          ref={searchRowRef}
          style={{ display: 'none', height: 0, opacity: 0, overflow: 'hidden' }}
        >
          <div ref={searchInputRef} style={{ position: 'relative', marginTop: 8 }}>
            <div style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              pointerEvents: 'none', color: searchFocused ? '#FF9F1C' : 'var(--text-muted)',
              transition: 'color 0.2s',
            }}>
              <Search size={15} />
            </div>
            <input
              ref={searchFieldRef}
              type="text" inputMode="search"
              value={searchQuery}
              onChange={e => dispatch(setSearchQuery(e.target.value))}
              onFocus={() => setSearchFocused(true)}
              onBlur={()  => setSearchFocused(false)}
              placeholder="Search dishes, flavours…"
              className="mp-search-input"
            />
            <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {searchQuery && items.length > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  padding: '2px 8px', borderRadius: 99,
                  background: 'rgba(255,159,28,0.12)', color: '#FF9F1C',
                }}>
                  {items.length}
                </span>
              )}
              <button
                ref={clearBtnRef}
                onClick={() => { dispatch(setSearchQuery('')); searchFieldRef.current?.focus() }}
                aria-label="Clear"
                style={{
                  width: 26, height: 26, borderRadius: 8, border: 'none',
                  background: 'var(--bg-card)', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', scale: 0, opacity: 0,
                }}
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {searchQuery && (
            <p style={{ fontSize: 11, marginTop: 6, paddingLeft: 4, color: 'var(--text-muted)' }}>
              {items.length > 0
                ? <>{items.length} result{items.length !== 1 ? 's' : ''} for <strong style={{ color: '#FF9F1C' }}>"{searchQuery}"</strong></>
                : <>No results for <strong style={{ color: '#E05C2A' }}>"{searchQuery}"</strong></>
              }
            </p>
          )}
        </div>
      </header>

      {/* Call status */}
      {callStatus !== 'idle' && (
        <div style={{ zIndex: 30, padding: '8px 16px 0' }}><CallStatusBanner /></div>
      )}

      {/* ══════════════════════════════════════════
          SCROLL BODY
      ══════════════════════════════════════════ */}
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
              background: isDark ? 'rgba(10,7,4,0.93)' : 'rgba(255,251,244,0.93)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px', marginBottom: 8 }}>
              <Sparkles size={13} style={{ color: '#FF9F1C' }} />
              <span style={{
                fontSize: 10, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}>
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

        <div ref={gridRef} style={{ padding: '12px 16px 32px' }}>
          <MenuGrid items={items} />
        </div>
      </div>

      <FloatingActions />

      {/* ── Scroll to top ── */}
      <button
        ref={scrollBtnRef}
        onClick={handleScrollTop}
        aria-label="Scroll to top"
        style={{
          position: 'fixed', bottom: 96, right: 16,
          width: 40, height: 40, borderRadius: 14,
          border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,#FF9F1C,#E05C2A)',
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(255,159,28,0.4)',
          zIndex: 40,
          opacity: 0,
          transform: 'scale(0)',
          pointerEvents: 'none',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 11V3M3 6l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* ── Styles ── */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

        .nav-icon-btn {
          width: 34px; height: 34px; border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          color: var(--text-secondary);
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          cursor: pointer;
          transition: transform 0.16s cubic-bezier(.34,1.56,.64,1), background 0.18s;
          -webkit-font-smoothing: antialiased;
        }
        .nav-icon-btn:hover  { transform: scale(1.07); }
        .nav-icon-btn:active { transform: scale(0.91); }

        .mp-search-input {
          width: 100%; height: 44px;
          padding: 0 72px 0 40px;
          border-radius: 14px;
          background: var(--bg-card);
          color: var(--text-primary);
          border: 1.5px solid var(--border-color);
          outline: none;
          font-family: "DM Sans", sans-serif;
          font-size: 15px;
          transition: border-color 0.22s, box-shadow 0.22s;
        }
        .mp-search-input::placeholder { color: var(--text-muted); }
        .mp-search-input:focus {
          border-color: #FF9F1C;
          box-shadow: 0 0 0 3px rgba(255,159,28,0.12);
        }
      `}</style>
    </div>
  )
}

export default MenuPage