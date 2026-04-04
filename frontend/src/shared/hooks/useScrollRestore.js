// src/shared/hooks/useScrollRestore.js
//
// Saves scroll position before leaving a page and restores it on return.
// Used in MenuPage so the user returns to exactly where they were.
//
// Usage:
//   const scrollRef = useScrollRestore('menu-page')
//   <div ref={scrollRef}>...</div>   // OR pass window for page-level scroll
//
// For page-level scroll (window scroll), pass null as containerRef:
//   useScrollRestore('menu-page', null)  // saves window.scrollY

import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useLenis } from 'lenis/react'

const scrollPositions = new Map() // in-memory, survives SPA navigation

export function useScrollRestore(key, containerRef = undefined) {
  const { pathname } = useLocation()
  const lenis = useLenis()
  const savedY = useRef(0)

  // Save scroll position when leaving this page
  useEffect(() => {
    return () => {
      // Called on unmount (route change)
      const y = lenis?.scroll ?? window.scrollY
      scrollPositions.set(key, y)
    }
  }, [key, lenis])

  // Restore scroll position when returning to this page
  useEffect(() => {
    const saved = scrollPositions.get(key)
    if (saved == null || saved === 0) return

    // Small delay to let the page render first
    const timer = setTimeout(() => {
      if (lenis) {
        lenis.scrollTo(saved, { immediate: true })
      } else {
        window.scrollTo({ top: saved, behavior: 'instant' })
      }
      // Clear after restore so fresh visits start at top
      scrollPositions.delete(key)
    }, 50)

    return () => clearTimeout(timer)
  }, [pathname, key, lenis])
}

// Also export a simple imperative save/restore API
export const scrollStore = {
  save: (key) => {
    scrollPositions.set(key, window.scrollY)
  },
  restore: (key, lenis) => {
    const y = scrollPositions.get(key)
    if (y == null) return
    if (lenis) lenis.scrollTo(y, { immediate: true })
    else window.scrollTo({ top: y, behavior: 'instant' })
    scrollPositions.delete(key)
  },
  get: (key) => scrollPositions.get(key) ?? 0,
  clear: (key) => scrollPositions.delete(key),
}