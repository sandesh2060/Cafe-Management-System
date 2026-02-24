// src/modules/customer/hooks/useMenu.js
import { useEffect }        from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchMenu, selectFilteredItems, selectCategories,
         selectMenuLoading, selectActiveCategory,
         setActiveCategory, setSearchQuery } from '@store/slices/menuSlice'

const CAFE_ID = import.meta.env.VITE_CAFE_ID || 'demo'

export const useMenu = () => {
  const dispatch       = useDispatch()
  const items          = useSelector(selectFilteredItems)
  const categories     = useSelector(selectCategories)
  const loading        = useSelector(selectMenuLoading)
  const activeCategory = useSelector(selectActiveCategory)

  useEffect(() => {
    dispatch(fetchMenu(CAFE_ID))
  }, [dispatch])

  return {
    items,
    categories,
    loading,
    activeCategory,
    setCategory: (cat) => dispatch(setActiveCategory(cat)),
    setSearch:   (q)   => dispatch(setSearchQuery(q)),
  }
}