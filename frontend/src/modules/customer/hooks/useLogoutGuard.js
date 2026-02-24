// src/modules/customer/hooks/useLogoutGuard.js
import { useSelector } from 'react-redux'
import { selectHasActiveOrder } from '@store/slices/orderSlice'
import logoutService from '../services/logoutService'

/**
 * Rule 1 + 2: Manual logout guard
 * - If no active order → allow logout
 * - If active order → block, show tooltip
 */
export const useLogoutGuard = () => {
  const hasActiveOrder = useSelector(selectHasActiveOrder)

  const attemptLogout = async () => {
    if (hasActiveOrder) {
      // Rule 2 — blocked
      return { blocked: true, reason: 'You have an active order. Logout after delivery.' }
    }
    // Rule 1 — allowed
    await logoutService.execute()
    return { blocked: false }
  }

  return { attemptLogout, hasActiveOrder }
}