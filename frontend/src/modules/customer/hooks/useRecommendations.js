// src/modules/customer/hooks/useRecommendations.js
import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { selectIsGuest } from '@store/slices/authSlice'
import api from '@api/axios'
import { ENDPOINTS } from '@api/endpoints'

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
        // 1. Get user's current GPS for weather
        const coords = await new Promise((resolve) => {
          if (!navigator.geolocation) return resolve(null)
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            ()    => resolve(null),
            { timeout: 3000 }
          )
        })

        // 2. Fetch weather + recommendations in parallel
        const weatherPromise = coords
          ? api.get(`${ENDPOINTS.WEATHER.CURRENT}?lat=${coords.lat}&lng=${coords.lng}`)
          : Promise.resolve({ condition: 'sunny', temp: 25 })

        const recEndpoint = isGuest ? ENDPOINTS.RECOMMENDATIONS.GUEST : ENDPOINTS.RECOMMENDATIONS.PERSONAL
        const recParams   = `?cafeId=${cafeId}`

        const [weatherData, recData] = await Promise.all([weatherPromise, api.get(recEndpoint + recParams)])

        setWeather(weatherData)
        setRecommendations(
          recData.recommendations.map((r) => ({
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