import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useLenis } from 'lenis/react'

const ScrollToTop = () => {
  const { pathname } = useLocation()
  const lenis = useLenis()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    // Lenis maintains its own scroll state — reset it too
    if (lenis) lenis.scrollTo(0, { immediate: true })
  }, [pathname, lenis])

  return null
}

export default ScrollToTop