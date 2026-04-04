// src/shared/components/utils/PageTransition.jsx
// v5 — delegates scroll restore to MenuPage when contentReady is delayed
// Sets window.__scrollRestoring + window.__restoreKey so MenuPage knows
// which sessionStorage key to read when grid finally renders.

import { useEffect, useRef } from 'react'
import { useLocation }       from 'react-router-dom'
import { useLenis }          from 'lenis/react'
import gsap                  from 'gsap'

const KEY = (k) => `_sy_${k}`

const scrollTo = (y, lenis) => {
  window.scrollTo({ top: y, behavior: 'instant' })
  if (lenis) lenis.scrollTo(y, { immediate: true })
}

export default function PageTransition({ children }) {
  const { pathname, key } = useLocation()
  const lenis   = useLenis()
  const wrapRef = useRef(null)
  const isFirst = useRef(true)

  // ── Continuously save scroll position ────────────────────────────────────
  useEffect(() => {
    const save = () =>
      sessionStorage.setItem(KEY(key), String(Math.round(window.scrollY)))
    window.addEventListener('scroll', save, { passive: true })
    return () => {
      save()
      window.removeEventListener('scroll', save)
    }
  }, [key])

  // ── On route change ───────────────────────────────────────────────────────
  useEffect(() => {
    const el      = wrapRef.current
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const saved   = sessionStorage.getItem(KEY(key))
    const y       = saved !== null ? (parseFloat(saved) || 0) : null
    const isPop   = y !== null && y > 0

    if (isPop) {
      // Tell MenuPage: "you're restoring, use this key to find the saved Y"
      window.__scrollRestoring = true
      window.__restoreKey      = key
    } else {
      window.__scrollRestoring = false
      window.__restoreKey      = null
      if (!isFirst.current) scrollTo(0, lenis)
      if (saved === null) sessionStorage.setItem(KEY(key), '0')
    }

    if (isFirst.current) {
      isFirst.current = false
      return
    }

    gsap.killTweensOf(el)

    // Just fade — scroll restore is handled by MenuPage once contentReady
    gsap.fromTo(el || document.body,
      { opacity: 0 },
      { opacity: 1, duration: 0.32, ease: 'power2.out', clearProps: 'opacity' }
    )
  }, [pathname, key, lenis])

  return (
    <div ref={wrapRef} style={{ minHeight: '100dvh' }}>
      {children}
    </div>
  )
}