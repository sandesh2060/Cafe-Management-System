// src/shared/hooks/useDeviceTier.js
//
// Hook to read device tier from anywhere in the app.
//
// Examples:
//   const { isLow, gsapEnabled, config } = useDeviceTier()
//
//   // Skip GSAP on low-end devices
//   useEffect(() => { if (!gsapEnabled) return; gsap.from(...) }, [])
//
//   // Read sky config
//   const { config } = useDeviceTier()
//   config.blades / config.fps / config.useWebGL
//
//   // Disable hover effects
//   const { hoverEffects } = useDeviceTier()
//   style={{ transform: hoverEffects ? 'scale(1.02)' : 'none' }}
//
//   // Skip confetti
//   const { config } = useDeviceTier()
//   if (config.confettiEnabled) launchConfetti()

import { useContext } from 'react'
import { DeviceTierContext } from '@shared/context/DeviceTierContext'

export function useDeviceTier() {
  const ctx = useContext(DeviceTierContext)
  if (!ctx) throw new Error('useDeviceTier must be used inside <DeviceTierProvider>')
  return ctx
}

export default useDeviceTier