// src/shared/services/weather.service.js
// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY:  OpenWeatherMap One Call API 3.0  (data/3.0/onecall)
//   → current + minutely(1hr) + hourly(48hr) + daily(8d) + alerts + UV + dew
//   → 1,000 free calls/day — requires "One Call by Call" subscription
//   → enable with VITE_OWM_ONECALL=true in .env
//
// FALLBACK: /data/2.5/weather  (free tier, always works)
//   → current only, fewer fields
//
// Both paths return the SAME shape so nothing else in the app changes.
// ─────────────────────────────────────────────────────────────────────────────

const OWM_ONECALL = "https://api.openweathermap.org/data/3.0/onecall";
const OWM_CURRENT = "https://api.openweathermap.org/data/2.5/weather";
const API_KEY     = import.meta.env.VITE_OPENWEATHER_API_KEY;

// Set VITE_OWM_ONECALL=true in .env once subscribed to One Call 3.0
const USE_ONECALL = import.meta.env.VITE_OWM_ONECALL === "true";

// 5-minute cache keyed by lat/lng bucket (~1.1km grid) — moving location busts it
const CACHE_TTL_MS = 5 * 60 * 1000;
let _cache = null; // { data, timestamp, key }

function locationKey(lat, lng) {
  if (lat == null || lng == null) return "fallback";
  return `${lat.toFixed(2)}_${lng.toFixed(2)}`;
}

// ── OWM condition ID → app condition ─────────────────────────────────────────
const owmCodeToCondition = (id, temp) => {
  if (id >= 200 && id < 300) return "rainy";   // Thunderstorm
  if (id >= 300 && id < 400) return "rainy";   // Drizzle
  if (id >= 500 && id < 600) return "rainy";   // Rain (all subtypes)
  if (id >= 600 && id < 700) return "snowy";   // Snow / sleet / freezing rain
  if (id === 701) return "cloudy";   // Mist
  if (id === 711) return "cloudy";   // Smoke
  if (id === 721) return "cloudy";   // Haze (very common in Kathmandu)
  if (id === 731) return "windy";    // Dust whirls
  if (id === 741) return "cloudy";   // Fog
  if (id === 751) return "windy";    // Sand
  if (id === 761) return "windy";    // Dust
  if (id === 762) return "cloudy";   // Volcanic ash
  if (id === 771) return "windy";    // Squalls
  if (id === 781) return "rainy";    // Tornado
  if (id === 800) {
    if (temp >= 35) return "hot";
    if (temp <= 10) return "cold";
    return "sunny";
  }
  if (id === 801) return "sunny";    // 11-25% cloud — still a sunny sky
  if (id === 802) return "cloudy";   // 25-50%
  if (id === 803) return "cloudy";   // 51-84%
  if (id === 804) return "cloudy";   // 85-100% overcast
  if (temp >= 35) return "hot";
  if (temp <= 5)  return "snowy";
  if (temp <= 15) return "cold";
  return "cloudy";
};

// ── GPS ───────────────────────────────────────────────────────────────────────
const getGpsPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("Geolocation not supported")); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  });

// ── One Call 3.0 parser ───────────────────────────────────────────────────────
function parseOneCall(json, lat, lng) {
  const c    = json.current ?? {};
  const id   = c.weather?.[0]?.id ?? 800;
  const temp = c.temp ?? null;

  // Minutely precipitation — next 60 minutes (mm/min per minute slot)
  const minutely = (json.minutely ?? []).map(m => ({
    dt:            m.dt,
    precipitation: m.precipitation,
  }));

  // Hourly — next 48 hours, rich fields
  const hourly = (json.hourly ?? []).slice(0, 48).map(h => ({
    dt:          h.dt,
    temp:        h.temp,
    feelsLike:   h.feels_like,
    humidity:    h.humidity,
    dewPoint:    h.dew_point,
    uvi:         h.uvi,
    clouds:      h.clouds,
    visibility:  h.visibility,
    windSpeed:   h.wind_speed,
    windDeg:     h.wind_deg,
    windGust:    h.wind_gust,
    pop:         h.pop,           // probability of precipitation 0–1
    rain:        h.rain?.["1h"] ?? 0,
    snow:        h.snow?.["1h"] ?? 0,
    condition:   owmCodeToCondition(h.weather?.[0]?.id ?? 800, h.temp),
    description: h.weather?.[0]?.description ?? "",
    icon:        h.weather?.[0]?.icon ?? "",
  }));

  // Daily — next 8 days
  const daily = (json.daily ?? []).map(d => ({
    dt:          d.dt,
    sunrise:     d.sunrise,
    sunset:      d.sunset,
    moonrise:    d.moonrise,
    moonset:     d.moonset,
    moonPhase:   d.moon_phase,    // 0=new, 0.25=first qtr, 0.5=full, 0.75=last qtr
    summary:     d.summary ?? "", // AI human-readable summary (3.0 only)
    tempMorn:    d.temp?.morn,
    tempDay:     d.temp?.day,
    tempEve:     d.temp?.eve,
    tempNight:   d.temp?.night,
    tempMin:     d.temp?.min,
    tempMax:     d.temp?.max,
    feelsDay:    d.feels_like?.day,
    feelsNight:  d.feels_like?.night,
    humidity:    d.humidity,
    dewPoint:    d.dew_point,
    pressure:    d.pressure,
    windSpeed:   d.wind_speed,
    windDeg:     d.wind_deg,
    windGust:    d.wind_gust,
    clouds:      d.clouds,
    uvi:         d.uvi,
    pop:         d.pop,
    rain:        d.rain  ?? 0,
    snow:        d.snow  ?? 0,
    condition:   owmCodeToCondition(d.weather?.[0]?.id ?? 800, d.temp?.day),
    description: d.weather?.[0]?.description ?? "",
    icon:        d.weather?.[0]?.icon ?? "",
  }));

  // Government weather alerts (NOAA, national services, etc.)
  const alerts = (json.alerts ?? []).map(a => ({
    senderName:  a.sender_name,
    event:       a.event,
    start:       a.start,
    end:         a.end,
    description: a.description,
    tags:        a.tags ?? [],
  }));

  return {
    // ── Current (same shape as old /weather response) ──────────────────────
    condition:      owmCodeToCondition(id, temp),
    temp,
    feelsLike:      c.feels_like   ?? null,
    humidity:       c.humidity     ?? null,
    pressure:       c.pressure     ?? null,
    windSpeed:      c.wind_speed   ?? null,
    windDeg:        c.wind_deg     ?? null,
    windGust:       c.wind_gust    ?? null,
    visibility:     c.visibility   ?? null,
    cloudPct:       c.clouds       ?? null,
    description:    c.weather?.[0]?.description ?? "",
    owmId:          id,
    owmMain:        c.weather?.[0]?.main ?? "",
    city:           "",   // One Call doesn't return city name
    lat,
    lng,
    sunrise:        c.sunrise      ?? null,
    sunset:         c.sunset       ?? null,

    // ── One Call 3.0 extras ─────────────────────────────────────────────────
    dewPoint:       c.dew_point    ?? null,   // °C dew point
    uvi:            c.uvi          ?? null,   // UV index 0–11+
    rain1h:         c.rain?.["1h"] ?? 0,      // mm rain last hour
    snow1h:         c.snow?.["1h"] ?? 0,      // mm snow last hour

    // ── Forecast ────────────────────────────────────────────────────────────
    minutely,      // next 60 min precipitation
    hourly,        // next 48h full data
    daily,         // next 8 days
    alerts,        // government weather warnings

    // ── Meta ────────────────────────────────────────────────────────────────
    timezone:       json.timezone ?? "",
    timezoneOffset: json.timezone_offset ?? null,
    source:         "onecall3",
    fetchedAt:      new Date().toISOString(),
  };
}

// ── /weather 2.5 parser (fallback — same output shape) ───────────────────────
function parseCurrent(json, lat, lng) {
  const temp = json.main?.temp ?? null;
  const id   = json.weather?.[0]?.id ?? 800;
  return {
    condition:      owmCodeToCondition(id, temp),
    temp,
    feelsLike:      json.main?.feels_like  ?? null,
    humidity:       json.main?.humidity    ?? null,
    pressure:       json.main?.pressure    ?? null,
    windSpeed:      json.wind?.speed       ?? null,
    windDeg:        json.wind?.deg         ?? null,
    windGust:       json.wind?.gust        ?? null,
    visibility:     json.visibility        ?? null,
    cloudPct:       json.clouds?.all       ?? null,
    description:    json.weather?.[0]?.description ?? "",
    owmId:          id,
    owmMain:        json.weather?.[0]?.main ?? "",
    city:           json.name ?? "",
    lat:            lat ?? json.coord?.lat ?? null,
    lng:            lng ?? json.coord?.lon ?? null,
    sunrise:        json.sys?.sunrise      ?? null,
    sunset:         json.sys?.sunset       ?? null,
    dewPoint:       null,
    uvi:            null,
    rain1h:         json.rain?.["1h"]      ?? 0,
    snow1h:         json.snow?.["1h"]      ?? 0,
    minutely:       [],
    hourly:         [],
    daily:          [],
    alerts:         [],
    timezone:       "",
    timezoneOffset: json.timezone ?? null,
    source:         "current25",
    fetchedAt:      new Date().toISOString(),
  };
}

// ── Main fetch ────────────────────────────────────────────────────────────────
export const fetchWeather = async () => {
  if (!API_KEY) {
    console.warn("[weather] VITE_OPENWEATHER_API_KEY not set");
    return null;
  }

  let lat = null, lng = null;
  try {
    ({ lat, lng } = await getGpsPosition());
  } catch (err) {
    console.warn("[weather] GPS failed:", err.message);
  }

  const key    = locationKey(lat, lng);
  const useLat = lat ?? 27.7172;
  const useLng = lng ?? 85.3240;

  // Return fresh cache if location matches and TTL not expired
  if (_cache && _cache.key === key && Date.now() - _cache.timestamp < CACHE_TTL_MS) {
    return _cache.data;
  }

  // ── Try One Call 3.0 ───────────────────────────────────────────────────────
  if (USE_ONECALL) {
    try {
      const url = `${OWM_ONECALL}?lat=${useLat}&lon=${useLng}&units=metric&appid=${API_KEY}`;
      const res = await fetch(url);

      if (res.ok) {
        const json = await res.json();
        const data = parseOneCall(json, useLat, useLng);
        _cache = { data, timestamp: Date.now(), key };
        console.log(
          `[weather:3.0] ${data.owmMain}(${data.owmId}) → "${data.condition}", ${Math.round(data.temp)}°C`,
          `| UV:${data.uvi} dew:${data.dewPoint}°C clouds:${data.cloudPct}%`,
          data.alerts.length ? `| ⚠ ${data.alerts.length} alert(s)` : ""
        );
        return data;
      }

      // 401/403 = not subscribed — silently fall through to /weather
      if (res.status !== 401 && res.status !== 403) {
        console.warn(`[weather] One Call 3.0 error ${res.status}`);
      } else {
        console.warn("[weather] One Call 3.0 not subscribed — using /weather fallback");
      }
    } catch (err) {
      console.warn("[weather] One Call 3.0 request failed:", err.message);
    }
  }

  // ── Fallback: /data/2.5/weather ────────────────────────────────────────────
  try {
    const url = `${OWM_CURRENT}?lat=${useLat}&lon=${useLng}&units=metric&appid=${API_KEY}`;
    const res = await fetch(url);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OWM /weather HTTP ${res.status}: ${body.slice(0, 120)}`);
    }

    const json = await res.json();
    const data = parseCurrent(json, useLat, useLng);
    _cache = { data, timestamp: Date.now(), key };
    console.log(
      `[weather:2.5] ${data.city} — ${data.owmMain}(${data.owmId}) → "${data.condition}", ${Math.round(data.temp)}°C`,
      `| clouds:${data.cloudPct}% wind:${data.windSpeed}m/s`
    );
    return data;

  } catch (err) {
    console.error("[weather] /weather failed:", err.message);
    if (_cache) {
      console.warn("[weather] returning stale cache as last resort");
      return _cache.data;
    }
    return null;
  }
};

// ── Cache control ─────────────────────────────────────────────────────────────
export const clearWeatherCache  = () => { _cache = null; };
export const forceRefreshWeather = () => { _cache = null; return fetchWeather(); };

// ── Utility helpers for components ───────────────────────────────────────────

/** Is it actually raining right now? Uses minutely data if available */
export const isRainingNow = (weather) => {
  if (!weather) return false;
  if (weather.rain1h > 0) return true;
  if (weather.minutely?.length > 0) return weather.minutely[0].precipitation > 0;
  return weather.condition === "rainy";
};

/** Highest precipitation probability in the next N hours (0–1) */
export const precipProbNextHours = (weather, n = 3) => {
  if (!weather?.hourly?.length) return null;
  return Math.max(...weather.hourly.slice(0, n).map(h => h.pop ?? 0));
};

/** Today's high/low from daily forecast, or null if not available */
export const getTodayHighLow = (weather) => {
  if (weather?.daily?.[0]) {
    return { high: weather.daily[0].tempMax, low: weather.daily[0].tempMin };
  }
  return { high: null, low: null };
};

/** Human-readable UV index label */
export const uviLabel = (uvi) => {
  if (uvi == null) return null;
  if (uvi <= 2)  return "Low";
  if (uvi <= 5)  return "Moderate";
  if (uvi <= 7)  return "High";
  if (uvi <= 10) return "Very High";
  return "Extreme";
};