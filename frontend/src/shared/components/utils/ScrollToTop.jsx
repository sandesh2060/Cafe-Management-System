// src/shared/components/utils/ScrollToTop.jsx
// v5 — uses window.scrollY (not lenis.scroll) since smoothTouch is OFF
// On mobile Lenis is invisible so native window.scrollY is the truth.

import { useEffect, useRef } from 'react'
import { useLocation }       from 'react-router-dom'
import { useLenis }          from 'lenis/react'

const KEY = (k) => `_sy_${k}`

const ScrollToTop = () => {
  const { pathname, key } = useLocation()
  const lenis = useLenis()

  // Save window.scrollY on every scroll while on this page
  useEffect(() => {
    const save = () => sessionStorage.setItem(KEY(key), String(window.scrollY))
    window.addEventListener('scroll', save, { passive: true })
    return () => {
      window.removeEventListener('scroll', save)
      // Also save on unmount in case user didn't scroll after last save
      sessionStorage.setItem(KEY(key), String(window.scrollY))
    }
  }, [key])

  useEffect(() => {
    const saved = sessionStorage.getItem(KEY(key))

    if (saved === null) {
      // Fresh PUSH — scroll to top
      sessionStorage.setItem(KEY(key), '0')
      window.__scrollRestoring = false
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      if (lenis) lenis.scrollTo(0, { immediate: true })
    } else {
      const y = parseFloat(saved) || 0
      if (y > 0) {
        window.__scrollRestoring = true
        // Use two attempts: fast + delayed fallback
        // Fast attempt for when content is already rendered
        requestAnimationFrame(() => {
          window.scrollTo({ top: y, behavior: 'instant' })
          if (lenis) lenis.scrollTo(y, { immediate: true })
        })
        // Delayed fallback for when content renders after data loads
        const t = setTimeout(() => {
          window.scrollTo({ top: y, behavior: 'instant' })
          if (lenis) lenis.scrollTo(y, { immediate: true })
          window.__scrollRestoring = false
        }, 120)
        return () => clearTimeout(t)
      } else {
        window.__scrollRestoring = false
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
        if (lenis) lenis.scrollTo(0, { immediate: true })
      }
    }
  }, [pathname, key]) // eslint-disable-line

  return null
}

export default ScrollToTop