// src/shared/config/sounds.js
// Single source of truth for all MP3 paths.
// Admin role key is intentionally empty — admin is always silent.

export const SOUNDS = {
  customer: {
    orderConfirmed:   '/sounds/customer/order-confirmed.mp3',
    orderPreparing:   '/sounds/customer/order-preparing.mp3',
    orderReady:       '/sounds/customer/order-ready.mp3',
    orderDelivered:   '/sounds/customer/order-delivered.mp3',
    pointsEarned:     '/sounds/customer/points-earned.mp3',
    tierUpgraded:     '/sounds/customer/tier-upgraded.mp3',
    waiterComing:     '/sounds/customer/waiter-coming.mp3',
  },
  waiter: {
    newWaiterCall:    '/sounds/waiter/new-waiter-call.mp3',
    newOrder:         '/sounds/waiter/new-order.mp3',
    orderReadyPickup: '/sounds/waiter/order-ready-pickup.mp3',
    newMessage:       '/sounds/waiter/new-message.mp3',
    urgentAlert:      '/sounds/waiter/urgent-alert.mp3',
  },
  kitchen: {
    newOrderBell:     '/sounds/kitchen/new-order-bell.mp3',
    orderCancelled:   '/sounds/kitchen/order-cancelled.mp3',
    lowStock:         '/sounds/kitchen/low-stock-alert.mp3',
    newMessage:       '/sounds/kitchen/new-message.mp3',
  },
  cashier: {
    paymentRequest:   '/sounds/cashier/payment-request.mp3',
    paymentConfirmed: '/sounds/cashier/payment-confirmed.mp3',
    newMessage:       '/sounds/cashier/new-message.mp3',
  },
  manager: {
    sessionAbandoned: '/sounds/manager/session-abandoned.mp3',
    newStaffMessage:  '/sounds/manager/new-staff-message.mp3',
    lowInventory:     '/sounds/manager/low-inventory.mp3',
    dailySummary:     '/sounds/manager/daily-summary.mp3',
  },
  admin: {}, // Intentionally empty — admin is always silent
}

// Role → event → sound key mapping
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
  admin: {}, // No events mapped — admin is silent
}