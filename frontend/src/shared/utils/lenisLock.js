// src/shared/utils/lenisLock.js
//
// Lenis scroll lock manager.
// setLenisInstance() is called by PerfModeManager in providers.jsx
// every time the Lenis instance is created, so this module always
// holds the live reference. Components call lockScroll/unlockScroll
// without needing to import useLenis directly.
//
// Usage:
//   lockScroll()   → call when sheet/drawer opens
//   unlockScroll() → call when sheet/drawer closes
//   forceUnlockScroll() → call in error boundaries / unmount cleanup

let _lenis     = null
let _lockCount = 0

export function setLenisInstance(lenis) {
  _lenis = lenis
}

export function getLenisInstance() {
  return _lenis
}

export function lockScroll() {
  _lockCount++
  if (_lockCount === 1 && _lenis) {
    _lenis.stop()
  }
}

export function unlockScroll() {
  if (_lockCount > 0) _lockCount--
  if (_lockCount === 0 && _lenis) {
    _lenis.start()
  }
}

export function forceUnlockScroll() {
  _lockCount = 0
  _lenis?.start()
}