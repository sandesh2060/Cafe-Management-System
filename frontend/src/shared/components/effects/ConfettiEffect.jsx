// src/shared/components/effects/ConfettiEffect.jsx
//
// ✅ Hardcoded hex color array replaced with CSS var reads via getComputedStyle
//    — confetti now uses the actual brand accent/light/bg colors from .env.local
// ✅ Falls back to default saffron/terra palette if vars not yet set

import { useEffect } from 'react'
import confetti from 'canvas-confetti'

const ConfettiEffect = ({ trigger = true, duration = 3000 }) => {
  useEffect(() => {
    if (!trigger) return

    // ✅ Read brand colors from CSS vars set by ThemeContext on :root
    // Falls back to saffron/terra defaults if ThemeContext hasn't mounted yet
    const style  = getComputedStyle(document.documentElement)
    const accent      = style.getPropertyValue('--accent').trim()      || '#FF9F1C'
    const accentDark  = style.getPropertyValue('--accent-dark').trim() || '#E05C2A'
    const accentLight = style.getPropertyValue('--accent-light').trim()|| '#FFB84D'
    const success     = style.getPropertyValue('--success').trim()     || '#34D399'
    const textInverse = style.getPropertyValue('--text-inverse').trim()|| '#FFF8EE'

    const colors = [accent, accentDark, accentLight, success, textInverse]

    const end = Date.now() + duration

    const frame = () => {
      confetti({
        particleCount: 3,
        angle:         60,
        spread:        55,
        origin:        { x: 0 },
        colors,
      })
      confetti({
        particleCount: 3,
        angle:         120,
        spread:        55,
        origin:        { x: 1 },
        colors,
      })
      if (Date.now() < end) requestAnimationFrame(frame)
    }

    frame()
  }, [trigger, duration])

  return null  // No UI — just the effect
}

export default ConfettiEffect