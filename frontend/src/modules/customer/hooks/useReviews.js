// src/modules/customer/hooks/useReviews.js
//
// Encapsulates all review fetch + submit logic for ItemDetailPage.
// Call useReviews(menuItemId, cafeId) → get back everything the page needs.
//
// CHANGES vs previous version:
//  • editReview payload now includes menuItemId (slice needs it to update correct slot)
//  • removeReview payload now includes menuItemId
//  • likeReview uses optimistic update (optimisticLike action) + server confirm
//  • All thunk args match the updated reviewSlice signatures

import { useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
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
  const dispatch   = useDispatch()
  const isGuest    = useSelector(selectIsGuest)

  const reviews    = useSelector(selectReviewsForItem(menuItemId))
  const summary    = useSelector(selectReviewSummary(menuItemId))
  const pagination = useSelector(selectReviewPagination(menuItemId))
  const loading    = useSelector(selectReviewsLoading(menuItemId))
  const hasMore    = useSelector(selectReviewsHasMore(menuItemId))
  const myReview   = useSelector(selectMyReview(menuItemId))
  const submitting = useSelector(selectSubmitting)
  const submitError= useSelector(selectSubmitError)

  // ── Initial fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!menuItemId) return
    dispatch(fetchReviews({ menuItemId, page: 1 }))
    if (!isGuest) dispatch(fetchMyReview(menuItemId))
  }, [menuItemId, isGuest, dispatch])

  // ── Load next page (infinite scroll / "Load more" button) ────────────────
  const loadMore = useCallback(() => {
    if (!hasMore || loading) return
    const nextPage = (pagination?.page ?? 1) + 1
    dispatch(fetchReviews({ menuItemId, page: nextPage }))
  }, [hasMore, loading, pagination, menuItemId, dispatch])

  // ── Submit — create new or edit existing ──────────────────────────────────
  const submit = useCallback(async ({ rating, text }) => {
    if (isGuest) {
      toast.error('Sign in to leave a review')
      return false
    }
    dispatch(clearSubmitError())

    if (myReview) {
      // ── EDIT existing review ─────────────────────────────────────────────
      const res = await dispatch(
        editReview({ reviewId: myReview._id, menuItemId, rating, text })
      )
      if (editReview.fulfilled.match(res)) {
        toast.success('Review updated! ✏️')
        return true
      } else {
        toast.error(res.payload ?? 'Failed to update review')
        return false
      }
    } else {
      // ── NEW review ───────────────────────────────────────────────────────
      const res = await dispatch(
        submitReview({ menuItemId, cafeId, rating, text })
      )
      if (submitReview.fulfilled.match(res)) {
        toast.success('Review submitted! 🎉')
        return true
      } else {
        toast.error(res.payload ?? 'Failed to submit review')
        return false
      }
    }
  }, [isGuest, myReview, menuItemId, cafeId, dispatch])

  // ── Delete own review ─────────────────────────────────────────────────────
  const remove = useCallback(async () => {
    if (!myReview) return
    const res = await dispatch(removeReview({ reviewId: myReview._id, menuItemId }))
    if (removeReview.fulfilled.match(res)) {
      toast.success('Review removed')
    } else {
      toast.error(res.payload ?? 'Failed to remove review')
    }
  }, [myReview, menuItemId, dispatch])

  // ── Like / unlike a review ────────────────────────────────────────────────
  // Optimistic update fires immediately; server response reconciles final state.
  // If server rejects, the slice reverts the optimistic change.
  const like = useCallback((reviewId) => {
    if (isGuest) {
      toast.error('Sign in to like reviews')
      return
    }
    // Optimistic flip
    dispatch(optimisticLike({ reviewId, menuItemId }))
    // Server call — reconciles on success, reverts on failure
    dispatch(likeReview({ reviewId, menuItemId }))
  }, [isGuest, menuItemId, dispatch])

  return {
    reviews,
    summary,
    pagination,
    loading,
    hasMore,
    myReview,
    submitting,
    submitError,
    loadMore,
    submit,
    remove,
    like,
  }
}

export default useReviews