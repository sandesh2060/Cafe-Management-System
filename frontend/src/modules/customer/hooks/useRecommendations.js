// src/modules/customer/hooks/useRecommendations.js
//
// axios interceptor returns response.data directly — no .data unwrap needed.
// /api/weather/current returns a FLAT object: { condition, temp, city, ... }
// /api/recommendations/* returns: { recommendations: [...] }
//
import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { selectIsGuest } from '@store/slices/authSlice'
import api from '@api/axios'
import { ENDPOINTS } from '@api/endpoints'

// Kathmandu city centre — last-resort fallback if GPS is denied
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

        // Both calls go through api (axios interceptor unwraps response.data)
        // weather endpoint returns flat: { condition, temp, city, ... }
        // rec endpoint returns: { recommendations: [...] }
        const [weatherData, recData] = await Promise.all([
          api.get(`${ENDPOINTS.WEATHER.CURRENT}?lat=${coords.lat}&lng=${coords.lng}`),
          api.get(`${isGuest ? ENDPOINTS.RECOMMENDATIONS.GUEST : ENDPOINTS.RECOMMENDATIONS.PERSONAL}?cafeId=${cafeId}`),
        ])

        // weatherData IS the weather object — flat, already unwrapped
        // Guard: if _fallback is true, temp will be null — WelcomeCard handles null gracefully
        setWeather(weatherData)

        setRecommendations(
          (recData.recommendations ?? []).map((r) => ({
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