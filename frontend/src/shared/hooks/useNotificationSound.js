// src/shared/hooks/useNotificationSound.js
// Generates notification sounds via Web Audio API — no external files needed.
// Each notification type has a distinct tonal signature.

const ctx = () => {
  if (typeof window === 'undefined') return null
  if (!window.__audioCtx) {
    window.__audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return window.__audioCtx
}

const ramp = (param, from, to, start, dur, ac) => {
  param.setValueAtTime(from, start)
  param.exponentialRampToValueAtTime(to, start + dur)
}

const NOTE = { C5: 523.25, E5: 659.25, G5: 783.99, A5: 880, B4: 493.88, D5: 587.33, F5: 698.46 }

// ── Sound recipes ─────────────────────────────────────────────────────────────
const sounds = {
  // 🍽️ Order update — two ascending tones, warm
  order: (ac) => {
    const t = ac.currentTime
    ;[NOTE.E5, NOTE.G5].forEach((freq, i) => {
      const osc  = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain); gain.connect(ac.destination)
      osc.type      = 'sine'
      osc.frequency.setValueAtTime(freq, t + i * 0.12)
      gain.gain.setValueAtTime(0, t + i * 0.12)
      gain.gain.linearRampToValueAtTime(0.22, t + i * 0.12 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.28)
      osc.start(t + i * 0.12)
      osc.stop(t + i * 0.12 + 0.3)
    })
  },

  // 🛎️ Waiter — single bright ding (bell-like)
  waiter: (ac) => {
    const t   = ac.currentTime
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain); gain.connect(ac.destination)
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(NOTE.A5, t)
    gain.gain.setValueAtTime(0.3, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
    osc.start(t); osc.stop(t + 0.6)
  },

  // ⭐ Loyalty — cheerful three-note chime
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

  // 📢 System — soft low-high blip
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

  // 💬 Message — quick double-tap
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

  // 💳 Payment — satisfying ascending arpeggio
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
  try {
    const ac = ctx()
    if (!ac) return
    // Resume suspended context (browser autoplay policy)
    if (ac.state === 'suspended') ac.resume()
    const fn = sounds[type] || sounds.system
    fn(ac)
  } catch (e) {
    console.warn('[NotificationSound] Failed:', e)
  }
}

export default playNotificationSound