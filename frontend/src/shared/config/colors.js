// src/shared/config/colors.js
// ─────────────────────────────────────────────────────────────────────────────
// कौसी चिया — GLOBAL COLOR PALETTE & DESIGN TOKENS
// Single source of truth. Never hardcode hex values elsewhere.
// ─────────────────────────────────────────────────────────────────────────────

export const COLORS = {
  // ── BRAND ──────────────────────────────────────────────────────────────────
  saffron: {
    DEFAULT: '#FF9F1C',
    light:   '#FFB84D',
    dark:    '#E08800',
    soft:    '#FFF3DC',
    muted:   '#FFE0A3',
  },
  terra: {
    DEFAULT: '#E05C2A',
    light:   '#F0784A',
    dark:    '#C44A1A',
    soft:    '#FDE8DF',
  },
  brew: {
    DEFAULT: '#5C3317',
    light:   '#8B5E3C',
    soft:    '#C49A6C',
    cream:   '#EDD5B3',
  },
  matcha: {
    DEFAULT: '#2D9B5A',
    light:   '#38C26F',
    dark:    '#1E7A42',
    soft:    '#D4F0E0',
  },
  cream: {
    DEFAULT: '#FFF8EE',
    dark:    '#FFF0D6',
    deep:    '#FFE4B5',
    border:  '#F0D9B5',
  },

  // ── UI SYSTEM ──────────────────────────────────────────────────────────────
  surface: {
    primary:   '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary:  '#F3F4F6',
    inverse:   '#111827',
  },
  text: {
    primary:   '#111827',
    secondary: '#374151',
    muted:     '#6B7280',
    disabled:  '#9CA3AF',
    inverse:   '#FFFFFF',
    brand:     '#FF9F1C',
  },
  border: {
    light:  '#E5E7EB',
    medium: '#D1D5DB',
    dark:   '#9CA3AF',
    brand:  '#FF9F1C',
    error:  '#FCA5A5',
  },

  // ── SEMANTIC ───────────────────────────────────────────────────────────────
  status: {
    success:    '#16A34A',
    successBg:  '#F0FDF4',
    warning:    '#D97706',
    warningBg:  '#FFFBEB',
    error:      '#DC2626',
    errorBg:    '#FEF2F2',
    info:       '#2563EB',
    infoBg:     '#EFF6FF',
    neutral:    '#6B7280',
    neutralBg:  '#F9FAFB',
  },

  // ── ORDER STATUS ───────────────────────────────────────────────────────────
  orderStatus: {
    pending:    '#D97706',
    preparing:  '#2563EB',
    on_the_way: '#7C3AED',
    delivered:  '#16A34A',
    paid:       '#059669',
    cancelled:  '#DC2626',
  },

  // ── LOYALTY TIERS ──────────────────────────────────────────────────────────
  loyalty: {
    bronze: { DEFAULT: '#CD7F32', light: '#E8A96A', bg: '#FDF3E7', text: '#7C4A00' },
    silver: { DEFAULT: '#9CA3AF', light: '#D1D5DB', bg: '#F9FAFB', text: '#374151' },
    gold:   { DEFAULT: '#F59E0B', light: '#FCD34D', bg: '#FFFBEB', text: '#78350F' },
  },
portion: {
  half: {
    dark: {
      rowBg:       'rgba(255,159,28,0.13)',
      rowBorder:   'rgba(255,159,28,0.58)',
      rowShadow:   '0 0 0 3px rgba(255,159,28,0.13), 0 4px 18px rgba(255,159,28,0.18)',
      radioBg:     'rgba(255,159,28,0.18)',
      radioBorder: 'rgba(255,159,28,0.70)',
      radioDot:    '#FF9F1C',
      nameColor:   '#FFD080',
      priceColor:  '#FFB84D',
      divider:     'rgba(255,159,28,0.45)',
      btnGradient: 'linear-gradient(135deg, #FF9F1C 0%, #E05C2A 100%)',
      btnShadow:   '0 8px 28px rgba(255,159,28,0.40), inset 0 1px 0 rgba(255,255,255,0.22)',
    },
    light: {
      rowBg:       'rgba(200,104,10,0.08)',
      rowBorder:   'rgba(200,104,10,0.55)',
      rowShadow:   '0 0 0 3px rgba(180,100,20,0.08), 0 4px 16px rgba(180,100,20,0.14)',
      radioBg:     'rgba(200,104,10,0.12)',
      radioBorder: 'rgba(200,104,10,0.65)',
      radioDot:    '#C8680A',
      nameColor:   '#B85C00',
      priceColor:  '#B85C00',
      divider:     'rgba(180,100,20,0.38)',
      btnGradient: 'linear-gradient(135deg, #E8892A 0%, #C8680A 100%)',
      btnShadow:   '0 8px 24px rgba(180,100,20,0.32), inset 0 1px 0 rgba(255,255,255,0.22)',
    },
  },
  full: {
    dark: {
      rowBg:       'rgba(52,211,153,0.11)',
      rowBorder:   'rgba(52,211,153,0.55)',
      rowShadow:   '0 0 0 3px rgba(52,211,153,0.11), 0 4px 18px rgba(52,211,153,0.16)',
      radioBg:     'rgba(52,211,153,0.16)',
      radioBorder: 'rgba(52,211,153,0.65)',
      radioDot:    '#34D399',
      nameColor:   '#6EE7B7',
      priceColor:  '#6EE7B7',
      divider:     'rgba(52,211,153,0.40)',
      btnGradient: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
      btnShadow:   '0 8px 28px rgba(52,211,153,0.35), inset 0 1px 0 rgba(255,255,255,0.20)',
    },
    light: {
      rowBg:       'rgba(5,150,105,0.07)',
      rowBorder:   'rgba(5,150,105,0.50)',
      rowShadow:   '0 0 0 3px rgba(5,150,105,0.07), 0 4px 16px rgba(5,150,105,0.13)',
      radioBg:     'rgba(5,150,105,0.10)',
      radioBorder: 'rgba(5,150,105,0.60)',
      radioDot:    '#059669',
      nameColor:   '#065F46',
      priceColor:  '#065F46',
      divider:     'rgba(5,150,105,0.32)',
      btnGradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      btnShadow:   '0 8px 24px rgba(5,150,105,0.28), inset 0 1px 0 rgba(255,255,255,0.22)',
    },
  },
  unselected: {
    dark: {
      rowBg:       'rgba(255,255,255,0.035)',
      rowBorder:   'rgba(255,255,255,0.09)',
      nameColor:   'rgba(255,220,160,0.65)',
      priceColor:  'rgba(255,190,100,0.32)',
      divider:     'rgba(255,255,255,0.09)',
      radioBg:     'rgba(255,255,255,0.06)',
      radioBorder: 'rgba(255,255,255,0.18)',
    },
    light: {
      rowBg:       'rgba(180,100,20,0.04)',
      rowBorder:   'rgba(180,100,20,0.14)',
      nameColor:   'rgba(90,45,8,0.65)',
      priceColor:  'rgba(120,65,10,0.38)',
      divider:     'rgba(180,100,20,0.14)',
      radioBg:     'rgba(180,100,20,0.07)',
      radioBorder: 'rgba(180,100,20,0.22)',
    },
  },
},
  // ── PAYMENT METHODS ────────────────────────────────────────────────────────
  // eSewa = Nepal's dominant digital wallet (#1 by transaction volume)
  payment: {
    esewa: {
      DEFAULT: '#60BB46',   // eSewa official green
      dark:    '#3A8A2A',
      light:   '#84D464',
      bg:      'rgba(96,187,70,0.10)',
      border:  'rgba(96,187,70,0.28)',
      glow:    'rgba(96,187,70,0.32)',
      text:    '#FFFFFF',   // white text on green button
    },
    cash: {
      DEFAULT: '#FF9F1C',   // uses brand accent
      bg:      'rgba(255,159,28,0.10)',
      border:  'rgba(255,159,28,0.28)',
    },
    card: {
      DEFAULT: '#3B82F6',   // universal card blue
      dark:    '#1D4ED8',
      bg:      'rgba(59,130,246,0.10)',
      border:  'rgba(59,130,246,0.28)',
      glow:    'rgba(59,130,246,0.25)',
    },
    khalti: {              // Nepal second-most-popular wallet
      DEFAULT: '#5C2D91',
      dark:    '#3D1E64',
      bg:      'rgba(92,45,145,0.10)',
      border:  'rgba(92,45,145,0.28)',
      glow:    'rgba(92,45,145,0.28)',
      text:    '#FFFFFF',
    },
  },

  // ── WEATHER MOODS ──────────────────────────────────────────────────────────
  weather: {
    sunny:  '#F59E0B',
    rainy:  '#6366F1',
    cloudy: '#9CA3AF',
    cold:   '#3B82F6',
    hot:    '#EF4444',
    windy:  '#8B5CF6',
  },

  // ── CALL WAITER REASONS ────────────────────────────────────────────────────
  callReasons: {
    water:   '#3B82F6',
    tissue:  '#8B5CF6',
    bill:    '#F59E0B',
    order:   '#FF9F1C',
    spill:   '#EF4444',
    custom:  '#6B7280',
    item:    '#2D9B5A',
  },

  // ── NOTIFICATIONS ──────────────────────────────────────────────────────────
  notification: {
    orderPlaced:  '#2563EB',
    orderReady:   '#16A34A',
    waiterCall:   '#FF9F1C',
    newMessage:   '#7C3AED',
    payment:      '#059669',
    alert:        '#DC2626',
    info:         '#6B7280',
  },

  // ── ROLE COLORS ────────────────────────────────────────────────────────────
  roles: {
    customer: { DEFAULT: '#FF9F1C', bg: '#FFF3DC', text: '#92400E' },
    waiter:   { DEFAULT: '#2D9B5A', bg: '#D4F0E0', text: '#065F46' },
    kitchen:  { DEFAULT: '#E05C2A', bg: '#FDE8DF', text: '#7C2D12' },
    cashier:  { DEFAULT: '#2563EB', bg: '#EFF6FF', text: '#1E40AF' },
    manager:  { DEFAULT: '#7C3AED', bg: '#EDE9FE', text: '#4C1D95' },
    admin:    { DEFAULT: '#374151', bg: '#F9FAFB', text: '#111827' },
  },

  // ── DARK MODE ──────────────────────────────────────────────────────────────
  dark: {
    bg:       '#0F0A06',
    surface:  '#1A1208',
    surface2: '#241810',
    border:   'rgba(255,159,28,0.12)',
    text:     '#FFF8EE',
    muted:    '#C49A6C',
  },

  // ── GRADIENTS ──────────────────────────────────────────────────────────────
  gradients: {
    brand:     'linear-gradient(135deg, #FF9F1C, #E05C2A)',
    brandSoft: 'linear-gradient(135deg, #FFB84D, #F0784A)',
    matcha:    'linear-gradient(135deg, #2D9B5A, #38C26F)',
    dark:      'linear-gradient(180deg, #1A1208, #0F0A06)',
    esewa:     'linear-gradient(135deg, #60BB46, #3A8A2A)',
    loyalty: {
      bronze: 'linear-gradient(135deg, #CD7F32, #E8A96A)',
      silver: 'linear-gradient(135deg, #9CA3AF, #D1D5DB)',
      gold:   'linear-gradient(135deg, #F59E0B, #FCD34D)',
    },
  },

  // ── SHADOWS ────────────────────────────────────────────────────────────────
  shadows: {
    sm:    '0 1px 3px rgba(0,0,0,0.08)',
    md:    '0 4px 12px rgba(0,0,0,0.10)',
    lg:    '0 8px 24px rgba(0,0,0,0.12)',
    brand: '0 4px 20px rgba(255,159,28,0.35)',
    card:  '0 2px 8px rgba(92,51,23,0.08)',
    esewa: '0 4px 20px rgba(96,187,70,0.32)',
  },
}

// Tailwind theme extension values
export const TAILWIND_COLORS = {
  saffron: COLORS.saffron,
  terra:   COLORS.terra,
  brew:    COLORS.brew,
  matcha:  COLORS.matcha,
  cream:   COLORS.cream,
}