// src/modules/customer/components/menu/MenuNavbar.jsx
//
// ADDED:
// ✅ Chat bubble icon with unread count badge in navRight
// ✅ Navigates to /chat on click
// All other logic unchanged.

import { useContext }   from 'react'
import { useSelector }  from 'react-redux'
import { useNavigate }  from 'react-router-dom'
import { Search, X }    from 'lucide-react'
import { ThemeContext }  from '@shared/context/ThemeContext'
import { BRAND, FONTS }  from '@shared/config/brand'
import { selectLoyalty } from '@store/slices/loyaltySlice'
import { selectTotalUnread } from '@store/slices/socialChatSlice'
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

  const loyaltyRaw  = useSelector(selectLoyalty)
  const tier        = loyaltyRaw?.loyalty?.tier ?? loyaltyRaw?.tier ?? 'none'
  const chatUnread  = useSelector(selectTotalUnread)   // ✅ NEW

  return (
    <>
      {/* ═══ NAVBAR ═══ */}
      <header
        ref={headerRef}
        aria-label="Main navigation"
        className="mnav-header"
        style={{
          position:             'sticky',
          top:                  0,
          zIndex:               40,
          paddingTop:           'max(10px, calc(8px + env(safe-area-inset-top) - 8px))',
          paddingBottom:        '10px',
          paddingLeft:          '12px',
          paddingRight:         '12px',
          background:           D ? 'rgba(16,12,8,0.38)' : 'rgba(255,255,255,0.28)',
          backdropFilter:       'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          borderBottom:         D ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.55)',
          boxShadow:            D
            ? '0 8px 32px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset'
            : '0 4px 24px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.80) inset',
          transition:           'background var(--transition-theme), border-color var(--transition-theme)',
          fontFamily:           FONTS.body,
          contain:              'layout style',
          willChange:           'backdrop-filter',
        }}
      >
        {/* Top gloss shimmer line */}
        <div style={{
          position:'absolute',top:0,left:0,right:0,height:1,
          background: D
            ? 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.18) 30%,rgba(255,255,255,0.45) 50%,rgba(255,255,255,0.18) 70%,transparent 100%)'
            : 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.60) 30%,rgba(255,255,255,0.90) 50%,rgba(255,255,255,0.60) 70%,transparent 100%)',
          pointerEvents:'none',zIndex:3,
        }}/>

        <div style={{
          position:'absolute',top:0,left:0,right:0,height:'40%',
          background: D
            ? 'linear-gradient(180deg,rgba(255,255,255,0.05) 0%,transparent 100%)'
            : 'linear-gradient(180deg,rgba(255,255,255,0.30) 0%,transparent 100%)',
          pointerEvents:'none',zIndex:1,borderRadius:'inherit',
        }}/>

        <div style={{
          position:'absolute',bottom:0,left:0,right:0,height:'1.5px',
          background:'var(--top-glow)',opacity:D ? 0.5 : 0.35,pointerEvents:'none',
        }}/>

        {/* ── TOP ROW ── */}
        <div style={{position:'relative',zIndex:2,display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>

          {/* LEFT: avatar + brand */}
          <div ref={navLeftRef} style={{display:'flex',alignItems:'center',gap:9,overflow:'hidden',flex:1}}>
            <div style={{position:'relative',flexShrink:0}}>
              <div style={{
                position:'absolute',inset:-2,borderRadius:'50%',
                background:'var(--accent-gradient)',
                opacity: D ? 0.55 : 0.4,filter:'blur(4px)',zIndex:0,
              }}/>
              <div style={{position:'relative',zIndex:1}}>
                <NavAvatar
                  name={user?.name}
                  avatar={user?.avatar}
                  tier={tier}
                  isOnline={true}
                  onClick={() => navigate('/profile')}
                />
              </div>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:2,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{
                  fontFamily:FONTS.cafeName,fontWeight:900,
                  fontSize:'clamp(15px,4vw,18px)',letterSpacing:'-0.03em',lineHeight:1,
                  background:'var(--accent-gradient)',
                  WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',
                  whiteSpace:'nowrap',
                }}>
                  {BRAND.name}
                </span>
                <span style={{position:'relative',width:7,height:7,flexShrink:0}} aria-label="Live">
                  <span ref={brandDotRef} style={{position:'absolute',inset:-3,borderRadius:'50%',background:'rgba(34,197,94,0.35)',transformOrigin:'center'}}/>
                  <span style={{position:'absolute',inset:0,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 5px rgba(34,197,94,0.7)'}}/>
                </span>
              </div>

              <div style={{display:'flex',alignItems:'center',gap:5}}>
                <span style={{
                  display:'inline-flex',alignItems:'center',gap:3,
                  padding:'1px 7px',borderRadius:99,
                  fontSize:9,fontWeight:600,letterSpacing:'0.02em',whiteSpace:'nowrap',
                  background:'var(--accent-dim)',border:'1px solid var(--accent-border)',
                  color:'var(--text-muted)',overflow:'hidden',textOverflow:'ellipsis',maxWidth:140,
                }}>
                  {user?.name ? `Hey, ${user.name.split(' ')[0]} 👋` : `${BRAND.name} ${BRAND.emoji}`}
                </span>
                {weather?.temp != null && (
                  <span style={{
                    display:'inline-flex',alignItems:'center',gap:3,
                    padding:'1px 6px',borderRadius:99,
                    fontSize:9,fontWeight:600,
                    background:'var(--pill-bg)',border:'1px solid var(--pill-border)',
                    color:'var(--text-muted)',flexShrink:0,
                  }}>
                    <span style={{fontSize:10}}>{weather.icon || '🌤️'}</span>
                    {Math.round(weather.temp)}°
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: icon buttons */}
          <div ref={navRightRef} style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}}>

            {/* ✅ NEW — Chat bubble with unread count */}
            <button
              onClick={() => navigate('/chat')}
              aria-label="Messages"
              style={{
                position:   'relative',
                width:      36, height: 36,
                borderRadius: 10,
                background: 'var(--pill-bg)',
                border:     '1px solid var(--pill-border)',
                cursor:     'pointer',
                display:    'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color:      chatUnread > 0 ? 'var(--accent)' : 'var(--text-muted)',
                flexShrink: 0,
                transition: 'color .18s, background .18s',
              }}>
              {/* Chat bubble SVG */}
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M2 2.5h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6l-3.5 3V3.5a1 1 0 0 1 1-1z"
                  stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
                  fill={chatUnread > 0 ? 'var(--accent-dim)' : 'none'}
                />
              </svg>
              {/* Unread badge */}
              {chatUnread > 0 && (
                <span style={{
                  position:     'absolute',
                  top:          -3, right: -3,
                  minWidth:     16, height: 16,
                  borderRadius: 99,
                  background:   'var(--accent)',
                  color:        '#fff',
                  fontSize:     9,
                  fontWeight:   800,
                  fontFamily:   FONTS.body,
                  display:      'flex',
                  alignItems:   'center',
                  justifyContent: 'center',
                  padding:      '0 4px',
                  border:       `2px solid ${D ? 'rgba(16,12,8,1)' : 'rgba(255,255,255,1)'}`,
                  lineHeight:   1,
                }}>
                  {chatUnread > 9 ? '9+' : chatUnread}
                </span>
              )}
            </button>

            <span className="mnav-lens-wrap mp-icon-wrap">
              <NotificationBell/>
            </span>
            <span style={{width:1,height:16,borderRadius:99,background:'var(--divider)',flexShrink:0,margin:'0 2px'}}/>
            <button
              ref={searchBtnRef}
              onClick={searchOpen ? onSearchClose : onSearchOpen}
              className="mnav-lens-btn mp-nav-icon"
              aria-label={searchOpen ? 'Close search' : 'Open search'}
              aria-expanded={searchOpen}
              style={{
                color:      searchOpen ? 'var(--accent)' : 'var(--text-muted)',
                background: searchOpen ? 'var(--accent-dim)' : 'transparent',
              }}
            >
              {searchOpen ? <X size={18} strokeWidth={2.2}/> : <Search size={18} strokeWidth={1.9}/>}
            </button>
          </div>
        </div>

        {/* ── EXPANDING SEARCH ROW ── */}
        <div ref={searchRowRef} style={{position:'relative',zIndex:2,display:'none',height:0,opacity:0,overflow:'hidden'}} role="search">
          <div ref={searchInputRef} style={{position:'relative',marginTop:10}}>
            <span style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',pointerEvents:'none',display:'flex',color:searchFocused?'var(--accent)':'var(--text-muted)',transition:'color 0.2s'}}>
              <Search size={14} strokeWidth={1.9}/>
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
            <div style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',display:'flex',alignItems:'center',gap:6}}>
              {searchQuery && items.length > 0 && (
                <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,background:'var(--accent-dim)',color:'var(--accent)',fontFamily:FONTS.mono,border:'1px solid var(--accent-border)'}}>
                  {items.length}
                </span>
              )}
              <button ref={clearBtnRef} onClick={onClearSearch} className="btn-compact mnav-clear-btn" aria-label="Clear search" style={{opacity:0,transform:'scale(0) rotate(45deg)',width:24,height:24}}>
                <X size={11} strokeWidth={2.5}/>
              </button>
            </div>
          </div>
          {searchQuery && (
            <p style={{fontSize:11,marginTop:7,paddingLeft:4,color:'var(--text-muted)',lineHeight:1.4,margin:'6px 0 0',fontFamily:FONTS.body}}>
              {items.length > 0
                ? <><span style={{color:'var(--accent)',fontWeight:700}}>{items.length}</span>{' '}result{items.length!==1?'s':''} for &ldquo;{searchQuery}&rdquo;</>
                : <>No results for &ldquo;<strong style={{color:'var(--danger)'}}>{searchQuery}</strong>&rdquo;</>
              }
            </p>
          )}
        </div>
      </header>

      {/* ═══ SCOPED STYLES ═══ */}
      <style>{`
        .mnav-lens-btn,
        .mnav-lens-wrap > button,
        .mnav-lens-wrap button {
          all: unset !important; cursor: pointer !important;
          display: flex !important; align-items: center !important; justify-content: center !important;
          width: 36px !important; height: 36px !important; border-radius: 10px !important;
          position: relative !important; overflow: hidden !important;
          color: var(--text-muted) !important; background: var(--pill-bg) !important;
          border: 1px solid var(--pill-border) !important;
          transition: color 0.18s ease, background 0.18s ease, border-color 0.18s ease,
                      transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease !important;
          -webkit-tap-highlight-color: transparent !important;
          font-family: ${FONTS.body} !important;
        }
        .mnav-lens-btn:hover, .mnav-lens-wrap button:hover {
          color: var(--accent) !important; background: var(--accent-dim) !important;
          border-color: var(--accent-border) !important; transform: scale(1.07) !important;
          box-shadow: 0 0 12px var(--accent-glow) !important;
        }
        .mnav-lens-btn:active, .mnav-lens-wrap button:active { transform: scale(0.91) !important; }
        .mnav-lens-btn:focus-visible, .mnav-lens-wrap button:focus-visible {
          outline: 2px solid var(--accent) !important; outline-offset: 2px !important;
        }
        .mnav-lens-wrap button svg { color: inherit !important; width: 18px !important; height: 18px !important; stroke-width: 1.9 !important; }
        .mp-nav-icon { background: transparent; border: none; padding: 0; margin: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; -webkit-tap-highlight-color: transparent; outline: none; }
        .mnav-search-input {
          width: 100%; height: 44px; padding: 0 76px 0 38px; border-radius: 14px;
          background: var(--input-bg); color: var(--text-primary);
          border: 1.5px solid var(--input-border); outline: none;
          font-family: ${FONTS.body}; font-size: 14px; font-weight: 400; letter-spacing: 0.01em;
          box-shadow: var(--card-shadow);
          transition: border-color 0.22s, box-shadow 0.22s, background 0.22s;
          -webkit-appearance: none;
        }
        .mnav-search-input::placeholder { color: var(--text-disabled); }
        .mnav-search-input:focus { border-color: var(--input-border-focus); background: var(--input-bg-hover); box-shadow: var(--input-shadow-focus); }
        .mnav-clear-btn {
          border-radius: 8px; border: 1.5px solid var(--pill-border); background: var(--pill-bg);
          color: var(--text-muted); display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .mnav-clear-btn:hover { background: var(--accent-dim); border-color: var(--accent-border); color: var(--text-primary); }
      `}</style>
    </>
  )
}