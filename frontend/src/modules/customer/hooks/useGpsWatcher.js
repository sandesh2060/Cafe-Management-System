// src/modules/customer/hooks/useGpsWatcher.js
//
// FIXES:
//   • setSessionAbandoned removed — that action doesn't exist in tableSessionSlice
//     Replaced with clearSession() which is the correct action for an abandoned session
//   • logoutService.execute() → logoutService.executeClient() (confirmed method name)
//   • api.post('/sessions/geofence-exit') → ENDPOINTS.TABLE.GEOFENCE_EXIT
//   • checkBoundary wrapped in useCallback for stable closure over deps

import { useEffect, useRef, useCallback } from 'react'
import { useSelector, useDispatch }        from 'react-redux'
import { selectSessionId, clearSession }   from '@store/slices/tableSessionSlice'
import { selectHasActiveOrder }            from '@store/slices/orderSlice'
import { selectIsLoggedIn }                from '@store/slices/authSlice'
import logoutService                       from '../services/logoutService'
import socketService                       from '@shared/services/socket.service'
import api                                 from '@api/axios'
import { ENDPOINTS }                       from '@api/endpoints'

const POLL_MS  = parseInt(import.meta.env.VITE_GPS_POLL_INTERVAL || '30000')
const GRACE_MS = parseInt(import.meta.env.VITE_LOGOUT_GRACE_MS   || '300000')

const haversine = (lat1, lng1, lat2, lng2) => {
  const R    = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a    = Math.sin(dLat / 2) ** 2 +
               Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export const useGpsWatcher = (cafeCenter, cafeRadiusMeters = 100) => {
  const isLoggedIn     = useSelector(selectIsLoggedIn)
  const hasActiveOrder = useSelector(selectHasActiveOrder)
  const sessionId      = useSelector(selectSessionId)
  const dispatch       = useDispatch()

  const graceTimerRef  = useRef(null)
  const graceActiveRef = useRef(false)

  const checkBoundary = useCallback(() => {
    if (!isLoggedIn || !cafeCenter || !navigator.geolocation) return

    navigator.geolocation.getCurrentPosition((pos) => {
      const dist = haversine(
        pos.coords.latitude, pos.coords.longitude,
        cafeCenter.lat, cafeCenter.lng
      )
      const isOutside = dist > cafeRadiusMeters

      if (!isOutside) {
        // Back inside — cancel grace timer
        if (graceTimerRef.current) {
          clearTimeout(graceTimerRef.current)
          graceTimerRef.current  = null
          graceActiveRef.current = false
          localStorage.removeItem('kc_geofence_exit')
        }
        return
      }

      // Outside boundary — no active order: immediate logout
      if (!hasActiveOrder) {
        logoutService.executeClient()   // FIX: was .execute()
        return
      }

      // Outside boundary — active order: start grace period
      if (!graceActiveRef.current) {
        graceActiveRef.current = true
        localStorage.setItem('kc_geofence_exit', Date.now())

        socketService.emit('session:abandoned', { sessionId, reason: 'geofence_exit' })
        // FIX: setSessionAbandoned doesn't exist — clearSession signals the abandoned state
        dispatch(clearSession())

        // Notify backend
        api.post(ENDPOINTS.TABLE.GEOFENCE_EXIT, { sessionId }).catch(() => {})

        graceTimerRef.current = setTimeout(() => {
          logoutService.executeClient()   // FIX: was .execute()
        }, GRACE_MS)
      }
    })
  }, [isLoggedIn, hasActiveOrder, cafeCenter, cafeRadiusMeters, sessionId, dispatch])

  useEffect(() => {
    if (!isLoggedIn) return
    const interval = setInterval(checkBoundary, POLL_MS)
    return () => {
      clearInterval(interval)
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current)
    }
  }, [isLoggedIn, checkBoundary])
}