// src/shared/components/utils/PageTransition.jsx
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import gsap from 'gsap'

export default function PageTransition({ children }) {
  const { pathname } = useLocation()
  const wrapRef = useRef(null)
  const isFirst = useRef(true)

  useEffect(() => {
    const el      = wrapRef.current
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!el || reduced) return

    if (isFirst.current) {
      isFirst.current = false
      return
    }

    gsap.killTweensOf(el)

    gsap.fromTo(
      el,
      {
        opacity:    0,
        y:          26,
        filter:     'blur(3px)',
        willChange: 'transform, opacity, filter',
      },
      {
        opacity:    1,
        y:          0,
        filter:     'blur(0px)',
        duration:   0.52,
        ease:       'expo.out',
        clearProps: 'filter,willChange',
      }
    )
  }, [pathname])

  return (
    <div ref={wrapRef} style={{ minHeight: '100dvh' }}>
      {children}
    </div>
  )
}