// src/modules/customer/hooks/usePaymentLogoutTrigger.js
//
// FIXES:
//   • addPoints() replaced with setLoyalty({ points, tier }) — addPoints
//     recomputes tier from points locally which can briefly show a different
//     tier than what the backend confirmed in data.newTier. setLoyalty uses
//     the server's authoritative tier directly.
//   • Guard added: only navigates/dispatches if component is still mounted
//     (the payment success page may have already unmounted by the time the
//     socket event fires if the user navigated away).

import { useEffect, useRef }  from 'react'
import { useNavigate }        from 'react-router-dom'
import { useDispatch }        from 'react-redux'
import socketService          from '@shared/services/socket.service'
import { setLoyalty }         from '@store/slices/loyaltySlice'
import { clearActiveOrder }   from '@store/slices/orderSlice'

const PAYMENT_LOGOUT_DELAY = parseInt(
  import.meta.env.VITE_PAYMENT_LOGOUT_DELAY_MS || '8000'
)

/**
 * Listens for order:payment_confirmed socket event.
 * Clears active order, updates loyalty with server-confirmed tier,
 * then navigates to the payment success page.
 */
export const usePaymentLogoutTrigger = () => {
  const navigate   = useNavigate()
  const dispatch   = useDispatch()
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    const unsub = socketService.on('order:payment_confirmed', (data) => {
      if (!mountedRef.current) return

      // Clear active order from Redux
      dispatch(clearActiveOrder())

      // FIX: use setLoyalty with server-confirmed tier instead of addPoints
      // which recomputes tier locally and may briefly show the wrong tier
      if (data.pointsEarned || data.newTier) {
        dispatch(setLoyalty({
          points: data.totalPoints  ?? undefined,
          tier:   data.newTier      ?? undefined,
        }))
      }

      // Navigate to success page — replace so back button doesn't return here
      navigate('/payment-success', {
        state: {
          pointsEarned: data.pointsEarned ?? 0,
          tierUpgraded: data.tierUpgraded ?? false,
          newTier:      data.newTier      ?? null,
          totalAmount:  data.totalAmount  ?? 0,
        },
        replace: true,
      })
    })

    return unsub
  }, [navigate, dispatch])
}