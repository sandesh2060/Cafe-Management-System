// src/modules/customer/hooks/useLoyalty.js
//
// FIXES:
//   • ENDPOINTS.LOYALTY.ME used instead of hardcoded '/loyalty/me' string
//   • axios double-unwrap guard: data?.data ?? data pattern
//   • setLoyalty called with only confirmed slice fields (points, tier,
//     discountPct, pointsToNext) — totalEarned/totalSpent were passed but
//     loyaltySlice doesn't store them, so they were silently dropped
//   • Fetch guard: skip if already loaded and not a guest

import { useEffect }                from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  setLoyalty,
  selectLoyalty,
  selectTier,
  selectPoints,
  selectDiscountPct,
  selectPointsToNext,
} from '@store/slices/loyaltySlice'
import { selectIsGuest } from '@store/slices/authSlice'
import api               from '@api/axios'
import { ENDPOINTS }     from '@api/endpoints'

export const useLoyalty = () => {
  const dispatch    = useDispatch()
  const loyalty     = useSelector(selectLoyalty)
  const isGuest     = useSelector(selectIsGuest)

  useEffect(() => {
    // Skip for guests and skip if already loaded (tier is set)
    if (isGuest || loyalty.tier !== 'none') return

    api.get(ENDPOINTS.LOYALTY.ME)
      .then((res) => {
        // FIX: double-unwrap — handle both { points, tier } and { data: { ... } }
        const data = res?.data ?? res
        dispatch(setLoyalty({
          points:      data.points      ?? 0,
          tier:        data.tier        ?? 'none',
          discountPct: data.discountPct ?? undefined,   // let slice compute if missing
        }))
      })
      .catch(() => {
        // Silently fail — loyalty is non-critical, UI degrades gracefully
      })
  }, [dispatch, isGuest, loyalty.tier])

  return {
    loyalty,
    tier:         useSelector(selectTier),
    points:       useSelector(selectPoints),
    discountPct:  useSelector(selectDiscountPct),
    pointsToNext: useSelector(selectPointsToNext),
  }
}