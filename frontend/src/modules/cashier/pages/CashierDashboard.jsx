// src/modules/cashier/pages/CashierDashboard.jsx
import { useState, useContext, useRef } from 'react'
import DashboardLayout from '@shared/components/layout/DashboardLayout'
import BillingPanel    from '../components/billing/BillingPanel'
import TransactionList from '../components/transactions/TransactionList'
import CashierChat     from '../components/chat/CashierChat'
import { ThemeContext } from '@shared/context/ThemeContext'
import { COLORS }       from '@colors'
import gsap             from 'gsap'
import { CreditCard, BarChart3, MessageSquare } from 'lucide-react'

const TABS = [
  { key: 'billing',      label: 'Billing',      Icon: CreditCard    },
  { key: 'transactions', label: 'Transactions', Icon: BarChart3     },
  { key: 'chat',         label: 'Chat',         Icon: MessageSquare },
]

const CashierDashboard = () => {
  const [tab, setTab]  = useState('billing')
  const { isDark: dk } = useContext(ThemeContext)
  const contentRef     = useRef(null)

  const switchTab = (key) => {
    if (key === tab) return
    if (contentRef.current)
      gsap.fromTo(contentRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' })
    setTab(key)
  }

  return (
    <DashboardLayout title="Cashier" role="cashier" activeNav={tab} onNavChange={switchTab}>

      {/* Mobile tab bar */}
      <div className={`md:hidden flex border-b sticky top-0 z-20 flex-shrink-0
        ${dk ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        {TABS.map(({ key, label, Icon }) => {
          const active = tab === key
          return (
            <button
              key={key}
              onClick={() => switchTab(key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold relative transition-colors"
              style={{ color: active ? COLORS.matcha.DEFAULT : dk ? '#6B7280' : '#9CA3AF' }}
            >
              <Icon size={16} />
              <span className="hidden xs:inline">{label}</span>
              {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                              style={{ background: COLORS.matcha.DEFAULT }} />}
            </button>
          )
        })}
      </div>

      {/* Desktop: 2-col */}
      <div className={`hidden md:grid md:grid-cols-2 gap-4 p-4 flex-1 overflow-hidden
        ${dk ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <div className="overflow-auto min-h-0">
          <BillingPanel />
        </div>
        <div className="overflow-auto min-h-0 space-y-4">
          <TransactionList />
          <CashierChat />
        </div>
      </div>

      {/* Mobile */}
      <div ref={contentRef} className={`md:hidden flex-1 overflow-auto p-3
        ${dk ? 'bg-gray-950' : 'bg-gray-50'}`}>
        {tab === 'billing'      && <BillingPanel />}
        {tab === 'transactions' && <TransactionList />}
        {tab === 'chat'         && <CashierChat />}
      </div>

    </DashboardLayout>
  )
}

export default CashierDashboard