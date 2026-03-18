// src/shared/utils/soundPlayer.js
//
// SIMPLIFIED: Thin re-export wrapper over soundEngine.js.
// All actual logic lives in soundEngine.js — single source of truth.
// This file kept for backward compat with existing imports.

export {
  playSound,
  preloadRoleSounds as preloadSounds,
  setVolume,
  toggleMute,
  isMuted,
} from '@shared/utils/soundEngine'