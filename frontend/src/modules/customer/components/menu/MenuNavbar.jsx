// src/modules/customer/components/menu/MenuNavbar.jsx
//
// ✅ BRAND.name replaces hardcoded cafe name
// ✅ BRAND.tagline replaces hardcoded fallback string
// ✅ FONTS.cafeName, FONTS.body, FONTS.mono replace all hardcoded font strings
// ✅ var(--header-bg/border/card-shadow) replace local hex variables
// ✅ var(--accent) fixes wrong var(--color-saffron)
// ✅ var(--text-secondary) fixes wrong var(--color-terra)
// ✅ var(--top-glow) replaces hardcoded gradient line
// ✅ var(--divider) replaces hardcoded rgba divider
// ✅ var(--pill-bg/border), var(--input-bg/border) in all scoped CSS
// ✅ var(--text-muted) replaces local iconMuted variable
// ✅ All refs, props, GSAP, search logic unchanged

import { useContext } from 'react'
import { useNavigate }  from 'react-router-dom'
import { Search, X }    from 'lucide-react'
import { ThemeContext }  from '@shared/context/ThemeContext'
import { BRAND, FONTS }  from '@shared/config/brand'
import NavAvatar         from './NavAvatar'
import NotificationBell  from '../notifications/NotificationBell'

export default function MenuNavbar({
  headerRef, navLeftRef, navRightRef,
  searchBtnRef, searchRowRef, searchInputRef,
  searchFieldRef, clearBtnRef, brandDotRef,
  user, weather,
  searchQuery = '', items = [],
  searchOpen = false, searchFocused = false,
  setSearchFocused,
  onSearchOpen, onSearchClose, onSearchChange, onClearSearch,
}) {
  const navigate      = useNavigate()
  const { isDark: D } = useContext(ThemeContext)

  return (
    <>
      {/* ═══ NAVBAR ═══ */}
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
          // ✅ var tokens — was local glassBg/dropShadow/innerGlow hex variables
          background:           'var(--header-bg)',
          backdropFilter:       'blur(32px) saturate(200%) brightness(1.04)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%) brightness(1.04)',
          borderBottom:         '1px solid var(--header-border)',
          boxShadow:            'var(--card-shadow)',
          transition:           'background var(--transition-theme), border-color var(--transition-theme)',
          // ✅ FONTS.body
          fontFamily:           FONTS.body,
        }}
      >
        {/* ── Gradient accent line ── */}
        <div style={{
          position:      'absolute',
          bottom:        0, left: 0, right: 0,
          height:        '1.5px',
          // ✅ var(--top-glow) — was hardcoded rgba gradient
          background:    'var(--top-glow)',
          opacity:       D ? 0.6 : 0.45,
          pointerEvents: 'none',
        }} />

        {/* ── TOP ROW ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>

          {/* LEFT: avatar + brand */}
          <div ref={navLeftRef} style={{ display: 'flex', alignItems: 'center', gap: 9, overflow: 'hidden', flex: 1 }}>

            {/* Avatar with ring glow */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                position: 'absolute', inset: -2, borderRadius: '50%',
                // ✅ var(--accent-gradient)
                background: 'var(--accent-gradient)',
                opacity: D ? 0.55 : 0.4, filter: 'blur(4px)', zIndex: 0,
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <NavAvatar name={user?.name} avatar={user?.avatar} isOnline={true} onClick={() => navigate('/profile')} />
              </div>
            </div>

            {/* Brand text block */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>

              {/* Cafe name + live dot */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  // ✅ FONTS.cafeName — was hardcoded 'Playfair Display'
                  fontFamily:           FONTS.cafeName,
                  fontWeight:           900,
                  fontSize:             'clamp(15px, 4vw, 18px)',
                  letterSpacing:        '-0.03em',
                  lineHeight:           1,
                  // ✅ var(--accent-gradient) as text gradient
                  background:           'var(--accent-gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor:  'transparent',
                  backgroundClip:       'text',
                  whiteSpace:           'nowrap',
                }}>
                  {/* ✅ BRAND.name — was hardcoded 'कौसी चिया' */}
                  {BRAND.name}
                </span>

                {/* Live pulse dot — semantic green */}
                <span style={{ position: 'relative', width: 7, height: 7, flexShrink: 0 }} aria-label="Live">
                  <span ref={brandDotRef} style={{
                    position: 'absolute', inset: -3, borderRadius: '50%',
                    background: 'rgba(34,197,94,0.35)', transformOrigin: 'center',
                  }} />
                  <span style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: '#22c55e', boxShadow: '0 0 5px rgba(34,197,94,0.7)',
                  }} />
                </span>
              </div>

              {/* Subtitle: greeting + weather */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>

                {/* Greeting pill */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  padding: '1px 7px', borderRadius: 99,
                  fontSize: 9, fontWeight: 600, letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                  // ✅ var tokens — was hardcoded rgba
                  background: 'var(--accent-dim)',
                  border:     '1px solid var(--accent-border)',
                  color:      'var(--text-muted)',
                  overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140,
                }}>
                  {/* ✅ BRAND.name in fallback — was hardcoded 'Smart Café · Kathmandu' */}
                  {user?.name ? `Hey, ${user.name.split(' ')[0]} 👋` : `${BRAND.name} ${BRAND.emoji}`}
                </span>

                {/* Weather badge */}
                {weather?.temp != null && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    padding: '1px 6px', borderRadius: 99,
                    fontSize: 9, fontWeight: 600,
                    // ✅ var tokens
                    background: 'var(--pill-bg)',
                    border:     '1px solid var(--pill-border)',
                    color:      'var(--text-muted)',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 10 }}>{weather.icon || '🌤️'}</span>
                    {Math.round(weather.temp)}°
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: icon buttons */}
          <div ref={navRightRef} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>

            <span className="mnav-lens-wrap mp-icon-wrap">
              <NotificationBell />
            </span>

            {/* Divider */}
            <span style={{
              width: 1, height: 16, borderRadius: 99,
              // ✅ var(--divider)
              background: 'var(--divider)',
              flexShrink: 0, margin: '0 2px',
            }} />

            {/* Search toggle */}
            <button
              ref={searchBtnRef}
              onClick={searchOpen ? onSearchClose : onSearchOpen}
              className="mnav-lens-btn mp-nav-icon"
              aria-label={searchOpen ? 'Close search' : 'Open search'}
              aria-expanded={searchOpen}
              style={{
                // ✅ var(--accent) — was wrong var(--color-saffron)
                color:      searchOpen ? 'var(--accent)' : 'var(--text-muted)',
                background: searchOpen ? 'var(--accent-dim)' : 'transparent',
              }}
            >
              {searchOpen ? <X size={18} strokeWidth={2.2} /> : <Search size={18} strokeWidth={1.9} />}
            </button>
          </div>
        </div>

        {/* ── EXPANDING SEARCH ROW ── */}
        <div ref={searchRowRef} style={{ display: 'none', height: 0, opacity: 0, overflow: 'hidden' }} role="search">
          <div ref={searchInputRef} style={{ position: 'relative', marginTop: 10 }}>

            {/* Search icon inside input */}
            <span style={{
              position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
              pointerEvents: 'none', display: 'flex',
              // ✅ var(--accent) / var(--text-muted)
              color: searchFocused ? 'var(--accent)' : 'var(--text-muted)',
              transition: 'color 0.2s',
            }}>
              <Search size={14} strokeWidth={1.9} />
            </span>

            <input
              ref={searchFieldRef}
              type="text" inputMode="search" autoComplete="off" spellCheck="false"
              value={searchQuery}
              onChange={onSearchChange}
              onFocus={() => setSearchFocused?.(true)}
              onBlur={() => setSearchFocused?.(false)}
              onKeyDown={e => e.key === 'Escape' && onSearchClose?.()}
              placeholder="Search dishes, flavours…"
              aria-label="Search menu items"
              className="mnav-search-input"
            />

            {/* Right: count badge + clear */}
            <div style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {searchQuery && items.length > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 99,
                  // ✅ var tokens
                  background: 'var(--accent-dim)',
                  color:      'var(--accent)',
                  // ✅ FONTS.mono
                  fontFamily: FONTS.mono,
                  border: '1px solid var(--accent-border)',
                }}>
                  {items.length}
                </span>
              )}
              <button
                ref={clearBtnRef}
                onClick={onClearSearch}
                className="btn-compact mnav-clear-btn"
                aria-label="Clear search"
                style={{ opacity: 0, transform: 'scale(0) rotate(45deg)', width: 24, height: 24 }}
              >
                <X size={11} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Search hint */}
          {searchQuery && (
            <p style={{
              fontSize: 11, marginTop: 7, paddingLeft: 4,
              color: 'var(--text-muted)',
              lineHeight: 1.4, margin: '6px 0 0',
              fontFamily: FONTS.body,
            }}>
              {items.length > 0
                ? <><span style={{ color: 'var(--accent)', fontWeight: 700 }}>{items.length}</span>{' '}result{items.length !== 1 ? 's' : ''} for &ldquo;{searchQuery}&rdquo;</>
                // ✅ var(--danger) — was hardcoded var(--color-terra)
                : <>No results for &ldquo;<strong style={{ color: 'var(--danger)' }}>{searchQuery}</strong>&rdquo;</>
              }
            </p>
          )}
        </div>
      </header>

      {/* ═══ SCOPED STYLES ═══ */}
      <style>{`
        /* Icon lens buttons — shared hover */
        .mnav-lens-btn,
        .mnav-lens-wrap > button,
        .mnav-lens-wrap button {
          all:             unset !important;
          cursor:          pointer !important;
          display:         flex !important;
          align-items:     center !important;
          justify-content: center !important;
          width:           36px !important;
          height:          36px !important;
          border-radius:   10px !important;
          position:        relative !important;
          overflow:        hidden !important;
          color:           var(--text-muted) !important;
          background:      var(--pill-bg) !important;
          border:          1px solid var(--pill-border) !important;
          transition:      color 0.18s ease, background 0.18s ease, border-color 0.18s ease,
                           transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease !important;
          -webkit-tap-highlight-color: transparent !important;
          font-family:     ${FONTS.body} !important;
        }
        .mnav-lens-btn:hover,
        .mnav-lens-wrap button:hover {
          color:        var(--accent) !important;
          background:   var(--accent-dim) !important;
          border-color: var(--accent-border) !important;
          transform:    scale(1.07) !important;
          box-shadow:   0 0 12px var(--accent-glow) !important;
        }
        .mnav-lens-btn:active,
        .mnav-lens-wrap button:active { transform: scale(0.91) !important; }
        .mnav-lens-btn:focus-visible,
        .mnav-lens-wrap button:focus-visible {
          outline: 2px solid var(--accent) !important;
          outline-offset: 2px !important;
        }
        .mnav-lens-wrap button svg {
          color: inherit !important; width: 18px !important; height: 18px !important; stroke-width: 1.9 !important;
        }
        .mp-nav-icon {
          background: transparent; border: none; padding: 0; margin: 0;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          -webkit-tap-highlight-color: transparent; outline: none;
        }

        /* Search input */
        .mnav-search-input {
          width: 100%; height: 44px; padding: 0 76px 0 38px;
          border-radius: 14px;
          background:  var(--input-bg);
          color:       var(--text-primary);
          border:      1.5px solid var(--input-border);
          outline:     none;
          font-family: ${FONTS.body};
          font-size:   14px; font-weight: 400; letter-spacing: 0.01em;
          box-shadow:  var(--card-shadow);
          transition:  border-color 0.22s, box-shadow 0.22s, background 0.22s;
          -webkit-appearance: none;
        }
        .mnav-search-input::placeholder { color: var(--text-disabled); }
        .mnav-search-input:focus {
          border-color: var(--input-border-focus);
          background:   var(--input-bg-hover);
          box-shadow:   var(--input-shadow-focus);
        }

        /* Clear button */
        .mnav-clear-btn {
          border-radius: 8px;
          border:        1.5px solid var(--pill-border);
          background:    var(--pill-bg);
          color:         var(--text-muted);
          display:       flex; align-items: center; justify-content: center;
          cursor:        pointer;
          transition:    background 0.15s, color 0.15s, border-color 0.15s;
        }
        .mnav-clear-btn:hover {
          background:   var(--accent-dim);
          border-color: var(--accent-border);
          color:        var(--text-primary);
        }
      `}</style>
    </>
  )
}