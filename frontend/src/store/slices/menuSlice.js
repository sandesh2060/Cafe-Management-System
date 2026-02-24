// src/store/slices/menuSlice.js
import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit'
import { menuService } from '@modules/customer/services/menuService'

export const fetchMenu = createAsyncThunk(
  'menu/fetch',
  async (cafeId, { rejectWithValue }) => {
    try { return await menuService.getMenu(cafeId) }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'Menu fetch failed') }
  }
)

const initialState = {
  items:          [],
  categories:     [],
  activeCategory: 'all',
  searchQuery:    '',
  loading:        false,
  error:          null,
  lastFetched:    null,
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
      .addCase(fetchMenu.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(fetchMenu.rejected,  (state, { payload }) => { state.loading = false; state.error = payload })
      .addCase(fetchMenu.fulfilled, (state, { payload }) => {
        state.loading    = false
        // Controller returns { success, data: { items, categories, grouped, total } }
        // Guard both shapes: payload.data.items (new controller) or payload.items (old)
        const items      = payload?.data?.items ?? payload?.items ?? []
        state.items      = items
        state.categories = ['all', ...new Set(items.map((i) => i.category))]
        state.lastFetched = Date.now()
      })
  },
})

export const { setActiveCategory, setSearchQuery, updateItemAvailability } = menuSlice.actions

// ── Plain selectors (primitives / stable refs — safe without memoization) ─────
export const selectAllItems       = (s) => s.menu.items
export const selectCategories     = (s) => s.menu.categories
export const selectActiveCategory = (s) => s.menu.activeCategory
export const selectSearchQuery    = (s) => s.menu.searchQuery

// ── Memoized selector — returns new array only when inputs actually change ────
// Previously this ran .filter() inline on every render, producing a new array
// reference each time and causing the "returned a different result" warning.
export const selectFilteredItems = createSelector(
  selectAllItems,        // input 1
  selectActiveCategory,  // input 2
  selectSearchQuery,     // input 3
  (items, activeCategory, searchQuery) =>
    items.filter((item) => {
      const matchCat    = activeCategory === 'all' || item.category === activeCategory
      const matchSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchCat && matchSearch && item.isAvailable
    })
)

export default menuSlice.reducer