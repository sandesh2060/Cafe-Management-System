// src/modules/customer/components/cart/CartItem.jsx
//
// ─── MODULE 22: Strikethrough pricing ─────────────────────────────────────────
// ★ Accepts displayPrice, originalPrice, pricingBadge from CartPage
// ★ Shows strikethrough original + green discounted price when discount active
// ★ Line total uses displayPrice (discounted) × quantity
// All existing logic (portion label, quantity controls, remove) — UNCHANGED
// ─────────────────────────────────────────────────────────────────────────────

import { Minus, Plus, Trash2 } from 'lucide-react'
import { COLORS }              from '@colors'

const CartItem = ({ item, onRemove, onQuantity }) => {
  // ★ Use discounted price if provided, else fall back to item.price
  const displayPrice  = item.displayPrice  ?? item.price
  const originalPrice = item.originalPrice ?? null
  const hasDiscount   = originalPrice !== null && originalPrice > displayPrice
  const lineTotal     = displayPrice * item.quantity

  return (
    <div className="card flex items-center gap-3">

      {/* Emoji thumb */}
      <div className="w-12 h-12 rounded-xl bg-cream-dark flex items-center justify-center text-2xl flex-shrink-0">
        {item.emoji}
      </div>

      {/* Name + portion + price */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-brew text-sm truncate">{item.name}</p>

        {item.portionLabel && (
          <p className="text-[11px] font-semibold truncate"
            style={{ color: COLORS.saffron?.DEFAULT ?? '#FF9F1C', marginTop: 1 }}>
            {item.portionLabel}
          </p>
        )}

        {/* ★ Price row — strikethrough when discounted */}
        <div className="flex items-center gap-1.5 mt-0.5">
          {hasDiscount && (
            <span className="text-[11px]"
              style={{ color: '#9CA3AF', textDecoration: 'line-through' }}>
              Rs {originalPrice}
            </span>
          )}
          <span className={['text-xs font-medium', hasDiscount ? '' : 'text-brew-soft'].join(' ')}
            style={{ color: hasDiscount ? '#10B981' : undefined }}>
            Rs {displayPrice} each
          </span>
          {/* ★ Pricing badge (e.g. "20% OFF") */}
          {item.pricingBadge && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                background: `${item.pricingBadge.color}18`,
                color:       item.pricingBadge.color,
                border:     `1px solid ${item.pricingBadge.color}30`,
              }}>
              {item.pricingBadge.label}
            </span>
          )}
        </div>
      </div>

      {/* Quantity controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => item.quantity === 1 ? onRemove() : onQuantity(item.quantity - 1)}
          className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center active:scale-90 transition-transform"
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
          className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform text-white"
          style={{ backgroundColor: COLORS.saffron?.DEFAULT ?? '#FF9F1C' }}
          aria-label="Increase quantity"
        >
          <Plus size={14} strokeWidth={2.5} />
        </button>
      </div>

      {/* ★ Line total — uses discounted price */}
      <div className="w-14 text-right">
        {hasDiscount && (
          <p className="text-[10px]"
            style={{ color: '#9CA3AF', textDecoration: 'line-through', lineHeight: 1 }}>
            Rs {item.price * item.quantity}
          </p>
        )}
        <p className="font-bold text-sm whitespace-nowrap"
          style={{ color: hasDiscount ? '#10B981' : undefined }}
          >
          Rs {lineTotal}
        </p>
      </div>
    </div>
  )
}

export default CartItem