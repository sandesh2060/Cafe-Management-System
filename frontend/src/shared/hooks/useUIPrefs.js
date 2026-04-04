// src/shared/hooks/useUIPrefs.js
//
// Hook to read and toggle UI preferences from the Redux store.
// Used by ProfilePage (toggle) and WelcomeCard (read).
//
// Usage:
//   const { skyAnimationsEnabled, toggleSkyAnimations } = useUIPrefs()

import { useDispatch, useSelector } from 'react-redux'
import {
  selectSkyAnimationsEnabled,
  toggleSkyAnimations as _toggle,
  setSkyAnimations   as _set,
  resetUIPrefs       as _reset,
} from '@store/slices/uiSlice'

export function useUIPrefs() {
  const dispatch              = useDispatch()
  const skyAnimationsEnabled  = useSelector(selectSkyAnimationsEnabled)

  return {
    skyAnimationsEnabled,
    toggleSkyAnimations:  ()      => dispatch(_toggle()),
    setSkyAnimations:     (value) => dispatch(_set(value)),
    resetUIPrefs:         ()      => dispatch(_reset()),
  }
}

export default useUIPrefs