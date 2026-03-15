// src/modules/table/hooks/useTableDetection.js
//
// FIX: createSession now navigates to '/menu' when the user is already
// authenticated, and '/login' only for new/unauthenticated sessions.
// Previously it always navigated to '/login', which caused GuestRoute to
// redirect logged-in users on every refresh that re-triggered GPS detection.

import { useEffect, useRef, useCallback } from 'react'
import { useMachine }  from '@xstate/react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { detectionMachine }                          from '../detection/detectionMachine'
import { setDetecting, setSession, setSessionError } from '@store/slices/tableSessionSlice'
import { selectIsLoggedIn }                          from '@store/slices/authSlice'
import api                                           from '@api/axios'
import { ENDPOINTS }                                 from '@api/endpoints'

// ─── GPS config ────────────────────────────────────────────────────────────────
const GPS_CONFIG = {
  timeoutMs:     parseInt(import.meta.env.VITE_GPS_TIMEOUT_MS     || '12000', 10),
  readingsCount: parseInt(import.meta.env.VITE_GPS_READINGS_COUNT || '3',     10),
  confidenceMin: parseInt(import.meta.env.VITE_GPS_CONFIDENCE_MIN || '85',    10),
  cafeId:        import.meta.env.VITE_CAFE_ID,
}

// ─── Dev GPS mock ──────────────────────────────────────────────────────────────
const DEV_MOCK_LAT = import.meta.env.VITE_DEV_GPS_LAT ? parseFloat(import.meta.env.VITE_DEV_GPS_LAT) : null
const DEV_MOCK_LNG = import.meta.env.VITE_DEV_GPS_LNG ? parseFloat(import.meta.env.VITE_DEV_GPS_LNG) : null

const DEV_GPS_ENABLED = (
  import.meta.env.DEV &&
  DEV_MOCK_LAT !== null && DEV_MOCK_LNG !== null &&
  !isNaN(DEV_MOCK_LAT) && !isNaN(DEV_MOCK_LNG)
)

const makeMockPosition = (lat, lng) => ({
  coords: {
    latitude: lat, longitude: lng, accuracy: 5,
    altitude: null, altitudeAccuracy: null, heading: null, speed: null,
  },
  timestamp: Date.now(),
})

const _mockCancelMap = {}

const mockGeolocation = DEV_GPS_ENABLED ? {
  watchPosition: (onSuccess, _onError, _opts) => {
    console.info(`[TableDetection] 🧪 DEV GPS MOCK active — Lat: ${DEV_MOCK_LAT}  Lng: ${DEV_MOCK_LNG}`)
    let cancelled = false
    const t1 = setTimeout(() => { if (!cancelled) onSuccess(makeMockPosition(DEV_MOCK_LAT, DEV_MOCK_LNG)) }, 300)
    const t2 = setTimeout(() => { if (!cancelled) onSuccess(makeMockPosition(DEV_MOCK_LAT, DEV_MOCK_LNG)) }, 500)
    const t3 = setTimeout(() => { if (!cancelled) onSuccess(makeMockPosition(DEV_MOCK_LAT, DEV_MOCK_LNG)) }, 700)
    const watchId = t1
    _mockCancelMap[watchId] = () => { cancelled = true; clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
    return watchId
  },
  getCurrentPosition: (onSuccess, _onError, _opts) => {
    setTimeout(() => onSuccess(makeMockPosition(DEV_MOCK_LAT, DEV_MOCK_LNG)), 100)
  },
  clearWatch: (id) => {
    if (_mockCancelMap[id]) { _mockCancelMap[id](); delete _mockCancelMap[id] }
    else clearTimeout(id)
  },
} : null

const geo = DEV_GPS_ENABLED ? mockGeolocation : navigator.geolocation

if (import.meta.env.DEV) {
  DEV_GPS_ENABLED
    ? console.info(`[TableDetection] 🧪 DEV GPS MOCK enabled — ${DEV_MOCK_LAT}, ${DEV_MOCK_LNG}`)
    : console.info('[TableDetection] 💡 GPS mock not active. Add to frontend/.env.local:\n  VITE_DEV_GPS_LAT=27.70244\n  VITE_DEV_GPS_LNG=85.34660')
}

// ─── Session persistence ───────────────────────────────────────────────────────
const SESSION_KEYS = {
  data:    'kc_session_data',
  id:      'kc_session_id',
  table:   'kc_table_number',
  tableId: 'kc_table_id',
}

export const persistSession = (sessionData) => {
  try {
    localStorage.setItem(SESSION_KEYS.data,    JSON.stringify(sessionData))
    localStorage.setItem(SESSION_KEYS.id,      sessionData.sessionId   ?? '')
    localStorage.setItem(SESSION_KEYS.table,   sessionData.tableNumber ?? '')
    localStorage.setItem(SESSION_KEYS.tableId, sessionData.tableId     ?? '')
  } catch (e) {
    console.warn('[TableDetection] localStorage write failed:', e)
  }
}

export const clearPersistedSession = () => {
  Object.values(SESSION_KEYS).forEach(k => localStorage.removeItem(k))
}

/**
 * Redux thunk — called once from App.jsx on mount to rehydrate session after
 * page refresh or cross-route navigation.
 */
export const rehydratePersistedSession = () => (dispatch) => {
  try {
    const raw = localStorage.getItem(SESSION_KEYS.data)
    if (!raw) return
    const session = JSON.parse(raw)
    if (!session?.sessionId || !session?.tableNumber) { clearPersistedSession(); return }
    console.info(`[TableDetection] 🔄 Rehydrating session — Table: ${session.tableNumber}`)
    dispatch(setSession(session))
  } catch (e) {
    console.warn('[TableDetection] Session rehydration failed:', e)
    clearPersistedSession()
  }
}

// ─── Main hook ─────────────────────────────────────────────────────────────────
export const useTableDetection = () => {
  const [state, send] = useMachine(detectionMachine)
  const dispatch      = useDispatch()
  const navigate      = useNavigate()

  // FIX: read auth state so createSession can navigate correctly
  const isLoggedIn = useSelector(selectIsLoggedIn)
  // Store in ref so the navigate callback always has the latest value
  // without needing to be re-created (avoids stale closure in callbacks)
  const isLoggedInRef = useRef(isLoggedIn)
  useEffect(() => { isLoggedInRef.current = isLoggedIn }, [isLoggedIn])

  const watchId      = useRef(null)
  const readings     = useRef([])
  const gpsTimer     = useRef(null)
  const currentState = useRef('idle')
  const didFallback  = useRef(false)
  const isMounted    = useRef(true)
  const hasStarted   = useRef(false)

  useEffect(() => {
    isMounted.current  = true
    hasStarted.current = false
    return () => { isMounted.current = false }
  }, [])

  useEffect(() => {
    currentState.current = typeof state.value === 'string'
      ? state.value
      : Object.keys(state.value)[0]
  }, [state.value])

  // ── Haversine distance (metres) ─────────────────────────────────────────────
  const haversine = useCallback((lat1, lng1, lat2, lng2) => {
    const R  = 6371000
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lng2 - lng1) * Math.PI) / 180
    const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }, [])

  // ── Confidence score ────────────────────────────────────────────────────────
  const calculateConfidence = useCallback((coords) => {
    if (!coords || coords.length < 2) return 50
    const lats      = coords.map(c => c.latitude)
    const lngs      = coords.map(c => c.longitude)
    const avgLat    = lats.reduce((a, b) => a + b, 0) / lats.length
    const avgLng    = lngs.reduce((a, b) => a + b, 0) / lngs.length
    const maxSpread = Math.max(...coords.map(c => haversine(c.latitude, c.longitude, avgLat, avgLng)))
    const avgAcc    = coords.reduce((a, c) => a + (c.accuracy || 10), 0) / coords.length
    return Math.round((Math.max(0, 100 - maxSpread * 20) + Math.max(0, 100 - avgAcc * 2)) / 2)
  }, [haversine])

  // ── createSession ───────────────────────────────────────────────────────────
  const createSession = useCallback(async (payload) => {
    try {
      const endpoint = payload.method === 'gps' ? ENDPOINTS.TABLE.DETECT_GPS : ENDPOINTS.TABLE.DETECT_QR

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

      console.log('[Detection] ✅ Raw API response:', JSON.stringify(data))
      console.log('[Detection] session.tableNumber:', data?.session?.tableNumber)
      console.log('[Detection] table.tableNumber:',   data?.table?.tableNumber)

      if (!isMounted.current) return

      const now = new Date().toISOString()
      const sessionData = {
        ...data.session,
        tableNumber: data.session?.tableNumber ?? data.table?.tableNumber ?? null,
        openedAt:    data.session?.openedAt    ?? now,
        createdAt:   data.session?.createdAt   ?? now,
        status:      data.session?.status      ?? 'active',
      }

      console.log('[Detection] 📦 sessionData to dispatch:', JSON.stringify(sessionData))

      // 1. Persist to localStorage (survives navigate + store resets)
      persistSession(sessionData)

      // 2. Dispatch to Redux
      dispatch(setSession(sessionData))

      // 3. Notify XState machine
      send({
        type:      'SESSION_CREATED',
        table:     data.table ?? { tableNumber: sessionData.tableNumber, zone: sessionData.zone },
        sessionId: sessionData.sessionId,
      })

      // 4. FIX: navigate based on auth state.
      //    - Already logged in (refresh scenario) → go straight to /menu.
      //      The old `navigate('/login')` was sending logged-in users to
      //      GuestRoute which redirected them, causing the /login flash.
      //    - Not logged in (first visit) → go to /login to authenticate.
      if (isLoggedInRef.current) {
        navigate('/menu', { replace: true })
      } else {
        navigate('/login', { replace: true })
      }

    } catch (err) {
      if (!isMounted.current) return
      const msg = err.response?.data?.message || 'Table detection failed'
      console.error('[Detection] ❌ createSession error:', msg, err)
      dispatch(setSessionError(msg))
      send({ type: 'SESSION_ERROR', error: msg })
    }
  }, [dispatch, navigate, send])

  // ── GPS position handler ────────────────────────────────────────────────────
  const handlePosition = useCallback((position) => {
    const { latitude, longitude, accuracy } = position.coords
    console.log(`[TableDetection] 📍 GPS: ${latitude}, ${longitude} ±${Math.round(accuracy)}m`)

    readings.current.push({ latitude, longitude, accuracy, timestamp: Date.now() })
    if (readings.current.length > GPS_CONFIG.readingsCount) {
      readings.current = readings.current.slice(-GPS_CONFIG.readingsCount)
    }

    const enoughReadings = readings.current.length >= GPS_CONFIG.readingsCount
    const greatAccuracy  = accuracy <= 25 && readings.current.length >= 1

    if (enoughReadings || greatAccuracy) {
      clearTimeout(gpsTimer.current)
      if (watchId.current !== null) { geo.clearWatch(watchId.current); watchId.current = null }

      const score  = calculateConfidence(readings.current)
      const avgLat = readings.current.reduce((a, r) => a + r.latitude,  0) / readings.current.length
      const avgLng = readings.current.reduce((a, r) => a + r.longitude, 0) / readings.current.length

      console.log(`[TableDetection] 🎯 Confidence: ${score} (min: ${GPS_CONFIG.confidenceMin})`)

      if (score >= GPS_CONFIG.confidenceMin) {
        send({ type: 'GPS_HIGH_CONFIDENCE', coords: { latitude: avgLat, longitude: avgLng, accuracy }, confidenceScore: score })
        createSession({ method: 'gps', latitude: avgLat, longitude: avgLng, confidenceScore: score, accuracy })
      } else if (accuracy <= 50) {
        console.log('[TableDetection] 📍 Low confidence but accuracy ≤50m — accepting')
        send({ type: 'GPS_HIGH_CONFIDENCE', coords: { latitude, longitude, accuracy }, confidenceScore: score })
        createSession({ method: 'gps', latitude, longitude, confidenceScore: score, accuracy })
      } else {
        console.warn('[TableDetection] ⚠ Low confidence → QR fallback')
        send({ type: 'GPS_LOW_CONFIDENCE' })
      }
    }
  }, [calculateConfidence, createSession, send])

  // ── Cached position probe ───────────────────────────────────────────────────
  const tryCachedPosition = useCallback(() => {
    console.log('[TableDetection] 🗂 Probing cached position…')
    geo.getCurrentPosition(
      (position) => handlePosition(position),
      (err) => {
        console.error(`[TableDetection] ❌ Cached position failed (code ${err.code})`)
        const s = currentState.current
        if (s === 'requestingGPS' || s === 'collectingReadings') {
          if (err.code === 1) send({ type: 'GPS_DENIED' })
          else                send({ type: 'GPS_TIMEOUT' })
        }
      },
      { enableHighAccuracy: false, timeout: 5_000, maximumAge: 300_000 },
    )
  }, [handlePosition, send])

  // ── Low-accuracy fallback watch ─────────────────────────────────────────────
  const startLowAccuracyWatch = useCallback(() => {
    if (didFallback.current) { tryCachedPosition(); return }
    didFallback.current = true
    clearTimeout(gpsTimer.current)
    readings.current = []
    if (watchId.current !== null) { geo.clearWatch(watchId.current); watchId.current = null }

    gpsTimer.current = setTimeout(() => {
      if (watchId.current !== null) { geo.clearWatch(watchId.current); watchId.current = null }
      tryCachedPosition()
    }, GPS_CONFIG.timeoutMs)

    watchId.current = geo.watchPosition(
      handlePosition,
      (err) => {
        clearTimeout(gpsTimer.current)
        if (err.code === 1) send({ type: 'GPS_DENIED' })
        else                tryCachedPosition()
      },
      { enableHighAccuracy: false, timeout: Infinity, maximumAge: 30_000 },
    )
  }, [handlePosition, send, tryCachedPosition])

  // ── GPS error handler ───────────────────────────────────────────────────────
  const handleGpsError = useCallback((err) => {
    clearTimeout(gpsTimer.current)
    if (err.code === 1) { send({ type: 'GPS_DENIED' }); return }
    startLowAccuracyWatch()
  }, [send, startLowAccuracyWatch])

  // ── startGPS ────────────────────────────────────────────────────────────────
  const startGPS = useCallback(() => {
    if (hasStarted.current) return
    hasStarted.current = true
    if (watchId.current !== null) { geo.clearWatch(watchId.current); watchId.current = null }
    clearTimeout(gpsTimer.current)
    readings.current    = []
    didFallback.current = false
    dispatch(setDetecting())
    send({ type: 'START' })

    if (!geo) { send({ type: 'GPS_DENIED' }); return }

    gpsTimer.current = setTimeout(() => {
      if (watchId.current !== null) { geo.clearWatch(watchId.current); watchId.current = null }
      startLowAccuracyWatch()
    }, GPS_CONFIG.timeoutMs)

    watchId.current = geo.watchPosition(handlePosition, handleGpsError,
      { enableHighAccuracy: true, timeout: GPS_CONFIG.timeoutMs, maximumAge: 0 })
  }, [dispatch, send, handlePosition, handleGpsError, startLowAccuracyWatch])

  const onQrScanned = useCallback((token) => {
    send({ type: 'QR_SCANNED' })
    createSession({ method: 'qr', token })
  }, [send, createSession])

  const onManualEntry = useCallback((tableNumber) => {
    send({ type: 'MANUAL_ENTRY' })
    createSession({ method: 'manual', tableNumber })
  }, [send, createSession])

  const retry = useCallback(() => {
    readings.current    = []
    didFallback.current = false
    hasStarted.current  = false
    if (watchId.current !== null) { geo.clearWatch(watchId.current); watchId.current = null }
    clearTimeout(gpsTimer.current)
    send({ type: 'RETRY' })
  }, [send])

  // ── Cleanup ─────────────────────────────────────────────────────────────────
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