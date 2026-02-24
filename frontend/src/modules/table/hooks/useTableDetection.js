// src/modules/table/hooks/useTableDetection.js
import { useEffect, useRef, useCallback } from 'react'
import { useMachine }   from '@xstate/react'
import { useDispatch }  from 'react-redux'
import { useNavigate }  from 'react-router-dom'
import { detectionMachine } from '../detection/detectionMachine'
import {
  setDetecting,
  setSession,
  setSessionError,
} from '@store/slices/tableSessionSlice'
import { setTableInfo } from '@store/slices/cartSlice'
import api              from '@api/axios'
import { ENDPOINTS }    from '@api/endpoints'

const GPS_TIMEOUT_MS     = parseInt(import.meta.env.VITE_GPS_TIMEOUT_MS     || '12000')
const GPS_READINGS_COUNT = parseInt(import.meta.env.VITE_GPS_READINGS_COUNT || '3')
const GPS_CONFIDENCE_MIN = parseInt(import.meta.env.VITE_GPS_CONFIDENCE_MIN || '85')
const CAFE_ID            = import.meta.env.VITE_CAFE_ID

export const useTableDetection = () => {
  const [state, send] = useMachine(detectionMachine)
  const dispatch      = useDispatch()
  const navigate      = useNavigate()
  const watchId       = useRef(null)
  const readings      = useRef([])
  const gpsTimer      = useRef(null)
  const currentState  = useRef('idle')

  useEffect(() => {
    currentState.current = typeof state.value === 'string'
      ? state.value
      : Object.keys(state.value)[0]
  }, [state.value])

  const haversine = useCallback((lat1, lng1, lat2, lng2) => {
    const R  = 6371000
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lng2 - lng1) * Math.PI) / 180
    const a  = Math.sin(Δφ / 2) ** 2
              + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }, [])

  const calculateConfidence = useCallback((coords) => {
    if (!coords || coords.length < 2) return 50
    const lats   = coords.map(c => c.latitude)
    const lngs   = coords.map(c => c.longitude)
    const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length
    const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length
    const maxSpread     = Math.max(...coords.map(c => haversine(c.latitude, c.longitude, avgLat, avgLng)))
    const avgAccuracy   = coords.reduce((a, c) => a + (c.accuracy || 10), 0) / coords.length
    const spreadScore   = Math.max(0, 100 - maxSpread * 20)
    const accuracyScore = Math.max(0, 100 - avgAccuracy * 2)
    return Math.round((spreadScore + accuracyScore) / 2)
  }, [haversine])

  const createSession = useCallback(async (payload) => {
    try {
      const endpoint = payload.method === 'gps'
        ? ENDPOINTS.TABLE.DETECT_GPS
        : ENDPOINTS.TABLE.DETECT_QR

      // Always include cafeId for GPS requests (backend needs it when user is unauthenticated)
      // Also include accuracy so the backend can use it as the effective GPS radius floor
      const body = payload.method === 'gps'
        ? {
            latitude:        payload.latitude,
            longitude:       payload.longitude,
            confidenceScore: payload.confidenceScore,
            accuracy:        payload.accuracy ?? null,
            cafeId:          CAFE_ID,
          }
        : payload

      const data = await api.post(endpoint, body)
      dispatch(setSession(data.session))
      dispatch(setTableInfo({ tableId: data.session.tableId, sessionId: data.session.sessionId }))
      send({ type: 'SESSION_CREATED', table: data.session.table, sessionId: data.session.sessionId })
      navigate('/login')
    } catch (err) {
      const msg = err.response?.data?.message || 'Table detection failed'
      dispatch(setSessionError(msg))
      send({ type: 'SESSION_ERROR', error: msg })
    }
  }, [dispatch, navigate, send])

  const startGPS = useCallback(() => {
    // Clean up any previous watch before starting
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
    clearTimeout(gpsTimer.current)
    readings.current = []

    dispatch(setDetecting())
    send({ type: 'START' })

    if (!navigator.geolocation) {
      console.warn('[TableDetection] Geolocation not supported → QR fallback')
      send({ type: 'GPS_DENIED' })
      return
    }

    console.log('[TableDetection] Starting GPS watch... timeout=' + GPS_TIMEOUT_MS + 'ms')

    gpsTimer.current = setTimeout(() => {
      console.warn('[TableDetection] ⏱ GPS timeout fired — going to QR')
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }
      const s = currentState.current
      if (s === 'requestingGPS' || s === 'collectingReadings') {
        send({ type: 'GPS_TIMEOUT' })
      }
    }, GPS_TIMEOUT_MS)

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        console.log('[TableDetection] 📍 GPS reading:', latitude, longitude, '±' + Math.round(accuracy) + 'm')

        readings.current.push({ latitude, longitude, accuracy, timestamp: Date.now() })
        if (readings.current.length > GPS_READINGS_COUNT) {
          readings.current = readings.current.slice(-GPS_READINGS_COUNT)
        }

        const enoughReadings = readings.current.length >= GPS_READINGS_COUNT
        const greatAccuracy  = accuracy <= 25 && readings.current.length >= 1

        if (enoughReadings || greatAccuracy) {
          clearTimeout(gpsTimer.current)
          navigator.geolocation.clearWatch(watchId.current)
          watchId.current = null

          const score  = calculateConfidence(readings.current)
          const avgLat = readings.current.reduce((a, r) => a + r.latitude,  0) / readings.current.length
          const avgLng = readings.current.reduce((a, r) => a + r.longitude, 0) / readings.current.length

          console.log('[TableDetection] 🎯 Confidence score:', score, '(min:', GPS_CONFIDENCE_MIN + ')')

          if (score >= GPS_CONFIDENCE_MIN) {
            send({ type: 'GPS_HIGH_CONFIDENCE', coords: { latitude: avgLat, longitude: avgLng, accuracy } })
            // Pass accuracy so backend uses it as effective radius floor
            createSession({ method: 'gps', latitude: avgLat, longitude: avgLng, confidenceScore: score, accuracy })
          } else if (accuracy <= 50) {
            console.log('[TableDetection] 📍 Single reading accepted (accuracy ≤50m)')
            send({ type: 'GPS_HIGH_CONFIDENCE', coords: { latitude, longitude, accuracy } })
            // Pass accuracy so backend uses it as effective radius floor
            createSession({ method: 'gps', latitude, longitude, confidenceScore: score, accuracy })
          } else {
            console.warn('[TableDetection] ⚠ Low confidence → QR fallback')
            send({ type: 'GPS_LOW_CONFIDENCE' })
          }
        }
      },
      (err) => {
        clearTimeout(gpsTimer.current)
        console.error('[TableDetection] ❌ GPS error code:', err.code, '—', err.message)
        send(err.code === 1 ? { type: 'GPS_DENIED' } : { type: 'GPS_TIMEOUT' })
      },
      { enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS, maximumAge: 0 },
    )
  }, [dispatch, send, createSession, calculateConfidence])

  const onQrScanned = useCallback((token) => {
    send({ type: 'QR_SCANNED' })
    createSession({ method: 'qr', token })
  }, [send, createSession])

  const onManualEntry = useCallback((tableNumber) => {
    send({ type: 'MANUAL_ENTRY' })
    createSession({ method: 'manual', tableNumber })
  }, [send, createSession])

  const retry = useCallback(() => {
    readings.current = []
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
    clearTimeout(gpsTimer.current)
    send({ type: 'RETRY' })
  }, [send])

  useEffect(() => {
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
      clearTimeout(gpsTimer.current)
    }
  }, [])

  return {
    state:       state.value,
    context:     state.context,
    startGPS,
    onQrScanned,
    onManualEntry,
    retry,
    isDetecting: state.matches('requestingGPS') || state.matches('collectingReadings'),
    isQR:        state.matches('showingQR'),
    isDone:      state.matches('done'),
    isError:     state.matches('error'),
  }
}