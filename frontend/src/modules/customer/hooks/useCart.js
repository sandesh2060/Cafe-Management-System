// src/modules/customer/hooks/useCart.js
//
// FIX: updateQuantity dispatched with { menuItemId, portionId, quantity }
// A previous session incorrectly changed this to { id, quantity } based on an
// unconfirmed assumption. The actual cartSlice reducer destructures
// { menuItemId, portionId, quantity } — dispatching { id, ... } meant
// menuItemId was always undefined, key lookup always failed, and quantity
// updates silently did nothing.
//
// FIX: removeItem now dispatches the object shape { menuItemId, portionId }
// instead of a raw composite key string, matching the documented reducer API.

import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  selectCartItems,
  selectCartCount,
  selectCartSubtotal,
  selectCartDiscount,
  selectCartTotal,
  addItem,
  removeItem,
  updateQuantity,
  clearCart,
} from '@store/slices/cartSlice'

export const useCart = () => {
  const dispatch = useDispatch()
  const items    = useSelector(selectCartItems)
  const count    = useSelector(selectCartCount)
  const subtotal = useSelector(selectCartSubtotal)
  const discount = useSelector(selectCartDiscount)
  const total    = useSelector(selectCartTotal)

  // addItem expects the full item object including portionId, portionLabel,
  // customizations — callers (ItemDetailPage, CartPage) must include those fields.
  const handleAddItem = useCallback(
    (item) => dispatch(addItem(item)),
    [dispatch]
  )

  // removeItem: pass { menuItemId, portionId? } — NOT a composite key string
  const handleRemoveItem = useCallback(
    (menuItemId, portionId = null) => dispatch(removeItem({ menuItemId, portionId })),
    [dispatch]
  )

  // updateQuantity: { menuItemId, portionId?, quantity }
  // This is the CORRECT shape matching the cartSlice reducer.
  const handleUpdateQty = useCallback(
    (menuItemId, quantity, portionId = null) =>
      dispatch(updateQuantity({ menuItemId, portionId, quantity })),
    [dispatch]
  )

  const handleClearCart = useCallback(
    () => dispatch(clearCart()),
    [dispatch]
  )

  return {
    items,
    count,
    subtotal,
    discount,
    total,
    addItem:    handleAddItem,
    removeItem: handleRemoveItem,   // (menuItemId, portionId?) → void
    updateQty:  handleUpdateQty,    // (menuItemId, quantity, portionId?) → void
    clearCart:  handleClearCart,
  }
}