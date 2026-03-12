// src/modules/customer/hooks/useWeather.js
// ─────────────────────────────────────────────────────────────────────────────
// Drop-in replacement for whatever was providing fake weather data before.
// Returns { weather, loading, error } — pass `weather` directly to WelcomeCard
// and useRecommendations.
//
// Usage:
//   const { weather, loading } = useWeather();
//   <WelcomeCard weather={weather} />
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { fetchWeather } from "@shared/services/weather.service";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // Re-fetch every 10 min (matches cache TTL)

export const useWeather = () => {
  const [weather, setWeather]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const intervalRef             = useRef(null);

  const load = async () => {
    try {
      setError(null);
      const data = await fetchWeather();
      if (data) {
        setWeather(data);
      } else {
        setError("Could not load weather");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // Refresh every 10 minutes so temp stays current
    intervalRef.current = setInterval(load, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { weather, loading, error, refresh: load };
};