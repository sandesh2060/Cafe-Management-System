// src/modules/customer/hooks/useMenu.js
//
// ✅ BRAND.cafeId — not direct import.meta.env access
// ✅ fetch guard — only fetches if menu is empty and not loading
// ✅ setCategory / setSearch are useCallback-wrapped for stable references

import { useEffect, useCallback }   from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchMenu,
  selectFilteredItems,
  selectCategories,
  selectMenuLoading,
  selectActiveCategory,
  setActiveCategory,
  setSearchQuery,
}                                   from '@store/slices/menuSlice'
import { BRAND }                    from '@shared/config/brand'

const CAFE_ID = BRAND.cafeId ?? ''

if (import.meta.env.DEV && !CAFE_ID) {
  console.warn('[useMenu] VITE_CAFE_ID is not set. Menu will not load in production.')
}

export const useMenu = () => {
  const dispatch       = useDispatch()
  const items          = useSelector(selectFilteredItems)
  const categories     = useSelector(selectCategories)
  const loading        = useSelector(selectMenuLoading)
  const activeCategory = useSelector(selectActiveCategory)

  useEffect(() => {
    // Only fetch if menu is empty and not already in flight
    if (!loading && items.length === 0 && CAFE_ID) {
      dispatch(fetchMenu(CAFE_ID))
    }
  }, [dispatch]) // eslint-disable-line react-hooks/exhaustive-deps

  const setCategory = useCallback(
    (cat) => dispatch(setActiveCategory(cat)),
    [dispatch]
  )

  const setSearch = useCallback(
    (q) => dispatch(setSearchQuery(q)),
    [dispatch]
  )

  return { items, categories, loading, activeCategory, setCategory, setSearch }
}