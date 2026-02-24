// src/modules/waiter/pages/WaiterDashboard.jsx
import { useState }              from 'react'
import DashboardLayout           from '@shared/components/layout/DashboardLayout'
import WaiterActiveOrders        from '../components/orders/WaiterActiveOrders'
import WaiterCallList            from '../components/orders/WaiterCallList'
import WaiterTableMap            from '../components/tables/WaiterTableMap'
import WaiterChatPanel           from '../components/chat/WaiterChatPanel'
import { useWaiterSocket }       from '../hooks/useWaiterSocket'
import { useSelector }           from 'react-redux'
import { selectUnreadMessages }  from '@store/slices/messagingSlice'
import { COLORS }                from '@colors'
import { ClipboardList, Bell, Map, MessageSquare } from 'lucide-react'

const TABS = [
  { key: 'orders', label: 'Orders',   Icon: ClipboardList },
  { key: 'calls',  label: 'Calls',    Icon: Bell          },
  { key: 'tables', label: 'Tables',   Icon: Map           },
  { key: 'chat',   label: 'Chat',     Icon: MessageSquare },
]

const WaiterDashboard = () => {
  const [activeTab, setActiveTab] = useState('orders')
  const unreadMessages = useSelector(selectUnreadMessages)

  // Connect waiter-specific socket events
  useWaiterSocket()

  return (
    <DashboardLayout title="Waiter Dashboard" role="waiter">
      {/* Mobile tab bar */}
      <div className="md:hidden flex border-b border-gray-100 bg-white sticky top-0 z-20">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 relative"
            style={{ color: activeTab === key ? COLORS.saffron.DEFAULT : COLORS.brew.soft }}
          >
            <Icon size={20} />
            <span className="text-[10px] font-semibold">{label}</span>
            {key === 'chat' && unreadMessages > 0 && (
              <span className="absolute top-1.5 right-2.5 w-4 h-4 rounded-full bg-terra
                               text-white text-[9px] font-bold flex items-center justify-center">
                {unreadMessages}
              </span>
            )}
            {activeTab === key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-saffron" />
            )}
          </button>
        ))}
      </div>

      {/* Desktop: 2-col layout */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 h-full overflow-hidden">
        <div className="lg:col-span-2 overflow-auto space-y-4">
          <WaiterActiveOrders />
          <WaiterCallList />
        </div>
        <div className="overflow-auto space-y-4">
          <WaiterTableMap />
          <WaiterChatPanel />
        </div>
      </div>

      {/* Mobile: tab content */}
      <div className="md:hidden flex-1 overflow-auto p-3">
        {activeTab === 'orders' && <WaiterActiveOrders />}
        {activeTab === 'calls'  && <WaiterCallList />}
        {activeTab === 'tables' && <WaiterTableMap />}
        {activeTab === 'chat'   && <WaiterChatPanel />}
      </div>
    </DashboardLayout>
  )
}

export default WaiterDashboard