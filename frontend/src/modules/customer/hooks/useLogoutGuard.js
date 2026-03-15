// src/modules/customer/hooks/useLogoutGuard.js
//
// FIXES:
//   • logoutService.execute() → logoutService.executeClient()
//     (confirmed method name from logoutService.js history)
//   • try/catch added around executeClient() so a failed logout
//     returns a structured error instead of an uncaught rejection

import { useSelector } from 'react-redux'
import { selectHasActiveOrder } from '@store/slices/orderSlice'
import logoutService from '../services/logoutService'

/**
 * Manual logout guard.
 * Rule 1: No active order → allow logout → call logoutService.executeClient()
 * Rule 2: Active order → block, return reason string for tooltip/toast
 */
export const useLogoutGuard = () => {
  const hasActiveOrder = useSelector(selectHasActiveOrder)

  const attemptLogout = async () => {
    if (hasActiveOrder) {
      return {
        blocked: true,
        reason: 'You have an active order. Please wait until delivery before logging out.',
      }
    }

    try {
      await logoutService.executeClient()
      return { blocked: false }
    } catch (err) {
      return {
        blocked: false,
        error: err?.message ?? 'Logout failed. Please try again.',
      }
    }
  }

  return { attemptLogout, hasActiveOrder }
}