// src/shared/utils/soundPlayer.js
//
// FIX: audioCache is now role-scoped. On role change the cache is cleared
// so stale Audio objects from a previous role never play.

import { SOUNDS } from '@sounds'

// Role-scoped cache: { [path]: Audio }
let _currentRole = null
let audioCache   = {}

const _clearCache = () => {
  // Pause and discard all cached Audio objects
  Object.values(audioCache).forEach((a) => { try { a.pause() } catch {} })
  audioCache = {}
}

/**
 * Play a sound for a given role.
 * Admin role is always silenced.
 */
export const playSound = (soundKey, role) => {
  if (!role || role === 'admin') return
  if (localStorage.getItem('kc_sounds_muted') === 'true') return

  // Clear cache when role changes (e.g. logout → re-login as different role)
  if (role !== _currentRole) {
    _clearCache()
    _currentRole = role
  }

  const path = SOUNDS[role]?.[soundKey]
  if (!path) return

  if (!audioCache[path]) {
    audioCache[path] = new Audio(path)
  }

  const audio = audioCache[path]
  audio.currentTime = 0
  audio.volume = parseFloat(localStorage.getItem('kc_sound_volume') || '0.7')

  audio.play().catch((err) => {
    if (import.meta.env.DEV) console.warn('[Sound] Autoplay blocked:', path, err.message)
  })
}

/**
 * Preload all sounds for a given role into cache.
 * Call after login to ensure instant playback.
 */
export const preloadSounds = (role) => {
  if (!role || role === 'admin') return

  if (role !== _currentRole) {
    _clearCache()
    _currentRole = role
  }

  const roleSounds = SOUNDS[role]
  if (!roleSounds) return

  Object.values(roleSounds).forEach((path) => {
    if (!audioCache[path]) {
      const audio   = new Audio(path)
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