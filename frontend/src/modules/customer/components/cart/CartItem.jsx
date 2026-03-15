// src/modules/customer/components/cart/CartItem.jsx
//
// FIXES:
//   • COLORS.saffron.dark → COLORS.saffron.DEFAULT (dark subkey not confirmed)
//   • COLORS.terra.DEFAULT kept — if it doesn't exist falls back gracefully
//     via optional chaining added to all COLORS accesses

import { Minus, Plus, Trash2 } from 'lucide-react'
import { COLORS }              from '@colors'

const CartItem = ({ item, onRemove, onQuantity }) => (
  <div className="card flex items-center gap-3">

    {/* Emoji thumb */}
    <div className="w-12 h-12 rounded-xl bg-cream-dark flex items-center justify-center
                    text-2xl flex-shrink-0">
      {item.emoji}
    </div>

    {/* Name + portion label + price */}
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-brew text-sm truncate">{item.name}</p>

      {item.portionLabel && (
        <p className="text-[11px] font-semibold truncate"
           style={{ color: COLORS.saffron?.DEFAULT ?? '#FF9F1C', marginTop: 1 }}>
          {item.portionLabel}
        </p>
      )}

      <p className="text-brew-soft text-xs mt-0.5">Rs {item.price} each</p>
    </div>

    {/* Quantity controls */}
    <div className="flex items-center gap-2">
      <button
        onClick={() => item.quantity === 1 ? onRemove() : onQuantity(item.quantity - 1)}
        className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center
                   justify-center active:scale-90 transition-transform"
        aria-label="Decrease quantity"
      >
        {item.quantity === 1
          ? <Trash2 size={14} color={COLORS.terra?.DEFAULT ?? '#C0392B'} />
          : <Minus  size={14} color={COLORS.brew?.soft    ?? '#8B5E3C'} />
        }
      </button>

      <span className="w-6 text-center font-bold text-brew text-sm">{item.quantity}</span>

      <button
        onClick={() => onQuantity(item.quantity + 1)}
        className="w-8 h-8 rounded-full flex items-center justify-center
                   active:scale-90 transition-transform text-white"
        style={{ backgroundColor: COLORS.saffron?.DEFAULT ?? '#FF9F1C' }}
        aria-label="Increase quantity"
      >
        <Plus size={14} strokeWidth={2.5} />
      </button>
    </div>

    {/* Line total */}
    <p className="font-bold text-brew text-sm w-14 text-right whitespace-nowrap">
      Rs {item.price * item.quantity}
    </p>
  </div>
)

export default CartItem