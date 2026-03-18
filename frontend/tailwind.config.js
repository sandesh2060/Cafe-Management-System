/** @type {import('tailwindcss').Config} */

// ═══════════════════════════════════════════════════════════════════════════
// tailwind.config.js — WHITE-LABEL
// ─────────────────────────────────────────────────────────────────────────
// All color values reference CSS variables set by ThemeContext from brand.js.
// Changing .env.local → brand.js recomputes all CSS vars → Tailwind classes
// automatically reflect the new brand.
//
// Pattern: 'rgb(var(--token-r) var(--token-g) var(--token-b))' is NOT used
// because our tokens are full rgba strings. Instead we use the CSS var
// directly via Tailwind's arbitrary value support AND register each token
// as a named color using the var() syntax.
//
// Usage in JSX / HTML:
//   bg-accent          → background: var(--accent)
//   text-accent        → color: var(--accent)
//   border-card        → border-color: var(--card-border)
//   bg-brand-gradient  → background: var(--accent-gradient)
//   font-heading       → font-family: var(--font-heading)
// ═══════════════════════════════════════════════════════════════════════════

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',

  theme: {
    screens: {
      xs:    '375px',
      sm:    '640px',
      md:    '768px',
      lg:    '1024px',
      xl:    '1280px',
      '2xl': '1536px',
    },

    extend: {
      // ── Colors — all reference CSS vars set by ThemeContext ───────────────
      // Every var(--token) is set on :root by ThemeContext from brand.js.
      // These become Tailwind utilities: bg-accent, text-muted, border-card etc.
      colors: {

        // ── Accent / brand primary ──────────────────────────────────────────
        accent: {
          DEFAULT: 'var(--accent)',
          dark:    'var(--accent-dark)',
          light:   'var(--accent-light)',
          dim:     'var(--accent-dim)',
          border:  'var(--accent-border)',
          glow:    'var(--accent-glow)',
        },

        // ── Page / surface backgrounds ──────────────────────────────────────
        bg: {
          DEFAULT: 'var(--bg)',
          start:   'var(--bg-gradient-start)',
          end:     'var(--bg-gradient-end)',
        },
        card: {
          DEFAULT: 'var(--card-bg)',
          solid:   'var(--card-bg-solid)',
          border:  'var(--card-border)',
          shimmer: 'var(--card-shimmer)',
        },
        modal: {
          DEFAULT: 'var(--modal-bg)',
          border:  'var(--modal-border)',
        },
        overlay: 'var(--overlay-bg)',
        header: {
          DEFAULT: 'var(--header-bg)',
          border:  'var(--header-border)',
        },

        // ── Input / form ───────────────────────────────────────────────────
        input: {
          DEFAULT: 'var(--input-bg)',
          hover:   'var(--input-bg-hover)',
          border:  'var(--input-border)',
          focus:   'var(--input-border-focus)',
          valid:   'var(--input-border-valid)',
          error:   'var(--input-border-error)',
        },

        // ── Pills / tags ───────────────────────────────────────────────────
        pill: {
          DEFAULT: 'var(--pill-bg)',
          hover:   'var(--pill-bg-hover)',
          active:  'var(--pill-bg-active)',
          border:  'var(--pill-border)',
        },

        // ── Text ──────────────────────────────────────────────────────────
        primary:   'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted:     'var(--text-muted)',
        disabled:  'var(--text-disabled)',
        inverse:   'var(--text-inverse)',

        // ── Status / semantic ──────────────────────────────────────────────
        success: {
          DEFAULT: 'var(--success)',
          bg:      'var(--success-bg)',
          border:  'var(--success-border)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          bg:      'var(--warning-bg)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          bg:      'var(--danger-bg)',
          border:  'var(--danger-border)',
        },
        info: {
          DEFAULT: 'var(--info)',
          bg:      'var(--info-bg)',
          border:  'var(--info-border)',
        },

        // ── Divider / structure ───────────────────────────────────────────
        divider: {
          DEFAULT: 'var(--divider)',
          strong:  'var(--divider-strong)',
        },

        // ── Tabs ─────────────────────────────────────────────────────────
        tab: {
          active:   'var(--tab-active)',
          inactive: 'var(--tab-inactive)',
        },

        // ── Like / reaction ───────────────────────────────────────────────
        like: {
          DEFAULT: 'var(--like-bg)',
          active:  'var(--like-active-bg)',
        },

        // ── Loyalty ───────────────────────────────────────────────────────
        loyalty: {
          DEFAULT: 'var(--loyalty-bg)',
          border:  'var(--loyalty-border)',
          text:    'var(--loyalty-text)',
          sub:     'var(--loyalty-sub-text)',
        },

        // ── Orb / ambient decoration ──────────────────────────────────────
        orb: {
          DEFAULT: 'var(--orb-color)',
          2:       'var(--orb-color2)',
        },

        // ── Button states ─────────────────────────────────────────────────
        btn: {
          disabled:      'var(--btn-disabled)',
          'disabled-txt':'var(--btn-disabled-text)',
        },

        // ── Reply / quote ─────────────────────────────────────────────────
        reply: {
          DEFAULT: 'var(--reply-bg)',
          border:  'var(--reply-border)',
        },

        // ── Legacy aliases — keeps old Tailwind classes working ────────────
        // Components written before the white-label refactor used these.
        // They now map to the corresponding brand token.
        saffron: {
          DEFAULT: 'var(--accent)',
          light:   'var(--accent-light)',
          dark:    'var(--accent-dark)',
          soft:    'var(--accent-dim)',
          muted:   'var(--accent-border)',
        },
        terra: {
          DEFAULT: 'var(--accent-dark)',
          light:   'var(--accent-light)',
          dark:    'var(--accent-dark)',
          soft:    'var(--accent-dim)',
        },
        brew: {
          DEFAULT: 'var(--text-primary)',
          light:   'var(--text-secondary)',
          soft:    'var(--text-muted)',
          cream:   'var(--text-disabled)',
        },
        matcha: {
          DEFAULT: 'var(--success)',
          light:   'var(--success)',
          dark:    'var(--success)',
          soft:    'var(--success-bg)',
        },
        cream: {
          DEFAULT: 'var(--bg)',
          dark:    'var(--bg-gradient-end)',
          deep:    'var(--pill-bg)',
          border:  'var(--card-border)',
        },
      },

      // ── Typography — all reference CSS vars set by ThemeContext ───────────
      fontFamily: {
        heading:     ['var(--font-heading)',      'system-ui', 'sans-serif'],
        body:        ['var(--font-body)',          'system-ui', 'sans-serif'],
        serif:       ['var(--font-serif)',         'Georgia',   'serif'],
        display:     ['var(--font-display)',       'serif'],
        mono:        ['var(--font-mono)',          'monospace'],
        brand:       ['var(--font-brand)',         'system-ui', 'sans-serif'],
        'cafe-name': ['var(--font-cafe-name)',     'system-ui', 'sans-serif'],
        'welcome':   ['var(--font-welcome-name)',  'system-ui', 'sans-serif'],
        devanagari:  ['var(--font-display)',       'sans-serif'],
        // Legacy aliases
        sans:        ['var(--font-body)',          'system-ui', 'sans-serif'],
        jakarta:     ['var(--font-body)',          'system-ui', 'sans-serif'],
      },

      // ── Background images — reference CSS vars ────────────────────────────
      backgroundImage: {
        'brand-gradient':  'var(--accent-gradient)',
        'top-glow':        'var(--top-glow)',
        // Loyalty tier gradients — colors from LOYALTY_TIERS in brand.js
        // These use CSS custom properties injected by ThemeContext
        'bronze-gradient': 'linear-gradient(135deg, var(--loyalty-bronze-color, #CD7F32), color-mix(in srgb, var(--loyalty-bronze-color, #CD7F32) 60%, white))',
        'silver-gradient': 'linear-gradient(135deg, var(--loyalty-silver-color, #C0C0C0), color-mix(in srgb, var(--loyalty-silver-color, #C0C0C0) 60%, white))',
        'gold-gradient':   'linear-gradient(135deg, var(--loyalty-gold-color, #FFD700), color-mix(in srgb, var(--loyalty-gold-color, #FFD700) 60%, white))',
      },

      // ── Box shadows — reference CSS vars ─────────────────────────────────
      boxShadow: {
        brand:       '0 4px 20px var(--accent-glow)',
        card:        'var(--card-shadow)',
        'card-hover':'var(--card-shadow)',
        input:       'var(--input-shadow-focus)',
      },

      // ── Animations ────────────────────────────────────────────────────────
      animation: {
        'scan-line':    'scanLine 1.5s ease-in-out infinite alternate',
        'fade-in':      'fadeIn 0.2s ease-out both',
        'pulse-ring':   'pulseRing 1.5s ease-out infinite',
        'slide-up':     'slideUp 0.3s ease-out',
        'slide-down':   'slideDown 0.3s ease-out',
        'bounce-soft':  'bounceSoft 0.5s ease-in-out',
        'spin-slow':    'spin 3s linear infinite',
        'pulse-brand':  'pulseBrand 2s ease-in-out infinite',
        'waiter-glow':  'waiterGlow 1.5s ease-out infinite',
        'shimmer':      'shimmer 1.6s ease-in-out infinite',
      },

      // ── Keyframes — use CSS vars so colors animate with theme ─────────────
      keyframes: {
        slideUp:    { from: { transform: 'translateY(100%)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        slideDown:  { from: { transform: 'translateY(-100%)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        fadeIn:     { from: { opacity: '0' }, to: { opacity: '1' } },
        bounceSoft: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
        // ✅ var(--accent-glow) — was hardcoded rgba(255,159,28,...)
        pulseBrand: {
          '0%,100%': { boxShadow: '0 0 0 0 var(--accent-glow)' },
          '50%':     { boxShadow: '0 0 0 12px transparent' },
        },
        waiterGlow: {
          '0%':   { boxShadow: '0 0 0 0 var(--accent-glow)' },
          '70%':  { boxShadow: '0 0 0 8px transparent' },
          '100%': { boxShadow: '0 0 0 0 transparent' },
        },
        pulseRing: {
          '0%':   { transform: 'scale(0.85)', opacity: '0.8' },
          '70%':  { transform: 'scale(2.2)',  opacity: '0' },
          '100%': { transform: 'scale(2.2)',  opacity: '0' },
        },
        scanLine: {
          from: { transform: 'translateY(-8px)', opacity: '0.6' },
          to:   { transform: 'translateY(8px)',  opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition:  '200% center' },
        },
      },

      // ── Spacing ───────────────────────────────────────────────────────────
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        'nav':        'var(--nav-height,        56px)',
        'bottom-nav': 'var(--bottom-nav-height, 72px)',
      },

      // ── Border radius ─────────────────────────────────────────────────────
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        '2xl':'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },

      // ── Min height ────────────────────────────────────────────────────────
      minHeight: {
        screen: '100dvh',
      },

      // ── Max width ─────────────────────────────────────────────────────────
      maxWidth: {
        app: 'var(--max-width, 448px)',
      },

      // ── Transition timing ─────────────────────────────────────────────────
      transitionTimingFunction: {
        spring:       'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'out-expo':   'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-quart': 'cubic-bezier(0.76, 0, 0.24, 1)',
      },

      // ── Transition duration ───────────────────────────────────────────────
      transitionDuration: {
        theme: '300ms',
      },
    },
  },

  plugins: [],
}