// src/store/slices/menuSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { menuService } from '@modules/customer/services/menuService'

export const fetchMenu = createAsyncThunk(
  'menu/fetch',
  async (cafeId, { rejectWithValue }) => {
    try { return await menuService.getMenu(cafeId) }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'Menu fetch failed') }
  }
)

const initialState = {
  items:        [],
  categories:   [],
  activeCategory: 'all',
  searchQuery:  '',
  loading:      false,
  error:        null,
  lastFetched:  null,
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
      .addCase(fetchMenu.pending,   (state) => { state.loading = true })
      .addCase(fetchMenu.rejected,  (state, { payload }) => { state.loading = false; state.error = payload })
      .addCase(fetchMenu.fulfilled, (state, { payload }) => {
        state.loading     = false
        state.items       = payload.items
        state.categories  = ['all', ...new Set(payload.items.map((i) => i.category))]
        state.lastFetched = Date.now()
      })
  },
})

export const { setActiveCategory, setSearchQuery, updateItemAvailability } = menuSlice.actions

export const selectAllItems        = (s) => s.menu.items
export const selectCategories      = (s) => s.menu.categories
export const selectActiveCategory  = (s) => s.menu.activeCategory
export const selectSearchQuery     = (s) => s.menu.searchQuery
export const selectFilteredItems   = (s) => {
  const { items, activeCategory, searchQuery } = s.menu
  return items.filter((item) => {
    const matchCat   = activeCategory === 'all' || item.category === activeCategory
    const matchSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCat && matchSearch && item.isAvailable
  })
}

export default menuSlice.reducer