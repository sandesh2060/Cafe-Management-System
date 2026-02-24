// src/modules/customer/hooks/usePaymentLogoutTrigger.js
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import socketService from '@shared/services/socket.service'
import { addPoints } from '@store/slices/loyaltySlice'
import { clearActiveOrder } from '@store/slices/orderSlice'

const PAYMENT_LOGOUT_DELAY = parseInt(import.meta.env.VITE_PAYMENT_LOGOUT_DELAY_MS || '8000')

/**
 * Rule 3: Listen for order:payment_confirmed socket event.
 * Navigates to success page, then auto-logs out after delay.
 */
export const usePaymentLogoutTrigger = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()

  useEffect(() => {
    const unsub = socketService.on('order:payment_confirmed', (data) => {
      // Clear active order immediately
      dispatch(clearActiveOrder())

      // Add earned loyalty points to store
      if (data.pointsEarned) dispatch(addPoints(data.pointsEarned))

      // Navigate to success page with earned data
      navigate('/payment-success', {
        state: {
          pointsEarned:    data.pointsEarned || 0,
          tierUpgraded:    data.tierUpgraded || false,
          newTier:         data.newTier      || null,
          totalAmount:     data.totalAmount  || 0,
        },
        replace: true,
      })
    })

    return unsub
  }, [navigate, dispatch])
}