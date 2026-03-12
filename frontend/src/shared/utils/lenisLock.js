// src/shared/utils/lenisLock.js
let _lenis = null
let _lockCount = 0

export function setLenisInstance(lenis) {
  _lenis = lenis
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