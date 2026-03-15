// src/modules/customer/hooks/useOrderHistory.js
//
// FIXES:
//   • Now dispatches fetchOrderHistory thunk and reads from Redux via
//     selectOrderHistory / selectOrderLoading — previously created local state
//     that diverged from the Redux store, causing inconsistency across pages.
//   • ENDPOINTS constant used instead of hardcoded '/orders/history' string.
//   • Pagination exposed from selectOrderPagination for infinite scroll support.

import { useEffect }                from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchOrderHistory,
  selectOrderHistory,
  selectOrderLoading,
  selectOrderPagination,
  selectOrderError,
} from '@store/slices/orderSlice'

export const useOrderHistory = () => {
  const dispatch   = useDispatch()
  const orders     = useSelector(selectOrderHistory)
  const loading    = useSelector(selectOrderLoading)
  const pagination = useSelector(selectOrderPagination)
  const error      = useSelector(selectOrderError)

  // Fetch first page on mount — guard prevents re-fetch if already loaded
  useEffect(() => {
    if (!loading && orders.length === 0) {
      dispatch(fetchOrderHistory({ page: 1, limit: 10 }))
    }
  }, [dispatch, loading, orders.length])

  const loadMore = () => {
    if (loading || !pagination) return
    const { page, totalPages } = pagination
    if (page < totalPages) {
      dispatch(fetchOrderHistory({ page: page + 1, limit: 10 }))
    }
  }

  return { orders, loading, error, pagination, loadMore }
}