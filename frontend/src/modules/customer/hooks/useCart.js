// src/modules/customer/hooks/useCart.js
import { useDispatch, useSelector } from 'react-redux'
import {
  selectCartItems, selectCartCount, selectCartSubtotal,
  selectCartDiscount, selectCartTotal,
  addItem, removeItem, updateQuantity, clearCart,
} from '@store/slices/cartSlice'

export const useCart = () => {
  const dispatch  = useDispatch()
  const items     = useSelector(selectCartItems)
  const count     = useSelector(selectCartCount)
  const subtotal  = useSelector(selectCartSubtotal)
  const discount  = useSelector(selectCartDiscount)
  const total     = useSelector(selectCartTotal)

  return {
    items, count, subtotal, discount, total,
    addItem:      (item)   => dispatch(addItem(item)),
    removeItem:   (id)     => dispatch(removeItem(id)),
    updateQty:    (id, q)  => dispatch(updateQuantity({ menuItemId: id, quantity: q })),
    clearCart:    ()       => dispatch(clearCart()),
  }
}