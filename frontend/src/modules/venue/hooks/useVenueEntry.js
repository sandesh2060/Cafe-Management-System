// frontend/src/modules/venue/hooks/useVenueEntry.js
//
// ─── NEW FILE ─────────────────────────────────────────────────────────────────
// State machine hook that drives the entire venue entry flow:
//   init → checking_link → requesting_gps → checking_geofence →
//   inside_venue | outside_venue → done
//
// Used by VenueEntryPage.jsx as the single orchestrator.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef, useEffect } from 'react'
import { useDispatch, useSelector }                 from 'react-redux'
import { useParams, useSearchParams }               from 'react-router-dom'
import { setVenue, selectHasVenue }                 from '@store/slices/venueSlice'
import { checkGeofence, resolveSlug }               from '../services/venueDiscovery.service'

// ── Flow states ───────────────────────────────────────────────────────────────
// init            — starting point
// checking_link   — parsing URL for direct link (/:slug or /:slug/table/:num)
// link_resolved   — direct link found a cafe, proceed to table detection or menu
// requesting_gps  — asking browser for GPS permission + coordinates
// gps_denied      — user denied or GPS unavailable → go to cafe access page
// checking_geofence — GPS obtained, checking if inside a registered venue
// inside_venue    — inside a venue → show table detection (existing flow)
// outside_venue   — outside all venues → show cafe access page
// cafe_selected   — user picked a cafe from access page, confirmed "not inside"
// done            — venue resolved, session locked, ready for login → menu
// error           — something went wrong

export const VENUE_STATES = {
  INIT:              'init',
  CHECKING_LINK:     'checking_link',
  LINK_RESOLVED:     'link_resolved',
  REQUESTING_GPS:    'requesting_gps',
  GPS_DENIED:        'gps_denied',
  CHECKING_GEOFENCE: 'checking_geofence',
  INSIDE_VENUE:      'inside_venue',
  OUTSIDE_VENUE:     'outside_venue',
  CAFE_SELECTED:     'cafe_selected',
  DONE:              'done',
  ERROR:             'error',
}

const S = VENUE_STATES

export const useVenueEntry = () => {
  const dispatch     = useDispatch()
  const hasVenue     = useSelector(selectHasVenue)
  const params       = useParams()
  const [searchParams] = useSearchParams()

  const [state, setState]         = useState(S.INIT)
  const [gpsCoords, setGpsCoords] = useState(null)     // { lat, lng }
  const [insideCafe, setInsideCafe] = useState(null)    // cafe object if inside
  const [directLinkCafe, setDirectLinkCafe] = useState(null)
  const [directLinkTable, setDirectLinkTable] = useState(null)
  const [error, setError]         = useState(null)

  const isMounted = useRef(true)
  const gpsWatchId = useRef(null)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      if (gpsWatchId.current !== null) {
        navigator.geolocation?.clearWatch(gpsWatchId.current)
      }
    }
  }, [])

  // ── Step 1: Check for direct link ──────────────────────────────────────────
  const checkDirectLink = useCallback(async () => {
    setState(S.CHECKING_LINK)

    // Check URL params: /:cafeSlug or /:cafeSlug/table/:tableNum
    const slug     = params.cafeSlug || searchParams.get('cafe')
    const tableNum = params.tableNum || searchParams.get('table')

    if (!slug) {
      // No direct link — proceed to GPS
      if (isMounted.current) setState(S.REQUESTING_GPS)
      return
    }

    try {
      const result = await resolveSlug(slug)
      if (!isMounted.current) return

      if (result?.cafe) {
        setDirectLinkCafe(result.cafe)
        setDirectLinkTable(tableNum || null)

        // Set venue immediately — direct link = trusted
        dispatch(setVenue({
          ...result.cafe,
          cafeId: result.cafe._id,
          mode:   tableNum ? 'dine-in' : null, // if table specified, assume dine-in
        }))

        setState(S.LINK_RESOLVED)
      } else {
        // Slug not found — fall through to GPS
        setState(S.REQUESTING_GPS)
      }
    } catch {
      // Network error or slug not found — fall through to GPS
      if (isMounted.current) setState(S.REQUESTING_GPS)
    }
  }, [params, searchParams, dispatch])

  // ── Step 2: Request GPS ────────────────────────────────────────────────────
  const requestGps = useCallback(() => {
    setState(S.REQUESTING_GPS)

    if (!navigator.geolocation) {
      // No GPS API available
      if (isMounted.current) setState(S.GPS_DENIED)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isMounted.current) return
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }
        setGpsCoords(coords)
        setState(S.CHECKING_GEOFENCE)
      },
      (err) => {
        if (!isMounted.current) return
        console.info('[VenueEntry] GPS error:', err.code, err.message)
        // GPS denied or timeout → outside venue flow
        setState(S.GPS_DENIED)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // accept cached position up to 1min old
      }
    )
  }, [])

  // ── Step 3: Check geofence ─────────────────────────────────────────────────
  const checkGeofenceNow = useCallback(async () => {
    if (!gpsCoords) {
      setState(S.OUTSIDE_VENUE)
      return
    }

    setState(S.CHECKING_GEOFENCE)

    try {
      const result = await checkGeofence(gpsCoords.lat, gpsCoords.lng)
      if (!isMounted.current) return

      if (result?.inside && result?.cafe) {
        setInsideCafe(result.cafe)

        // Set venue in Redux — dine-in mode
        dispatch(setVenue({
          ...result.cafe,
          cafeId: result.cafe._id,
          mode: 'dine-in',
          distanceMeters: result.distanceMeters,
        }))

        setState(S.INSIDE_VENUE)
      } else {
        setState(S.OUTSIDE_VENUE)
      }
    } catch (err) {
      if (!isMounted.current) return
      console.error('[VenueEntry] Geofence check failed:', err)
      // On error, assume outside — let user pick manually
      setState(S.OUTSIDE_VENUE)
    }
  }, [gpsCoords, dispatch])

  // ── Auto-advance: checking_geofence → run the check ───────────────────────
  useEffect(() => {
    if (state === S.CHECKING_GEOFENCE && gpsCoords) {
      checkGeofenceNow()
    }
  }, [state, gpsCoords, checkGeofenceNow])

  // ── Select cafe from access page (outside venue) ───────────────────────────
  const selectCafe = useCallback((cafe, mode = 'remote') => {
    dispatch(setVenue({
      ...cafe,
      cafeId: cafe._id || cafe.cafeId,
      mode,
    }))
    setState(S.CAFE_SELECTED)
  }, [dispatch])

  // ── Confirm "not inside" → proceed ─────────────────────────────────────────
  const confirmRemote = useCallback(() => {
    setState(S.DONE)
  }, [])

  // ── Go back to cafe access from confirmation ──────────────────────────────
  const goBackToAccess = useCallback(() => {
    setState(S.OUTSIDE_VENUE)
  }, [])

  // ── Retry the whole flow ───────────────────────────────────────────────────
  const retry = useCallback(() => {
    setGpsCoords(null)
    setInsideCafe(null)
    setDirectLinkCafe(null)
    setDirectLinkTable(null)
    setError(null)
    setState(S.INIT)
  }, [])

  // ── Start the flow ─────────────────────────────────────────────────────────
  const start = useCallback(() => {
    checkDirectLink()
  }, [checkDirectLink])

  return {
    state,
    gpsCoords,
    insideCafe,
    directLinkCafe,
    directLinkTable,
    error,

    // Actions
    start,
    requestGps,
    selectCafe,
    confirmRemote,
    goBackToAccess,
    retry,

    // Convenience booleans
    isInit:          state === S.INIT,
    isCheckingLink:  state === S.CHECKING_LINK,
    isLinkResolved:  state === S.LINK_RESOLVED,
    isRequestingGps: state === S.REQUESTING_GPS,
    isGpsDenied:     state === S.GPS_DENIED,
    isCheckingFence: state === S.CHECKING_GEOFENCE,
    isInsideVenue:   state === S.INSIDE_VENUE,
    isOutsideVenue:  state === S.OUTSIDE_VENUE || state === S.GPS_DENIED,
    isCafeSelected:  state === S.CAFE_SELECTED,
    isDone:          state === S.DONE,
    isError:         state === S.ERROR,
    isLoading:       [S.CHECKING_LINK, S.REQUESTING_GPS, S.CHECKING_GEOFENCE].includes(state),
  }
}