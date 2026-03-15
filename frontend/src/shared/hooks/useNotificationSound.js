// src/shared/hooks/useNotificationSound.js
//
// Web Audio API notification sounds — no MP3 files needed.
// FIXES:
//   • AudioContext unlocked on first user interaction (click/touchstart/keydown)
//     so sounds play reliably on mobile and after page load.
//   • vibrate() added for mobile haptic feedback.

const getCtx = () => {
  if (typeof window === 'undefined') return null
  if (!window.__audioCtx) {
    window.__audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return window.__audioCtx
}

// ── Unlock AudioContext on first user gesture ─────────────────────────────────
// Must be called once at app startup (e.g. in App.jsx or main.jsx).
// After this, playNotificationSound() will work from useEffect / socket events.
export const unlockAudioContext = () => {
  if (typeof window === 'undefined') return

  const unlock = () => {
     window.__audioUnlocked = true
    const ac = getCtx()
    if (!ac) return
    if (ac.state === 'suspended') {
      ac.resume().catch(() => {})
    }
    // Create and immediately stop a silent buffer — forces unlock on iOS Safari
    try {
      const buf = ac.createBuffer(1, 1, 22050)
      const src = ac.createBufferSource()
      src.buffer = buf
      src.connect(ac.destination)
      src.start(0)
      src.stop(0)
    } catch {}

    // Remove listeners after first unlock
    window.removeEventListener('click',      unlock)
    window.removeEventListener('touchstart', unlock)
    window.removeEventListener('keydown',    unlock)
  }

  window.addEventListener('click',      unlock, { once: true, passive: true })
  window.addEventListener('touchstart', unlock, { once: true, passive: true })
  window.addEventListener('keydown',    unlock, { once: true, passive: true })
}

const NOTE = { C5: 523.25, E5: 659.25, G5: 783.99, A5: 880, B4: 493.88, D5: 587.33, F5: 698.46 }

// ── Vibration patterns (ms) ───────────────────────────────────────────────────
const VIBRATE = {
  order:   [60, 40, 60],          // two quick taps
  waiter:  [100],                  // single firm tap
  loyalty: [50, 30, 50, 30, 80],  // cheerful triple
  payment: [80, 40, 80, 40, 120], // satisfying finish
  system:  [40],                   // subtle single
}

const vibrate = (pattern) => {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern)
  } catch {}
}

// ── Sound recipes ─────────────────────────────────────────────────────────────
const sounds = {
  order: (ac) => {
    const t = ac.currentTime
    ;[NOTE.E5, NOTE.G5].forEach((freq, i) => {
      const osc  = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain); gain.connect(ac.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t + i * 0.12)
      gain.gain.setValueAtTime(0, t + i * 0.12)
      gain.gain.linearRampToValueAtTime(0.22, t + i * 0.12 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.28)
      osc.start(t + i * 0.12)
      osc.stop(t + i * 0.12 + 0.3)
    })
  },

  waiter: (ac) => {
    const t    = ac.currentTime
    const osc  = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain); gain.connect(ac.destination)
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(NOTE.A5, t)
    gain.gain.setValueAtTime(0.3, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
    osc.start(t); osc.stop(t + 0.6)
  },

  loyalty: (ac) => {
    const t = ac.currentTime
    ;[NOTE.C5, NOTE.E5, NOTE.G5].forEach((freq, i) => {
      const osc  = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain); gain.connect(ac.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t + i * 0.1)
      gain.gain.setValueAtTime(0, t + i * 0.1)
      gain.gain.linearRampToValueAtTime(0.18, t + i * 0.1 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.3)
      osc.start(t + i * 0.1)
      osc.stop(t + i * 0.1 + 0.35)
    })
  },

  system: (ac) => {
    const t = ac.currentTime
    ;[NOTE.B4, NOTE.D5].forEach((freq, i) => {
      const osc  = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain); gain.connect(ac.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t + i * 0.14)
      gain.gain.setValueAtTime(0.15, t + i * 0.14)
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.14 + 0.22)
      osc.start(t + i * 0.14)
      osc.stop(t + i * 0.14 + 0.25)
    })
  },

  message: (ac) => {
    const t = ac.currentTime
    ;[0, 0.1].forEach((delay) => {
      const osc  = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain); gain.connect(ac.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(NOTE.F5, t + delay)
      gain.gain.setValueAtTime(0.18, t + delay)
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.15)
      osc.start(t + delay)
      osc.stop(t + delay + 0.18)
    })
  },

  payment: (ac) => {
    const t = ac.currentTime
    ;[NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C5 * 2].forEach((freq, i) => {
      const osc  = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain); gain.connect(ac.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t + i * 0.08)
      gain.gain.setValueAtTime(0, t + i * 0.08)
      gain.gain.linearRampToValueAtTime(0.15, t + i * 0.08 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.25)
      osc.start(t + i * 0.08)
      osc.stop(t + i * 0.08 + 0.28)
    })
  },
}

export const playNotificationSound = (type = 'system') => {
  // Vibrate regardless of audio state (works even when muted)
  vibrate(VIBRATE[type] ?? VIBRATE.system)

  try {
    const ac = getCtx()
    if (!ac) return
    if (ac.state === 'suspended') {
      // Try to resume — will only work if called from a user gesture
      ac.resume().then(() => {
        const fn = sounds[type] || sounds.system
        fn(ac)
      }).catch(() => {})
      return
    }
    const fn = sounds[type] || sounds.system
    fn(ac)
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[NotificationSound] Failed:', e)
  }
}

export default playNotificationSound