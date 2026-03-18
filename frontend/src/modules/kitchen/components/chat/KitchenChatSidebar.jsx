// src/modules/kitchen/components/chat/KitchenChatSidebar.jsx
//
// ✅ bg-gray-800/700/900 Tailwind → var(--header-bg/card-bg/pill-bg)
// ✅ bg-white, border-gray-200 → var(--card-bg/card-border)
// ✅ text-gray-* → var(--text-muted/primary/secondary)
// ✅ bg-gradient-to-br from-amber-500 to-orange-500 → var(--accent-gradient)
// ✅ bg-black/50 overlay → var(--overlay-bg)
// ✅ GSAP animations unchanged

import { useState, useRef, useEffect, useContext } from 'react'
import WaiterChatPanel from '@modules/waiter/components/chat/WaiterChatPanel'
import { ThemeContext } from '@shared/context/ThemeContext'
import gsap             from 'gsap'
import { MessageSquare, X } from 'lucide-react'

const KitchenChatSidebar = () => {
  const [open, setOpen] = useState(false)
  const { isDark }      = useContext(ThemeContext)
  const panelRef        = useRef(null)

  const openPanel = () => {
    setOpen(true)
    requestAnimationFrame(() => {
      if (panelRef.current)
        gsap.fromTo(panelRef.current, { x: 280 }, { x: 0, duration: 0.3, ease: 'power3.out' })
    })
  }

  const closePanel = () => {
    if (panelRef.current) {
      gsap.to(panelRef.current, {
        x: 280, duration: 0.25, ease: 'power2.in',
        onComplete: () => setOpen(false),
      })
    } else {
      setOpen(false)
    }
  }

  return (
    <>
      {/* Desktop toggle tab */}
      {!open && (
        <button
          onClick={openPanel}
          className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-30
                     flex-col items-center gap-1.5 px-2 py-4 rounded-l-xl border transition-colors"
          style={{
            background:   'var(--card-bg)',
            borderColor:  'var(--card-border)',
            color:        'var(--text-muted)',
            boxShadow:    'var(--card-shadow)',
          }}
        >
          <MessageSquare size={17} />
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ writingMode: 'vertical-rl' }}>
            Chat
          </span>
        </button>
      )}

      {/* Mobile FAB */}
      {!open && (
        <button
          onClick={openPanel}
          className="md:hidden fixed bottom-6 right-4 z-30 w-12 h-12 rounded-full
                     flex items-center justify-center shadow-lg active:scale-90 transition-transform"
          style={{ background: 'var(--accent-gradient)', color: 'var(--text-inverse)' }}
        >
          <MessageSquare size={20} />
        </button>
      )}

      {/* Panel */}
      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 backdrop-blur-sm"
            style={{ background: 'var(--overlay-bg)' }}
            onClick={closePanel}
          />

          <div
            ref={panelRef}
            className="fixed md:relative right-0 top-0 h-full w-72 z-50 md:z-auto flex flex-col border-l flex-shrink-0"
            style={{
              background:   'var(--card-bg)',
              borderColor:  'var(--card-border)',
              boxShadow:    'var(--card-shadow)',
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
              style={{ borderColor: 'var(--divider)' }}
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={16} style={{ color: 'var(--info)' }} />
                <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Staff Chat
                </h2>
              </div>
              <button
                onClick={closePanel}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'var(--text-muted)', background: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--pill-bg)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                <X size={15} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-2">
              <WaiterChatPanel />
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default KitchenChatSidebar