// src/modules/waiter/pages/WaiterDashboard.jsx
import { useState, useContext, useRef, useEffect } from 'react'
import DashboardLayout          from '@shared/components/layout/DashboardLayout'
import WaiterActiveOrders       from '../components/orders/WaiterActiveOrders'
import WaiterCallList           from '../components/orders/WaiterCallList'
import WaiterTableMap           from '../components/tables/WaiterTableMap'
import WaiterChatPanel          from '../components/chat/WaiterChatPanel'
import { useWaiterSocket }      from '../hooks/useWaiterSocket'
import { useSelector }          from 'react-redux'
import { selectUnreadMessages } from '@store/slices/messagingSlice'
import { ThemeContext }          from '@shared/context/ThemeContext'
import { COLORS }               from '@colors'
import gsap                     from 'gsap'
import { ClipboardList, Bell, Map, MessageSquare } from 'lucide-react'

const TABS = [
  { key: 'orders', label: 'Orders', Icon: ClipboardList },
  { key: 'calls',  label: 'Calls',  Icon: Bell          },
  { key: 'tables', label: 'Tables', Icon: Map           },
  { key: 'chat',   label: 'Chat',   Icon: MessageSquare },
]

const WaiterDashboard = () => {
  const [activeTab, setActiveTab] = useState('orders')
  const unreadMessages = useSelector(selectUnreadMessages)
  const { isDark: dk } = useContext(ThemeContext)
  const contentRef = useRef(null)
  useWaiterSocket()

  const switchTab = (key) => {
    if (key === activeTab) return
    if (contentRef.current) {
      gsap.fromTo(contentRef.current,
        { opacity: 0, x: 10 },
        { opacity: 1, x: 0, duration: 0.22, ease: 'power2.out' }
      )
    }
    setActiveTab(key)
  }

  return (
    <DashboardLayout title="Waiter" role="waiter" activeNav={activeTab} onNavChange={switchTab}>

      {/* ── Mobile tab bar ── */}
      <div className={`md:hidden flex border-b sticky top-0 z-20 flex-shrink-0
        ${dk ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        {TABS.map(({ key, label, Icon }) => {
          const active = activeTab === key
          return (
            <button
              key={key}
              onClick={() => switchTab(key)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5 relative transition-colors"
              style={{ color: active ? COLORS.saffron.DEFAULT : dk ? '#6B7280' : '#9CA3AF' }}
            >
              <div className="relative">
                <Icon size={20} />
                {key === 'chat' && unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-red-500
                                   text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadMessages}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold">{label}</span>
              {active && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-saffron rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Desktop 3-col layout ── */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 flex-1 overflow-hidden">
        <div className="lg:col-span-2 flex flex-col gap-4 overflow-auto min-h-0">
          <WaiterActiveOrders />
          <WaiterCallList />
        </div>
        <div className="flex flex-col gap-4 overflow-auto min-h-0">
          <WaiterTableMap />
          <WaiterChatPanel />
        </div>
      </div>

      {/* ── Mobile content ── */}
      <div ref={contentRef} className="md:hidden flex-1 overflow-auto p-3">
        {activeTab === 'orders' && <WaiterActiveOrders />}
        {activeTab === 'calls'  && <WaiterCallList />}
        {activeTab === 'tables' && <WaiterTableMap />}
        {activeTab === 'chat'   && <WaiterChatPanel />}
      </div>

    </DashboardLayout>
  )
}

export default WaiterDashboard