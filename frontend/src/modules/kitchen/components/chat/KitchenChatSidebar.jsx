// src/modules/kitchen/components/chat/KitchenChatSidebar.jsx
import { useState } from 'react'
import WaiterChatPanel from '@modules/waiter/components/chat/WaiterChatPanel'
import { MessageSquare, ChevronRight } from 'lucide-react'

const KitchenChatSidebar = () => {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-30 bg-gray-800 text-white
                   rounded-l-xl px-2 py-4 flex flex-col items-center gap-2 border border-gray-700"
      >
        {open
          ? <ChevronRight size={18} />
          : <>
              <MessageSquare size={18} />
              <span className="text-[10px] font-bold writing-mode-vertical">Chat</span>
            </>
        }
      </button>

      {/* Sidebar panel */}
      {open && (
        <div className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="font-bold text-white text-sm">Staff Chat</h2>
          </div>
          <div className="flex-1 overflow-hidden p-2">
            {/* Reuse WaiterChatPanel — same API */}
            <WaiterChatPanel />
          </div>
        </div>
      )}
    </>
  )
}

export default KitchenChatSidebar