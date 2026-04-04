// frontend/src/modules/venue/services/venueDiscovery.service.js
//
// ─── NEW FILE ─────────────────────────────────────────────────────────────────
// API calls for the cafe discovery / venue entry flow.
// Used by useVenueEntry hook and CafeAccessPage.
// ─────────────────────────────────────────────────────────────────────────────

import api from '@api/axios'

const BASE = '/cafes'

/**
 * Check if GPS coords are inside any registered venue's geofence.
 * @returns {{ inside: boolean, cafe?: Object, distanceMeters?: number }}
 */
export const checkGeofence = async (latitude, longitude) => {
  const res = await api.get(`${BASE}/geofence-check`, {
    params: { lat: latitude, lng: longitude },
  })
  return res?.data ?? res
}

/**
 * Resolve a cafe from its URL slug.
 * Used by direct link flow: /kausichiya → cafe data
 * @returns {{ cafe: Object }}
 */
export const resolveSlug = async (slug) => {
  const res = await api.get(`${BASE}/slug/${slug}`)
  return res?.data ?? res
}

/**
 * Search cafes by name/slug text query.
 * @returns {{ cafes: Array }}
 */
export const searchCafes = async (query) => {
  if (!query || query.trim().length < 2) return { cafes: [] }
  const res = await api.get(`${BASE}/search`, {
    params: { q: query.trim() },
  })
  return res?.data ?? res
}

/**
 * Get nearby cafes sorted by distance.
 * @returns {{ cafes: Array }}
 */
export const getNearbyCafes = async (latitude, longitude, maxKm = 10) => {
  const res = await api.get(`${BASE}/nearby`, {
    params: { lat: latitude, lng: longitude, maxKm },
  })
  return res?.data ?? res
}

/**
 * Look up a cafe by venue code (slug).
 * @returns {{ cafe: Object }}
 */
export const lookupByCode = async (code) => {
  const res = await api.get(`${BASE}/code/${code.trim().toLowerCase()}`)
  return res?.data ?? res
}

/**
 * Get user's favorite cafes. Requires auth token.
 * Returns empty array if not logged in.
 * @returns {{ cafes: Array }}
 */
export const getFavorites = async () => {
  try {
    const res = await api.get(`${BASE}/favorites`)
    return res?.data ?? res
  } catch {
    return { cafes: [] }
  }
}

/**
 * Get user's recently visited cafes (from order history).
 * Returns empty array if not logged in.
 * @returns {{ cafes: Array }}
 */
export const getRecent = async () => {
  try {
    const res = await api.get(`${BASE}/recent`)
    return res?.data ?? res
  } catch {
    return { cafes: [] }
  }
}

/**
 * Toggle favorite status for a cafe. Requires auth.
 * @returns {{ isFavorite: boolean }}
 */
export const toggleFavorite = async (cafeId) => {
  const res = await api.post(`${BASE}/${cafeId}/favorite`)
  return res?.data ?? res
}