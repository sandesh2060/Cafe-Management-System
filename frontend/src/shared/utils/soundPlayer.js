// src/shared/utils/soundPlayer.js
import { SOUNDS } from '@sounds'

const audioCache = {}

/**
 * Play a sound for a given role.
 * Admin role is always silenced.
 * @param {string} soundKey  - Key from SOUNDS[role]
 * @param {string} role      - User role
 */
export const playSound = (soundKey, role) => {
  // Admin is always silent — no exceptions
  if (!role || role === 'admin') return

  // Respect user mute preference
  if (localStorage.getItem('kc_sounds_muted') === 'true') return

  const path = SOUNDS[role]?.[soundKey]
  if (!path) return

  // Cache Audio objects for instant replay
  if (!audioCache[path]) {
    audioCache[path] = new Audio(path)
  }

  const audio  = audioCache[path]
  audio.currentTime = 0
  audio.volume = parseFloat(localStorage.getItem('kc_sound_volume') || '0.7')

  audio.play().catch((err) => {
    // Silent fail — browser autoplay policy may block
    if (import.meta.env.DEV) console.warn('[Sound] Autoplay blocked:', path, err.message)
  })
}

/**
 * Preload all sounds for a given role into cache.
 * Call after login to ensure instant playback.
 */
export const preloadSounds = (role) => {
  if (!role || role === 'admin') return
  const roleSounds = SOUNDS[role]
  if (!roleSounds) return

  Object.values(roleSounds).forEach((path) => {
    if (!audioCache[path]) {
      const audio = new Audio(path)
      audio.preload = 'auto'
      audioCache[path] = audio
    }
  })
}

export const setVolume = (vol) => {
  const v = Math.max(0, Math.min(1, vol))
  localStorage.setItem('kc_sound_volume', String(v))
  Object.values(audioCache).forEach((a) => { a.volume = v })
}

export const toggleMute = () => {
  const muted = localStorage.getItem('kc_sounds_muted') === 'true'
  localStorage.setItem('kc_sounds_muted', String(!muted))
  return !muted
}

export const isMuted = () => localStorage.getItem('kc_sounds_muted') === 'true'