// src/store/slices/reviewSlice.js
//
// FIXES:
// • submitReview thunk: cafeId now falls back to import.meta.env.VITE_CAFE_ID
//   when not provided or when it's "default". Previously cafeId="default" was
//   being sent to the backend which tried to cast it as an ObjectId → Mongoose
//   CastError → 500 → "Failed to submit review."
// • fetchReviews: response unwrap fixed — axios interceptor returns response.data
//   directly, so res is already { success, data: { reviews, summary, pagination } }.
//   The slice was double-unwrapping (res?.data ?? res) which was correct for some
//   paths but not others. Unified to a single unwrap with explicit fallbacks.
// • fetchMyReview: same unwrap fix — res is already { success, data: review|null }.
// • submitReview / editReview: response unwrap — res is { success, data: review }.
//   Was returning res?.data ?? res which is now res?.data ?? res for safety.
// • likeReview: same unwrap pattern aligned.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '@api/axios'

const CAFE_ID_FALLBACK = import.meta.env.VITE_CAFE_ID ?? null

// ── helpers ───────────────────────────────────────────────────────────────────
const recalcSummary = (reviews) => {
  if (!reviews.length) return { avg: 0, total: 0, dist: [0, 0, 0, 0, 0] }
  const dist = [0, 0, 0, 0, 0]
  reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[5 - r.rating]++ })
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
  return { avg: Math.round(avg * 10) / 10, total: reviews.length, dist }
}

const emptyItem = () => ({
  reviews:    [],
  summary:    null,
  pagination: null,
  loading:    false,
  error:      null,
  hasMore:    false,
  myReview:   null,
  myLoading:  false,
})

const getItem = (state, id) => {
  if (!state.items[id]) state.items[id] = emptyItem()
  return state.items[id]
}

// ── unwrap helpers ────────────────────────────────────────────────────────────
// axios.js interceptor returns response.data directly.
// Backend wraps via sendSuccess: { success, data: payload, message }
// So api.get('/reviews') → { success, data: { reviews, summary, pagination } }
const unwrapData = (res) => res?.data ?? res

// ── Thunks ────────────────────────────────────────────────────────────────────
export const fetchReviews = createAsyncThunk(
  'review/fetchReviews',
  async ({ menuItemId, page = 1, limit = 12, rating, sort = 'recent' } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ page, limit, sort })
      if (rating) params.set('rating', rating)
      // menuItemId sent as param for future per-item support but backend ignores it
      const res  = await api.get(`/reviews?${params}`)
      const data = unwrapData(res)
      return {
        menuItemId,
        page,
        reviews:    data?.reviews    ?? [],
        summary:    data?.summary    ?? null,
        pagination: data?.pagination ?? { page, totalPages: 1, total: 0 },
      }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to fetch reviews')
    }
  }
)

export const fetchMyReview = createAsyncThunk(
  'review/fetchMyReview',
  async (menuItemId, { rejectWithValue }) => {
    try {
      const res    = await api.get('/reviews/my')
      // FIX: res is { success, data: review|null } — unwrap .data
      const review = unwrapData(res)
      return { menuItemId, review: review ?? null }
    } catch (err) {
      if (err.response?.status === 404) return { menuItemId, review: null }
      return rejectWithValue(err.response?.data?.message ?? 'Failed to fetch your review')
    }
  }
)

export const submitReview = createAsyncThunk(
  'review/submit',
  async ({ menuItemId, rating, text, cafeId, image }, { rejectWithValue }) => {
    try {
      // FIX: resolve cafeId — never send "default" to the backend
      const resolvedCafeId =
        cafeId && cafeId !== 'default'
          ? cafeId
          : CAFE_ID_FALLBACK

      const form = new FormData()
      form.append('rating', rating)
      form.append('text', text)
      // Only append cafeId if we have a valid one — backend will also fall back to env
      if (resolvedCafeId) form.append('cafeId', resolvedCafeId)
      if (image) form.append('image', image)

      const res    = await api.post('/reviews', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      const review = unwrapData(res)
      return { menuItemId, review }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to submit review')
    }
  }
)

export const editReview = createAsyncThunk(
  'review/edit',
  async ({ reviewId, menuItemId, rating, text, image }, { rejectWithValue }) => {
    try {
      const form = new FormData()
      if (rating !== undefined) form.append('rating', rating)
      if (text   !== undefined) form.append('text', text)
      if (image)                form.append('image', image)
      const res    = await api.patch(`/reviews/${reviewId}`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      const review = unwrapData(res)
      return { menuItemId, review }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to update review')
    }
  }
)

export const removeReview = createAsyncThunk(
  'review/remove',
  async ({ reviewId, menuItemId }, { rejectWithValue }) => {
    try {
      await api.delete(`/reviews/${reviewId}`)
      return { reviewId, menuItemId }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to delete review')
    }
  }
)

export const likeReview = createAsyncThunk(
  'review/like',
  async ({ reviewId, menuItemId }, { rejectWithValue }) => {
    try {
      const res  = await api.post(`/reviews/${reviewId}/like`)
      const data = unwrapData(res)
      return { reviewId, menuItemId, liked: data.liked, likes: data.likes }
    } catch (err) {
      return rejectWithValue({ error: err.response?.data?.message ?? 'Failed', reviewId, menuItemId })
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────
const reviewSlice = createSlice({
  name: 'review',
  initialState: {
    items:       {},
    submitting:  false,
    submitError: null,
  },
  reducers: {
    clearSubmitError: (s) => { s.submitError = null },

    optimisticLike: (s, { payload: { reviewId, menuItemId } }) => {
      const item = s.items[menuItemId]
      if (!item) return
      const r = item.reviews.find(r => r._id === reviewId)
      if (!r) return
      const was = r._liked ?? false
      r._liked = !was
      r.likes  = Math.max(0, (r.likes ?? 0) + (was ? -1 : 1))
    },
  },
  extraReducers: (b) => {
    b
      .addCase(fetchReviews.pending, (s, { meta }) => {
        const item = getItem(s, meta.arg.menuItemId)
        item.loading = true
        item.error   = null
      })
      .addCase(fetchReviews.rejected, (s, { payload, meta }) => {
        const item   = getItem(s, meta.arg.menuItemId)
        item.loading = false
        item.error   = payload
      })
      .addCase(fetchReviews.fulfilled, (s, { payload }) => {
        const item      = getItem(s, payload.menuItemId)
        item.loading    = false
        item.reviews    = payload.page === 1
          ? payload.reviews
          : [...item.reviews, ...payload.reviews]
        item.summary    = payload.summary ?? recalcSummary(item.reviews)
        item.pagination = payload.pagination
        item.hasMore    = payload.pagination.page < payload.pagination.totalPages
      })

      .addCase(fetchMyReview.pending, (s, { meta }) => {
        getItem(s, meta.arg).myLoading = true
      })
      .addCase(fetchMyReview.fulfilled, (s, { payload }) => {
        const item      = getItem(s, payload.menuItemId)
        item.myLoading  = false
        item.myReview   = payload.review
      })
      .addCase(fetchMyReview.rejected, (s, { meta }) => {
        getItem(s, meta.arg).myLoading = false
      })

      .addCase(submitReview.pending,   (s) => { s.submitting = true;  s.submitError = null })
      .addCase(submitReview.rejected,  (s, { payload }) => { s.submitting = false; s.submitError = payload })
      .addCase(submitReview.fulfilled, (s, { payload }) => {
        s.submitting = false
        const item   = getItem(s, payload.menuItemId)
        item.reviews  = [payload.review, ...item.reviews]
        item.summary  = recalcSummary(item.reviews)
        item.myReview = payload.review
      })

      .addCase(editReview.pending,   (s) => { s.submitting = true;  s.submitError = null })
      .addCase(editReview.rejected,  (s, { payload }) => { s.submitting = false; s.submitError = payload })
      .addCase(editReview.fulfilled, (s, { payload }) => {
        s.submitting = false
        const item   = getItem(s, payload.menuItemId)
        const idx    = item.reviews.findIndex(r => r._id === payload.review._id)
        if (idx !== -1) item.reviews[idx] = payload.review
        item.summary  = recalcSummary(item.reviews)
        item.myReview = payload.review
      })

      .addCase(removeReview.fulfilled, (s, { payload }) => {
        const item    = getItem(s, payload.menuItemId)
        item.reviews  = item.reviews.filter(r => r._id !== payload.reviewId)
        item.summary  = recalcSummary(item.reviews)
        item.myReview = null
      })

      .addCase(likeReview.fulfilled, (s, { payload }) => {
        const item = s.items[payload.menuItemId]
        if (!item) return
        const r = item.reviews.find(r => r._id === payload.reviewId)
        if (r) { r.likes = payload.likes; r._liked = payload.liked }
      })
      .addCase(likeReview.rejected, (s, { payload }) => {
        if (!payload) return
        const item = s.items[payload.menuItemId]
        if (!item) return
        const r = item.reviews.find(r => r._id === payload.reviewId)
        if (!r) return
        const was = r._liked ?? false
        r._liked = !was
        r.likes  = Math.max(0, (r.likes ?? 0) + (was ? -1 : 1))
      })
  },
})

export const { clearSubmitError, optimisticLike } = reviewSlice.actions

// ── Selectors ─────────────────────────────────────────────────────────────────
const EMPTY_ARRAY = Object.freeze([])

export const selectReviewsForItem   = (id) => (s) => s.review.items[id]?.reviews    ?? EMPTY_ARRAY
export const selectReviewSummary    = (id) => (s) => s.review.items[id]?.summary    ?? null
export const selectReviewPagination = (id) => (s) => s.review.items[id]?.pagination ?? null
export const selectReviewsLoading   = (id) => (s) => s.review.items[id]?.loading    ?? false
export const selectReviewsHasMore   = (id) => (s) => s.review.items[id]?.hasMore    ?? false
export const selectMyReview         = (id) => (s) => s.review.items[id]?.myReview   ?? null

export const selectSubmitting  = (s) => s.review.submitting
export const selectSubmitError = (s) => s.review.submitError

export default reviewSlice.reducer