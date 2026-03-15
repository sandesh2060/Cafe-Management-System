// src/modules/customer/hooks/useMenu.js
//
// FIXES (this pass):
//  1. fetchMenu is now guarded — only dispatches if the menu hasn't been loaded
//     yet (items.length === 0 && !loading). Prevents a full re-fetch every time
//     a component using this hook mounts (e.g. navigating away and back).
//  2. Missing VITE_CAFE_ID now logs a console.warn in dev — matches the guard
//     added to MenuPage in a previous pass. Consistent signal for devs.
//  3. setCategory and setSearch are useCallback-wrapped for stable references —
//     inline arrow functions in the return object create new refs every render,
//     which breaks useCallback dep arrays in consumers.

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

const CAFE_ID = import.meta.env.VITE_CAFE_ID || ''

// FIX: dev warning — mirrors the guard in MenuPage.jsx
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
    // FIX: guard — only fetch if menu is empty and not already loading.
    // Prevents re-fetch on every mount when menu is already in Redux state.
    if (!loading && items.length === 0 && CAFE_ID) {
      dispatch(fetchMenu(CAFE_ID))
    }
  }, [dispatch]) // eslint-disable-line react-hooks/exhaustive-deps
  // Intentionally omit items/loading from deps — we only want to check on mount.
  // fetchMenu thunk itself should be idempotent (check its own loading state).

  // FIX: stable references — won't trigger unnecessary re-renders in consumers
  const setCategory = useCallback(
    (cat) => dispatch(setActiveCategory(cat)),
    [dispatch]
  )

  const setSearch = useCallback(
    (q) => dispatch(setSearchQuery(q)),
    [dispatch]
  )

  return {
    items,
    categories,
    loading,
    activeCategory,
    setCategory,
    setSearch,
  }
}