// src/store/slices/gallerySlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '@api/axios'

// ── Thunks ────────────────────────────────────────────────────────────────────
export const fetchPhotos = createAsyncThunk(
  'gallery/fetchPhotos',
  async ({ page = 1, limit = 20, category = 'all' } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ page, limit })
      if (category !== 'all') params.set('category', category)
      const res  = await api.get(`/gallery?${params}`)
      const data = res?.data ?? res
      return {
        page,
        photos:     data?.photos     ?? [],
        pagination: data?.pagination ?? { page, totalPages: 1, total: 0 },
      }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to fetch gallery')
    }
  }
)

export const fetchCategories = createAsyncThunk(
  'gallery/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const res  = await api.get('/gallery/categories')
      const data = res?.data ?? res
      return data?.categories ?? []
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to fetch categories')
    }
  }
)

export const uploadPhoto = createAsyncThunk(
  'gallery/uploadPhoto',
  async ({ image, caption, category, tags, isFeatured }, { rejectWithValue }) => {
    try {
      const form = new FormData()
      form.append('image', image)
      form.append('caption', caption ?? '')
      form.append('category', category ?? 'other')
      form.append('tags', tags ?? '')
      form.append('isFeatured', isFeatured ? 'true' : 'false')
      const res = await api.post('/gallery', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      return res?.data ?? res
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to upload photo')
    }
  }
)

export const deletePhoto = createAsyncThunk(
  'gallery/deletePhoto',
  async (photoId, { rejectWithValue }) => {
    try {
      await api.delete(`/gallery/${photoId}`)
      return photoId
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to delete photo')
    }
  }
)

export const likePhoto = createAsyncThunk(
  'gallery/likePhoto',
  async (photoId, { rejectWithValue }) => {
    try {
      const res  = await api.post(`/gallery/${photoId}/like`)
      const data = res?.data ?? res
      return { photoId, liked: data.liked, likes: data.likes }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to like photo')
    }
  }
)

export const updatePhoto = createAsyncThunk(
  'gallery/updatePhoto',
  async ({ photoId, ...fields }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/gallery/${photoId}`, fields)
      return res?.data ?? res
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to update photo')
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────
const initialState = {
  photos:          [],
  categories:      [],
  pagination:      null,
  loading:         false,
  categoriesLoading: false,
  uploading:       false,
  error:           null,
  uploadError:     null,
  hasMore:         false,
  activeCategory:  'all',
}

const gallerySlice = createSlice({
  name: 'gallery',
  initialState,
  reducers: {
    setActiveCategory: (s, { payload }) => { s.activeCategory = payload },
    clearUploadError:  (s) => { s.uploadError = null },
    optimisticLike: (s, { payload: photoId }) => {
      const p = s.photos.find(p => p._id === photoId)
      if (!p) return
      const was = p._liked ?? false
      p._liked = !was
      p.likes  = Math.max(0, (p.likes ?? 0) + (was ? -1 : 1))
    },
  },
  extraReducers: (b) => {
    b
      // fetchPhotos
      .addCase(fetchPhotos.pending,   (s) => { s.loading = true;  s.error = null })
      .addCase(fetchPhotos.rejected,  (s, { payload }) => { s.loading = false; s.error = payload })
      .addCase(fetchPhotos.fulfilled, (s, { payload }) => {
        s.loading    = false
        s.photos     = payload.page === 1 ? payload.photos : [...s.photos, ...payload.photos]
        s.pagination = payload.pagination
        s.hasMore    = payload.pagination.page < payload.pagination.totalPages
      })

      // fetchCategories
      .addCase(fetchCategories.pending,   (s) => { s.categoriesLoading = true })
      .addCase(fetchCategories.fulfilled, (s, { payload }) => { s.categoriesLoading = false; s.categories = payload })
      .addCase(fetchCategories.rejected,  (s) => { s.categoriesLoading = false })

      // uploadPhoto
      .addCase(uploadPhoto.pending,   (s) => { s.uploading = true;  s.uploadError = null })
      .addCase(uploadPhoto.rejected,  (s, { payload }) => { s.uploading = false; s.uploadError = payload })
      .addCase(uploadPhoto.fulfilled, (s, { payload }) => {
        s.uploading = false
        s.photos    = [payload, ...s.photos]
      })

      // deletePhoto
      .addCase(deletePhoto.fulfilled, (s, { payload: photoId }) => {
        s.photos = s.photos.filter(p => p._id !== photoId)
      })

      // likePhoto
      .addCase(likePhoto.fulfilled, (s, { payload }) => {
        const p = s.photos.find(p => p._id === payload.photoId)
        if (p) { p.likes = payload.likes; p._liked = payload.liked }
      })
      .addCase(likePhoto.rejected, (s, { meta }) => {
        const p = s.photos.find(p => p._id === meta.arg)
        if (!p) return
        const was = p._liked ?? false
        p._liked = !was
        p.likes  = Math.max(0, (p.likes ?? 0) + (was ? -1 : 1))
      })

      // updatePhoto
      .addCase(updatePhoto.fulfilled, (s, { payload }) => {
        const idx = s.photos.findIndex(p => p._id === payload._id)
        if (idx !== -1) s.photos[idx] = payload
      })
  },
})

export const { setActiveCategory, clearUploadError, optimisticLike: optimisticLikePhoto } = gallerySlice.actions

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectPhotos           = (s) => s.gallery.photos
export const selectCategories       = (s) => s.gallery.categories
export const selectGalleryPagination = (s) => s.gallery.pagination
export const selectGalleryLoading   = (s) => s.gallery.loading
export const selectGalleryHasMore   = (s) => s.gallery.hasMore
export const selectGalleryUploading = (s) => s.gallery.uploading
export const selectUploadError      = (s) => s.gallery.uploadError
export const selectActiveCategory   = (s) => s.gallery.activeCategory

export default gallerySlice.reducer