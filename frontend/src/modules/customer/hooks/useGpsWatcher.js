// src/modules/customer/hooks/useGpsWatcher.js
import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useDispatch } from 'react-redux'
import { selectSessionId, setSessionAbandoned } from '@store/slices/tableSessionSlice'
import { selectHasActiveOrder } from '@store/slices/orderSlice'
import { selectIsLoggedIn } from '@store/slices/authSlice'
import logoutService from '../services/logoutService'
import socketService from '@shared/services/socket.service'
import api from '@api/axios'
import { ENDPOINTS } from '@api/endpoints'

const POLL_MS = parseInt(import.meta.env.VITE_GPS_POLL_INTERVAL || '30000')
const GRACE_MS = parseInt(import.meta.env.VITE_LOGOUT_GRACE_MS || '300000')

// Haversine distance in meters
const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export const useGpsWatcher = (cafeCenter, cafeRadiusMeters = 100) => {
  const isLoggedIn = useSelector(selectIsLoggedIn)
  const hasActiveOrder = useSelector(selectHasActiveOrder)
  const sessionId = useSelector(selectSessionId)
  const dispatch = useDispatch()

  const graceTimerRef = useRef(null)
  const graceActiveRef = useRef(false)

  const checkBoundary = async () => {
    if (!isLoggedIn || !cafeCenter || !navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const dist = haversine(
        pos.coords.latitude, pos.coords.longitude,
        cafeCenter.lat, cafeCenter.lng
      )

      const isOutside = dist > cafeRadiusMeters

      if (!isOutside) {
        // Back inside — cancel any grace timer
        if (graceTimerRef.current) {
          clearTimeout(graceTimerRef.current)
          graceTimerRef.current = null
          graceActiveRef.current = false
          localStorage.removeItem('kc_geofence_exit')
        }
        return
      }

      // Outside boundary
      if (!hasActiveOrder) {
        // Rule 4a — No active order → immediate logout
        logoutService.execute()
        return
      }

      // Rule 4b — Active order → start 5-min grace
      if (!graceActiveRef.current) {
        graceActiveRef.current = true
        localStorage.setItem('kc_geofence_exit', Date.now())

        // Notify manager
        socketService.emit('session:abandoned', { sessionId, reason: 'geofence_exit' })
        dispatch(setSessionAbandoned())

        // Also tell server so manager sees it
        api.post('/sessions/geofence-exit', { sessionId }).catch(() => { })

        graceTimerRef.current = setTimeout(() => {
          // Still outside after grace period
          logoutService.execute()
        }, GRACE_MS)
      }
    })
  }

  useEffect(() => {
    if (!isLoggedIn) return
    const interval = setInterval(checkBoundary, POLL_MS)
    return () => {
      clearInterval(interval)
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current)
    }
  }, [isLoggedIn, hasActiveOrder, cafeCenter, sessionId])
}