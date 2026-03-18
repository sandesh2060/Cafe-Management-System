// src/shared/hooks/useNotificationSound.js
//
// SIMPLIFIED: Thin re-export wrapper over soundEngine.js.
// All actual logic lives in soundEngine.js — single source of truth.
// This file kept for backward compat with existing imports.

export {
  playNotificationSound,
  unlockAudioContext,
} from '@shared/utils/soundEngine'

export default function useNotificationSound() {
  // Hook form — no-op, unlock is handled at module load in soundEngine
  return null
}