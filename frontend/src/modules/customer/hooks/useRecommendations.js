// src/modules/customer/hooks/useRecommendations.js
//
// FIXED: API returns { success, data: [...] } — not { recommendations: [...] }
// Each element: { item: {...menuItem}, score, weatherTag, isFavourite, isDiscovery }
// Weather endpoint returns flat: { condition, temp, city, ... }

import { useState, useEffect } from 'react'
import { useSelector }         from 'react-redux'
import { selectIsGuest }       from '@store/slices/authSlice'
import api                     from '@api/axios'
import { ENDPOINTS }           from '@api/endpoints'

const FALLBACK_COORDS = { lat: 27.7172, lng: 85.3240 }

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
  const [recommendations, setRecommendations] = useState([])
  const [weather, setWeather]                 = useState(null)
  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState(null)
  const isGuest = useSelector(selectIsGuest)

  useEffect(() => {
    if (!cafeId) return

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

        setWeather(weatherData)

        // ✅ API returns { success, data: [{item, score, weatherTag, ...}] }
        const recs = recData.data ?? recData.recommendations ?? []

        setRecommendations(
          recs
            .filter(r => r?.item)   // guard against malformed entries
            .map(r => ({
              ...r.item,
              score:       r.score,
              weatherTag:  r.weatherTag,
              isFavourite: r.isFavourite,
              isDiscovery: r.isDiscovery,
            }))
        )
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [cafeId, isGuest])

  return { recommendations, weather, loading, error }
}