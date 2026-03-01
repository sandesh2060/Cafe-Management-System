// src/app/main.jsx
import React    from 'react'
import ReactDOM from 'react-dom/client'
import App      from './App.jsx'

// ── useZoomLock ──────────────────────────────────────────────────────────
//
// Keeps the app visually at 100% scale even when the user Ctrl+/- zooms.
//
// HOW IT WORKS:
//   • The inline script in index.html already applied the first counter-zoom
//     synchronously (zero flash on first paint).
//   • This hook takes over after React mounts and keeps it synced.
//   • We target #zoom-wrap (not <html>) to avoid browser quirks with root elements.
//   • We use CSS `zoom` property (not transform: scale) — stays in normal
//     flow, no clipping, no offset issues, smooth via CSS transition.
//
// BROWSER SUPPORT:
//   • Chrome / Edge   — devicePixelRatio changes with zoom → caught by matchMedia
//   • Firefox 126+    — same
//   • Safari          — same (HiDPI base handled by capturing DPR at load)
//
// ─────────────────────────────────────────────────────────────────────────

function useZoomLock() {
  React.useEffect(() => {
    const wrap   = document.getElementById('zoom-wrap')
    if (!wrap) return

    // Base DPR at page load = "100% zoom" for this display
    const baseDPR = window.devicePixelRatio || 1
    let rafId     = null
    let lastZoom  = parseFloat(wrap.style.zoom) || 1  // sync with inline script

    function getZoomLevel() {
      const dpr = window.devicePixelRatio || 1
      const zoom = dpr / baseDPR
      return Math.round(zoom * 20) / 20  // round to nearest 5% step
    }

    function applyZoom() {
      const zoomLevel   = getZoomLevel()
      const counterZoom = parseFloat((1 / zoomLevel).toFixed(4))

      if (Math.abs(counterZoom - lastZoom) < 0.005) return
      lastZoom = counterZoom

      // CSS zoom — uniform scaling, stays in flow, transition handled by CSS
      wrap.style.zoom   = counterZoom
      const pct         = (zoomLevel * 100).toFixed(1) + '%'
      wrap.style.width  = pct
      wrap.style.height = pct
    }

    function onResize() {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(applyZoom)
    }

    // Sync immediately in case inline script and React disagree
    applyZoom()
    window.addEventListener('resize', onResize, { passive: true })

    // matchMedia DPR watcher — catches Ctrl+/- in all modern browsers
    let dprMql = null
    function watchDPR() {
      dprMql?.removeEventListener('change', onDPRChange)
      dprMql = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
      dprMql.addEventListener('change', onDPRChange)
    }
    function onDPRChange() { onResize(); watchDPR() }
    if (window.matchMedia) watchDPR()

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      dprMql?.removeEventListener('change', onDPRChange)
      // Reset on unmount (safe for HMR in dev)
      wrap.style.zoom   = ''
      wrap.style.width  = ''
      wrap.style.height = ''
    }
  }, [])
}

// ── Root ─────────────────────────────────────────────────────────────────
function Root() {
  useZoomLock()
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)