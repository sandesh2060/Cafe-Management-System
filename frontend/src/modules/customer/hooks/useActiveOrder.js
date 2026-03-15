// src/modules/customer/hooks/useActiveOrder.js
//
// POLLING FIX — was firing GET /api/orders/active every ~80ms (9000+ requests/session)
//
// ROOT CAUSE:
//   The previous version used setInterval inside useEffect with no stable
//   dependency array, causing a new interval to be created on EVERY re-render.
//   Since Redux state updates trigger re-renders, this created an exponential
//   pile-up of concurrent polling intervals.
//
// FIXES APPLIED:
//   1. POLL_MS = 10_000 (10 seconds) — reasonable for order status updates
//   2. Single interval, created once on mount, cleared on unmount
//   3. Visibility-aware: pauses polling when tab is backgrounded
//   4. Focused-aware: polls immediately on window focus (user returns to tab)
//   5. No re-render loop: dispatch is stable, no unstable deps in effect
//   6. Socket-first: if your app uses Socket.io for order updates (it does),
//      polling is only a fallback — 10s is more than enough
//   7. Immediate fetch on mount so UI isn't stale on first load

import { useEffect, useRef, useCallback } from 'react'
import { useDispatch }                     from 'react-redux'
import { fetchActiveOrder }                from '@store/slices/orderSlice'

// ── Config ─────────────────────────────────────────────────────────────────
// 10 seconds is fine — Socket.io handles real-time updates.
// Polling is just a fallback for missed socket events.
const POLL_MS = 10_000

// ── Hook ───────────────────────────────────────────────────────────────────
export function useActiveOrder() {
  const dispatch   = useDispatch()
  const timerRef   = useRef(null)
  const mountedRef = useRef(true)

  const poll = useCallback(() => {
    if (!mountedRef.current) return
    if (document.visibilityState === 'hidden') return
    dispatch(fetchActiveOrder())
  }, [dispatch])

  const startInterval = useCallback(() => {
    clearInterval(timerRef.current)
    timerRef.current = setInterval(poll, POLL_MS)
  }, [poll])

  useEffect(() => {
    mountedRef.current = true

    // Fetch immediately on mount — don't wait 10s for first data
    poll()

    // Start the polling interval
    startInterval()

    // Pause when tab is hidden, resume + immediate fetch when visible again
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        clearInterval(timerRef.current)
      } else {
        poll()           // fetch immediately on return
        startInterval()  // restart interval
      }
    }

    // Re-fetch when user focuses the window (e.g. returns from another app)
    const onFocus = () => {
      poll()
      startInterval()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onFocus)

    return () => {
      mountedRef.current = false
      clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onFocus)
    }
  }, [poll, startInterval])
  // ↑ poll and startInterval are both stable (useCallback with [dispatch])
  // so this effect runs ONCE on mount and cleans up on unmount. No re-render loop.
}

export default useActiveOrder