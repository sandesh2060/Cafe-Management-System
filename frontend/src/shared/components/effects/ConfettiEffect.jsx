// src/shared/components/effects/ConfettiEffect.jsx
import { useEffect } from 'react'
import confetti from 'canvas-confetti'

const ConfettiEffect = ({ trigger = true, duration = 3000 }) => {
  useEffect(() => {
    if (!trigger) return

    const end = Date.now() + duration
    const colors = ['#FF9F1C', '#E05C2A', '#2D9B5A', '#FFB84D', '#FFF3DC']

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      })
      if (Date.now() < end) requestAnimationFrame(frame)
    }

    frame()
  }, [trigger, duration])

  return null  // No UI — just the effect
}

export default ConfettiEffect