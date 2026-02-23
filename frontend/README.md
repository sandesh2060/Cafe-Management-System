# ☕ कौसी चिया — Smart Cafe Management System

> **Full-stack real-time cafe platform** · GPS-Primary Table Detection · Smart Logout · Call Waiter System · Smart Recommendations · Role Notifications · Multi-Role · Tiered Loyalty · SaaS-Ready

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Responsive Screen Strategy](#2-responsive-screen-strategy)
3. [Global Color Palette](#3-global-color-palette)
4. [Tech Stack](#4-tech-stack)
5. [Call Waiter System](#5-call-waiter-system)
6. [Smart Recommendation Engine](#6-smart-recommendation-engine)
7. [Role-Based Notification & Sound System](#7-role-based-notification--sound-system)
8. [Messaging & Calling System](#8-messaging--calling-system)
9. [Smart Logout System](#9-smart-logout-system)
10. [GPS-Primary Table Session](#10-gps-primary-table-session)
11. [Customer Workflow](#11-customer-workflow)
12. [Frontend Folder Structure](#12-frontend-folder-structure)
13. [Backend Folder Structure](#13-backend-folder-structure)
14. [WebSocket Events](#14-websocket-events)
15. [Loyalty System](#15-loyalty-system)
16. [Roles & Permissions](#16-roles--permissions)
17. [Vite Aliases & Environment Variables](#17-vite-aliases--environment-variables)
18. [Key Libraries](#18-key-libraries)
19. [Database Schema](#19-database-schema)
20. [Redis Cache Keys](#20-redis-cache-keys)
21. [Scripts & Setup](#21-scripts--setup)

---

## 1. Project Overview

कौसी चिया is a production-grade, full-stack smart cafe management system built for dine-in experiences. Customers are detected at their table automatically via GPS — no QR unless GPS fails. A smart 4-rule logout system protects active orders. Customers can call waiters with context-aware reason buttons (dynamic from their ordered items + preset basics). Every role gets tailored MP3 notifications — except Admin who manages silently. The menu engine recommends items based on real-time weather and each customer's personal order history.

### ✅ Core Capabilities

- **GPS-primary table session** — QR fallback, 0 DB hits on GPS path via Redis cache
- **Smart 4-rule logout** — manual guard + payment auto-logout + geofence exit
- **Call Waiter system** — reason buttons built from order items + predefined basics + custom text
- **Smart recommendations** — weather API + customer order history → personalized menu suggestions
- **Role-based notifications + MP3** — Customer, Waiter, Kitchen, Cashier, Manager all get sounds; Admin never
- **In-app messaging** — Customer↔Waiter, Waiter↔Kitchen, Waiter↔Manager, Manager↔Cashier
- **In-app calling** — Waiter↔Kitchen (voice), Waiter↔Manager (voice)
- **Multi-role architecture** — Customer, Waiter, Kitchen, Cashier, Manager, Super Admin
- **Live order tracking** — Socket.io WebSockets, real-time KDS, waiter alerts
- **Tiered loyalty** — Bronze / Silver / Gold with points, discounts, tier-up confetti
- **Face recognition login** — face-api.js ML models
- **Multi-cafe SaaS** — Super Admin manages all cafes + subscriptions
- **PWA-ready** — self-hosted fonts, offline support, installable

---

## 2. Responsive Screen Strategy

> **The core screen-size contract for every role. All UI decisions follow this.**

### 2.1 Breakpoint System

```js
// Defined ONCE in: src/shared/config/colors.js (see Section 3)
// Consumed by: tailwind.config.js + useMediaQuery.js

screens: {
  'xs':  '375px',   // Small mobile  — Customer primary target
  'sm':  '640px',   // Large mobile  — Customer + Waiter handheld
  'md':  '768px',   // Tablet portrait — Waiter/Kitchen primary
  'lg':  '1024px',  // Tablet landscape / laptop
  'xl':  '1280px',  // Desktop
  '2xl': '1536px',  // Wide desktop — Manager/Admin max
}
```

---

### 2.2 Customer — Mobile PRIMARY 📱

> **Design mobile first. Desktop is never the priority for customers.**

| Screen | Behavior |
|---|---|
| `xs` (375px) | Default — every pixel designed here |
| `sm` (640px) | Slight padding/font adjustments |
| `md`+ | Centered card (`max-w-md`), rest blurred background |
| `lg`+ | Same as md — customer app never goes wide-layout |

**Rules:**
- All customer pages: `max-w-md mx-auto`
- `BottomNav.jsx` → 5 tabs: **Menu · Cart · Track · 🔔 Call Waiter · Profile**
- No sidebar, no heavy headers
- Touch targets min 44×44px
- VanillaTilt: `gyroscope: true` on mobile (no hover tilt)
- Swiper touch events enabled globally

**Customer Pages → Screen Mapping:**
```
LoginPage.jsx          → xs/sm centered card, full-bleed bg
TableDetectionPage.jsx → xs/sm full-screen GPS animation
MenuPage.jsx           → xs/sm 2-col grid, CategoryPills h-scroll
CartPage.jsx           → xs/sm sticky bottom checkout bar
TrackingPage.jsx       → xs/sm vertical step tracker
CallWaiterPage.jsx     → xs/sm bottom-sheet modal            [NEW]
LoyaltyPage.jsx        → xs/sm scrollable tier cards
ProfilePage.jsx        → xs/sm stacked sections
PaymentPage.jsx        → xs/sm full screen
PaymentSuccessPage.jsx → xs/sm 8s celebration → auto-logout
```

---

### 2.3 Waiter + Kitchen — Mobile & Tablet 📱🖥️

| Screen | Waiter Layout | Kitchen Layout |
|---|---|---|
| `xs` | Compact list, bottom nav | Single-col KDS |
| `sm` | Card list + chat drawer | Single-col KDS |
| `md` | **Primary** — table map + orders split | **Primary** — 3-col KDS |
| `lg` | Floor map + orders + persistent chat | Full 3-col + chat panel |
| `xl`+ | Same as lg | Same as lg |

**Waiter Rules:**
- `md`+: `grid-cols-2` — table map left, orders + messages right
- `sm`-: Tabbed UI → Tables | Orders | Messages | Calls
- `WaiterCallAlert.jsx`: fixed toast overlay always visible
- Chat drawer: slide-in on mobile, persistent right panel on `lg`+

**Kitchen Rules:**
- KDS: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`
- `OrderTimer.jsx`: `text-4xl md:text-5xl`
- `InventoryAlert.jsx`: full-width banner on all screens
- Chat with waiter: slide-in drawer on mobile, sidebar on `lg`+
- Optimized for landscape tablet mount

---

### 2.4 Manager + Admin — All Screens Responsive 📱🖥️💻

| Screen | Layout |
|---|---|
| `xs/sm` | Single column, hamburger menu, stacked cards/charts |
| `md` | Icon-only sidebar (48px), 1-col main |
| `lg` | Full labeled sidebar (220px), 2-col grid |
| `xl` | Full sidebar, 3-col dashboard grid, side-by-side charts |
| `2xl` | Capped at 1536px, centered |

**Rules:**
- `DashboardLayout.jsx` → single responsive shell for Manager + Admin
- All Recharts: `<ResponsiveContainer width="100%" height={300}>`
- Data tables: `overflow-x-auto` wrapper on mobile
- All modals: `w-full max-w-lg mx-auto`
- Manager gets sound notifications; **Admin gets zero sounds — silent panel**
- Chat available in Manager panel (Waiter↔Manager)

---

### 2.5 Cashier — Mobile & Tablet 📱🖥️

| Screen | Layout |
|---|---|
| `xs/sm` | Stacked: billing top, transaction list below |
| `md`+ | Split: cash register left, transaction/billing right |

**Rules:**
- `SplitBillModal.jsx`: `max-w-lg w-full`
- `TransactionList.jsx`: `overflow-x-auto` on mobile
- Cashier receives payment-related sound notifications

---

### 2.6 Responsive Implementation Checklist

```
✅ Customer    → max-w-md, BottomNav, mobile-first, touch optimized
✅ Waiter      → md: grid-cols-2 split | sm: tabbed | chat drawer
✅ Kitchen     → md: grid-cols-3 KDS | sm: single col | landscape opt
✅ Cashier     → md: split layout | sm: stacked
✅ Manager     → collapsible sidebar + ResponsiveContainer charts
✅ Admin       → same shell as Manager — NO sound notifications

✅ Touch targets ≥ 44×44px everywhere
✅ All Recharts wrapped in ResponsiveContainer
✅ All modals: max-w-lg w-full mx-auto
✅ Data tables: overflow-x-auto on mobile
✅ VanillaTilt gyroscope:true on touch devices
✅ GSAP respects prefers-reduced-motion media query
✅ Swiper touch globally enabled
✅ BottomNav ONLY for Customer
✅ DashboardLayout sidebar ONLY for Manager + Admin
```

---

## 3. Global Color Palette

> **Single source of truth. Import this file everywhere — Tailwind config, components, JS utilities.**

```js
// src/shared/config/colors.js
// ─────────────────────────────────────────────────────────────────────────────
// कौसी चिया — GLOBAL COLOR PALETTE & DESIGN TOKENS
// This is the ONE file for all colors. Never hardcode hex values elsewhere.
// Import: import { COLORS, ROLE_COLORS, NOTIFICATION_COLORS } from '@shared/config/colors'
// ─────────────────────────────────────────────────────────────────────────────

export const COLORS = {

  // ── BRAND ─────────────────────────────────────────────────────────────────
  saffron: {
    DEFAULT:  '#FF9F1C',   // Primary brand — buttons, accents, highlights
    light:    '#FFB84D',   // Hover states, lighter variants
    dark:     '#E08800',   // Active/pressed states
    soft:     '#FFF3DC',   // Backgrounds, tints
    muted:    '#FFE0A3',   // Disabled states
  },

  terra: {
    DEFAULT:  '#E05C2A',   // Secondary brand — alerts, CTAs, destructive
    light:    '#F0784A',   // Hover
    dark:     '#C44A1A',   // Active
    soft:     '#FDE8DF',   // Alert backgrounds
  },

  brew: {
    DEFAULT:  '#5C3317',   // Deep brown — text, headers
    light:    '#8B5E3C',   // Subtext, labels
    soft:     '#C49A6C',   // Muted text, placeholders
    cream:    '#EDD5B3',   // Very light brown tint
  },

  matcha: {
    DEFAULT:  '#2D9B5A',   // Success, confirmed, active
    light:    '#38C26F',   // Hover success
    dark:     '#1E7A42',   // Active success
    soft:     '#D4F0E0',   // Success backgrounds
  },

  cream: {
    DEFAULT:  '#FFF8EE',   // App background (light mode)
    dark:     '#FFF0D6',   // Card backgrounds
    deep:     '#FFE4B5',   // Deeper cream sections
    border:   '#F0D9B5',   // Cream borders
  },


  // ── UI SYSTEM ─────────────────────────────────────────────────────────────
  surface: {
    primary:   '#FFFFFF',   // Cards, modals
    secondary: '#F9FAFB',   // Alternate rows, sections
    tertiary:  '#F3F4F6',   // Hover backgrounds
    inverse:   '#111827',   // Dark cards
  },

  text: {
    primary:   '#111827',   // Main body text
    secondary: '#374151',   // Subtext
    muted:     '#6B7280',   // Placeholders, hints
    disabled:  '#9CA3AF',   // Disabled labels
    inverse:   '#FFFFFF',   // Text on dark backgrounds
    brand:     '#FF9F1C',   // Brand-colored text
  },

  border: {
    light:    '#E5E7EB',   // Default borders
    medium:   '#D1D5DB',   // Stronger borders
    dark:     '#9CA3AF',   // Heavy borders
    brand:    '#FF9F1C',   // Brand borders / focus rings
    error:    '#FCA5A5',   // Error borders
  },


  // ── SEMANTIC ──────────────────────────────────────────────────────────────
  status: {
    success:        '#16A34A',   // Order delivered, payment confirmed
    successBg:      '#F0FDF4',
    warning:        '#D97706',   // Preparing, pending
    warningBg:      '#FFFBEB',
    error:          '#DC2626',   // Errors, cancellations
    errorBg:        '#FEF2F2',
    info:           '#2563EB',   // Info states, GPS
    infoBg:         '#EFF6FF',
    neutral:        '#6B7280',   // Neutral/idle
    neutralBg:      '#F9FAFB',
  },


  // ── ORDER STATUS ──────────────────────────────────────────────────────────
  orderStatus: {
    pending:      '#D97706',   // Amber — waiting
    preparing:    '#2563EB',   // Blue — kitchen working
    on_the_way:   '#7C3AED',   // Purple — waiter coming
    delivered:    '#16A34A',   // Green — arrived
    paid:         '#059669',   // Emerald — completed
    cancelled:    '#DC2626',   // Red — cancelled
  },


  // ── LOYALTY TIERS ─────────────────────────────────────────────────────────
  loyalty: {
    bronze: {
      DEFAULT:  '#CD7F32',
      light:    '#E8A96A',
      bg:       '#FDF3E7',
      text:     '#7C4A00',
    },
    silver: {
      DEFAULT:  '#9CA3AF',
      light:    '#D1D5DB',
      bg:       '#F9FAFB',
      text:     '#374151',
    },
    gold: {
      DEFAULT:  '#F59E0B',
      light:    '#FCD34D',
      bg:       '#FFFBEB',
      text:     '#78350F',
    },
  },


  // ── WEATHER MOODS (for recommendation engine) ─────────────────────────────
  weather: {
    sunny:    '#F59E0B',   // Hot drinks less, cold drinks more
    rainy:    '#6366F1',   // Hot drinks, soups, comfort food
    cloudy:   '#9CA3AF',   // Balanced suggestions
    cold:     '#3B82F6',   // Hot beverages, warm food
    hot:      '#EF4444',   // Cold beverages, light food
    windy:    '#8B5CF6',   // Warm snacks
  },


  // ── CALL WAITER REASONS ───────────────────────────────────────────────────
  callReasons: {
    water:    '#3B82F6',   // Blue — hydration
    tissue:   '#8B5CF6',   // Purple — essentials
    bill:     '#F59E0B',   // Amber — payment
    order:    '#FF9F1C',   // Saffron — ordering
    spill:    '#EF4444',   // Red — urgent
    custom:   '#6B7280',   // Grey — other
    item:     '#2D9B5A',   // Matcha — item from order
  },


  // ── NOTIFICATION TYPES ────────────────────────────────────────────────────
  notification: {
    orderPlaced:    '#2563EB',
    orderReady:     '#16A34A',
    waiterCall:     '#FF9F1C',
    newMessage:     '#7C3AED',
    payment:        '#059669',
    alert:          '#DC2626',
    info:           '#6B7280',
  },


  // ── ROLE COLORS ───────────────────────────────────────────────────────────
  roles: {
    customer: {
      DEFAULT:  '#FF9F1C',   // Saffron
      bg:       '#FFF3DC',
      text:     '#92400E',
    },
    waiter: {
      DEFAULT:  '#2D9B5A',   // Matcha
      bg:       '#D4F0E0',
      text:     '#065F46',
    },
    kitchen: {
      DEFAULT:  '#E05C2A',   // Terra
      bg:       '#FDE8DF',
      text:     '#7C2D12',
    },
    cashier: {
      DEFAULT:  '#2563EB',   // Blue
      bg:       '#EFF6FF',
      text:     '#1E40AF',
    },
    manager: {
      DEFAULT:  '#7C3AED',   // Purple
      bg:       '#EDE9FE',
      text:     '#4C1D95',
    },
    admin: {
      DEFAULT:  '#374151',   // Grey — silent, no notifications
      bg:       '#F9FAFB',
      text:     '#111827',
    },
  },


  // ── DARK MODE OVERRIDES ───────────────────────────────────────────────────
  dark: {
    bg:         '#0F0A06',
    surface:    '#1A1208',
    surface2:   '#241810',
    border:     'rgba(255,159,28,0.12)',
    text:       '#FFF8EE',
    muted:      '#C49A6C',
  },


  // ── GRADIENTS (as CSS strings) ────────────────────────────────────────────
  gradients: {
    brand:      'linear-gradient(135deg, #FF9F1C, #E05C2A)',
    brandSoft:  'linear-gradient(135deg, #FFB84D, #F0784A)',
    matcha:     'linear-gradient(135deg, #2D9B5A, #38C26F)',
    dark:       'linear-gradient(180deg, #1A1208, #0F0A06)',
    loyalty: {
      bronze:   'linear-gradient(135deg, #CD7F32, #E8A96A)',
      silver:   'linear-gradient(135deg, #9CA3AF, #D1D5DB)',
      gold:     'linear-gradient(135deg, #F59E0B, #FCD34D)',
    }
  },


  // ── SHADOWS ───────────────────────────────────────────────────────────────
  shadows: {
    sm:     '0 1px 3px rgba(0,0,0,0.08)',
    md:     '0 4px 12px rgba(0,0,0,0.10)',
    lg:     '0 8px 24px rgba(0,0,0,0.12)',
    brand:  '0 4px 20px rgba(255,159,28,0.35)',
    card:   '0 2px 8px rgba(92,51,23,0.08)',
  },

}


// ── TAILWIND THEME EXTENSION (paste into tailwind.config.js extend.colors)
export const TAILWIND_COLORS = {
  saffron: COLORS.saffron,
  terra:   COLORS.terra,
  brew:    COLORS.brew,
  matcha:  COLORS.matcha,
  cream:   COLORS.cream,
}

// ── USAGE EXAMPLES ────────────────────────────────────────────────────────
//
//  In a React component:
//    import { COLORS } from '@shared/config/colors'
//    style={{ backgroundColor: COLORS.saffron.DEFAULT }}
//
//  In Tailwind classes (via tailwind.config.js):
//    className="bg-saffron text-brew-soft border-matcha"
//
//  In CSS variables (set in globals.css from this file):
//    var(--color-saffron)
//    var(--color-matcha-light)
//
//  Role-based dynamic coloring:
//    const roleColor = COLORS.roles[user.role].DEFAULT
```

---

### 3.1 CSS Variables Setup

```css
/* src/styles/globals.css — auto-generated from colors.js */
:root {
  --color-saffron:         #FF9F1C;
  --color-saffron-light:   #FFB84D;
  --color-saffron-dark:    #E08800;
  --color-terra:           #E05C2A;
  --color-brew:            #5C3317;
  --color-brew-soft:       #C49A6C;
  --color-matcha:          #2D9B5A;
  --color-matcha-light:    #38C26F;
  --color-cream:           #FFF8EE;
  --color-success:         #16A34A;
  --color-warning:         #D97706;
  --color-error:           #DC2626;
  --color-info:            #2563EB;
}
```

---

## 4. Tech Stack

### Frontend
| Category | Technology |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS (tokens from `colors.js`) |
| State | Redux Toolkit |
| Routing | React Router v6 |
| Animations | GSAP + ScrollTrigger + Anime.js |
| Carousels | Swiper.js |
| 3D Hover | Vanilla Tilt |
| Typewriter | Typed.js |
| Icons | Lucide React |
| Charts | Recharts |
| Scroll | Lenis |
| Face Auth | face-api.js |
| Real-time | Socket.io client |
| State Machine | XState (table detection) |
| Weather | OpenWeatherMap API |

### Backend
| Category | Technology |
|---|---|
| Runtime | Node.js + Express |
| Database | MongoDB + Mongoose |
| Cache | Redis (ioredis) |
| Auth | JWT + Google OAuth 2.0 (Passport.js) |
| Real-time | Socket.io |
| Validation | Zod |
| QR Security | HMAC-SHA256 (node:crypto) |
| GPS Algorithm | Haversine + KD-Tree |
| Recommendations | Custom engine: Weather API + MongoDB order history |
| Testing | Jest |

---

## 5. Call Waiter System

> Customer can call the waiter with full context — reason buttons are built dynamically from their active order items PLUS predefined basics.

### 5.1 How It Works

```
Customer taps "Call Waiter" (BottomNav tab or TrackingPage button)
  ↓
CallWaiterPage.jsx opens as bottom-sheet modal (mobile) or centered modal (md+)
  ↓
System builds reason buttons:
  ┌── SECTION 1: From Your Order ────────────────────────────────┐
  │  Dynamic — generated from customer's active order items       │
  │  e.g. "More Masala Tea ☕", "Extra Momo 🥟", "Sauce for Pizza"│
  └───────────────────────────────────────────────────────────────┘
  ┌── SECTION 2: Basic Needs ─────────────────────────────────────┐
  │  Static presets — always shown                                 │
  │  💧 Water    🧻 Tissue    🍴 Cutlery    🧂 Salt & Pepper      │
  │  🔥 Sauce    🧊 Ice       🌶 Spicy     ♿ Assistance          │
  └───────────────────────────────────────────────────────────────┘
  ┌── SECTION 3: Service ─────────────────────────────────────────┐
  │  💳 Bill / Payment    📦 Pack to Go    🔄 Replace Item        │
  │  ❓ Question          ⚠️ Complaint      ✏️ Custom Message     │
  └───────────────────────────────────────────────────────────────┘
  ↓
Customer taps one or multiple reasons (multi-select allowed)
  ↓
Optional: add short custom note (max 100 chars)
  ↓
Tap "Call Waiter" button
  ↓
Socket emits: waiter:call-request with { tableId, reasons[], note, orderId }
  ↓
Assigned waiter gets:
  → WaiterCallAlert toast (fixed overlay)
  → new-waiter-call.mp3 plays
  → In-app notification with full reason list
  ↓
Waiter taps "On My Way" → customer sees: "Waiter is coming 🙏"
  ↓
Waiter taps "Done" → request closed → logged in analytics
```

### 5.2 Dynamic Reason Button Logic

```js
// frontend/src/modules/customer/utils/buildCallReasons.js

export const buildCallReasons = (activeOrderItems = []) => {
  // Section 1 — from their order (dynamic)
  const fromOrder = activeOrderItems.map(item => ({
    id:       `order_${item.id}`,
    label:    `More ${item.name}`,
    emoji:    item.emoji || '🍽️',
    type:     'item',
    color:    COLORS.callReasons.item,
    itemId:   item.id,
  }))

  // Section 2 — basic needs (always shown)
  const basics = [
    { id: 'water',    label: 'Water',          emoji: '💧', color: COLORS.callReasons.water },
    { id: 'tissue',   label: 'Tissue',         emoji: '🧻', color: COLORS.callReasons.tissue },
    { id: 'cutlery',  label: 'Cutlery',        emoji: '🍴', color: COLORS.callReasons.custom },
    { id: 'salt',     label: 'Salt & Pepper',  emoji: '🧂', color: COLORS.callReasons.custom },
    { id: 'sauce',    label: 'Sauce',          emoji: '🔥', color: COLORS.callReasons.item },
    { id: 'ice',      label: 'Ice',            emoji: '🧊', color: COLORS.callReasons.water },
    { id: 'spicy',    label: 'More Spicy',     emoji: '🌶️', color: COLORS.callReasons.spill },
    { id: 'assist',   label: 'Assistance',     emoji: '♿', color: COLORS.callReasons.info },
  ]

  // Section 3 — service actions
  const service = [
    { id: 'bill',     label: 'Bill / Pay',     emoji: '💳', color: COLORS.callReasons.bill },
    { id: 'pack',     label: 'Pack to Go',     emoji: '📦', color: COLORS.callReasons.order },
    { id: 'replace',  label: 'Replace Item',   emoji: '🔄', color: COLORS.callReasons.order },
    { id: 'question', label: 'Question',       emoji: '❓', color: COLORS.callReasons.custom },
    { id: 'complaint',label: 'Complaint',      emoji: '⚠️', color: COLORS.callReasons.spill },
    { id: 'custom',   label: 'Other...',       emoji: '✏️', color: COLORS.callReasons.custom },
  ]

  return { fromOrder, basics, service }
}
```

### 5.3 Call Waiter Files

```
frontend/src/modules/customer/
├── components/callwaiter/
│   ├── CallWaiterSheet.jsx          ← bottom-sheet modal (mobile)     [NEW]
│   ├── ReasonButton.jsx             ← single colored reason button    [NEW]
│   ├── ReasonSection.jsx            ← section header + button grid    [NEW]
│   ├── CallStatusBanner.jsx         ← "Waiter is coming 🙏"          [NEW]
│   └── CustomNoteInput.jsx          ← optional short message          [NEW]
├── hooks/
│   └── useCallWaiter.js             ← send + track call state         [NEW]
├── pages/
│   └── CallWaiterPage.jsx           ← full page (routed)              [NEW]
├── utils/
│   └── buildCallReasons.js          ← dynamic reason builder          [NEW]
└── services/
    └── callWaiterService.js         ← API + socket calls              [NEW]

frontend/src/modules/waiter/
├── components/
│   ├── WaiterCallAlert.jsx          ← toast overlay with reasons      [UPDATED]
│   ├── CallRequestCard.jsx          ← full call detail card           [NEW]
│   └── CallHistoryList.jsx          ← today's call log                [NEW]
└── hooks/
    └── useWaiterCalls.js            ← receive + ack + close calls     [NEW]

backend/src/modules/waiter-call/
├── waiterCall.controller.js                                            [NEW]
├── waiterCall.model.js              ← reasons[], note, status, timing [NEW]
├── waiterCall.routes.js                                               [NEW]
├── waiterCall.service.js                                              [NEW]
└── waiterCall.socket.js             ← emit + ack events               [NEW]
```

### 5.4 Waiter Call DB Model

```js
// backend/src/modules/waiter-call/waiterCall.model.js
{
  tableId:      ObjectId,
  sessionId:    String,
  orderId:      ObjectId,          // linked active order
  customerId:   ObjectId,
  waiterId:     ObjectId,          // assigned waiter
  reasons:      [String],          // ['water', 'tissue', 'order_123']
  note:         String,            // max 100 chars
  status:       String,            // pending | acknowledged | on_the_way | done
  requestedAt:  Date,
  acknowledgedAt: Date,
  resolvedAt:   Date,
  cafeId:       ObjectId,
}
```

---

## 6. Smart Recommendation Engine

> Menu items recommended based on **real-time weather** + **customer's personal order history**. Two signals combined for hyper-relevant suggestions.

### 6.1 How It Works

```
Customer opens MenuPage.jsx
  ↓
useRecommendations.js fires in parallel:

  ┌── SIGNAL 1: Weather ─────────────────────────────────────────┐
  │  weather.service.js → OpenWeatherMap API (city + lat/lng)    │
  │  Returns: temp, condition (sunny/rainy/cloudy/cold/hot)       │
  │  Maps condition → menu category preferences                   │
  │                                                              │
  │  Example mappings:                                           │
  │  rainy  → hot_drinks, soups, snacks (boost score +30)        │
  │  hot    → cold_drinks, ice_cream, light_food (boost +30)     │
  │  cold   → hot_drinks, comfort_food (boost +25)               │
  │  sunny  → fresh_juices, light_snacks (boost +20)             │
  └───────────────────────────────────────────────────────────────┘
  ↓
  ┌── SIGNAL 2: Order History ────────────────────────────────────┐
  │  recommendationService.js → GET /recommendations/personal     │
  │  Backend queries: last 30 orders for this customer            │
  │                                                              │
  │  Calculates:                                                  │
  │  - Most ordered items (frequency score)                       │
  │  - Time-of-day patterns (morning = tea, evening = snacks)    │
  │  - Seasonal patterns (monthly aggregation)                    │
  │  - Never-tried items in favorite category (discovery)         │
  │  - Items ordered by similar customers (collaborative)         │
  └───────────────────────────────────────────────────────────────┘
  ↓
Scores merged: finalScore = (weatherScore × 0.4) + (historyScore × 0.6)
  ↓
Top 6 items returned → shown in "Recommended for You 🌟" section
Guest users: weather-only recommendations (no history)
  ↓
Displayed as horizontal Swiper carousel above menu grid
RecommendedCard.jsx shows: item + weather reason tag + "Your Favourite" badge
```

### 6.2 Weather → Menu Category Mapping

```js
// backend/src/modules/recommendations/weatherMapping.js

export const WEATHER_MENU_MAP = {
  rainy: {
    boost:   ['hot_drinks', 'soups', 'snacks', 'comfort_food'],
    reduce:  ['cold_drinks', 'ice_cream'],
    tag:     '☔ Perfect for rainy weather',
    score:   30,
  },
  hot: {
    boost:   ['cold_drinks', 'ice_cream', 'fresh_juice', 'light_food'],
    reduce:  ['hot_drinks', 'soups'],
    tag:     '☀️ Cool you down',
    score:   30,
  },
  cold: {
    boost:   ['hot_drinks', 'soups', 'comfort_food', 'snacks'],
    reduce:  ['cold_drinks', 'salads'],
    tag:     '❄️ Warm you up',
    score:   25,
  },
  sunny: {
    boost:   ['fresh_juice', 'light_snacks', 'smoothies'],
    reduce:  ['heavy_food'],
    tag:     '🌤️ Fresh picks',
    score:   20,
  },
  windy: {
    boost:   ['hot_drinks', 'snacks', 'wraps'],
    reduce:  [],
    tag:     '💨 Cozy choices',
    score:   15,
  },
  cloudy: {
    boost:   ['tea', 'coffee', 'snacks'],
    reduce:  [],
    tag:     '☁️ Cloudy day picks',
    score:   10,
  },
}
```

### 6.3 Recommendation Algorithm (Backend)

```js
// backend/src/modules/recommendations/recommendation.service.js

const getPersonalRecommendations = async (userId, cafeId, weatherCondition) => {

  // 1. Fetch customer order history (last 30 orders)
  const history = await Order.find({ userId, cafeId })
    .sort({ createdAt: -1 }).limit(30)
    .populate('items.menuItemId')

  // 2. Build frequency map
  const freq = {}
  const currentHour = new Date().getHours()

  history.forEach(order => {
    order.items.forEach(item => {
      const id = item.menuItemId._id.toString()
      freq[id] = (freq[id] || 0) + item.quantity
    })
  })

  // 3. Time-of-day boost
  const timeBoost = getTimeBoost(currentHour)  // morning/afternoon/evening/night

  // 4. Fetch all available menu items
  const menuItems = await MenuItem.find({ cafeId, isAvailable: true })

  // 5. Score each item
  const weatherMap = WEATHER_MENU_MAP[weatherCondition] || {}

  const scored = menuItems.map(item => {
    let score = 0
    const id = item._id.toString()

    // History signal (60% weight)
    score += (freq[id] || 0) * 10 * 0.6

    // Weather signal (40% weight)
    if (weatherMap.boost?.includes(item.category)) score += weatherMap.score * 0.4
    if (weatherMap.reduce?.includes(item.category)) score -= 15

    // Time-of-day
    if (timeBoost.categories.includes(item.category)) score += timeBoost.bonus

    // Discovery bonus — never tried items in fav category
    if (!freq[id] && isInFavCategory(item, freq, menuItems)) score += 8

    return {
      item,
      score,
      weatherTag: weatherMap.boost?.includes(item.category) ? weatherMap.tag : null,
      isFavourite: (freq[id] || 0) >= 3,
    }
  })

  // 6. Sort + return top 6
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
}
```

### 6.4 Recommendation Files

```
frontend/src/modules/customer/
├── components/menu/
│   ├── RecommendedSection.jsx         ← "Recommended for You 🌟" section   [NEW]
│   ├── RecommendedCard.jsx            ← card with weather tag + fav badge  [NEW]
│   └── WeatherBadge.jsx               ← "☔ Perfect for rainy weather"      [NEW]
├── hooks/
│   └── useRecommendations.js          ← parallel weather + history fetch   [UPDATED]
└── services/
    └── recommendationService.js       ← API calls                          [UPDATED]

backend/src/modules/recommendations/
├── recommendation.controller.js
├── recommendation.service.js          ← scoring algorithm                  [KEY]
├── recommendation.routes.js
├── weatherMapping.js                  ← weather → category map             [NEW]
├── timeMapping.js                     ← time of day → category map         [NEW]
└── collaborativeFilter.js             ← similar customers boost            [NEW]

backend/src/modules/             ← existing
└── weather/
    └── weather.service.js             ← OpenWeatherMap API wrapper
```

### 6.5 API Endpoints

```
GET /recommendations/personal?cafeId=&weather=rainy
  → requires auth (uses userId from JWT)
  → returns: [{ item, score, weatherTag, isFavourite }]

GET /recommendations/guest?cafeId=&weather=hot
  → no auth needed
  → returns: weather-only recommendations

GET /weather/current?lat=&lng=
  → returns: { condition, temp, icon, city }
```

---

## 7. Role-Based Notification & Sound System

> Every role gets specific sounds for relevant events. **Admin panel has zero sounds** — silent by design.

### 7.1 Sound File Map

```
public/sounds/
├── customer/
│   ├── order-confirmed.mp3       ← order placed successfully
│   ├── order-preparing.mp3       ← kitchen started
│   ├── order-ready.mp3           ← order is coming
│   ├── order-delivered.mp3       ← delivered to table
│   ├── points-earned.mp3         ← loyalty points added
│   ├── tier-upgraded.mp3         ← tier level up
│   └── waiter-coming.mp3         ← waiter acknowledged call
│
├── waiter/
│   ├── new-waiter-call.mp3       ← customer called
│   ├── new-order.mp3             ← new order for my table
│   ├── order-ready-pickup.mp3    ← kitchen: order ready to deliver
│   ├── new-message.mp3           ← in-app message received
│   └── urgent-alert.mp3          ← complaint / urgent call
│
├── kitchen/
│   ├── new-order-bell.mp3        ← new order arrived
│   ├── order-cancelled.mp3       ← item/order cancelled
│   ├── low-stock-alert.mp3       ← inventory alert
│   └── new-message.mp3           ← waiter message
│
├── cashier/
│   ├── payment-request.mp3       ← table ready to pay
│   ├── payment-confirmed.mp3     ← payment success
│   └── new-message.mp3           ← manager message
│
└── manager/
    ├── session-abandoned.mp3     ← customer left with active order
    ├── new-staff-message.mp3     ← waiter or cashier message
    ├── low-inventory.mp3         ← stock critical
    └── daily-summary.mp3         ← end-of-day report ready
```

### 7.2 Sound Rules Per Role

| Role | Gets Sounds | Sound Trigger |
|---|---|---|
| Customer | ✅ Yes | Order updates, points, waiter response |
| Waiter | ✅ Yes | Customer call, new order, kitchen ready, messages |
| Kitchen | ✅ Yes | New order, cancellation, stock alerts, messages |
| Cashier | ✅ Yes | Payment request, payment success, messages |
| Manager | ✅ Yes | Session abandoned, staff messages, stock critical |
| **Admin** | ❌ **Never** | **Silent panel — no sounds at all** |

### 7.3 Sound Player Utility

```js
// src/shared/utils/soundPlayer.js

import { SOUNDS } from '@shared/config/sounds'

const audioCache = {}

export const playSound = (soundKey, role) => {
  // Admin always silenced
  if (role === 'admin') return

  // Respect user mute preference
  const muted = localStorage.getItem('kc_sounds_muted') === 'true'
  if (muted) return

  const path = SOUNDS[role]?.[soundKey]
  if (!path) return

  // Cache Audio objects for instant replay
  if (!audioCache[path]) {
    audioCache[path] = new Audio(path)
  }

  const audio = audioCache[path]
  audio.currentTime = 0
  audio.volume = parseFloat(localStorage.getItem('kc_sound_volume') || '0.7')
  audio.play().catch(() => {})  // Silent fail if browser blocks autoplay
}

// Hook for components
// useNotificationSound(event, role) → auto-plays on socket event
```

### 7.4 Sound Config File

```js
// src/shared/config/sounds.js

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
  admin: {},  // Empty — admin is always silent
}
```

### 7.5 In-App Notification Bell

```
NotificationBell.jsx — visible on all roles except Admin
  ↓
Unread count badge (red dot with number)
  ↓
Click → NotificationDropdown.jsx
  ↓
Shows notifications filtered by role:
  Customer:  order updates, loyalty points, waiter response
  Waiter:    customer calls, new orders, kitchen alerts, messages
  Kitchen:   new orders, cancellations, stock alerts, messages
  Cashier:   payment requests, manager messages
  Manager:   staff messages, abandoned sessions, stock critical
  Admin:     ← no bell, no dropdown, no sounds
```

---

## 8. Messaging & Calling System

> Role-to-role communication baked into each dashboard. Everyone who needs to talk, can.

### 8.1 Who Can Message / Call Whom

| From → To | Message | Voice Call | Notes |
|---|---|---|---|
| Customer → Waiter | ✅ via Call Waiter + note | ❌ | One-way request only |
| Waiter → Customer | ✅ status updates | ❌ | Waiter sends ETA/status |
| Waiter → Kitchen | ✅ text chat | ✅ voice | Real-time coordination |
| Waiter → Manager | ✅ text chat | ✅ voice | Escalation / help |
| Kitchen → Waiter | ✅ text chat | ✅ voice | Order ready / issues |
| Cashier → Manager | ✅ text chat | ❌ | Billing queries |
| Manager → Waiter | ✅ text chat | ✅ voice | Instructions |
| Manager → Kitchen | ✅ text chat | ❌ | Menu / stock changes |
| Manager → Cashier | ✅ text chat | ❌ | Billing instructions |
| Admin → * | ❌ | ❌ | Admin uses external channels |

---

### 8.2 Customer — Call Waiter Communication

```
Customer → Waiter:  CallWaiterPage (reason buttons + note)
Waiter → Customer:  Status updates shown in CallStatusBanner.jsx
                    "Your waiter is on the way 🙏"
                    "Done! Let us know if you need anything else ✅"
```

---

### 8.3 Waiter Dashboard — Messaging & Calling

```
WaiterDashboard.jsx
  ↓
Chat Panel (ChatDrawer.jsx / persistent on lg+):
  ├── Tab: Kitchen Chat
  │     WaiterKitchenChat.jsx
  │     Text messages + order item references
  │     e.g. "Table 7's Momo — how long?" + item tag
  │
  ├── Tab: Manager Chat
  │     WaiterManagerChat.jsx
  │     Text messages + escalation
  │
  └── Tab: Customer Requests (read-only from Call Waiter system)
        CallRequestCard.jsx — shows reasons, note, status

Voice Call:
  ├── Call Kitchen button → WaiterKitchenCallButton.jsx
  └── Call Manager button → WaiterManagerCallButton.jsx
      Both use WebRTC (simple peer) via Socket.io signaling
```

**Waiter Messaging Files:**
```
frontend/src/modules/waiter/
├── components/
│   ├── chat/
│   │   ├── ChatDrawer.jsx              ← slide-in on mobile, panel on lg+  [NEW]
│   │   ├── ChatTab.jsx                 ← tab switcher                      [NEW]
│   │   ├── WaiterKitchenChat.jsx       ← waiter ↔ kitchen                 [NEW]
│   │   ├── WaiterManagerChat.jsx       ← waiter ↔ manager                 [NEW]
│   │   ├── ChatBubble.jsx              ← single message bubble             [NEW]
│   │   ├── ChatInput.jsx               ← text + send button                [NEW]
│   │   └── OrderItemTag.jsx            ← attach order item to message      [NEW]
│   └── calling/
│       ├── WaiterKitchenCallButton.jsx ← initiate voice to kitchen         [NEW]
│       ├── WaiterManagerCallButton.jsx ← initiate voice to manager         [NEW]
│       └── ActiveCallOverlay.jsx       ← call UI (mute, hang up)           [NEW]
└── hooks/
    ├── useWaiterChat.js                ← socket-based chat state           [NEW]
    └── useVoiceCall.js                 ← WebRTC call handling              [NEW]
```

---

### 8.4 Kitchen Dashboard — Messaging & Calling

```
KitchenDisplayPage.jsx
  ↓
Chat Panel (slide-in on mobile, sidebar on lg+):
  └── Waiter Chat
        KitchenWaiterChat.jsx
        Can tag order items: "Order #47 Momo is ready"
        Can send quick replies: ✅ Ready | ⏳ 5 min | ❌ Unavailable

Voice Call:
  └── Answer Waiter Call button (WebRTC)
```

**Kitchen Messaging Files:**
```
frontend/src/modules/kitchen/
├── components/
│   ├── chat/
│   │   ├── KitchenChatPanel.jsx        ← sidebar panel                    [NEW]
│   │   ├── KitchenWaiterChat.jsx                                          [NEW]
│   │   ├── QuickReplyBar.jsx           ← "Ready" | "5 min" | "Unavail"   [NEW]
│   │   └── OrderItemTag.jsx            ← tag specific order item          [NEW]
│   └── calling/
│       └── KitchenCallHandler.jsx      ← answer/reject waiter calls       [NEW]
└── hooks/
    ├── useKitchenChat.js                                                   [NEW]
    └── useKitchenCall.js                                                   [NEW]
```

---

### 8.5 Manager Dashboard — Messaging & Calling

```
DashboardPage.jsx (Manager)
  ↓
Messages Panel (right sidebar on lg+, drawer on mobile):
  ├── Waiter messages (with call option)
  ├── Kitchen messages (text only)
  └── Cashier messages (text only)

Notifications Panel:
  ├── Session abandoned alerts
  ├── Low inventory critical alerts
  └── Staff escalations
```

**Manager Messaging Files:**
```
frontend/src/modules/manager/
├── components/
│   ├── messaging/
│   │   ├── ManagerMessageHub.jsx       ← all staff messages in one hub    [NEW]
│   │   ├── StaffChatThread.jsx         ← per-staff conversation           [NEW]
│   │   ├── MessageBadge.jsx            ← unread count on sidebar          [NEW]
│   │   └── EscalationCard.jsx          ← urgent issue card                [NEW]
│   └── calling/
│       ├── ManagerCallButton.jsx       ← call a waiter                    [NEW]
│       └── ActiveCallOverlay.jsx       ← shared call UI                   [NEW]
└── hooks/
    ├── useManagerMessages.js                                               [NEW]
    └── useManagerCalls.js                                                  [NEW]
```

---

### 8.6 Cashier Dashboard — Messaging

```
BillingPage.jsx (Cashier)
  ↓
Simple chat icon (top bar):
  └── Manager Chat → CashierManagerChat.jsx
        For billing questions, discounts, issues
        No voice call (cashier stays at register)
```

**Cashier Messaging Files:**
```
frontend/src/modules/cashier/
├── components/
│   └── chat/
│       ├── CashierChatIcon.jsx         ← top bar icon with unread badge   [NEW]
│       └── CashierManagerChat.jsx      ← cashier ↔ manager text only     [NEW]
└── hooks/
    └── useCashierChat.js                                                   [NEW]
```

---

### 8.7 Backend — Messaging & Calling

```
backend/src/modules/messaging/
├── message.controller.js
├── message.model.js                    ← from, to, role, content, orderId, readAt
├── message.routes.js
├── message.service.js
└── message.socket.js                   ← real-time message delivery       [KEY]

backend/src/modules/calling/
├── call.controller.js
├── call.model.js                       ← caller, receiver, startedAt, endedAt, duration
├── call.service.js
└── call.socket.js                      ← WebRTC signaling (offer/answer/ice)[KEY]
```

### 8.8 Message DB Model

```js
// backend/src/modules/messaging/message.model.js
{
  cafeId:       ObjectId,
  fromUserId:   ObjectId,
  fromRole:     String,            // waiter | kitchen | manager | cashier
  toUserId:     ObjectId,
  toRole:       String,
  content:      String,            // text content
  orderRef:     ObjectId,          // optional: tag a specific order
  itemRef:      ObjectId,          // optional: tag a specific menu item
  type:         String,            // text | quick_reply | system
  readAt:       Date,              // null until read
  createdAt:    Date,
}
```

### 8.9 WebRTC Call Flow (Waiter ↔ Kitchen)

```
Waiter taps "Call Kitchen" button
  ↓
call.socket.js emits: call:initiate { from: waiterId, to: kitchenId, role: 'waiter' }
  ↓
Kitchen receives: call:incoming
  KitchenCallHandler.jsx shows incoming call UI
  kitchen-call-ring.mp3 plays
  ↓
Kitchen taps "Answer"
  → call.socket.js emits: call:accepted
  → WebRTC offer/answer/ICE exchange via socket signaling
  → Peer-to-peer audio established
  ↓
Either party taps "Hang Up"
  → call:ended emitted
  → Call logged to call.model with duration
```

---

## 9. Smart Logout System

> Four rules, evaluated in priority order. Customers are never stranded, never locked in.

### 9.1 The 4 Rules

#### ✅ RULE 1 — Manual Logout ALLOWED
**Condition:** Customer taps "Logout" + NO active order

```
Check Redux orderSlice: any order with status [pending | preparing | on_the_way]?
  → NO → Confirm dialog → logoutService.execute()
     → POST /auth/logout
     → clearAuth + clearCart + clearTableSession + socket.disconnect
     → localStorage.clear() → navigate('/login')
```

#### ❌ RULE 2 — Manual Logout BLOCKED
**Condition:** Customer taps "Logout" + HAS active order

```
LogoutButton.jsx → DISABLED (greyed, never hidden)
LogoutBlockedTooltip.jsx: "You have an active order. Logout after delivery."
TrackingPage link shown instead
Button auto-enables when order → delivered or paid
```

#### 🔄 RULE 3 — Auto Logout on Payment
**Condition:** Socket event `order:payment_confirmed` received

```
Cashier confirms payment → order:payment_confirmed (Socket)
  → 8 second PaymentSuccessPage (confetti + points)
  → logoutService.execute() automatic
  → table:freed → waiter + manager notified
```

#### 📡 RULE 4 — Auto Logout on Geofence Exit
**Condition:** GPS watcher detects customer outside cafe boundary

```
useGpsWatcher.js polls every 30s
  → Outside + no active order → immediate logout
  → Outside + active order:
      Start 5-min grace timer
      Notify manager: session:abandoned
      Returns within 5 min → cancel timer → resume
      Still outside 5 min → ABANDONED → logout
```

### 9.2 Decision Tree

```
Logout Triggered
│
├── Manual tap
│   ├── Active order? YES → BLOCK (disabled button + tooltip)
│   └── Active order? NO  → Confirm → logoutService.execute() ✓
│
├── order:payment_confirmed (socket)
│   └── 8s screen → logoutService.execute() ✓
│
└── GPS boundary exit
    ├── No active order → Immediate logout ✓
    └── Active order → 5-min grace
        ├── Returns → resume session
        └── Still outside → ABANDONED → logout ✓
```

### 9.3 Order Status → Logout Permission

| Status | Manual | Auto | Reason |
|---|---|---|---|
| *(none)* | ✅ | — | Nothing active |
| `pending` | ❌ | — | Kitchen not confirmed |
| `preparing` | ❌ | — | Kitchen working |
| `on_the_way` | ❌ | — | Waiter delivering |
| `delivered` | ✅ | — | Received, unpaid OK |
| `paid` | — | 🔄 Rule 3 | Payment confirmed |
| `cancelled` | ✅ | — | Order dead |

---

## 10. GPS-Primary Table Session

### 10.1 Detection Flow

```
Customer opens app
  ↓
GPS permission requested immediately
  ↓
GRANTED → 3 readings × 400ms → drop outlier → confidence score
  ├── ≥ 85% → KD-Tree nearest table (Redis O(1)) → SESSION CREATED ✓
  └── < 85% → Show QR scanner → HMAC verify → SESSION CREATED ✓

DENIED / TIMEOUT (4s) → QR scanner shown → SESSION CREATED ✓

BOTH FAIL → Manual table number → Manager notified ✓
```

### 10.2 Manager Table Setup

```
1. Manager walks to table → capture 5 GPS readings → avg ±1–2m
2. Set: table number, capacity, zone, radius (default 1.5m)
3. Boundary collision check → no overlapping radii
4. Save → MongoDB 2dsphere index
5. HMAC-signed QR auto-generated
6. Coords cached in Redis → 0 DB hits on GPS path
```

### 10.3 Latency Budget

```
GPS path:    ~1.5s total  (0 DB queries — Redis only)
QR path:     ~560ms total
GPS timeout: 4s max → QR fallback auto-triggers
```

---

## 11. Customer Workflow

```
STEP 1 → Enter Cafe
  GPS geofence verified ✓ → DetectionEngine starts

STEP 2 → Table Session
  GPS ≥ 85% confidence → auto-assign table
  OR GPS fails → scan QR → HMAC verify

STEP 3 → Login
  Google One-Tap OR Guest (instant)

STEP 4 → Browse Menu
  RecommendedSection shows:
    → Weather-based picks (real-time OpenWeatherMap)
    → Personal favourites (order history)
    → Discovery items (similar customers liked)
  SkeletonMenuCard → GSAP stagger reveal
  CategoryPills + SearchBar + BannerSwiper

STEP 5 → Cart & Checkout
  Loyalty discount auto-applied
  Guest: 0% | Bronze: 5% | Silver: 10% | Gold: 15%

STEP 6 → Place Order
  Kitchen KDS updates live (Socket.io)
  Waiter notified

STEP 7 → Track Order
  Received → Preparing → On the Way → Delivered

STEP 8 → Call Waiter (anytime)
  CallWaiterPage → reason buttons from order items + basics
  Waiter alerted with sound → "Coming" → "Done"

STEP 9 → Payment
  Cashier confirms → order:payment_confirmed

STEP 10 → Points + Auto-Logout
  ConfettiEffect + tier update
  8s PaymentSuccessPage → auto-logout → table freed
```

---

## 12. Frontend Folder Structure

```
frontend/
│
├── public/
│   ├── fonts/                           # Baloo 2, Noto Devanagari (self-hosted)
│   ├── images/
│   │   ├── logo/
│   │   ├── menu/
│   │   ├── avatars/
│   │   └── banners/
│   ├── models/                          # face-api.js ML models
│   │   ├── face_landmark_68_model/
│   │   ├── face_recognition_model/
│   │   └── ssd_mobilenetv1_model/
│   ├── sounds/
│   │   ├── customer/
│   │   │   ├── order-confirmed.mp3
│   │   │   ├── order-preparing.mp3
│   │   │   ├── order-ready.mp3
│   │   │   ├── order-delivered.mp3
│   │   │   ├── points-earned.mp3
│   │   │   ├── tier-upgraded.mp3
│   │   │   └── waiter-coming.mp3
│   │   ├── waiter/
│   │   │   ├── new-waiter-call.mp3
│   │   │   ├── new-order.mp3
│   │   │   ├── order-ready-pickup.mp3
│   │   │   ├── new-message.mp3
│   │   │   └── urgent-alert.mp3
│   │   ├── kitchen/
│   │   │   ├── new-order-bell.mp3
│   │   │   ├── order-cancelled.mp3
│   │   │   ├── low-stock-alert.mp3
│   │   │   └── new-message.mp3
│   │   ├── cashier/
│   │   │   ├── payment-request.mp3
│   │   │   ├── payment-confirmed.mp3
│   │   │   └── new-message.mp3
│   │   └── manager/
│   │       ├── session-abandoned.mp3
│   │       ├── new-staff-message.mp3
│   │       ├── low-inventory.mp3
│   │       └── daily-summary.mp3
│   │       # admin/ → intentionally empty — NO sounds for admin
│   └── icons/
│       ├── favicon.ico
│       └── pwa/
│
├── src/
│   │
│   ├── app/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── providers.jsx
│   │   └── routes/
│   │       ├── AppRoutes.jsx
│   │       ├── ProtectedRoute.jsx
│   │       ├── GuestRoute.jsx
│   │       └── roleRoutes.js
│   │
│   ├── modules/
│   │   │
│   │   ├── customer/                    # 🛒 MOBILE PRIMARY (xs/sm)
│   │   │   ├── components/
│   │   │   │   ├── login/
│   │   │   │   │   ├── LoginCard.jsx
│   │   │   │   │   ├── GpsVerifyBadge.jsx
│   │   │   │   │   ├── LoyaltyTeaser.jsx
│   │   │   │   │   └── SkeletonLoginCard.jsx
│   │   │   │   ├── menu/
│   │   │   │   │   ├── MenuGrid.jsx               # grid-cols-2 mobile
│   │   │   │   │   ├── MenuCard.jsx               # VanillaTilt gyroscope mobile
│   │   │   │   │   ├── CategoryPills.jsx          # overflow-x-auto
│   │   │   │   │   ├── SearchBar.jsx              # sticky top
│   │   │   │   │   ├── BannerSwiper.jsx           # Swiper.js
│   │   │   │   │   ├── RecommendedSection.jsx     # weather+history recs    [NEW]
│   │   │   │   │   ├── RecommendedCard.jsx        # card + weather tag      [NEW]
│   │   │   │   │   ├── WeatherBadge.jsx           # "☔ Rainy day pick"     [NEW]
│   │   │   │   │   ├── SkeletonMenuCard.jsx
│   │   │   │   │   └── EmptyState.jsx
│   │   │   │   ├── cart/
│   │   │   │   │   ├── CartItem.jsx
│   │   │   │   │   ├── CartSummary.jsx            # sticky bottom
│   │   │   │   │   ├── LoyaltyDiscount.jsx
│   │   │   │   │   ├── EmptyCart.jsx
│   │   │   │   │   └── PlaceOrderButton.jsx       # full-width
│   │   │   │   ├── tracking/
│   │   │   │   │   ├── OrderTracker.jsx
│   │   │   │   │   ├── TrackingStep.jsx
│   │   │   │   │   ├── OrderSummaryCard.jsx
│   │   │   │   │   └── EstimatedTime.jsx
│   │   │   │   ├── callwaiter/                    #                        [NEW]
│   │   │   │   │   ├── CallWaiterSheet.jsx        # bottom-sheet modal
│   │   │   │   │   ├── ReasonButton.jsx           # colored reason btn
│   │   │   │   │   ├── ReasonSection.jsx          # section + grid
│   │   │   │   │   ├── CallStatusBanner.jsx       # "Waiter coming 🙏"
│   │   │   │   │   └── CustomNoteInput.jsx        # optional message
│   │   │   │   ├── loyalty/
│   │   │   │   │   ├── TierCard.jsx
│   │   │   │   │   ├── TierProgress.jsx
│   │   │   │   │   ├── TierComparison.jsx
│   │   │   │   │   └── HowToEarn.jsx
│   │   │   │   ├── profile/
│   │   │   │   │   ├── ProfileHeader.jsx
│   │   │   │   │   ├── OrderHistory.jsx
│   │   │   │   │   ├── FavoritesSection.jsx
│   │   │   │   │   ├── LogoutButton.jsx           # disabled if active order
│   │   │   │   │   └── LogoutBlockedTooltip.jsx
│   │   │   │   └── notifications/
│   │   │   │       ├── NotificationBell.jsx
│   │   │   │       └── NotificationDropdown.jsx
│   │   │   │
│   │   │   ├── hooks/
│   │   │   │   ├── useGoogleAuth.js
│   │   │   │   ├── useGuestSession.js
│   │   │   │   ├── useGpsVerify.js
│   │   │   │   ├── useCart.js
│   │   │   │   ├── useMenu.js
│   │   │   │   ├── useOrders.js
│   │   │   │   ├── useLoyalty.js
│   │   │   │   ├── useTableSession.js
│   │   │   │   ├── useRecommendations.js          # weather + history      [UPDATED]
│   │   │   │   ├── useOrderTracking.js
│   │   │   │   ├── useFavorites.js
│   │   │   │   ├── useWeather.js                  # OpenWeatherMap
│   │   │   │   ├── useCallWaiter.js               # call state             [NEW]
│   │   │   │   ├── useLogout.js                   # master orchestrator    [NEW]
│   │   │   │   ├── useLogoutGuard.js              # active order check     [NEW]
│   │   │   │   ├── useGpsWatcher.js               # 30s boundary polling   [NEW]
│   │   │   │   └── usePaymentLogoutTrigger.js     # payment socket         [NEW]
│   │   │   │
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   ├── TableDetectionPage.jsx
│   │   │   │   ├── MenuPage.jsx
│   │   │   │   ├── CartPage.jsx
│   │   │   │   ├── TrackingPage.jsx
│   │   │   │   ├── CallWaiterPage.jsx             # full page route        [NEW]
│   │   │   │   ├── LoyaltyPage.jsx
│   │   │   │   ├── ProfilePage.jsx
│   │   │   │   ├── PaymentPage.jsx
│   │   │   │   └── PaymentSuccessPage.jsx         # 8s → auto-logout
│   │   │   │
│   │   │   ├── utils/
│   │   │   │   └── buildCallReasons.js            # dynamic reason builder [NEW]
│   │   │   │
│   │   │   └── services/
│   │   │       ├── authService.js
│   │   │       ├── menuService.js
│   │   │       ├── orderService.js
│   │   │       ├── loyaltyService.js
│   │   │       ├── tableSessionService.js
│   │   │       ├── recommendationService.js       # weather + history API  [UPDATED]
│   │   │       ├── callWaiterService.js           # call API + socket      [NEW]
│   │   │       └── logoutService.js               # clears everything      [NEW]
│   │   │
│   │   ├── table/                       # 📡 GPS + QR Detection Module
│   │   │   ├── detection/
│   │   │   │   ├── DetectionEngine.js             # GPS + QR orchestrator
│   │   │   │   ├── GpsDetector.js
│   │   │   │   ├── QrDetector.js
│   │   │   │   ├── ConfidenceScorer.js
│   │   │   │   ├── haversine.js
│   │   │   │   └── detectionMachine.js            # XState
│   │   │   ├── hooks/
│   │   │   │   ├── useTableDetection.js
│   │   │   │   ├── useGpsWatcher.js
│   │   │   │   ├── useQrScanner.js
│   │   │   │   ├── useTableSession.js
│   │   │   │   └── useSessionHeartbeat.js
│   │   │   ├── components/
│   │   │   │   ├── DetectionScreen.jsx
│   │   │   │   ├── GpsStatusIndicator.jsx
│   │   │   │   ├── QrScannerOverlay.jsx
│   │   │   │   ├── TableConfirmCard.jsx
│   │   │   │   ├── DetectionFallback.jsx
│   │   │   │   └── SessionActiveBanner.jsx
│   │   │   └── services/
│   │   │       ├── tableSession.service.js
│   │   │       └── tableSession.socket.js
│   │   │
│   │   ├── waiter/                      # 🧑‍💼 MOBILE + TABLET (sm/md)
│   │   │   ├── components/
│   │   │   │   ├── TableLayout.jsx                # sm: list | md+: floor map
│   │   │   │   ├── AssignedTables.jsx
│   │   │   │   ├── ActiveOrders.jsx
│   │   │   │   ├── CustomerRequest.jsx
│   │   │   │   ├── ZoneSelector.jsx
│   │   │   │   ├── WaiterCallAlert.jsx            # fixed toast + sound    [UPDATED]
│   │   │   │   ├── CallRequestCard.jsx            # reason list + ack      [NEW]
│   │   │   │   ├── CallHistoryList.jsx            # today's calls          [NEW]
│   │   │   │   ├── chat/                          #                        [NEW]
│   │   │   │   │   ├── ChatDrawer.jsx
│   │   │   │   │   ├── ChatTab.jsx
│   │   │   │   │   ├── WaiterKitchenChat.jsx
│   │   │   │   │   ├── WaiterManagerChat.jsx
│   │   │   │   │   ├── ChatBubble.jsx
│   │   │   │   │   ├── ChatInput.jsx
│   │   │   │   │   └── OrderItemTag.jsx
│   │   │   │   └── calling/                       #                        [NEW]
│   │   │   │       ├── WaiterKitchenCallButton.jsx
│   │   │   │       ├── WaiterManagerCallButton.jsx
│   │   │   │       └── ActiveCallOverlay.jsx
│   │   │   ├── hooks/
│   │   │   │   ├── useWaiterOrders.js
│   │   │   │   ├── useTables.js
│   │   │   │   ├── useWaiterNotifications.js
│   │   │   │   ├── useWaiterCalls.js              # receive + ack calls    [NEW]
│   │   │   │   ├── useWaiterChat.js               # socket chat            [NEW]
│   │   │   │   └── useVoiceCall.js                # WebRTC                 [NEW]
│   │   │   ├── pages/
│   │   │   │   ├── WaiterDashboard.jsx            # sm: tabs | md+: split
│   │   │   │   ├── TablesPage.jsx
│   │   │   │   └── OrdersPage.jsx
│   │   │   └── services/
│   │   │       ├── waiterService.js
│   │   │       └── tableService.js
│   │   │
│   │   ├── kitchen/                     # 👨‍🍳 MOBILE + TABLET LANDSCAPE
│   │   │   ├── components/
│   │   │   │   ├── KitchenDisplay.jsx             # sm: 1-col | md+: 3-col
│   │   │   │   ├── OrderCard.jsx
│   │   │   │   ├── OrderQueue.jsx
│   │   │   │   ├── OrderTimer.jsx                 # text-4xl md:text-5xl
│   │   │   │   ├── InventoryAlert.jsx
│   │   │   │   ├── chat/                          #                        [NEW]
│   │   │   │   │   ├── KitchenChatPanel.jsx
│   │   │   │   │   ├── KitchenWaiterChat.jsx
│   │   │   │   │   ├── QuickReplyBar.jsx          # Ready|5min|Unavailable
│   │   │   │   │   └── OrderItemTag.jsx
│   │   │   │   └── calling/                       #                        [NEW]
│   │   │   │       └── KitchenCallHandler.jsx     # answer/reject calls
│   │   │   ├── hooks/
│   │   │   │   ├── useKitchenOrders.js
│   │   │   │   ├── useInventory.js
│   │   │   │   ├── useKitchenChat.js              #                        [NEW]
│   │   │   │   └── useKitchenCall.js              #                        [NEW]
│   │   │   ├── pages/
│   │   │   │   ├── KitchenDisplayPage.jsx
│   │   │   │   └── InventoryPage.jsx
│   │   │   └── services/
│   │   │       └── kitchenService.js
│   │   │
│   │   ├── cashier/                     # 💰 MOBILE + TABLET
│   │   │   ├── components/
│   │   │   │   ├── CashRegister.jsx
│   │   │   │   ├── BillingPanel.jsx
│   │   │   │   ├── PaymentForm.jsx
│   │   │   │   ├── SplitBillModal.jsx
│   │   │   │   ├── TransactionList.jsx
│   │   │   │   └── chat/                          #                        [NEW]
│   │   │   │       ├── CashierChatIcon.jsx        # top bar with badge
│   │   │   │       └── CashierManagerChat.jsx     # cashier ↔ manager
│   │   │   ├── hooks/
│   │   │   │   ├── useBilling.js
│   │   │   │   ├── useTransactions.js
│   │   │   │   └── useCashierChat.js              #                        [NEW]
│   │   │   ├── pages/
│   │   │   │   ├── BillingPage.jsx
│   │   │   │   └── TransactionsPage.jsx
│   │   │   └── services/
│   │   │       └── billingService.js
│   │   │
│   │   ├── manager/                     # 📊 ALL SCREENS RESPONSIVE
│   │   │   ├── components/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── SalesAnalytics.jsx             # ResponsiveContainer
│   │   │   │   ├── StaffManagement.jsx
│   │   │   │   ├── TableManagement.jsx
│   │   │   │   ├── InventoryOverview.jsx
│   │   │   │   ├── ReportsPanel.jsx
│   │   │   │   ├── QRCodeDisplay.jsx
│   │   │   │   ├── CreateStaffModal.jsx
│   │   │   │   ├── LoyaltyConfig.jsx
│   │   │   │   ├── messaging/                     #                        [NEW]
│   │   │   │   │   ├── ManagerMessageHub.jsx      # all staff in one panel
│   │   │   │   │   ├── StaffChatThread.jsx
│   │   │   │   │   ├── MessageBadge.jsx
│   │   │   │   │   └── EscalationCard.jsx
│   │   │   │   └── calling/                       #                        [NEW]
│   │   │   │       ├── ManagerCallButton.jsx
│   │   │   │       └── ActiveCallOverlay.jsx
│   │   │   ├── hooks/
│   │   │   │   ├── useDashboard.js
│   │   │   │   ├── useSalesAnalytics.js
│   │   │   │   ├── useStaffManagement.js
│   │   │   │   ├── useTableManagement.js
│   │   │   │   ├── useReports.js
│   │   │   │   ├── useInventory.js
│   │   │   │   ├── useManagerMessages.js          #                        [NEW]
│   │   │   │   └── useManagerCalls.js             #                        [NEW]
│   │   │   ├── pages/
│   │   │   │   ├── DashboardPage.jsx
│   │   │   │   ├── StaffPage.jsx
│   │   │   │   ├── TablesPage.jsx
│   │   │   │   ├── ReportsPage.jsx
│   │   │   │   ├── InventoryPage.jsx
│   │   │   │   └── LoyaltyConfigPage.jsx
│   │   │   └── services/
│   │   │       ├── managerService.js
│   │   │       ├── staffService.js
│   │   │       └── tableService.js
│   │   │
│   │   └── admin/                       # 🔐 ALL SCREENS — NO SOUNDS
│   │       ├── components/
│   │       │   ├── CafeList.jsx
│   │       │   ├── CafeCard.jsx
│   │       │   ├── SubscriptionPanel.jsx
│   │       │   ├── UsageStats.jsx
│   │       │   └── BillingConfig.jsx
│   │       ├── pages/
│   │       │   ├── AdminDashboard.jsx
│   │       │   ├── CafesPage.jsx
│   │       │   └── SubscriptionsPage.jsx
│   │       └── services/
│   │           └── adminService.js
│   │
│   ├── shared/
│   │   ├── animations/
│   │   │   ├── gsap.config.js
│   │   │   ├── pageTransitions.js
│   │   │   ├── scrollAnimations.js
│   │   │   ├── microInteractions.js
│   │   │   └── preloader.js
│   │   │
│   │   ├── config/                      # 🎨 GLOBAL CONFIG FILES
│   │   │   ├── colors.js               # ← SINGLE SOURCE OF TRUTH for colors [KEY]
│   │   │   └── sounds.js               # ← SINGLE SOURCE OF TRUTH for sounds [KEY]
│   │   │
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Input.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── Badge.jsx
│   │   │   │   ├── Avatar.jsx
│   │   │   │   ├── Divider.jsx
│   │   │   │   └── index.js
│   │   │   ├── skeleton/
│   │   │   │   ├── SkeletonCard.jsx
│   │   │   │   ├── SkeletonText.jsx
│   │   │   │   ├── SkeletonAvatar.jsx
│   │   │   │   └── SkeletonList.jsx
│   │   │   ├── feedback/
│   │   │   │   ├── Toast.jsx
│   │   │   │   ├── ErrorBoundary.jsx
│   │   │   │   ├── EmptyState.jsx
│   │   │   │   ├── LoadingSpinner.jsx
│   │   │   │   └── SuccessAnimation.jsx
│   │   │   ├── layout/
│   │   │   │   ├── BottomNav.jsx                  # Customer only — 5 tabs
│   │   │   │   ├── TopHeader.jsx                  # all roles + notification bell
│   │   │   │   ├── DashboardLayout.jsx            # Manager + Admin sidebar
│   │   │   │   ├── AuthLayout.jsx
│   │   │   │   └── PageWrapper.jsx
│   │   │   └── effects/
│   │   │       ├── Preloader.jsx
│   │   │       ├── FloatingBubbles.jsx
│   │   │       ├── SteamAnimation.jsx
│   │   │       └── ConfettiEffect.jsx
│   │   │
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   ├── CartContext.jsx
│   │   │   ├── ThemeContext.jsx
│   │   │   ├── ToastContext.jsx
│   │   │   └── SocketContext.jsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useToast.js
│   │   │   ├── useTheme.js
│   │   │   ├── useSocket.js
│   │   │   ├── useDebounce.js
│   │   │   ├── useLocalStorage.js
│   │   │   ├── useScrollLock.js
│   │   │   ├── useMediaQuery.js
│   │   │   └── useNotificationSound.js            # role-aware sound hook  [NEW]
│   │   │
│   │   ├── services/
│   │   │   ├── socket.service.js
│   │   │   ├── geofencing.service.js
│   │   │   ├── notification.service.js
│   │   │   └── weather.service.js                 # OpenWeatherMap API wrapper
│   │   │
│   │   └── utils/
│   │       ├── api.js
│   │       ├── formatters.js
│   │       ├── validators.js
│   │       ├── constants.js
│   │       ├── soundPlayer.js                     # role-aware, admin silenced [UPDATED]
│   │       ├── vibration.js
│   │       ├── qrParser.js
│   │       └── session.js
│   │
│   ├── store/
│   │   ├── index.js
│   │   └── slices/
│   │       ├── authSlice.js
│   │       ├── cartSlice.js
│   │       ├── menuSlice.js
│   │       ├── orderSlice.js                      # active orders → logout guard reads
│   │       ├── loyaltySlice.js
│   │       ├── notificationSlice.js
│   │       ├── tableSessionSlice.js               #                        [NEW]
│   │       ├── callWaiterSlice.js                 # call state             [NEW]
│   │       └── messagingSlice.js                  # chat state             [NEW]
│   │
│   ├── api/
│   │   ├── axios.js
│   │   └── endpoints.js
│   │
│   └── styles/
│       ├── globals.css                            # CSS vars from colors.js
│       ├── animations.css
│       ├── skeleton.css
│       └── tailwind.css
│
├── index.html
├── vite.config.js
├── tailwind.config.js                             # extends colors from colors.js
├── postcss.config.js
├── eslint.config.js
└── package.json
```

---

## 13. Backend Folder Structure

```
backend/
│
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.middleware.js
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.service.js
│   │   │   ├── google.strategy.js
│   │   │   ├── guest.strategy.js
│   │   │   ├── logout.controller.js             # POST /auth/logout       [NEW]
│   │   │   ├── logout.service.js                                          [NEW]
│   │   │   └── logout.events.js                 # listens payment_confirmed[NEW]
│   │   │
│   │   ├── table-session/
│   │   │   ├── tableSession.controller.js
│   │   │   ├── tableSession.service.js
│   │   │   ├── tableSession.routes.js
│   │   │   ├── tableSession.model.js
│   │   │   ├── tableSession.validator.js
│   │   │   ├── tableSession.socket.js
│   │   │   ├── tableSession.cache.js            # Redis sessions
│   │   │   └── algorithms/
│   │   │       ├── nearestTable.js              # Haversine + KD-Tree
│   │   │       ├── confidenceEngine.js
│   │   │       ├── boundaryCollision.js
│   │   │       └── qrHmacVerify.js              # HMAC-SHA256
│   │   │
│   │   ├── waiter-call/                         #                         [NEW MODULE]
│   │   │   ├── waiterCall.controller.js
│   │   │   ├── waiterCall.model.js
│   │   │   ├── waiterCall.routes.js
│   │   │   ├── waiterCall.service.js
│   │   │   └── waiterCall.socket.js             # emit + ack events
│   │   │
│   │   ├── messaging/                           #                         [NEW MODULE]
│   │   │   ├── message.controller.js
│   │   │   ├── message.model.js
│   │   │   ├── message.routes.js
│   │   │   ├── message.service.js
│   │   │   └── message.socket.js                # real-time delivery
│   │   │
│   │   ├── calling/                             #                         [NEW MODULE]
│   │   │   ├── call.controller.js
│   │   │   ├── call.model.js
│   │   │   ├── call.service.js
│   │   │   └── call.socket.js                   # WebRTC signaling
│   │   │
│   │   ├── recommendations/
│   │   │   ├── recommendation.controller.js
│   │   │   ├── recommendation.service.js        # scoring algorithm       [UPDATED]
│   │   │   ├── recommendation.routes.js
│   │   │   ├── weatherMapping.js                # weather → category map  [NEW]
│   │   │   ├── timeMapping.js                   # time-of-day → category  [NEW]
│   │   │   └── collaborativeFilter.js           # similar customers boost [NEW]
│   │   │
│   │   ├── geofence/
│   │   │   ├── geofenceExit.handler.js          # Rule 4 trigger
│   │   │   ├── cafeGeofence.js
│   │   │   └── geofence.service.js
│   │   │
│   │   ├── table/
│   │   │   ├── table.model.js                   # lat, lng, radius, zone
│   │   │   ├── table.controller.js
│   │   │   ├── table.service.js
│   │   │   ├── table.routes.js
│   │   │   └── qrGenerator.js                   # HMAC-signed QR
│   │   │
│   │   ├── loyalty/
│   │   │   ├── loyalty.controller.js
│   │   │   ├── loyalty.model.js
│   │   │   ├── loyalty.routes.js
│   │   │   ├── loyalty.service.js               # Bronze/Silver/Gold
│   │   │   └── loyaltyTransaction.model.js
│   │   │
│   │   ├── weather/
│   │   │   └── weather.service.js               # OpenWeatherMap API      [NEW]
│   │   │
│   │   ├── billing/
│   │   ├── biometric/
│   │   ├── customer/
│   │   ├── inventory/
│   │   ├── kitchen/
│   │   ├── manager/
│   │   ├── menu/
│   │   ├── notification/
│   │   ├── order/
│   │   ├── report/
│   │   ├── request/
│   │   ├── restaurant/
│   │   ├── user/
│   │   ├── waiter/
│   │   └── zone/
│   │
│   ├── websockets/
│   │   ├── handlers/
│   │   │   ├── kitchen.socket.js
│   │   │   ├── order.socket.js
│   │   │   ├── table.socket.js
│   │   │   ├── waiter.socket.js
│   │   │   ├── manager.socket.js
│   │   │   ├── logout.socket.js                 # geofence + abandoned    [NEW]
│   │   │   ├── waiterCall.socket.js             # call waiter events      [NEW]
│   │   │   ├── message.socket.js                # chat events             [NEW]
│   │   │   └── call.socket.js                   # WebRTC signaling        [NEW]
│   │   ├── socket.service.js
│   │   └── index.js
│   │
│   ├── config/
│   │   ├── database.js
│   │   ├── env.js
│   │   ├── jwt.js
│   │   ├── google-oauth.js
│   │   └── index.js
│   │
│   ├── shared/
│   │   ├── middleware/
│   │   │   ├── errorHandler.js
│   │   │   ├── roleCheck.js
│   │   │   ├── rateLimiter.js
│   │   │   ├── gpsVerify.js
│   │   │   ├── validateGpsPayload.js
│   │   │   ├── sessionConflict.js
│   │   │   └── validation.js
│   │   └── utils/
│   │       ├── AppError.js
│   │       ├── response.js
│   │       ├── constants.js
│   │       ├── qrGenerator.js
│   │       └── location.js
│   │
│   ├── app.js
│   └── server.js
│
├── scripts/
│   ├── db/
│   │   ├── seed.js
│   │   └── fix-table-indexes.js
│   └── admin/
│       ├── createManager.js
│       ├── createWaiter.js
│       ├── resetPassword.js
│       └── cleanup-test-users.js
│
├── uploads/
│   ├── menu/
│   └── qrcodes/
├── logs/
├── jest.config.js
├── nodemon.json
└── package.json
```

---

## 14. WebSocket Events

### Order Events
| Event | Direction | Roles | Sound |
|---|---|---|---|
| `order:placed` | C→S | — | customer: order-confirmed |
| `order:preparing` | S→C | Customer, Manager | customer: order-preparing |
| `order:ready` | S→W | Waiter | waiter: order-ready-pickup |
| `order:delivered` | S→C | Customer | customer: order-delivered |
| `order:payment_confirmed` | S→C | Customer, Cashier | customer: auto-logout; cashier: payment-confirmed |
| `order:cancelled` | S→All | Kitchen, Waiter | kitchen: order-cancelled |

### Call Waiter Events
| Event | Direction | Roles | Sound |
|---|---|---|---|
| `waiter:call-request` | C→S | Waiter | waiter: new-waiter-call |
| `waiter:acknowledged` | S→C | Customer | customer: waiter-coming |
| `waiter:on_the_way` | S→C | Customer | customer: waiter-coming |
| `waiter:call-done` | S→C | Customer | — |

### Messaging Events
| Event | Direction | Roles | Sound |
|---|---|---|---|
| `message:sent` | C→S | Sender | — |
| `message:received` | S→C | Receiver | role: new-message |
| `message:read` | C→S | — | — |

### Calling Events (WebRTC)
| Event | Direction | Description |
|---|---|---|
| `call:initiate` | C→S | Start call offer |
| `call:incoming` | S→C | Notify receiver |
| `call:accepted` | C→S | Receiver answered |
| `call:offer` | C→S | WebRTC SDP offer |
| `call:answer` | S→C | WebRTC SDP answer |
| `call:ice-candidate` | Both | ICE candidate exchange |
| `call:ended` | C→S | Call terminated |

### Session Events
| Event | Roles | Sound |
|---|---|---|
| `session:created` | Waiter, Manager | — |
| `session:closed` | All | — |
| `session:abandoned` | Manager | manager: session-abandoned |
| `table:freed` | Waiter, Manager | — |
| `table:detection-fail` | Manager | — |

### Inventory Events
| Event | Roles | Sound |
|---|---|---|
| `inventory:low-stock` | Kitchen, Manager | kitchen: low-stock-alert; manager: low-inventory |
| `inventory:out-of-stock` | Kitchen, Waiter, Manager | kitchen: low-stock-alert |

---

## 15. Loyalty System

| Tier | Points | Discount | Perks |
|---|---|---|---|
| 🥉 Bronze | 0–499 | 5% | Daily specials, birthday bonus |
| 🥈 Silver | 500–999 | 10% | Priority queue, 2× weekend pts |
| 🥇 Gold | 1000+ | 15% | Reserved seating, 3× pts always |

**Points Flow:**
```
Payment confirmed → loyalty.service.js calculates points
  → loyaltyTransaction.model updated
  → tier recalculated
  → Redux loyaltySlice updated
  → ConfettiEffect + tier-upgraded.mp3 (if tier-up)
  → PaymentSuccessPage shows earnings
```

---

## 16. Roles & Permissions

| Role | Route | Screen | Sounds | Messaging | Calling |
|---|---|---|---|---|---|
| 🛒 Customer | `/menu` | Mobile PRIMARY | ✅ Yes | Via Call Waiter | ❌ |
| 🧑‍💼 Waiter | `/waiter` | Mobile + Tablet | ✅ Yes | Kitchen + Manager | ✅ Kitchen, Manager |
| 👨‍🍳 Kitchen | `/kitchen` | Tablet landscape | ✅ Yes | Waiter | ✅ Waiter |
| 💰 Cashier | `/cashier` | Mobile + Tablet | ✅ Yes | Manager | ❌ |
| 📊 Manager | `/manager` | All screens | ✅ Yes | All staff | ✅ Waiter |
| 🔐 Admin | `/admin` | All screens | ❌ **Never** | ❌ | ❌ |

---

## 17. Vite Aliases & Environment Variables

### Vite Aliases

```js
// vite.config.js
resolve: {
  alias: {
    '@':           '/src',
    '@app':        '/src/app',
    '@modules':    '/src/modules',
    '@shared':     '/src/shared',
    '@store':      '/src/store',
    '@api':        '/src/api',
    '@styles':     '/src/styles',
    '@animations': '/src/shared/animations',
    '@colors':     '/src/shared/config/colors',   // import colors anywhere
    '@sounds':     '/src/shared/config/sounds',   // import sounds anywhere
  }
}
```

### Frontend `.env`

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_OPENWEATHER_API_KEY=your_openweather_key

# GPS Table Detection
VITE_GPS_CONFIDENCE_MIN=85
VITE_GPS_TIMEOUT_MS=4000
VITE_GPS_READINGS_COUNT=3
VITE_GPS_POLL_INTERVAL=30000

# QR Fallback
VITE_QR_TOKEN_TTL=900

# Smart Logout
VITE_PAYMENT_LOGOUT_DELAY_MS=8000
VITE_LOGOUT_GRACE_MS=300000
VITE_SESSION_IDLE_TIMEOUT=7200

# Recommendations
VITE_RECOMMENDATION_COUNT=6
VITE_WEATHER_WEIGHT=0.4
VITE_HISTORY_WEIGHT=0.6
VITE_HISTORY_DAYS=30

# Sound
VITE_DEFAULT_SOUND_VOLUME=0.7
```

### Backend `.env`

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/kausichiya
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
QR_HMAC_SECRET=your_qr_hmac_secret
OPENWEATHER_API_KEY=your_openweather_key
OPENWEATHER_BASE_URL=https://api.openweathermap.org/data/2.5

# GPS
GPS_ACCURACY_THRESHOLD=5
GPS_CONFIDENCE_MIN=85
QR_TOKEN_TTL=900

# Session
SESSION_IDLE_TIMEOUT=7200
GEOFENCE_GRACE_PERIOD_MS=300000

# Recommendations
RECOMMENDATION_HISTORY_DAYS=30
RECOMMENDATION_COUNT=6
```

---

## 18. Key Libraries

### Frontend
| Library | Purpose |
|---|---|
| GSAP + ScrollTrigger | Page transitions, stagger reveals |
| Anime.js | Micro-interactions |
| Swiper.js | Touch carousels |
| Vanilla Tilt | 3D card hover |
| Typed.js | Typewriter text |
| Lucide React | Icons |
| Recharts | Analytics charts (ResponsiveContainer) |
| Lenis | Smooth scroll |
| face-api.js | Face recognition login |
| Redux Toolkit | Global state |
| Socket.io client | Real-time |
| XState | Table detection state machine |
| simple-peer | WebRTC voice calls |
| OpenWeatherMap API | Weather for recommendations |

### Backend
| Library | Purpose |
|---|---|
| Express | HTTP server |
| Mongoose | MongoDB ODM |
| Socket.io | WebSocket server |
| ioredis | Redis client |
| jsonwebtoken | JWT |
| passport | Google OAuth |
| Zod | Validation |
| kd-tree-javascript | Nearest table O(log n) |
| qrcode | QR generation |
| node:crypto | HMAC-SHA256 |
| axios | OpenWeatherMap API calls |
| Jest | Testing |

---

## 19. Database Schema

### Table
```js
{
  tableNumber: String,    // "T-7"
  lat: Number,            // manager-set GPS lat
  lng: Number,            // manager-set GPS lng
  radiusMeters: Number,   // default 1.5m
  capacity: Number,
  zone: String,           // Indoor | Outdoor | Terrace
  qrToken: String,        // HMAC-signed
  cafeId: ObjectId,
  isActive: Boolean,
  loc: { type: 'Point', coordinates: [lng, lat] }  // 2dsphere index
}
```

### TableSession
```js
{
  sessionId: String,        // UUID v4
  tableId: ObjectId,
  cafeId: ObjectId,
  detectionMethod: String,  // gps | qr | manual
  gpsAccuracy: Number,
  confidenceScore: Number,  // 0–100
  users: [ObjectId],        // group dining
  status: String,           // active | closed | expired | abandoned
  openedAt: Date,
  closedAt: Date,
  lastHeartbeat: Date,
  orderIds: [ObjectId],
}
```

### WaiterCall
```js
{
  tableId: ObjectId,
  sessionId: String,
  orderId: ObjectId,
  customerId: ObjectId,
  waiterId: ObjectId,
  reasons: [String],       // ['water', 'tissue', 'order_item_123']
  note: String,            // max 100 chars
  status: String,          // pending | acknowledged | on_the_way | done
  requestedAt: Date,
  resolvedAt: Date,
  cafeId: ObjectId,
}
```

### Message
```js
{
  cafeId: ObjectId,
  fromUserId: ObjectId,
  fromRole: String,        // waiter | kitchen | manager | cashier
  toUserId: ObjectId,
  toRole: String,
  content: String,
  orderRef: ObjectId,      // optional tag
  itemRef: ObjectId,       // optional tag
  type: String,            // text | quick_reply | system
  readAt: Date,
  createdAt: Date,
}
```

### Recommendation
```js
{
  userId: ObjectId,
  cafeId: ObjectId,
  weather: String,          // sunny | rainy | cloudy | cold | hot | windy
  weatherTemp: Number,
  topItems: [{
    menuItemId: ObjectId,
    score: Number,
    weatherTag: String,
    isFavourite: Boolean,
    isDiscovery: Boolean,
  }],
  generatedAt: Date,
  expiresAt: Date,          // TTL: 30 min cache
}
```

---

## 20. Redis Cache Keys

```
# Sessions
session:{sessionId}                → active session data           TTL: 2h
table:{tableId}:session            → current session per table
coords:{cafeId}                    → all table GPS coordinates     no TTL (invalidate on update)

# QR
qr:{token}                         → QR token validity             TTL: 15 min

# Logout
geofence:{userId}:exited           → grace timer flag              TTL: 5 min

# Loyalty
loyalty:{userId}:tier              → cached tier                   TTL: 10 min

# Menu & Recommendations
menu:{cafeId}                      → cached menu items             TTL: 5 min
weather:{lat},{lng}                → cached weather condition       TTL: 30 min
rec:{userId}:{cafeId}              → cached recommendations         TTL: 30 min
rec:guest:{cafeId}:{weather}       → guest weather recs            TTL: 30 min

# Messaging
unread:{userId}                    → unread message count          no TTL

# Waiter Calls
call:{tableId}:active              → active call request           TTL: 30 min
```

---

## 21. Scripts & Setup

```bash
# Clone & install
git clone https://github.com/your-org/kausichiya
cd kausichiya

# Frontend
cd frontend && npm install && npm run dev
# → http://localhost:5173

# Backend
cd backend && npm install && npm run dev
# → http://localhost:5000

# Database seed
node scripts/db/seed.js

# Admin utilities
node scripts/admin/createManager.js
node scripts/admin/createWaiter.js
node scripts/admin/resetPassword.js
node scripts/admin/cleanup-test-users.js
node scripts/db/fix-table-indexes.js

# Run tests
cd backend && npm test
```

---

## Summary

```
कौसी चिया
│
├── Customer      → Mobile PRIMARY   GPS→Table→Login→Menu(Recs)→Cart→Order→Track→CallWaiter→Pay→AutoLogout
├── Waiter        → Mobile+Tablet    Tables+Orders+CustomerCalls+KitchenChat+ManagerChat+VoiceCalls
├── Kitchen       → Tablet landscape  KDS(3col)+WaiterChat+VoiceCall+InventoryAlerts
├── Cashier       → Mobile+Tablet    Billing+Payment+ManagerChat
├── Manager       → All screens      Analytics+Staff+Tables+AllStaffChat+WaiterVoiceCall
└── Admin         → All screens      SaaS+Subscriptions — SILENT (no sounds, no chat)

Core Systems:
├── GPS primary → QR fallback → manual entry
├── 4-Rule logout: manual guard · payment auto · geofence exit
├── Call Waiter: dynamic order items + predefined basics + custom note
├── Recommendations: weather (OpenWeatherMap) + order history (30d) → top 6
├── Sounds: per-role MP3 system — admin always silent
├── Messaging: Waiter↔Kitchen, Waiter↔Manager, Cashier↔Manager
├── Voice calls: Waiter↔Kitchen, Waiter↔Manager (WebRTC)
└── Colors: single source → src/shared/config/colors.js

Loyalty: Bronze (0–499) → Silver (500–999) → Gold (1000+)
```

---

*कौसी चिया © 2025 — Built with ☕ precision.*