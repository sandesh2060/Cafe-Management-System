// src/shared/config/sounds.js
// ─────────────────────────────────────────────────────────────────────────────
// WHITE-LABEL: All sound paths come from BRAND.SOUNDS (brand.js → .env.local).
// To override any sound for a deployment, set the corresponding VITE_SOUND_*
// variable in .env.local. Defaults match the original file structure.
//
// Usage:
//   import { SOUNDS, ROLE_SOUND_MAP } from '@shared/config/sounds'
//   const path = SOUNDS.customer.orderConfirmed  // → env value or default
// ─────────────────────────────────────────────────────────────────────────────

import { SOUNDS as _SOUNDS } from '@shared/config/brand'

// Re-export so all consumers keep the same import path
export const SOUNDS = _SOUNDS

// ─── Role → event → sound key mapping ────────────────────────────────────────
// Keys map socket/event names to keys inside SOUNDS[role].
// The sound service does: SOUNDS[role][ROLE_SOUND_MAP[role][event]]
export const ROLE_SOUND_MAP = {
  customer: {
    'order:confirmed':       'orderConfirmed',
    'order:preparing':       'orderPreparing',
    'order:ready':           'orderReady',
    'order:delivered':       'orderDelivered',
    'loyalty:points':        'pointsEarned',
    'loyalty:tier-upgrade':  'tierUpgraded',
    'waiter:on_the_way':     'waiterComing',
  },
  waiter: {
    'waiter:call-request':   'newWaiterCall',
    'order:new':             'newOrder',
    'order:ready-pickup':    'orderReadyPickup',
    'message:received':      'newMessage',
    'waiter:urgent':         'urgentAlert',
  },
  kitchen: {
    'order:new':             'newOrderBell',
    'order:cancelled':       'orderCancelled',
    'inventory:low-stock':   'lowStock',
    'message:received':      'newMessage',
  },
  cashier: {
    'payment:request':       'paymentRequest',
    'payment:confirmed':     'paymentConfirmed',
    'message:received':      'newMessage',
  },
  manager: {
    'session:abandoned':     'sessionAbandoned',
    'message:received':      'newStaffMessage',
    'inventory:low-stock':   'lowInventory',
    'report:daily-ready':    'dailySummary',
  },
  admin: {}, // No events mapped — admin is always silent
}

// ─── Helper: resolve a sound path for a given role + event ───────────────────
// Returns the MP3 path string or null if not mapped.
export const resolveSoundPath = (role, event) => {
  const key = ROLE_SOUND_MAP[role]?.[event]
  if (!key) return null
  return SOUNDS[role]?.[key] ?? null
}