// src/modules/customer/hooks/useActiveOrder.js
//
// MULTI-USER SESSION FIX:
// ✅ Registers tableSession socket handlers on mount
// ✅ Calls notifySocketOfSession when sessionId changes — joins table room
// ✅ Polling preserved as fallback (10s)
// ✅ All existing visibility/focus behaviour unchanged

import { useEffect, useRef, useCallback } from 'react'
import { useDispatch, useSelector }        from 'react-redux'
import { fetchActiveOrder }                from '@store/slices/orderSlice'
import { selectSessionId }                 from '@store/slices/tableSessionSlice'
import {
  registerTableSessionSocketHandlers,
  notifySocketOfSession,
}                                          from '@modules/table/services/tableSession.socket'

const POLL_MS = 10_000

export function useActiveOrder() {
  const dispatch   = useDispatch()
  const sessionId  = useSelector(selectSessionId)
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

  // ── Register socket handlers once on mount ────────────────────────────────
  useEffect(() => {
    registerTableSessionSocketHandlers()
  }, [])

  // ── Join table room whenever sessionId changes ────────────────────────────
  // This handles: (1) user detects table after socket connects
  //               (2) user gets a new sessionId (e.g. session reset)
  useEffect(() => {
    if (!sessionId) return
    notifySocketOfSession(sessionId)
    // Immediately refetch — we may now share a session with someone
    poll()
  }, [sessionId, poll])

  // ── Polling + visibility ──────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true
    poll()
    startInterval()

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        clearInterval(timerRef.current)
      } else {
        poll()
        startInterval()
      }
    }

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
}

export default useActiveOrder