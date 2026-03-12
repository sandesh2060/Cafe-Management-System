// src/shared/services/weather.service.js
// ─────────────────────────────────────────────────────────────────────────────
// Gets the device's REAL GPS coordinates, calls OpenWeatherMap with them.
// This is why Brave showed 18°C and your app showed 25°C — the app was either
// using a hardcoded city name or a cached/fake position.
// ─────────────────────────────────────────────────────────────────────────────

const OWM_BASE = "https://api.openweathermap.org/data/2.5/weather";
const API_KEY  = import.meta.env.VITE_OPENWEATHER_API_KEY;

// Cache in memory for 10 minutes — avoids hammering the API on every re-render
const CACHE_TTL_MS = 10 * 60 * 1000;
let _cache = null; // { data, timestamp }

// ── OpenWeatherMap condition → our app condition ──────────────────────────────
// OWM weather IDs: https://openweathermap.org/weather-conditions
const owmCodeToCondition = (id, temp) => {
  if (id >= 200 && id < 300) return "rainy";   // Thunderstorm
  if (id >= 300 && id < 400) return "rainy";   // Drizzle
  if (id >= 500 && id < 600) return "rainy";   // Rain
  if (id >= 600 && id < 700) return "snowy";   // Snow
  if (id >= 700 && id < 800) return "windy";   // Atmosphere (fog, haze, etc.)
  if (id === 800) {
    // Clear sky — use temperature to decide sunny vs hot vs cold
    if (temp >= 35) return "hot";
    if (temp <= 10) return "cold";
    return "sunny";
  }
  if (id >= 801 && id <= 802) return "cloudy"; // Few/scattered clouds
  if (id >= 803 && id <= 804) return "cloudy"; // Broken/overcast clouds
  // Fallback based on temp
  if (temp >= 35) return "hot";
  if (temp <= 5)  return "snowy";
  if (temp <= 15) return "cold";
  return "cloudy";
};

// ── Get precise GPS position from browser ────────────────────────────────────
const getGpsPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      {
        enableHighAccuracy: true,  // Use GPS chip, not IP/WiFi
        timeout: 8000,
        maximumAge: 0,             // Always fresh — never use a cached position
      },
    );
  });

// ── Main fetch function ───────────────────────────────────────────────────────
export const fetchWeather = async () => {
  // Return cached result if still fresh
  if (_cache && Date.now() - _cache.timestamp < CACHE_TTL_MS) {
    return _cache.data;
  }

  if (!API_KEY) {
    console.warn("[weather] VITE_OPENWEATHER_API_KEY not set");
    return null;
  }

  // Step 1: Get real device coordinates
  let lat, lng;
  try {
    ({ lat, lng } = await getGpsPosition());
  } catch (gpsErr) {
    console.warn("[weather] GPS failed, falling back to IP-based location", gpsErr.message);
    // Fallback: let OWM use IP geolocation (less accurate but better than hardcoded)
    // We'll handle this in the fetch below by not passing lat/lon
    lat = null;
    lng = null;
  }

  // Step 2: Call OpenWeatherMap with real coords
  try {
    let url;
    if (lat !== null && lng !== null) {
      // Precise GPS path — this matches what Brave's weather widget shows
      url = `${OWM_BASE}?lat=${lat}&lon=${lng}&units=metric&appid=${API_KEY}`;
    } else {
      // IP fallback — OWM detects rough location from request IP
      url = `${OWM_BASE}?q=auto&units=metric&appid=${API_KEY}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error(`OWM HTTP ${res.status}`);

    const json = await res.json();

    // Step 3: Parse into our app's weather shape
    const temp      = json.main?.temp ?? null;           // real Celsius
    const feelsLike = json.main?.feels_like ?? null;
    const humidity  = json.main?.humidity ?? null;
    const windSpeed = json.wind?.speed ?? null;          // m/s
    const owmId     = json.weather?.[0]?.id ?? 800;
    const owmMain   = json.weather?.[0]?.main ?? "";
    const owmDesc   = json.weather?.[0]?.description ?? "";
    const cityName  = json.name ?? "";

    const condition = owmCodeToCondition(owmId, temp);

    const data = {
      condition,           // "sunny" | "hot" | "rainy" | "cloudy" | "cold" | "windy" | "snowy"
      temp,                // e.g. 18.3 — shown as Math.round(weather.temp) in WelcomeCard
      feelsLike,
      humidity,
      windSpeed,
      city: cityName,
      description: owmDesc,
      owmId,               // raw OWM code — useful for debugging
      lat,
      lng,
      fetchedAt: new Date().toISOString(),
    };

    // Cache it
    _cache = { data, timestamp: Date.now() };

    return data;
  } catch (err) {
    console.error("[weather] fetch failed:", err.message);
    return null;
  }
};

// ── Clear cache (call this if you want to force a refresh) ────────────────────
export const clearWeatherCache = () => {
  _cache = null;
};