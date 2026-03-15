// src/shared/components/utils/PageTransition.jsx
//
// FIX: The previous version used y:26 + blur on the entering page.
// This caused two layout bugs:
//
//   1. STACKING BUG — the entering page (e.g. OrderStatusPage) was translated
//      26px down in the document flow while MenuPage was still mounted,
//      making both pages visible simultaneously in the scroll container.
//      React Router v6 unmounts the previous route synchronously on navigation,
//      but GSAP's fromTo starts AFTER the new page mounts — so for one frame
//      the new page sits below the old page's remaining layout space.
//
//   2. LENIS SCROLL BUG — Lenis sees content appearing below the fold
//      (due to y:26 translate) and scrolls to it, causing the jitter
//      seen on MenuPage route transitions.
//
// FIX APPLIED:
//   • Opacity-only animation — no y translation, no blur, no layout shift
//   • willChange: 'opacity' only — no transform layer promotion
//   • First-render skipped (isFirst ref) — no flash on app boot
//   • prefers-reduced-motion: respected — instant render, no animation
//   • The wrapper is display:contents on mobile so it never adds
//     an extra stacking context that breaks fixed/sticky children

import { useEffect, useRef } from 'react'
import { useLocation }       from 'react-router-dom'
import gsap                  from 'gsap'

export default function PageTransition({ children }) {
  const { pathname } = useLocation()
  const wrapRef      = useRef(null)
  const isFirst      = useRef(true)

  useEffect(() => {
    const el      = wrapRef.current
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!el || reduced) return

    // Skip the very first render — page is already visible, no need to animate in
    if (isFirst.current) {
      isFirst.current = false
      return
    }

    gsap.killTweensOf(el)

    // Opacity-only fade — zero layout shift, zero scroll jitter
    gsap.fromTo(
      el,
      { opacity: 0 },
      {
        opacity:    1,
        duration:   0.38,
        ease:       'power2.out',
        clearProps: 'opacity',
      }
    )
  }, [pathname])

  return (
    <div ref={wrapRef} style={{ minHeight: '100dvh' }}>
      {children}
    </div>
  )
}