// src/modules/customer/pages/MenuPage.jsx
// Full Tailwind CSS rewrite.
// • dark: prefix + arbitrary values for all dark/light variants
// • CSS variables kept only for complex box-shadows and gradients
// • GSAP refs and all animation logic unchanged
// • Badge fix: bell z-[2], search z-[1]
// • Single scoped <style> block — only the halo keyframe
//
// FIXES vs previous version:
// 1. QuoteOrderCard + RecommendedSection hidden during search (no clutter)
// 3. Autocomplete suggestions dropdown below search input

import {
  useEffect, useRef, useContext, useState,
  useCallback, useLayoutEffect, useMemo,
} from 'react'
import { createPortal }             from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate }              from 'react-router-dom'
import gsap                         from 'gsap'
import { ScrollTrigger }            from 'gsap/ScrollTrigger'
import { ScrollToPlugin }           from 'gsap/ScrollToPlugin'
import {
  fetchMenu,
  selectFilteredItems,
  selectAllItems,
  selectCategories,
  selectActiveCategory,
  selectSearchQuery,
  selectMenuLoading,
  selectMenuLoaded,
  setActiveCategory,
  setSearchQuery,
}                                   from '@store/slices/menuSlice'
import { selectUser }               from '@store/slices/authSlice'
import { selectCallStatus }         from '@store/slices/callWaiterSlice'
import { selectTableNumber }        from '@store/slices/tableSessionSlice'
import { selectActiveOrder, selectOrderHistory } from '@store/slices/orderSlice'
import { selectTier }               from '@store/slices/loyaltySlice'
import { ThemeContext }             from '@shared/context/ThemeContext'
import FloatingActions              from '../components/menu/FloatingActions'
import RecommendedSection           from '../components/menu/RecommendedSection'
import MenuGrid                     from '../components/menu/MenuGrid'
import SkeletonMenuCard             from '../components/menu/SkeletonMenuCard'
import CategoryPills                from '../components/menu/CategoryPills'
import WelcomeCard                  from '../components/menu/WelcomeCard'
import QuoteOrderCard               from '../components/menu/QuoteOrderCard'
import NavAvatar                    from '../components/menu/NavAvatar'
import NotificationBell             from '../components/notifications/NotificationBell'
import { ExploreToastPortal, useExploreToasts } from '../components/notifications/ExploreToasts'
import CallStatusBanner             from '../components/callwaiter/CallStatusBanner'
import MenuTour                     from '../components/menu/MenuTour'
import { useRecommendations }       from '../hooks/useRecommendations'
import { usePaymentLogoutTrigger }  from '../hooks/usePaymentLogoutTrigger'
import { useActiveOrder }           from '../hooks/useActiveOrder'
import { useNotifications }         from '../hooks/useNotifications'
import { Search, X, Sparkles, ChevronUp } from 'lucide-react'
import { useLenis }                 from 'lenis/react'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

const CAFE_ID = import.meta.env.VITE_CAFE_ID || 'demo'

const selectCartCount = (state) =>
  (state.cart?.items ?? []).reduce((s, i) => s + (i.quantity ?? 1), 0)

const getTimeSlot = () => {
  const h = new Date().getHours()
  if (h >= 5  && h < 8)  return 'earlybird'
  if (h >= 8  && h < 12) return 'morning'
  if (h >= 12 && h < 17) return 'afternoon'
  if (h >= 17 && h < 21) return 'evening'
  return 'latenight'
}

const analyseHistory = (history = []) => {
  if (!history.length) return { favouriteItem: null, favouriteCategory: null, visitCount: 0 }
  const itemFreq = {}; const catFreq = {}
  history.forEach(order => {
    ;(order.items ?? []).forEach(item => {
      const name = item.name ?? item.menuItemId
      const cat  = item.category ?? 'unknown'
      itemFreq[name] = (itemFreq[name] ?? 0) + item.quantity
      catFreq[cat]   = (catFreq[cat]   ?? 0) + item.quantity
    })
  })
  return {
    favouriteItem:     Object.entries(itemFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    favouriteCategory: Object.entries(catFreq).sort((a, b)  => b[1] - a[1])[0]?.[0] ?? null,
    visitCount:        history.length,
  }
}

// ── Autocomplete suggestions ──────────────────────────────────────────────────
const buildSuggestions = (allItems, query) => {
  if (!query || query.length < 1) return []
  const q = query.toLowerCase().trim()
  const seen = new Set()
  const results = []
  for (const item of allItems) {
    const name = item.name ?? ''
    const cat  = item.category ?? ''
    if (
      (name.toLowerCase().includes(q) || cat.toLowerCase().includes(q)) &&
      !seen.has(name.toLowerCase())
    ) {
      seen.add(name.toLowerCase())
      results.push({ name, category: cat, emoji: item.emoji ?? '🍽️' })
      if (results.length >= 5) break
    }
  }
  return results
}

const HighlightMatch = ({ text, query, isDark: D }) => {
  if (!query) return <span>{text}</span>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, idx)}
      <mark style={{
        background: 'rgba(255,159,28,0.28)',
        color: D ? '#FFB84D' : '#C8680A',
        borderRadius: 3, padding: '0 1px', fontWeight: 800,
      }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
const MenuSkeleton = () => (
  <div className="px-4 pt-4" aria-hidden="true">
    <div className="skeleton rounded-[20px] h-28 mb-5" />
    <div className="skeleton rounded-2xl h-5 mb-3 w-1/3" />
    <div className="flex gap-3 overflow-hidden mb-5">
      {[1,2,3].map(i => (
        <div key={i} className="skeleton rounded-2xl flex-shrink-0 w-[140px] h-[168px]" />
      ))}
    </div>
    <div className="flex gap-2 overflow-hidden mb-5">
      {[80,96,72,88,64,80].map((w,i) => (
        <div key={i} className="skeleton rounded-full flex-shrink-0 h-8" style={{ width: w }} />
      ))}
    </div>
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => <SkeletonMenuCard key={i} />)}
    </div>
  </div>
)

// ── Page ──────────────────────────────────────────────────────────────────────
const MenuPage = () => {
  const dispatch       = useDispatch()
  const navigate       = useNavigate()
  const user           = useSelector(selectUser)
  const items          = useSelector(selectFilteredItems)
  const allItems       = useSelector(selectAllItems)
  const categories     = useSelector(selectCategories)
  const activeCategory = useSelector(selectActiveCategory)
  const searchQuery    = useSelector(selectSearchQuery)
  const menuLoading    = useSelector(selectMenuLoading)
  const menuLoaded     = useSelector(selectMenuLoaded)
  const callStatus     = useSelector(selectCallStatus)
  const tableNumber    = useSelector(selectTableNumber)
  const cartCount      = useSelector(selectCartCount)
  const activeOrder    = useSelector(selectActiveOrder)
  const orderHistory   = useSelector(selectOrderHistory)
  const tier           = useSelector(selectTier)
  const { isDark: D }  = useContext(ThemeContext)

  const { recommendations, loading: recLoading, weather: recWeather } =
    useRecommendations(CAFE_ID)

  usePaymentLogoutTrigger()
  useActiveOrder()
  useNotifications(recWeather)

  const lenis = useLenis()

  const { favouriteItem, favouriteCategory, visitCount } = useMemo(
    () => analyseHistory(orderHistory), [orderHistory]
  )
  const timeSlot = useMemo(() => getTimeSlot(), [])

  const {
    toasts: exploreToasts,
    dismissToast: dismissExplore,
    navigateTo: exploreNavigate,
  } = useExploreToasts({
    weather: recWeather, orderHistory, activeOrder,
    visitCount, favouriteItem, favouriteCategory, tier, timeSlot,
  })

  const contentReady = menuLoaded && !recLoading

  const [searchOpen,     setSearchOpen]     = useState(false)
  const [searchFocused,  setSearchFocused]  = useState(false)
  const [suggestions,    setSuggestions]    = useState([])
  const [activeIdx,      setActiveIdx]      = useState(-1)
  const [showTour,       setShowTour]       = useState(false)
  const [didAnimate,     setDidAnimate]     = useState(false)
  const [notifPanelOpen, setNotifPanelOpen] = useState(false)

  const islandRef      = useRef(null)
  const islandInnerRef = useRef(null)
  const glowRef        = useRef(null)
  const brandRef       = useRef(null)
  const avatarWrapRef  = useRef(null)
  const navRightRef    = useRef(null)
  const searchBtnRef   = useRef(null)
  const searchRowRef   = useRef(null)
  const searchInputRef = useRef(null)
  const searchFieldRef = useRef(null)
  const clearBtnRef    = useRef(null)
  const suggestDropRef = useRef(null)
  const welcomeRef     = useRef(null)
  const recRef         = useRef(null)
  const gridRef        = useRef(null)
  const scrollBtnRef   = useRef(null)
  const shimmerRef     = useRef(null)
  const contentRef     = useRef(null)
  const tourRef        = useRef(false)

  useEffect(() => {
    if (!menuLoaded && !menuLoading) dispatch(fetchMenu(CAFE_ID))
  }, [dispatch, menuLoaded, menuLoading])

  const handleTourComplete = useCallback(() => {
    setShowTour(false)
    localStorage.setItem('mp-tour-done', '1')
  }, [])

  useEffect(() => {
    if (!contentReady || tourRef.current) return
    if (localStorage.getItem('mp-tour-done')) return
    tourRef.current = true
    const t = setTimeout(() => setShowTour(true), 1400)
    return () => clearTimeout(t)
  }, [contentReady])

  useLayoutEffect(() => {
    if (scrollBtnRef.current) {
      gsap.set(scrollBtnRef.current, { scale: 0, opacity: 0 })
      scrollBtnRef.current.style.pointerEvents = 'none'
    }
  }, [])

  useEffect(() => {
    if (!islandRef.current) return
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
    tl.fromTo(islandRef.current,
      { y: -40, opacity: 0, scale: 0.9 },
      { y: 0, opacity: 1, scale: 1, duration: 0.72, clearProps: 'scale' }, 0)
    if (glowRef.current)
      tl.fromTo(glowRef.current,
        { opacity: 0, scale: 0.7 },
        { opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out' }, 0.3)
    const kids = islandInnerRef.current ? Array.from(islandInnerRef.current.children) : []
    if (kids.length)
      tl.fromTo(kids,
        { opacity: 0, y: -6 },
        { opacity: 1, y: 0, duration: 0.35, stagger: 0.07, ease: 'power2.out' }, 0.4)
    if (shimmerRef.current)
      tl.fromTo(shimmerRef.current,
        { x: '-120%' },
        { x: '120%', duration: 0.9, ease: 'power2.out' }, 0.5)
  }, [])

  useEffect(() => {
    if (!shimmerRef.current) return
    let killed = false
    const loop = () => {
      if (killed || !shimmerRef.current) return
      gsap.fromTo(shimmerRef.current,
        { x: '-120%' },
        { x: '120%', duration: 2.8, ease: 'none', delay: 4, onComplete: loop })
    }
    const t = setTimeout(loop, 2600)
    return () => { killed = true; clearTimeout(t); gsap.killTweensOf(shimmerRef.current) }
  }, [])

  useEffect(() => {
    if (!contentReady || didAnimate) return
    setDidAnimate(true)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    if (lenis) lenis.scrollTo(0, { immediate: true })
    if (!contentRef.current) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const ctx = gsap.context(() => {
        gsap.fromTo(contentRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.45, ease: 'power2.out', clearProps: 'opacity' })
        const cards = [welcomeRef.current, recRef.current].filter(Boolean)
        if (cards.length)
          gsap.fromTo(cards, { opacity: 0 },
            { opacity: 1, duration: 0.4, ease: 'power2.out',
              stagger: 0.07, delay: 0.06, clearProps: 'opacity' })
      })
      return () => ctx.revert()
    })
    return () => mm.revert()
  }, [contentReady, didAnimate, lenis])

  useEffect(() => {
    const pill = islandRef.current
    if (!pill) return
    const s = {
      visible: true, morphed: false, lastY: window.scrollY,
      vel: 0, upDist: 0, ticking: false, rafId: null, fabVisible: false,
    }
    const HIDE_VEL=3.5, SHOW_DIST=36, MORPH_Y=55, FAB_Y=260, TOP=48, DECAY=0.68, HIDE_Y=-120
    const getY = () => {
      const ly = lenis?.scroll
      return (typeof ly === 'number' && isFinite(ly) && ly >= 0) ? ly : window.scrollY
    }
    const showNavbar = () => {
      s.visible = true
      gsap.killTweensOf(pill)
      if (glowRef.current) gsap.killTweensOf(glowRef.current)
      gsap.fromTo(pill, { y: HIDE_Y, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.46, ease: 'expo.out', overwrite: true, force3D: true })
      gsap.fromTo(pill, { scale: 0.93 },
        { scale: 1, duration: 0.55, ease: 'back.out(2.4)', delay: 0.06, overwrite: 'auto', force3D: true, clearProps: 'scale' })
      if (glowRef.current)
        gsap.fromTo(glowRef.current, { opacity: 0, scale: 0.8 },
          { opacity: 0.5, scale: 1, duration: 0.5, ease: 'power3.out', delay: 0.04, overwrite: true })
    }
    const hideNavbar = () => {
      s.visible = false; s.upDist = 0
      gsap.killTweensOf(pill)
      if (glowRef.current) gsap.killTweensOf(glowRef.current)
      gsap.to(pill, { y: HIDE_Y, opacity: 0, duration: 0.24, ease: 'power3.in', overwrite: true, force3D: true })
      if (glowRef.current)
        gsap.to(glowRef.current, { opacity: 0, duration: 0.15, ease: 'power2.in', overwrite: true })
    }
    const update = () => {
      s.ticking = false
      const y=getY(), raw=y-s.lastY; s.lastY=y
      if (raw===0) return
      s.vel    = s.vel*DECAY + raw*(1-DECAY)
      s.upDist = raw<0 ? s.upDist+Math.abs(raw) : 0
      const atTop = y<TOP
      if (s.visible && !atTop && s.vel>HIDE_VEL) hideNavbar()
      else if (!s.visible && (atTop||(s.vel<-0.5&&s.upDist>=SHOW_DIST))) showNavbar()
      const shouldMorph = y>MORPH_Y
      if (shouldMorph!==s.morphed) {
        s.morphed=shouldMorph
        gsap.to(pill, { borderRadius: shouldMorph?999:28, duration: 0.45, ease: 'power3.out', overwrite: 'auto' })
      }
      if (scrollBtnRef.current) {
        const showFab=y>FAB_Y
        if (showFab&&!s.fabVisible) {
          s.fabVisible=true
          scrollBtnRef.current.style.pointerEvents='auto'
          gsap.to(scrollBtnRef.current, { scale:1, opacity:1, duration:0.4, ease:'back.out(2.2)', overwrite:true })
        } else if (!showFab&&s.fabVisible) {
          s.fabVisible=false
          scrollBtnRef.current.style.pointerEvents='none'
          gsap.to(scrollBtnRef.current, { scale:0, opacity:0, duration:0.2, ease:'power2.in', overwrite:true })
        }
      }
    }
    const onScroll = () => { if (!s.ticking) { s.ticking=true; s.rafId=requestAnimationFrame(update) } }
    if (lenis) lenis.on('scroll', onScroll)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      if (lenis) lenis.off('scroll', onScroll)
      window.removeEventListener('scroll', onScroll)
      if (s.rafId) cancelAnimationFrame(s.rafId)
      gsap.set(pill, { clearProps: 'y,opacity,scale,borderRadius' })
    }
  }, [lenis])

  const openSearch = useCallback(() => {
    setSearchOpen(true)
    const navIcons = Array.from(navRightRef.current?.children ?? []).filter(el => el!==searchBtnRef.current)
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    tl.to(brandRef.current,      { opacity:0, x:-10, duration:0.18 }, 0)
    tl.to(avatarWrapRef.current, { opacity:0, scale:0.8, duration:0.15 }, 0)
    tl.to(navIcons,              { opacity:0, scale:0.7, duration:0.15, stagger:0.04 }, 0)
    tl.to(searchBtnRef.current,  { rotate:90, duration:0.24, ease:'back.out(3)' }, 0)
    tl.set(searchRowRef.current, { display:'block' }, 0.12)
    tl.fromTo(searchRowRef.current,
      { height:0, opacity:0, marginTop:0 },
      { height:'auto', opacity:1, marginTop:8, duration:0.35, ease:'expo.out' }, 0.12)
    tl.fromTo(searchInputRef.current,
      { scaleX:0.82, opacity:0, transformOrigin:'right center' },
      { scaleX:1, opacity:1, duration:0.4, ease:'expo.out', clearProps:'transform',
        onComplete: () => searchFieldRef.current?.focus() }, 0.2)
  }, [])

  const closeSearch = useCallback(() => {
    if (searchQuery) { dispatch(setSearchQuery('')); searchFieldRef.current?.focus(); return }
    setSuggestions([])
    setActiveIdx(-1)
    const navIcons = Array.from(navRightRef.current?.children ?? []).filter(el => el!==searchBtnRef.current)
    const tl = gsap.timeline({
      defaults: { ease:'power3.inOut' },
      onComplete: () => {
        setSearchOpen(false)
        gsap.set(searchRowRef.current, { display:'none', height:0, opacity:0, marginTop:0 })
      },
    })
    tl.to(searchInputRef.current, { opacity:0, scaleX:0.86, duration:0.18 }, 0)
    tl.to(searchRowRef.current,   { height:0, opacity:0, marginTop:0, duration:0.26 }, 0.06)
    tl.to(searchBtnRef.current,   { rotate:0, duration:0.24, ease:'back.out(2)', clearProps:'transform' }, 0)
    tl.to(brandRef.current,       { opacity:1, x:0, duration:0.3, clearProps:'transform' }, 0.14)
    tl.to(avatarWrapRef.current,  { opacity:1, scale:1, duration:0.28, ease:'back.out(2)', clearProps:'transform' }, 0.14)
    tl.to(navIcons, { opacity:1, scale:1, duration:0.28, stagger:0.05, ease:'back.out(2)', clearProps:'transform' }, 0.16)
  }, [dispatch, searchQuery])

  useEffect(() => {
    if (!clearBtnRef.current) return
    gsap.to(clearBtnRef.current, searchQuery
      ? { scale:1, opacity:1, rotate:0,  duration:0.24, ease:'back.out(2.5)', clearProps:'transform' }
      : { scale:0, opacity:0, rotate:45, duration:0.16, ease:'power2.in' })
  }, [searchQuery])

  useEffect(() => {
    const els = [welcomeRef.current, recRef.current].filter(Boolean)
    if (!els.length) return
    if (searchQuery) {
      gsap.to(els, {
        opacity:0, y:-12, height:0, paddingTop:0, paddingBottom:0, marginBottom:0,
        duration:0.32, ease:'power3.in', stagger:0.05, overwrite:'auto',
        onComplete: () => els.forEach(el => { el.style.visibility='hidden'; el.style.pointerEvents='none' }),
      })
    } else {
      els.forEach(el => { el.style.visibility=''; el.style.pointerEvents=''; el.style.height='' })
      gsap.fromTo(els, { opacity:0, y:-10 },
        { opacity:1, y:0, height:'auto', duration:0.45, ease:'expo.out',
          stagger:0.07, overwrite:'auto', clearProps:'height,padding,margin' })
    }
  }, [searchQuery])

  // ── Autocomplete: update suggestions as query changes ──────────────────────
  useEffect(() => {
    if (!searchFocused || !searchOpen) { setSuggestions([]); return }
    const s = buildSuggestions(allItems, searchQuery)
    setSuggestions(s)
    setActiveIdx(-1)
  }, [searchQuery, searchFocused, searchOpen, allItems])

  // Animate suggestion dropdown in
  useEffect(() => {
    if (!suggestDropRef.current) return
    if (suggestions.length > 0) {
      gsap.fromTo(suggestDropRef.current,
        { opacity: 0, y: -6, scale: 0.97 },
        { opacity: 1, y: 0,  scale: 1, duration: 0.18, ease: 'power2.out' }
      )
    }
  }, [suggestions.length])

  const handleSuggestionSelect = useCallback((name) => {
    dispatch(setSearchQuery(name))
    setSuggestions([])
    setActiveIdx(-1)
    searchFieldRef.current?.blur()
  }, [dispatch])

  const handleSearchKeyDown = useCallback((e) => {
    if (!suggestions.length) {
      if (e.key === 'Escape') closeSearch()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      handleSuggestionSelect(suggestions[activeIdx].name)
    } else if (e.key === 'Escape') {
      setSuggestions([])
      closeSearch()
    }
  }, [suggestions, activeIdx, handleSuggestionSelect, closeSearch])

  const handleIslandHover = useCallback((entering) => {
    if (!islandRef.current || !glowRef.current) return
    gsap.to(islandRef.current, {
      y: entering ? -2 : 0,
      duration: entering ? 0.35 : 0.5,
      ease: entering ? 'power2.out' : 'elastic.out(1.2,0.6)',
      overwrite: 'auto',
    })
    gsap.to(glowRef.current, {
      opacity: entering ? 0.85 : 0.5,
      scale: entering ? 1.12 : 1,
      duration: 0.4, ease: 'power2.out', overwrite: 'auto',
    })
  }, [])

  const handleScrollTop = useCallback(() => {
    if (scrollBtnRef.current)
      gsap.fromTo(scrollBtnRef.current, { scale:0.82 },
        { scale:1, duration:0.55, ease:'elastic.out(1.2,0.5)' })
    if (lenis) lenis.scrollTo(0, { duration:0.75, easing: t => 1-Math.pow(1-t,3) })
    else gsap.to(window, { scrollTo:{ y:0 }, duration:0.75, ease:'power3.inOut' })
  }, [lenis])

  const pressIcon = useCallback((el) => {
    if (!el) return
    gsap.timeline()
      .to(el, { scale:0.82, duration:0.1,  ease:'power2.in' })
      .to(el, { scale:1.08, duration:0.28, ease:'back.out(3)' })
      .to(el, { scale:1,    duration:0.2,  ease:'power2.out' })
  }, [])

  const fabBottom = cartCount > 0
    ? 'calc(env(safe-area-inset-bottom, 0px) + 88px)'
    : 'calc(env(safe-area-inset-bottom, 0px) + 20px)'

  const showDropdown = searchFocused && searchOpen && suggestions.length > 0

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh flex flex-col relative bg-[var(--bg-app)] [transform:none!important] [filter:none!important]">

      {/* ══ NAVBAR ISLAND ══ */}
      {createPortal(
        <div
          className="fixed top-0 inset-x-0 z-50 flex justify-center px-4 pointer-events-none"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          {/* Ambient glow */}
          <div
            ref={glowRef}
            aria-hidden
            className="absolute w-80 h-20 rounded-full pointer-events-none opacity-50"
            style={{
              top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
              left: '50%', transform: 'translateX(-50%)',
              background: D
                ? 'radial-gradient(ellipse,rgba(255,140,20,0.38) 0%,rgba(224,80,30,0.18) 50%,transparent 75%)'
                : 'radial-gradient(ellipse,rgba(255,159,28,0.32) 0%,rgba(224,92,42,0.14) 50%,transparent 75%)',
              filter: 'blur(18px)',
            }}
          />

          {/* Island */}
          <div
            ref={islandRef}
            data-tour="island"
            onMouseEnter={() => handleIslandHover(true)}
            onMouseLeave={() => handleIslandHover(false)}
            className={[
              'pointer-events-auto w-full max-w-[480px] rounded-[28px] px-4 py-[10px]',
              'relative overflow-visible mt-[14px]',
              D ? 'bg-[rgba(10,5,1,0.78)] border border-[rgba(255,159,28,0.18)]'
                : 'bg-[rgba(255,251,243,0.78)] border border-white/[0.82]',
            ].join(' ')}
            style={{
              backdropFilter: 'blur(48px) saturate(200%) brightness(1.04)',
              WebkitBackdropFilter: 'blur(48px) saturate(200%) brightness(1.04)',
              boxShadow: D
                ? '0 1px 0 rgba(255,255,255,0.09) inset,0 20px 60px rgba(0,0,0,0.65),0 4px 16px rgba(0,0,0,0.4)'
                : '0 1px 0 rgba(255,255,255,0.95) inset,0 20px 48px rgba(130,80,20,0.14),0 4px 12px rgba(130,80,20,0.08)',
              transform: 'translate3d(0,0,0)',
            }}
          >
            {/* Shimmer */}
            <div
              ref={shimmerRef}
              aria-hidden
              className="absolute inset-y-0 left-0 w-[38%] pointer-events-none z-[1]"
              style={{
                background: D
                  ? 'linear-gradient(105deg,transparent 0%,rgba(255,255,255,0.03) 35%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.03) 65%,transparent 100%)'
                  : 'linear-gradient(105deg,transparent 0%,rgba(255,255,255,0.1) 35%,rgba(255,255,255,0.28) 50%,rgba(255,255,255,0.1) 65%,transparent 100%)',
                transform: 'translateX(-120%)',
              }}
            />
            {/* Top highlight */}
            <div aria-hidden className="absolute top-0 left-[8%] right-[8%] h-px pointer-events-none z-[2]"
              style={{
                background: D
                  ? 'linear-gradient(90deg,transparent,rgba(255,255,255,0.22) 50%,transparent)'
                  : 'linear-gradient(90deg,transparent,rgba(255,255,255,0.95) 50%,transparent)',
              }}
            />
            {/* Gold bottom */}
            <div aria-hidden className="absolute bottom-0 left-[15%] right-[15%] h-px pointer-events-none z-[2]"
              style={{
                background: 'linear-gradient(90deg,transparent,#FF9F1C 30%,#FFD580 50%,#E05C2A 70%,transparent)',
                opacity: D ? 0.55 : 0.45,
              }}
            />

            {/* Nav row */}
            <div ref={islandInnerRef}
              className="relative z-[3] flex items-center justify-between gap-2 min-w-0">

              {/* Avatar */}
              <div ref={avatarWrapRef} className="relative flex-shrink-0">
                <div
                  className="absolute inset-[-3px] rounded-full opacity-[0.45] pointer-events-none"
                  style={{
                    background: 'conic-gradient(from 0deg,#FF9F1C,#E05C2A,#FFD580,#FF9F1C)',
                    filter: 'blur(5px)',
                    animation: 'mp-halo-spin 4s linear infinite',
                  }}
                />
                <div className="relative z-[1]">
                  <NavAvatar
                    name={user?.name} avatar={user?.avatar}
                    isOnline onClick={() => navigate('/profile')}
                  />
                </div>
              </div>

              {/* Table / brand */}
              <div ref={brandRef} className="flex-1 flex justify-center min-w-0 overflow-hidden">
                {tableNumber ? (
                  <div className={[
                    'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full flex-shrink-0',
                    D ? 'bg-[rgba(255,159,28,0.14)] border border-[rgba(255,159,28,0.28)]'
                      : 'bg-[rgba(255,159,28,0.12)] border border-[rgba(255,159,28,0.32)]',
                  ].join(' ')}>
                    <span className="text-sm">🪑</span>
                    <div className="flex flex-col gap-[1px]">
                      <span className="text-[8px] font-bold tracking-[0.14em] uppercase leading-none"
                        style={{ color: D ? 'rgba(255,184,77,0.5)' : 'rgba(140,75,10,0.5)' }}>
                        Table
                      </span>
                      <span className="text-[16px] font-black tracking-[-0.04em] leading-none"
                        style={{
                          background: D
                            ? 'linear-gradient(135deg,#FFE0A0 0%,#FF9F1C 100%)'
                            : 'linear-gradient(135deg,#8B4513 0%,#D2691E 100%)',
                          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>
                        {tableNumber}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold tracking-[0.12em] uppercase"
                    style={{ color: D ? 'rgba(255,184,77,0.45)' : 'rgba(140,90,20,0.55)' }}>
                    कौसी चिया
                  </span>
                )}
              </div>

              {/* Right icons */}
              <div ref={navRightRef} className="flex items-center gap-1.5 flex-shrink-0">

                {/* Bell */}
                <div
                  className={[
                    'relative z-[2] flex items-center justify-center',
                    'w-[38px] h-[38px] rounded-xl flex-shrink-0 cursor-pointer',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(255,159,28,0.5)]',
                    D ? 'bg-white/[0.07] border border-white/10'
                      : 'bg-white/55 border border-white/75',
                  ].join(' ')}
                  style={{
                    boxShadow: D
                      ? '0 1px 0 rgba(255,255,255,0.07) inset,0 2px 8px rgba(0,0,0,0.3)'
                      : '0 1px 0 rgba(255,255,255,0.95) inset,0 2px 6px rgba(130,80,20,0.08)',
                  }}>
                  <NotificationBell
                    onClick={() => pressIcon(navRightRef.current?.children[0])}
                  />
                </div>

                {/* Search */}
                <button
                  ref={searchBtnRef}
                  onClick={() => {
                    pressIcon(searchBtnRef.current)
                    setTimeout(() => (searchOpen ? closeSearch() : openSearch()), 80)
                  }}
                  aria-label={searchOpen ? 'Close search' : 'Open search'}
                  aria-expanded={searchOpen}
                  className={[
                    'relative z-[1] flex items-center justify-center',
                    'w-[38px] h-[38px] rounded-xl flex-shrink-0 cursor-pointer',
                    'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(255,159,28,0.5)]',
                    'transition-colors duration-150 [-webkit-tap-highlight-color:transparent]',
                    searchOpen
                      ? D ? 'bg-[rgba(255,159,28,0.2)] border border-[rgba(255,159,28,0.5)] text-[var(--color-saffron)]'
                           : 'bg-[rgba(255,159,28,0.15)] border border-[rgba(255,159,28,0.5)] text-[var(--color-saffron)]'
                      : D ? 'bg-white/[0.07] border border-white/10 text-[rgba(255,184,77,0.5)]'
                           : 'bg-white/55 border border-white/75 text-[rgba(120,70,15,0.5)]',
                  ].join(' ')}
                  style={{
                    boxShadow: D
                      ? '0 1px 0 rgba(255,255,255,0.07) inset,0 2px 8px rgba(0,0,0,0.3)'
                      : '0 1px 0 rgba(255,255,255,0.95) inset,0 2px 6px rgba(130,80,20,0.08)',
                  }}
                >
                  {searchOpen
                    ? <X size={16} strokeWidth={2.2} />
                    : <Search size={16} strokeWidth={1.9} />}
                </button>
              </div>
            </div>

            {/* Search row */}
            <div ref={searchRowRef} className="hidden overflow-visible relative z-[3]" role="search">
              <div ref={searchInputRef}>
                <div className="relative">
                  <span
                    className="absolute left-[13px] top-1/2 -translate-y-1/2 pointer-events-none flex"
                    style={{ color: searchFocused ? 'var(--color-saffron)' : D ? 'rgba(255,184,77,0.5)' : 'rgba(120,70,15,0.5)' }}
                  >
                    <Search size={13} strokeWidth={1.9} />
                  </span>
                  <input
                    ref={searchFieldRef}
                    type="text" inputMode="search"
                    autoComplete="off" spellCheck="false"
                    value={searchQuery}
                    onChange={e => {
                      dispatch(setSearchQuery(e.target.value))
                    }}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 160)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search dishes, flavours…"
                    aria-label="Search menu items"
                    aria-autocomplete="list"
                    aria-expanded={showDropdown}
                    className={[
                      'w-full h-[42px] pl-9 pr-[72px] rounded-[14px] outline-none appearance-none box-border',
                      'text-[14px] font-normal tracking-[0.01em]',
                      'text-[var(--text-primary)] placeholder:text-[var(--text-faint)]',
                      'transition-[border-color,box-shadow,background] duration-200',
                      D ? 'bg-white/5 border-[1.5px] border-white/10 focus:border-[rgba(255,159,28,0.52)] focus:bg-[rgba(255,159,28,0.06)]'
                        : 'bg-white/55 border-[1.5px] border-white/75 focus:border-[rgba(255,159,28,0.52)] focus:bg-[rgba(255,252,245,0.78)]',
                    ].join(' ')}
                    style={{
                      boxShadow: D
                        ? '0 1px 0 rgba(255,255,255,0.06) inset,0 3px 14px rgba(0,0,0,0.25)'
                        : '0 1px 0 rgba(255,255,255,0.95) inset,0 2px 8px rgba(140,90,30,0.07)',
                    }}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {searchQuery && items.length > 0 && (
                      <span className={[
                        'text-[10px] font-bold px-[7px] py-[2px] rounded-full font-mono',
                        'text-[var(--color-saffron)]',
                        D ? 'bg-[rgba(255,159,28,0.15)] border border-[rgba(255,159,28,0.22)]'
                          : 'bg-[rgba(255,159,28,0.12)] border border-[rgba(255,159,28,0.2)]',
                      ].join(' ')}>
                        {items.length}
                      </span>
                    )}
                    <button
                      ref={clearBtnRef}
                      onClick={() => { dispatch(setSearchQuery('')); searchFieldRef.current?.focus() }}
                      aria-label="Clear search"
                      className={[
                        'w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer',
                        'transition-[background,color,border-color] duration-150',
                        D ? 'border border-white/10 bg-white/[0.06] text-[rgba(255,184,77,0.5)] hover:bg-white/[0.12] hover:border-[rgba(255,159,28,0.4)] hover:text-[var(--text-primary)]'
                          : 'border border-white/65 bg-white/50 text-[rgba(120,70,15,0.5)] hover:bg-white/[0.78] hover:border-[rgba(255,159,28,0.4)] hover:text-[var(--text-primary)]',
                      ].join(' ')}
                      style={{ opacity: 0, transform: 'scale(0) rotate(45deg)' }}
                    >
                      <X size={10} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* ── Autocomplete dropdown ── */}
                  {showDropdown && (
                    <div
                      ref={suggestDropRef}
                      role="listbox"
                      className="absolute left-0 right-0 mt-2 rounded-2xl overflow-hidden z-[9999]"
                      style={{
                        top: '100%',
                        background: D ? 'rgba(14,8,2,0.98)' : 'rgba(255,253,248,0.99)',
                        border: `1px solid ${D ? 'rgba(255,159,28,0.18)' : 'rgba(200,160,80,0.35)'}`,
                        boxShadow: D
                          ? '0 16px 48px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,159,28,0.08)'
                          : '0 16px 40px rgba(92,51,23,0.16), 0 0 0 1px rgba(240,217,181,0.5)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                      }}
                    >
                      {suggestions.map((s, i) => (
                        <button
                          key={s.name}
                          role="option"
                          aria-selected={i === activeIdx}
                          onMouseDown={(e) => { e.preventDefault(); handleSuggestionSelect(s.name) }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left
                                     transition-colors duration-100 border-none cursor-pointer"
                          style={{
                            background: i === activeIdx
                              ? D ? 'rgba(255,159,28,0.12)' : 'rgba(255,159,28,0.08)'
                              : 'transparent',
                            borderBottom: i < suggestions.length - 1
                              ? `1px solid ${D ? 'rgba(255,255,255,0.04)' : 'rgba(92,51,23,0.06)'}`
                              : 'none',
                          }}
                        >
                          <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>
                            {s.emoji}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="m-0 text-[13px] font-semibold truncate"
                              style={{ color: D ? '#FFF8EE' : '#1A0D00' }}>
                              <HighlightMatch text={s.name} query={searchQuery} isDark={D} />
                            </p>
                            <p className="m-0 text-[10px] mt-0.5 truncate capitalize"
                              style={{ color: D ? 'rgba(196,154,108,0.55)' : 'rgba(139,94,60,0.5)' }}>
                              {s.category.replace(/_/g, ' ')}
                            </p>
                          </div>
                          <Search size={11} style={{
                            color: i === activeIdx ? '#FF9F1C'
                              : D ? 'rgba(255,255,255,0.15)' : 'rgba(92,51,23,0.2)',
                            flexShrink: 0,
                          }} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {searchQuery && (
                  <p className="text-[11px] mt-1.5 pl-1 leading-[1.4]"
                    style={{ color: D ? 'rgba(255,184,77,0.5)' : 'rgba(120,70,15,0.5)' }}>
                    {items.length > 0 ? (
                      <>
                        <span className="font-bold text-[var(--color-saffron)]">{items.length}</span>
                        {' '}result{items.length !== 1 ? 's' : ''} for &ldquo;{searchQuery}&rdquo;
                      </>
                    ) : (
                      <>No results for &ldquo;<strong className="text-terra">{searchQuery}</strong>&rdquo;</>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Call status banner */}
      {callStatus !== 'idle' && createPortal(
        <div className="fixed inset-x-0 z-40 px-4 pt-1.5"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 80px)' }}>
          <CallStatusBanner />
        </div>,
        document.body
      )}

      {/* ══ MAIN CONTENT ══ */}
      <main
        className="flex-1"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 80px)' }}
        aria-label="Menu content"
      >
        {!contentReady && <MenuSkeleton />}

        <div
          ref={contentRef}
          style={{ opacity: contentReady ? undefined : 0 }}
          aria-hidden={!contentReady}
        >
          <div ref={welcomeRef} className="overflow-hidden">
            <WelcomeCard weather={recWeather} loading={recLoading} />
          </div>

          {!searchQuery && <QuoteOrderCard />}

          {!searchQuery && (
            <div ref={recRef} className="overflow-hidden">
              <RecommendedSection
                items={recommendations}
                weather={recWeather}
                loading={recLoading}
              />
            </div>
          )}

          {!searchQuery && (
            <div
              className={[
                'sticky z-20 py-[10px] pb-2',
                D ? 'bg-[rgba(8,4,1,0.88)] border-b border-[rgba(255,140,20,0.18)]'
                  : 'bg-[rgba(252,247,238,0.92)] border-b border-[rgba(200,160,80,0.38)]',
              ].join(' ')}
              style={{
                top: 'calc(env(safe-area-inset-top, 0px) + 68px)',
                backdropFilter: 'blur(28px) saturate(180%)',
                WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                boxShadow: D
                  ? '0 1px 0 rgba(255,255,255,0.04) inset,0 4px 16px rgba(0,0,0,0.25)'
                  : '0 1px 0 rgba(255,255,255,0.8) inset,0 4px 12px rgba(130,80,20,0.07)',
                transition: 'background var(--transition-theme),border-color var(--transition-theme)',
              }}
            >
              <div className="flex items-center gap-1.5 px-4 mb-2">
                <Sparkles size={12} className="text-[var(--color-saffron)] flex-shrink-0" strokeWidth={2} />
                <span className="text-[9px] font-bold tracking-[0.14em] uppercase"
                  style={{ color: D ? 'rgba(255,184,77,0.5)' : 'rgba(120,70,15,0.5)' }}>
                  Categories
                </span>
              </div>
              <CategoryPills
                categories={categories}
                active={activeCategory}
                onChange={cat => dispatch(setActiveCategory(cat))}
              />
            </div>
          )}

          <section
            ref={gridRef}
            aria-label="Menu items"
            className="px-4 pt-3.5"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 140px)' }}
          >
            <div className="flex items-center gap-2 mb-3.5">
              <div className="w-[3px] h-[18px] rounded-full flex-shrink-0"
                style={{ background: 'linear-gradient(180deg,#FF9F1C 0%,#E05C2A 100%)' }} />
              <h2 className="m-0 font-extrabold tracking-[-0.04em] leading-none text-[clamp(16px,4vw,19px)] text-[var(--text-primary)]">
                {searchQuery
                  ? 'Search Results'
                  : activeCategory === 'all'
                    ? 'Full Menu'
                    : activeCategory.replace(/_/g, ' ')}
              </h2>
              {items.length > 0 && (
                <span className={[
                  'text-[10px] font-bold px-[7px] py-[2px] rounded-full font-mono',
                  D ? 'bg-white/[0.06] text-[rgba(255,184,77,0.5)]'
                    : 'bg-black/5 text-[rgba(120,70,15,0.5)]',
                ].join(' ')}>
                  {items.length}
                </span>
              )}
            </div>
            <MenuGrid items={items} />
          </section>
        </div>
      </main>

      {/* ══ PORTALLED OVERLAYS ══ */}
      {createPortal(<FloatingActions />, document.body)}

      <ExploreToastPortal
        toasts={exploreToasts}
        onDismiss={dismissExplore}
        onNavigate={exploreNavigate}
      />

      {/* Scroll-to-top FAB */}
      {createPortal(
        <button
          ref={scrollBtnRef}
          onClick={handleScrollTop}
          aria-label="Scroll to top"
          className={[
            'fixed right-4 w-10 h-10 rounded-[13px] border-0 cursor-pointer',
            'flex items-center justify-center [-webkit-tap-highlight-color:transparent]',
            'text-[var(--color-saffron)]',
            D ? 'bg-[rgba(16,8,2,0.90)]' : 'bg-[rgba(252,248,242,0.94)]',
          ].join(' ')}
          style={{
            bottom: fabBottom,
            zIndex: 9200,
            boxShadow: D
              ? '0 1px 0 rgba(255,255,255,0.07) inset,0 4px 24px rgba(0,0,0,0.55),0 0 0 1px rgba(255,159,28,0.14)'
              : '0 1px 0 rgba(255,255,255,0.9) inset,0 4px 18px rgba(140,90,30,0.14),0 0 0 1px rgba(220,190,140,0.5)',
            transition: [
              'bottom 0.38s cubic-bezier(0.34,1.56,0.64,1)',
              'background var(--transition-theme)',
              'box-shadow var(--transition-theme)',
            ].join(','),
          }}
        >
          <ChevronUp size={17} strokeWidth={2.5} />
        </button>,
        document.body
      )}

      <style>{`
        @keyframes mp-halo-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {showTour && <MenuTour onComplete={handleTourComplete} islandRef={islandRef} />}
    </div>
  )
}

export default MenuPage