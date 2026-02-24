// src/modules/customer/hooks/useLoyalty.js
import { useEffect }        from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setLoyalty, selectLoyalty } from '@store/slices/loyaltySlice'
import { selectIsGuest }    from '@store/slices/authSlice'
import api                  from '@api/axios'

export const useLoyalty = () => {
  const dispatch  = useDispatch()
  const loyalty   = useSelector(selectLoyalty)
  const isGuest   = useSelector(selectIsGuest)

  useEffect(() => {
    if (isGuest) return
    api.get('/loyalty/me')
      .then((data) => {
        dispatch(setLoyalty({
          points:       data.points,
          tier:         data.tier,
          totalEarned:  data.totalEarned,
          totalSpent:   data.totalSpent,
        }))
      })
      .catch(() => {})
  }, [dispatch, isGuest])

  return loyalty
}