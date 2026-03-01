// src/modules/kitchen/components/chat/KitchenChatSidebar.jsx
import { useState, useRef, useEffect, useContext } from 'react'
import WaiterChatPanel from '@modules/waiter/components/chat/WaiterChatPanel'
import { ThemeContext } from '@shared/context/ThemeContext'
import gsap             from 'gsap'
import { MessageSquare, X } from 'lucide-react'

const KitchenChatSidebar = () => {
  const [open, setOpen]    = useState(false)
  const { isDark: dk }     = useContext(ThemeContext)
  const panelRef           = useRef(null)
  const btnRef             = useRef(null)

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
      {/* Toggle button */}
      {!open && (
        <button
          ref={btnRef}
          onClick={openPanel}
          className={`hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-30
            flex-col items-center gap-1.5 px-2 py-4 rounded-l-xl border transition-colors
            ${dk ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'
                 : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900 shadow-md'}`}
        >
          <MessageSquare size={17} />
          <span className="text-[9px] font-bold uppercase tracking-wider"
                style={{ writingMode: 'vertical-rl' }}>
            Chat
          </span>
        </button>
      )}

      {/* Mobile FAB */}
      {!open && (
        <button
          onClick={openPanel}
          className="md:hidden fixed bottom-6 right-4 z-30 w-12 h-12 rounded-full
                     bg-gradient-to-br from-amber-500 to-orange-500 text-white
                     flex items-center justify-center shadow-lg active:scale-90 transition-transform"
        >
          <MessageSquare size={20} />
        </button>
      )}

      {/* Sidebar panel */}
      {open && (
        <>
          {/* Mobile backdrop */}
          <div className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
               onClick={closePanel} />

          <div
            ref={panelRef}
            className={`fixed md:relative right-0 top-0 h-full w-72 z-50 md:z-auto
              flex flex-col border-l flex-shrink-0
              ${dk ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-xl md:shadow-none'}`}
          >
            <div className={`flex items-center justify-between px-4 py-3 border-b flex-shrink-0
              ${dk ? 'border-gray-800' : 'border-gray-100'}`}>
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className={dk ? 'text-blue-400' : 'text-blue-500'} />
                <h2 className={`font-bold text-sm ${dk ? 'text-white' : 'text-gray-900'}`}>
                  Staff Chat
                </h2>
              </div>
              <button onClick={closePanel}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors
                  ${dk ? 'text-gray-500 hover:text-white hover:bg-white/8'
                       : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
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