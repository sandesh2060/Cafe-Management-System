// src/modules/customer/hooks/useWeather.js
//
// FIX: load wrapped in useCallback with [] deps for a stable reference.
// This prevents setInterval from capturing a stale closure on re-renders
// and makes the exposed `refresh` function safe to call from event handlers.

import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchWeather } from '@shared/services/weather.service'

const REFRESH_INTERVAL_MS = 10 * 60 * 1000  // 10 minutes — matches backend cache TTL

export const useWeather = () => {
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const intervalRef           = useRef(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchWeather()
      if (data) {
        setWeather(data)
      } else {
        setError('Could not load weather')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])  // stable — fetchWeather has no deps

  useEffect(() => {
    load()
    intervalRef.current = setInterval(load, REFRESH_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [load])

  return { weather, loading, error, refresh: load }
}