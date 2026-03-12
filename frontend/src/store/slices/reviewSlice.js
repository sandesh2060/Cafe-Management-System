// src/store/slices/reviewSlice.js
import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit'
import api from '@api/axios'
import { ENDPOINTS as EP } from '@api/endpoints'

// ── helpers ───────────────────────────────────────────────────────────────────

/** Recalculate avg + dist from a raw reviews array (client-side optimistic) */
const recalcSummary = (reviews) => {
  if (!reviews.length) return { avg: 0, total: 0, dist: [0, 0, 0, 0, 0] }
  const dist = [0, 0, 0, 0, 0]          // index 0 = 5-star, index 4 = 1-star
  reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[5 - r.rating]++ })
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
  return { avg: Math.round(avg * 10) / 10, total: reviews.length, dist }
}

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchReviews = createAsyncThunk(
  'review/fetchReviews',
  async ({ menuItemId, page = 1, limit = 10 }, { rejectWithValue }) => {
    try {
      // EP.REVIEW.LIST(menuItemId) → `/reviews/${menuItemId}`
      const res = await api.get(`${EP.REVIEW.LIST(menuItemId)}?page=${page}&limit=${limit}`)
      // Backend returns: { success, data: { reviews, summary, pagination } }
      // Guard both shapes
      const data       = res?.data ?? res
      const reviews    = data?.reviews    ?? []
      const summary    = data?.summary    ?? null
      const pagination = data?.pagination ?? { page, totalPages: 1, total: reviews.length }
      return { menuItemId, page, reviews, summary, pagination }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch reviews')
    }
  }
)

export const fetchMyReview = createAsyncThunk(
  'review/fetchMyReview',
  async (menuItemId, { rejectWithValue }) => {
    try {
      // EP.REVIEW.MY(menuItemId) → `/reviews/${menuItemId}/my`
      const res = await api.get(EP.REVIEW.MY(menuItemId))
      // Backend returns { success, data: review | null }
      const review = res?.data ?? res ?? null
      return { menuItemId, review }
    } catch (err) {
      // 404 = no review yet — that's fine, not an error
      if (err.response?.status === 404) return { menuItemId, review: null }
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch your review')
    }
  }
)

export const submitReview = createAsyncThunk(
  'review/submit',
  async ({ menuItemId, rating, text, cafeId }, { rejectWithValue }) => {
    try {
      // EP.REVIEW.CREATE(menuItemId) → `/reviews/${menuItemId}`  (POST)
      const res = await api.post(EP.REVIEW.CREATE(menuItemId), { rating, text, cafeId })
      const review = res?.data ?? res
      return { menuItemId, review }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to submit review')
    }
  }
)

export const editReview = createAsyncThunk(
  'review/edit',
  async ({ reviewId, menuItemId, rating, text }, { rejectWithValue }) => {
    try {
      // EP.REVIEW.UPDATE(reviewId) → `/reviews/review/${reviewId}`  (PUT on backend)
      // Use PUT to match review.routes.js  router.put('/review/:id', ...)
      const res = await api.put(EP.REVIEW.UPDATE(reviewId), { rating, text })
      const review = res?.data ?? res
      return { menuItemId, review }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update review')
    }
  }
)

export const removeReview = createAsyncThunk(
  'review/remove',
  async ({ reviewId, menuItemId }, { rejectWithValue }) => {
    try {
      // EP.REVIEW.DELETE(reviewId) → `/reviews/review/${reviewId}`  (DELETE)
      await api.delete(EP.REVIEW.DELETE(reviewId))
      return { reviewId, menuItemId }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete review')
    }
  }
)

export const likeReview = createAsyncThunk(
  'review/like',
  async ({ reviewId, menuItemId }, { rejectWithValue }) => {
    try {
      // EP.REVIEW.LIKE(reviewId) → `/reviews/review/${reviewId}/like`  (POST)
      const res = await api.post(EP.REVIEW.LIKE(reviewId))
      const data = res?.data ?? res
      return { reviewId, menuItemId, liked: data.liked, likes: data.likes }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to like review')
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

/**
 * State shape:
 * byItem: {
 *   [menuItemId]: {
 *     reviews:    Review[],
 *     summary:    { avg, total, dist[] } | null,
 *     pagination: { page, totalPages, total } | null,
 *     loading:    boolean,
 *     error:      string | null,
 *     hasMore:    boolean,
 *   }
 * }
 * myReviews:  { [menuItemId]: Review | null }
 * submitting:  boolean
 * submitError: string | null
 */

const emptySlot = () => ({
  reviews: [], summary: null, pagination: null,
  loading: false, error: null, hasMore: false,
})

const initialState = {
  byItem:      {},
  myReviews:   {},
  submitting:  false,
  submitError: null,
}

const reviewSlice = createSlice({
  name: 'review',
  initialState,
  reducers: {
    clearSubmitError: (state) => { state.submitError = null },
    // Optimistic like toggle (called before thunk resolves for instant feel)
    optimisticLike: (state, { payload: { reviewId, menuItemId } }) => {
      const slot = state.byItem[menuItemId]
      if (!slot) return
      const r = slot.reviews.find(r => r._id === reviewId)
      if (!r) return
      const wasLiked = r._liked ?? false
      r._liked = !wasLiked
      r.likes  = Math.max(0, (r.likes ?? 0) + (wasLiked ? -1 : 1))
    },
  },
  extraReducers: (builder) => {
    // ── fetchReviews ──────────────────────────────────────────────────────
    builder
      .addCase(fetchReviews.pending, (state, { meta }) => {
        const id = meta.arg.menuItemId
        if (!state.byItem[id]) state.byItem[id] = emptySlot()
        state.byItem[id].loading = true
        state.byItem[id].error   = null
      })
      .addCase(fetchReviews.rejected, (state, { meta, payload }) => {
        const id = meta.arg.menuItemId
        if (!state.byItem[id]) state.byItem[id] = emptySlot()
        state.byItem[id].loading = false
        state.byItem[id].error   = payload
      })
      .addCase(fetchReviews.fulfilled, (state, { payload }) => {
        const { menuItemId, page, reviews, summary, pagination } = payload
        if (!state.byItem[menuItemId]) state.byItem[menuItemId] = emptySlot()
        const slot       = state.byItem[menuItemId]
        slot.loading     = false
        slot.error       = null
        slot.summary     = summary ?? recalcSummary(page === 1 ? reviews : [...slot.reviews, ...reviews])
        slot.pagination  = pagination
        slot.reviews     = page === 1 ? reviews : [...slot.reviews, ...reviews]
        slot.hasMore     = pagination.page < pagination.totalPages
      })

    // ── fetchMyReview ─────────────────────────────────────────────────────
    builder
      .addCase(fetchMyReview.fulfilled, (state, { payload }) => {
        state.myReviews[payload.menuItemId] = payload.review
      })
      // Silently ignore fetchMyReview rejection (404 is handled above → fulfilled with null)

    // ── submitReview ──────────────────────────────────────────────────────
    builder
      .addCase(submitReview.pending, (state) => {
        state.submitting  = true
        state.submitError = null
      })
      .addCase(submitReview.rejected, (state, { payload }) => {
        state.submitting  = false
        state.submitError = payload
      })
      .addCase(submitReview.fulfilled, (state, { payload }) => {
        state.submitting  = false
        state.submitError = null
        const { menuItemId, review } = payload
        if (!state.byItem[menuItemId]) state.byItem[menuItemId] = emptySlot()
        const slot = state.byItem[menuItemId]
        // Prepend to list (newest first)
        slot.reviews = [review, ...slot.reviews]
        // Recalculate summary from live data
        slot.summary = recalcSummary(slot.reviews)
        state.myReviews[menuItemId] = review
      })

    // ── editReview ────────────────────────────────────────────────────────
    builder
      .addCase(editReview.pending, (state) => {
        state.submitting  = true
        state.submitError = null
      })
      .addCase(editReview.rejected, (state, { payload }) => {
        state.submitting  = false
        state.submitError = payload
      })
      .addCase(editReview.fulfilled, (state, { payload }) => {
        state.submitting = false
        const { menuItemId, review } = payload
        if (!state.byItem[menuItemId]) return
        const slot = state.byItem[menuItemId]
        const idx  = slot.reviews.findIndex(r => r._id === review._id)
        if (idx !== -1) slot.reviews[idx] = review
        // Recalculate summary
        slot.summary = recalcSummary(slot.reviews)
        state.myReviews[menuItemId] = review
      })

    // ── removeReview ──────────────────────────────────────────────────────
    builder
      .addCase(removeReview.fulfilled, (state, { payload }) => {
        const { reviewId, menuItemId } = payload
        if (!state.byItem[menuItemId]) return
        const slot    = state.byItem[menuItemId]
        slot.reviews  = slot.reviews.filter(r => r._id !== reviewId)
        slot.summary  = recalcSummary(slot.reviews)
        state.myReviews[menuItemId] = null
      })

    // ── likeReview ────────────────────────────────────────────────────────
    // Server confirms the final liked/likes state — sync it in
    builder
      .addCase(likeReview.fulfilled, (state, { payload }) => {
        const { reviewId, menuItemId, liked, likes } = payload
        if (!state.byItem[menuItemId]) return
        const r = state.byItem[menuItemId].reviews.find(r => r._id === reviewId)
        if (r) { r.likes = likes; r._liked = liked }
      })
      // On like failure — revert optimistic update
      .addCase(likeReview.rejected, (state, { meta }) => {
        const { reviewId, menuItemId } = meta.arg
        if (!state.byItem[menuItemId]) return
        const r = state.byItem[menuItemId].reviews.find(r => r._id === reviewId)
        if (!r) return
        // Revert: flip back
        const wasLiked = r._liked ?? false
        r._liked = !wasLiked
        r.likes  = Math.max(0, (r.likes ?? 0) + (wasLiked ? -1 : 1))
      })
  },
})

export const { clearSubmitError, optimisticLike } = reviewSlice.actions

// ── Selectors ─────────────────────────────────────────────────────────────────
//
// Parameterized selectors MUST be memoized with createSelector — otherwise
// useSelector sees a new function reference on every render and fires the
// "Selector returned a different result" warning + unnecessary re-renders.
// We cache one selector per menuItemId so they stay stable across renders.
//
const _itemSlotCache  = {}
const _myReviewCache  = {}

const selectReviewState = (s) => s.review

export const selectReviewsForItem = (id) => {
  if (!_itemSlotCache[id + '_reviews']) {
    _itemSlotCache[id + '_reviews'] = createSelector(
      selectReviewState,
      (r) => r.byItem[id]?.reviews ?? []
    )
  }
  return _itemSlotCache[id + '_reviews']
}

export const selectReviewSummary = (id) => {
  if (!_itemSlotCache[id + '_summary']) {
    _itemSlotCache[id + '_summary'] = createSelector(
      selectReviewState,
      (r) => r.byItem[id]?.summary ?? null
    )
  }
  return _itemSlotCache[id + '_summary']
}

export const selectReviewPagination = (id) => {
  if (!_itemSlotCache[id + '_pagination']) {
    _itemSlotCache[id + '_pagination'] = createSelector(
      selectReviewState,
      (r) => r.byItem[id]?.pagination ?? null
    )
  }
  return _itemSlotCache[id + '_pagination']
}

export const selectReviewsLoading = (id) => {
  if (!_itemSlotCache[id + '_loading']) {
    _itemSlotCache[id + '_loading'] = createSelector(
      selectReviewState,
      (r) => r.byItem[id]?.loading ?? false
    )
  }
  return _itemSlotCache[id + '_loading']
}

export const selectReviewsHasMore = (id) => {
  if (!_itemSlotCache[id + '_hasMore']) {
    _itemSlotCache[id + '_hasMore'] = createSelector(
      selectReviewState,
      (r) => r.byItem[id]?.hasMore ?? false
    )
  }
  return _itemSlotCache[id + '_hasMore']
}

export const selectMyReview = (id) => {
  if (!_myReviewCache[id]) {
    _myReviewCache[id] = createSelector(
      selectReviewState,
      (r) => r.myReviews[id] ?? null
    )
  }
  return _myReviewCache[id]
}

export const selectSubmitting  = (s) => s.review.submitting
export const selectSubmitError = (s) => s.review.submitError

export default reviewSlice.reducer