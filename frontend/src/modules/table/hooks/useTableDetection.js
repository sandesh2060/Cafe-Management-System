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

// ── Config ────────────────────────────────────────────────────────────────────
const GPS_CONFIG = {
  timeoutMs:     parseInt(import.meta.env.VITE_GPS_TIMEOUT_MS     || '12000', 10),
  readingsCount: parseInt(import.meta.env.VITE_GPS_READINGS_COUNT || '3',     10),
  confidenceMin: parseInt(import.meta.env.VITE_GPS_CONFIDENCE_MIN || '85',    10),
  cafeId:        import.meta.env.VITE_CAFE_ID,
}

// ── Dev GPS mock ──────────────────────────────────────────────────────────────
//
// MacBooks have no GPS hardware. Apple uses WiFi triangulation via CoreLocation,
// which fails in Nepal (code 2 = kCLErrorLocationUnknown: no Apple location data
// for this region). This mock bypasses navigator.geolocation entirely in dev.
//
// HOW IT WORKS:
//   Set VITE_DEV_GPS_LAT and VITE_DEV_GPS_LNG in frontend/.env.local
//   The mock intercepts watchPosition/getCurrentPosition and instantly
//   returns a fake GeolocationPosition with accuracy=5m (best-case GPS).
//   The entire pipeline — readings, confidence scoring, haversine, backend
//   nearestTable — runs exactly as in production. Only the hardware source
//   is replaced. Zero mock code ships in production (import.meta.env.PROD
//   tree-shakes this block out at build time).
//
// SETUP (add to frontend/.env.local — never commit this file):
//   VITE_DEV_GPS_LAT=27.70244
//   VITE_DEV_GPS_LNG=85.34660
//
// AVAILABLE TEST COORDS (match your MongoDB table data):
//   MY-1  Indoor   radiusMeters=20   27.70244  85.34660   ← easiest, start here
//   O-2   Outdoor  radiusMeters=2    27.702322 85.3466
//   TR-1  Terrace  radiusMeters=2    27.70235  85.346628
//   T-1   Indoor   radiusMeters=1.5  27.702238 85.346516  ← strictest
//
// TO DISABLE: remove the env vars or set VITE_DEV_GPS_LAT= (empty)

const DEV_MOCK_LAT = import.meta.env.VITE_DEV_GPS_LAT
  ? parseFloat(import.meta.env.VITE_DEV_GPS_LAT)
  : null
const DEV_MOCK_LNG = import.meta.env.VITE_DEV_GPS_LNG
  ? parseFloat(import.meta.env.VITE_DEV_GPS_LNG)
  : null

const DEV_GPS_ENABLED = (
  import.meta.env.DEV &&
  DEV_MOCK_LAT !== null &&
  DEV_MOCK_LNG !== null &&
  !isNaN(DEV_MOCK_LAT) &&
  !isNaN(DEV_MOCK_LNG)
)

// Build a fake GeolocationPosition object that matches the browser API shape
const makeMockPosition = (lat, lng) => ({
  coords: {
    latitude:         lat,
    longitude:        lng,
    accuracy:         5,    // 5m = excellent GPS, ensures confidence passes
    altitude:         null,
    altitudeAccuracy: null,
    heading:          null,
    speed:            null,
  },
  timestamp: Date.now(),
})

// Drop-in replacement for navigator.geolocation — same API surface.
// Fires 3 readings with independent timeouts so clearWatch on the
// watch ID doesn't accidentally cancel readings 2 and 3.
const _mockCancelMap = {}

const mockGeolocation = DEV_GPS_ENABLED ? {
  watchPosition: (onSuccess, _onError, _opts) => {
    console.info(
      '[TableDetection] 🧪 DEV GPS MOCK active\n' +
      '  Lat: ' + DEV_MOCK_LAT + '  Lng: ' + DEV_MOCK_LNG + '\n' +
      '  Set VITE_DEV_GPS_LAT / VITE_DEV_GPS_LNG in .env.local to change'
    )
    // Each reading has its own timeout ID so clearWatch can't accidentally
    // cancel readings 2+3 by clearing only the first timeout.
    let cancelled = false
    const t1 = setTimeout(() => { if (!cancelled) onSuccess(makeMockPosition(DEV_MOCK_LAT, DEV_MOCK_LNG)) }, 300)
    const t2 = setTimeout(() => { if (!cancelled) onSuccess(makeMockPosition(DEV_MOCK_LAT, DEV_MOCK_LNG)) }, 500)
    const t3 = setTimeout(() => { if (!cancelled) onSuccess(makeMockPosition(DEV_MOCK_LAT, DEV_MOCK_LNG)) }, 700)
    // Return a stable watch ID — clearWatch sets cancelled=true and clears all
    const watchId = t1
    _mockCancelMap[watchId] = () => {
      cancelled = true
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
    return watchId
  },
  getCurrentPosition: (onSuccess, _onError, _opts) => {
    setTimeout(() => onSuccess(makeMockPosition(DEV_MOCK_LAT, DEV_MOCK_LNG)), 100)
  },
  clearWatch: (id) => {
    if (_mockCancelMap[id]) {
      _mockCancelMap[id]()
      delete _mockCancelMap[id]
    } else {
      clearTimeout(id)
    }
  },
} : null

// Resolved geolocation source — mock in dev (if configured), real browser otherwise
const geo = DEV_GPS_ENABLED ? mockGeolocation : navigator.geolocation

// ── One-time DEV hints ────────────────────────────────────────────────────────
if (import.meta.env.DEV) {
  if (DEV_GPS_ENABLED) {
    console.info(
      '[TableDetection] 🧪 DEV GPS MOCK enabled — ' +
      DEV_MOCK_LAT + ', ' + DEV_MOCK_LNG
    )
  } else {
    console.info(
      '[TableDetection] 💡 GPS mock not active. To enable, add to frontend/.env.local:\n' +
      '  VITE_DEV_GPS_LAT=27.70244\n' +
      '  VITE_DEV_GPS_LNG=85.34660\n' +
      '  (Kausichiya / MY-1 table — radiusMeters=20, easiest target)'
    )
  }
}

export const useTableDetection = () => {
  const [state, send] = useMachine(detectionMachine)
  const dispatch      = useDispatch()
  const navigate      = useNavigate()

  const watchId      = useRef(null)
  const readings     = useRef([])
  const gpsTimer     = useRef(null)
  const currentState = useRef('idle')
  const didFallback  = useRef(false)
  const isMounted    = useRef(true)
  // Per-instance guard — reset in cleanup so StrictMode's first-mount
  // cleanup clears it, allowing the real second mount to call startGPS.
  // This is the key difference from a module-level flag: when StrictMode
  // unmounts the first mount, the cleanup sets hasStarted.current = false,
  // so the second (real) mount can proceed. The isMounted ref prevents
  // the dead first mount's setTimeout callbacks from doing anything.
  const hasStarted   = useRef(false)

  useEffect(() => {
    return () => {
      isMounted.current = false
      hasStarted.current = false  // Reset so StrictMode second mount can start
    }
  }, [])

  useEffect(() => {
    currentState.current = typeof state.value === 'string'
      ? state.value
      : Object.keys(state.value)[0]
  }, [state.value])

  /* ── Haversine ──────────────────────────────────────────────────────── */
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

  /* ── Confidence ─────────────────────────────────────────────────────── */
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

  /* ── Create session ─────────────────────────────────────────────────── */
  const createSession = useCallback(async (payload) => {
    try {
      const endpoint = payload.method === 'gps'
        ? ENDPOINTS.TABLE.DETECT_GPS
        : ENDPOINTS.TABLE.DETECT_QR

      const body = payload.method === 'gps'
        ? {
            latitude:        payload.latitude,
            longitude:       payload.longitude,
            confidenceScore: payload.confidenceScore,
            accuracy:        payload.accuracy ?? null,
            cafeId:          GPS_CONFIG.cafeId,
          }
        : payload

      const data = await api.post(endpoint, body, { timeout: 10_000 })

      // Only guard dispatch with isMounted — never guard navigate.
      // isMounted can be false due to StrictMode remount timing,
      // but navigate() is router-level and always safe to call.
      if (isMounted.current) {
        dispatch(setSession(data.session))
        dispatch(setTableInfo({
          tableId:   data.session.tableId,
          sessionId: data.session.sessionId,
        }))
        send({
          type:      'SESSION_CREATED',
          table:     data.session.table,
          sessionId: data.session.sessionId,
        })
      }

      // Always navigate — table is detected, user needs to log in
      navigate('/login')

    } catch (err) {
      if (!isMounted.current) return
      const msg = err.response?.data?.message || 'Table detection failed'
      dispatch(setSessionError(msg))
      send({ type: 'SESSION_ERROR', error: msg })
    }
  }, [dispatch, navigate, send])

  /* ── Core position handler ──────────────────────────────────────────── */
  const handlePosition = useCallback((position) => {
    const { latitude, longitude, accuracy } = position.coords
    console.log('[TableDetection] 📍 GPS reading:', latitude, longitude, '±' + Math.round(accuracy) + 'm')

    readings.current.push({ latitude, longitude, accuracy, timestamp: Date.now() })
    if (readings.current.length > GPS_CONFIG.readingsCount) {
      readings.current = readings.current.slice(-GPS_CONFIG.readingsCount)
    }

    const enoughReadings = readings.current.length >= GPS_CONFIG.readingsCount
    const greatAccuracy  = accuracy <= 25 && readings.current.length >= 1

    if (enoughReadings || greatAccuracy) {
      clearTimeout(gpsTimer.current)
      if (watchId.current !== null) {
        geo.clearWatch(watchId.current)
        watchId.current = null
      }

      const score  = calculateConfidence(readings.current)
      const avgLat = readings.current.reduce((a, r) => a + r.latitude,  0) / readings.current.length
      const avgLng = readings.current.reduce((a, r) => a + r.longitude, 0) / readings.current.length

      console.log('[TableDetection] 🎯 Confidence score:', score, '(min:', GPS_CONFIG.confidenceMin + ')')

      if (score >= GPS_CONFIG.confidenceMin) {
        send({ type: 'GPS_HIGH_CONFIDENCE', coords: { latitude: avgLat, longitude: avgLng, accuracy }, confidenceScore: score })
        createSession({ method: 'gps', latitude: avgLat, longitude: avgLng, confidenceScore: score, accuracy })
      } else if (accuracy <= 50) {
        console.log('[TableDetection] 📍 Single reading accepted (accuracy ≤50m)')
        send({ type: 'GPS_HIGH_CONFIDENCE', coords: { latitude, longitude, accuracy }, confidenceScore: score })
        createSession({ method: 'gps', latitude, longitude, confidenceScore: score, accuracy })
      } else {
        console.warn('[TableDetection] ⚠ Low confidence → QR fallback')
        send({ type: 'GPS_LOW_CONFIDENCE' })
      }
    }
  }, [calculateConfidence, createSession, send])

  /* ── Phase 3: cached position probe ────────────────────────────────── */
  const tryCachedPosition = useCallback(() => {
    console.log('[TableDetection] 🗂 Trying cached position probe (maximumAge=5min)…')

    geo.getCurrentPosition(
      (position) => {
        console.log(
          '[TableDetection] ✅ Got cached position:',
          position.coords.latitude,
          position.coords.longitude,
          '±' + Math.round(position.coords.accuracy) + 'm'
        )
        handlePosition(position)
      },
      (err) => {
        console.error('[TableDetection] ❌ Cached position probe failed (code ' + err.code + ') → QR fallback')
        const s = currentState.current
        if (s === 'requestingGPS' || s === 'collectingReadings') {
          if (err.code === 1) send({ type: 'GPS_DENIED' })
          else                send({ type: 'GPS_TIMEOUT' })
        }
      },
      { enableHighAccuracy: false, timeout: 5_000, maximumAge: 300_000 },
    )
  }, [handlePosition, send])

  /* ── Phase 2: low-accuracy fallback watch ───────────────────────────── */
  const startLowAccuracyWatch = useCallback(() => {
    if (didFallback.current) {
      console.warn('[TableDetection] Low-accuracy also failed → trying cached position probe')
      tryCachedPosition()
      return
    }
    didFallback.current = true
    clearTimeout(gpsTimer.current)
    readings.current = []

    console.log('[TableDetection] 🔄 Falling back to low-accuracy GPS (no timeout)')

    if (watchId.current !== null) {
      geo.clearWatch(watchId.current)
      watchId.current = null
    }

    gpsTimer.current = setTimeout(() => {
      console.warn('[TableDetection] ⏱ Low-accuracy GPS timeout → trying cached position probe')
      if (watchId.current !== null) {
        geo.clearWatch(watchId.current)
        watchId.current = null
      }
      tryCachedPosition()
    }, GPS_CONFIG.timeoutMs)

    watchId.current = geo.watchPosition(
      handlePosition,
      (err) => {
        clearTimeout(gpsTimer.current)
        console.error('[TableDetection] ❌ Low-accuracy GPS error:', err.code, '—', err.message)
        if (err.code === 1) send({ type: 'GPS_DENIED' })
        else                tryCachedPosition()
      },
      { enableHighAccuracy: false, timeout: Infinity, maximumAge: 30_000 },
    )
  }, [handlePosition, send, tryCachedPosition])

  /* ── GPS error handler (phase 1) ────────────────────────────────────── */
  const handleGpsError = useCallback((err) => {
    clearTimeout(gpsTimer.current)
    console.error('[TableDetection] ❌ GPS error code:', err.code, '—', err.message)

    if (err.code === 1) {
      send({ type: 'GPS_DENIED' })
      return
    }

    console.warn('[TableDetection] ⚠ High-accuracy failed (code ' + err.code + ') → trying low-accuracy fallback')
    startLowAccuracyWatch()
  }, [send, startLowAccuracyWatch])

  /* ── startGPS ───────────────────────────────────────────────────────── */
  const startGPS = useCallback(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    if (watchId.current !== null) {
      geo.clearWatch(watchId.current)
      watchId.current = null
    }
    clearTimeout(gpsTimer.current)
    readings.current    = []
    didFallback.current = false

    dispatch(setDetecting())
    send({ type: 'START' })

    if (!geo) {
      console.warn('[TableDetection] Geolocation not supported → QR fallback')
      send({ type: 'GPS_DENIED' })
      return
    }

    console.log('[TableDetection] Starting GPS watch (high-accuracy)... timeout=' + GPS_CONFIG.timeoutMs + 'ms')

    gpsTimer.current = setTimeout(() => {
      console.warn('[TableDetection] ⏱ High-accuracy GPS timeout → trying low-accuracy fallback')
      if (watchId.current !== null) {
        geo.clearWatch(watchId.current)
        watchId.current = null
      }
      startLowAccuracyWatch()
    }, GPS_CONFIG.timeoutMs)

    watchId.current = geo.watchPosition(
      handlePosition,
      handleGpsError,
      { enableHighAccuracy: true, timeout: GPS_CONFIG.timeoutMs, maximumAge: 0 },
    )
  }, [dispatch, send, handlePosition, handleGpsError, startLowAccuracyWatch])

  /* ── QR / manual ────────────────────────────────────────────────────── */
  const onQrScanned = useCallback((token) => {
    send({ type: 'QR_SCANNED' })
    createSession({ method: 'qr', token })
  }, [send, createSession])

  const onManualEntry = useCallback((tableNumber) => {
    send({ type: 'MANUAL_ENTRY' })
    createSession({ method: 'manual', tableNumber })
  }, [send, createSession])

  /* ── retry ──────────────────────────────────────────────────────────── */
  const retry = useCallback(() => {
    readings.current    = []
    didFallback.current = false
    hasStarted.current  = false
    if (watchId.current !== null) {
      geo.clearWatch(watchId.current)
      watchId.current = null
    }
    clearTimeout(gpsTimer.current)
    send({ type: 'RETRY' })
  }, [send])

  /* ── cleanup on unmount ─────────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      if (watchId.current !== null) geo.clearWatch(watchId.current)
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