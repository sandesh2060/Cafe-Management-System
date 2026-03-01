/**
 * MenuNavbar.jsx  ← replaces the <header> block in MenuPage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * SAME logic as MenuPage — same refs, same GSAP animations, same search flow.
 * COMPLETELY NEW visual design: floating pill navbar with a glowing gradient
 * underline, segmented glass panels, icon "lens" hover effect, and a
 * typographic treatment that feels 2025-premium.
 *
 * Drop at:
 *   src/modules/customer/components/menu/MenuNavbar.jsx
 *
 * ─── In MenuPage.jsx ─────────────────────────────────────────────────────────
 *  1. Import:
 *     import MenuNavbar from '../components/menu/MenuNavbar'
 *
 *  2. Replace the entire <header ref={headerRef} …>…</header> block with:
 *     <MenuNavbar
 *       headerRef={headerRef}
 *       navLeftRef={navLeftRef}
 *       navRightRef={navRightRef}
 *       searchBtnRef={searchBtnRef}
 *       searchRowRef={searchRowRef}
 *       searchInputRef={searchInputRef}
 *       searchFieldRef={searchFieldRef}
 *       clearBtnRef={clearBtnRef}
 *       brandDotRef={brandDotRef}
 *       user={user}
 *       weather={weather}
 *       searchQuery={searchQuery}
 *       items={items}
 *       searchOpen={searchOpen}
 *       searchFocused={searchFocused}
 *       setSearchFocused={setSearchFocused}
 *       onSearchOpen={openSearch}
 *       onSearchClose={closeSearch}
 *       onSearchChange={e => dispatch(setSearchQuery(e.target.value))}
 *       onClearSearch={() => { dispatch(setSearchQuery('')); searchFieldRef.current?.focus() }}
 *     />
 *
 *  3. Keep all state/refs/callbacks exactly as-is in MenuPage — nothing changes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X }   from 'lucide-react'
import { ThemeContext } from '@shared/context/ThemeContext'
import NavAvatar        from './NavAvatar'
import NotificationBell from '../notifications/NotificationBell'

export default function MenuNavbar({
  /* forwarded refs from MenuPage — keep exactly as-is */
  headerRef,
  navLeftRef,
  navRightRef,
  searchBtnRef,
  searchRowRef,
  searchInputRef,
  searchFieldRef,
  clearBtnRef,
  brandDotRef,

  /* data */
  user,
  weather,
  searchQuery   = '',
  items         = [],

  /* state */
  searchOpen    = false,
  searchFocused = false,
  setSearchFocused,

  /* handlers */
  onSearchOpen,
  onSearchClose,
  onSearchChange,
  onClearSearch,
}) {
  const navigate       = useNavigate()
  const { isDark: D }  = useContext(ThemeContext)

  /* ── theme tokens ─────────────────────────────────────────────────────── */
  const iconMuted  = D ? 'rgba(255,184,77,0.5)'  : 'rgba(92,51,23,0.4)'
  const iconActive = D ? '#FFB84D'               : '#C8680A'

  /* ── glass panel backgrounds ──────────────────────────────────────────── */
  const glassBg    = D
    ? 'rgba(18, 11, 5, 0.75)'
    : 'rgba(255, 252, 245, 0.78)'
  const glassEdge  = D
    ? 'rgba(255, 159, 28, 0.11)'
    : 'rgba(230, 210, 175, 0.9)'
  const innerGlow  = D
    ? '0 1px 0 rgba(255,159,28,0.08) inset, 0 -1px 0 rgba(0,0,0,0.3) inset'
    : '0 1px 0 rgba(255,255,255,0.95) inset, 0 -1px 0 rgba(200,180,140,0.2) inset'
  const dropShadow = D
    ? '0 8px 40px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5)'
    : '0 8px 32px rgba(120,80,30,0.13), 0 2px 6px rgba(120,80,30,0.07)'

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          NAVBAR
      ═══════════════════════════════════════════════════════════════════ */}
      <header
        ref={headerRef}
        aria-label="Main navigation"
        style={{
          position:             'sticky',
          top:                  0,
          zIndex:               40,
          paddingTop:           'max(10px, calc(8px + env(safe-area-inset-top) - 8px))',
          paddingBottom:        '10px',
          paddingLeft:          '12px',
          paddingRight:         '12px',
          /* glass */
          background:           glassBg,
          backdropFilter:       'blur(32px) saturate(200%) brightness(1.04)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%) brightness(1.04)',
          borderBottom:         `1px solid ${glassEdge}`,
          boxShadow:            `${dropShadow}, ${innerGlow}`,
          transition:           'background var(--transition-theme), border-color var(--transition-theme), box-shadow var(--transition-theme)',
          /* subtle noise texture */
          backgroundImage:      D
            ? 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.03\'/%3E%3C/svg%3E")'
            : 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.025\'/%3E%3C/svg%3E")',
        }}
      >

        {/* ── Gradient accent line across the bottom ── */}
        <div style={{
          position:   'absolute',
          bottom:     0,
          left:       0,
          right:      0,
          height:     '1.5px',
          background: D
            ? 'linear-gradient(90deg, transparent 0%, rgba(255,159,28,0.5) 30%, rgba(224,92,42,0.7) 60%, transparent 100%)'
            : 'linear-gradient(90deg, transparent 0%, rgba(255,159,28,0.6) 30%, rgba(224,92,42,0.8) 60%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* ── TOP ROW ─────────────────────────────────────────────────────── */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            10,
        }}>

          {/* ── LEFT: avatar + brand ── */}
          <div
            ref={navLeftRef}
            style={{ display: 'flex', alignItems: 'center', gap: 9, overflow: 'hidden', flex: 1 }}
          >
            {/* Avatar with ring glow */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {/* Glow ring */}
              <div style={{
                position:     'absolute',
                inset:        -2,
                borderRadius: '50%',
                background:   'linear-gradient(135deg, #FF9F1C, #E05C2A)',
                opacity:      D ? 0.55 : 0.4,
                filter:       'blur(4px)',
                zIndex:       0,
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <NavAvatar
                  name={user?.name}
                  avatar={user?.avatar}
                  isOnline={true}
                  onClick={() => navigate('/profile')}
                />
              </div>
            </div>

            {/* Brand text block */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>

              {/* Café name + live dot */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontFamily:           '"Playfair Display", Georgia, serif',
                  fontWeight:           900,
                  fontSize:             'clamp(15px, 4vw, 18px)',
                  letterSpacing:        '-0.03em',
                  lineHeight:           1,
                  background:           D
                    ? 'linear-gradient(118deg, #FFE0A0 0%, #FF9F1C 45%, #E05C2A 100%)'
                    : 'linear-gradient(118deg, #C8680A 0%, #E05C2A 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor:  'transparent',
                  backgroundClip:       'text',
                  whiteSpace:           'nowrap',
                }}>
                  कौसी चिया
                </span>

                {/* Live pulse dot */}
                <span
                  style={{ position: 'relative', width: 7, height: 7, flexShrink: 0 }}
                  aria-label="Live"
                >
                  <span
                    ref={brandDotRef}
                    style={{
                      position:        'absolute',
                      inset:           -3,
                      borderRadius:    '50%',
                      background:      'rgba(34,197,94,0.35)',
                      transformOrigin: 'center',
                    }}
                  />
                  <span style={{
                    position:     'absolute',
                    inset:        0,
                    borderRadius: '50%',
                    background:   '#22c55e',
                    boxShadow:    '0 0 5px rgba(34,197,94,0.7)',
                  }} />
                </span>
              </div>

              {/* Subtitle row: greeting + weather */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {/* Greeting pill */}
                <span style={{
                  display:        'inline-flex',
                  alignItems:     'center',
                  gap:            3,
                  padding:        '1px 7px',
                  borderRadius:   99,
                  fontSize:       9,
                  fontWeight:     600,
                  letterSpacing:  '0.02em',
                  whiteSpace:     'nowrap',
                  background:     D ? 'rgba(255,159,28,0.1)' : 'rgba(255,159,28,0.08)',
                  border:         `1px solid ${D ? 'rgba(255,159,28,0.18)' : 'rgba(255,159,28,0.2)'}`,
                  color:          D ? 'rgba(255,184,77,0.75)' : 'rgba(180,90,10,0.75)',
                  overflow:       'hidden',
                  textOverflow:   'ellipsis',
                  maxWidth:       140,
                }}>
                  {user?.name ? `Hey, ${user.name.split(' ')[0]} 👋` : 'Smart Café · Kathmandu'}
                </span>

                {/* Weather badge */}
                {weather?.temp != null && (
                  <span style={{
                    display:       'inline-flex',
                    alignItems:    'center',
                    gap:           3,
                    padding:       '1px 6px',
                    borderRadius:  99,
                    fontSize:      9,
                    fontWeight:    600,
                    background:    D ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    border:        `1px solid ${D ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
                    color:         iconMuted,
                    flexShrink:    0,
                  }}>
                    <span style={{ fontSize: 10 }}>{weather.icon || '🌤️'}</span>
                    {Math.round(weather.temp)}°
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: icon buttons ── */}
          <div
            ref={navRightRef}
            style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
          >

            {/* Notification bell — wrapped in icon lens */}
            <span className="mnav-lens-wrap mp-icon-wrap">
              <NotificationBell />
            </span>

            {/* Divider */}
            <span style={{
              width:        1,
              height:       16,
              borderRadius: 99,
              background:   D ? 'rgba(255,159,28,0.15)' : 'rgba(92,51,23,0.12)',
              flexShrink:   0,
              margin:       '0 2px',
            }} />

            {/* Search toggle — icon lens */}
            <button
              ref={searchBtnRef}
              onClick={searchOpen ? onSearchClose : onSearchOpen}
              className="mnav-lens-btn mp-nav-icon"
              aria-label={searchOpen ? 'Close search' : 'Open search'}
              aria-expanded={searchOpen}
              style={{
                color:       searchOpen ? 'var(--color-saffron)' : iconMuted,
                background:  searchOpen
                  ? (D ? 'rgba(255,159,28,0.14)' : 'rgba(255,159,28,0.1)')
                  : 'transparent',
              }}
            >
              {searchOpen
                ? <X size={18} strokeWidth={2.2} />
                : <Search size={18} strokeWidth={1.9} />
              }
            </button>
          </div>
        </div>

        {/* ── EXPANDING SEARCH ROW ──────────────────────────────────────────── */}
        <div
          ref={searchRowRef}
          style={{ display: 'none', height: 0, opacity: 0, overflow: 'hidden' }}
          role="search"
        >
          <div ref={searchInputRef} style={{ position: 'relative', marginTop: 10 }}>

            {/* Search icon inside input */}
            <span style={{
              position:      'absolute',
              left:          13,
              top:           '50%',
              transform:     'translateY(-50%)',
              pointerEvents: 'none',
              display:       'flex',
              color:         searchFocused ? 'var(--color-saffron)' : iconMuted,
              transition:    'color 0.2s',
            }}>
              <Search size={14} strokeWidth={1.9} />
            </span>

            {/* Input field */}
            <input
              ref={searchFieldRef}
              type="text"
              inputMode="search"
              autoComplete="off"
              spellCheck="false"
              value={searchQuery}
              onChange={onSearchChange}
              onFocus={() => setSearchFocused?.(true)}
              onBlur={() => setSearchFocused?.(false)}
              onKeyDown={e => e.key === 'Escape' && onSearchClose?.()}
              placeholder="Search dishes, flavours…"
              aria-label="Search menu items"
              className="mnav-search-input"
            />

            {/* Right accessories: count badge + clear */}
            <div style={{
              position:   'absolute',
              right:      8,
              top:        '50%',
              transform:  'translateY(-50%)',
              display:    'flex',
              alignItems: 'center',
              gap:        6,
            }}>
              {searchQuery && items.length > 0 && (
                <span style={{
                  fontSize:    10,
                  fontWeight:  700,
                  padding:     '2px 8px',
                  borderRadius: 99,
                  background:  D ? 'rgba(255,159,28,0.15)' : 'rgba(255,159,28,0.12)',
                  color:       'var(--color-saffron)',
                  fontFamily:  '"DM Mono", monospace',
                  border:      `1px solid ${D ? 'rgba(255,159,28,0.2)' : 'rgba(255,159,28,0.18)'}`,
                }}>
                  {items.length}
                </span>
              )}
              <button
                ref={clearBtnRef}
                onClick={onClearSearch}
                className="btn-compact mnav-clear-btn"
                aria-label="Clear search"
                style={{
                  opacity:   0,
                  transform: 'scale(0) rotate(45deg)',
                  width:     24,
                  height:    24,
                }}
              >
                <X size={11} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Search hint */}
          {searchQuery && (
            <p style={{
              fontSize:   11,
              marginTop:  7,
              paddingLeft: 4,
              color:      iconMuted,
              lineHeight: 1.4,
              margin:     '6px 0 0',
            }}>
              {items.length > 0
                ? <>
                    <span style={{ color: 'var(--color-saffron)', fontWeight: 700 }}>
                      {items.length}
                    </span>
                    {' '}result{items.length !== 1 ? 's' : ''} for &ldquo;{searchQuery}&rdquo;
                  </>
                : <>No results for &ldquo;<strong style={{ color: 'var(--color-terra)' }}>{searchQuery}</strong>&rdquo;</>
              }
            </p>
          )}
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          SCOPED STYLES — all mnav-* classes isolated
      ═══════════════════════════════════════════════════════════════════ */}
      <style>{`

        /* ────────────────────────────────────────────────────────────────
           ICON "LENS" — shared hover effect for search + notification
        ──────────────────────────────────────────────────────────────── */
        .mnav-lens-btn,
        .mnav-lens-wrap > button,
        .mnav-lens-wrap button {
          all:            unset !important;
          cursor:         pointer !important;
          display:        flex !important;
          align-items:    center !important;
          justify-content: center !important;
          width:          36px !important;
          height:         36px !important;
          border-radius:  10px !important;
          position:       relative !important;
          overflow:       hidden !important;
          color:          ${iconMuted} !important;
          /* glass pill look */
          background:     ${D
            ? 'rgba(255,255,255,0.04)'
            : 'rgba(255,255,255,0.5)'} !important;
          border:         1px solid ${D
            ? 'rgba(255,159,28,0.1)'
            : 'rgba(220,195,155,0.6)'} !important;
          transition:
            color           0.18s ease,
            background      0.18s ease,
            border-color    0.18s ease,
            transform       0.2s cubic-bezier(0.34,1.56,0.64,1),
            box-shadow      0.18s ease !important;
          -webkit-tap-highlight-color: transparent !important;
          box-shadow:     ${D
            ? '0 1px 0 rgba(255,255,255,0.04) inset'
            : '0 1px 0 rgba(255,255,255,0.9) inset'} !important;
        }

        .mnav-lens-btn:hover,
        .mnav-lens-wrap button:hover {
          color:       ${iconActive} !important;
          background:  ${D
            ? 'rgba(255,159,28,0.12)'
            : 'rgba(255,159,28,0.08)'} !important;
          border-color: ${D
            ? 'rgba(255,159,28,0.28)'
            : 'rgba(255,159,28,0.35)'} !important;
          transform:   scale(1.07) !important;
          box-shadow:  ${D
            ? '0 0 12px rgba(255,159,28,0.18), 0 1px 0 rgba(255,255,255,0.04) inset'
            : '0 0 10px rgba(255,159,28,0.15), 0 1px 0 rgba(255,255,255,0.9) inset'} !important;
        }

        .mnav-lens-btn:active,
        .mnav-lens-wrap button:active {
          transform: scale(0.91) !important;
        }

        .mnav-lens-btn:focus-visible,
        .mnav-lens-wrap button:focus-visible {
          outline:        2px solid rgba(255,159,28,0.55) !important;
          outline-offset: 2px !important;
        }

        /* Sync icon size from NotificationBell */
        .mnav-lens-wrap button svg {
          color:        inherit !important;
          width:        18px !important;
          height:       18px !important;
          stroke-width: 1.9 !important;
        }

        /* Keep mp-nav-icon class working for SearchBtn */
        .mp-nav-icon {
          background: transparent;
          border: none;
          padding: 0;
          margin: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          -webkit-tap-highlight-color: transparent;
          outline: none;
        }

        /* ────────────────────────────────────────────────────────────────
           SEARCH INPUT — frosted pill
        ──────────────────────────────────────────────────────────────── */
        .mnav-search-input {
          width:              100%;
          height:             44px;
          padding:            0 76px 0 38px;
          border-radius:      14px;
          /* inner glass */
          background:         ${D
            ? 'rgba(255,255,255,0.04)'
            : 'rgba(255,255,255,0.65)'};
          color:              var(--text-primary);
          border:             1.5px solid ${D
            ? 'rgba(255,159,28,0.12)'
            : 'rgba(210,185,145,0.8)'};
          outline:            none;
          font-family:        "DM Sans", sans-serif;
          font-size:          14px;
          font-weight:        400;
          letter-spacing:     0.01em;
          box-shadow:         ${D
            ? '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.3)'
            : '0 1px 0 rgba(255,255,255,0.95) inset, 0 2px 10px rgba(120,80,30,0.08)'};
          transition:         border-color 0.22s, box-shadow 0.22s, background 0.22s;
          -webkit-appearance: none;
        }
        .mnav-search-input::placeholder {
          color: ${D ? 'rgba(255,184,77,0.25)' : 'rgba(140,100,55,0.4)'};
        }
        .mnav-search-input:focus {
          border-color: rgba(255,159,28,0.5);
          background:   ${D
            ? 'rgba(255,159,28,0.05)'
            : 'rgba(255,252,245,0.9)'};
          box-shadow:
            0 0 0 3.5px rgba(255,159,28,0.1),
            ${D
              ? '0 1px 0 rgba(255,255,255,0.04) inset'
              : '0 1px 0 rgba(255,255,255,0.95) inset'};
        }

        /* ────────────────────────────────────────────────────────────────
           CLEAR BUTTON
        ──────────────────────────────────────────────────────────────── */
        .mnav-clear-btn {
          border-radius: 8px;
          border:        1.5px solid ${D
            ? 'rgba(255,255,255,0.1)'
            : 'rgba(210,185,145,0.7)'};
          background:    ${D
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(255,248,235,0.85)'};
          color:         ${iconMuted};
          display:       flex;
          align-items:   center;
          justify-content: center;
          cursor:        pointer;
          transition:    background 0.15s, color 0.15s, border-color 0.15s;
        }
        .mnav-clear-btn:hover {
          background:    ${D ? 'rgba(255,255,255,0.12)' : 'rgba(255,235,200,0.9)'};
          border-color:  rgba(255,159,28,0.4);
          color:         var(--text-primary);
        }

      `}</style>
    </>
  )
}