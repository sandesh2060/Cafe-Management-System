// src/modules/customer/hooks/useMenu.js
//
// ─── CHANGES FROM ORIGINAL ────────────────────────────────────────────────────
// 1. cafeId now reads from venueSlice (selectVenueCafeId) with BRAND fallback
//    — fixes multi-tenant: different cafes get different menus
// 2. Fetch guard uses the resolved cafeId (not hardcoded BRAND.cafeId)
// All other logic unchanged.
// ─────────────────────────────────────────────────────────────────────────────

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
import { selectVenueCafeId }        from '@store/slices/venueSlice'   // ★ NEW
import { BRAND }                    from '@shared/config/brand'

export const useMenu = () => {
  const dispatch       = useDispatch()
  const items          = useSelector(selectFilteredItems)
  const categories     = useSelector(selectCategories)
  const loading        = useSelector(selectMenuLoading)
  const activeCategory = useSelector(selectActiveCategory)

  // ★ CHANGED: read cafeId dynamically from venue context
  const venueCafeId = useSelector(selectVenueCafeId)
  const CAFE_ID     = venueCafeId ?? BRAND.cafeId ?? ''

  if (import.meta.env.DEV && !CAFE_ID) {
    console.warn('[useMenu] No cafeId found in venueSlice or BRAND. Menu will not load.')
  }

  useEffect(() => {
    if (!loading && items.length === 0 && CAFE_ID) {
      dispatch(fetchMenu(CAFE_ID))
    }
  }, [dispatch, CAFE_ID]) // eslint-disable-line react-hooks/exhaustive-deps

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