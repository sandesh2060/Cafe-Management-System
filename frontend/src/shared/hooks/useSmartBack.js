// src/shared/hooks/useSmartBack.js
//
// Replaces navigate(-1) everywhere.
// • If there's real browser history → go back (no reload)
// • If history is empty (page opened fresh / direct link) → navigate to fallback
// • Never triggers a browser reload
//
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * @param {string} fallback  Route to go to when there's no history (default: '/menu')
 * @returns {{ goBack: () => void }}
 */
export const useSmartBack = (fallback = '/menu') => {
  const navigate = useNavigate()

  const goBack = useCallback(() => {
    // history.length === 1 means this tab was opened fresh with no prior navigation
    // history.length === 2 typically means the first entry is the initial load
    if (window.history.length > 2) {
      navigate(-1)
    } else {
      navigate(fallback, { replace: true })
    }
  }, [navigate, fallback])

  return { goBack }
}

export default useSmartBack