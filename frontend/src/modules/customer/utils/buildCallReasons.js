// src/modules/customer/utils/buildCallReasons.js
import { COLORS } from '@colors'

export const buildCallReasons = (activeOrderItems = []) => {
  // Section 1 — dynamic from active order items
  const fromOrder = activeOrderItems.map((item) => ({
    id:     `order_${item._id || item.id}`,
    label:  `More ${item.name}`,
    emoji:  item.emoji || '🍽️',
    type:   'item',
    color:  COLORS.callReasons.item,
    itemId: item._id || item.id,
  }))

  // Section 2 — basic needs (always shown)
  const basics = [
    { id: 'water',   label: 'Water',         emoji: '💧', color: COLORS.callReasons.water  },
    { id: 'tissue',  label: 'Tissue',        emoji: '🧻', color: COLORS.callReasons.tissue },
    { id: 'cutlery', label: 'Cutlery',       emoji: '🍴', color: COLORS.callReasons.custom },
    { id: 'salt',    label: 'Salt & Pepper', emoji: '🧂', color: COLORS.callReasons.custom },
    { id: 'sauce',   label: 'Sauce',         emoji: '🔥', color: COLORS.callReasons.item   },
    { id: 'ice',     label: 'Ice',           emoji: '🧊', color: COLORS.callReasons.water  },
    { id: 'spicy',   label: 'More Spicy',    emoji: '🌶️', color: COLORS.callReasons.spill  },
    { id: 'assist',  label: 'Assistance',    emoji: '♿', color: COLORS.callReasons.custom },
  ]

  // Section 3 — service actions
  const service = [
    { id: 'bill',      label: 'Bill / Pay',    emoji: '💳', color: COLORS.callReasons.bill   },
    { id: 'pack',      label: 'Pack to Go',    emoji: '📦', color: COLORS.callReasons.order  },
    { id: 'replace',   label: 'Replace Item',  emoji: '🔄', color: COLORS.callReasons.order  },
    { id: 'question',  label: 'Question',      emoji: '❓', color: COLORS.callReasons.custom },
    { id: 'complaint', label: 'Complaint',     emoji: '⚠️', color: COLORS.callReasons.spill  },
    { id: 'custom',    label: 'Other...',      emoji: '✏️', color: COLORS.callReasons.custom },
  ]

  return { fromOrder, basics, service }
}