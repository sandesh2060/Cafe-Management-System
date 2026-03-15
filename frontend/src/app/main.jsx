// src/app/main.jsx

// ── SCROLL RESTORATION FIX ────────────────────────────────────────────────────
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

import React    from 'react'
import ReactDOM from 'react-dom/client'
// ── Styles ──────────────────────────────────────────────────────────────────
import '../styles/globals.css'
import '../styles/animations.css'
import '../styles/skeleton.css'
import '../styles/tailwind.css'
// ────────────────────────────────────────────────────────────────────────────
import App      from './App.jsx'
import { unlockAudioContext } from '@shared/hooks/useNotificationSound'

// ── Unlock AudioContext on first user gesture (sound + vibration) ─────────────
// Browser blocks AudioContext until user interacts. This registers listeners
// for click/touchstart/keydown and silently unlocks it on first tap.
unlockAudioContext()

// ── useZoomLock ───────────────────────────────────────────────────────────────
function useZoomLock() {
  React.useEffect(() => {
    const wrap = document.getElementById('zoom-wrap')
    if (!wrap) return

    const baseDPR = window.devicePixelRatio || 1
    let rafId     = null
    let lastZoom  = parseFloat(wrap.style.zoom) || 1

    function getZoomLevel() {
      const dpr  = window.devicePixelRatio || 1
      const zoom = dpr / baseDPR
      return Math.round(zoom * 20) / 20
    }

    function applyZoom() {
      const zoomLevel   = getZoomLevel()
      const counterZoom = parseFloat((1 / zoomLevel).toFixed(4))
      if (Math.abs(counterZoom - lastZoom) < 0.005) return
      lastZoom          = counterZoom
      wrap.style.zoom   = counterZoom
      const pct         = (zoomLevel * 100).toFixed(1) + '%'
      wrap.style.width  = pct
      wrap.style.height = pct
    }

    function onResize() {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(applyZoom)
    }

    applyZoom()
    window.addEventListener('resize', onResize, { passive: true })

    let dprMql = null
    function onDPRChange() { onResize(); watchDPR() }
    function watchDPR() {
      dprMql?.removeEventListener('change', onDPRChange)
      dprMql = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
      dprMql.addEventListener('change', onDPRChange)
    }
    if (window.matchMedia) watchDPR()

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      dprMql?.removeEventListener('change', onDPRChange)
      wrap.style.zoom   = ''
      wrap.style.width  = ''
      wrap.style.height = ''
    }
  }, [])
}

// ── Root ──────────────────────────────────────────────────────────────────────
function Root() {
  useZoomLock()
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)