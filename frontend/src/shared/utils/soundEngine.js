// src/shared/utils/soundEngine.js
//
// PATCH: Bug 3 fix (v2) — AudioContext autoplay error
// ✅ Removed passive:true from the capture gesture listeners.
// ✅ Added e.isTrusted check — filters synthetic/programmatic events
//    that fired the listener before any real user interaction.
//    capture:true + passive:true is contradictory for unlocking AudioContext:
//    passive:true tells the browser "I won't call preventDefault" which is fine,
//    but Chrome Android also uses passivity as a hint that the callback is not
//    a "direct gesture handler" and may still block AudioContext creation.
//    capture:true alone (passive defaults to false) = treated as direct gesture.
//
// Only these 3 lines changed from the original:
//   { passive: true, capture: true }  →  { capture: true }
//
// All other logic unchanged.

import { SOUNDS } from '@sounds'

let _ac       = null
let _unlocked = false
let _unlocking = false

const getAC = () => {
  if (_ac && _ac.state !== 'closed') return _ac
  if (typeof window !== 'undefined' &&
      window.__kcAudioContext &&
      window.__kcAudioContext.state !== 'closed') {
    _ac       = window.__kcAudioContext
    _unlocked = true
    return _ac
  }
  return null
}

const _unlock = () => {
  if (_unlocked || _unlocking) return
  _unlocking = true

  if (typeof window !== 'undefined' &&
      window.__kcAudioContext &&
      window.__kcAudioContext.state !== 'closed') {
    _ac        = window.__kcAudioContext
    _unlocked  = true
    _unlocking = false
    return
  }

  try {
    _ac = new (window.AudioContext || window.webkitAudioContext)()
  } catch {
    _unlocking = false
    return
  }

  const doResume = () => {
    if (!_ac || _ac.state === 'running') {
      _finishUnlock()
      return
    }
    _ac.resume().then(_finishUnlock).catch(_finishUnlock)
  }

  const _finishUnlock = () => {
    _unlocked  = true
    _unlocking = false
    try {
      const buf = _ac.createBuffer(1, 1, 22050)
      const src = _ac.createBufferSource()
      src.buffer = buf
      src.connect(_ac.destination)
      src.start(0)
      src.stop(0)
    } catch {}
    if (typeof window !== 'undefined') {
      window.__kcAudioContext  = _ac
      window.__kcAudioUnlocked = true
    }
  }

  if (_ac.state === 'suspended') {
    doResume()
  } else {
    _finishUnlock()
  }
}

// ── BUG 3 FIX: remove passive:true from capture listeners ────────────────────
// capture:true + passive:true → Chrome Android may still block AudioContext.
// capture:true alone (passive=false default) → treated as direct user gesture.
if (typeof window !== 'undefined') {
  const _onGesture = (e) => {
    // isTrusted guard — only real user gestures unlock AudioContext.
    // Synthetic/programmatic events (socket events, session rehydration,
    // React state updates) set isTrusted=false → skip them entirely.
    if (!e.isTrusted) return
    _unlock()
    if (_unlocked) {
      window.removeEventListener('click',      _onGesture, { capture: true })
      window.removeEventListener('touchstart', _onGesture, { capture: true })
      window.removeEventListener('keydown',    _onGesture, { capture: true })
    }
  }
  // FIX: { capture: true } only — passive removed
  window.addEventListener('click',      _onGesture, { capture: true })
  window.addEventListener('touchstart', _onGesture, { capture: true })
  window.addEventListener('keydown',    _onGesture, { capture: true })
}

// ── Vibration ─────────────────────────────────────────────────────────────────
const VIBRATE_PATTERNS = {
  order:       [60, 40, 60],
  kitchen:     [60, 40, 60],
  payment:     [80, 40, 80, 40, 120],
  loyalty:     [50, 30, 50, 30, 80],
  waiter:      [100],
  festival:    [50, 30, 50, 30, 80],
  birthday:    [80, 40, 120],
  message:     [40, 30, 40],
  system:      [40],
  newOrder:    [80, 40, 80],
  urgentAlert: [200, 100, 200, 100, 200],
  paymentDone: [100, 50, 200],
  callWaiter:  [150, 80, 150],
}

const vibrate = (pattern) => {
  if (!pattern?.length || !_unlocked) return
  try { navigator.vibrate?.(pattern) } catch {}
}

const N = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00,
  A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99,
  A5: 880.00, B5: 987.77,
  C6: 1046.50,
}

const _playTone = (ac, freq, type, gainVal, startOffset, duration) => {
  const osc  = ac.createOscillator()
  const gain = ac.createGain()
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.type = type
  osc.frequency.setValueAtTime(freq, ac.currentTime + startOffset)
  gain.gain.setValueAtTime(0, ac.currentTime + startOffset)
  gain.gain.linearRampToValueAtTime(gainVal, ac.currentTime + startOffset + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + startOffset + duration)
  osc.start(ac.currentTime + startOffset)
  osc.stop(ac.currentTime + startOffset + duration + 0.02)
}

const SYNTH_SOUNDS = {
  order: (ac) => {
    [[N.C5, 0], [N.E5, 0.1], [N.G5, 0.2]].forEach(([f, t]) =>
      _playTone(ac, f, 'sine', 0.22, t, 0.28))
  },
  orderPlaced: (ac) => {
    [[N.C5, 0], [N.E5, 0.1], [N.G5, 0.2]].forEach(([f, t]) =>
      _playTone(ac, f, 'sine', 0.22, t, 0.28))
  },
  orderReady: (ac) => {
    [[N.G5, 0], [N.C6, 0.1], [N.G5, 0.22]].forEach(([f, t]) =>
      _playTone(ac, f, 'sine', 0.25, t, 0.3))
  },
  orderDelivered: (ac) => {
    [[N.C5, 0], [N.E5, 0.09], [N.G5, 0.18], [N.C6, 0.27]].forEach(([f, t]) =>
      _playTone(ac, f, 'sine', 0.2, t, 0.28))
  },
  waiter: (ac) => {
    _playTone(ac, N.A5, 'triangle', 0.3, 0, 0.55)
    _playTone(ac, N.E5, 'sine', 0.12, 0.06, 0.4)
  },
  loyalty: (ac) => {
    [[N.C5, 0], [N.E5, 0.09], [N.G5, 0.18], [N.C6, 0.27]].forEach(([f, t]) =>
      _playTone(ac, f, 'sine', 0.18, t, 0.3))
  },
  pointsEarned: (ac) => {
    [[N.E5, 0], [N.G5, 0.08], [N.C6, 0.16]].forEach(([f, t]) =>
      _playTone(ac, f, 'sine', 0.16, t, 0.25))
  },
  tierUpgraded: (ac) => {
    [[N.C5, 0], [N.E5, 0.07], [N.G5, 0.14], [N.C6, 0.21], [N.C6, 0.3]].forEach(([f, t]) =>
      _playTone(ac, f, 'sine', 0.2, t, 0.32))
  },
  payment: (ac) => {
    [[N.C5, 0], [N.E5, 0.07], [N.G5, 0.14], [N.C6, 0.21]].forEach(([f, t]) =>
      _playTone(ac, f, 'sine', 0.15, t, 0.25))
  },
  message: (ac) => {
    [[N.F5, 0], [N.F5, 0.1]].forEach(([f, t]) =>
      _playTone(ac, f, 'sine', 0.18, t, 0.15))
  },
  notification: (ac) => {
    [[N.B4, 0], [N.D5, 0.12]].forEach(([f, t]) =>
      _playTone(ac, f, 'sine', 0.15, t, 0.22))
  },
  kitchen: (ac) => {
    [[N.A5, 0], [N.A5, 0.14]].forEach(([f, t]) =>
      _playTone(ac, f, 'square', 0.12, t, 0.18))
    _playTone(ac, N.E5, 'sine', 0.1, 0.06, 0.25)
  },
  festival: (ac) => {
    [[N.G4, 0], [N.B4, 0.07], [N.D5, 0.14], [N.G5, 0.21], [N.B5, 0.28]].forEach(([f, t]) =>
      _playTone(ac, f, 'sine', 0.14, t, 0.22))
  },
  system: (ac) => {
    [[N.B4, 0], [N.D5, 0.14]].forEach(([f, t]) =>
      _playTone(ac, f, 'sine', 0.15, t, 0.22))
  },
  error: (ac) => {
    [[N.E5, 0], [N.C5, 0.12]].forEach(([f, t]) =>
      _playTone(ac, f, 'sawtooth', 0.1, t, 0.2))
  },
  urgent: (ac) => {
    [0, 0.18, 0.36].forEach(t => _playTone(ac, N.A5, 'square', 0.2, t, 0.14))
  },
}

let _currentRole = null
let _fileCache   = {}
let _bufferCache = {}

const _clearFileCache = () => {
  Object.values(_fileCache).forEach(a => { try { if (a.pause) a.pause() } catch {} })
  _fileCache   = {}
  _bufferCache = {}
}

const _preloadFile = async (path) => {
  if (_fileCache[path]) return
  const audio = new Audio(path)
  audio.preload = 'auto'
  _fileCache[path] = audio
  try {
    const ac  = getAC()
    if (!ac) return
    const res = await fetch(path)
    const buf = await res.arrayBuffer()
    _bufferCache[path] = await ac.decodeAudioData(buf)
  } catch {}
}

export const preloadRoleSounds = (role) => {
  if (!role || role === 'admin') return
  if (role !== _currentRole) { _clearFileCache(); _currentRole = role }
  const roleSounds = SOUNDS[role]
  if (!roleSounds) return
  Object.values(roleSounds).forEach(path => { if (path) _preloadFile(path) })
}

export const playNotificationSound = (type = 'system', vibratePattern) => {
  if (isMuted()) return
  vibrate(vibratePattern ?? VIBRATE_PATTERNS[type] ?? VIBRATE_PATTERNS.system)
  try {
    const ac = getAC()
    if (!ac) return
    if (ac.state === 'suspended') {
      ac.resume().then(() => {
        try {
          const fn = SYNTH_SOUNDS[type] ?? SYNTH_SOUNDS.system
          fn(ac)
        } catch {}
      }).catch(() => {})
      return
    }
    if (ac.state !== 'running') return
    const fn = SYNTH_SOUNDS[type] ?? SYNTH_SOUNDS.system
    fn(ac)
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[SoundEngine] Synth failed:', e.message)
  }
}

export const playSound = (soundKey, role) => {
  if (!role || role === 'admin') return
  if (isMuted()) return
  if (role !== _currentRole) { _clearFileCache(); _currentRole = role }
  const path = SOUNDS[role]?.[soundKey]
  if (!path) return
  const buf = _bufferCache[path]
  if (buf) {
    try {
      const ac = getAC()
      if (ac && ac.state === 'running') {
        const src  = ac.createBufferSource()
        const gain = ac.createGain()
        src.buffer = buf
        gain.gain.value = getVolume()
        src.connect(gain)
        gain.connect(ac.destination)
        src.start(0)
        return
      }
    } catch {}
  }
  if (!_fileCache[path]) {
    _fileCache[path] = new Audio(path)
    _fileCache[path].preload = 'auto'
  }
  const audio = _fileCache[path]
  audio.currentTime = 0
  audio.volume = getVolume()
  audio.play().catch(() => { _preloadFile(path) })
}

export const getVolume = () =>
  parseFloat(localStorage.getItem('kc_sound_volume') ?? '0.7')

export const setVolume = (vol) => {
  const v = Math.max(0, Math.min(1, vol))
  localStorage.setItem('kc_sound_volume', String(v))
  Object.values(_fileCache).forEach(a => { try { if (a.volume !== undefined) a.volume = v } catch {} })
}

export const toggleMute = () => {
  const muted = isMuted()
  localStorage.setItem('kc_sounds_muted', String(!muted))
  return !muted
}

export const isMuted = () =>
  localStorage.getItem('kc_sounds_muted') === 'true'

export default playNotificationSound
export const unlockAudioContext = () => _unlock()