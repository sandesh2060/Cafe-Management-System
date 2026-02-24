// src/modules/customer/components/tracking/OrderSummaryCard.jsx
import { COLORS } from '@colors'

const OrderSummaryCard = ({ order }) => {
  if (!order?.items?.length) return null

  return (
    <div className="card space-y-3">
      <h3 className="font-bold text-brew text-sm">Your Order</h3>
      <div className="space-y-2">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xl flex-shrink-0">{item.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-brew truncate">{item.name}</p>
              {item.notes && (
                <p className="text-xs text-brew-soft truncate">Note: {item.notes}</p>
              )}
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-xs text-brew-soft">×{item.quantity}</p>
              <p className="text-sm font-bold text-brew">₹{item.price * item.quantity}</p>
            </div>
          </div>
        ))}
      </div>

      {order.specialNote && (
        <div className="pt-2 border-t border-cream-border">
          <p className="text-xs text-brew-soft">
            📝 {order.specialNote}
          </p>
        </div>
      )}

      <div className="pt-2 border-t border-cream-border flex justify-between items-center">
        <span className="text-sm text-brew-soft">Total</span>
        <span className="font-bold text-brew">₹{order.total}</span>
      </div>
    </div>
  )
}

export default OrderSummaryCard