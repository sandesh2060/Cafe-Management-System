// src/store/slices/menuSlice.js
//
// FIXES:
//   • selectMenuLoading exported — useMenu.js imports this selector but it was
//     missing, causing useSelector(undefined) which throws in strict mode
//   • selectMenuLoaded added — true when items have been fetched at least once
//     (used by useMenu.js fetch guard instead of items.length === 0)
//   • selectLastFetched exported — wires up the lastFetched field that was
//     stored but never exposed; consumers can use it for stale-data checks

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit'
import { menuService } from '@modules/customer/services/menuService'

export const fetchMenu = createAsyncThunk(
  'menu/fetch',
  async (cafeId, { rejectWithValue }) => {
    try { return await menuService.getMenu(cafeId) }
    catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Menu fetch failed')
    }
  }
)

const initialState = {
  items:          [],
  categories:     [],
  activeCategory: 'all',
  searchQuery:    '',
  loading:        false,
  error:          null,
  lastFetched:    null,   // timestamp (ms) of the last successful fetch
}

const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    setActiveCategory: (state, { payload }) => { state.activeCategory = payload },
    setSearchQuery:    (state, { payload }) => { state.searchQuery    = payload },
    updateItemAvailability: (state, { payload: { itemId, isAvailable } }) => {
      const item = state.items.find((i) => i._id === itemId)
      if (item) item.isAvailable = isAvailable
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMenu.pending,  (state) => { state.loading = true; state.error = null })
      .addCase(fetchMenu.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload
      })
      .addCase(fetchMenu.fulfilled, (state, { payload }) => {
        state.loading = false
        // Controller returns { success, data: { items, categories, grouped, total } }
        // Guard both shapes: payload.data.items (new) or payload.items (old)
        const items        = payload?.data?.items ?? payload?.items ?? []
        state.items        = items
        state.categories   = ['all', ...new Set(items.map((i) => i.category))]
        state.lastFetched  = Date.now()
        state.error        = null
      })
  },
})

export const { setActiveCategory, setSearchQuery, updateItemAvailability } =
  menuSlice.actions

// ── Plain selectors ────────────────────────────────────────────────────────────
export const selectAllItems       = (s) => s.menu.items
export const selectCategories     = (s) => s.menu.categories
export const selectActiveCategory = (s) => s.menu.activeCategory
export const selectSearchQuery    = (s) => s.menu.searchQuery
export const selectMenuError      = (s) => s.menu.error
export const selectLastFetched    = (s) => s.menu.lastFetched

// FIX: these two were missing — useMenu.js imports selectMenuLoading
export const selectMenuLoading    = (s) => s.menu.loading
export const selectMenuLoaded     = (s) => s.menu.lastFetched !== null

// ── Memoized selector ──────────────────────────────────────────────────────────
// Returns new array only when inputs actually change — prevents the
// "returned a different result" warning from inline .filter() on every render
export const selectFilteredItems = createSelector(
  selectAllItems,
  selectActiveCategory,
  selectSearchQuery,
  (items, activeCategory, searchQuery) =>
    items.filter((item) => {
      const matchCat    = activeCategory === 'all' || item.category === activeCategory
      const matchSearch = !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchCat && matchSearch && item.isAvailable
    })
)

export default menuSlice.reducer