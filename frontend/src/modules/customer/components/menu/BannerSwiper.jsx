// src/modules/customer/components/menu/BannerSwiper.jsx
//
// ─── PERF CHANGES (visuals identical) ────────────────────────────────────────
// 1. gsapEnabled from useDeviceTier() gates Slide enter() — on low tier
//    slide still renders fully, orb and text visible, just no GSAP float/bounce
// 2. contain:'layout style paint' on slide root — isolates repaints
// 3. All slide content, SVG decor, Swiper config — UNCHANGED
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useEffect, useContext, useCallback } from "react"
import { Swiper, SwiperSlide } from "swiper/react"
import { Autoplay, Pagination, EffectCreative } from "swiper/modules"
import gsap from "gsap"
import { ThemeContext } from "@shared/context/ThemeContext"
import { BRAND, FONTS } from "@shared/config/brand"
import { useDeviceTier } from "@shared/hooks/useDeviceTier"
import "swiper/css"
import "swiper/css/pagination"
import "swiper/css/effect-creative"

const SLIDES = [
  {
    id: 1, tag: "Monsoon Special", title: "Warm\nyour soul",
    sub: `Masala Chai · ${BRAND.currency} 80`, emoji: "☕",
    floats: ["🌧️", "🫖", "☔", "🌿"],
    lightBg: ["#3B1A08", "#7A4020", "#B5722A"],
    darkBg:  ["#180B02", "#3B1A08", "#6B3818"],
    accent: "#FF9F1C",
  },
  {
    id: 2, tag: "Loyalty Rewards", title: "Every sip\ncounts",
    sub: "Earn points · Unlock perks", emoji: "⭐",
    floats: ["🥇", "💎", "✨", "🎁"],
    lightBg: ["#8B2200", "#C44A1A", "#FF9F1C"],
    darkBg:  ["#3D0E00", "#8B2200", "#C44A1A"],
    accent: "#FFB84D",
  },
  {
    id: 3, tag: "Chef's Pick", title: "Fresh Momos\ndaily",
    sub: `Steamed & Fried · ${BRAND.currency} 180`, emoji: "🥟",
    floats: ["🌿", "🔥", "🫕", "🌶️"],
    lightBg: ["#0A3D1E", "#1E7A42", "#38C26F"],
    darkBg:  ["#041A0D", "#0A3D1E", "#1E7A42"],
    accent: "#38C26F",
  },
]

const SlideDecor = ({ accent, index }) => {
  if (index === 0)
    return (
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 360 200">
        <defs>
          <radialGradient id="rd0" cx="80%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.2" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="360" height="200" fill="url(#rd0)" />
        {[50, 80, 110, 145].map((r, i) => (
          <circle key={i} cx="88%" cy="50%" r={r} fill="none" stroke={accent} strokeOpacity={0.1 - i * 0.02} strokeWidth="1" />
        ))}
      </svg>
    )
  if (index === 1)
    return (
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 360 200">
        <defs>
          <pattern id="dt1" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.3" fill={accent} fillOpacity="0.18" />
          </pattern>
        </defs>
        <rect width="360" height="200" fill="url(#dt1)" />
        <rect x="220" y="0" width="140" height="200" fill={accent} fillOpacity="0.07" />
      </svg>
    )
  return (
    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 360 200">
      <defs>
        <pattern id="ln2" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
          <line x1="0" y1="0" x2="0" y2="20" stroke={accent} strokeOpacity="0.16" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="360" height="200" fill="url(#ln2)" />
      <path d="M240,0 Q300,100 240,200 L360,200 L360,0 Z" fill={accent} fillOpacity="0.07" />
    </svg>
  )
}

const Slide = ({ s, isDark, isActive }) => {
  const orbRef   = useRef(null)
  const linesRef = useRef(null)
  const floatRef = useRef(null)
  const tlRef    = useRef(null)
  // FIX: read tier inside Slide
  const { gsapEnabled } = useDeviceTier()

  const enter = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    tlRef.current?.kill()
    tlRef.current = gsap.timeline()
    tlRef.current
      .fromTo(orbRef.current,
        { scale: 0.3, opacity: 0, rotation: -30, x: -10 },
        { scale: 1, opacity: 1, rotation: 0, x: 0, duration: 0.62, ease: "back.out(2.4)" })
      .fromTo(
        linesRef.current?.children ? Array.from(linesRef.current.children) : [],
        { x: -28, opacity: 0 },
        { x: 0, opacity: 1, stagger: 0.1, duration: 0.44, ease: "power3.out" },
        "-=0.38",
      )
    if (floatRef.current) {
      const nodes = Array.from(floatRef.current.children)
      gsap.fromTo(nodes,
        { y: 20, opacity: 0, scale: 0.2, rotation: -15 },
        { y: 0, opacity: 1, scale: 1, rotation: 0, duration: 0.48, stagger: 0.09, delay: 0.25, ease: "back.out(2.2)" })
      gsap.to(nodes, { y: "-=9", duration: 2.8, repeat: -1, yoyo: true, stagger: 0.6, ease: "sine.inOut", delay: 0.85 })
    }
    gsap.to(orbRef.current, { scale: 1.05, duration: 2.4, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 0.9 })
  }, [])

  // FIX: enter() gated — slide fully visible on low tier, just no GSAP motion
  useEffect(() => {
    if (!isActive) return
    if (!gsapEnabled) {
      // On low tier: just make elements visible instantly, no animation
      if (orbRef.current) gsap.set(orbRef.current, { opacity: 1, scale: 1 })
      if (linesRef.current) {
        Array.from(linesRef.current.children).forEach(el => gsap.set(el, { opacity: 1 }))
      }
      if (floatRef.current) {
        Array.from(floatRef.current.children).forEach(el => gsap.set(el, { opacity: 1 }))
      }
      return
    }
    enter()
    return () => { tlRef.current?.kill() }
  }, [isActive, enter, gsapEnabled])

  const bg = isDark ? s.darkBg : s.lightBg

  return (
    <div
      className="relative overflow-hidden select-none"
      style={{
        height: "100%", borderRadius: "22px",
        background: `linear-gradient(140deg,${bg[0]} 0%,${bg[1]} 50%,${bg[2]} 100%)`,
        // FIX: contain isolates slide repaints
        contain: "layout style paint",
      }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <SlideDecor accent={s.accent} index={SLIDES.indexOf(s)} />
      </div>
      <div className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none"
           style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.07) 0%,transparent 100%)" }} />

      <div ref={floatRef} className="absolute top-3 right-3.5 flex flex-col items-end gap-0.5 pointer-events-none" aria-hidden="true">
        {s.floats.map((f, i) => (
          <span key={i} className="text-base leading-snug opacity-0" style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.55))" }}>{f}</span>
        ))}
      </div>

      <div className="relative z-10 h-full flex items-center px-5 gap-5">
        <div
          ref={orbRef}
          className="flex-shrink-0 flex items-center justify-center opacity-0"
          style={{
            width: "clamp(68px,12vw,88px)", height: "clamp(68px,12vw,88px)",
            fontSize: "clamp(36px,6vw,48px)", borderRadius: "clamp(18px,3vw,26px)",
            background: "rgba(0,0,0,0.3)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
            boxShadow: ["0 8px 28px rgba(0,0,0,0.4)", "inset 0 1px 0 rgba(255,255,255,0.22)", "inset 0 -1px 0 rgba(0,0,0,0.3)", "0 0 0 1px rgba(255,255,255,0.08)"].join(","),
          }}
        >
          {s.emoji}
        </div>

        <div ref={linesRef} className="flex flex-col min-w-0 gap-0">
          <span className="self-start mb-2 px-2.5 py-[3px] rounded-full opacity-0 text-[9px] font-black uppercase tracking-[0.15em]"
                style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.95)", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}>
            {s.tag}
          </span>
          <h3
            className="font-black leading-[1.1] opacity-0 whitespace-pre-line"
            style={{ fontSize: "clamp(18px,4vw,24px)", color: "#fff", fontFamily: FONTS.brand, textShadow: "0 2px 14px rgba(0,0,0,0.5)" }}
          >
            {s.title}
          </h3>
          <p className="mt-1.5 text-[12px] font-semibold opacity-0 sm:text-[13px]"
             style={{ color: "rgba(255,255,255,0.72)", letterSpacing: "0.01em", fontFamily: FONTS.body }}>
            {s.sub}
          </p>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[2px]"
           style={{ background: `linear-gradient(90deg,${s.accent}cc,${s.accent}55,transparent)` }} />
    </div>
  )
}

const BannerSwiper = () => {
  const { isDark } = useContext(ThemeContext)
  const swRef = useRef(null)
  const activeIdx = useRef(0)

  return (
    <div className="relative">
      <div className="h-[152px] sm:h-[176px] lg:h-[200px]">
        <Swiper
          onSwiper={(sw) => { swRef.current = sw }}
          onSlideChange={(sw) => { activeIdx.current = sw.realIndex }}
          modules={[Autoplay, Pagination, EffectCreative]}
          effect="creative"
          creativeEffect={{
            prev: { translate: ["-115%", 0, -300], opacity: 0 },
            next: { translate: ["115%", 0, -300], opacity: 0 },
          }}
          speed={680}
          autoplay={{ delay: 4800, disableOnInteraction: false, pauseOnMouseEnter: true }}
          pagination={{ clickable: true, el: ".bp" }}
          loop
          className="rounded-[22px] overflow-hidden h-full"
        >
          {SLIDES.map((s, i) => (
            <SwiperSlide key={s.id} className="h-full">
              {({ isActive }) => <Slide s={s} isDark={isDark} isActive={isActive} />}
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <div className="bp flex items-center justify-center gap-1.5 mt-3" />

      <style>{`
        .bp .swiper-pagination-bullet {
          display:inline-block;margin:0!important;width:6px;height:6px;border-radius:99px;
          background:var(--divider);opacity:1;
          transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);cursor:pointer;
        }
        .bp .swiper-pagination-bullet-active {
          width:26px;background:var(--accent);box-shadow:0 0 10px var(--accent-glow);
        }
      `}</style>
    </div>
  )
}

export default BannerSwiper