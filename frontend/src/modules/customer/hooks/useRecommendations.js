// src/modules/customer/hooks/useRecommendations.js
//
// ✅ Module-level cache — recommendations + weather survive back navigation.
//    Cache TTL: 5 minutes. On back nav, returns instantly (loading: false).
//    On first visit or after TTL: fetches normally.

import { useState, useEffect, useRef } from 'react'
import { useSelector }                  from 'react-redux'
import { selectIsGuest }                from '@store/slices/authSlice'
import api                              from '@api/axios'
import { ENDPOINTS }                    from '@api/endpoints'

const FALLBACK_COORDS = { lat: 27.7172, lng: 85.3240 }
const TTL_MS          = 5 * 60 * 1000  // 5 minutes

// Module-level cache — persists across component unmount/remount (back nav)
const cache = {
  data:      null,   // { recommendations, weather }
  fetchedAt: null,   // timestamp
  cafeId:    null,
  isGuest:   null,
}

const isCacheValid = (cafeId, isGuest) =>
  cache.data !== null &&
  cache.cafeId === cafeId &&
  cache.isGuest === isGuest &&
  Date.now() - cache.fetchedAt < TTL_MS

const getGpsCoords = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(FALLBACK_COORDS)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()    => resolve(FALLBACK_COORDS),
      { timeout: 4000, maximumAge: 120000, enableHighAccuracy: false },
    )
  })

export const useRecommendations = (cafeId) => {
  const isGuest = useSelector(selectIsGuest)

  // If cache is valid, start with data immediately (loading: false)
  const cached  = isCacheValid(cafeId, isGuest)
  const [recommendations, setRecommendations] = useState(() => cached ? cache.data.recommendations : [])
  const [weather,          setWeather]         = useState(() => cached ? cache.data.weather         : null)
  const [loading,          setLoading]         = useState(!cached)
  const [error,            setError]           = useState(null)

  useEffect(() => {
    if (!cafeId) return
    // Cache still valid — nothing to do, already set in useState initializer
    if (isCacheValid(cafeId, isGuest)) return

    let cancelled = false

    const fetchAll = async () => {
      setLoading(true)
      setError(null)

      try {
        const coords = await getGpsCoords()

        const [weatherData, recData] = await Promise.all([
          api.get(`${ENDPOINTS.WEATHER.CURRENT}?lat=${coords.lat}&lng=${coords.lng}`),
          api.get(
            `${isGuest ? ENDPOINTS.RECOMMENDATIONS.GUEST : ENDPOINTS.RECOMMENDATIONS.PERSONAL}` +
            `?cafeId=${cafeId}&lat=${coords.lat}&lng=${coords.lng}`
          ),
        ])

        if (cancelled) return

        const recs = recData.data ?? recData.recommendations ?? []
        const mappedRecs = recs
          .filter(r => r?.item)
          .map(r => ({
            ...r.item,
            score:       r.score,
            weatherTag:  r.weatherTag,
            isFavourite: r.isFavourite,
            isDiscovery: r.isDiscovery,
          }))

        // Store in module-level cache
        cache.data      = { recommendations: mappedRecs, weather: weatherData }
        cache.fetchedAt = Date.now()
        cache.cafeId    = cafeId
        cache.isGuest   = isGuest

        setRecommendations(mappedRecs)
        setWeather(weatherData)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAll()
    return () => { cancelled = true }
  }, [cafeId, isGuest])

  return { recommendations, weather, loading, error }
}