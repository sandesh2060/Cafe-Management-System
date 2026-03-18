// src/modules/waiter/pages/WaiterDashboard.jsx
//
// ✅ FIX: White gap — grid had alignContent:'start' which shrinks grid tracks
//    to content height. Grid container stretches via flex:1 but the grid
//    background only paints behind grid tracks, not the full container area.
//    Fix: wrap grid in a position:relative container that fills flex:1,
//    and use a position:absolute background layer that covers 100% height.
//    The grid itself is position:relative with auto height (content-sized).
//
// ✅ Pure JS breakpoint — zero Tailwind grid classes
// ✅ useBreakpoint uses useEffect so resize works

import { useState, useContext, useRef, useEffect } from 'react'
import DashboardLayout          from '@shared/components/layout/DashboardLayout'
import WaiterActiveOrders       from '../components/orders/WaiterActiveOrders'
import WaiterCallList           from '../components/orders/WaiterCallList'
import WaiterTableMap           from '../components/tables/WaiterTableMap'
import WaiterChatPanel          from '../components/chat/WaiterChatPanel'
import { useWaiterSocket }      from '../hooks/useWaiterSocket'
import { useSelector }          from 'react-redux'
import { selectUnreadMessages } from '@store/slices/messagingSlice'
import { ThemeContext }         from '@shared/context/ThemeContext'
import gsap                     from 'gsap'
import { ClipboardList, Bell, Map, MessageSquare } from 'lucide-react'

const TABS = [
  { key: 'orders', label: 'Orders', Icon: ClipboardList },
  { key: 'calls',  label: 'Calls',  Icon: Bell          },
  { key: 'tables', label: 'Tables', Icon: Map           },
  { key: 'chat',   label: 'Chat',   Icon: MessageSquare },
]

const useBreakpoint = () => {
  const getW = () => (typeof window !== 'undefined' ? window.innerWidth : 1024)
  const [width, setWidth] = useState(getW)
  useEffect(() => {
    const h = () => setWidth(window.innerWidth)
    window.addEventListener('resize', h, { passive: true })
    return () => window.removeEventListener('resize', h)
  }, [])
  return { isMobile: width < 768, isDesktop: width >= 1024 }
}

const WaiterDashboard = () => {
  const [tab, setTab]           = useState('orders')
  const unreadMessages          = useSelector(selectUnreadMessages)
  const { isDark }              = useContext(ThemeContext)
  const contentRef              = useRef(null)
  const { isMobile, isDesktop } = useBreakpoint()
  useWaiterSocket()

  const switchTab = (key) => {
    if (key === tab) return
    if (contentRef.current)
      gsap.fromTo(contentRef.current, { opacity: 0, x: 10 }, { opacity: 1, x: 0, duration: 0.22, ease: 'power2.out' })
    setTab(key)
  }

  const gridCols    = isDesktop ? 3 : 2
  const leftColSpan = isDesktop ? 2 : 1

  return (
    <DashboardLayout title="Waiter" role="waiter" activeNav={tab} onNavChange={switchTab}>

      {/* ── Mobile tab bar ── */}
      {isMobile && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--header-border)', position: 'sticky', top: 0, zIndex: 20, flexShrink: 0, background: 'var(--header-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
          {TABS.map(({ key, label, Icon }) => {
            const active = tab === key
            return (
              <button key={key} onClick={() => switchTab(key)}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 4px', position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: active ? 'var(--accent)' : 'var(--text-muted)', transition: 'color 0.15s', WebkitTapHighlightColor: 'transparent', minHeight: 'unset', minWidth: 'unset' }}
              >
                <div style={{ position: 'relative' }}>
                  <Icon size={20} />
                  {key === 'chat' && unreadMessages > 0 && (
                    <span style={{ position: 'absolute', top: -4, right: -6, width: 16, height: 16, borderRadius: '50%', background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadMessages}</span>
                  )}
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-body)' }}>{label}</span>
                {active && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, borderRadius: '2px 2px 0 0', background: 'var(--accent)' }} />}
              </button>
            )
          })}
        </div>
      )}

      {/*
        ── Desktop/Tablet grid ──────────────────────────────────────────────
        FIX: The grid had alignContent:'start' which shrinks grid row tracks
        to content height. The grid container stretches to fill flex:1 but
        CSS grid backgrounds only paint BEHIND GRID TRACKS — not the full
        container. So empty space below tracks shows whatever is behind.

        Solution: position:relative wrapper fills flex:1 (stretches fully).
        A position:absolute div behind covers 100%x100% with var(--bg).
        The grid sits on top with its natural (content) height.
        This guarantees the background always covers the full area.
      */}
      {!isMobile && (
        <div style={{
          flex: 1,
          position: 'relative',   // establishes stacking context for bg layer
          minHeight: 0,
        }}>
          {/* Background fill layer — always covers full container */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'var(--bg)',
            transition: 'background var(--transition-theme)',
            zIndex: 0,
          }} />

          {/* Grid content — sits above bg layer */}
          <div style={{
            position: 'relative', zIndex: 1,
            display: 'grid',
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
            gap: '1rem',
            padding: '1rem',
          }}>
            <div style={{ gridColumn: `span ${leftColSpan}`, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <WaiterActiveOrders />
              <WaiterCallList />
            </div>
            <div style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <WaiterTableMap />
              <WaiterChatPanel />
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile content ── */}
      {isMobile && (
        <div ref={contentRef} style={{ flex: 1, overflowY: 'auto', padding: '12px', background: 'var(--bg)' }}>
          {tab === 'orders' && <WaiterActiveOrders />}
          {tab === 'calls'  && <WaiterCallList />}
          {tab === 'tables' && <WaiterTableMap />}
          {tab === 'chat'   && <WaiterChatPanel />}
        </div>
      )}

    </DashboardLayout>
  )
}

export default WaiterDashboard