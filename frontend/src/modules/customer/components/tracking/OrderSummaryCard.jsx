// src/modules/customer/components/tracking/OrderSummaryCard.jsx
//
// FIXES:
// • Removed unused COLORS import (was imported, never used — dead import)
// • item.emoji fallback to '🍽️' so rows don't render blank when emoji is missing
// • item.portionLabel shown when present (cart items carry portionLabel)

const OrderSummaryCard = ({ order }) => {
  if (!order?.items?.length) return null

  return (
    <div className="card space-y-3">
      <h3 className="font-bold text-brew text-sm">Your Order</h3>

      <div className="space-y-2">
        {order.items.map((item, i) => (
          <div key={item._id ?? item.menuItemId ?? i} className="flex items-center gap-3">
            {/* Emoji / thumb */}
            <span className="text-xl flex-shrink-0">
              {item.emoji || '🍽️'}
            </span>

            {/* Name + portion + notes */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-brew truncate">{item.name}</p>
              {item.portionLabel && (
                <p className="text-xs font-semibold text-saffron truncate">{item.portionLabel}</p>
              )}
              {item.notes && (
                <p className="text-xs text-brew-soft truncate">Note: {item.notes}</p>
              )}
            </div>

            {/* Qty + line total */}
            <div className="flex-shrink-0 text-right">
              <p className="text-xs text-brew-soft">×{item.quantity}</p>
              <p className="text-sm font-bold text-brew">
                Rs {item.price * item.quantity}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Special note */}
      {order.specialNote && (
        <div className="pt-2 border-t border-cream-border">
          <p className="text-xs text-brew-soft">📝 {order.specialNote}</p>
        </div>
      )}

      {/* Total */}
      <div className="pt-2 border-t border-cream-border flex justify-between items-center">
        <span className="text-sm text-brew-soft">Total</span>
        <span className="font-bold text-brew">Rs {order.total}</span>
      </div>
    </div>
  )
}

export default OrderSummaryCard