// src/modules/customer/hooks/useReviews.js
//
// FIXES:
//   • Factory selectors (selectReviewsForItem, selectMyReview, etc.) are now
//     wrapped in useMemo keyed on menuItemId — calling selectReviewsForItem(id)
//     inside useSelector creates a new function reference on every render,
//     bypassing reselect memoization and causing unnecessary re-renders.
//   • All other logic unchanged — thunk args, optimistic like, toast messages
//     all preserved from the reviewed version.

import { useEffect, useCallback, useMemo } from 'react'
import { useDispatch, useSelector }         from 'react-redux'
import toast                                from 'react-hot-toast'
import {
  fetchReviews,
  fetchMyReview,
  submitReview,
  editReview,
  removeReview,
  likeReview,
  optimisticLike,
  clearSubmitError,
  selectReviewsForItem,
  selectReviewSummary,
  selectReviewPagination,
  selectReviewsLoading,
  selectReviewsHasMore,
  selectMyReview,
  selectSubmitting,
  selectSubmitError,
} from '@store/slices/reviewSlice'
import { selectIsGuest } from '@store/slices/authSlice'

const useReviews = (menuItemId, cafeId) => {
  const dispatch = useDispatch()
  const isGuest  = useSelector(selectIsGuest)

  // FIX: memoize factory selectors so useSelector receives a stable function
  // reference — without this, a new selector is created on every render,
  // reselect can't cache it, and the component re-renders on every state change
  const selectReviews    = useMemo(() => selectReviewsForItem(menuItemId),    [menuItemId])
  const selectSummary    = useMemo(() => selectReviewSummary(menuItemId),     [menuItemId])
  const selectPagination = useMemo(() => selectReviewPagination(menuItemId),  [menuItemId])
  const selectLoading    = useMemo(() => selectReviewsLoading(menuItemId),    [menuItemId])
  const selectHasMore    = useMemo(() => selectReviewsHasMore(menuItemId),    [menuItemId])
  const selectMine       = useMemo(() => selectMyReview(menuItemId),          [menuItemId])

  const reviews    = useSelector(selectReviews)
  const summary    = useSelector(selectSummary)
  const pagination = useSelector(selectPagination)
  const loading    = useSelector(selectLoading)
  const hasMore    = useSelector(selectHasMore)
  const myReview   = useSelector(selectMine)
  const submitting = useSelector(selectSubmitting)
  const submitError = useSelector(selectSubmitError)

  // ── Initial fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!menuItemId) return
    dispatch(fetchReviews({ menuItemId, page: 1 }))
    if (!isGuest) dispatch(fetchMyReview(menuItemId))
  }, [menuItemId, isGuest, dispatch])

  // ── Load next page ─────────────────────────────────────────────────────────
  const loadMore = useCallback(() => {
    if (!hasMore || loading) return
    const nextPage = (pagination?.page ?? 1) + 1
    dispatch(fetchReviews({ menuItemId, page: nextPage }))
  }, [hasMore, loading, pagination, menuItemId, dispatch])

  // ── Submit — create new or edit existing ───────────────────────────────────
  const submit = useCallback(async ({ rating, text }) => {
    if (isGuest) {
      toast.error('Sign in to leave a review')
      return false
    }
    dispatch(clearSubmitError())

    if (myReview) {
      const res = await dispatch(
        editReview({ reviewId: myReview._id, menuItemId, rating, text })
      )
      if (editReview.fulfilled.match(res)) {
        toast.success('Review updated! ✏️')
        return true
      }
      toast.error(res.payload ?? 'Failed to update review')
      return false
    } else {
      const res = await dispatch(
        submitReview({ menuItemId, cafeId, rating, text })
      )
      if (submitReview.fulfilled.match(res)) {
        toast.success('Review submitted! 🎉')
        return true
      }
      toast.error(res.payload ?? 'Failed to submit review')
      return false
    }
  }, [isGuest, myReview, menuItemId, cafeId, dispatch])

  // ── Delete own review ──────────────────────────────────────────────────────
  const remove = useCallback(async () => {
    if (!myReview) return
    const res = await dispatch(removeReview({ reviewId: myReview._id, menuItemId }))
    if (removeReview.fulfilled.match(res)) {
      toast.success('Review removed')
    } else {
      toast.error(res.payload ?? 'Failed to remove review')
    }
  }, [myReview, menuItemId, dispatch])

  // ── Like / unlike ──────────────────────────────────────────────────────────
  const like = useCallback((reviewId) => {
    if (isGuest) {
      toast.error('Sign in to like reviews')
      return
    }
    dispatch(optimisticLike({ reviewId, menuItemId }))
    dispatch(likeReview({ reviewId, menuItemId }))
  }, [isGuest, menuItemId, dispatch])

  return {
    reviews, summary, pagination,
    loading, hasMore,
    myReview, submitting, submitError,
    loadMore, submit, remove, like,
  }
}

export default useReviews