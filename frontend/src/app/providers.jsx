// src/app/providers.jsx
//
// ─── SCROLL ARCHITECTURE ─────────────────────────────────────────────────────
//
// RULE: Lenis is invisible on touch, polishes wheel/trackpad on desktop.
//
// WHY smoothTouch/syncTouch are OFF:
//   Android mid-range (Galaxy A, Redmi, etc.) batches touch events at 60Hz
//   but Lenis runs RAF at 120Hz. When smoothTouch:true, Lenis interpolates
//   between batched events — this creates a phase mismatch that reads as
//   stutter/jitter. The compositor knows the real touch velocity; Lenis
//   guesses it. Native always wins.
//
//   iOS ProMotion (120Hz) + variable refresh Android = native compositing
//   already IS butter smooth. Adding JS lerp on top doesn't improve it —
//   it adds a competing frame loop that can only make things worse.
//
// WHY touchMultiplier: 1.0:
//   1.5 was compensating for Lenis's own smoothTouch dampening. With
//   smoothTouch off, 1.0 = exact 1:1 finger tracking. No overshoot.
//
// WHERE the "fluid + premium" comes from:
//   lerp: 0.085  — butter tail on trackpad without feeling laggy
//   easing: cubic-out — graceful arc, feels like App Store card scroll
//   wheelMultiplier: 0.9 — cards feel physically weighted, not rushed
//
// PerfModeManager:
//   Adds body.perf-mode during scroll → CSS strips backdrop-filter on all
//   glass elements → eliminates GPU resampling on every scroll frame.
//   Removes it 150ms after scroll stops → glass restores instantly.
// ─────────────────────────────────────────────────────────────────────────────

import { Provider }             from 'react-redux'
import { BrowserRouter }        from 'react-router-dom'
import { ReactLenis, useLenis } from 'lenis/react'
import { ThemeProvider }        from '@shared/context/ThemeContext'
import { DeviceTierProvider }   from '@shared/context/DeviceTierContext'
import { setLenisInstance }     from '@shared/utils/lenisLock'
import store                    from '@store'
import { useEffect }            from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Lenis options — only change these, never touch them inline in JSX
// ─────────────────────────────────────────────────────────────────────────────
const lenisOptions = {

  // ── Mobile touch ─────────────────────────────────────────────────────────
  // All three OFF = Lenis is completely invisible on touch devices.
  // iOS and Android compositor handle 100% of touch scroll natively.
  // Result: zero jitter, zero JS overhead, exactly native feel.
  smoothTouch:     false,   // was true  — was creating stutter on Android
  syncTouch:       false,   // was true  — was fighting native momentum
  touchMultiplier: 1.0,     // was 1.5   — 1:1 finger tracking, no overshoot

  // ── Desktop wheel / trackpad ──────────────────────────────────────────────
  // This is the ONLY place Lenis adds value. Wheel events are chunky and
  // have no native momentum — Lenis smooths them beautifully.
  smoothWheel:     true,
  wheelMultiplier: 0.9,     // slightly under 1 = cards glide, not rush

  // lerp 0.085 = fluid sweet spot for a premium card-browsing UI.
  // Lower than 0.11 so there's a perceptible butter tail on trackpad,
  // high enough that it never feels like the page is running away.
  lerp: 0.085,

  // Cubic-out easing — rounder, more luxurious arc than expo-out.
  // expo-out is sharp and functional; cubic-out reads as "smooth and
  // considered." Feels like Apple Maps card scroll or App Store rows.
  easing: (t) => 1 - Math.pow(1 - t, 3),

  // ── Direction ─────────────────────────────────────────────────────────────
  orientation:        'vertical',
  gestureOrientation: 'vertical',  // horizontal strips fall through natively
                                   // category pills + carousels unaffected

  // ── Overscroll ────────────────────────────────────────────────────────────
  overscroll: true,   // rubber-band bounce at top/bottom

  // ── RAF ───────────────────────────────────────────────────────────────────
  autoRaf: true,      // Lenis manages its own requestAnimationFrame
}

// ─────────────────────────────────────────────────────────────────────────────
// PerfModeManager
// Registers the Lenis instance with lenisLock.js and manages body.perf-mode.
// ─────────────────────────────────────────────────────────────────────────────
function PerfModeManager() {
  const lenis = useLenis()

  // Share instance so lockScroll/unlockScroll work in sheets and drawers
  useEffect(() => {
    if (!lenis) return
    setLenisInstance(lenis)
    return () => setLenisInstance(null)
  }, [lenis])

  // body.perf-mode → CSS strips backdrop-filter during scroll
  // Eliminates GPU resampling on glass cards = smooth scroll on Android
  useEffect(() => {
    if (!lenis) return
    let stopTimer = null

    const onScroll = () => {
      document.body.classList.add('perf-mode')
      clearTimeout(stopTimer)
      stopTimer = setTimeout(() => {
        document.body.classList.remove('perf-mode')
      }, 150)
    }

    lenis.on('scroll', onScroll)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      lenis.off('scroll', onScroll)
      window.removeEventListener('scroll', onScroll)
      clearTimeout(stopTimer)
      document.body.classList.remove('perf-mode')
    }
  }, [lenis])

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Providers
// ─────────────────────────────────────────────────────────────────────────────
const Providers = ({ children }) => (
  <Provider store={store}>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <DeviceTierProvider>
        <ThemeProvider>
          <ReactLenis root options={lenisOptions}>
            <PerfModeManager />
            {children}
          </ReactLenis>
        </ThemeProvider>
      </DeviceTierProvider>
    </BrowserRouter>
  </Provider>
)

export default Providers