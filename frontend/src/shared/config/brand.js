// ═══════════════════════════════════════════════════════════════════════════
// src/shared/config/brand.js
//
// WHITE-LABEL SINGLE SOURCE OF TRUTH — zero hardcoded values
// ─────────────────────────────────────────────────────────────────────────
// To deploy for a new cafe/restaurant — edit ONLY .env.local.
// Nothing else changes in code.
//
// Flow:
//   .env.local → brand.js → ThemeContext → :root CSS vars → every component
//
// Exports:
//   BRAND      — identity, locale, currency, social, logo
//   FONTS      — all font strings + Google Fonts URL
//   SOUNDS     — all sound file paths (per-role, configurable via env)
//   PALETTE    — full dark/light color palette objects
//   WEATHER_PALETTE / getWeatherTheme / WEATHER_META
//   LOYALTY_TIERS / LOYALTY_DISCOUNTS
//   FEATURES   — feature flags
//   RULES      — business rules
//   getCssVars / getPalette / fmtNumber / fmtCurrency
// ═══════════════════════════════════════════════════════════════════════════

// ─── Helper: hex → rgba ───────────────────────────────────────────────────────
function hexToRgba(hex, alpha) {
  const h = (hex ?? '#FF9F1C').replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ─── Cafe Identity ────────────────────────────────────────────────────────────
export const BRAND = {
  name:         import.meta.env.VITE_CAFE_NAME         ?? 'My Cafe',
  tagline:      import.meta.env.VITE_CAFE_TAGLINE      ?? 'Good food. Good vibes.',
  emoji:        import.meta.env.VITE_CAFE_EMOJI        ?? '☕',
  currency:     import.meta.env.VITE_CURRENCY          ?? 'Rs.',
  locale:       import.meta.env.VITE_LOCALE            ?? 'en-NP',
  cafeId:       import.meta.env.VITE_CAFE_ID           ?? null,
  address:      import.meta.env.VITE_CAFE_ADDRESS      ?? '',
  phone:        import.meta.env.VITE_CAFE_PHONE        ?? '',
  website:      import.meta.env.VITE_CAFE_WEBSITE      ?? '',
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL     ?? '',
  logo:         import.meta.env.VITE_CAFE_LOGO         ?? '',
  poweredBy:    import.meta.env.VITE_POWERED_BY        ?? '',
  instagram:    import.meta.env.VITE_CAFE_INSTAGRAM    ?? '',
  facebook:     import.meta.env.VITE_CAFE_FACEBOOK     ?? '',
}

// ─── Typography ───────────────────────────────────────────────────────────────
export const FONTS = {
  heading:     import.meta.env.VITE_FONT_HEADING      ?? "'Sora', system-ui, sans-serif",
  body:        import.meta.env.VITE_FONT_BODY         ?? "'DM Sans', system-ui, sans-serif",
  serif:       import.meta.env.VITE_FONT_SERIF        ?? "'Lora', Georgia, serif",
  display:     import.meta.env.VITE_FONT_DISPLAY      ?? "'Noto Sans Devanagari', serif",
  mono:        import.meta.env.VITE_FONT_MONO         ?? "'DM Mono', monospace",
  brand:       import.meta.env.VITE_FONT_BRAND        ?? "'Baloo 2', system-ui, sans-serif",
  cafeName:    import.meta.env.VITE_FONT_CAFE_NAME    ?? "'Sora', system-ui, sans-serif",
  welcomeName: import.meta.env.VITE_FONT_WELCOME_NAME ?? "'Sora', system-ui, sans-serif",
  welcomeBody: import.meta.env.VITE_FONT_WELCOME_BODY ?? "'DM Sans', system-ui, sans-serif",
  googleUrl:   import.meta.env.VITE_FONT_GOOGLE_URL   ??
    'https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=Lora:ital,wght@1,400;1,500&family=DM+Sans:wght@400;500;600;700&family=Baloo+2:wght@500;600;700;800&display=swap',
}

// ─── Sounds ───────────────────────────────────────────────────────────────────
// All paths configurable via .env.local. Defaults match the original structure.
// sounds.js reads from this — never import paths directly.
export const SOUNDS = {
  customer: {
    orderConfirmed:   import.meta.env.VITE_SOUND_CUSTOMER_ORDER_CONFIRMED   ?? '/sounds/customer/order-confirmed.mp3',
    orderPreparing:   import.meta.env.VITE_SOUND_CUSTOMER_ORDER_PREPARING   ?? '/sounds/customer/order-preparing.mp3',
    orderReady:       import.meta.env.VITE_SOUND_CUSTOMER_ORDER_READY       ?? '/sounds/customer/order-ready.mp3',
    orderDelivered:   import.meta.env.VITE_SOUND_CUSTOMER_ORDER_DELIVERED   ?? '/sounds/customer/order-delivered.mp3',
    pointsEarned:     import.meta.env.VITE_SOUND_CUSTOMER_POINTS_EARNED     ?? '/sounds/customer/points-earned.mp3',
    tierUpgraded:     import.meta.env.VITE_SOUND_CUSTOMER_TIER_UPGRADED     ?? '/sounds/customer/tier-upgraded.mp3',
    waiterComing:     import.meta.env.VITE_SOUND_CUSTOMER_WAITER_COMING     ?? '/sounds/customer/waiter-coming.mp3',
  },
  waiter: {
    newWaiterCall:    import.meta.env.VITE_SOUND_WAITER_NEW_CALL            ?? '/sounds/waiter/new-waiter-call.mp3',
    newOrder:         import.meta.env.VITE_SOUND_WAITER_NEW_ORDER           ?? '/sounds/waiter/new-order.mp3',
    orderReadyPickup: import.meta.env.VITE_SOUND_WAITER_ORDER_READY_PICKUP  ?? '/sounds/waiter/order-ready-pickup.mp3',
    newMessage:       import.meta.env.VITE_SOUND_WAITER_NEW_MESSAGE         ?? '/sounds/waiter/new-message.mp3',
    urgentAlert:      import.meta.env.VITE_SOUND_WAITER_URGENT_ALERT        ?? '/sounds/waiter/urgent-alert.mp3',
  },
  kitchen: {
    newOrderBell:     import.meta.env.VITE_SOUND_KITCHEN_NEW_ORDER_BELL     ?? '/sounds/kitchen/new-order-bell.mp3',
    orderCancelled:   import.meta.env.VITE_SOUND_KITCHEN_ORDER_CANCELLED    ?? '/sounds/kitchen/order-cancelled.mp3',
    lowStock:         import.meta.env.VITE_SOUND_KITCHEN_LOW_STOCK          ?? '/sounds/kitchen/low-stock-alert.mp3',
    newMessage:       import.meta.env.VITE_SOUND_KITCHEN_NEW_MESSAGE        ?? '/sounds/kitchen/new-message.mp3',
  },
  cashier: {
    paymentRequest:   import.meta.env.VITE_SOUND_CASHIER_PAYMENT_REQUEST    ?? '/sounds/cashier/payment-request.mp3',
    paymentConfirmed: import.meta.env.VITE_SOUND_CASHIER_PAYMENT_CONFIRMED  ?? '/sounds/cashier/payment-confirmed.mp3',
    newMessage:       import.meta.env.VITE_SOUND_CASHIER_NEW_MESSAGE        ?? '/sounds/cashier/new-message.mp3',
  },
  manager: {
    sessionAbandoned: import.meta.env.VITE_SOUND_MANAGER_SESSION_ABANDONED  ?? '/sounds/manager/session-abandoned.mp3',
    newStaffMessage:  import.meta.env.VITE_SOUND_MANAGER_NEW_STAFF_MESSAGE  ?? '/sounds/manager/new-staff-message.mp3',
    lowInventory:     import.meta.env.VITE_SOUND_MANAGER_LOW_INVENTORY      ?? '/sounds/manager/low-inventory.mp3',
    dailySummary:     import.meta.env.VITE_SOUND_MANAGER_DAILY_SUMMARY      ?? '/sounds/manager/daily-summary.mp3',
  },
  admin: {}, // Intentionally empty — admin is always silent
}

// ─── Raw color env reads ──────────────────────────────────────────────────────
const _accent      = import.meta.env.VITE_ACCENT               ?? '#FF9F1C'
const _accentDark  = import.meta.env.VITE_ACCENT_DARK          ?? '#E05C2A'
const _accentLight = import.meta.env.VITE_ACCENT_LIGHT         ?? '#FFB84D'
const _bgDark      = import.meta.env.VITE_BG_DARK              ?? '#0D0905'
const _bgDarkEnd   = import.meta.env.VITE_BG_DARK_END          ?? '#1A0E06'
const _bgLight     = import.meta.env.VITE_BG_LIGHT             ?? '#F5EDD8'
const _bgLightEnd  = import.meta.env.VITE_BG_LIGHT_END         ?? '#EDE0C4'

// Light mode accent — slightly darker for readability on light background
const _accentL      = import.meta.env.VITE_ACCENT_LIGHT_MODE       ?? '#C8680A'
const _accentDarkL  = import.meta.env.VITE_ACCENT_DARK_LIGHT_MODE  ?? '#A85008'
const _accentLightL = import.meta.env.VITE_ACCENT_LIGHT_LIGHT_MODE ?? '#E8892A'
const _topGlowMidL  = import.meta.env.VITE_TOP_GLOW_MID_LIGHT      ?? '#FFBD50'

// Status colors — dark mode
const _successD       = import.meta.env.VITE_COLOR_SUCCESS_DARK        ?? '#34D399'
const _successBgD     = import.meta.env.VITE_COLOR_SUCCESS_BG_DARK     ?? 'rgba(52,211,153,0.1)'
const _successBorderD = import.meta.env.VITE_COLOR_SUCCESS_BORDER_DARK ?? 'rgba(34,197,94,0.3)'
const _warningD       = import.meta.env.VITE_COLOR_WARNING_DARK        ?? '#FBBF24'
const _warningBgD     = import.meta.env.VITE_COLOR_WARNING_BG_DARK     ?? 'rgba(251,191,36,0.1)'
const _dangerD        = import.meta.env.VITE_COLOR_DANGER_DARK         ?? '#F87171'
const _dangerBgD      = import.meta.env.VITE_COLOR_DANGER_BG_DARK      ?? 'rgba(248,113,113,0.09)'
const _dangerBorderD  = import.meta.env.VITE_COLOR_DANGER_BORDER_DARK  ?? 'rgba(220,38,38,0.25)'
const _infoD          = import.meta.env.VITE_COLOR_INFO_DARK           ?? '#60A5FA'
const _infoBgD        = import.meta.env.VITE_COLOR_INFO_BG_DARK        ?? 'rgba(96,165,250,0.1)'
const _infoBorderD    = import.meta.env.VITE_COLOR_INFO_BORDER_DARK    ?? 'rgba(99,179,237,0.3)'

// Status colors — light mode
const _successL       = import.meta.env.VITE_COLOR_SUCCESS_LIGHT        ?? '#059669'
const _successBgL     = import.meta.env.VITE_COLOR_SUCCESS_BG_LIGHT     ?? 'rgba(5,150,105,0.08)'
const _successBorderL = import.meta.env.VITE_COLOR_SUCCESS_BORDER_LIGHT ?? 'rgba(21,128,61,0.25)'
const _warningL       = import.meta.env.VITE_COLOR_WARNING_LIGHT        ?? '#D97706'
const _warningBgL     = import.meta.env.VITE_COLOR_WARNING_BG_LIGHT     ?? 'rgba(217,119,6,0.08)'
const _dangerL        = import.meta.env.VITE_COLOR_DANGER_LIGHT         ?? '#DC2626'
const _dangerBgL      = import.meta.env.VITE_COLOR_DANGER_BG_LIGHT      ?? 'rgba(220,38,38,0.07)'
const _dangerBorderL  = import.meta.env.VITE_COLOR_DANGER_BORDER_LIGHT  ?? 'rgba(220,38,38,0.22)'
const _infoL          = import.meta.env.VITE_COLOR_INFO_LIGHT           ?? '#2563EB'
const _infoBgL        = import.meta.env.VITE_COLOR_INFO_BG_LIGHT        ?? 'rgba(37,99,235,0.07)'
const _infoBorderL    = import.meta.env.VITE_COLOR_INFO_BORDER_LIGHT    ?? 'rgba(37,99,235,0.2)'

// ─── Weather Palette ──────────────────────────────────────────────────────────
export const WEATHER_PALETTE = {
  sunny: {
    dark:  { bg: [import.meta.env.VITE_WEATHER_SUNNY_DARK_BG0 ?? '#7C2D00', import.meta.env.VITE_WEATHER_SUNNY_DARK_BG1 ?? '#B45309', import.meta.env.VITE_WEATHER_SUNNY_DARK_BG2 ?? '#D97706'], text: import.meta.env.VITE_WEATHER_SUNNY_DARK_TEXT ?? '#FFE4A0', sub: import.meta.env.VITE_WEATHER_SUNNY_DARK_SUB ?? 'rgba(255,220,150,0.55)', shadow: import.meta.env.VITE_WEATHER_SUNNY_DARK_SHADOW ?? 'rgba(200,100,0,0.55)' },
    light: { bg: [import.meta.env.VITE_WEATHER_SUNNY_LIGHT_BG0 ?? '#FF9A3C', import.meta.env.VITE_WEATHER_SUNNY_LIGHT_BG1 ?? '#FFCD3C', import.meta.env.VITE_WEATHER_SUNNY_LIGHT_BG2 ?? '#FFF0A0'], text: import.meta.env.VITE_WEATHER_SUNNY_LIGHT_TEXT ?? '#7A3B00', sub: import.meta.env.VITE_WEATHER_SUNNY_LIGHT_SUB ?? 'rgba(100,50,0,0.55)', shadow: import.meta.env.VITE_WEATHER_SUNNY_LIGHT_SHADOW ?? 'rgba(255,160,30,0.45)' },
  },
  hot: {
    dark:  { bg: [import.meta.env.VITE_WEATHER_HOT_DARK_BG0 ?? '#7F1D1D', import.meta.env.VITE_WEATHER_HOT_DARK_BG1 ?? '#9B2335', import.meta.env.VITE_WEATHER_HOT_DARK_BG2 ?? '#C0392B'], text: import.meta.env.VITE_WEATHER_HOT_DARK_TEXT ?? '#FFCDD2', sub: import.meta.env.VITE_WEATHER_HOT_DARK_SUB ?? 'rgba(255,180,180,0.5)', shadow: import.meta.env.VITE_WEATHER_HOT_DARK_SHADOW ?? 'rgba(180,30,30,0.55)' },
    light: { bg: [import.meta.env.VITE_WEATHER_HOT_LIGHT_BG0 ?? '#FF6B6B', import.meta.env.VITE_WEATHER_HOT_LIGHT_BG1 ?? '#FF8E53', import.meta.env.VITE_WEATHER_HOT_LIGHT_BG2 ?? '#FFCB77'], text: import.meta.env.VITE_WEATHER_HOT_LIGHT_TEXT ?? '#7A1515', sub: import.meta.env.VITE_WEATHER_HOT_LIGHT_SUB ?? 'rgba(120,30,20,0.5)', shadow: import.meta.env.VITE_WEATHER_HOT_LIGHT_SHADOW ?? 'rgba(255,80,50,0.45)' },
  },
  rainy: {
    dark:  { bg: [import.meta.env.VITE_WEATHER_RAINY_DARK_BG0 ?? '#0D1B2A', import.meta.env.VITE_WEATHER_RAINY_DARK_BG1 ?? '#1B3A5C', import.meta.env.VITE_WEATHER_RAINY_DARK_BG2 ?? '#2C5F8A'], text: import.meta.env.VITE_WEATHER_RAINY_DARK_TEXT ?? '#B0D4F1', sub: import.meta.env.VITE_WEATHER_RAINY_DARK_SUB ?? 'rgba(150,200,240,0.5)', shadow: import.meta.env.VITE_WEATHER_RAINY_DARK_SHADOW ?? 'rgba(30,80,150,0.55)' },
    light: { bg: [import.meta.env.VITE_WEATHER_RAINY_LIGHT_BG0 ?? '#A8CABA', import.meta.env.VITE_WEATHER_RAINY_LIGHT_BG1 ?? '#5D9FBF', import.meta.env.VITE_WEATHER_RAINY_LIGHT_BG2 ?? '#EBF4F5'], text: import.meta.env.VITE_WEATHER_RAINY_LIGHT_TEXT ?? '#1A3A5C', sub: import.meta.env.VITE_WEATHER_RAINY_LIGHT_SUB ?? 'rgba(20,60,100,0.5)', shadow: import.meta.env.VITE_WEATHER_RAINY_LIGHT_SHADOW ?? 'rgba(80,130,180,0.4)' },
  },
  cold: {
    dark:  { bg: [import.meta.env.VITE_WEATHER_COLD_DARK_BG0 ?? '#0A1628', import.meta.env.VITE_WEATHER_COLD_DARK_BG1 ?? '#0D2E5C', import.meta.env.VITE_WEATHER_COLD_DARK_BG2 ?? '#1A4F8C'], text: import.meta.env.VITE_WEATHER_COLD_DARK_TEXT ?? '#C5E8FF', sub: import.meta.env.VITE_WEATHER_COLD_DARK_SUB ?? 'rgba(150,210,255,0.5)', shadow: import.meta.env.VITE_WEATHER_COLD_DARK_SHADOW ?? 'rgba(20,80,180,0.55)' },
    light: { bg: [import.meta.env.VITE_WEATHER_COLD_LIGHT_BG0 ?? '#D4F1F9', import.meta.env.VITE_WEATHER_COLD_LIGHT_BG1 ?? '#89CFF0', import.meta.env.VITE_WEATHER_COLD_LIGHT_BG2 ?? '#BFEFFF'], text: import.meta.env.VITE_WEATHER_COLD_LIGHT_TEXT ?? '#0C3547', sub: import.meta.env.VITE_WEATHER_COLD_LIGHT_SUB ?? 'rgba(10,60,100,0.45)', shadow: import.meta.env.VITE_WEATHER_COLD_LIGHT_SHADOW ?? 'rgba(80,180,230,0.4)' },
  },
  cloudy: {
    dark:  { bg: [import.meta.env.VITE_WEATHER_CLOUDY_DARK_BG0 ?? '#1A1D2E', import.meta.env.VITE_WEATHER_CLOUDY_DARK_BG1 ?? '#252A3D', import.meta.env.VITE_WEATHER_CLOUDY_DARK_BG2 ?? '#2E3450'], text: import.meta.env.VITE_WEATHER_CLOUDY_DARK_TEXT ?? '#C8CEDE', sub: import.meta.env.VITE_WEATHER_CLOUDY_DARK_SUB ?? 'rgba(180,190,210,0.5)', shadow: import.meta.env.VITE_WEATHER_CLOUDY_DARK_SHADOW ?? 'rgba(40,50,80,0.55)' },
    light: { bg: [import.meta.env.VITE_WEATHER_CLOUDY_LIGHT_BG0 ?? '#D4D8E2', import.meta.env.VITE_WEATHER_CLOUDY_LIGHT_BG1 ?? '#B8BFCC', import.meta.env.VITE_WEATHER_CLOUDY_LIGHT_BG2 ?? '#E8ECF2'], text: import.meta.env.VITE_WEATHER_CLOUDY_LIGHT_TEXT ?? '#2D3142', sub: import.meta.env.VITE_WEATHER_CLOUDY_LIGHT_SUB ?? 'rgba(45,50,70,0.45)', shadow: import.meta.env.VITE_WEATHER_CLOUDY_LIGHT_SHADOW ?? 'rgba(100,110,140,0.3)' },
  },
  windy: {
    dark:  { bg: [import.meta.env.VITE_WEATHER_WINDY_DARK_BG0 ?? '#0D1F3C', import.meta.env.VITE_WEATHER_WINDY_DARK_BG1 ?? '#162D5A', import.meta.env.VITE_WEATHER_WINDY_DARK_BG2 ?? '#1E3D7A'], text: import.meta.env.VITE_WEATHER_WINDY_DARK_TEXT ?? '#B8D4FF', sub: import.meta.env.VITE_WEATHER_WINDY_DARK_SUB ?? 'rgba(140,190,255,0.5)', shadow: import.meta.env.VITE_WEATHER_WINDY_DARK_SHADOW ?? 'rgba(20,60,160,0.5)' },
    light: { bg: [import.meta.env.VITE_WEATHER_WINDY_LIGHT_BG0 ?? '#C8E6FF', import.meta.env.VITE_WEATHER_WINDY_LIGHT_BG1 ?? '#A0C4FF', import.meta.env.VITE_WEATHER_WINDY_LIGHT_BG2 ?? '#D4F0FF'], text: import.meta.env.VITE_WEATHER_WINDY_LIGHT_TEXT ?? '#1A3A6C', sub: import.meta.env.VITE_WEATHER_WINDY_LIGHT_SUB ?? 'rgba(20,50,120,0.45)', shadow: import.meta.env.VITE_WEATHER_WINDY_LIGHT_SHADOW ?? 'rgba(80,150,220,0.35)' },
  },
  snowy: {
    dark:  { bg: [import.meta.env.VITE_WEATHER_SNOWY_DARK_BG0 ?? '#0F172A', import.meta.env.VITE_WEATHER_SNOWY_DARK_BG1 ?? '#1E2D4A', import.meta.env.VITE_WEATHER_SNOWY_DARK_BG2 ?? '#1A3060'], text: import.meta.env.VITE_WEATHER_SNOWY_DARK_TEXT ?? '#C0D8FF', sub: import.meta.env.VITE_WEATHER_SNOWY_DARK_SUB ?? 'rgba(160,200,255,0.5)', shadow: import.meta.env.VITE_WEATHER_SNOWY_DARK_SHADOW ?? 'rgba(30,70,160,0.5)' },
    light: { bg: [import.meta.env.VITE_WEATHER_SNOWY_LIGHT_BG0 ?? '#EEF2FF', import.meta.env.VITE_WEATHER_SNOWY_LIGHT_BG1 ?? '#DBEAFE', import.meta.env.VITE_WEATHER_SNOWY_LIGHT_BG2 ?? '#F0F9FF'], text: import.meta.env.VITE_WEATHER_SNOWY_LIGHT_TEXT ?? '#1E3A5F', sub: import.meta.env.VITE_WEATHER_SNOWY_LIGHT_SUB ?? 'rgba(20,50,100,0.4)', shadow: import.meta.env.VITE_WEATHER_SNOWY_LIGHT_SHADOW ?? 'rgba(100,150,220,0.3)' },
  },
}

export const getWeatherTheme = (condition = 'cloudy', isDark = false) => {
  const c = WEATHER_PALETTE[condition] ?? WEATHER_PALETTE.cloudy
  return isDark ? c.dark : c.light
}

// ─── Weather icon + label metadata ────────────────────────────────────────────
export const WEATHER_META = {
  sunny:  { icon: import.meta.env.VITE_WEATHER_ICON_SUNNY  ?? '☀️',  label: import.meta.env.VITE_WEATHER_LABEL_SUNNY  ?? 'Sunny'  },
  hot:    { icon: import.meta.env.VITE_WEATHER_ICON_HOT    ?? '🌡️', label: import.meta.env.VITE_WEATHER_LABEL_HOT    ?? 'Hot'    },
  rainy:  { icon: import.meta.env.VITE_WEATHER_ICON_RAINY  ?? '🌧️', label: import.meta.env.VITE_WEATHER_LABEL_RAINY  ?? 'Rainy'  },
  cold:   { icon: import.meta.env.VITE_WEATHER_ICON_COLD   ?? '🌨️', label: import.meta.env.VITE_WEATHER_LABEL_COLD   ?? 'Cold'   },
  cloudy: { icon: import.meta.env.VITE_WEATHER_ICON_CLOUDY ?? '☁️',  label: import.meta.env.VITE_WEATHER_LABEL_CLOUDY ?? 'Cloudy' },
  windy:  { icon: import.meta.env.VITE_WEATHER_ICON_WINDY  ?? '💨',  label: import.meta.env.VITE_WEATHER_LABEL_WINDY  ?? 'Windy'  },
  snowy:  { icon: import.meta.env.VITE_WEATHER_ICON_SNOWY  ?? '❄️',  label: import.meta.env.VITE_WEATHER_LABEL_SNOWY  ?? 'Snowy'  },
}

// ─── Loyalty tier config ──────────────────────────────────────────────────────
export const LOYALTY_TIERS = {
  none:   { emoji: import.meta.env.VITE_LOYALTY_NONE_EMOJI   ?? '☕', label: import.meta.env.VITE_LOYALTY_NONE_LABEL   ?? 'New Member', color: import.meta.env.VITE_LOYALTY_NONE_COLOR   ?? '#FF9F1C', multiplier: Number(import.meta.env.VITE_LOYALTY_NONE_MULTIPLIER   ?? 1)   },
  bronze: { emoji: import.meta.env.VITE_LOYALTY_BRONZE_EMOJI ?? '🥉', label: import.meta.env.VITE_LOYALTY_BRONZE_LABEL ?? 'Bronze',     color: import.meta.env.VITE_LOYALTY_BRONZE_COLOR ?? '#CD7F32', multiplier: Number(import.meta.env.VITE_LOYALTY_BRONZE_MULTIPLIER ?? 1)   },
  silver: { emoji: import.meta.env.VITE_LOYALTY_SILVER_EMOJI ?? '🥈', label: import.meta.env.VITE_LOYALTY_SILVER_LABEL ?? 'Silver',     color: import.meta.env.VITE_LOYALTY_SILVER_COLOR ?? '#C0C0C0', multiplier: Number(import.meta.env.VITE_LOYALTY_SILVER_MULTIPLIER ?? 1.5) },
  gold:   { emoji: import.meta.env.VITE_LOYALTY_GOLD_EMOJI   ?? '🥇', label: import.meta.env.VITE_LOYALTY_GOLD_LABEL   ?? 'Gold',       color: import.meta.env.VITE_LOYALTY_GOLD_COLOR   ?? '#FFD700', multiplier: Number(import.meta.env.VITE_LOYALTY_GOLD_MULTIPLIER   ?? 2)   },
}

export const LOYALTY_DISCOUNTS = {
  bronze: Number(import.meta.env.VITE_LOYALTY_BRONZE_DISCOUNT ?? 5),
  silver: Number(import.meta.env.VITE_LOYALTY_SILVER_DISCOUNT ?? 10),
  gold:   Number(import.meta.env.VITE_LOYALTY_GOLD_DISCOUNT   ?? 15),
}

// ─── Color Palette ────────────────────────────────────────────────────────────
export const PALETTE = {
  dark: {
    bg: _bgDark, bgGradientStart: _bgDark, bgGradientEnd: _bgDarkEnd,
    cardBg: import.meta.env.VITE_CARD_BG_DARK ?? 'rgba(18,11,4,0.92)',
    cardBgSolid: import.meta.env.VITE_CARD_BG_SOLID_DARK ?? '#130C05',
    cardBorder: hexToRgba(_accent, 0.12),
    cardShadow: `0 32px 80px rgba(0,0,0,0.72), 0 0 0 1px ${hexToRgba(_accent, 0.07)}`,
    cardShimmer: hexToRgba(_accent, 0.05),
    modalBg: import.meta.env.VITE_MODAL_BG_DARK ?? 'rgba(14,8,3,0.96)',
    modalBorder: hexToRgba(_accent, 0.14),
    overlayBg: import.meta.env.VITE_OVERLAY_BG_DARK ?? 'rgba(0,0,0,0.72)',
    headerBg: import.meta.env.VITE_HEADER_BG_DARK ?? 'rgba(13,9,5,0.93)',
    headerBorder: hexToRgba(_accent, 0.08),
    inputBg: import.meta.env.VITE_INPUT_BG_DARK ?? 'rgba(255,255,255,0.04)',
    inputBgHover: import.meta.env.VITE_INPUT_BG_HOVER_DARK ?? 'rgba(255,255,255,0.06)',
    inputBorder: hexToRgba(_accent, 0.18),
    inputBorderFocus: hexToRgba(_accent, 0.55),
    inputBorderValid: import.meta.env.VITE_INPUT_BORDER_VALID ?? 'rgba(34,197,94,0.5)',
    inputBorderFree: import.meta.env.VITE_INPUT_BORDER_FREE ?? 'rgba(99,179,237,0.5)',
    inputBorderError: import.meta.env.VITE_INPUT_BORDER_ERROR ?? 'rgba(220,38,38,0.45)',
    inputShadowFocus: `0 0 0 3px ${hexToRgba(_accent, 0.12)}`,
    inputShadowValid: import.meta.env.VITE_INPUT_SHADOW_VALID ?? '0 0 0 3px rgba(34,197,94,0.12)',
    inputShadowFree: import.meta.env.VITE_INPUT_SHADOW_FREE ?? '0 0 0 3px rgba(99,179,237,0.12)',
    pillBg: import.meta.env.VITE_PILL_BG_DARK ?? 'rgba(255,255,255,0.05)',
    pillBgHover: hexToRgba(_accent, 0.1),
    pillBgActive: hexToRgba(_accent, 0.14),
    pillBorder: import.meta.env.VITE_PILL_BORDER_DARK ?? 'rgba(255,255,255,0.08)',
    pillBorderActive: hexToRgba(_accent, 0.3),
    textPrimary: import.meta.env.VITE_TEXT_PRIMARY_DARK ?? '#FFF8EE',
    textSecondary: import.meta.env.VITE_TEXT_SECONDARY_DARK ?? 'rgba(255,220,160,0.7)',
    textMuted: import.meta.env.VITE_TEXT_MUTED_DARK ?? 'rgba(255,190,100,0.38)',
    textDisabled: import.meta.env.VITE_TEXT_DISABLED_DARK ?? 'rgba(255,190,100,0.22)',
    textInverse: import.meta.env.VITE_TEXT_INVERSE_DARK ?? '#1A0E04',
    accent: _accent, accentDark: _accentDark, accentLight: _accentLight,
    accentDim: hexToRgba(_accent, 0.1),
    accentBorder: hexToRgba(_accent, 0.28),
    accentGlow: hexToRgba(_accent, 0.35),
    accentGradient: `linear-gradient(135deg, ${_accent} 0%, ${_accentDark} 100%)`,
    divider: hexToRgba(_accent, 0.08),
    dividerStrong: hexToRgba(_accent, 0.16),
    topGlow: `linear-gradient(90deg, transparent, ${_accent} 28%, ${_accentLight} 50%, ${_accentDark} 72%, transparent)`,
    tabActive: _accent,
    tabInactive: import.meta.env.VITE_TAB_INACTIVE_DARK ?? 'rgba(255,190,100,0.32)',
    likeBg: import.meta.env.VITE_LIKE_BG_DARK ?? 'rgba(255,255,255,0.05)',
    likeActiveBg: hexToRgba(_accent, 0.12),
    replyBg: hexToRgba(_accent, 0.05),
    replyBorder: hexToRgba(_accent, 0.14),
    success: _successD, successBg: _successBgD, successBorder: _successBorderD,
    warning: _warningD, warningBg: _warningBgD,
    danger: _dangerD, dangerBg: _dangerBgD, dangerBorder: _dangerBorderD,
    info: _infoD, infoBg: _infoBgD, infoBorder: _infoBorderD,
    btnDisabled: import.meta.env.VITE_BTN_DISABLED_DARK ?? 'rgba(255,255,255,0.06)',
    btnDisabledText: import.meta.env.VITE_BTN_DISABLED_TEXT_DARK ?? 'rgba(255,190,100,0.25)',
    loyaltyBg: hexToRgba(_accent, 0.07),
    loyaltyBorder: hexToRgba(_accent, 0.14),
    loyaltyText: _accentLight,
    loyaltySubText: import.meta.env.VITE_LOYALTY_SUB_TEXT_DARK ?? 'rgba(255,175,60,0.5)',
    orbColor: hexToRgba(_accent, 0.18),
    orbColor2: hexToRgba(_accentDark, 0.12),
    scrollThumb: hexToRgba(_accent, 0.2),
    scrollTrack: 'transparent',
  },

  light: {
    bg: _bgLight, bgGradientStart: _bgLight, bgGradientEnd: _bgLightEnd,
    cardBg: import.meta.env.VITE_CARD_BG_LIGHT ?? 'rgba(255,252,244,0.94)',
    cardBgSolid: import.meta.env.VITE_CARD_BG_SOLID_LIGHT ?? '#FFFCF4',
    cardBorder: import.meta.env.VITE_CARD_BORDER_LIGHT ?? 'rgba(180,100,20,0.12)',
    cardShadow: import.meta.env.VITE_CARD_SHADOW_LIGHT ?? '0 24px 60px rgba(92,51,23,0.18), 0 0 0 1px rgba(210,175,110,0.2)',
    cardShimmer: import.meta.env.VITE_CARD_SHIMMER_LIGHT ?? 'rgba(180,100,20,0.04)',
    modalBg: import.meta.env.VITE_MODAL_BG_LIGHT ?? 'rgba(255,252,244,0.97)',
    modalBorder: import.meta.env.VITE_MODAL_BORDER_LIGHT ?? 'rgba(180,100,20,0.14)',
    overlayBg: import.meta.env.VITE_OVERLAY_BG_LIGHT ?? 'rgba(30,15,5,0.55)',
    headerBg: import.meta.env.VITE_HEADER_BG_LIGHT ?? 'rgba(245,237,216,0.93)',
    headerBorder: import.meta.env.VITE_HEADER_BORDER_LIGHT ?? 'rgba(180,100,20,0.1)',
    inputBg: import.meta.env.VITE_INPUT_BG_LIGHT ?? 'rgba(180,100,20,0.04)',
    inputBgHover: import.meta.env.VITE_INPUT_BG_HOVER_LIGHT ?? 'rgba(180,100,20,0.07)',
    inputBorder: import.meta.env.VITE_INPUT_BORDER_LIGHT ?? 'rgba(180,100,20,0.2)',
    inputBorderFocus: import.meta.env.VITE_INPUT_BORDER_FOCUS_LIGHT ?? 'rgba(200,104,10,0.6)',
    inputBorderValid: import.meta.env.VITE_INPUT_BORDER_VALID ?? 'rgba(21,128,61,0.5)',
    inputBorderFree: import.meta.env.VITE_INPUT_BORDER_FREE ?? 'rgba(37,99,235,0.45)',
    inputBorderError: import.meta.env.VITE_INPUT_BORDER_ERROR ?? 'rgba(220,38,38,0.45)',
    inputShadowFocus: import.meta.env.VITE_INPUT_SHADOW_FOCUS_LIGHT ?? '0 0 0 3px rgba(180,100,20,0.1)',
    inputShadowValid: import.meta.env.VITE_INPUT_SHADOW_VALID ?? '0 0 0 3px rgba(21,128,61,0.1)',
    inputShadowFree: import.meta.env.VITE_INPUT_SHADOW_FREE ?? '0 0 0 3px rgba(37,99,235,0.1)',
    pillBg: import.meta.env.VITE_PILL_BG_LIGHT ?? 'rgba(180,100,20,0.06)',
    pillBgHover: import.meta.env.VITE_PILL_BG_HOVER_LIGHT ?? 'rgba(180,100,20,0.1)',
    pillBgActive: import.meta.env.VITE_PILL_BG_ACTIVE_LIGHT ?? 'rgba(180,100,20,0.12)',
    pillBorder: import.meta.env.VITE_PILL_BORDER_LIGHT ?? 'rgba(180,100,20,0.12)',
    pillBorderActive: import.meta.env.VITE_PILL_BORDER_ACTIVE_LIGHT ?? 'rgba(180,100,20,0.3)',
    textPrimary: import.meta.env.VITE_TEXT_PRIMARY_LIGHT ?? '#1A0E04',
    textSecondary: import.meta.env.VITE_TEXT_SECONDARY_LIGHT ?? 'rgba(90,45,8,0.72)',
    textMuted: import.meta.env.VITE_TEXT_MUTED_LIGHT ?? 'rgba(120,65,10,0.42)',
    textDisabled: import.meta.env.VITE_TEXT_DISABLED_LIGHT ?? 'rgba(120,65,10,0.25)',
    textInverse: import.meta.env.VITE_TEXT_INVERSE_LIGHT ?? '#FFF8EE',
    accent: _accentL, accentDark: _accentDarkL, accentLight: _accentLightL,
    accentDim: import.meta.env.VITE_ACCENT_DIM_LIGHT ?? 'rgba(180,100,20,0.08)',
    accentBorder: import.meta.env.VITE_ACCENT_BORDER_LIGHT ?? 'rgba(180,100,20,0.24)',
    accentGlow: import.meta.env.VITE_ACCENT_GLOW_LIGHT ?? 'rgba(180,100,20,0.25)',
    accentGradient: `linear-gradient(135deg, ${_accentLightL} 0%, ${_accentL} 100%)`,
    divider: import.meta.env.VITE_DIVIDER_LIGHT ?? 'rgba(180,100,20,0.09)',
    dividerStrong: import.meta.env.VITE_DIVIDER_STRONG_LIGHT ?? 'rgba(180,100,20,0.16)',
    topGlow: `linear-gradient(90deg, transparent, ${_accentLightL} 28%, ${_topGlowMidL} 50%, ${_accentL} 72%, transparent)`,
    tabActive: _accentL,
    tabInactive: import.meta.env.VITE_TAB_INACTIVE_LIGHT ?? 'rgba(120,65,10,0.35)',
    likeBg: import.meta.env.VITE_LIKE_BG_LIGHT ?? 'rgba(180,100,20,0.06)',
    likeActiveBg: import.meta.env.VITE_LIKE_ACTIVE_BG_LIGHT ?? 'rgba(180,100,20,0.12)',
    replyBg: import.meta.env.VITE_REPLY_BG_LIGHT ?? 'rgba(180,100,20,0.04)',
    replyBorder: import.meta.env.VITE_REPLY_BORDER_LIGHT ?? 'rgba(180,100,20,0.12)',
    success: _successL, successBg: _successBgL, successBorder: _successBorderL,
    warning: _warningL, warningBg: _warningBgL,
    danger: _dangerL, dangerBg: _dangerBgL, dangerBorder: _dangerBorderL,
    info: _infoL, infoBg: _infoBgL, infoBorder: _infoBorderL,
    btnDisabled: import.meta.env.VITE_BTN_DISABLED_LIGHT ?? 'rgba(180,100,20,0.1)',
    btnDisabledText: import.meta.env.VITE_BTN_DISABLED_TEXT_LIGHT ?? 'rgba(120,65,10,0.3)',
    loyaltyBg: import.meta.env.VITE_LOYALTY_BG_LIGHT ?? 'rgba(255,242,205,0.85)',
    loyaltyBorder: import.meta.env.VITE_LOYALTY_BORDER_LIGHT ?? 'rgba(228,182,78,0.4)',
    loyaltyText: import.meta.env.VITE_LOYALTY_TEXT_LIGHT ?? '#7A4A0A',
    loyaltySubText: import.meta.env.VITE_LOYALTY_SUB_TEXT_LIGHT ?? 'rgba(122,74,10,0.55)',
    orbColor: import.meta.env.VITE_ORB_COLOR_LIGHT ?? 'rgba(255,159,28,0.12)',
    orbColor2: import.meta.env.VITE_ORB_COLOR2_LIGHT ?? 'rgba(224,92,42,0.09)',
    scrollThumb: import.meta.env.VITE_SCROLL_THUMB_LIGHT ?? 'rgba(180,100,20,0.18)',
    scrollTrack: 'transparent',
  },
}

// ─── Feature Flags ────────────────────────────────────────────────────────────
export const FEATURES = {
  loyalty:         import.meta.env.VITE_FEATURE_LOYALTY     !== 'false',
  gallery:         import.meta.env.VITE_FEATURE_GALLERY     !== 'false',
  reviews:         import.meta.env.VITE_FEATURE_REVIEWS     !== 'false',
  callWaiter:      import.meta.env.VITE_FEATURE_CALL_WAITER !== 'false',
  recommendations: import.meta.env.VITE_FEATURE_RECS        !== 'false',
  geofencing:      import.meta.env.VITE_FEATURE_GEOFENCE    !== 'false',
  weather:         import.meta.env.VITE_FEATURE_WEATHER     !== 'false',
}

// ─── Business Rules ───────────────────────────────────────────────────────────
export const RULES = {
  review:  { minChars: Number(import.meta.env.VITE_REVIEW_MIN_CHARS  ?? 10), maxChars: Number(import.meta.env.VITE_REVIEW_MAX_CHARS ?? 500) },
  loyalty: { pointsPerUnit: Number(import.meta.env.VITE_POINTS_PER_UNIT  ?? 1) },
  order:   { minAmount:     Number(import.meta.env.VITE_MIN_ORDER_AMOUNT ?? 0) },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toKebab = (key) => key.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`)

export const getCssVars = (isDark = false) => {
  const palette = isDark ? PALETTE.dark : PALETTE.light
  return Object.fromEntries(
    Object.entries(palette).map(([k, v]) => [`--${toKebab(k)}`, v])
  )
}

export const getPalette  = (isDark = false) => isDark ? PALETTE.dark : PALETTE.light
export const fmtNumber   = (n) => new Intl.NumberFormat(BRAND.locale).format(n ?? 0)
export const fmtCurrency = (n) => `${BRAND.currency} ${fmtNumber(n)}`